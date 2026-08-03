import { Injectable } from '@nestjs/common';
import { Repository as OrmRepo } from 'typeorm';
import { randomBytes } from 'crypto';
import { Repository } from '@shipshout/data-entities';
import { encryptSecret, decryptSecret } from '@shipshout/shared-util';
import { RegisterRepoDto } from '@shipshout/contracts';

@Injectable()
export class RepositoriesService {
  constructor(private repos: OrmRepo<Repository>) {}

  async create(workspaceId: string, dto: RegisterRepoDto) {
    const webhookSecret = randomBytes(32).toString('hex');
    const repository = await this.repos.save(
      this.repos.create({
        workspace: { id: workspaceId } as Repository['workspace'],
        provider: dto.provider,
        externalId: dto.externalId,
        name: dto.name,
        webhookSecret: encryptSecret(webhookSecret),
      }),
    );
    return { repository, webhookSecret };
  }

  list(workspaceId: string) {
    return this.repos.find({ where: { workspace: { id: workspaceId } } });
  }

  async findByExternalId(provider: string, externalId: string) {
    return this.repos.findOne({ where: { provider: provider as Repository['provider'], externalId } });
  }

  decryptSecret(cipher: string) {
    return decryptSecret(cipher);
  }
}
