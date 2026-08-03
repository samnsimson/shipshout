export interface AiPrompt {
  system: string;
  user: string;
}
export interface AiResult {
  text: string;
  model: string;
  tokens?: number;
}
export interface AiProvider {
  name: string;
  generate(prompt: AiPrompt, opts?: { maxTokens?: number }): Promise<AiResult>;
}
