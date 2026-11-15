import { auth } from "../../auth.js";
import { redirect } from "next/navigation";
import { prisma } from "../../src/lib/prisma.js";

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "OWNER") redirect("/");
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" }
  });
  return (
    <main className="wm-content">
      <a href="/" className="wm-muted">← Quay lại tổng quan</a>
      <div className="wm-heading" style={{ marginTop: 24 }}>
        <div><p className="wm-eyebrow">ACCESS CONTROL</p><h1>Quản lý tài khoản</h1><p className="wm-muted">Danh sách tài khoản đã được cho phép truy cập.</p></div>
      </div>
      <section className="wm-panel">
        {users.map(user => <div key={user.id} style={{ display:"flex",justifyContent:"space-between",gap:12,padding:"14px 4px",borderBottom:"1px solid #202a37",fontSize:12 }}>
          <span>{user.name || user.email}<small style={{ display:"block",color:"#8290a3",marginTop:4 }}>{user.email}</small></span>
          <strong>{user.role}</strong>
        </div>)}
      </section>
    </main>
  );
}
