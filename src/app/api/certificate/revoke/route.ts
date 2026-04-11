import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

/** POST /api/certificate/revoke - 인증서 폐기 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }

  const { certificateId } = await req.json();

  const certificate = await prisma.certificate.findFirst({
    where: { id: certificateId, userId: session.user.id, status: 'active' },
  });

  if (!certificate) {
    return NextResponse.json({ error: '활성 인증서를 찾을 수 없습니다' }, { status: 404 });
  }

  await prisma.certificate.update({
    where: { id: certificateId },
    data: { status: 'revoked', revokedAt: new Date() },
  });

  // 다른 활성 인증서가 없으면 hasCertificate = false
  const otherActive = await prisma.certificate.findFirst({
    where: { userId: session.user.id, status: 'active' },
  });

  if (!otherActive) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { hasCertificate: false },
    });
  }

  return NextResponse.json({ success: true });
}
