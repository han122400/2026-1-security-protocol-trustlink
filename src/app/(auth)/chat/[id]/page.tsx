"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import { useSession } from "next-auth/react";
import {
  Send,
  Shield,
  Lock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Key,
  Rocket,
  Edit3,
} from "lucide-react";
import Link from "next/link";
import {
  createDigitalEnvelope,
  openDigitalEnvelope,
  importSignPrivateKey,
  importEncryptPublicKey,
  importDecryptPrivateKey,
  importVerifyKey,
} from "@/lib/crypto";
import { loadKeyPair } from "@/lib/indexeddb";
import type { DigitalEnvelope } from "@/lib/crypto";

type StepStatus = "pending" | "active" | "completed" | "error";

interface Message {
  id: string;
  senderId: string;
  encryptedContent: string;
  encryptedAesKey: string;
  iv: string;
  signature: string;
  senderCertId: string;
  createdAt: string;
  sender: { name: string | null; image: string | null };
  decrypted?: string;
  signatureValid?: boolean;
}

interface PartnerInfo {
  id: string;
  name: string | null;
  image: string | null;
  email: string | null;
}

interface EnvelopeStep {
  title: string;
  icon: React.ReactNode;
  status: StepStatus;
  detail?: string;
}

export default function ChatRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: conversationId } = use(params);
  const { data: session } = useSession();
  const userId = (session?.user as Record<string, unknown>)?.id as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [envelopeSteps, setEnvelopeSteps] = useState<EnvelopeStep[]>([]);
  const [showEnvelope, setShowEnvelope] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/conversations/${conversationId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setPartner(data.partner);

        // 메시지 복호화 시도
        const keys = userId ? await loadKeyPair(userId) : null;
        const decryptedMessages = await Promise.all(
          data.messages.map(async (msg: Message) => {
            if (msg.senderId === userId) {
              return { ...msg, decrypted: "[내가 보낸 메시지 - 암호화됨]", signatureValid: true };
            }

            if (!keys) return { ...msg, decrypted: "[개인키 없음 - 복호화 불가]" };

            try {
              // 수신자 개인키 로드
              const decryptPrivKey = await importDecryptPrivateKey(keys.encryptPrivateKey);

              // 송신자 공개키 조회
              const certRes = await fetch(`/api/certificate/${msg.senderId}`);
              if (!certRes.ok) throw new Error("인증서 조회 실패");
              const certData = await certRes.json();
              const verifyPubKey = await importVerifyKey(certData.signPublicKey);

              const envelope: DigitalEnvelope = {
                encryptedContent: msg.encryptedContent,
                encryptedAesKey: msg.encryptedAesKey,
                iv: msg.iv,
                signature: msg.signature,
              };

              const result = await openDigitalEnvelope(
                envelope,
                decryptPrivKey,
                verifyPubKey
              );

              return {
                ...msg,
                decrypted: result.plaintext,
                signatureValid: result.signatureValid,
              };
            } catch (err) {
              console.error("Decrypt error:", err);
              return { ...msg, decrypted: "[복호화 실패]", signatureValid: false };
            }
          })
        );
        setMessages(decryptedMessages);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [conversationId, userId]);

  useEffect(() => {
    if (userId) fetchMessages();
  }, [fetchMessages, userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 메시지 자동 새로고침 (10초마다)
  useEffect(() => {
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  const updateEnvStep = (index: number, status: StepStatus) => {
    setEnvelopeSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, status } : s))
    );
  };

  const handleSend = async () => {
    if (!input.trim() || !partner || !userId) return;

    setSending(true);
    const plaintext = input.trim();
    setInput("");

    // 전자봉투 애니메이션 초기화
    const initSteps: EnvelopeStep[] = [
      { title: "메시지 작성", icon: <Edit3 size={14} />, status: "pending" },
      { title: "전자서명 생성", icon: <Key size={14} />, status: "pending", detail: "RSASSA-PKCS1-v1_5" },
      { title: "수신자 공개키 암호화", icon: <Lock size={14} />, status: "pending", detail: "AES-256-GCM + RSA-OAEP" },
      { title: "안전 전송 완료", icon: <Rocket size={14} />, status: "pending" },
    ];
    setEnvelopeSteps(initSteps);
    setShowEnvelope(true);

    try {
      // Step 1: 메시지
      updateEnvStep(0, "active");
      await new Promise((r) => setTimeout(r, 400));
      updateEnvStep(0, "completed");

      // Step 2: 전자서명
      updateEnvStep(1, "active");
      const keys = await loadKeyPair(userId);
      if (!keys) throw new Error("개인키를 로드할 수 없습니다");
      const signPrivKey = await importSignPrivateKey(keys.signPrivateKey);
      await new Promise((r) => setTimeout(r, 500));
      updateEnvStep(1, "completed");

      // Step 3: 수신자 공개키 암호화
      updateEnvStep(2, "active");
      const certRes = await fetch(`/api/certificate/${partner.id}`);
      if (!certRes.ok) throw new Error("수신자 인증서 조회 실패");
      const certData = await certRes.json();
      const encryptPubKey = await importEncryptPublicKey(certData.encryptPublicKey);

      const envelope = await createDigitalEnvelope(
        plaintext,
        signPrivKey,
        encryptPubKey
      );
      updateEnvStep(2, "completed");

      // Step 4: 전송
      updateEnvStep(3, "active");

      // 내 인증서 ID 조회
      const myCertRes = await fetch("/api/certificate/me");
      const myCertData = await myCertRes.json();

      const res = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...envelope,
          senderCertId: myCertData.certificate?.id,
        }),
      });

      if (!res.ok) throw new Error("메시지 전송 실패");

      updateEnvStep(3, "completed");
      await new Promise((r) => setTimeout(r, 800));
      setShowEnvelope(false);

      // 메시지 새로고침
      fetchMessages();
    } catch (error) {
      console.error("Send error:", error);
      alert(error instanceof Error ? error.message : "전송 실패");
      const failIdx = envelopeSteps.findIndex((s) => s.status === "active");
      if (failIdx >= 0) updateEnvStep(failIdx, "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* 채팅 헤더 */}
      <div className="page-header" style={{ padding: "12px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link href="/chat" style={{ color: "var(--text-secondary)" }}>
            <ArrowLeft size={20} />
          </Link>
          {partner && (
            <>
              {partner.image ? (
                <img
                  src={partner.image}
                  alt=""
                  style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "var(--accent-gradient)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    color: "#0A0E1A",
                  }}
                >
                  {partner.name?.charAt(0) || "?"}
                </div>
              )}
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                  {partner.name}
                </div>
                <div className="text-xs text-accent" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Lock size={10} />
                  전자봉투 암호화
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 채팅 영역 */}
      <div className="chat-container">
        <div className="chat-messages">
          {loading ? (
            <div className="empty-state">메시지 로딩 중...</div>
          ) : messages.length === 0 ? (
            <div className="empty-state">
              <Lock size={48} className="empty-state-icon" />
              <p>아직 메시지가 없습니다.</p>
              <p className="text-xs text-muted">
                전자봉투로 암호화된 메시지를 보내보세요.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-bubble ${
                  msg.senderId === userId
                    ? "chat-bubble-sent"
                    : "chat-bubble-received"
                }`}
              >
                <div style={{ fontSize: "0.9rem", lineHeight: 1.5 }}>
                  {msg.decrypted || "[암호화됨]"}
                </div>
                <div className="chat-bubble-meta">
                  <span>
                    {new Date(msg.createdAt).toLocaleTimeString("ko-KR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {msg.signatureValid === true && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                        color: "var(--success)",
                      }}
                    >
                      <CheckCircle2 size={10} />
                      서명 검증됨
                    </span>
                  )}
                  {msg.signatureValid === false && msg.senderId !== userId && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                        color: "var(--error)",
                      }}
                    >
                      <AlertCircle size={10} />
                      서명 검증 실패
                    </span>
                  )}
                  <Shield size={10} style={{ color: "var(--text-muted)" }} />
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 전자봉투 애니메이션 */}
        {showEnvelope && (
          <div
            style={{
              padding: "12px 24px",
              borderTop: "1px solid var(--border-color)",
              background: "var(--bg-secondary)",
            }}
          >
            <div style={{ fontSize: "0.82rem", fontWeight: 700, marginBottom: "8px", color: "var(--accent-primary)" }}>
              🔐 전자봉투 메시지 전송 중
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {envelopeSteps.map((step, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontSize: "0.78rem",
                    background:
                      step.status === "completed"
                        ? "rgba(0,212,170,0.1)"
                        : step.status === "active"
                        ? "rgba(0,180,216,0.1)"
                        : "var(--bg-primary)",
                    border: `1px solid ${
                      step.status === "completed"
                        ? "rgba(0,212,170,0.3)"
                        : step.status === "active"
                        ? "rgba(0,180,216,0.3)"
                        : "var(--border-color)"
                    }`,
                    color:
                      step.status === "completed"
                        ? "var(--success)"
                        : step.status === "active"
                        ? "var(--info)"
                        : "var(--text-muted)",
                  }}
                >
                  {step.status === "completed" ? (
                    <CheckCircle2 size={12} />
                  ) : step.status === "active" ? (
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        border: "2px solid var(--info)",
                        borderTopColor: "transparent",
                        animation: "spin 1s linear infinite",
                      }}
                    />
                  ) : (
                    step.icon
                  )}
                  {step.title}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 입력 영역 */}
        <div className="chat-input-area">
          <input
            className="input-field"
            placeholder="보안 메시지를 입력하세요..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            disabled={sending}
          />
          <button
            className="btn btn-primary"
            onClick={handleSend}
            disabled={sending || !input.trim()}
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
