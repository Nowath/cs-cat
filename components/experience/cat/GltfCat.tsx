"use client";

import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, Mesh, MeshStandardMaterial, type AnimationAction, type Group } from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { CatModelConfig } from "@/lib/cat-model";
import { cat, type CatAction } from "@/lib/runtime";

type GltfConfig = Extract<CatModelConfig, { kind: "gltf" }>;

const FADE = 0.3;

// โหลดโมเดลแมวจากไฟล์ .glb แล้วสลับ animation ตาม cat.action แบบ crossfade
// ค่าทุกอย่างมาจาก lib/cat-model.ts ไฟล์นี้ไม่ต้องแก้เวลาเปลี่ยนโมเดล
export function GltfCat({ config }: { config: GltfConfig }) {
  const root = useRef<Group>(null);
  const { scene, animations } = useGLTF(config.url);

  // clone ผ่าน SkeletonUtils ไม่งั้นโมเดลที่มีกระดูกจะผูก skeleton ผิดตัว
  const model = useMemo(() => {
    const m = clone(scene);
    if (config.tint) {
      const tint = new Color(config.tint);
      m.traverse((o) => {
        if (o instanceof Mesh) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          o.material = mats.map((mat) => {
            const next = mat.clone();
            if (next instanceof MeshStandardMaterial) next.map = null;
            if ("color" in next && next.color instanceof Color) next.color.copy(tint);
            return next;
          });
          if (o.material.length === 1) o.material = o.material[0];
        }
      });
    }
    return m;
  }, [scene, config.tint]);

  const { actions, names } = useAnimations(animations, root);
  // เก็บ actions ใน ref เพราะต้องสั่ง play/fade/timeScale ทุกเฟรม ซึ่งเป็นการแก้ค่าที่ hook คืนมา
  const actionsRef = useRef(actions);
  const current = useRef<AnimationAction | null>(null);

  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  useEffect(() => {
    // ช่วยหาชื่อ clip ตอนตั้งค่า lib/cat-model.ts ครั้งแรก
    console.info("[cat-model] clips ในไฟล์:", names.join(", "));
  }, [names]);

  useFrame(() => {
    const name = clipFor(cat.action, config.clips);
    const next = actionsRef.current[name] ?? null;
    if (next && next !== current.current) {
      next.reset().fadeIn(FADE).play();
      current.current?.fadeOut(FADE);
      current.current = next;
    }
    // walk เร่ง/ชะลอตามความเร็วจริง เท้าจะไม่ไถลตอนเริ่มเดินหรือชะลอหยุด
    if (next && name === config.clips.walk && config.walkClipSpeed) {
      next.setEffectiveTimeScale(Math.max(0.3, cat.speed / config.walkClipSpeed));
    }
  });

  return (
    <group ref={root} rotation-y={config.rotationY ?? 0} position-y={config.offsetY ?? 0} scale={config.scale}>
      <primitive object={model} />
    </group>
  );
}

function clipFor(action: CatAction, clips: GltfConfig["clips"]) {
  return clips[action] ?? clips.idle;
}
