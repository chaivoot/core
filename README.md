# core.chaivoot.com

ทบทวนตัวเองรายสัปดาห์ (40 คะแนน) และระบบรายชื่อ ดูรายละเอียดในสเปก

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Neon Postgres + Drizzle ORM
- Auth.js (NextAuth v5) กับ LINE Login (web login)
- Deploy บน Vercel

## ตั้งค่า production

### 1. Neon
สร้างโปรเจกต์ใหม่ แล้วคัดลอก connection string (pooled)

### 2. LINE Login channel
ที่ LINE Developers Console > LINE Login channel
- เปิด **Web app**
- Callback URL: `https://core.chaivoot.com/api/auth/callback/line`
- OpenID Connect ใช้ `openid profile` (ไม่ต้องขอสิทธิ์อีเมล)

### 3. Vercel > Settings > Environment Variables (Production)

| ชื่อ | ค่า |
|---|---|
| `DATABASE_URL` | connection string จาก Neon |
| `AUTH_SECRET` | สุ่มด้วย `openssl rand -base64 32` |
| `AUTH_LINE_ID` | Channel ID |
| `AUTH_LINE_SECRET` | Channel secret |

Migration รันอัตโนมัติตอน build บน production (`scripts/migrate.ts`)
Preview deployment จะไม่แตะฐานข้อมูล

## พัฒนาในเครื่อง

```bash
cp .env.example .env.local   # ใส่ค่าให้ครบ
npm install
npm run db:migrate
npm run dev
```

คำสั่งอื่น: `npm run lint`, `npm run typecheck`, `npm test`
แก้ schema แล้วสร้าง migration ใหม่ด้วย `npm run db:generate`

## หลักการในโค้ด

- ทุก query ของข้อมูลผู้ใช้อยู่ใน `src/lib/data/*` และรับ `userId` เพื่อกรองเสมอ
  ทุกหน้าและทุก server action เรียก `requireUser()` ก่อน
- วันที่ใช้เวลาประเทศไทย สัปดาห์ อาทิตย์ - เสาร์ สัปดาห์คร่อมเดือนนับเป็นเดือนของวันเสาร์ (`src/lib/dates.ts`)
- ค่าเฉลี่ยรายเดือน: สัปดาห์ที่จบแล้วแต่ไม่ได้กรอกนับเป็น 0 ไม่นับสัปดาห์ในอนาคต
  สัปดาห์ปัจจุบันที่ยังไม่กรอก และสัปดาห์ก่อนเริ่มใช้งาน (`src/lib/summary.ts`)
- Phase 2 (สายงาน): เพิ่มตารางความสัมพันธ์ระหว่าง `users` ได้โดยไม่ต้องแก้ตารางเดิม
