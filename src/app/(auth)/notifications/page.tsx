"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  MessageSquareLock,
  ClipboardCheck,
  Shield,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unread.length === 0) return;
    try {
      await fetch("/api/notifications/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: unread }),
      });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
    } catch { /* ignore */ }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "message":
        return <MessageSquareLock size={18} style={{ color: "var(--accent-primary)" }} />;
      case "attendance":
        return <ClipboardCheck size={18} style={{ color: "var(--warning)" }} />;
      case "certificate":
        return <Shield size={18} style={{ color: "var(--info)" }} />;
      default:
        return <Bell size={18} style={{ color: "var(--text-muted)" }} />;
    }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">알림</h1>
        <button className="btn btn-secondary" onClick={markAllRead}>
          <CheckCircle2 size={14} />
          모두 읽음
        </button>
      </div>

      <div className="page-content">
        {loading ? (
          <div className="empty-state">로딩 중...</div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <Bell size={64} className="empty-state-icon" />
            <div className="empty-state-text">알림이 없습니다</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "600px" }}>
            {notifications.map((noti) => {
              const content = (
                <div
                  className="card"
                  style={{
                    display: "flex",
                    gap: "12px",
                    padding: "16px",
                    opacity: noti.isRead ? 0.6 : 1,
                    borderColor: noti.isRead
                      ? "var(--border-color)"
                      : "var(--border-accent)",
                  }}
                >
                  <div style={{ flexShrink: 0, marginTop: "2px" }}>
                    {getIcon(noti.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "4px" }}>
                      {noti.title}
                      {!noti.isRead && (
                        <span
                          style={{
                            display: "inline-block",
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: "var(--accent-primary)",
                            marginLeft: "8px",
                            verticalAlign: "middle",
                          }}
                        />
                      )}
                    </div>
                    <div className="text-sm text-secondary">{noti.content}</div>
                    <div className="text-xs text-muted" style={{ marginTop: "4px" }}>
                      {new Date(noti.createdAt).toLocaleString("ko-KR")}
                    </div>
                  </div>
                </div>
              );

              return noti.link ? (
                <Link key={noti.id} href={noti.link} style={{ textDecoration: "none" }}>
                  {content}
                </Link>
              ) : (
                <div key={noti.id}>{content}</div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
