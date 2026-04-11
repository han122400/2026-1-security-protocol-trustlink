import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

/** GET /api/certificate/[userId] - 특정 사용자 인증서(공개키) 조회 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }

  const { userId } = await params;

  const certificate = await prisma.certificate.findFirst({
    where: { userId, status: 'active' },
  });

  if (!certificate) {
    return NextResponse.json({ error: '해당 사용자의 활성 인증서가 없습니다' }, { status: 404 });
  }

  const publicKeys = JSON.parse(certificate.publicKey);

  return NextResponse.json({
    userId,
    certificateId: certificate.id,
    serialNumber: certificate.serialNumber,
    signPublicKey: publicKeys.signPublicKey,
    encryptPublicKey: publicKeys.encryptPublicKey,
    certificateData: JSON.parse(certificate.certificateData),
  });
}
