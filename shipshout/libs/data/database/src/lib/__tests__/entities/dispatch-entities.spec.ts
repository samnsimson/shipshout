import { ENTITIES } from '../../config/typeorm.config.js';
import { ChannelConnection, ConnectionStatus } from '../../entities/channel-connection.entity.js';
import { PublishRecord, PublishStatus } from '../../entities/publish-record.entity.js';

describe('dispatch entities', () => {
    it('registers entities', () => expect(ENTITIES).toEqual(expect.arrayContaining([ChannelConnection, PublishRecord])));
    it('has enums', () => {
        expect(ConnectionStatus.Active).toBe('active');
        expect(PublishStatus.Success).toBe('success');
    });
});
