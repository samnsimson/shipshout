import { Injectable } from '@nestjs/common';
import { Tone } from '@shipshout/database';
import { UpdateBrandDto } from '../dtos/update-brand.dto';
import { BrandProfileRepository } from '../repositories/brand-profile.repository';

@Injectable()
export class BrandService {
    constructor(private brands: BrandProfileRepository) {}

    async get(workspaceId: string) {
        let b = await this.brands.findForWorkspace(workspaceId);
        if (!b)
            b = await this.brands.save(
                this.brands.create({
                    workspace: { id: workspaceId },
                    tone: Tone.Professional,
                    emojiPolicy: true,
                }),
            );
        return b;
    }

    async upsert(workspaceId: string, dto: UpdateBrandDto) {
        const b = await this.get(workspaceId);
        b.tone = dto.tone as Tone;
        b.customInstructions = dto.customInstructions;
        b.emojiPolicy = dto.emojiPolicy;
        return this.brands.save(b);
    }
}
