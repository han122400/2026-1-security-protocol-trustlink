"use client";

import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { User, Shield, LogOut, Key, Mail, Clock } from "lucide-react";

export default function MyPage() {
  const { data: session } = useSession();
  const user = session?.user as Record<string, unknown> | undefined;

  if (!user) return null;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">마이페이지</h1>
      </div>

      <div className="page-content">
        <div style={{ maxWidth: "500px" }}>
          {/* 프로필 카드 */}
          <div className="card" style={{ marginBottom: "16px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                marginBottom: "20px",
              }}
            >
              {user.image ? (
                <img
                  src={user.image as string}
                  alt="프로필"
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "3px solid var(--border-accent)",
                  }}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    background: "var(--accent-gradient)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    color: "#0A0E1A",
                  }}
                >
                  {(user.name as string)?.charAt(0) || "U"}
                </div>
              )}
              <div>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>
                  {user.name as string}
                </h2>
                <div className="text-sm text-secondary" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Mail size={12} />
                  {user.email as string}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                fontSize: "0.85rem",
              }}
            >
              <div
                style={{
                  padding: "12px",
                  background: "var(--bg-primary)",
                  borderRadius: "8px",
                }}
              >
                <div className="text-xs text-muted" style={{ marginBottom: "4px" }}>
                  <User size={12} style={{ verticalAlign: "middle", marginRight: "4px" }} />
                  역할
                </div>
                <div style={{ fontWeight: 600 }}>
                  {user.role === "professor"
                    ? "교수"
                    : user.role === "student"
                    ? "학생"
                    : "일반 사용자"}
                </div>
              </div>

              <div
                style={{
                  padding: "12px",
                  background: "var(--bg-primary)",
                  borderRadius: "8px",
                }}
              >
                <div className="text-xs text-muted" style={{ marginBottom: "4px" }}>
                  <Shield size={12} style={{ verticalAlign: "middle", marginRight: "4px" }} />
                  인증서
                </div>
                <div style={{ fontWeight: 600 }}>
                  {user.hasCertificate ? (
                    <span style={{ color: "var(--success)" }}>보유 중</span>
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>미발급</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 보안 정보 */}
          <div className="card" style={{ marginBottom: "16px" }}>
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
              <Key size={16} style={{ color: "var(--accent-primary)" }} />
              보안 정보
            </h3>
            <div className="text-sm text-secondary" style={{ lineHeight: 1.8 }}>
              <p>• 개인키는 이 브라우저의 IndexedDB에만 보관됩니다.</p>
              <p>• 서버에는 공개키와 인증서만 저장되어 있습니다.</p>
              <p>• 브라우저 데이터 삭제 시 개인키가 손실될 수 있습니다.</p>
              <p>
                • 개인키 분실 시 기존 인증서를 폐기하고 새로 발급받아야
                합니다.
              </p>
            </div>
          </div>

          {/* 로그아웃 */}
          <button
            className="btn btn-danger w-full"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut size={16} />
            로그아웃
          </button>
        </div>
      </div>
    </>
  );
}
