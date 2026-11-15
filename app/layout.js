import "./globals.css";
import "./moderation.css";

export const metadata = {
  title: "Wake Moderation",
  description: "Private moderation workspace for Koro."
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
