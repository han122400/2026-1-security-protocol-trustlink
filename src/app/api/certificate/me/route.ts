import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

/** GET /api/certificate/me - 내 인증서 조회 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }

  const certificate = await prisma.certificate.findFirst({
    where: { userId: session.user.id, status: 'active' },
  });

  if (!certificate) {
    return NextResponse.json({ certificate: null });
  }

  return NextResponse.json({
    certificate: {
      id: certificate.id,
      serialNumber: certificate.serialNumber,
      subjectName: certificate.subjectName,
      certificateData: JSON.parse(certificate.certificateData),
      issuedAt: certificate.issuedAt,
      expiresAt: certificate.expiresAt,
      status: certificate.status,
    },
  });
}
