"use client";

import { signIn } from "next-auth/react";
import { Shield, Lock, FileCheck, Mail } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="login-page">
      {/* 애니메이션 배경 */}
      <div className="animated-bg" />

      <div className="login-card glass-card">
        {/* 로고 */}
        <div style={{ marginBottom: "8px" }}>
          <Shield
            size={48}
            style={{ color: "var(--accent-primary)", marginBottom: "12px" }}
          />
        </div>
        <h1 className="login-logo">TrustLink</h1>
        <p className="login-subtitle">
          인증서 기반 전자봉투 보안 메신저
        </p>

        {/* 기능 소개 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            marginBottom: "32px",
            textAlign: "left",
          }}
        >
          <FeatureItem icon={<Lock size={16} />} text="전자봉투 암호화" />
          <FeatureItem icon={<FileCheck size={16} />} text="전자서명 인증" />
          <FeatureItem icon={<Shield size={16} />} text="인증서 기반 로그인" />
          <FeatureItem icon={<Mail size={16} />} text="보안 메시지" />
        </div>

        {/* Google 로그인 */}
        <button
          className="google-btn"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          id="google-login-btn"
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google 계정으로 로그인
        </button>

        <div className="login-divider">또는</div>

        {/* 인증서 로그인 링크 */}
        <a
          href="/cert-login"
          className="btn btn-secondary w-full"
          style={{ display: "flex" }}
          id="cert-login-link"
        >
          <FileCheck size={18} />
          인증서로 로그인
        </a>

        <p
          style={{
            marginTop: "24px",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
          }}
        >
          Web Crypto API 기반 종단 간 암호화 · 개인키는 브라우저에만 보관
        </p>
      </div>
    </div>
  );
}

function FeatureItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 12px",
        background: "var(--bg-secondary)",
        borderRadius: "8px",
        fontSize: "0.8rem",
        color: "var(--text-secondary)",
      }}
    >
      <span style={{ color: "var(--accent-primary)", flexShrink: 0 }}>
        {icon}
      </span>
      {text}
    </div>
  );
}
