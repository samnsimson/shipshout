export type ChannelConfigValidationResult = { ok: true } | { ok: false; error: string };

export class ChannelConfigUtils {
    static validate(configSchema: Record<string, unknown>, config: Record<string, unknown>): ChannelConfigValidationResult {
        if (Object.keys(configSchema).length === 0) return { ok: true };

        const required = Array.isArray(configSchema.required) ? (configSchema.required as string[]) : [];
        for (const key of required) {
            if (!(key in config)) return { ok: false, error: `Missing required property: ${key}` };
        }

        const properties =
            configSchema.properties && typeof configSchema.properties === 'object'
                ? (configSchema.properties as Record<string, Record<string, unknown>>)
                : {};

        if ('recipients' in properties) {
            const recipients = config.recipients;
            if (!Array.isArray(recipients)) return { ok: false, error: 'recipients must be an array' };
            const minItems = typeof properties.recipients.minItems === 'number' ? properties.recipients.minItems : 0;
            if (recipients.length < minItems) return { ok: false, error: 'recipients must not be empty' };
            if (!recipients.every((item) => typeof item === 'string')) return { ok: false, error: 'recipients must be strings' };
        }

        return { ok: true };
    }
}
