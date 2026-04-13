"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Shield,
  MessageSquareLock,
  ClipboardCheck,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Presentation,
  GraduationCap,
  User as UserIcon,
} from "lucide-react";

export default function DashboardPage() {
  const { data: session } = useSession();
  const user = session?.user as Record<string, unknown> | undefined;
  const [showRoleModal, setShowRoleModal] = useState(false);

  useEffect(() => {
    if (user && user.role === "general") {
      setShowRoleModal(true);
    }
  }, [user]);

  const selectRole = async (role: string) => {
    await fetch("/api/auth/role", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setShowRoleModal(false);
    window.location.reload();
  };

  return (
    <>
      {/* 역할 선택 모달 */}
      {showRoleModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2
              style={{
                fontSize: "1.3rem",
                fontWeight: 700,
                marginBottom: "8px",
              }}
            >
              역할을 선택해주세요
            </h2>
            <p className="text-secondary text-sm" style={{ marginBottom: "24px" }}>
              역할에 따라 사용할 수 있는 기능이 달라집니다.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <button
                className="btn btn-secondary w-full"
                style={{ justifyContent: "flex-start", padding: "16px" }}
                onClick={() => selectRole("professor")}
              >
                <Presentation size={24} style={{ color: "var(--accent-primary)", marginRight: "12px" }} />
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 600 }}>교수</div>
                  <div className="text-xs text-muted">
                    출석 세션 생성, 보안 메시지 송수신
                  </div>
                </div>
              </button>
              <button
                className="btn btn-secondary w-full"
                style={{ justifyContent: "flex-start", padding: "16px" }}
                onClick={() => selectRole("student")}
              >
                <GraduationCap size={24} style={{ color: "var(--accent-primary)", marginRight: "12px" }} />
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 600 }}>학생</div>
                  <div className="text-xs text-muted">
                    출석 참여, 보안 메시지 송수신
                  </div>
                </div>
              </button>
              <button
                className="btn btn-secondary w-full"
                style={{ justifyContent: "flex-start", padding: "16px" }}
                onClick={() => selectRole("general")}
              >
                <UserIcon size={24} style={{ color: "var(--accent-primary)", marginRight: "12px" }} />
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 600 }}>일반 사용자</div>
                  <div className="text-xs text-muted">보안 메시지 송수신</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 대시보드 헤더 */}
      <div className="page-header">
        <h1 className="page-title">대시보드</h1>
      </div>

      <div className="page-content">
        {/* 인증서 미발급 안내 */}
        {user && !Boolean(user.hasCertificate) && (
          <div
            className="card"
            style={{
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              gap: "16px",
              borderColor: "rgba(255, 179, 71, 0.3)",
              background: "rgba(255, 179, 71, 0.05)",
            }}
          >
            <AlertCircle
              size={24}
              style={{ color: "var(--warning)", flexShrink: 0 }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                인증서를 발급받으세요
              </div>
              <div className="text-sm text-secondary">
                보안 메시지와 출석 인증을 사용하려면 먼저 인증서를 발급받아야
                합니다.
              </div>
            </div>
            <Link href="/certificate" className="btn btn-primary">
              발급받기
              <ArrowRight size={16} />
            </Link>
          </div>
        )}

        {/* 인증서 보유 상태 */}
        {user && Boolean(user.hasCertificate) && (
          <div
            className="card"
            style={{
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              gap: "16px",
              borderColor: "rgba(0,212,170,0.3)",
              background: "rgba(0,212,170,0.05)",
            }}
          >
            <CheckCircle2
              size={24}
              style={{ color: "var(--success)", flexShrink: 0 }}
            />
            <div>
              <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                인증서가 활성 상태입니다
              </div>
              <div className="text-sm text-secondary">
                모든 보안 기능을 이용할 수 있습니다.
              </div>
            </div>
          </div>
        )}

        {/* 빠른 액세스 카드 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "16px",
          }}
        >
          <QuickCard
            href="/chat"
            icon={<MessageSquareLock size={28} />}
            title="보안 채팅"
            description="전자봉투로 암호화된 1:1 보안 메시지를 주고받으세요."
            color="#00D4AA"
          />
          <QuickCard
            href="/certificate"
            icon={<Shield size={28} />}
            title="인증서 관리"
            description="인증서 발급, 조회, 폐기를 관리하세요."
            color="#00B4D8"
          />
          <QuickCard
            href="/attendance"
            icon={<ClipboardCheck size={28} />}
            title="출석"
            description="전자서명 기반 출석 인증으로 안전하게 출석하세요."
            color="#FFB347"
          />
        </div>
      </div>
    </>
  );
}

function QuickCard({
  href,
  icon,
  title,
  description,
  color,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div className="card card-hover" style={{ cursor: "pointer" }}>
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: `${color}15`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color,
            marginBottom: "16px",
          }}
        >
          {icon}
        </div>
        <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "8px" }}>
          {title}
        </h3>
        <p className="text-sm text-secondary">{description}</p>
      </div>
    </Link>
  );
}
