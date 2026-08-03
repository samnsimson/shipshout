import { ENTITIES } from '../typeorm.config.js';
import { ChannelConnection, ConnectionStatus } from './channel-connection.entity.js';
import { PublishRecord, PublishStatus } from './publish-record.entity.js';

describe('dispatch entities', () => {
    it('registers entities', () => expect(ENTITIES).toEqual(expect.arrayContaining([ChannelConnection, PublishRecord])));
    it('has enums', () => {
        expect(ConnectionStatus.Active).toBe('active');
        expect(PublishStatus.Success).toBe('success');
    });
});
