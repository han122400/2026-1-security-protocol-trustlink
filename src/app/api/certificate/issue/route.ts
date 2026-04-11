import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { issueCertificate } from '@/lib/certificate';

/** POST /api/certificate/issue - 인증서 발급 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }

  const { signPublicKey, encryptPublicKey, subjectName } = await req.json();

  if (!signPublicKey || !encryptPublicKey) {
    return NextResponse.json({ error: '공개키가 필요합니다' }, { status: 400 });
  }

  // 이미 활성 인증서가 있는지 확인
  const existingCert = await prisma.certificate.findFirst({
    where: { userId: session.user.id, status: 'active' },
  });

  if (existingCert) {
    return NextResponse.json(
      { error: '이미 활성 인증서가 존재합니다. 기존 인증서를 폐기 후 재발급하세요.' },
      { status: 409 }
    );
  }

  // 인증서 발급
  const certData = issueCertificate({
    userId: session.user.id,
    email: session.user.email || '',
    subjectName: subjectName || session.user.name || 'Unknown',
    signPublicKey,
    encryptPublicKey,
  });

  // DB에 인증서 저장
  const certificate = await prisma.certificate.create({
    data: {
      userId: session.user.id,
      serialNumber: certData.serialNumber,
      subjectName: certData.subject.commonName,
      publicKey: JSON.stringify({
        signPublicKey,
        encryptPublicKey,
      }),
      certificateData: JSON.stringify(certData),
      expiresAt: new Date(certData.validity.notAfter),
    },
  });

  // 사용자 인증서 보유 상태 업데이트
  await prisma.user.update({
    where: { id: session.user.id },
    data: { hasCertificate: true },
  });

  return NextResponse.json({
    certificate: certData,
    certificateId: certificate.id,
    serialNumber: certData.serialNumber,
  });
}
