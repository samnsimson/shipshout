import { BrandService } from './brand.service';
import { Tone } from '@shipshout/data-entities';

describe('BrandService', () => {
  it('creates a default profile when none exists', async () => {
    const repo = {
      findOne: jest.fn(async () => null),
      create: (d: any) => d,
      save: jest.fn(async (d: any) => ({ id: 'b1', ...d })),
    };
    const svc = new BrandService(repo as any);
    const b = await svc.get('w1');
    expect(b.tone).toBe(Tone.Professional);
  });
});
