import { auth } from "../../auth.js";
import { redirect } from "next/navigation";
import { prisma } from "../../src/lib/prisma.js";

export default async function CasesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const cases = await prisma.moderationCase.findMany({
    take: 30,
    orderBy: { createdAt: "desc" },
    select: { id: true, guildId: true, authorTag: true, mediaType: true, attachmentCount: true, category: true, severity: true, status: true, restricted: true, createdAt: true }
  });

  return (
    <main className="wm-content">
      <a href="/" className="wm-muted">← Quay lại tổng quan</a>
      <div className="wm-heading" style={{ marginTop: 24 }}>
        <div><p className="wm-eyebrow">REVIEW QUEUE</p><h1>Hàng đợi kiểm duyệt</h1><p className="wm-muted">Chỉ hiển thị metadata an toàn; không nhúng ảnh hoặc tệp đính kèm.</p></div>
      </div>
      <section className="wm-panel">
        {cases.length === 0 ? <div className="wm-empty"><strong>Chưa có trường hợp nào</strong><p>Koro chưa gửi dữ liệu đến hệ thống.</p></div> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr>{["Case","Thành viên","Loại","Phân loại","Mức độ","Trạng thái","Thời gian"].map(label => <th key={label} style={{ textAlign:"left",padding:"12px 8px",color:"#8795a8",borderBottom:"1px solid #293443" }}>{label}</th>)}</tr></thead>
              <tbody>{cases.map(item => <tr key={item.id}>
                <td style={{ padding:"13px 8px",borderBottom:"1px solid #202a37" }}>{item.id.slice(-8)}</td>
                <td style={{ padding:"13px 8px",borderBottom:"1px solid #202a37" }}>{item.authorTag || item.id}</td>
                <td style={{ padding:"13px 8px",borderBottom:"1px solid #202a37" }}>{item.mediaType} · {item.attachmentCount}</td>
                <td style={{ padding:"13px 8px",borderBottom:"1px solid #202a37" }}>{item.restricted ? "Restricted" : item.category}</td>
                <td style={{ padding:"13px 8px",borderBottom:"1px solid #202a37" }}>{item.restricted || item.category === "UNKNOWN" ? "—" : item.severity}</td>
                <td style={{ padding:"13px 8px",borderBottom:"1px solid #202a37" }}>{item.status}</td>
                <td style={{ padding:"13px 8px",borderBottom:"1px solid #202a37",whiteSpace:"nowrap" }}>{item.createdAt.toLocaleString("vi-VN")}</td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
