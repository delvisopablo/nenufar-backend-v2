import { execFileSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

const projectRoot = resolve(__dirname, '..');
const envFilePath = join(projectRoot, '.env.test');
const prismaBinary = join(
  projectRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'prisma.cmd' : 'prisma',
);

function parseEnvFile(contents: string) {
  const result: Record<string, string> = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    result[key] = value.replace(/^['"]|['"]$/g, '');
  }

  return result;
}

export function loadTestEnv() {
  if (!existsSync(envFilePath)) {
    return;
  }

  const parsed = parseEnvFile(readFileSync(envFilePath, 'utf8'));
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function applyTestDatabaseUrl() {
  loadTestEnv();

  const databaseUrl = process.env.DATABASE_URL_TEST;
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL_TEST no está definida. Revisa el fichero .env.test.',
    );
  }

  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = databaseUrl;
}

export default async function globalSetup() {
  applyTestDatabaseUrl();

  execFileSync(
    prismaBinary,
    ['migrate', 'deploy', '--schema', join(projectRoot, 'prisma', 'schema.prisma')],
    {
      cwd: projectRoot,
      env: process.env,
      stdio: 'inherit',
    },
  );
}
