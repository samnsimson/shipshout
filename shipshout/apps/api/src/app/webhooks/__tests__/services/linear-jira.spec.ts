import { createHmac } from 'crypto';
import { WebhooksService } from '../../services/webhooks.service';
import { SourceProvider } from '@shipshout/database';

process.env.APP_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64');

it('handleLinear ingests a completed issue', async () => {
    const secret = 'ls';
    const body = Buffer.from(JSON.stringify({ data: { id: 'iss_1', title: 'Fix', state: { type: 'completed' } } }));
    const repos = {
        findByExternalId: jest.fn(async () => ({ id: 'r1', enabled: true, webhookSecret: 'c', workspace: { id: 'w1' } })),
        decryptSecret: () => secret,
    };
    const ingest = jest.fn(async () => ({ accepted: true }));
    const svc = new WebhooksService(repos as any, {} as any, {} as any, {} as any);
    (svc as any).ingestNormalized = ingest;
    const sig = createHmac('sha256', secret).update(body).digest('hex');
    await svc.handleLinear(body, { 'linear-signature': sig });
    expect(ingest).toHaveBeenCalledWith(expect.objectContaining({ source: SourceProvider.Linear, requireSourceIntegration: true, verified: true }));
});
