"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Shield,
  MessageSquareLock,
  ClipboardCheck,
  Bell,
  User,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { SessionProvider } from "next-auth/react";

function AuthLayoutInner({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  /* 알림 수 조회 */
  useEffect(() => {
    if (status !== "authenticated") return;
    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/notifications?unreadOnly=true");
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount);
        }
      } catch { /* ignore */ }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [status]);

  if (status === "loading") {
    return (
      <div className="login-page">
        <div className="animated-bg" />
        <div style={{ color: "var(--text-secondary)" }}>로딩 중...</div>
      </div>
    );
  }

  if (!session) return null;

  const user = session.user as Record<string, unknown>;

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "대시보드" },
    { href: "/certificate", icon: Shield, label: "인증서 관리" },
    { href: "/chat", icon: MessageSquareLock, label: "보안 채팅" },
    { href: "/attendance", icon: ClipboardCheck, label: "출석" },
    { href: "/notifications", icon: Bell, label: "알림", badge: unreadCount },
    { href: "/mypage", icon: User, label: "마이페이지" },
  ];

  return (
    <div>
      {/* 사이드바 */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Shield size={24} style={{ color: "var(--accent-primary)" }} />
          <h1>TrustLink</h1>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${isActive ? "active" : ""}`}
                id={`nav-${item.href.slice(1)}`}
              >
                <Icon size={20} className="link-icon" />
                <span>{item.label}</span>
                {item.badge ? (
                  <span
                    className="notification-count"
                    style={{ position: "static", marginLeft: "auto" }}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-user">
          {user.image ? (
            <img
              src={user.image as string}
              alt="프로필"
              className="sidebar-user-avatar"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="sidebar-user-avatar"
              style={{
                background: "var(--accent-gradient)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.85rem",
                fontWeight: 700,
                color: "#0A0E1A",
              }}
            >
              {(user.name as string)?.charAt(0) || "U"}
            </div>
          )}
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.name as string}</div>
            <div className="sidebar-user-role" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {user.role === "professor"
                ? "교수"
                : user.role === "student"
                ? "학생"
                : "일반"}
              {user.hasCertificate ? (
                <>
                  <span> · </span>
                  <Shield size={12} style={{ color: "var(--success)" }} />
                  <span>인증서 보유</span>
                </>
              ) : ""}
            </div>
          </div>
          <button
            className="btn btn-icon"
            onClick={() => signOut({ callbackUrl: "/" })}
            title="로그아웃"
            style={{ color: "var(--text-muted)" }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="main-content">{children}</main>
    </div>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <AuthLayoutInner>{children}</AuthLayoutInner>
    </SessionProvider>
  );
}
