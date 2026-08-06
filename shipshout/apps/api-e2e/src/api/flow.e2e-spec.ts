import { createHmac } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import request from 'supertest';
import session from 'express-session';
import { AiEngine, GenerationService, BrandProfileRepository, DraftRepository, ReleaseEventRepository } from '@shipshout/ai';
import { DispatchService, DraftRepository as DispatchDraftRepository, PublishRecordRepository } from '@shipshout/integrations-core';
import {
    BrandProfile,
    Channel,
    ChannelConnection,
    ConnectionStatus,
    createTestDataSource,
    truncateAll,
    Draft,
    Membership,
    MembershipRole,
    PublishRecord,
    PublishStatus,
    ReleaseEvent,
    User,
    Workspace,
} from '@shipshout/database';
import { QUEUES, DispatchJob, GenerateJob } from '@shipshout/queue';
import { AppModule } from '../../../api/src/app/app.module';

process.env.APP_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64');

const hasTestDb = !!process.env.TEST_DATABASE_URL;

(hasTestDb ? describe : describe.skip)('ShipShout core flow (e2e)', () => {
    let app: INestApplication;
    let ds: Awaited<ReturnType<typeof createTestDataSource>>;
    let userId: string;
    let workspaceId: string;
    let webhookSecret: string;
    let connectionId: string;
    let pendingGenerate: GenerateJob | undefined;
    let pendingDispatch: DispatchJob | undefined;

    beforeAll(async () => {
        ds = await createTestDataSource();
        process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

        const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
            .overrideProvider(AiEngine)
            .useValue({ generate: async () => ({ text: '🚀 update', provider: 'fake', model: 'm', latencyMs: 1 }) })
            .overrideProvider(getQueueToken(QUEUES.generate))
            .useValue({
                add: async (_name: string, job: GenerateJob) => {
                    pendingGenerate = job;
                },
            })
            .overrideProvider(getQueueToken(QUEUES.dispatch))
            .useValue({
                add: async (_name: string, job: DispatchJob) => {
                    pendingDispatch = job;
                },
            })
            .compile();

        app = moduleRef.createNestApplication({ rawBody: true });
        app.setGlobalPrefix('api');
        app.use(session({ secret: 'e2e-test', resave: false, saveUninitialized: true }));
        await app.init();
    });

    afterAll(async () => {
        await app?.close();
        await ds?.destroy();
    });

    beforeEach(async () => {
        await truncateAll(ds);
        pendingGenerate = undefined;
        pendingDispatch = undefined;

        const user = await ds.getRepository(User).save({ githubId: `e2e-${Date.now()}`, name: 'E2E', email: 'e2e@test.com' });
        userId = user.id;
        process.env.E2E_TEST_USER = userId;
        const ws = await ds.getRepository(Workspace).save({ name: 'E2E WS', slug: `e2e-${Date.now()}`, plan: 'starter' });
        workspaceId = ws.id;
        await ds.getRepository(Membership).save({ user, workspace: ws, role: MembershipRole.Owner });
        const connection = await ds.getRepository(ChannelConnection).save({
            workspace: ws,
            type: Channel.X,
            accessToken: 'tok',
            status: ConnectionStatus.Active,
        });
        connectionId = connection.id;

        const reg = await request(app.getHttpServer())
            .post(`/api/workspaces/${workspaceId}/repositories`)
            .set('x-e2e-user', userId)
            .send({ provider: 'github', externalId: '42', name: 'acme/app' })
            .expect(201);
        webhookSecret = reg.body.webhookSecret;
    });

    it('generates, approves, and publishes a draft', async () => {
        const payload = { repository: { id: 42 }, release: { id: 999, name: 'v1.0', body: 'Ship faster' } };
        const bodyStr = JSON.stringify(payload);
        const body = Buffer.from(bodyStr);
        const sig = 'sha256=' + createHmac('sha256', webhookSecret).update(body).digest('hex');
        const webhookRes = await request(app.getHttpServer())
            .post('/api/webhooks/github')
            .set('Content-Type', 'application/json')
            .set('x-hub-signature-256', sig)
            .set('x-github-delivery', 'delivery-e2e-1')
            .send(bodyStr)
            .expect(200);
        expect(webhookRes.body.accepted).toBe(true);
        expect(webhookRes.body.duplicate).toBe(false);

        expect(pendingGenerate?.releaseEventId).toBeDefined();

        const engine = { generate: async () => ({ text: '🚀 update', provider: 'fake', model: 'm', latencyMs: 1 }) };
        const generation = new GenerationService(
            engine as any,
            new ReleaseEventRepository(ds.getRepository(ReleaseEvent)),
            new BrandProfileRepository(ds.getRepository(BrandProfile)),
            new DraftRepository(ds.getRepository(Draft)),
        );
        await generation.generateForEvent(pendingGenerate!.releaseEventId, [Channel.X]);

        const draftsRes = await request(app.getHttpServer()).get(`/api/workspaces/${workspaceId}/drafts`).set('x-e2e-user', userId).expect(200);
        const draft = draftsRes.body[0];
        expect(draft).toBeDefined();

        await request(app.getHttpServer()).post(`/api/workspaces/${workspaceId}/drafts/${draft.id}/approve`).set('x-e2e-user', userId).expect(201);

        await request(app.getHttpServer()).post(`/api/workspaces/${workspaceId}/drafts/${draft.id}/publish`).set('x-e2e-user', userId).expect(201);

        expect(pendingDispatch?.draftId).toBe(draft.id);

        const registry = { get: () => ({ channel: Channel.X, publish: async () => ({ externalUrl: 'https://x.com/1' }) }) };
        const connections = {
            getActive: async () => ({ id: connectionId }),
            getActiveAccessToken: async () => 'tok',
        };
        const dispatch = new DispatchService(
            new DispatchDraftRepository(ds.getRepository(Draft)),
            new PublishRecordRepository(ds.getRepository(PublishRecord)),
            registry as any,
            connections as any,
        );
        await dispatch.dispatch(pendingDispatch!.draftId);

        const record = await ds.getRepository(PublishRecord).findOne({ where: { draft: { id: draft.id } } });
        expect(record?.status).toBe(PublishStatus.Success);
    });
});
