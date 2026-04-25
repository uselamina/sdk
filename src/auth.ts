export function resolveApiKey(options: {
  apiKey?: string | null | undefined;
  env?: NodeJS.ProcessEnv;
} = {}): string | undefined {
  const explicit = options.apiKey?.trim();
  if (explicit) {
    return explicit;
  }

  const env = options.env || process.env;
  const fromEnv = env.LAMINA_API_KEY?.trim();
  return fromEnv || undefined;
}

export function requireApiKey(options: {
  apiKey?: string | null | undefined;
  env?: NodeJS.ProcessEnv;
} = {}): string {
  const apiKey = resolveApiKey(options);
  if (!apiKey) {
    throw new Error(
      'Missing Lamina API key. Pass apiKey explicitly or set LAMINA_API_KEY in the environment.'
    );
  }

  return apiKey;
}
