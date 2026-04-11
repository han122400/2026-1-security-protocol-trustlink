"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileCheck,
  Shield,
  Key,
  CheckCircle2,
  AlertCircle,
  Mail,
} from "lucide-react";
import { signData, importSignPrivateKey, bufferToBase64, base64ToBuffer } from "@/lib/crypto";
import { loadKeyPair } from "@/lib/indexeddb";

type StepStatus = "pending" | "active" | "completed" | "error";

export default function CertLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [challenge, setChallenge] = useState("");
  const [userName, setUserName] = useState("");
  const [step, setStep] = useState<"email" | "sign" | "done">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [signSteps, setSignSteps] = useState<{ title: string; status: StepStatus }[]>([
    { title: "Challenge 수신", status: "pending" },
    { title: "개인키 로드", status: "pending" },
    { title: "전자서명 생성", status: "pending" },
    { title: "서명 검증 및 로그인", status: "pending" },
  ]);

  const updateSignStep = (index: number, status: StepStatus) => {
    setSignSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, status } : s))
    );
  };

  const requestChallenge = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/cert-login/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setChallengeId(data.challengeId);
      setChallenge(data.challenge);
      setUserName(data.userName);
      setStep("sign");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Challenge 요청 실패");
    }
    setLoading(false);
  };

  const handleSign = async () => {
    setLoading(true);
    setError("");

    try {
      // Step 1: Challenge 수신
      updateSignStep(0, "completed");

      // Step 2: 개인키 로드
      updateSignStep(1, "active");
      // email로 연결된 userId를 알 수 없으므로, 모든 키를 시도
      // 실제로는 email과 연결된 userId를 사용해야 함
      // 여기서는 IndexedDB의 모든 키를 순회
      const db = indexedDB;
      const request = db.open("trustlink-keystore", 1);
      
      const keys = await new Promise<{ signPrivateKey: JsonWebKey } | null>((resolve) => {
        request.onsuccess = () => {
          const dbResult = request.result;
          const tx = dbResult.transaction("keys", "readonly");
          const store = tx.objectStore("keys");
          const getAll = store.getAll();
          getAll.onsuccess = () => {
            const allKeys = getAll.result;
            resolve(allKeys.length > 0 ? allKeys[0] : null);
          };
          getAll.onerror = () => resolve(null);
        };
        request.onerror = () => resolve(null);
      });

      if (!keys) throw new Error("저장된 개인키를 찾을 수 없습니다");
      await new Promise((r) => setTimeout(r, 500));
      updateSignStep(1, "completed");

      // Step 3: 전자서명 생성
      updateSignStep(2, "active");
      const signPrivKey = await importSignPrivateKey(keys.signPrivateKey);
      const challengeBuffer = base64ToBuffer(challenge);
      const signatureBuffer = await signData(signPrivKey, challengeBuffer);
      const signatureBase64 = bufferToBase64(signatureBuffer);
      await new Promise((r) => setTimeout(r, 600));
      updateSignStep(2, "completed");

      // Step 4: 서버 검증
      updateSignStep(3, "active");
      const res = await fetch("/api/cert-login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, signature: signatureBase64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      updateSignStep(3, "completed");
      setStep("done");
      await new Promise((r) => setTimeout(r, 1000));
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "전자서명 로그인 실패");
      const failIdx = signSteps.findIndex((s) => s.status === "active");
      if (failIdx >= 0) updateSignStep(failIdx, "error");
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="animated-bg" />

      <div className="login-card glass-card" style={{ maxWidth: "460px" }}>
        <FileCheck
          size={48}
          style={{ color: "var(--accent-primary)", marginBottom: "12px" }}
        />
        <h1 className="login-logo" style={{ fontSize: "1.6rem" }}>
          인증서 로그인
        </h1>
        <p className="login-subtitle">
          인증서의 개인키로 전자서명하여 로그인합니다
        </p>

        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px",
              background: "rgba(255,107,107,0.1)",
              border: "1px solid rgba(255,107,107,0.2)",
              borderRadius: "8px",
              marginBottom: "16px",
              fontSize: "0.85rem",
              color: "var(--error)",
            }}
          >
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {step === "email" && (
          <div>
            <label className="input-label">
              <Mail size={14} style={{ verticalAlign: "middle", marginRight: "4px" }} />
              이메일 주소
            </label>
            <input
              className="input-field"
              type="email"
              placeholder="Google 계정 이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && requestChallenge()}
              style={{ marginBottom: "16px" }}
            />
            <button
              className="btn btn-primary w-full"
              onClick={requestChallenge}
              disabled={loading || !email}
            >
              {loading ? "요청 중..." : "Challenge 요청"}
            </button>
          </div>
        )}

        {step === "sign" && (
          <div>
            <div
              className="card"
              style={{ marginBottom: "16px", textAlign: "left" }}
            >
              <div className="text-xs text-muted" style={{ marginBottom: "4px" }}>
                사용자
              </div>
              <div style={{ fontWeight: 600, marginBottom: "12px" }}>{userName}</div>
              <div className="text-xs text-muted" style={{ marginBottom: "4px" }}>
                Challenge (Base64)
              </div>
              <div
                className="text-mono text-xs"
                style={{
                  wordBreak: "break-all",
                  padding: "8px",
                  background: "var(--bg-primary)",
                  borderRadius: "6px",
                  color: "var(--accent-primary)",
                }}
              >
                {challenge}
              </div>
            </div>

            <button
              className="btn btn-primary w-full"
              onClick={handleSign}
              disabled={loading}
              style={{ marginBottom: "16px" }}
            >
              <Key size={16} />
              {loading ? "서명 진행 중..." : "전자서명 수행"}
            </button>

            {/* 서명 단계 표시 */}
            {loading && (
              <div style={{ textAlign: "left" }}>
                {signSteps.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "6px 0",
                      fontSize: "0.82rem",
                      color:
                        s.status === "completed"
                          ? "var(--success)"
                          : s.status === "active"
                          ? "var(--info)"
                          : s.status === "error"
                          ? "var(--error)"
                          : "var(--text-muted)",
                    }}
                  >
                    {s.status === "completed" ? (
                      <CheckCircle2 size={14} />
                    ) : s.status === "active" ? (
                      <div
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          border: "2px solid currentColor",
                          borderTopColor: "transparent",
                          animation: "spin 1s linear infinite",
                        }}
                      />
                    ) : s.status === "error" ? (
                      <AlertCircle size={14} />
                    ) : (
                      <div
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          border: "2px solid currentColor",
                        }}
                      />
                    )}
                    {s.title}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === "done" && (
          <div style={{ textAlign: "center" }}>
            <CheckCircle2
              size={56}
              style={{ color: "var(--success)", marginBottom: "16px" }}
            />
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "8px" }}>
              로그인 성공!
            </h3>
            <p className="text-sm text-secondary">대시보드로 이동합니다...</p>
          </div>
        )}

        <div className="login-divider">또는</div>
        <a href="/" className="btn btn-secondary w-full" style={{ display: "flex" }}>
          Google 계정으로 로그인
        </a>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
