// ตรวจครั้งเดียวว่าเครื่องสร้าง WebGL2 ได้ไหม (three r163+ ไม่รองรับ WebGL1 แล้ว)
// failIfMajorPerformanceCaveat: เครื่องที่ตกไปใช้ software render (ช้ามากจนเล่นไม่ได้) นับว่าไม่รองรับ
let cached: boolean | null = null;

export function supportsWebGL(): boolean {
  if (cached !== null) return cached;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true });
    cached = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    cached = false;
  }
  return cached;
}
