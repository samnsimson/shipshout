export interface AiChannelVariant {
    title: string;
    body: string;
}

export interface AiGenerateChannelVariantsInput {
    sourceSummary: Record<string, unknown>;
    channels: { key: string; tone: string }[];
    repoFullName: string;
}

export interface AiProvider {
    generateChannelVariants(input: AiGenerateChannelVariantsInput): Promise<Record<string, AiChannelVariant>>;
}
