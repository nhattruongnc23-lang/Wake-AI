"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <main className="wm-auth">
      <section className="wm-auth-card">
        <div className="wm-mark">W</div>
        <p className="wm-eyebrow">PRIVATE MODERATION WORKSPACE</p>
        <h1>Wake Moderation</h1>
        <p className="wm-muted">Đăng nhập bằng tài khoản Google đã được cấp quyền.</p>
        <button className="wm-google" onClick={() => signIn("google", { redirectTo: "/" })}>
          <span aria-hidden="true">G</span>
          Tiếp tục với Google
        </button>
        <p className="wm-footnote">Chỉ email nằm trong danh sách được phép mới có thể truy cập.</p>
      </section>
    </main>
  );
}
