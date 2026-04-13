"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Calendar, Clock } from "lucide-react";

export default function AttendanceCreatePage() {
  const router = useRouter();
  const [className, setClassName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!className || !startsAt || !endsAt) {
      alert("모든 필드를 입력하세요.");
      return;
    }

    setCreating(true);
    try {
      // 'YYYY-MM-DDTHH:mm' 문자열을 로컬 타임존을 반영한 Date 객체로 변환 후 전송
      const isoStartsAt = new Date(startsAt).toISOString();
      const isoEndsAt = new Date(endsAt).toISOString();

      const res = await fetch("/api/attendance/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ className, startsAt: isoStartsAt, endsAt: isoEndsAt }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`출석 세션이 생성되었습니다.\n링크: ${window.location.origin}${data.link}`);
        router.push(`/attendance/${data.classId}`);
      } else {
        const err = await res.json();
        alert(err.error || "생성 실패");
      }
    } catch {
      alert("생성 실패");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">출석 세션 생성</h1>
      </div>

      <div className="page-content">
        <div className="card" style={{ maxWidth: "500px" }}>
          <div style={{ marginBottom: "20px" }}>
            <label className="input-label">
              <Calendar size={14} style={{ verticalAlign: "middle", marginRight: "4px" }} />
              수업명
            </label>
            <input
              className="input-field"
              placeholder="예: 정보보호개론 3주차"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label className="input-label">
              <Clock size={14} style={{ verticalAlign: "middle", marginRight: "4px" }} />
              출석 시작 시간
            </label>
            <input
              type="datetime-local"
              className="input-field"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label className="input-label">
              <Clock size={14} style={{ verticalAlign: "middle", marginRight: "4px" }} />
              출석 종료 시간
            </label>
            <input
              type="datetime-local"
              className="input-field"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </div>

          <button
            className="btn btn-primary w-full"
            onClick={handleCreate}
            disabled={creating}
          >
            <Plus size={16} />
            {creating ? "생성 중..." : "출석 세션 생성"}
          </button>

          <p className="text-xs text-muted" style={{ marginTop: "16px" }}>
            출석이 생성되면 학생들에게 알림이 발송됩니다.
            <br />
            학생은 전자서명으로 출석 인증을 완료해야 합니다.
          </p>
        </div>
      </div>
    </>
  );
}
