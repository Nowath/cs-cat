import type { Metadata, Viewport } from "next";
import { Anuphan } from "next/font/google";
import { notFound } from "next/navigation";
import { getContent, hasLocale, LOCALES } from "@/content";
import { SITE_URL } from "@/lib/site";
import "../globals.css";

const anuphan = Anuphan({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-anuphan",
  display: "swap",
});

export async function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const { site } = getContent(lang);
  return {
    metadataBase: SITE_URL,
    title: { default: site.shortName, template: `%s · ${site.shortName}` },
    description: site.description,
    alternates: {
      canonical: `/${lang}`,
      languages: { ...Object.fromEntries(LOCALES.map((l) => [l, `/${l}`])), "x-default": "/th" },
    },
    // รูป og มาจาก opengraph-image.tsx ในโฟลเดอร์นี้อัตโนมัติ
    openGraph: {
      type: "website",
      siteName: site.name,
      title: site.shortName,
      description: site.description,
      locale: lang === "th" ? "th_TH" : "en_US",
      alternateLocale: lang === "th" ? "en_US" : "th_TH",
    },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport: Viewport = {
  themeColor: "#e4efe6",
  viewportFit: "cover",
};

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  return (
    <html lang={lang} className={`${anuphan.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
