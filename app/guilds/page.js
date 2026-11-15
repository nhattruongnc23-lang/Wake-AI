import { auth } from "../../auth.js";
import { redirect } from "next/navigation";

export default async function GuildsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return (
    <main className="wm-content">
      <a href="/" className="wm-muted">← Quay lại tổng quan</a>
      <div className="wm-heading" style={{ marginTop: 24 }}>
        <div><p className="wm-eyebrow">SERVER CONFIGURATION</p><h1>Máy chủ Discord</h1><p className="wm-muted">Cấu hình kênh theo dõi và vai trò nhận thông báo.</p></div>
      </div>
      <section className="wm-panel"><div className="wm-empty"><strong>Chưa có máy chủ được kết nối</strong><p>Kết nối Sylen sẽ cho phép đồng bộ danh sách máy chủ mà bot đang tham gia.</p></div></section>
    </main>
  );
}
