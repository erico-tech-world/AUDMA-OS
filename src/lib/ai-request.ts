export const SERVER_AI_PROVIDERS = ['gemini', 'groq', 'openai', 'ollama'] as const;

export type ServerAIProvider = (typeof SERVER_AI_PROVIDERS)[number];
export type AIRequestKind = 'extract' | 'generate';

const MAX_AI_TEXT_LENGTH = 8 * 1024 * 1024;

export function validateAIRequest(body: unknown, kind: AIRequestKind): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'A JSON object is required';
  }

  const request = body as Record<string, unknown>;
  if (request.provider !== undefined &&
      (typeof request.provider !== 'string' ||
        !SERVER_AI_PROVIDERS.includes(request.provider as ServerAIProvider))) {
    return 'Unsupported AI provider';
  }

  for (const field of ['content', 'prompt', 'mimeType'] as const) {
    const value = request[field];
    if (value !== undefined && typeof value !== 'string') {
      return `${field} must be a string`;
    }
  }

  for (const field of ['content', 'prompt'] as const) {
    const value = request[field];
    if (typeof value === 'string' && value.length > MAX_AI_TEXT_LENGTH) {
      return `${field} exceeds the maximum allowed size`;
    }
  }

  if (kind === 'extract' && !request.content) {
    return 'Content or document payload is required';
  }

  if (kind === 'generate' && !request.prompt && !request.content) {
    return 'Instruction prompt or document content is required';
  }

  return null;
}

export function getServerAIProvider(provider: unknown): ServerAIProvider {
  if (provider === undefined) return 'ollama';
  if (typeof provider === 'string' && SERVER_AI_PROVIDERS.includes(provider as ServerAIProvider)) {
    return provider as ServerAIProvider;
  }
  throw new TypeError('Unsupported AI provider');
}