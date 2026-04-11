import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool } from '@neondatabase/serverless';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Vercel 환경과 로컬 환경 모두에서 작동하도록 설정
const connectionString = process.env.DATABASE_URL!;

// Prisma 어댑터에는 neon() 대신 Pool을 사용해야 함
const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
