"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  MessageSquareLock,
  Search,
  Plus,
  Shield,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

interface Partner {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  hasCertificate: boolean;
}

interface Conversation {
  id: string;
  participant1: Partner;
  participant2: Partner;
  lastMessageAt: string | null;
  hasMessages: boolean;
}

interface UserSearchResult {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  hasCertificate: boolean;
}

export default function ChatListPage() {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const fetchUsers = useCallback(async (q: string) => {
    setSearching(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.users);
      }
    } catch { /* ignore */ }
    setSearching(false);
  }, []);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    fetchUsers(q);
  };

  useEffect(() => {
    if (!showSearch) return;
    fetchUsers("");
  }, [showSearch, fetchUsers]);

  const startConversation = async (partnerId: string) => {
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId }),
      });
      if (res.ok) {
        const data = await res.json();
        window.location.href = `/chat/${data.conversationId}`;
      }
    } catch { /* ignore */ }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">보안 채팅</h1>
        <button
          className="btn btn-primary"
          onClick={() => {
            const next = !showSearch;
            setShowSearch(next);
            if (!next) {
              setSearchQuery("");
              setSearchResults([]);
            }
          }}
        >
          <Plus size={16} />
          새 대화
        </button>
      </div>

      <div className="page-content">
        {/* 사용자 검색 */}
        {showSearch && (
          <div className="card" style={{ marginBottom: "24px" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "12px" }}>
              대화 상대 선택
            </h3>
            <div style={{ position: "relative" }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
              <input
                className="input-field"
                style={{ paddingLeft: "36px" }}
                placeholder="이름 또는 이메일로 필터링..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                autoFocus
              />
            </div>
            {searching && (
              <div className="text-sm text-muted" style={{ marginTop: "8px" }}>
                검색 중...
              </div>
            )}
            {searchResults.length > 0 && (
              <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="card card-hover"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px",
                      cursor: "pointer",
                    }}
                    onClick={() => startConversation(user.id)}
                  >
                    {user.image ? (
                      <img
                        src={user.image}
                        alt=""
                        style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: "var(--accent-gradient)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          color: "#0A0E1A",
                        }}
                      >
                        {user.name?.charAt(0) || "?"}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                        {user.name || "(이름 없음)"}
                      </div>
                      <div className="text-xs text-muted">
                        {user.email || "(이메일 없음)"}
                      </div>
                    </div>
                    {user.hasCertificate ? (
                      <span className="badge badge-success">
                        <Shield size={10} />
                        인증서 보유
                      </span>
                    ) : (
                      <span className="badge badge-warning">인증서 없음</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!searching && searchResults.length === 0 && (
              <div className="text-sm text-muted" style={{ marginTop: "12px" }}>
                표시할 회원이 없습니다.
              </div>
            )}
          </div>
        )}

        {/* 대화 목록 */}
        {loading ? (
          <div className="empty-state">로딩 중...</div>
        ) : conversations.length === 0 ? (
          <div className="empty-state">
            <MessageSquareLock size={64} className="empty-state-icon" />
            <div className="empty-state-text">아직 대화가 없습니다</div>
            <p className="text-sm text-muted">
              &quot;새 대화&quot; 버튼으로 대화를 시작하세요.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {conversations.map((conv) => (
              <Link key={conv.id} href={`/chat/${conv.id}`} style={{ textDecoration: "none" }}>
                <div
                  className="card card-hover"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "16px",
                    cursor: "pointer",
                  }}
                >
                  {conv.participant1.image ? (
                    <img
                      src={conv.participant1.image}
                      alt=""
                      style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        background: "var(--accent-gradient)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        color: "#0A0E1A",
                      }}
                    >
                      {conv.participant1.name?.charAt(0) || "?"}
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>
                      {(conv.participant1.name || conv.participant1.email || "(이름 없음)")}
                      {" - "}
                      {(conv.participant2.name || conv.participant2.email || "(이름 없음)")}
                    </div>
                    <div className="text-xs text-muted">
                      {conv.participant1.hasCertificate && conv.participant2.hasCertificate ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <CheckCircle2 size={10} style={{ color: "var(--success)" }} />
                          양측 인증서 보유
                        </span>
                      ) : (
                        "한쪽 이상 인증서 미보유"
                      )}
                    </div>
                  </div>
                  {conv.lastMessageAt && (
                    <div className="text-xs text-muted">
                      {new Date(conv.lastMessageAt).toLocaleDateString("ko-KR")}
                    </div>
                  )}
                  <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
