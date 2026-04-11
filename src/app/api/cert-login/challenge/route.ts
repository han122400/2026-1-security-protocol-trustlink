import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateChallenge } from '@/lib/certificate';

/** POST /api/cert-login/challenge - Challenge 생성 */
export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: '이메일을 입력해주세요' }, { status: 400 });
  }

  // 사용자 조회
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      certificates: {
        where: { status: 'active' },
        take: 1,
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: '등록되지 않은 사용자입니다' }, { status: 404 });
  }

  if (user.certificates.length === 0) {
    return NextResponse.json({ error: '활성 인증서가 없습니다' }, { status: 400 });
  }

  // Challenge 생성 (5분 유효)
  const challenge = generateChallenge();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  const loginChallenge = await prisma.loginChallenge.create({
    data: {
      userId: user.id,
      challenge,
      expiresAt,
    },
  });

  return NextResponse.json({
    challengeId: loginChallenge.id,
    challenge,
    userName: user.name,
  });
}
