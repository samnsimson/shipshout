import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { encryptSecret, decryptSecret } from '@shipshout/shared-util';
import { RegisterRepoDto } from '@shipshout/contracts';
import { ConnectedRepoRepository } from './connected-repo.repository';

@Injectable()
export class RepositoriesService {
    constructor(private repos: ConnectedRepoRepository) {}

    async create(workspaceId: string, dto: RegisterRepoDto) {
        const webhookSecret = randomBytes(32).toString('hex');
        const repository = await this.repos.save(
            this.repos.create({
                workspace: { id: workspaceId },
                provider: dto.provider,
                externalId: dto.externalId,
                name: dto.name,
                webhookSecret: encryptSecret(webhookSecret),
            }),
        );
        return { repository, webhookSecret };
    }

    list(workspaceId: string) {
        return this.repos.listForWorkspace(workspaceId);
    }

    findByExternalId(provider: string, externalId: string) {
        return this.repos.findByExternalId(provider as any, externalId);
    }

    decryptSecret(cipher: string) {
        return decryptSecret(cipher);
    }
}
