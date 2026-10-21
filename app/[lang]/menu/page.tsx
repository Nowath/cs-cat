import { ArrowLeft, Languages } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TopicBody, TopicLink } from "@/components/content/TopicBody";
import { StationIcon } from "@/components/experience/stations/icons";
import { Button } from "@/components/ui/button";
import { getContent, hasLocale, LOCALES, type Locale } from "@/content";
import { CAT_MODEL } from "@/lib/cat-model";

export async function generateMetadata({ params }: PageProps<"/[lang]/menu">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const { ui, site } = getContent(lang);
  return {
    title: ui.hudMenu,
    description: site.description,
    alternates: {
      canonical: `/${lang}/menu`,
      languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}/menu`])),
    },
  };
}

// หน้าเนื้อหาแบบ 2D: ทุกหัวข้อในหน้าเดียว ไม่โหลดฉาก 3D — สำหรับคนไม่อยากเดิน เครื่องที่ไม่รองรับ WebGL
// และให้ search engine / screen reader อ่านได้ครบ
export default async function MenuPage({ params }: PageProps<"/[lang]/menu">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const { ui, site, topics } = getContent(lang);
  const other: Locale = lang === "th" ? "en" : "th";

  return (
    // ธีมกระดาษเก่าเหมือนปุ่มและ dialog ในฉาก — หน้าอ่านแบบเว็บจึงยังเป็นเว็บเดียวกัน
    <div className="paper-theme min-h-dvh">
      <header className="sticky top-0 z-10 border-b-3 border-(--paper-ink) bg-(--paper-panel) shadow-[inset_0_-4px_0_var(--paper-edge)]">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 pt-3 pb-4">
          <Button asChild variant="ghost" className="btn-paper h-11 gap-2 ps-3 pe-4 pb-1 text-base font-semibold">
            <Link href={`/${lang}`}>
              <ArrowLeft aria-hidden className="size-5" />
              <span>{ui.menuBackToExplore}</span>
            </Link>
          </Button>
          <Button asChild variant="ghost" className="btn-paper h-11 gap-2 px-4 pb-1">
            <Link href={`/${other}/menu`} aria-label={ui.hudLanguageLabel} hrefLang={other}>
              <Languages aria-hidden className="size-4" />
              <span className="font-semibold">{ui.hudLanguage}</span>
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pt-10 pb-24 sm:pt-14">
        <p className="text-sm leading-[1.5] font-medium text-muted-foreground sm:text-base">{ui.introEyebrow}</p>
        <h1 className="mt-2 text-3xl leading-[1.25] font-semibold text-balance sm:text-5xl">{ui.introTitle}</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground">{ui.menuIntro}</p>

        <div className="mt-10 grid gap-10 lg:grid-cols-[14rem_1fr] lg:gap-14">
          <nav aria-labelledby="menu-contents" className="lg:sticky lg:top-24 lg:self-start">
            <h2 id="menu-contents" className="text-sm leading-[1.5] font-semibold text-muted-foreground">
              {ui.menuContents}
            </h2>
            <ol className="mt-3 grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
              {topics.map((topic, i) => (
                <li key={topic.id}>
                  <a
                    href={`#${topic.id}`}
                    className="flex items-center gap-2.5 rounded-md px-2 py-2 text-base leading-[1.4] outline-none transition-colors duration-(--dur-fast) ease-(--ease-out) hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-[3px] bg-(--paper-edge) text-sm font-semibold text-(--paper-panel)">
                      {i + 1}
                    </span>
                    <span>{topic.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="grid gap-6">
            {topics.map((topic, i) => (
              <section
                key={topic.id}
                id={topic.id}
                aria-labelledby={`${topic.id}-title`}
                className="panel-paper scroll-mt-28 p-5 pb-8 sm:p-8 sm:pb-10"
              >
                <p className="flex items-center gap-2 text-sm leading-[1.5] font-medium text-accent-foreground">
                  <StationIcon id={topic.id} className="size-4" />
                  {ui.station} {i + 1}
                </p>
                <h2 id={`${topic.id}-title`} className="mt-1.5 text-2xl leading-[1.3] font-semibold text-balance">
                  {topic.title}
                </h2>
                <p className="mt-2 text-base leading-relaxed text-muted-foreground">{topic.teaser}</p>
                <div className="mt-6">
                  <TopicBody blocks={topic.body} />
                </div>
                <div className="mt-6 border-t pt-4 text-sm">
                  <TopicLink href={topic.sourceUrl}>{ui.source}</TopicLink>
                </div>
              </section>
            ))}
          </div>
        </div>

        <footer className="mt-16 grid gap-1 text-sm leading-relaxed text-muted-foreground">
          <p>{site.name}</p>
          {/* โมเดล CC-BY ต้องให้เครดิตผู้สร้างในที่ที่คนเห็นได้ */}
          {CAT_MODEL.kind === "rigged" && CAT_MODEL.credit && (
            <p>
              {ui.creditCatModel}: <a href={CAT_MODEL.credit.url} className="underline underline-offset-4">{CAT_MODEL.credit.title}</a>{" "}
              {ui.creditBy} {CAT_MODEL.credit.author} ·{" "}
              <a href={CAT_MODEL.credit.licenseUrl} className="underline underline-offset-4">{CAT_MODEL.credit.license}</a>
            </p>
          )}
        </footer>
      </main>
    </div>
  );
}
