"use client";

import { Button } from "@/components/ui/button";
import type { Content, Topic } from "@/content";
import { useGame } from "@/lib/store";
import { cn } from "@/lib/utils";
import { StationIcon } from "./icons";
import { labelEls } from "./labels";

// ชั้น DOM ลอยเหนือ canvas — ตำแหน่งของแต่ละป้ายถูกเขียนทุกเฟรมโดย LabelProjector
export function StationLabels({ content }: { content: Content }) {
  const explore = useGame((s) => s.phase === "explore");
  return (
    // ซ่อนช่วง intro (กล้องระดับพื้น ป้ายจะลอยเกะกะ) แล้วค่อยจางเข้ามาเมื่อถึงมุมเกม
    <div
      className={cn(
        "pointer-events-none fixed inset-0 overflow-hidden transition-opacity duration-(--dur-slow) ease-(--ease-out)",
        !explore && "invisible opacity-0",
      )}
    >
      {content.topics.map((topic, i) => (
        <StationLabel key={topic.id} topic={topic} index={i} ui={content.ui} />
      ))}
    </div>
  );
}

function StationLabel({ topic, index, ui }: { topic: Topic; index: number; ui: Content["ui"] }) {
  const near = useGame((s) => s.nearStationId === topic.id);
  const openStation = useGame((s) => s.openStation);

  return (
    <div
      ref={(el) => {
        if (el) labelEls.set(topic.id, el);
        return () => void labelEls.delete(topic.id);
      }}
      // เริ่มซ่อนจนกว่า projector จะวางตำแหน่งเฟรมแรก กันป้ายกระพริบที่มุมซ้ายบน
      style={{ visibility: "hidden" }}
      className="absolute top-0 left-0 flex flex-col items-center gap-2 pb-2 will-change-transform"
    >
      {near && (
        <div className="pointer-events-auto flex flex-col items-center gap-1 animate-in duration-(--dur-med) ease-(--ease-out) fade-in-0 slide-in-from-bottom-1">
          <Button variant="ghost" className="btn-paper h-11 px-4 pb-1 text-base font-semibold" onClick={() => openStation(topic.id)}>
            {ui.viewDetails}
          </Button>
          <span className="tag-paper px-2 pb-0.5 text-sm leading-[1.5] pointer-coarse:hidden">
            {ui.pressToOpen}
          </span>
        </div>
      )}
      <div
        className={cn(
          "tag-paper flex items-center gap-2 py-1 ps-1 pe-3 pb-1.5",
          "text-sm leading-[1.4] font-semibold whitespace-nowrap",
          "transition-transform duration-(--dur-med) ease-(--ease-out)",
          near && "scale-105",
        )}
      >
        <span className="grid size-7 place-items-center rounded-[3px] bg-(--paper-edge) text-(--paper-panel)">
          <StationIcon id={topic.id} className="size-4" />
        </span>
        <span>
          <span className="sr-only">
            {ui.station} {index + 1}:{" "}
          </span>
          {topic.title}
        </span>
      </div>
    </div>
  );
}
