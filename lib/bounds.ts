import type { Vector3 } from "three";

// "กำแพงใส": สี่เหลี่ยมจัตุรัสที่คลุมทางและทุกสถานี แล้วเว้นขอบเพิ่มอีก WALL_PADDING เมตรรอบด้าน
// ขนาดคำนวณจากตำแหน่งสถานีเอง เพิ่ม/ย้ายสถานีใน lib/stations.ts แล้วกำแพงขยายตามให้อัตโนมัติ
export const WALL_PADDING = 5;

export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** ดึงตำแหน่งที่หลุดขอบกลับมาอยู่บนขอบ (แก้ค่าใน v ตรง ๆ) คืน true ถ้าชนกำแพง */
  clamp: (v: Vector3) => boolean;
}

export function createBounds(points: Vector3[]): Bounds {
  const xs = points.map((p) => p.x);
  const zs = points.map((p) => p.z);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  // ใช้ด้านที่ยาวกว่าเป็นความกว้างของจัตุรัส แล้วจัดกึ่งกลางให้ตรงกับกลุ่มสถานี
  const half = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) / 2 + WALL_PADDING;
  const minX = cx - half;
  const maxX = cx + half;
  const minZ = cz - half;
  const maxZ = cz + half;

  return {
    minX,
    maxX,
    minZ,
    maxZ,
    // หนีบแยกแต่ละแกน แรงที่ขนานกับกำแพงยังอยู่ แมวจึงไถลไปตามกำแพงได้
    clamp(v) {
      const x = Math.min(maxX, Math.max(minX, v.x));
      const z = Math.min(maxZ, Math.max(minZ, v.z));
      const hit = x !== v.x || z !== v.z;
      v.x = x;
      v.z = z;
      return hit;
    },
  };
}
