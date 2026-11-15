import { auth, signOut } from "../auth.js";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  const role = session.user.role || "VIEWER";
  return (
    <main className="wm-shell">
      <aside className="wm-sidebar">
        <a className="wm-brand" href="/"><span className="wm-brand-mark">W</span><span>Wake <b>Moderation</b></span></a>
        <div className="wm-nav-label">WORKSPACE</div>
        <a className="wm-nav active" href="/">◈ <span>Tổng quan</span></a>
        <a className="wm-nav" href="/cases">▤ <span>Hàng đợi kiểm duyệt</span></a>
        <div className="wm-nav-label">MANAGEMENT</div>
        <a className="wm-nav" href="/guilds">⌘ <span>Máy chủ Discord</span></a>
        {role === "OWNER" && <a className="wm-nav" href="/users">♙ <span>Quản lý tài khoản</span></a>}
        <div className="wm-sidebar-bottom">
          <div className="wm-avatar">{(session.user.name || session.user.email || "W").slice(0,1).toUpperCase()}</div>
          <div className="wm-user"><strong>{session.user.name || "Wake reviewer"}</strong><small>{role}</small></div>
          <form action={logout}><button className="wm-logout" type="submit" aria-label="Đăng xuất">↗</button></form>
        </div>
      </aside>
      <section className="wm-main">
        <header className="wm-topbar">
          <div><span className="wm-muted">Workspace / </span><strong>Tổng quan</strong></div>
          <div className="wm-connected"><i /> Sylen integration · Chưa kết nối</div>
        </header>
        <div className="wm-content">
          <div className="wm-heading">
            <div><p className="wm-eyebrow">MODERATION CENTER</p><h1>Tổng quan</h1><p className="wm-muted">Theo dõi và xử lý các trường hợp được Sylen chuyển đến.</p></div>
            <span className="wm-role">{role}</span>
          </div>
          <div className="wm-stats">
            <article><span>Đang chờ</span><strong>—</strong><small>Chưa kết nối dữ liệu</small></article>
            <article><span>Đã xác nhận</span><strong>—</strong><small>Chưa có dữ liệu</small></article>
            <article><span>Đã bỏ qua</span><strong>—</strong><small>Chưa có dữ liệu</small></article>
            <article><span>Máy chủ</span><strong>0</strong><small>Chưa cấu hình</small></article>
          </div>
          <section className="wm-panel">
            <div className="wm-panel-title"><div><h2>Hàng đợi kiểm duyệt</h2><p className="wm-muted">Các trường hợp mới sẽ xuất hiện tại đây.</p></div><a href="/cases">Xem hàng đợi →</a></div>
            <div className="wm-empty"><div className="wm-empty-icon">✓</div><strong>Không có dữ liệu để hiển thị</strong><p>Khi Sylen được kết nối, các trường hợp cần xem xét sẽ xuất hiện tại đây.</p></div>
          </section>
          <p className="wm-security-note">Bản dựng khung giao diện · Nội dung nhạy cảm không được lưu trữ hoặc hiển thị tại trang tổng quan.</p>
        </div>
      </section>
    </main>
  );
}
