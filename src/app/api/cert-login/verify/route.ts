import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySignatureOnServer } from '@/lib/certificate';

/** POST /api/cert-login/verify - 전자서명 검증 후 로그인 */
export async function POST(req: NextRequest) {
  const { challengeId, signature } = await req.json();

  if (!challengeId || !signature) {
    return NextResponse.json({ error: 'Challenge ID와 서명이 필요합니다' }, { status: 400 });
  }

  // Challenge 조회
  const challenge = await prisma.loginChallenge.findUnique({
    where: { id: challengeId },
    include: {
      user: {
        include: {
          certificates: {
            where: { status: 'active' },
            take: 1,
          },
        },
      },
    },
  });

  if (!challenge) {
    return NextResponse.json({ error: 'Challenge를 찾을 수 없습니다' }, { status: 404 });
  }

  // Challenge 유효성 검사
  if (challenge.used) {
    return NextResponse.json({ error: '이미 사용된 Challenge입니다' }, { status: 400 });
  }

  if (new Date() > challenge.expiresAt) {
    return NextResponse.json({ error: 'Challenge가 만료되었습니다' }, { status: 400 });
  }

  if (challenge.user.certificates.length === 0) {
    return NextResponse.json({ error: '활성 인증서가 없습니다' }, { status: 400 });
  }

  // 공개키 로드
  const cert = challenge.user.certificates[0];
  const publicKeys = JSON.parse(cert.publicKey);
  const signPublicKey = publicKeys.signPublicKey;

  // challenge 데이터를 Base64로 변환
  const challengeBase64 = Buffer.from(challenge.challenge, 'base64').toString('base64');

  // 전자서명 검증
  const isValid = await verifySignatureOnServer(signPublicKey, signature, challengeBase64);

  if (!isValid) {
    return NextResponse.json({ error: '전자서명 검증에 실패했습니다' }, { status: 401 });
  }

  // Challenge 사용됨 표시
  await prisma.loginChallenge.update({
    where: { id: challengeId },
    data: { used: true },
  });

  // 세션 생성 (NextAuth DB 세션)
  const sessionToken = crypto.randomUUID();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30일

  await prisma.session.create({
    data: {
      sessionToken,
      userId: challenge.userId,
      expires,
    },
  });

  // 쿠키에 세션 토큰 설정
  const response = NextResponse.json({
    success: true,
    userId: challenge.userId,
    userName: challenge.user.name,
  });

  response.cookies.set('authjs.session-token', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires,
  });

  return response;
}
