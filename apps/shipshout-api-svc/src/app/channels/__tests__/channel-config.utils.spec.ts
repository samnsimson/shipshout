import { ChannelConfigUtils } from '../utils/channel-config.utils';

const EMAIL_NEWSLETTER_SCHEMA = {
    type: 'object',
    properties: {
        recipients: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
        },
        subjectPrefix: { type: 'string' },
    },
    required: ['recipients'],
};

describe('ChannelConfigUtils', () => {
    it('passes when configSchema is empty', () => {
        expect(ChannelConfigUtils.validate({}, { anything: true })).toEqual({ ok: true });
    });

    it('passes email_newsletter config with non-empty recipients', () => {
        expect(ChannelConfigUtils.validate(EMAIL_NEWSLETTER_SCHEMA, { recipients: ['a@example.com'] })).toEqual({ ok: true });
    });

    it('rejects email_newsletter config with empty recipients', () => {
        const result = ChannelConfigUtils.validate(EMAIL_NEWSLETTER_SCHEMA, { recipients: [] });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toBeTruthy();
    });

    it('rejects email_newsletter config missing recipients', () => {
        const result = ChannelConfigUtils.validate(EMAIL_NEWSLETTER_SCHEMA, {});
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toBeTruthy();
    });
});
