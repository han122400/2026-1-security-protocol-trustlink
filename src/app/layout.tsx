import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrustLink - 인증서 기반 보안 메신저",
  description: "전자봉투 기반 종단 간 암호화 보안 메시지 및 인증서 기반 전자서명 출석 인증 서비스",
  keywords: ["보안 메신저", "전자봉투", "전자서명", "인증서", "PKI", "E2EE"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
