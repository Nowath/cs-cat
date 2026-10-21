import { notFound } from "next/navigation";
import { TopicBody } from "@/components/content/TopicBody";
import { ExperienceClient } from "@/components/experience/ExperienceClient";
import { getContent, hasLocale } from "@/content";
import { jsonLdString, siteJsonLd } from "@/lib/json-ld";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const content = getContent(lang);

  return (
    <main className="h-dvh overflow-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(siteJsonLd(content, lang)) }} />
      {/* ลิงก์แรกของหน้า (กด Tab ครั้งแรกจะโผล่) — คนใช้คีย์บอร์ด/screen reader ข้ามฉาก 3D ไปอ่านหน้าเนื้อหาได้ทันที */}
      <a
        href={`/${lang}/menu`}
        className="btn-paper sr-only z-50 text-base leading-[1.4] font-semibold focus-visible:not-sr-only focus-visible:h-11 focus-visible:px-4 focus-visible:pb-1 focus-visible:fixed focus-visible:top-4 focus-visible:left-1/2 focus-visible:inline-flex focus-visible:-translate-x-1/2 focus-visible:items-center"
      >
        {content.ui.hudMenu}
      </a>
      <h1 className="sr-only">{content.site.name}</h1>
      <ExperienceClient content={content} lang={lang} />
      {/* เนื้อหาทั้งหมดอยู่ใน DOM เสมอ ให้ search engine และ screen reader อ่านได้โดยไม่ต้องเดินในฉาก 3D */}
      <div className="sr-only">
        {content.topics.map((topic) => (
          <section key={topic.id} aria-labelledby={`topic-${topic.id}`}>
            <h2 id={`topic-${topic.id}`}>{topic.title}</h2>
            <p>{topic.teaser}</p>
            <TopicBody blocks={topic.body} />
          </section>
        ))}
      </div>
    </main>
  );
}
