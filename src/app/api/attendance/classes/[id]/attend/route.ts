import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { verifySignatureOnServer } from '@/lib/certificate';

/** POST /api/attendance/classes/[id]/attend - 출석 인증 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }

  const { id } = await params;
  const { signature, certId } = await req.json();

  if (!signature || !certId) {
    return NextResponse.json({ error: '서명과 인증서 ID가 필요합니다' }, { status: 400 });
  }

  // 출석 세션 조회
  const classData = await prisma.class.findUnique({ where: { id } });
  if (!classData) {
    return NextResponse.json({ error: '출석 세션을 찾을 수 없습니다' }, { status: 404 });
  }

  // 1. 시간 범위 검증
  const now = new Date();
  if (now < classData.startsAt) {
    return NextResponse.json({ error: '출석 시간이 아직 시작되지 않았습니다' }, { status: 400 });
  }
  if (now > classData.endsAt) {
    return NextResponse.json({ error: '출석 시간이 종료되었습니다' }, { status: 400 });
  }

  // 2. 중복 출석 검증
  const existing = await prisma.attendance.findFirst({
    where: { classId: id, studentId: session.user.id },
  });
  if (existing) {
    return NextResponse.json({ error: '이미 출석했습니다' }, { status: 409 });
  }

  // 3. 인증서 유효성 검증
  const cert = await prisma.certificate.findFirst({
    where: { id: certId, userId: session.user.id, status: 'active' },
  });
  if (!cert) {
    return NextResponse.json({ error: '유효한 인증서가 아닙니다' }, { status: 400 });
  }

  // 4. 전자서명 검증
  const publicKeys = JSON.parse(cert.publicKey);
  const challengeBase64 = Buffer.from(classData.challenge, 'base64').toString('base64');

  const isValid = await verifySignatureOnServer(
    publicKeys.signPublicKey,
    signature,
    challengeBase64
  );

  // 출석 기록 저장 (검증 성공 여부와 관계없이 기록)
  const attendance = await prisma.attendance.create({
    data: {
      classId: id,
      studentId: session.user.id,
      signature,
      certId,
      verified: isValid,
    },
  });

  if (!isValid) {
    return NextResponse.json(
      { error: '전자서명 검증에 실패했습니다', verified: false },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    attendedAt: attendance.attendedAt,
    verified: true,
  });
}
