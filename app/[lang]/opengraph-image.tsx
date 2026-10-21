import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getContent, hasLocale, DEFAULT_LOCALE } from "@/content";

// รูปตอนแชร์ลิงก์ (Facebook / LINE / X) — ธีมเดียวกับหน้า loading: พื้นเหลือง แผ่นกระดาษเก่า แมวดำ
// ImageResponse ไม่รู้จัก oklch จึงใช้ hex ที่แปลงจาก token ใน globals.css
const C = {
  bg: "#fde89a", // --loading-bg
  panel: "#fcecd5", // --paper-panel
  paper: "#f8c695", // --paper
  edge: "#c36953", // --paper-edge
  ink: "#38221f", // --paper-ink
  dot: "#d28a69", // --paper-dot
  chula: "#dc6294", // --brand-chula
};

export const alt = "Computer Science, Chulalongkorn University";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const { site, ui } = getContent(hasLocale(lang) ? lang : DEFAULT_LOCALE);
  const [semibold, regular] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/Anuphan-SemiBold.ttf")),
    readFile(join(process.cwd(), "assets/fonts/Anuphan-Regular.ttf")),
  ]);

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: C.bg, padding: 44, fontFamily: "Anuphan" }}>
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            gap: 48,
            padding: "36px 56px 44px",
            background: C.panel,
            border: `6px solid ${C.ink}`,
            borderRadius: 20,
            boxShadow: `inset 0 -12px 0 ${C.edge}, 0 10px 0 rgba(56,34,31,0.35)`,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 14 }}>
            <div style={{ display: "flex", fontSize: 26, color: C.edge, fontWeight: 600 }}>
              {ui.introEyebrow}
            </div>
            <div style={{ display: "flex", fontSize: 66, lineHeight: 1.3, color: C.ink, fontWeight: 600 }}>
              {site.shortName}
            </div>
            <div style={{ display: "flex", fontSize: 28, lineHeight: 1.45, color: C.ink, fontWeight: 400 }}>
              {site.description}
            </div>
            <div style={{ display: "flex", marginTop: 10 }}>
              <div
                style={{
                  display: "flex",
                  padding: "10px 26px 16px",
                  fontSize: 26,
                  fontWeight: 600,
                  color: C.ink,
                  background: C.paper,
                  border: `4px solid ${C.ink}`,
                  borderRadius: 10,
                  boxShadow: `inset 0 -8px 0 ${C.edge}`,
                }}
              >
                {ui.startExploring}
              </div>
            </div>
          </div>
          <Cat />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Anuphan", data: semibold, weight: 600, style: "normal" },
        { name: "Anuphan", data: regular, weight: 400, style: "normal" },
      ],
    },
  );
}

// แมวดำนั่งมองกล้อง (ทรงเรียบ ๆ ให้อ่านออกแม้รูปถูกย่อเป็น thumbnail)
function Cat() {
  return (
    <svg width="300" height="380" viewBox="0 0 300 380">
      <path d="M210 330 C 290 320, 290 230, 250 210" stroke="#17141a" strokeWidth="26" fill="none" strokeLinecap="round" />
      <ellipse cx="150" cy="270" rx="95" ry="100" fill="#17141a" />
      <circle cx="150" cy="135" r="78" fill="#17141a" />
      <path d="M86 100 L 92 30 L 140 72 Z" fill="#17141a" />
      <path d="M214 100 L 208 30 L 160 72 Z" fill="#17141a" />
      <path d="M98 88 L 101 50 L 126 72 Z" fill={C.chula} opacity="0.55" />
      <path d="M202 88 L 199 50 L 174 72 Z" fill={C.chula} opacity="0.55" />
      <ellipse cx="120" cy="138" rx="15" ry="18" fill="#f2d14b" />
      <ellipse cx="180" cy="138" rx="15" ry="18" fill="#f2d14b" />
      <ellipse cx="120" cy="140" rx="5" ry="13" fill="#17141a" />
      <ellipse cx="180" cy="140" rx="5" ry="13" fill="#17141a" />
      <path d="M143 166 L 157 166 L 150 175 Z" fill={C.chula} />
      <ellipse cx="110" cy="365" rx="32" ry="16" fill="#17141a" />
      <ellipse cx="190" cy="365" rx="32" ry="16" fill="#17141a" />
    </svg>
  );
}
