import { cat, view } from "@/lib/runtime";
import { useGame } from "@/lib/store";
import { heightAt } from "@/lib/terrain";

// สลับภาษาแล้วหน้าโหลดใหม่ทั้งฉาก — จำตำแหน่งแมวไว้ชั่วคราว หน้าใหม่จะข้าม intro แล้ววางแมวที่เดิม
// ใช้ sessionStorage (ต่อแท็บ) และหมดอายุเร็ว ไม่งั้นรีเฟรชทีหลังจะข้าม intro ผิดจังหวะ
const KEY = "cs-chula-resume";
const MAX_AGE_MS = 15_000;

interface Resume {
  x: number;
  z: number;
  heading: number;
  lastVisited: number;
  at: number;
}

export function saveResume() {
  const data: Resume = {
    x: cat.position.x,
    z: cat.position.z,
    heading: cat.heading,
    lastVisited: useGame.getState().lastVisited,
    at: Date.now(),
  };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // โหมดส่วนตัว/ปิด storage: แค่เริ่มใหม่จาก intro ตามปกติ
  }
}

/** อ่านแล้วลบทิ้งทันที ถ้ามีและยังไม่หมดอายุ วางแมว/กล้องกลับที่เดิม แล้วคืน true */
export function applyResume() {
  let data: Resume | null = null;
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    data = raw ? (JSON.parse(raw) as Resume) : null;
  } catch {
    return false;
  }
  if (!data || Date.now() - data.at > MAX_AGE_MS) return false;

  cat.position.set(data.x, heightAt(data.x, data.z), data.z);
  cat.heading = data.heading;
  view.focus.copy(cat.position);
  // กล้องเริ่มที่มุมเกมเลย ไม่ต้องเลื่อนจากหน้าแมว
  view.introTarget = 1;
  view.intro = 1;
  useGame.getState().markVisited(data.lastVisited);
  return true;
}
