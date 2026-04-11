import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Vercel에서 process.env.DATABASE_URL이 간헐적으로 undefined가 되는 버그 방지
const connectionString = 
  process.env.DATABASE_URL || 
  process.env.DATABASE_POSTGRES_PRISMA_URL || 
  "postgresql://neondb_owner:npg_jCm0XnANlPu2@ep-cool-sun-an94lelo-pooler.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool as any);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
