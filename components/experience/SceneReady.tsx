"use client";

import { useProgress } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { useGame } from "@/lib/store";

// ขั้นการโหลดที่วัดได้จริงในฉาก:
//   0.75 = สร้าง WebGL + ฉากแล้ว
//   0.92 = compile shader ทั้งหมดเสร็จ (หญ้า พื้น ฟ้า แมว) — ขั้นที่กินเวลาที่สุดบนมือถือ
//   1.00 = ไฟล์ asset (เช่นโมเดลแมว .glb) โหลดครบ และ render ผ่านไปแล้วสองสามเฟรม
// เฟรมแรกหลัง compile มักยังสะดุด จึงรอให้ลื่นก่อนค่อยเปิดม่าน
export function SceneReady() {
  const { gl, scene, camera } = useThree();
  const { active } = useProgress();
  const compiled = useRef(false);
  const frames = useRef(0);

  useEffect(() => {
    const { reachLoad } = useGame.getState();
    reachLoad(0.75);
    let cancelled = false;
    gl.compileAsync(scene, camera).then(() => {
      if (cancelled) return;
      compiled.current = true;
      reachLoad(0.92);
    });
    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera]);

  useFrame(() => {
    if (!compiled.current || active) return;
    frames.current += 1;
    if (frames.current === 3) useGame.getState().reachLoad(1);
  });

  return null;
}
