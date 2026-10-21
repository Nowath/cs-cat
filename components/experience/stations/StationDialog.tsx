"use client";

import { QRCodeSVG } from "qrcode.react";
import { TopicBody, TopicLink } from "@/components/content/TopicBody";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import type { Content } from "@/content";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useGame } from "@/lib/store";
import { PALETTE } from "@/lib/world";
import { StationIcon } from "./icons";

// ปุ่มปิดมุมขวาบนเป็นปุ่มกระดาษเหมือนปุ่มอื่นในเกม
export const PAPER_CLOSE = "btn-paper top-3 right-3 size-10 pb-0.5 [&_svg]:size-4.5";

// desktop = dialog กลางจอ · มือถือ = bottom sheet ลากปิดได้ (นิ้วโป้งเอื้อมถึง)
export function StationDialog({ content }: { content: Content }) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const openId = useGame((s) => s.openStationId);
  const lastId = useGame((s) => s.lastStationId);
  const closeStation = useGame((s) => s.closeStation);

  const index = content.topics.findIndex((t) => t.id === lastId);
  const topic = content.topics[index];
  const open = openId !== null;
  const onOpenChange = (next: boolean) => !next && closeStation();
  if (!topic) return null;

  const eyebrow = (
    <span className="flex items-center gap-2 text-sm font-medium text-accent-foreground">
      <StationIcon id={topic.id} className="size-4" />
      {content.ui.station} {index + 1}
    </span>
  );
  const body = (withQr: boolean) => (
    <>
      <TopicBody blocks={topic.body} />
      <div className="mt-6 flex items-end justify-between gap-4 border-t pt-4 text-sm">
        <TopicLink href={topic.sourceUrl}>{content.ui.source}</TopicLink>
        {/* QR ไปหน้าต้นฉบับ ให้คนที่ดูบนจอใหญ่ (เช่นงานนิทรรศการ) หยิบมือถือสแกนต่อได้
            บนมือถือไม่แสดง เพราะผู้ใช้อยู่บนโทรศัพท์อยู่แล้ว */}
        {withQr && (
          <figure className="flex shrink-0 items-center gap-3">
            <figcaption className="max-w-28 text-right text-sm leading-[1.5] text-muted-foreground">
              {content.ui.scanToOpen}
            </figcaption>
            <div className="rounded-md border-2 border-(--paper-ink) bg-white p-1.5">
              <QRCodeSVG
                value={topic.sourceUrl}
                size={88}
                level="L"
                fgColor={PALETTE.qrInk}
                title={`${content.ui.scanToOpen}: ${topic.title}`}
              />
            </div>
          </figure>
        )}
      </div>
    </>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          closeLabel={content.ui.close}
          closeClassName={PAPER_CLOSE}
          className="panel-paper max-h-[85dvh] gap-0 overflow-y-auto p-7 pb-9 sm:max-w-xl"
        >
          <DialogHeader className="mb-5 gap-1.5 pe-8">
            {eyebrow}
            <DialogTitle className="text-2xl leading-[1.3] font-semibold text-balance">{topic.title}</DialogTitle>
            <DialogDescription className="text-base leading-relaxed">{topic.teaser}</DialogDescription>
          </DialogHeader>
          {body(true)}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="panel-paper panel-sheet data-[vaul-drawer-direction=bottom]:max-h-[85dvh]">
        <DrawerHeader className="gap-1.5 px-5 pt-3 pb-4 text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
          {eyebrow}
          <DrawerTitle className="text-xl leading-[1.3] font-semibold text-balance">{topic.title}</DrawerTitle>
          <DrawerDescription className="text-base leading-relaxed">{topic.teaser}</DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">{body(false)}</div>
      </DrawerContent>
    </Drawer>
  );
}
