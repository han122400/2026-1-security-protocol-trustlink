import { neonConfig } from '@neondatabase/serverless';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function resolveConnectionString() {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.DATABASE_POSTGRES_PRISMA_URL,
    process.env.DATABASE_POSTGRES_URL,
  ].map((value) => value?.trim().replace(/^['"]|['"]$/g, ''));

  const connectionString = candidates.find(
    (value) =>
      value &&
      value !== 'undefined' &&
      value !== 'null' &&
      value.startsWith('postgres')
  );

  if (!connectionString) {
    throw new Error(
      'Missing Postgres connection string. Set DATABASE_URL (or DATABASE_POSTGRES_PRISMA_URL).'
    );
  }

  return connectionString;
}

function createPrismaClient() {
  const adapter = new PrismaNeon({
    connectionString: resolveConnectionString(),
  });

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
