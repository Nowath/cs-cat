"use client";

import { useEffect, useRef, useState } from "react";
import { MathUtils, type Object3D } from "three";
import { useCatAnimation, type AnimRig, type Joint } from "./catAnimator";
import { createCatRig, LEGS, type CatRig } from "./catRig";

// กระดูกของแมว procedural สร้างตามกรอบเกมอยู่แล้ว มุมจึงใส่ rotation ตรง ๆ ได้
const euler = (o: Object3D): Joint => ({ set: (x, y = 0, z = 0) => o.rotation.set(x, y, z) });

function toAnimRig(rig: CatRig): AnimRig {
  return {
    body: rig.root,
    bodyRestY: rig.rootRestY,
    chest: euler(rig.chest),
    neck: euler(rig.neck),
    head: euler(rig.head),
    tail: rig.tail.map(euler),
    legs: LEGS.map((leg, i) => ({
      hip: euler(rig.legs[i].hip),
      knee: euler(rig.legs[i].knee),
      paw: euler(rig.legs[i].paw),
      front: leg.front,
      phase: leg.phase,
      a1: leg.a1,
      a2: leg.a2,
    })),
    legLength: 0.29,
    // ยืนนิ่ง: ห้อยต่ำแล้วม้วนปลายขึ้น · เดิน: ตั้งขึ้นปลายงอเป็นตะขอ
    // นั่ง: หางวางราบพื้นแล้วม้วนอ้อมมาข้างตัว
    tailPose: (i, k, walk, sit) => [
      (i === 0 ? MathUtils.lerp(-0.2, 1.2, walk) : 0) +
        MathUtils.lerp(0.15, 0.03 + (k > 0.7 ? 0.3 : 0), walk) -
        sit * (i === 0 ? 0.1 : 0.14),
      sit * (i === 0 ? 0.5 : 0.28),
    ],
    eyes: rig.eyes,
    ears: rig.ears.map(euler),
  };
}

// แมวดำ procedural (SkinnedMesh ชิ้นเดียว ดู catRig.ts) — ใช้ระหว่างโหลดโมเดลจริง
// หรือเมื่อตั้ง lib/cat-model.ts เป็น placeholder
export function PlaceholderCat() {
  const [rig] = useState(createCatRig);
  const animRig = useRef<AnimRig>(null);
  useEffect(() => {
    animRig.current = toAnimRig(rig);
    return () => rig.dispose();
  }, [rig]);
  useCatAnimation(animRig);

  return <primitive object={rig.object} />;
}
