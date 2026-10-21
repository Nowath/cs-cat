"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Fog, MathUtils, Vector3 } from "three";
import { cat, view } from "@/lib/runtime";
import { useGame } from "@/lib/store";
import { CAMERA_OFFSET, FOG_EXPLORE, FOG_INTRO, INTRO_LOOK, INTRO_OFFSET, PORTRAIT_ZOOM } from "@/lib/world";

const FOLLOW = 3.5;
// ความหน่วงของกล้องตาม scroll ช่วง intro — ต่ำ = ลื่นแต่ตามช้า
const INTRO_FOLLOW = 3;

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// มุมเกม: หน่วงเฉพาะ "จุดเล็ง" แล้ววางกล้องที่ offset คงที่ มุมจึงไม่หมุนเลย
// ช่วง intro: ผสมระหว่างมุมระดับสายตาแมว (หน้าตรง) กับมุมเกมตามความคืบหน้าของ scroll
export function CameraRig() {
  const started = useRef(false);
  // ลดการเคลื่อนไหว: ข้ามการเคลื่อนกล้องแบบ crane ตัดไปมุมเกมทันทีเมื่อผู้ใช้สั่งเริ่ม
  const reduceMotion = useRef(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const tmp = useRef({
    game: new Vector3(),
    intro: new Vector3(),
    look: new Vector3(),
    introLook: new Vector3(),
  });

  useFrame(({ camera, size, scene }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const v = tmp.current;
    const { phase, setPhase } = useGame.getState();

    if (!started.current) {
      view.focus.copy(cat.position);
      started.current = true;
    } else {
      view.focus.lerp(cat.position, 1 - Math.exp(-FOLLOW * dt));
    }

    if (phase === "explore") {
      view.intro = 1;
    } else {
      view.intro = reduceMotion.current
        ? view.introTarget
        : MathUtils.damp(view.intro, view.introTarget, INTRO_FOLLOW, dt);
      // ไปถึงมุมเกมแล้ว ล็อกเข้าโหมดสำรวจ (ย้อนกลับไม่ได้)
      if (phase === "intro" && view.introTarget >= 1 && view.intro > 0.995) {
        view.intro = 1;
        setPhase("explore");
      }
    }

    const portrait = size.width < size.height;
    v.game.copy(CAMERA_OFFSET).multiplyScalar(portrait ? PORTRAIT_ZOOM : 1).add(view.focus);
    const p = easeInOut(view.intro);
    if (p >= 1) {
      camera.position.copy(v.game);
      camera.lookAt(view.focus);
    } else {
      // จอแนวตั้งแคบ ถอยกล้องให้เห็นทั้งตัวแมวและฟ้าพอวางชื่อสาขา
      v.intro.copy(INTRO_OFFSET).multiplyScalar(portrait ? 1.55 : 1).add(cat.position);
      v.introLook.copy(INTRO_LOOK).add(cat.position);
      camera.position.lerpVectors(v.intro, v.game, p);
      v.look.lerpVectors(v.introLook, view.focus, p);
      camera.lookAt(v.look);
    }

    // หมอกหนากว่าในมุม intro ให้ทุ่งไกล ๆ จางหายเข้าฟ้าเช้า แล้วค่อยใสขึ้นเมื่อกล้องลอยขึ้น
    if (scene.fog instanceof Fog) {
      scene.fog.near = MathUtils.lerp(FOG_INTRO[0], FOG_EXPLORE[0], p);
      scene.fog.far = MathUtils.lerp(FOG_INTRO[1], FOG_EXPLORE[1], p);
    }
  });

  return null;
}
