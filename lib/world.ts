import { Vector3 } from "three";

// เดินช้าลงนิด ให้รอบก้าวขาไม่ถี่จนดูลุกลน (เท้าไม่ไถลเพราะผูกรอบก้าวกับความเร็วจริง)
export const WALK_SPEED = 2.1;
// แมวขยายเกินสัดส่วนจริงเทียบหญ้าเล็กน้อย ให้ตัวละครหลักเด่นจากมุมกล้องเกม
export const CAT_SCALE = 1.3;

// มุมกล้องเกม: สูง 8.5 ถอยหลัง 7.6 ≈ ก้มลง 48° ไม่หมุนตามแมว
export const CAMERA_OFFSET = new Vector3(0, 8.5, 7.6);
export const CAMERA_FOV = 40;
// จอแนวตั้งเห็นด้านข้างน้อย ถอยกล้องออกให้ยังเห็นรอบตัวแมวพอ
export const PORTRAIT_ZOOM = 1.3;

// มุม intro: กล้องระดับสายตาแมว อยู่หน้าแมว (แมวหัน +z มาหากล้อง) เล็งสูงกว่าหัวนิดหน่อย
// แมวจึงอยู่ครึ่งล่างของจอ เหลือฟ้าด้านบนไว้วางชื่อสาขา
// เยื้องขวาเล็กน้อยให้ป้ายสถานีแรกที่อยู่ไกลออกไปไม่ซ้อนหลังหัวแมว
export const INTRO_OFFSET = new Vector3(0.4, 0.7, 2.7);
export const INTRO_LOOK = new Vector3(0, 0.8, 0);

// [near, far] ของหมอก: intro หนากว่า มุมเกมใสกว่า
export const FOG_INTRO: [number, number] = [5, 26];
export const FOG_EXPLORE: [number, number] = [13, 38];

// แดดเช้ามุมต่ำ (~17°) จากด้านหลังซ้ายของฉาก ทำให้ปลายหญ้าเรืองแบบย้อนแสง
// และดวงอาทิตย์ตกอยู่ในกรอบภาพตอนมุม intro (เยื้องซ้ายพ้นชื่อสาขา ไม่ทับตัวหนังสือ)
export const SUN_POSITION = new Vector3(-4.2, 3.4, -10);

// ทิศและความแรงลมที่พัดเมฆ (x, z) — ใช้ร่วมกันระหว่างเมฆบนฟ้าและเงาเมฆบนพื้น
export const CLOUD_WIND = { x: 1, y: 0.35 };

// พาเลตต์ฉากเช้า (sRGB) ใช้ร่วมกันระหว่างหญ้า พื้น หมอก
export const PALETTE = {
  fog: "#e3eee4",
  // พื้นใต้หญ้า: ผสมหลายโทนใน shader ให้อ่านเป็นพื้นรก ๆ ไม่ใช่สีทาเรียบ
  groundShadow: "#2e4a23",
  groundMoss: "#56793a",
  groundBright: "#7d9c4f",
  groundSoil: "#6e6040",
  trail: "#a8966a",
  trailDark: "#7b6a49",
  footprint: "#4a3a26",
  signWood: "#8a6a4a",
  signWoodDark: "#5e4632",
  signBoard: "#f6efe2",
  chula: "#de5c8e",
  stone: "#cfc8b8",
  // QR ต้องเข้มพอให้กล้องมือถืออ่านติดง่าย ใช้หมึกเขียวเข้มของแบรนด์แทนดำสนิท
  qrInk: "#1d2a22",
  grassBase: "#3a6a2c",
  grassMid: "#6aa045",
  grassTip: "#c4dd82",
  grassDry: "#cdbb7a",
  cat: "#26232d",
  catEye: "#cde86b",
  catInner: "#c98393",
  sun: "#ffe4bd",
  sunGlow: "#fff1cf",
  sunDisc: "#fff6d8",
  cloudLight: "#ffffff",
  cloudShade: "#c8d5e2",
  skyZenith: "#a9d4ee",
  skyLight: "#d6ecff",
  hemiGround: "#6f9640",
} as const;
