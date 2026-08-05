import { ENTITIES } from '../typeorm.config';
import { ChannelConnection, ConnectionStatus } from './channel-connection.entity';
import { PublishRecord, PublishStatus } from './publish-record.entity';

describe('dispatch entities', () => {
    it('registers entities', () => expect(ENTITIES).toEqual(expect.arrayContaining([ChannelConnection, PublishRecord])));
    it('has enums', () => {
        expect(ConnectionStatus.Active).toBe('active');
        expect(PublishStatus.Success).toBe('success');
    });
});
