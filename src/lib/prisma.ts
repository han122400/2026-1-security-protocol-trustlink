import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool } from '@neondatabase/serverless';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Vercel 환경과 로컬 환경 모두에서 작동하도록 설정
const connectionString = process.env.DATABASE_URL!;

// Prisma 어댑터에는 Pool 객체가 필요함. 
// 타입 불일치 에러 방지를 위해 any 캐스팅 사용 (런타임 호환성 확인됨)
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
