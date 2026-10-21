"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Content, Locale } from "@/content";
import { useGame } from "@/lib/store";

// โผล่เมื่อลดคุณภาพจนต่ำสุดแล้วยังกระตุก — ไม่บังคับย้ายหน้า ให้ผู้ใช้เลือกเอง
export function PerfHint({ ui, lang }: { ui: Content["ui"]; lang: Locale }) {
  const show = useGame((s) => s.struggling && s.phase === "explore");
  const dismiss = useGame((s) => s.dismissStruggling);
  if (!show) return null;

  return (
    <div
      role="status"
      className="panel-paper fixed inset-x-4 top-[calc(max(1rem,env(safe-area-inset-top))+4rem)] mx-auto flex w-fit max-w-sm items-center gap-3 py-2.5 ps-4 pe-2.5 animate-in duration-(--dur-med) ease-(--ease-out) fade-in-0 slide-in-from-top-2"
    >
      <p className="text-sm leading-[1.5]">
        {ui.perfHint}{" "}
        <Link href={`/${lang}/menu`} className="font-semibold whitespace-nowrap underline underline-offset-4">
          {ui.perfHintAction}
        </Link>
      </p>
      <Button variant="ghost" aria-label={ui.perfHintDismiss} onClick={dismiss} className="btn-paper size-9 shrink-0 pb-0.5 [&_svg]:size-4">
        <X />
      </Button>
    </div>
  );
}
