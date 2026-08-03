import { Injectable } from '@nestjs/common';
import { Repository as OrmRepo } from 'typeorm';
import { BrandProfile, Tone } from '@shipshout/data-entities';
import { UpdateBrandDto } from '@shipshout/contracts';

@Injectable()
export class BrandService {
  constructor(private brands: OrmRepo<BrandProfile>) {}

  async get(workspaceId: string): Promise<BrandProfile> {
    let b = await this.brands.findOne({ where: { workspace: { id: workspaceId } } });
    if (!b)
      b = await this.brands.save(
        this.brands.create({
          workspace: { id: workspaceId } as BrandProfile['workspace'],
          tone: Tone.Professional,
          emojiPolicy: true,
        }),
      );
    return b;
  }

  async upsert(workspaceId: string, dto: UpdateBrandDto): Promise<BrandProfile> {
    const b = await this.get(workspaceId);
    b.tone = dto.tone as Tone;
    b.customInstructions = dto.customInstructions;
    b.emojiPolicy = dto.emojiPolicy;
    return this.brands.save(b);
  }
}
