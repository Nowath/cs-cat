import { Vector3 } from "three";

// ป้ายชื่อสถานีเป็น DOM ธรรมดาใน React tree หลัก (StationLabels) ส่วนฉาก 3D (LabelProjector)
// แค่คำนวณตำแหน่งบนจอแล้วเขียน transform ทุกเฟรมผ่าน registry นี้ — ไม่มี React root แยก
// และไม่ re-render ตอนกล้องขยับ
export const labelEls = new Map<string, HTMLElement>();

// จุดยึดป้าย: เหนือป้ายไม้ของสถานี
export const LABEL_ANCHOR = new Vector3(0, 1.75, 0);
