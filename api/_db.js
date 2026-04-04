import { neon } from '@neondatabase/serverless';

const clientCache = new Map();

export function sqlForDatabaseUrl(databaseUrl) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured');
  }

  if (!clientCache.has(databaseUrl)) {
    clientCache.set(databaseUrl, neon(databaseUrl));
  }

  return clientCache.get(databaseUrl);
}

export const sql = sqlForDatabaseUrl(process.env.DATABASE_URL);
