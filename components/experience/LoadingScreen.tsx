"use client";

import { useEffect, useRef } from "react";
import { preload } from "react-dom";
import type { Content } from "@/content";
import { useGame } from "@/lib/store";

// หน้า loading: แมวดำวิ่งอยู่กับที่กลางจอ + level bar ด้านล่าง
// เป็นรูป sprite + CSS ล้วน (preload ไว้ใน HTML แรก) โชว์ได้ทันทีก่อนโค้ด 3D จะโหลดเสร็จ
// ตัวเลขไล่ตาม loadTarget (ขั้นการโหลดจริง) แบบนุ่ม เขียนลง DOM ตรง ๆ ไม่ re-render ทุกเฟรม
export function LoadingScreen({ ui, ref }: { ui: Content["ui"]; ref: React.Ref<HTMLDivElement> }) {
  // ใส่ <link rel="preload"> ลงใน HTML ตั้งแต่ SSR รูปแมวจะมาพร้อม CSS ไม่โผล่ทีหลัง
  preload("/loading/cat-run.webp", { as: "image", fetchPriority: "high" });
  const bar = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const meter = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let shown = 0;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const target = useGame.getState().loadTarget;
      // ไล่ตามเป้าแบบหน่วง และค่อย ๆ คืบเองเล็กน้อยระหว่างรอขั้นถัดไป แถบจะไม่ดูค้าง
      const creep = target < 1 ? Math.min(target + 0.08, 0.97) : 1;
      shown += (Math.max(target, Math.min(creep, shown + dt * 0.02)) - shown) * (1 - Math.exp(-6 * dt));
      if (target >= 1 && shown > 0.995) shown = 1;
      const pct = Math.round(shown * 100);
      if (bar.current) bar.current.style.transform = `scaleX(${shown})`;
      if (label.current) label.current.textContent = `${pct}%`;
      meter.current?.setAttribute("aria-valuenow", String(pct));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={ref} className="fixed inset-0 z-40 grid place-items-center bg-(--loading-bg)">
      <div className="flex w-full max-w-xs flex-col items-center gap-8 px-4">
        <RunningCat />
        <div className="w-full space-y-2.5">
          <div className="flex items-baseline justify-between text-sm leading-[1.5] text-muted-foreground">
            <span>{ui.loading}</span>
            <span ref={label} className="font-medium text-foreground tabular-nums">
              0%
            </span>
          </div>
          <div
            ref={meter}
            role="progressbar"
            aria-label={ui.loading}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={0}
            className="h-2.5 overflow-hidden rounded-full bg-foreground/10"
          >
            <div ref={bar} className="h-full origin-left rounded-full bg-primary" style={{ transform: "scaleX(0)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// แมววิ่งอยู่กับที่ (sprite จาก "Black cat running" โดย Xero Hub, Lottie Simple License — ดู public/loading/LICENSE.txt)
function RunningCat() {
  return (
    <div aria-hidden className="w-full max-w-56">
      <div className="loading-cat-run w-full" />
      <div className="loading-ground -mt-1 h-0.5 w-full rounded-full opacity-70" />
    </div>
  );
}
