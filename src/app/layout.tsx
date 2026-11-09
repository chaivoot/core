import type { Metadata, Viewport } from "next";
import { Anuphan, Prompt } from "next/font/google";
import "./globals.css";

// ฟอนต์ทั้งเว็บ (Cadson Demak): Anuphan = เนื้อหา · Prompt = หัวข้อและตัวเลขเด่น
const anuphan = Anuphan({ variable: "--font-anuphan", subsets: ["thai", "latin"] });
const prompt = Prompt({ variable: "--font-prompt", subsets: ["thai", "latin"], weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: "3S1M",
  description: "ทบทวนตัวเองรายสัปดาห์ และระบบรายชื่อ",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fafaf9",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${anuphan.variable} ${prompt.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
