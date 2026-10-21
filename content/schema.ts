import { z } from "zod";

// แหล่งเนื้อหา: https://www.math.sc.chula.ac.th/th/ (ไทย) และ https://www.math.sc.chula.ac.th/ (อังกฤษ)
// แก้ข้อความใน topics.*.json ได้เลยโดยไม่ต้องแตะโค้ด 3D — schema นี้ตรวจตอน build ถ้าพิมพ์ผิดรูปแบบจะ build ไม่ผ่าน

const link = z.object({ label: z.string().min(1), href: z.string().min(1) });

export const blockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("heading"), text: z.string().min(1) }),
  z.object({ type: z.literal("p"), text: z.string().min(1) }),
  z.object({ type: z.literal("list"), items: z.array(z.string().min(1)).min(1) }),
  z.object({
    type: z.literal("table"),
    head: z.array(z.string()),
    rows: z.array(z.array(z.string())).min(1),
  }),
  z.object({ type: z.literal("links"), items: z.array(link).min(1) }),
  z.object({ type: z.literal("image"), src: z.string().min(1), alt: z.string() }),
]);

export const topicSchema = z.object({
  id: z.string().regex(/^[a-z-]+$/),
  title: z.string().min(1),
  teaser: z.string().min(1),
  body: z.array(blockSchema).min(1),
  sourceUrl: z.url(),
});

export const contentSchema = z.object({
  site: z.object({
    name: z.string(),
    shortName: z.string(),
    description: z.string(),
  }),
  ui: z.object({
    controlsDesktop: z.string(),
    controlsTouch: z.string(),
    viewDetails: z.string(),
    pressToOpen: z.string(),
    close: z.string(),
    source: z.string(),
    station: z.string(),
    scanToOpen: z.string(),
    loading: z.string(),
    introEyebrow: z.string(),
    introTitle: z.string(),
    introSubtitle: z.string(),
    scrollHint: z.string(),
    swipeHint: z.string(),
    startExploring: z.string(),
    hudMap: z.string(),
    hudAutoWalk: z.string(),
    hudAutoWalkStop: z.string(),
    hudSkip: z.string(),
    hudMenu: z.string(),
    hudMenuToggle: z.string(),
    hudLanguage: z.string(),
    hudLanguageLabel: z.string(),
    hudSoundOn: z.string(),
    hudSoundOff: z.string(),
    mapTitle: z.string(),
    mapHint: z.string(),
    mapYouAreHere: z.string(),
    menuTitle: z.string(),
    menuIntro: z.string(),
    menuContents: z.string(),
    menuBackToExplore: z.string(),
    creditCatModel: z.string(),
    creditBy: z.string(),
    perfHint: z.string(),
    perfHintAction: z.string(),
    perfHintDismiss: z.string(),
  }),
  topics: z.array(topicSchema).min(1),
});

export type Block = z.infer<typeof blockSchema>;
export type Topic = z.infer<typeof topicSchema>;
export type Content = z.infer<typeof contentSchema>;
