import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import type { Block } from "@/content";

// แสดงเนื้อหาหัวข้อจาก JSON — ใช้ทั้งใน dialog ของฉาก 3D และในหน้าเนื้อหาแบบ DOM (SEO/screen reader)
export function TopicBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-4 text-base leading-relaxed text-pretty">
      {blocks.map((block, i) => (
        <BlockView key={i} block={block} />
      ))}
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "heading":
      return <h3 className="pt-2 text-lg leading-[1.3] font-semibold text-balance">{block.text}</h3>;
    case "p":
      return <p>{block.text}</p>;
    case "list":
      return (
        <ul className="list-disc space-y-1.5 ps-5 marker:text-primary">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "table":
      return (
        // ตารางกว้างกว่าจอมือถือให้เลื่อนในกล่องตัวเอง ไม่ดันทั้งหน้า
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm leading-[1.5]">
            <thead className="bg-muted">
              <tr>
                {block.head.map((h) => (
                  <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r} className="border-t">
                  {row.map((cell, c) => (
                    <td key={c} className="px-3 py-2 align-top">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "links":
      return (
        <ul className="grid gap-2">
          {block.items.map((link) => (
            <li key={link.href + link.label}>
              <TopicLink href={link.href}>{link.label}</TopicLink>
            </li>
          ))}
        </ul>
      );
    case "image":
      return (
        <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
          <Image src={block.src} alt={block.alt} fill sizes="(min-width: 768px) 576px, 100vw" className="object-cover" />
        </div>
      );
  }
}

export function TopicLink({ href, children }: { href: string; children: React.ReactNode }) {
  const external = /^https?:/.test(href);
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="group inline-flex items-start gap-1.5 rounded-sm font-medium text-accent-foreground underline decoration-primary/40 underline-offset-4 outline-none transition-colors duration-(--dur-fast) ease-(--ease-out) hover:decoration-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <span>{children}</span>
      {external && (
        <ArrowUpRight
          aria-hidden
          className="mt-1 size-4 shrink-0 transition-transform duration-(--dur-fast) ease-(--ease-out) group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      )}
    </a>
  );
}
