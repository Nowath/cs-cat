"use client";

import { useFrame } from "@react-three/fiber";
import { useState } from "react";
import { Vector3 } from "three";
import { SIGN_OFFSET_Z } from "@/lib/stations";
import { heightAt } from "@/lib/terrain";
import { LABEL_ANCHOR, labelEls } from "./labels";

interface LabelProjectorProps {
  ids: string[];
  positions: Vector3[];
}

// แปลงตำแหน่งป้ายใน 3D เป็นพิกัดจอ แล้วขยับ DOM ด้วย transform (ไม่แตะ layout)
export function LabelProjector({ ids, positions }: LabelProjectorProps) {
  const [v] = useState(() => new Vector3());

  useFrame(({ camera, size }) => {
    ids.forEach((id, i) => {
      const el = labelEls.get(id);
      if (!el) return;
      // ยึดเหนือป้ายไม้ ซึ่งตั้งบนพื้นเนินตรงตำแหน่งป้าย (ไม่ใช่ความสูงกลางลาน)
      const p = positions[i];
      const signZ = p.z + SIGN_OFFSET_Z;
      v.set(p.x, heightAt(p.x, signZ), signZ).add(LABEL_ANCHOR).project(camera);
      // นอกกรอบกล้องหรืออยู่หลังกล้อง ซ่อนไว้ ไม่ให้ป้ายค้างขอบจอ
      const visible = v.z < 1 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2;
      el.style.visibility = visible ? "visible" : "hidden";
      if (!visible) return;
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
    });
  });

  return null;
}
