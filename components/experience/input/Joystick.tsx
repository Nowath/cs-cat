"use client";

import { useRef } from "react";
import { input } from "@/lib/runtime";
import { useGame } from "@/lib/store";

// รัศมีที่ลากได้ (px) เท่ากับครึ่งของฐาน size-28 ลบครึ่งปุ่ม size-12
const RADIUS = 32;

// เขียนเองเพราะต้องการแค่ค่าทิศทาง 2 แกนส่งเข้า runtime ทุกเฟรม
// lib จอยสติ๊กส่วนใหญ่ผูก DOM เอง/มี event ที่ไม่ต้องใช้ ส่วนนี้สั้นกว่าและไม่เพิ่ม bundle
// แสดงเฉพาะจอสัมผัส (กลางล่างจอ ใช้ได้ทั้งมือซ้ายและขวา) desktop ใช้คีย์บอร์ด/คลิกพื้นแทน
export function Joystick() {
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const active = useRef<number | null>(null);
  const explore = useGame((s) => s.phase === "explore");

  function update(e: React.PointerEvent) {
    const rect = base.current!.getBoundingClientRect();
    let dx = e.clientX - (rect.left + rect.width / 2);
    let dy = e.clientY - (rect.top + rect.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS;
      dy = (dy / len) * RADIUS;
    }
    knob.current!.style.transition = "none";
    knob.current!.style.transform = `translate(${dx}px, ${dy}px)`;
    input.joy.x = dx / RADIUS;
    input.joy.y = dy / RADIUS;
  }

  function release() {
    active.current = null;
    knob.current!.style.transition = "";
    knob.current!.style.transform = "";
    input.joy.x = 0;
    input.joy.y = 0;
  }

  if (!explore) return null;

  return (
    <div
      ref={base}
      aria-hidden
      className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 hidden -translate-x-1/2 size-28 touch-none items-center justify-center rounded-full border border-(--hud-border) bg-(--hud-glass) backdrop-blur-md select-none pointer-coarse:flex"
      onPointerDown={(e) => {
        active.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e);
      }}
      onPointerMove={(e) => {
        if (active.current === e.pointerId) update(e);
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div
        ref={knob}
        className="size-12 rounded-full bg-(--hud-solid) shadow-(--hud-shadow) transition-transform duration-(--dur-fast) ease-(--ease-out)"
      />
    </div>
  );
}
