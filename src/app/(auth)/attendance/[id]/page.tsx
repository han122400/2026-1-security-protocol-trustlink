"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useSession } from "next-auth/react";
import {
  ClipboardCheck,
  Key,
  Shield,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  FileCheck,
} from "lucide-react";
import { signData, importSignPrivateKey, bufferToBase64, base64ToBuffer } from "@/lib/crypto";
import { loadKeyPair } from "@/lib/indexeddb";

type StepStatus = "pending" | "active" | "completed" | "error";

interface ClassInfo {
  id: string;
  className: string;
  startsAt: string;
  endsAt: string;
  challenge: string;
  professor: { name: string | null };
  isProfessor: boolean;
}

interface Attendee {
  studentName: string | null;
  studentEmail: string | null;
  attendedAt: string;
  verified: boolean;
}

interface AttendStep {
  title: string;
  description: string;
  status: StepStatus;
}

export default function AttendanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const userId = (session?.user as Record<string, unknown>)?.id as string;

  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [myAttendance, setMyAttendance] = useState<{
    attendedAt: string;
    verified: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [attending, setAttending] = useState(false);
  const [steps, setSteps] = useState<AttendStep[]>([
    { title: "출석 요청 확인", description: "Challenge 수신", status: "pending" },
    { title: "개인키 전자서명", description: "서명 생성 중...", status: "pending" },
    { title: "인증서 검증", description: "서버 검증 대기", status: "pending" },
    { title: "출석부 기록", description: "기록 완료 대기", status: "pending" },
  ]);
  const [countdown, setCountdown] = useState("");

  const fetchClass = useCallback(async () => {
    try {
      const res = await fetch(`/api/attendance/classes/${id}`);
      if (res.ok) {
        const data = await res.json();
        setClassInfo(data.classInfo);
        setAttendees(data.attendees);
        setMyAttendance(data.myAttendance);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchClass();
  }, [fetchClass]);

  // 카운트다운
  useEffect(() => {
    if (!classInfo) return;
    const timer = setInterval(() => {
      const now = new Date();
      const end = new Date(classInfo.endsAt);
      const diff = end.getTime() - now.getTime();
      if (diff <= 0) {
        setCountdown("종료됨");
        clearInterval(timer);
        return;
      }
      const min = Math.floor(diff / 60000);
      const sec = Math.floor((diff % 60000) / 1000);
      setCountdown(`${min}분 ${sec}초 남음`);
    }, 1000);
    return () => clearInterval(timer);
  }, [classInfo]);

  const updateStep = (index: number, status: StepStatus) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, status } : s))
    );
  };

  const handleAttend = async () => {
    if (!classInfo || !userId) return;
    setAttending(true);

    try {
      // Step 1: Challenge 확인
      updateStep(0, "active");
      await new Promise((r) => setTimeout(r, 500));
      updateStep(0, "completed");

      // Step 2: 전자서명
      updateStep(1, "active");
      const keys = await loadKeyPair(userId);
      if (!keys) throw new Error("개인키를 로드할 수 없습니다. 인증서를 먼저 발급받으세요.");
      const signPrivKey = await importSignPrivateKey(keys.signPrivateKey);
      const challengeBuffer = base64ToBuffer(classInfo.challenge);
      const signatureBuffer = await signData(signPrivKey, challengeBuffer);
      const signatureBase64 = bufferToBase64(signatureBuffer);
      await new Promise((r) => setTimeout(r, 600));
      updateStep(1, "completed");

      // Step 3: 서버 검증
      updateStep(2, "active");
      const myCertRes = await fetch("/api/certificate/me");
      const myCertData = await myCertRes.json();
      if (!myCertData.certificate) throw new Error("활성 인증서가 없습니다");

      const res = await fetch(`/api/attendance/classes/${id}/attend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature: signatureBase64,
          certId: myCertData.certificate.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "출석 실패");

      updateStep(2, "completed");

      // Step 4: 완료
      updateStep(3, "active");
      await new Promise((r) => setTimeout(r, 500));
      updateStep(3, "completed");

      setMyAttendance({ attendedAt: data.attendedAt, verified: data.verified });
      fetchClass();
    } catch (error) {
      console.error("Attendance error:", error);
      alert(error instanceof Error ? error.message : "출석 실패");
      const failIdx = steps.findIndex((s) => s.status === "active");
      if (failIdx >= 0) updateStep(failIdx, "error");
    } finally {
      setAttending(false);
    }
  };

  if (loading) {
    return (
      <>
        <div className="page-header">
          <h1 className="page-title">출석</h1>
        </div>
        <div className="page-content">
          <div className="empty-state">로딩 중...</div>
        </div>
      </>
    );
  }

  if (!classInfo) {
    return (
      <>
        <div className="page-header">
          <h1 className="page-title">출석</h1>
        </div>
        <div className="page-content">
          <div className="empty-state">출석 세션을 찾을 수 없습니다.</div>
        </div>
      </>
    );
  }

  const now = new Date();
  const isActive = now >= new Date(classInfo.startsAt) && now <= new Date(classInfo.endsAt);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">{classInfo.className}</h1>
        <span
          className={`badge ${isActive ? "badge-success" : "badge-error"}`}
        >
          {isActive ? "진행 중" : now < new Date(classInfo.startsAt) ? "예정" : "종료"}
        </span>
      </div>

      <div className="page-content">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", maxWidth: "800px" }}>
          {/* 왼쪽: 출석 정보 & 인증 */}
          <div>
            <div className="card" style={{ marginBottom: "16px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  fontSize: "0.85rem",
                }}
              >
                <div>
                  <div className="text-xs text-muted">교수</div>
                  <div style={{ fontWeight: 600 }}>{classInfo.professor.name}</div>
                </div>
                <div>
                  <div className="text-xs text-muted">남은 시간</div>
                  <div className="countdown">{countdown}</div>
                </div>
                <div>
                  <div className="text-xs text-muted">시작</div>
                  <div>
                    {new Date(classInfo.startsAt).toLocaleString("ko-KR", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted">종료</div>
                  <div>
                    {new Date(classInfo.endsAt).toLocaleString("ko-KR", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* 출석 버튼 or 결과 */}
            {!classInfo.isProfessor && (
              myAttendance ? (
                <div className="attendance-success" style={{ borderRadius: "12px" }}>
                  <CheckCircle2 size={20} />
                  <div>
                    <div style={{ fontWeight: 600 }}>출석 완료</div>
                    <div className="text-xs" style={{ opacity: 0.8 }}>
                      {new Date(myAttendance.attendedAt).toLocaleString("ko-KR")}
                      {myAttendance.verified ? " · 서명 검증됨" : " · 서명 검증 실패"}
                    </div>
                  </div>
                </div>
              ) : isActive ? (
                <div>
                  <button
                    className="btn btn-primary w-full"
                    style={{ padding: "16px", fontSize: "1rem" }}
                    onClick={handleAttend}
                    disabled={attending}
                  >
                    <FileCheck size={20} />
                    {attending ? "인증 진행 중..." : "전자서명으로 출석 인증"}
                  </button>

                  {/* 전자서명 출석 애니메이션 */}
                  {attending && (
                    <div className="card" style={{ marginTop: "16px" }}>
                      <h4
                        style={{
                          fontSize: "0.9rem",
                          fontWeight: 700,
                          marginBottom: "12px",
                          color: "var(--accent-primary)",
                        }}
                      >
                        📋 출석 인증 진행 중
                      </h4>
                      <div className="step-progress">
                        {steps.map((step, i) => (
                          <div className={`step-item step-${step.status}`} key={i}>
                            <div className="step-icon">
                              {step.status === "completed" ? (
                                <CheckCircle2 size={14} />
                              ) : step.status === "error" ? (
                                <AlertCircle size={14} />
                              ) : (
                                i + 1
                              )}
                            </div>
                            <div className="step-content">
                              <div className="step-title">{step.title}</div>
                              <div className="step-description">{step.description}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="card text-center text-muted">
                  <Clock size={24} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
                  출석 시간이 아닙니다
                </div>
              )
            )}
          </div>

          {/* 오른쪽: 출석 현황 */}
          <div>
            <div className="card">
              <h3
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Users size={16} />
                출석 현황 ({attendees.length}명)
              </h3>
              {attendees.length === 0 ? (
                <div className="text-sm text-muted">아직 출석한 학생이 없습니다.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {attendees.map((a, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        background: "var(--bg-primary)",
                        fontSize: "0.85rem",
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600 }}>{a.studentName}</span>
                        <span className="text-xs text-muted" style={{ marginLeft: "8px" }}>
                          {a.studentEmail}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span className="text-xs text-muted">
                          {new Date(a.attendedAt).toLocaleTimeString("ko-KR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {a.verified ? (
                          <CheckCircle2 size={14} style={{ color: "var(--success)" }} />
                        ) : (
                          <AlertCircle size={14} style={{ color: "var(--error)" }} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
