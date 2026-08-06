import { DispatchProcessor } from '../../processors/dispatch.processor';

describe('DispatchProcessor', () => {
    it('delegates to DispatchService', async () => {
        const dispatch = { dispatch: jest.fn(async () => undefined) };
        const proc = new DispatchProcessor(dispatch as any);
        await proc.process({ data: { draftId: 'd1' } } as any);
        expect(dispatch.dispatch).toHaveBeenCalledWith('d1');
    });
});
