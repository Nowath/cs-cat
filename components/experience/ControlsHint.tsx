"use client";

import type { Content } from "@/content";
import { useGame } from "@/lib/store";
import { cn } from "@/lib/utils";

export function ControlsHint({ ui }: { ui: Content["ui"] }) {
  const hasMoved = useGame((s) => s.hasMoved);
  const explore = useGame((s) => s.phase === "explore");
  if (!explore) return null;

  return (
    <p
      className={cn(
        // ล่างกลางจอ ไม่ชนเมนูมุมบนที่ไหลลงมา · จอสัมผัสยกขึ้นเหนือจอยสติ๊ก
        "pointer-events-none fixed inset-x-4 bottom-[max(1.5rem,env(safe-area-inset-bottom))] mx-auto w-fit rounded-full border border-(--hud-border) bg-(--hud-glass) px-4 py-2 backdrop-blur-md",
        "pointer-coarse:bottom-[calc(max(1.5rem,env(safe-area-inset-bottom))+10.5rem)]",
        "text-center text-sm leading-[1.4] text-(--hud-ink)",
        "animate-in duration-(--dur-slow) ease-(--ease-out) fade-in-0 slide-in-from-bottom-2",
        "transition-opacity duration-(--dur-slow) ease-(--ease-in)",
        hasMoved && "opacity-0",
      )}
    >
      <span className="pointer-coarse:hidden">{ui.controlsDesktop}</span>
      <span className="hidden pointer-coarse:inline">{ui.controlsTouch}</span>
    </p>
  );
}
