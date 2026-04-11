import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.EMAIL_FROM || 'TrustLink <onboarding@resend.dev>';

/**
 * 보안 메시지 수신 알림 이메일 발송
 * 메시지 원문은 절대 포함하지 않음
 */
export async function sendMessageNotificationEmail(
  to: string,
  senderName: string
) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: '🔐 TrustLink - 새 보안 메시지가 도착했습니다',
      html: `
        <div style="font-family: 'Inter', sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #0A0E1A; margin-bottom: 16px;">🔐 새 보안 메시지</h2>
          <p style="color: #555; line-height: 1.6;">
            <strong>${senderName}</strong>님으로부터 전자봉투로 암호화된 새 보안 메시지가 도착했습니다.
          </p>
          <p style="color: #888; font-size: 14px; margin-top: 24px;">
            보안을 위해 메시지 내용은 이메일에 포함되지 않습니다.<br/>
            TrustLink에 로그인하여 메시지를 확인하세요.
          </p>
          <a href="${process.env.NEXTAUTH_URL}/chat"
             style="display: inline-block; margin-top: 24px; padding: 12px 24px; background: linear-gradient(135deg, #00D4AA, #00B4D8); color: #0A0E1A; text-decoration: none; border-radius: 8px; font-weight: 600;">
            메시지 확인하기
          </a>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send message notification email:', error);
  }
}

/**
 * 출석 생성 알림 이메일 발송
 */
export async function sendAttendanceNotificationEmail(
  to: string,
  className: string,
  professorName: string,
  classId: string
) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: '📋 TrustLink - 새 출석이 생성되었습니다',
      html: `
        <div style="font-family: 'Inter', sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #0A0E1A; margin-bottom: 16px;">📋 출석 알림</h2>
          <p style="color: #555; line-height: 1.6;">
            <strong>${professorName}</strong> 교수님이 <strong>${className}</strong> 수업의 출석을 생성했습니다.
          </p>
          <p style="color: #888; font-size: 14px; margin-top: 16px;">
            인증서 기반 전자서명으로 출석 인증을 완료하세요.
          </p>
          <a href="${process.env.NEXTAUTH_URL}/attendance/${classId}"
             style="display: inline-block; margin-top: 24px; padding: 12px 24px; background: linear-gradient(135deg, #00D4AA, #00B4D8); color: #0A0E1A; text-decoration: none; border-radius: 8px; font-weight: 600;">
            출석하기
          </a>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send attendance notification email:', error);
  }
}
