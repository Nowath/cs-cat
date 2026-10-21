// URL จริงของเว็บ ใช้ทำลิงก์เต็มใน OG image, sitemap, canonical
// ตั้ง NEXT_PUBLIC_SITE_URL ตอน deploy · บน Vercel ถ้าไม่ตั้งจะใช้โดเมน production ของโปรเจกต์
export const SITE_URL = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000"),
);

export const ORG_URL = "https://www.math.sc.chula.ac.th/";
