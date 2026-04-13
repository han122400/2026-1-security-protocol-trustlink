import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const connectionString =
    process.env.DATABASE_URL ||
    'postgresql://neondb_owner:npg_jCm0XnANlPu2@ep-cool-sun-an94lelo-pooler.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

  const pool = new Pool({ connectionString });
  const adapter = new PrismaNeon(pool as any);

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
