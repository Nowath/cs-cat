"use client";

import { useEffect } from "react";
import { input } from "@/lib/runtime";
import { useGame } from "@/lib/store";

const MOVE_KEYS = new Set([
  "KeyW", "KeyA", "KeyS", "KeyD",
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
]);

export function useKeyboard() {
  useEffect(() => {
    function down(e: KeyboardEvent) {
      // dialog เปิดอยู่ ปล่อยลูกศรให้เลื่อนเนื้อหาใน dialog ตามปกติ
      if (!MOVE_KEYS.has(e.code) || isTyping(e.target) || useGame.getState().openStationId) return;
      // กันลูกศรไปเลื่อนหน้า
      e.preventDefault();
      input.keys.add(e.code);
    }
    function up(e: KeyboardEvent) {
      input.keys.delete(e.code);
    }
    // ปล่อยปุ่มนอกหน้าต่างแล้ว keyup ไม่มา แมวจะเดินค้าง
    function clear() {
      input.keys.clear();
    }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
      clear();
    };
  }, []);
}

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}
