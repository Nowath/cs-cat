import en from "./topics.en.json";
import th from "./topics.th.json";
import { contentSchema, type Content } from "./schema";

export const LOCALES = ["th", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "th";

// parse ครั้งเดียวตอนโหลดโมดูล — JSON ผิดรูปแบบจะพังตอน build ไม่ใช่ตอนผู้ใช้เปิดหน้า
const contents: Record<Locale, Content> = {
  th: contentSchema.parse(th),
  en: contentSchema.parse(en),
};

export function hasLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function getContent(locale: Locale): Content {
  return contents[locale];
}

export type { Block, Content, Topic } from "./schema";
