import type { CatAction } from "./runtime";

/*
 * ═══ เปลี่ยนโมเดลแมวที่ไฟล์นี้ไฟล์เดียว ═══
 *
 * 1. วางไฟล์ .glb ไว้ใน public/models/ เช่น public/models/cat.glb
 *    (ถ้าได้มาเป็น .fbx ให้เปิดใน Blender แล้ว File → Export → glTF 2.0 เลือก .glb)
 * 2. เปลี่ยน CAT_MODEL ด้านล่างเป็นแบบ "gltf" แล้วใส่ชื่อ clip ที่อยู่ในไฟล์
 *    ไม่รู้ชื่อ clip? เปิดหน้าเว็บแล้วดู console — จะพิมพ์รายชื่อ clip ที่มีในไฟล์ให้
 * 3. ปรับ scale / rotationY จนแมวยาวราว 0.75 ม. และหันหน้าไปทางเดียวกับที่เดิน
 *
 * ท่าที่ไม่มีในไฟล์จะใช้ idle แทนอัตโนมัติ — ส่วนใหญ่โมเดลฟรีมีแค่ idle กับ walk ก็ใช้ได้แล้ว
 * อยากกลับไปใช้แมว placeholder ก็แค่ตั้งเป็น { kind: "placeholder" }
 *
 * โมเดลที่มีกระดูกแต่ท่าไม่ครบ (แบบตัวที่ใช้อยู่) ใช้ kind "rigged": บอกชื่อกระดูกแต่ละส่วน
 * แล้วเว็บจะขยับกระดูกเองด้วยท่าชุดเดียวกับ placeholder (เดิน นั่ง เลีย มองกล้อง หันมองป้าย)
 */

export type CatModelConfig =
  | { kind: "placeholder" }
  | RiggedCatConfig
  | {
      kind: "gltf";
      /** path ใต้ public/ เช่น "/models/cat.glb" */
      url: string;
      /** ชื่อ animation clip ในไฟล์ ต่อท่าของเรา (ขาด idle ไม่ได้) */
      clips: { idle: string } & Partial<Record<Exclude<CatAction, "idle">, string>>;
      /** ขยาย/ย่อโมเดล ปรับจนตัวยาวราว 0.75 ม. เทียบกับป้ายสถานีสูง ~1.3 ม. */
      scale: number;
      /** หมุนให้หน้าแมวชี้ไปทาง +z (ทิศเดินของเกม) เป็นเรเดียน เช่น Math.PI ถ้าโมเดลหันกลับหลัง */
      rotationY?: number;
      /** ยกขึ้น/ลง ถ้าเท้าลอยหรือจม */
      offsetY?: number;
      /**
       * ความเร็ว (เมตร/วินาที หลัง scale แล้ว) ที่ clip walk ถูกทำมา ใช้ปรับความเร็ว animation
       * ให้ตรงกับความเร็วเดินจริง เท้าจะไม่ไถล — เพิ่มถ้าขาก้าวช้ากว่าที่ตัวเลื่อน ลดถ้าก้าวเร็วเกิน
       */
      walkClipSpeed?: number;
      /** ทาสีทั้งตัวใหม่ เช่น "#26232d" ถ้าโมเดลไม่ใช่แมวดำ */
      tint?: string;
    };

/**
 * โมเดลที่มีกระดูกแต่ไม่มี clip ครบ — ใช้ท่าทาง procedural ชุดเดียวกับแมว placeholder ขยับกระดูกแทน
 * แค่บอกว่ากระดูกชื่ออะไรทำหน้าที่อะไร (ดูชื่อได้จาก console ตอนโหลด)
 */
