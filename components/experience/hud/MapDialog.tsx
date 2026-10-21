"use client";

import { PawPrint } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Color } from "three";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Content } from "@/content";
import type { Bounds } from "@/lib/bounds";
import type { PathData } from "@/lib/path";
import { cat } from "@/lib/runtime";
import { CLEARING_RADIUS } from "@/lib/stations";
import { useGame } from "@/lib/store";
import { heightAt, normalAt } from "@/lib/terrain";
import { cn } from "@/lib/utils";
import { PALETTE, SUN_POSITION } from "@/lib/world";
import { StationIcon } from "../stations/icons";
import { PAPER_CLOSE } from "../stations/StationDialog";
import { warpToStation } from "../travel";

const IMAGE_SIZE = 512;
const CELL = 4;

interface MapDialogProps {
  content: Content;
  path: PathData;
  bounds: Bounds;
}

// แผนที่มุมบน: เห็นเนิน ทางเดิน ทุกสถานี และตำแหน่งแมว — กดสถานีไหนแมววาร์ปไปที่นั่น
export function MapDialog({ content, path, bounds }: MapDialogProps) {
  const open = useGame((s) => s.mapOpen);
  const lastVisited = useGame((s) => s.lastVisited);
  const [image] = useState(() => drawMapImage(path, bounds));
  const marker = useRef<HTMLDivElement>(null);
  const { ui, topics } = content;

  const toMap = (x: number, z: number) => ({
    left: `${((x - bounds.minX) / (bounds.maxX - bounds.minX)) * 100}%`,
    top: `${((z - bounds.minZ) / (bounds.maxZ - bounds.minZ)) * 100}%`,
  });

  // จุดแมวขยับตามตำแหน่งจริงระหว่างเปิดแผนที่ (เขียน style ตรง ๆ ไม่ re-render)
  useEffect(() => {
    if (!open) return;
    let raf = 0;
    const tick = () => {
      const el = marker.current;
      if (el) {
        const p = toMapRatio(cat.position.x, cat.position.z, bounds);
        el.style.left = `${p.x * 100}%`;
        el.style.top = `${p.y * 100}%`;
        el.style.setProperty("--heading", `${Math.PI - cat.heading}rad`);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, bounds]);

  function go(id: string) {
    const s = useGame.getState();
    s.setMapOpen(false);
    s.setAutoWalk(false);
    warpToStation(id);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => useGame.getState().setMapOpen(o)}>
      <DialogContent
        closeLabel={ui.close}
        closeClassName={PAPER_CLOSE}
        className="panel-paper flex max-h-[92dvh] flex-col gap-4 overflow-y-auto p-5 pb-8 sm:max-w-2xl sm:p-7 sm:pb-9"
      >
        <DialogHeader className="gap-1 pe-8">
          <DialogTitle className="text-xl leading-[1.3] font-semibold">{ui.mapTitle}</DialogTitle>
          <DialogDescription className="text-base leading-relaxed">{ui.mapHint}</DialogDescription>
        </DialogHeader>

        {/* flex column แทน grid ของ DialogContent: กล่อง aspect-square ใน grid คำนวณความสูงพลาดจนล้นทับรายชื่อ */}
        <div className="relative mx-auto aspect-square w-full max-w-[min(100%,62dvh)] shrink-0 overflow-hidden rounded-md border-3 border-(--paper-ink)">
          {/* eslint-disable-next-line @next/next/no-img-element -- ภาพวาดจาก canvas เป็น data URL ไม่ต้องผ่าน next/image */}
          <img src={image} alt="" className="absolute inset-0 size-full" />

          {topics.map((topic, i) => {
            const p = path.anchors[i + 1];
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => go(topic.id)}
                style={toMap(p.x, p.z)}
                aria-label={`${ui.station} ${i + 1}: ${topic.title}`}
                title={topic.title}
                className={cn(
                  "absolute grid size-9 -translate-1/2 place-items-center rounded-full border-2 border-white",
                  "bg-primary text-sm font-semibold text-primary-foreground shadow-(--hud-shadow)",
                  "outline-none transition-transform duration-(--dur-fast) ease-(--ease-out) hover:scale-110",
                  "focus-visible:ring-[3px] focus-visible:ring-ring/60",
                  i === lastVisited && "ring-[3px] ring-white/80",
                )}
              >
                {i + 1}
              </button>
            );
          })}

          <div
            ref={marker}
            aria-label={ui.mapYouAreHere}
            role="img"
            className="pointer-events-none absolute grid size-8 -translate-1/2 place-items-center rounded-full bg-ink text-white shadow-(--hud-shadow) ring-2 ring-white"
          >
            <PawPrint aria-hidden className="size-4 rotate-(--heading)" />
          </div>
        </div>

        <ol className="grid gap-1.5 sm:grid-cols-2">
          {topics.map((topic, i) => (
            <li key={topic.id}>
              <button
                type="button"
                onClick={() => go(topic.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-base leading-[1.4]",
                  "outline-none transition-colors duration-(--dur-fast) ease-(--ease-out) hover:bg-accent",
                  "focus-visible:ring-[3px] focus-visible:ring-ring/50",
                )}
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <StationIcon id={topic.id} className="size-4 shrink-0 text-accent-foreground" />
                <span className="min-w-0">{topic.title}</span>
              </button>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}

function toMapRatio(x: number, z: number, b: Bounds) {
  return { x: (x - b.minX) / (b.maxX - b.minX), y: (z - b.minZ) / (b.maxZ - b.minZ) };
}

// ภาพพื้นหลังแผนที่: ไล่สีตามความสูง + แสงตามความชันแบบเดียวกับในฉาก แล้ววาดทาง/ลานสถานีทับ
function drawMapImage(path: PathData, b: Bounds) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = IMAGE_SIZE;
  const ctx = canvas.getContext("2d")!;
  const span = b.maxX - b.minX;
  const scale = IMAGE_SIZE / span;
  const sun = SUN_POSITION.clone().normalize();
  const low = new Color(PALETTE.grassBase);
  const high = new Color(PALETTE.grassTip);
  const c = new Color();

  for (let py = 0; py < IMAGE_SIZE; py += CELL) {
    for (let px = 0; px < IMAGE_SIZE; px += CELL) {
      const x = b.minX + (px + CELL / 2) / scale;
      const z = b.minZ + (py + CELL / 2) / scale;
      const h = heightAt(x, z);
      const n = normalAt(x, z);
      const shade = Math.min(1.3, Math.max(0.7, 1 + 1.6 * (n.dot(sun) - sun.y)));
      c.copy(low).lerp(high, 0.35 + h * 0.12).multiplyScalar(shade);
      ctx.fillStyle = `#${c.getHexString()}`;
      ctx.fillRect(px, py, CELL, CELL);
    }
  }

  const toPx = (v: number, min: number) => (v - min) * scale;
  ctx.lineCap = ctx.lineJoin = "round";
  ctx.strokeStyle = ctx.fillStyle = PALETTE.trail;
  ctx.lineWidth = 1.1 * scale;
  ctx.beginPath();
  path.curve.getSpacedPoints(300).forEach((p, i) => {
    const X = toPx(p.x, b.minX);
    const Y = toPx(p.z, b.minZ);
    if (i) ctx.lineTo(X, Y);
    else ctx.moveTo(X, Y);
  });
  ctx.stroke();
  for (const a of path.anchors.slice(1)) {
    ctx.beginPath();
    ctx.arc(toPx(a.x, b.minX), toPx(a.z, b.minZ), CLEARING_RADIUS * scale * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas.toDataURL("image/png");
}
