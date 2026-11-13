"use client";

import { useEffect, useRef, useState } from "react";

const starterPrompts = [
  "Giải thích cấu trúc một repository Node.js",
  "Giúp mình tìm nguyên nhân một lỗi code",
  "Lập kế hoạch thêm tính năng mới cho bot Discord"
];

export default function HomePage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("chat");
  const [model, setModel] = useState("Đọc từ máy chủ");
  const endRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(value = input) {
    const content = value.trim();
    if (!content || busy) return;
    const next = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setError("");
    setBusy(true);
    setMessages([...next, { role: "assistant", content: "" }]);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next }),
        signal: controller.signal
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `Yêu cầu thất bại (HTTP ${response.status}).`);
      }
      if (!response.body) throw new Error("Máy chủ không trả về luồng dữ liệu.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      while (true) {
        const { value: chunk, done } = await reader.read();
        if (done) break;
        answer += decoder.decode(chunk, { stream: true });
        setMessages([...next, { role: "assistant", content: answer }]);
      }
      answer += decoder.decode();
      setMessages([...next, { role: "assistant", content: answer || "Model trả về câu trả lời trống." }]);
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message || "Không thể kết nối AI.");
      setMessages(next);
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  function clearChat() {
    abortRef.current?.abort();
    setBusy(false);
    setMessages([]);
    setError("");
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <a className="brand" href="#"><span className="brand-mark">W</span><span>Wake<span className="muted"> AI</span></span></a>
        <button className="new-chat" onClick={clearChat}><span>＋</span> Cuộc trò chuyện mới</button>
        <div className="side-label">WORKSPACE</div>
        <button className={mode === "chat" ? "nav-item active" : "nav-item"} onClick={() => setMode("chat")}><span>◈</span> AI Chat</button>
        <button className={mode === "code" ? "nav-item active" : "nav-item"} onClick={() => setMode("code")}><span>⌘</span> Coding Workspace <span className="soon">Sắp tới</span></button>
        <div className="side-label lower">PROJECT</div>
        <div className="project-card"><span className="project-dot" /> Wake-AI <small>GitHub</small></div>
        <div className="sidebar-bottom"><div className="avatar">W</div><div><strong>W / Wake</strong><small>Personal workspace</small></div><span className="settings">⚙</span></div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> <strong>{mode === "chat" ? "AI Chat" : "Coding Workspace"}</strong></div>
          <div className="top-actions"><span className="status-dot" /> <span>Model Gateway</span><span className="model-pill">{model}</span></div>
        </header>

        {mode === "code" ? (
          <div className="coming-soon">
            <div className="coming-icon">⌘</div>
            <p className="eyebrow">CODING WORKSPACE</p>
            <h1>Một không gian dành cho việc xây dựng.</h1>
            <p>Khu vực này sẽ có trình duyệt tệp, chỉnh sửa code, GitHub, diff và môi trường kiểm thử riêng. Chưa có thao tác nào trên repository được thực hiện từ giao diện này.</p>
            <button className="primary-button" onClick={() => setMode("chat")}>Quay lại AI Chat</button>
          </div>
        ) : (
          <div className="chat-layout">
            <div className="chat-scroll">
              {messages.length === 0 ? (
                <div className="welcome">
                  <div className="welcome-orb">W</div>
                  <p className="eyebrow">YOUR PERSONAL AI WORKSPACE</p>
                  <h1>Xin chào, <span>Wake.</span></h1>
                  <p className="welcome-sub">Bắt đầu bằng một ý tưởng, câu hỏi hoặc vấn đề code bạn muốn giải quyết.</p>
                  <div className="suggestions">{starterPrompts.map(prompt => <button key={prompt} onClick={() => sendMessage(prompt)}>{prompt}<span>↗</span></button>)}</div>
                </div>
              ) : (
                <div className="messages">{messages.map((message, index) => (
                  <article className={message.role === "user" ? "message user-message" : "message assistant-message"} key={index}>
                    <div className="message-avatar">{message.role === "user" ? "W" : "✳"}</div>
                    <div className="message-body"><div className="message-role">{message.role === "user" ? "Bạn" : "Wake AI"}</div><div className="message-content">{message.content || (busy ? <span className="typing">Đang suy nghĩ<span>.</span><span>.</span><span>.</span></span> : "")}</div></div>
                  </article>
                ))}<div ref={endRef} /></div>
              )}
            </div>
            <div className="composer-wrap">
              {error && <div className="error-banner">{error}</div>}
              <form className="composer" onSubmit={event => { event.preventDefault(); sendMessage(); }}>
                <textarea value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); sendMessage(); } }} placeholder="Nhắn tin cho Wake AI..." rows={2} />
                <div className="composer-footer"><span>Enter để gửi · Shift + Enter xuống dòng</span><button className="send-button" disabled={busy || !input.trim()} aria-label="Gửi tin nhắn">{busy ? "…" : "↑"}</button></div>
              </form>
              <p className="disclaimer">Wake AI có thể mắc lỗi. Hãy kiểm tra thông tin và code trước khi sử dụng.</p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
