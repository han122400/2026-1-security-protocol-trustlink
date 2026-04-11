import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateChallenge } from '@/lib/certificate';

/** GET /api/attendance/classes - 출석 세션 목록 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  let classes;

  if (user?.role === 'professor') {
    // 교수: 내가 생성한 출석 세션
    classes = await prisma.class.findMany({
      where: { professorId: session.user.id },
      include: {
        _count: { select: { attendances: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  } else {
    // 학생/일반: 모든 출석 세션 (시간 내인 것 우선)
    classes = await prisma.class.findMany({
      include: {
        professor: { select: { name: true } },
        attendances: {
          where: { studentId: session.user.id },
          select: { id: true, attendedAt: true, verified: true },
        },
        _count: { select: { attendances: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  return NextResponse.json({ classes });
}

/** POST /api/attendance/classes - 출석 세션 생성 (교수만) */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, name: true },
  });

  if (user?.role !== 'professor') {
    return NextResponse.json({ error: '교수만 출석을 생성할 수 있습니다' }, { status: 403 });
  }

  const { className, startsAt, endsAt } = await req.json();

  if (!className || !startsAt || !endsAt) {
    return NextResponse.json({ error: '수업명, 시작시간, 종료시간이 필요합니다' }, { status: 400 });
  }

  const challenge = generateChallenge();

  const newClass = await prisma.class.create({
    data: {
      professorId: session.user.id,
      className,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      challenge,
    },
  });

  // 알림 (모든 학생에게)
  const students = await prisma.user.findMany({
    where: { role: 'student' },
    select: { id: true },
  });

  if (students.length > 0) {
    await prisma.notification.createMany({
      data: students.map((s) => ({
        userId: s.id,
        type: 'attendance',
        title: '새 출석 생성',
        content: `${user.name || '교수'}님이 "${className}" 출석을 생성했습니다.`,
        link: `/attendance/${newClass.id}`,
      })),
    });
  }

  return NextResponse.json({
    classId: newClass.id,
    challenge,
    link: `/attendance/${newClass.id}`,
  });
}
