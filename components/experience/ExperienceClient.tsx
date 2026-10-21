"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Component, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { Content, Locale } from "@/content";
import { useGame } from "@/lib/store";
import { supportsWebGL } from "@/lib/webgl";
import { LoadingScreen } from "./LoadingScreen";

// three.js ใช้ window/WebGL ตั้งแต่ import จึงข้าม SSR
// ssr: false ใช้ได้เฉพาะใน Client Component เลยต้องมีไฟล์นี้คั่นจาก page
// ระหว่างโหลด chunk หน้า LoadingScreen (อยู่ใน HTML แรกแล้ว) บังไว้ จึงไม่ต้องมี fallback
const Experience = dynamic(() => import("./Experience"), { ssr: false, loading: () => null });

// โชว์หน้า loading อย่างน้อยเท่านี้ ไม่ให้แวบหายบนเครื่องเร็วจนไม่ทันเห็นแมว
const MIN_LOADING_MS = 1400;
// ตำแหน่งแมวบนจอตอนฉาก intro เปิด (สัดส่วนกว้าง/สูง) — ม่านเปิดออกจากตัวแมว
const INTRO_CAT = { x: 0.5, y: 0.62 };

// วงกลมขอบเป็นคลื่น (เส้นทาง SVG สำหรับ clip-path: path()) — รัศมีแกว่งเป็นลอน WAVES ลูกรอบวง
// สองลอนซ้อนกันที่เฟสต่างกัน ขอบจึงไม่สมมาตรเกินไปแบบเฟือง
const WAVES = 9;
const POINTS = 120;
function wavyCircle(cx: number, cy: number, r: number, phase: number) {
  if (r <= 0) return "circle(0)";
  const amp = Math.min(r * 0.09, 28);
  let d = "";
  for (let i = 0; i <= POINTS; i++) {
    const a = (i / POINTS) * Math.PI * 2;
    const rr = r + amp * (0.7 * Math.sin(WAVES * a + phase) + 0.3 * Math.sin((WAVES + 4) * a - phase * 1.4));
    d += `${i ? "L" : "M"}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`;
  }
  return `path("${d}Z")`;
}

const noop = () => () => {};

// ฉาก 3D พังกลางทาง (สร้าง WebGL context ไม่ได้, shader compile ไม่ผ่านบน GPU บางรุ่น) → ไปหน้า 2D แทนจอค้าง
class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error(error);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function ExperienceClient({ content, lang }: { content: Content; lang: Locale }) {
  const loading = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const [loaderGone, setLoaderGone] = useState(false);
  const router = useRouter();
  // ฝั่ง server ถือว่ารองรับไว้ก่อน (หน้า loading เหมือนกันทุกเครื่อง) แล้วค่อยตรวจจริงตอน hydrate
  const webgl = useSyncExternalStore(noop, supportsWebGL, () => true);
  const toMenu = () => router.replace(`/${lang}/menu`);

  // เครื่องไม่รองรับ WebGL2 → ไปหน้าอ่านแบบ 2D ทันที (เนื้อหาเหมือนกันครบ)
  useEffect(() => {
    if (!webgl) router.replace(`/${lang}/menu`);
  }, [webgl, lang, router]);

