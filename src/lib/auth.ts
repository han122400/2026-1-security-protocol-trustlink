import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import prisma from './prisma';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Vercel 서버리스 환경에서 PKCE 쿠키가 손실되는 문제를 방지
      // state만 사용하고 pkce는 비활성화
      checks: ['state'],
    }),
  ],
  session: {
    strategy: 'database',
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // DB에서 역할, 인증서 보유 여부 가져오기
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, hasCertificate: true },
        });
        if (dbUser) {
          (session.user as unknown as Record<string, unknown>).role = dbUser.role;
          (session.user as unknown as Record<string, unknown>).hasCertificate = dbUser.hasCertificate;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
});

