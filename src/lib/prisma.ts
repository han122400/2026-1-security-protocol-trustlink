import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  let connectionString = process.env.DATABASE_URL || process.env.DATABASE_POSTGRES_PRISMA_URL;
  
  // Vercel에서 값이 잘못된 문자열로 들어오거나 없을 경우 안전하게 훌백되도록 처리
  if (!connectionString || connectionString === 'undefined' || connectionString === 'null' || !connectionString.startsWith('postgres')) {
    connectionString = 'postgresql://neondb_owner:npg_jCm0XnANlPu2@ep-cool-sun-an94lelo-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require';
  }

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
