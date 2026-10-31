import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // รหัสของ build นี้ (ฝังทั้งฝั่งเซิร์ฟเวอร์และเบราว์เซอร์) ให้หน้าเกมที่เปิดค้างไว้รู้ว่ามีเวอร์ชันใหม่แล้วรีเฟรชเอง
  env: { APP_BUILD: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev" },
  headers() {
    // เกมกระแสเงินสดเปิดสาธารณะ แต่ไม่ให้ search engine เก็บ (รวม API)
    return Promise.resolve([
      { source: "/cashflow", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/cashflow/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ]);
  },
  redirects() {
    return [
      // หน้าแรกชั่วคราว: ไปที่ระบบประเมินตัวเอง (อนาคตอาจเป็นหน้าขาย จึงไม่ใช้ permanent)
      { source: "/", destination: "/smallwin", permanent: false },
      // URL เดิมของรายชื่อ
      { source: "/contacts", destination: "/namelist", permanent: true },
      { source: "/contacts/:id", destination: "/namelist/:id", permanent: true },
    ];
  },
};

export default nextConfig;
