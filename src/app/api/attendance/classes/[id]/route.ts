import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

/** GET /api/attendance/classes/[id] - 출석 세션 상세 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }

  const { id } = await params;

  const classData = await prisma.class.findUnique({
    where: { id },
    include: {
      professor: { select: { name: true, email: true } },
      attendances: {
        include: {
          student: { select: { name: true, email: true } },
        },
        orderBy: { attendedAt: 'asc' },
      },
    },
  });

  if (!classData) {
    return NextResponse.json({ error: '출석 세션을 찾을 수 없습니다' }, { status: 404 });
  }

  // 현재 사용자의 출석 여부
  const myAttendance = classData.attendances.find(
    (a: { studentId: string }) => a.studentId === session.user!.id
  );

  return NextResponse.json({
    classInfo: {
      id: classData.id,
      className: classData.className,
      startsAt: classData.startsAt,
      endsAt: classData.endsAt,
      challenge: classData.challenge,
      professor: classData.professor,
      isProfessor: classData.professorId === session.user.id,
    },
    attendees: classData.attendances.map((a) => ({
      studentName: a.student.name,
      studentEmail: a.student.email,
      attendedAt: a.attendedAt,
      verified: a.verified,
    })),
    myAttendance: myAttendance
      ? { attendedAt: myAttendance.attendedAt, verified: myAttendance.verified }
      : null,
  });
}
