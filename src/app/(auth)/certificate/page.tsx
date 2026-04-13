"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Key,
  Send,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RefreshCw,
  Lock,
} from "lucide-react";
import {
  generateSignKeyPair,
  generateEncryptKeyPair,
  exportKeyToJwk,
} from "@/lib/crypto";
import { saveKeyPair, loadKeyPair } from "@/lib/indexeddb";

type StepStatus = "pending" | "active" | "completed" | "error";

interface CertStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  status: StepStatus;
  detail?: string;
}

interface CertInfo {
  id: string;
  serialNumber: string;
  subjectName: string;
  certificateData: {
    issuer: { commonName: string; organization: string };
    validity: { notBefore: string; notAfter: string };
    publicKey: { algorithm: string };
    signature: string;
  };
  issuedAt: string;
  expiresAt: string;
  status: string;
}

export default function CertificatePage() {
  const { data: session } = useSession();
  const [cert, setCert] = useState<CertInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [hasLocalKeys, setHasLocalKeys] = useState(false);
  const [steps, setSteps] = useState<CertStep[]>([
    { title: "RSA 키쌍 생성", description: "브라우저에서 2048bit RSA 키쌍 생성", icon: <Key size={16} />, status: "pending", detail: "RSA-2048" },
    { title: "공개키 전송", description: "서명용 + 암호화용 공개키를 서버로 전송", icon: <Send size={16} />, status: "pending" },
    { title: "서버 인증서 서명", description: "서버 CA가 X.509 유사 인증서 발급", icon: <Shield size={16} />, status: "pending", detail: "SHA-256 with RSA" },
    { title: "인증서 수령 완료", description: "인증서가 발급되어 DB에 저장됨", icon: <CheckCircle2 size={16} />, status: "pending" },
  ]);

  const userId = (session?.user as Record<string, unknown>)?.id as string;

  const fetchCert = useCallback(async () => {
    try {
      const res = await fetch("/api/certificate/me");
      if (res.ok) {
        const data = await res.json();
        setCert(data.certificate);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCert();
  }, [fetchCert]);

  useEffect(() => {
    if (userId) {
      loadKeyPair(userId).then((keys) => setHasLocalKeys(!!keys));
    }
  }, [userId]);

  const updateStep = (index: number, status: StepStatus) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, status } : s))
    );
  };

  const handleIssue = async () => {
    if (!userId) return;
    setIssuing(true);

    try {
      // Step 1: 키쌍 생성
      updateStep(0, "active");
      await new Promise((r) => setTimeout(r, 800));
      const signKeyPair = await generateSignKeyPair();
      const encryptKeyPair = await generateEncryptKeyPair();
      const signPublicJwk = await exportKeyToJwk(signKeyPair.publicKey);
      const signPrivateJwk = await exportKeyToJwk(signKeyPair.privateKey);
      const encryptPublicJwk = await exportKeyToJwk(encryptKeyPair.publicKey);
      const encryptPrivateJwk = await exportKeyToJwk(encryptKeyPair.privateKey);
      updateStep(0, "completed");

      // 개인키를 IndexedDB에 저장
      await saveKeyPair({
        id: `keys-${userId}`,
        signPrivateKey: signPrivateJwk,
        encryptPrivateKey: encryptPrivateJwk,
        createdAt: new Date().toISOString(),
      });
      setHasLocalKeys(true);

      // Step 2: 공개키 전송
      updateStep(1, "active");
      await new Promise((r) => setTimeout(r, 600));
      updateStep(1, "completed");

      // Step 3: 서버 인증서 서명
      updateStep(2, "active");
      const res = await fetch("/api/certificate/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signPublicKey: signPublicJwk,
          encryptPublicKey: encryptPublicJwk,
          subjectName: session?.user?.name || "Unknown",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "인증서 발급 실패");
      }

      updateStep(2, "completed");

      // Step 4: 완료
      updateStep(3, "active");
      await new Promise((r) => setTimeout(r, 500));
      updateStep(3, "completed");

      // 인증서 정보 새로고침
      await fetchCert();
    } catch (error) {
      console.error("Certificate issue error:", error);
      const failIdx = steps.findIndex((s) => s.status === "active");
      if (failIdx >= 0) updateStep(failIdx, "error");
      alert(error instanceof Error ? error.message : "인증서 발급 실패");
    } finally {
      setIssuing(false);
    }
  };

  const handleRevoke = async () => {
    if (!cert || !confirm("인증서를 폐기하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    try {
      await fetch("/api/certificate/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificateId: cert.id }),
      });
      setCert(null);
      setSteps((prev) => prev.map((s) => ({ ...s, status: "pending" as StepStatus })));
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <>
        <div className="page-header">
          <h1 className="page-title">인증서 관리</h1>
        </div>
        <div className="page-content">
          <div className="empty-state">로딩 중...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">인증서 관리</h1>
      </div>

      <div className="page-content">
        {cert ? (
          /* 인증서 보유 상태 */
          <div style={{ maxWidth: "600px" }}>
            <div className="cert-card">
              <div className="cert-card-content">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "20px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <Shield size={28} style={{ color: "var(--accent-primary)" }} />
                    <div>
                      <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                        디지털 인증서
                      </h2>
                      <div className="text-xs text-muted">
                        TrustLink CA 발급
                      </div>
                    </div>
                  </div>
                  <span className="badge badge-success">
                    <CheckCircle2 size={12} />
                    활성
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                    fontSize: "0.85rem",
                  }}
                >
                  <div>
                    <div className="text-xs text-muted" style={{ marginBottom: "4px" }}>
                      주체 (Subject)
                    </div>
                    <div style={{ fontWeight: 600 }}>{cert.subjectName}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted" style={{ marginBottom: "4px" }}>
                      일련번호
                    </div>
                    <div className="text-mono text-xs" style={{ wordBreak: "break-all" }}>
                      {cert.serialNumber.slice(0, 16)}...
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted" style={{ marginBottom: "4px" }}>
                      발급일
                    </div>
                    <div>{new Date(cert.issuedAt).toLocaleDateString("ko-KR")}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted" style={{ marginBottom: "4px" }}>
                      만료일
                    </div>
                    <div>{new Date(cert.expiresAt).toLocaleDateString("ko-KR")}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted" style={{ marginBottom: "4px" }}>
                      알고리즘
                    </div>
                    <div className="text-mono text-xs">RSA-2048</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted" style={{ marginBottom: "4px" }}>
                      개인키 보관
                    </div>
                    <div>
                      {hasLocalKeys ? (
                        <span className="badge badge-success">
                          <CheckCircle2 size={10} />
                          브라우저 보관 중
                        </span>
                      ) : (
                        <span className="badge badge-warning">
                          <AlertCircle size={10} />
                          없음
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* CA 서명 해시 표시 */}
                <div
                  style={{
                    marginTop: "20px",
                    padding: "12px",
                    background: "var(--bg-secondary)",
                    borderRadius: "8px",
                  }}
                >
                  <div className="text-xs text-muted" style={{ marginBottom: "4px" }}>
                    CA 서명 (SHA-256)
                  </div>
                  <div
                    className="text-mono text-xs"
                    style={{ wordBreak: "break-all", color: "var(--accent-primary)" }}
                  >
                    {cert.certificateData?.signature?.slice(0, 64)}...
                  </div>
                </div>

                <button
                  className="btn btn-danger"
                  style={{ marginTop: "20px", width: "100%" }}
                  onClick={handleRevoke}
                >
                  <Trash2 size={16} />
                  인증서 폐기
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* 인증서 미보유 상태 - 발급 단계 UI */
          <div style={{ maxWidth: "600px" }}>
            <div className="card" style={{ marginBottom: "24px", textAlign: "center" }}>
              <Shield
                size={56}
                style={{
                  color: "var(--text-muted)",
                  marginBottom: "16px",
                  opacity: 0.3,
                }}
              />
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "8px" }}>
                인증서를 발급받으세요
              </h2>
              <p className="text-sm text-secondary" style={{ marginBottom: "24px" }}>
                RSA 키쌍을 생성하고 서버 CA로부터 디지털 인증서를 발급받습니다.
                <br />
                개인키는 이 브라우저에만 안전하게 보관됩니다.
              </p>

              <button
                className="btn btn-primary"
                onClick={handleIssue}
                disabled={issuing}
                id="issue-cert-btn"
              >
                {issuing ? (
                  <>
                    <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} />
                    발급 진행 중...
                  </>
                ) : (
                  <>
                    <Shield size={16} />
                    인증서 발급
                  </>
                )}
              </button>
            </div>

            {/* 단계별 진행 UI */}
            {issuing && (
              <div className="card">
                <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Lock size={18} /> 인증서 발급 진행 중
                </h3>
                <div className="step-progress">
                  {steps.map((step, i) => (
                    <div className={`step-item step-${step.status}`} key={i}>
                      <div className="step-icon">
                        {step.status === "completed" ? (
                          <CheckCircle2 size={16} />
                        ) : step.status === "error" ? (
                          <AlertCircle size={16} />
                        ) : (
                          i + 1
                        )}
                      </div>
                      <div className="step-content">
                        <div className="step-title">{step.title}</div>
                        <div className="step-description">{step.description}</div>
                        {step.detail && step.status !== "pending" && (
                          <span className="step-detail">{step.detail}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="step-progress-bar" style={{ marginTop: "16px" }}>
                  <div
                    className="step-progress-bar-fill"
                    style={{
                      width: `${(steps.filter((s) => s.status === "completed").length / steps.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
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
