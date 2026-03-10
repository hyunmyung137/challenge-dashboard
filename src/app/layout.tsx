import type { Metadata } from "next";
import { Bebas_Neue, Space_Mono } from "next/font/google";
import SessionProvider from "@/components/providers/SessionProvider";
import "./globals.css";

const bebasNeue = Bebas_Neue({
  weight: "400",
  variable: "--font-display",
  subsets: ["latin"],
});
const spaceMono = Space_Mono({
  weight: ["400", "700"],
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "꺼드럭 — 그렇게 잘 맞추면 왜 안 까?",
  description:
    "Binance, OKX, Bybit, Upbit, Bithumb 거래소 포트폴리오를 하나로. 검증된 잔고 공개 링크.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${bebasNeue.variable} ${spaceMono.variable}`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
