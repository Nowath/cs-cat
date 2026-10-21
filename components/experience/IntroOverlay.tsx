"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Observer } from "gsap/Observer";
import { ChevronDown } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import type { Content } from "@/content";
import { view } from "@/lib/runtime";
import { useGame } from "@/lib/store";
import { cn } from "@/lib/utils";

gsap.registerPlugin(Observer);

// ระยะเลื่อนรวมที่พากล้องจากหน้าแมวไปถึงมุมเกม (หน่วยเป็น deltaY ที่ Observer รายงาน
// ซึ่งเป็นราว 2 เท่าของ wheel event ดิบ: เมาส์ ~10 จังหวะ / trackpad ~1 ปัดยาว) นิ้วปัดสั้นกว่าจึงหารน้อยกว่า
const WHEEL_DISTANCE = 2000;
const SWIPE_DISTANCE = 420;
// กดลูกศรลง/Space/PageDown เลื่อนทีละสามจังหวะ
const KEY_STEP = 0.34;

// ชั้นข้อความช่วง intro + ตัวรับ scroll/ปัด ที่ผูกกับความคืบหน้าของกล้อง (scrub)
// ไม่มี scroll จริงของหน้า — Observer อ่าน wheel/touch แล้วเขียน view.introTarget ตรง ๆ
export function IntroOverlay({ ui }: { ui: Content["ui"] }) {
  const phase = useGame((s) => s.phase);
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (phase !== "intro") return;
      const advance = (delta: number) => {
        view.introTarget = Math.min(1, Math.max(0, view.introTarget + delta));
      };
      const observer = Observer.create({
        target: window,
        type: "wheel,touch",
        preventDefault: true,
        onChangeY: (self) => {
          // wheel: deltaY บวก = เลื่อนลง · touch: ปัดขึ้นให้ deltaY ติดลบ จึงกลับเครื่องหมาย
          const isWheel = self.event.type === "wheel";
          advance(isWheel ? self.deltaY / WHEEL_DISTANCE : -self.deltaY / SWIPE_DISTANCE);
        },
      });
      const onKey = (e: KeyboardEvent) => {
        if (["ArrowDown", "PageDown", "Space"].includes(e.code)) {
          e.preventDefault();
          advance(KEY_STEP);
        }
      };
      window.addEventListener("keydown", onKey);

      // ข้อความจางออกตามกล้องที่ลอยขึ้น — อ่านจาก view ทุกเฟรม ไม่ต้อง re-render
      const fade = () => {
        if (root.current) root.current.style.opacity = String(Math.max(0, 1 - view.intro * 2.2));
      };
      gsap.ticker.add(fade);

      return () => {
        observer.kill();
        window.removeEventListener("keydown", onKey);
        gsap.ticker.remove(fade);
      };
    },
    // revertOnUpdate: พอ phase เปลี่ยน ต้องเก็บ Observer/ตัวรับปุ่มของ intro ทิ้งทันที
    // ไม่งั้นมันค้างอยู่และ preventDefault ทุก wheel/touch ทำให้ dialog เลื่อนไม่ได้
    { dependencies: [phase], scope: root, revertOnUpdate: true },
  );

  // เรนเดอร์ตอนเข้า intro (หลัง circle wipe) animation ของข้อความจึงเริ่มเล่นตอนผู้ใช้เห็นจริง
  if (phase !== "intro") return null;

  return (
    <div
      ref={root}
      className={cn(
        "pointer-events-none fixed inset-0 flex flex-col items-center justify-between px-4",
        "pt-[max(12dvh,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] text-center",
      )}
    >
      <div className="max-w-xl animate-in duration-(--dur-slow) ease-(--ease-out) fade-in-0 slide-in-from-bottom-2 fill-mode-both [animation-delay:150ms]">
        <p className="text-sm leading-[1.5] font-medium text-ink-soft sm:text-base">{ui.introEyebrow}</p>
        <h2 className="mt-2 text-4xl leading-[1.2] font-semibold text-balance text-foreground sm:text-6xl">
          {ui.introTitle}
        </h2>
        <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-balance text-ink-soft sm:text-lg">
          {ui.introSubtitle}
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 animate-in duration-(--dur-slow) ease-(--ease-out) fade-in-0 fill-mode-both [animation-delay:600ms]">
        <p className="flex items-center gap-1.5 rounded-full bg-(--hud-glass) px-4 py-2 text-sm leading-[1.4] text-(--hud-ink) backdrop-blur-md">
          <span className="pointer-coarse:hidden">{ui.scrollHint}</span>
          <span className="hidden pointer-coarse:inline">{ui.swipeHint}</span>
          <ChevronDown aria-hidden className="size-4 motion-safe:animate-bounce" />
        </p>
        {/* ทางเลือกสำหรับคีย์บอร์ด/คนไม่สะดวก scroll — พากล้องไปมุมเกมทีเดียว */}
        <Button
          variant="ghost"
          className="btn-paper pointer-events-auto h-11 px-5 pb-1 text-base font-semibold"
          onClick={() => {
            view.introTarget = 1;
          }}
        >
          {ui.startExploring}
        </Button>
      </div>
    </div>
  );
}
