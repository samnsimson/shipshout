import { AiProvider, AiPrompt } from './ai-provider.js';

export interface EngineResult {
  text: string;
  provider: string;
  model: string;
  tokens?: number;
  latencyMs: number;
}

export class AiEngine {
  constructor(
    private primary: AiProvider,
    private fallback: AiProvider,
  ) {}

  async generate(prompt: AiPrompt, opts?: { maxTokens?: number }): Promise<EngineResult> {
    for (const p of [this.primary, this.fallback]) {
      const started = Date.now();
      try {
        const r = await p.generate(prompt, opts);
        return {
          text: r.text,
          provider: p.name,
          model: r.model,
          tokens: r.tokens,
          latencyMs: Date.now() - started,
        };
      } catch {
        /* try next provider */
      }
    }
    throw new Error('All AI providers failed');
  }
}