export interface RiggedCatConfig {
  kind: "rigged";
  url: string;
  /** ขยาย/ย่อให้ขาสูงราว 0.3 ม. ก่อนคูณ CAT_SCALE */
  scale: number;
  /** หมุนให้หน้าแมวชี้ +z */
  rotationY: number;
  offsetY?: number;
  bones: {
    chest: string;
    neck: string;
    head: string;
    tail: string[];
    /** [สะโพก/ไหล่, เข่า/ข้อศอก, อุ้งเท้า] เรียง หน้าซ้าย · หน้าขวา · หลังซ้าย · หลังขวา (ซ้ายของแมว = +x) */
    legs: [front: boolean, hip: string, knee: string, paw: string][];
  };
  /** ตาที่เติมเอง (ตำแหน่งในพิกัดของไฟล์ ก่อน scale) ถ้าโมเดลไม่มีตาหรือตาสีไม่เข้ากับแมวดำ */
  eyes?: { position: [number, number, number]; radius: number; yaw: number };
  /** จุดหมุนลำตัวตอนนั่ง/เด้ง (พิกัดของไฟล์) ปกติคือสะโพก */
  pivot: [number, number, number];
  /** ก้มคอเพิ่ม (rad) ถ้าโมเดลยืนคอตั้งสูงเกินไป */
  neckPitch?: number;
  /**
   * ท่าหางเทียบกับท่าพักในไฟล์ (rad, บวก = ยกขึ้น) เป็น [ข้อโคน, ข้ออื่น ๆ]
   * curl = ม้วนปลายขึ้นเพิ่มตอนยืนนิ่ง (ไล่มากขึ้นไปทางปลาย)
   */
  tail: { idle: [number, number]; walk: [number, number]; sit: [number, number]; curl: number };
  /** ท่าเลียอุ้งเท้า (rad): ยกขาหน้า hip/knee, พับอุ้งเท้า paw, ก้ม neck/head, เบนขาเข้ากลางตัว inward */
  lick?: { hip: number; knee: number; paw: number; neck: number; head: number; inward: number };
  /** เครดิตผู้สร้าง (ไฟล์ CC-BY ต้องแสดง) */
  credit?: { title: string; author: string; url: string; license: string; licenseUrl: string };
}

export const CAT_MODEL: CatModelConfig = {
  kind: "rigged",
  // ต้นฉบับสีเทา ทาสี texture เป็นแมวดำแล้ว (ดู public/models/CREDITS.txt)
  url: "/models/cat.glb",
  scale: 0.22,
  rotationY: -Math.PI / 2,
  pivot: [-0.8, 1.3, 0],
  neckPitch: 0,
  bones: {
    chest: "chest",
    neck: "Neck",
    head: "Head",
    tail: ["tail1", "tail2", "tail3", "tail4"],
    // โมเดลหันหน้า +x ด้านขวาของแมวอยู่ +z ของไฟล์ (กระดูกชื่อ L อยู่ฝั่งขวาของแมว)
    legs: [
      [true, "R_Leg_Upper", "R_Leg_Lower", "R_Foot"],
      [true, "L_Leg_Upper", "L_Leg_Lower", "L_Foot"],
      [false, "R_BLeg_Upper", "R_BLeg_Lower", "R_BFoot"],
      [false, "L_BLeg_Upper", "L_BLeg_Lower", "L_BFoot"],
    ],
  },
  eyes: { position: [1.48, 3.38, 0.26], radius: 0.11, yaw: 0.35 },
  // ท่าพักในไฟล์หางตั้งโค้งขึ้นอยู่แล้ว (ท่าเดิน) · ยืนนิ่งลดโคนหางลง · นั่งหางวางราบไปกับพื้น
  lick: { hip: 2.6, knee: 1.1, paw: -0.4, neck: 0.95, head: 0.6, inward: 0.3 },
  tail: { idle: [-0.8, -0.28], walk: [0, 0], sit: [-0.3, -0.35], curl: 0.4 },
  credit: {
    title: "Cat",
    author: "J-Toastie",
    url: "https://poly.pizza/m/DJ9rpAhrh3",
    license: "CC-BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
  },
};

// ตัวอย่างเมื่อได้ไฟล์จริง:
// export const CAT_MODEL: CatModelConfig = {
//   kind: "gltf",
//   url: "/models/cat.glb",
//   clips: { idle: "Idle", walk: "Walk" },
//   scale: 0.5,
//   rotationY: 0,
//   walkClipSpeed: 1.2,
//   tint: "#26232d",
// };
