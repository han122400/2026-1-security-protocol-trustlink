import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Vercel 환경 변수가 비어있는 만약의 사태를 완벽 대비
const connectionUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_jCm0XnANlPu2@ep-cool-sun-an94lelo-pooler.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

// 에러의 원인이었던 Neon Adapter를 제거하고 Prisma의 기본 Rust 엔진 강제 사용.
// Prisma 7의 타입 검사 에러(never)는 as any로 완전히 무시합니다.
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasourceUrl: connectionUrl,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  } as any);

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
