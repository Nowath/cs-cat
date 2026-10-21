import type { MetadataRoute } from "next";
import { LOCALES } from "@/content";
import { SITE_URL } from "@/lib/site";

// ทุกหน้า × ทุกภาษา พร้อมบอกคู่ภาษา (hreflang) ให้ search engine
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/menu"].flatMap((path) =>
    LOCALES.map((lang) => ({
      url: new URL(`/${lang}${path}`, SITE_URL).href,
      changeFrequency: "monthly" as const,
      priority: path ? 0.8 : 1,
      alternates: {
        languages: Object.fromEntries(LOCALES.map((l) => [l, new URL(`/${l}${path}`, SITE_URL).href])),
      },
    })),
  );
}
