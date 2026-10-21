import type { Content, Locale } from "@/content";
import { ORG_URL, SITE_URL } from "./site";

// ข้อมูลโครงสร้าง (schema.org) ให้ Google รู้ว่าเว็บนี้คือหลักสูตรของมหาวิทยาลัย
// ที่อยู่/เบอร์โทรตรงกับหัวข้อ "ติดต่อเรา" ใน content
export function siteJsonLd(content: Content, lang: Locale) {
  const url = new URL(`/${lang}`, SITE_URL).href;
  const department = {
    "@type": "EducationalOrganization",
    "@id": `${ORG_URL}#department`,
    name:
      lang === "th"
        ? "ภาควิชาคณิตศาสตร์และวิทยาการคอมพิวเตอร์ คณะวิทยาศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย"
        : "Department of Mathematics and Computer Science, Faculty of Science, Chulalongkorn University",
    url: ORG_URL,
    telephone: "+66-2-218-5141",
    sameAs: ["https://www.facebook.com/MathComSciCU"],
    address: {
      "@type": "PostalAddress",
      streetAddress: "Phayathai Road",
      addressLocality: "Pathum Wan",
      addressRegion: "Bangkok",
      postalCode: "10330",
      addressCountry: "TH",
    },
    parentOrganization: { "@type": "CollegeOrUniversity", name: "Chulalongkorn University", url: "https://www.chula.ac.th/" },
  };
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: content.site.name,
        alternateName: content.site.shortName,
        description: content.site.description,
        url,
        inLanguage: lang,
        publisher: { "@id": department["@id"] },
      },
      department,
    ],
  };
}

// JSON ใน <script> ต้องกัน "</script>" ในข้อความ (แทน < เป็น <)
export function jsonLdString(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
