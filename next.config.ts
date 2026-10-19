import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