  // เริ่มนับว่ากำลังโหลด (ขั้นแรก) ตั้งแต่หน้าพร้อมใช้งาน
  useGSAP((_, contextSafe) => {
    useGame.getState().reachLoad(0.1);
    const startedAt = performance.now();

    // รอ loadTarget = 1 แล้วค่อยเล่น transition แบบ iris ขอบเป็นคลื่น:
    //   หน้า loading หดเป็นวงคลื่นรอบแมวที่กำลังวิ่ง ค้างแวบหนึ่ง แล้วปิดสนิท
    //   → ฉากเปิดออกจากวงกลมรอบแมวในฉาก intro (ระหว่างนั้นเห็นม่านเข้มแบบการ์ตูนปิดฉาก)
    // contextSafe: play ถูกเรียกทีหลังจาก subscribe ต้องผูก animation เข้า context ให้ cleanup ตอน unmount
    let played = false;
    const play = contextSafe!(() => {
      if (played) return;
      played = true;
      const wait = Math.max(0, MIN_LOADING_MS - (performance.now() - startedAt)) / 1000;
      const mm = gsap.matchMedia();
      mm.add(
        { reduce: "(prefers-reduced-motion: reduce)", full: "(prefers-reduced-motion: no-preference)" },
        (ctx) => {
          const done = () => {
            setLoaderGone(true);
            const { skipIntro, setPhase } = useGame.getState();
            setPhase(skipIntro ? "explore" : "intro");
          };
          const loader = loading.current!;
          const stage = scene.current!;
          // ลดการเคลื่อนไหว: ไม่ใช้วงกลม แค่จางสลับสั้น ๆ
          if (ctx.conditions?.reduce) {
            stage.style.clipPath = "none";
            gsap.to(loader, { opacity: 0, duration: 0.2, delay: wait, onComplete: done });
            return;
          }
          const w = window.innerWidth;
          const h = window.innerHeight;
          const cover = Math.hypot(w, h) * 0.6 + 80;
          const cat = loader.querySelector(".loading-cat-run")?.getBoundingClientRect();
          const out = {
            x: cat ? cat.left + cat.width / 2 : w / 2,
            y: cat ? cat.top + cat.height / 2 : h / 2,
          };
          const hug = cat ? Math.max(cat.width, cat.height) * 0.68 : 120;
          const into = { x: w * INTRO_CAT.x, y: h * INTRO_CAT.y };
          // ค่าที่ GSAP tween แล้ววาดขอบคลื่นใหม่ทุกเฟรม (phase หมุนตลอด ขอบจึงพลิ้วเหมือนน้ำ)
          const wave = { r: cover, phase: 0 };
          const drawOn = (el: HTMLElement, c: { x: number; y: number }) => () => {
            el.style.clipPath = wavyCircle(c.x, c.y, wave.r, wave.phase);
          };

          gsap
            .timeline({ delay: wait, onComplete: done })
            .to(wave, { phase: Math.PI * 6, duration: 2.6, ease: "none" }, 0)
            .to(wave, { r: hug, duration: 0.65, ease: "power3.inOut", onUpdate: drawOn(loader, out) }, 0)
            .to(wave, { r: 0, duration: 0.32, ease: "power2.in", onUpdate: drawOn(loader, out) }, 0.87)
            .set(stage, { clipPath: wavyCircle(into.x, into.y, 0, 0) })
            .to(wave, { r: cover, duration: 1.05, ease: "power3.out", onUpdate: drawOn(stage, into) }, 1.3)
            // เปิดสุดแล้วถอด clip ทิ้ง ไม่ให้เบราว์เซอร์ต้องคำนวณ clip ทุกเฟรมตอนเล่น
            .call(() => {
              stage.style.clipPath = "none";
            });
        },
      );
    });

    if (useGame.getState().loadTarget >= 1) play();
    return useGame.subscribe((s) => s.loadTarget >= 1 && play());
  });

  return (
    <>
      {/* ม่านเข้มคั่นระหว่างหน้า loading ปิดกับฉากเปิด — ขอบวงกลมของ iris จึงเห็นชัด */}
      <div aria-hidden className="fixed inset-0 bg-(--iris-curtain)" />
      {/* ฉากเริ่มแบบ clip ปิดสนิท จนกว่า transition จะเปิด */}
      <div ref={scene} className="fixed inset-0" style={{ clipPath: "circle(0)" }}>
        {webgl && (
          <SceneBoundary onError={toMenu}>
            <Experience content={content} lang={lang} />
          </SceneBoundary>
        )}
      </div>
      {!loaderGone && <LoadingScreen ref={loading} ui={content.ui} />}
    </>
  );
}
