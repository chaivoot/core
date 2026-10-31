# 3S1M (3s1m.com)

เครื่องมือสำหรับนักธุรกิจ ดูรายละเอียดในสเปก

| URL | เครื่องมือ |
|---|---|
| `/smallwin` | ทบทวนตัวเองรายสัปดาห์ (40 คะแนน) สายงาน สรุปเดือน |
| `/namelist` | ระบบรายชื่อ |
| `/plan` | อธิบายแผนธุรกิจ (หลังบ้านสินค้า `/plan/products`) |
| `/` | ตอนนี้ส่งต่อไป `/smallwin` (อนาคตอาจเป็นหน้าขาย) |

## สิ่งที่จะทำต่อ

- [ ] เกม **กระแสเงินสด** ที่ `/cashflow` (ยังไม่ได้เริ่ม กำลังรวบรวมบรีฟ)
  - ทั้งเกมเป็นภาษาไทย ชื่อที่แสดงบนจอคือ "กระแสเงินสด"
  - เล่นตามกติกาเดิม ไม่ใส่เรื่องธุรกิจแอมเวย์
  - ร่างกติกาและการ์ด: [`docs/cashflow-game.md`](docs/cashflow-game.md) (รอตรวจ)
  - เล่นออนไลน์หลายคน มีเครื่อง host (จอกลาง) และผู้เล่นเล่นผ่านมือถือของตัวเอง
  - กติกาตามแนว Cashflow 101 (วงหนูวิ่ง → วงนอก) แต่ไม่ใช้ชื่อ "101" และไม่ใช้ชื่อ/ข้อความการ์ดเดิม เพราะติดลิขสิทธิ์
  - การ์ดเขียนใหม่เองทั้งหมด เช่น หุ้นในเกมเดิม (MYT4U ฯลฯ) เปลี่ยนเป็นหุ้นบริษัทอิเล็กทรอนิกส์ที่ตั้งชื่อเอง
  - เล่นได้ 2–6 คนต่อห้อง ผู้เล่นสแกน QR จากจอ host แล้วเข้าเล่นได้เลย (ไม่ต้องมีบัญชี 3S1M)

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
- Callback URL: `https://3s1m.com/api/auth/callback/line`
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
