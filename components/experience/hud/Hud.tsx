"use client";

import { BookOpenText, Ellipsis, Footprints, Languages, Map as MapIcon, SkipForward, Volume2, VolumeX, X } from "lucide-react";
import Link from "next/link";
import { Collapsible } from "radix-ui";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { Content, Locale } from "@/content";
import { ambience } from "@/lib/sound";
import { useGame } from "@/lib/store";
import { cn } from "@/lib/utils";
import { saveResume } from "../resume";
import { nextStationIndex, warpToStation } from "../travel";

interface HudProps {
  content: Content;
  lang: Locale;
}

// มุมขวาบน: ปุ่มเดียวหุบไว้ กดแล้วปุ่มเมนูไหลลงมาไล่ทีละอัน (แผนที่ · เดินเอง · ข้าม · อ่านแบบหน้าเว็บ · ภาษา)
// มุมซ้ายบน: ปุ่มเสียงแยกไว้ เปิด/ปิดได้ในกดเดียว
export function Hud({ content, lang }: HudProps) {
  const explore = useGame((s) => s.phase === "explore");
  const autoWalk = useGame((s) => s.autoWalk);
  const soundOn = useGame((s) => s.soundOn);
  const [open, setOpen] = useState(false);
  const { ui, topics } = content;
  const other: Locale = lang === "th" ? "en" : "th";

  // Escape หุบเมนู (ถ้าไม่มี dialog เปิดอยู่ — dialog จัดการ Escape ของตัวเอง)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const s = useGame.getState();
      if (e.key === "Escape" && !s.mapOpen && !s.openStationId) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!explore) return null;

  // เลือกคำสั่งแล้วหุบเมนูไม่ให้บังฉาก
  const run = (fn: () => void) => () => {
    fn();
    setOpen(false);
  };

  const items: HudItemProps[] = [
    { label: ui.hudMap, icon: <MapIcon />, onClick: run(() => useGame.getState().setMapOpen(true)) },
    {
      label: autoWalk ? ui.hudAutoWalkStop : ui.hudAutoWalk,
      icon: <Footprints />,
      pressed: autoWalk,
      onClick: run(() => useGame.getState().setAutoWalk(!autoWalk)),
    },
    {
      label: ui.hudSkip,
      icon: <SkipForward />,
      onClick: run(() => {
        useGame.getState().setAutoWalk(false);
        warpToStation(topics[nextStationIndex(topics.length)].id);
      }),
    },
    { label: ui.hudMenu, icon: <BookOpenText />, href: `/${lang}/menu` },
    // สลับภาษา: จำตำแหน่งแมวไว้ หน้าใหม่จะข้าม intro แล้ววางแมวไว้ที่เดิม
    { label: ui.hudLanguageLabel, icon: <Languages />, href: `/${other}`, onClick: saveResume },
  ];

  return (
    <>
      <Button
        variant="ghost"
        aria-label={soundOn ? ui.hudSoundOff : ui.hudSoundOn}
        aria-pressed={soundOn}
        // เริ่ม/หยุดเสียงใน onClick ตรง ๆ เบราว์เซอร์ยอมให้เล่นเสียงเฉพาะในจังหวะที่ผู้ใช้กดเท่านั้น
        onClick={() => {
          if (soundOn) ambience.disable();
          else ambience.enable();
          useGame.getState().setSoundOn(!soundOn);
        }}
        className={cn(
          "btn-paper fixed top-[max(1rem,env(safe-area-inset-top))] left-[max(1rem,env(safe-area-inset-left))] size-12 pb-1",
          "animate-in duration-(--dur-slow) ease-(--ease-out) fade-in-0 slide-in-from-top-2 [&_svg]:size-5",
        )}
      >
        {soundOn ? <Volume2 /> : <VolumeX />}
      </Button>

      <Collapsible.Root
        open={open}
        onOpenChange={setOpen}
        className={cn(
          "fixed top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] flex flex-col items-end gap-2",
          "animate-in duration-(--dur-slow) ease-(--ease-out) fade-in-0 slide-in-from-top-2",
        )}
      >
        <Collapsible.Trigger asChild>
          <Button
            variant="ghost"
            aria-label={ui.hudMenuToggle}
            className="btn-paper size-12 pb-1"
          >
            {/* หมุนสลับไอคอน … ↔ × ให้รู้ว่ากดซ้ำเพื่อหุบ */}
            <span className="relative grid size-5 place-items-center">
              <Ellipsis
                aria-hidden
                className={cn(
                  "absolute size-5 transition-[opacity,rotate] duration-(--dur-med) ease-(--ease-out)",
                  open && "rotate-90 opacity-0",
                )}
              />
              <X
                aria-hidden
                className={cn(
                  "absolute size-5 transition-[opacity,rotate] duration-(--dur-med) ease-(--ease-out)",
                  !open && "-rotate-90 opacity-0",
                )}
              />
            </span>
          </Button>
        </Collapsible.Trigger>

        <Collapsible.Content asChild>
          <ul className="flex flex-col items-end gap-2">
            {items.map((item, i) => (
              // ไล่ลงทีละปุ่ม 45ms — ไหลลงมาจากปุ่มหลักแบบน้ำตก
              <li
                key={item.href ?? i}
                className="animate-in duration-(--dur-med) ease-(--ease-out) fade-in-0 slide-in-from-top-3 zoom-in-95 fill-mode-both"
                style={{ animationDelay: `${i * 45}ms` }}
              >
                <HudItem {...item} />
              </li>
            ))}
          </ul>
        </Collapsible.Content>
      </Collapsible.Root>
    </>
  );
}

interface HudItemProps {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  href?: string;
  pressed?: boolean;
}

// เมนูแนวตั้งมีที่พอโชว์ชื่อ จึงใช้ปุ่มไอคอน + ข้อความ (ไม่ต้องพึ่ง tooltip ที่จอสัมผัสไม่ขึ้น)
function HudItem({ label, icon, onClick, href, pressed }: HudItemProps) {
  // สถานะเปิด (เช่นเดินเอง) แสดงด้วย aria-pressed ซึ่ง .btn-paper วาดเป็นปุ่มจมลง
  const className = "btn-paper h-12 gap-2.5 ps-4 pe-5 pb-1 text-base leading-[1.4] font-semibold [&_svg]:size-4.5";
  if (href) {
    return (
      <Button asChild variant="ghost" className={className}>
        <Link href={href} onClick={onClick} prefetch={false}>
          {icon}
          {label}
        </Link>
      </Button>
    );
  }
  return (
    <Button variant="ghost" className={className} aria-pressed={pressed} onClick={onClick}>
      {icon}
      {label}
    </Button>
  );
}
