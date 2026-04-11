import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sendMessageNotificationEmail } from '@/lib/email';

/** GET /api/chat/conversations/[id]/messages - 메시지 목록 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }

  const { id } = await params;

  // 대화 참여자 확인
  const conversation = await prisma.conversation.findFirst({
    where: {
      id,
      OR: [
        { participant1Id: session.user.id },
        { participant2Id: session.user.id },
      ],
    },
    include: {
      participant1: { select: { id: true, name: true, image: true, email: true } },
      participant2: { select: { id: true, name: true, image: true, email: true } },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: '대화를 찾을 수 없습니다' }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get('cursor');
  const limit = parseInt(searchParams.get('limit') || '50');

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: 'asc' },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      senderId: true,
      encryptedContent: true,
      encryptedAesKey: true,
      iv: true,
      signature: true,
      senderCertId: true,
      createdAt: true,
      sender: { select: { name: true, image: true } },
    },
  });

  const partner =
    conversation.participant1Id === session.user.id
      ? conversation.participant2
      : conversation.participant1;

  return NextResponse.json({
    messages,
    partner,
    conversationId: id,
  });
}

/** POST /api/chat/conversations/[id]/messages - 메시지 전송 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }

  const { id } = await params;

  // 대화 참여자 확인
  const conversation = await prisma.conversation.findFirst({
    where: {
      id,
      OR: [
        { participant1Id: session.user.id },
        { participant2Id: session.user.id },
      ],
    },
    include: {
      participant1: { select: { id: true, name: true, email: true } },
      participant2: { select: { id: true, name: true, email: true } },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: '대화를 찾을 수 없습니다' }, { status: 404 });
  }

  const { encryptedContent, encryptedAesKey, iv, signature, senderCertId } =
    await req.json();

  if (!encryptedContent || !encryptedAesKey || !iv || !signature || !senderCertId) {
    return NextResponse.json({ error: '전자봉투 데이터가 불완전합니다' }, { status: 400 });
  }

  // 메시지 저장
  const message = await prisma.message.create({
    data: {
      conversationId: id,
      senderId: session.user.id,
      encryptedContent,
      encryptedAesKey,
      iv,
      signature,
      senderCertId,
    },
  });

  // 대화 마지막 메시지 시간 업데이트
  await prisma.conversation.update({
    where: { id },
    data: { lastMessageAt: new Date() },
  });

  // 수신자 알림 생성
  const recipientId =
    conversation.participant1Id === session.user.id
      ? conversation.participant2Id
      : conversation.participant1Id;

  const recipient =
    conversation.participant1Id === session.user.id
      ? conversation.participant2
      : conversation.participant1;

  await prisma.notification.create({
    data: {
      userId: recipientId,
      type: 'message',
      title: '새 보안 메시지',
      content: `${session.user.name || '사용자'}님으로부터 전자봉투 메시지가 도착했습니다.`,
      link: `/chat/${id}`,
    },
  });

  // 이메일 알림 발송 (비동기)
  if (recipient.email) {
    sendMessageNotificationEmail(
      recipient.email,
      session.user.name || '사용자'
    ).catch(console.error);
  }

  return NextResponse.json({
    messageId: message.id,
    createdAt: message.createdAt,
  });
}
