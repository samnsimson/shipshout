import { AtSign, Bell, Briefcase, LucideIcon, Mail } from 'lucide-react';
import type { PatchRepositoryChannelDto, RepositoryChannelDto, RepositoryChannelTone } from './channels.api';

export type ChannelFormState = {
    enabled: boolean;
    tone: RepositoryChannelTone;
    recipientsText: string;
};

export class ChannelUtils {
    static readonly toneLabels: Record<RepositoryChannelTone, string> = {
        professional: 'Professional',
        dev_focused: 'Developer-focused',
        hype: 'Hype',
    };

    static readonly kindLabels = {
        notify: 'Notification',
        publish: 'Publish',
    } as const;

    static formatRecipients(config: Record<string, unknown>): string {
        const recipients = config.recipients;
        if (!Array.isArray(recipients)) return '';
        return recipients.filter((item): item is string => typeof item === 'string').join(', ');
    }

    static parseRecipients(value: string): string[] {
        return value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    }

    static toFormState(channel: RepositoryChannelDto): ChannelFormState {
        return {
            enabled: channel.enabled,
            tone: channel.tone,
            recipientsText: ChannelUtils.formatRecipients(channel.config),
        };
    }

    static toPatch(channelKey: string, state: ChannelFormState): PatchRepositoryChannelDto {
        const patch: PatchRepositoryChannelDto = {
            channelKey,
            enabled: state.enabled,
            tone: state.tone,
        };
        if (channelKey === 'email_newsletter') patch.config = { recipients: ChannelUtils.parseRecipients(state.recipientsText) };
        return patch;
    }

    static iconFor(key: string): LucideIcon {
        if (key === 'email_alert') return Bell;
        if (key === 'email_newsletter') return Mail;
        if (key === 'x') return AtSign;
        if (key === 'linkedin') return Briefcase;
        return Mail;
    }

    static accentFor(key: string): { bg: string; color: string } {
        if (key === 'email_alert') return { bg: 'blue.subtle', color: 'blue.fg' };
        if (key === 'email_newsletter') return { bg: 'purple.subtle', color: 'purple.fg' };
        if (key === 'x') return { bg: 'gray.subtle', color: 'gray.fg' };
        if (key === 'linkedin') return { bg: 'teal.subtle', color: 'teal.fg' };
        return { bg: 'gray.subtle', color: 'gray.fg' };
    }
}
