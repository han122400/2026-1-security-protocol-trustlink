import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

/** GET /api/chat/conversations - 내 대화 목록 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }

  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        { participant1Id: session.user.id },
        { participant2Id: session.user.id },
      ],
    },
    include: {
      participant1: {
        select: { id: true, name: true, image: true, email: true, hasCertificate: true },
      },
      participant2: {
        select: { id: true, name: true, image: true, email: true, hasCertificate: true },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true, senderId: true },
      },
    },
    orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
  });

  // 상대방 정보로 변환
  const result = conversations.map((conv) => {
    const partner =
      conv.participant1Id === session.user!.id
        ? conv.participant2
        : conv.participant1;
    return {
      id: conv.id,
      partner,
      lastMessageAt: conv.lastMessageAt,
      hasMessages: conv.messages.length > 0,
    };
  });

  return NextResponse.json({ conversations: result });
}

/** POST /api/chat/conversations - 새 대화 시작 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }

  const { partnerId } = await req.json();

  if (!partnerId || partnerId === session.user.id) {
    return NextResponse.json({ error: '유효하지 않은 상대방입니다' }, { status: 400 });
  }

  // 이미 존재하는 대화 확인 (양방향 체크)
  const existing = await prisma.conversation.findFirst({
    where: {
      OR: [
        { participant1Id: session.user.id, participant2Id: partnerId },
        { participant1Id: partnerId, participant2Id: session.user.id },
      ],
    },
  });

  if (existing) {
    return NextResponse.json({ conversationId: existing.id });
  }

  const conversation = await prisma.conversation.create({
    data: {
      participant1Id: session.user.id,
      participant2Id: partnerId,
    },
  });

  return NextResponse.json({ conversationId: conversation.id });
}
