import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

import type {
  StoredLaminaConfig,
  StoredLaminaCredentials,
  StoredWebhookConfig,
} from './types.js';

const CONFIG_DIR_NAME = '.lamina';
const CONFIG_FILE_NAME = 'config.json';

export function getDefaultConfigDir(): string {
  return join(homedir(), CONFIG_DIR_NAME);
}

export function getDefaultConfigPath(): string {
  return join(getDefaultConfigDir(), CONFIG_FILE_NAME);
}

async function readStoredConfigFile(configPath = getDefaultConfigPath()): Promise<StoredLaminaConfig | null> {
  try {
    const raw = await readFile(configPath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<StoredLaminaConfig>;

    if (parsed.version !== 1) {
      return null;
    }

    return parsed as StoredLaminaConfig;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

async function writeStoredConfigFile(
  payload: StoredLaminaConfig,
  configPath = getDefaultConfigPath()
): Promise<void> {
  await mkdir(dirname(configPath), { recursive: true, mode: 0o700 });
  await chmod(dirname(configPath), 0o700).catch(() => {});

  await writeFile(configPath, `${JSON.stringify(payload, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
  await chmod(configPath, 0o600).catch(() => {});
}

export async function readStoredConfig(
  configPath = getDefaultConfigPath()
): Promise<StoredLaminaConfig | null> {
  return readStoredConfigFile(configPath);
}

export async function readStoredCredentials(
  configPath = getDefaultConfigPath()
): Promise<StoredLaminaCredentials | null> {
  const parsed = await readStoredConfigFile(configPath);
  if (!parsed?.credentials) {
    return null;
  }

  const { apiKey, baseUrl, savedAt } = parsed.credentials;
  if (!apiKey || !baseUrl || !savedAt) {
    return null;
  }

  return { apiKey, baseUrl, savedAt };
}

export async function readStoredWebhookConfig(
  configPath = getDefaultConfigPath()
): Promise<StoredWebhookConfig | null> {
  const parsed = await readStoredConfigFile(configPath);
  if (!parsed?.webhook) {
    return null;
  }

  const { savedAt } = parsed.webhook;
  if (!savedAt) {
    return null;
  }

  return parsed.webhook;
}

export async function writeStoredCredentials(
  credentials: StoredLaminaCredentials,
  configPath = getDefaultConfigPath()
): Promise<void> {
  const existing = (await readStoredConfigFile(configPath)) || { version: 1 };
  const payload: StoredLaminaConfig = {
    ...existing,
    version: 1,
    credentials,
  };

  await writeStoredConfigFile(payload, configPath);
}

export async function writeStoredWebhookConfig(
  webhook: StoredWebhookConfig,
  configPath = getDefaultConfigPath()
): Promise<void> {
  const existing = (await readStoredConfigFile(configPath)) || { version: 1 };
  const payload: StoredLaminaConfig = {
    ...existing,
    version: 1,
    webhook,
  };

  await writeStoredConfigFile(payload, configPath);
}

export async function clearStoredCredentials(configPath = getDefaultConfigPath()): Promise<void> {
  const existing = await readStoredConfigFile(configPath);
  if (!existing) {
    return;
  }

  if (existing.webhook) {
    const payload: StoredLaminaConfig = {
      version: 1,
      webhook: existing.webhook,
    };
    await writeStoredConfigFile(payload, configPath);
    return;
  }

  await rm(configPath, { force: true });
}

export async function clearStoredWebhookConfig(configPath = getDefaultConfigPath()): Promise<void> {
  const existing = await readStoredConfigFile(configPath);
  if (!existing) {
    return;
  }

  if (existing.credentials) {
    const payload: StoredLaminaConfig = {
      version: 1,
      credentials: existing.credentials,
    };
    await writeStoredConfigFile(payload, configPath);
    return;
  }

  await rm(configPath, { force: true });
}
