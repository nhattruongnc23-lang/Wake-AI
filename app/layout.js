import "./globals.css";

export const metadata = {
  title: "Wake AI",
  description: "A personal AI workspace for conversation and coding."
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
