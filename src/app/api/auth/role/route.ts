import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

/** PATCH /api/auth/role - 역할 설정 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }

  const { role } = await req.json();
  if (!['student', 'professor', 'general'].includes(role)) {
    return NextResponse.json({ error: '유효하지 않은 역할입니다' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { role },
  });

  return NextResponse.json({ success: true });
}
