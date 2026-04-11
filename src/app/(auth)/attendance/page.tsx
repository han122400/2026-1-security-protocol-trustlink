"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ClipboardCheck,
  Plus,
  Clock,
  CheckCircle2,
  Users,
  Calendar,
} from "lucide-react";

interface ClassInfo {
  id: string;
  className: string;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  professor?: { name: string | null };
  attendances?: Array<{ id: string; attendedAt: string; verified: boolean }>;
  _count?: { attendances: number };
}

export default function AttendanceListPage() {
  const { data: session } = useSession();
  const user = session?.user as Record<string, unknown> | undefined;
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch("/api/attendance/classes");
      if (res.ok) {
        const data = await res.json();
        setClasses(data.classes);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const getStatus = (c: ClassInfo) => {
    const now = new Date();
    const start = new Date(c.startsAt);
    const end = new Date(c.endsAt);
    if (now < start) return "upcoming";
    if (now > end) return "ended";
    return "active";
  };

  const hasAttended = (c: ClassInfo) => {
    return c.attendances && c.attendances.length > 0;
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">출석</h1>
        {user?.role === "professor" && (
          <Link href="/attendance/create" className="btn btn-primary">
            <Plus size={16} />
            출석 생성
          </Link>
        )}
      </div>

      <div className="page-content">
        {loading ? (
          <div className="empty-state">로딩 중...</div>
        ) : classes.length === 0 ? (
          <div className="empty-state">
            <ClipboardCheck size={64} className="empty-state-icon" />
            <div className="empty-state-text">출석 세션이 없습니다</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {classes.map((c) => {
              const status = getStatus(c);
              const attended = hasAttended(c);
              return (
                <Link key={c.id} href={`/attendance/${c.id}`} style={{ textDecoration: "none" }}>
                  <div className="card card-hover" style={{ padding: "20px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "12px",
                      }}
                    >
                      <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>
                        {c.className}
                      </h3>
                      <span
                        className={`badge ${
                          status === "active"
                            ? "badge-success"
                            : status === "upcoming"
                            ? "badge-info"
                            : "badge-error"
                        }`}
                      >
                        {status === "active"
                          ? "진행 중"
                          : status === "upcoming"
                          ? "예정"
                          : "종료"}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "24px",
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {c.professor && (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <Users size={14} />
                          {c.professor.name}
                        </span>
                      )}
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Calendar size={14} />
                        {new Date(c.startsAt).toLocaleString("ko-KR", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={14} />
                        ~{" "}
                        {new Date(c.endsAt).toLocaleTimeString("ko-KR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {c._count && (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <CheckCircle2 size={14} />
                          {c._count.attendances}명 출석
                        </span>
                      )}
                    </div>
                    {user?.role !== "professor" && attended && (
                      <div
                        className="attendance-success"
                        style={{ marginTop: "12px" }}
                      >
                        <CheckCircle2 size={16} />
                        출석 완료
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
