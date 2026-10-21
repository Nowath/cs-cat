"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh, MeshBasicMaterial } from "three";
import { input } from "@/lib/runtime";

const DURATION = 0.7;

// วงแหวนจาง ๆ ตรงจุดที่คลิก บอกผู้ใช้ว่าแมวรับคำสั่งแล้ว
export function TargetMarker() {
  const ref = useRef<Mesh>(null);

  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = (performance.now() - input.targetSetAt) / 1000 / DURATION;
    if (!input.target || t > 1) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    mesh.position.set(input.target.x, input.target.y + 0.05, input.target.z);
    mesh.scale.setScalar(1.2 - 0.6 * t);
    (mesh.material as MeshBasicMaterial).opacity = 0.85 * (1 - t);
  });

  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} visible={false} raycast={() => null}>
      <ringGeometry args={[0.28, 0.36, 32]} />
      <meshBasicMaterial color="#ffffff" transparent depthWrite={false} />
    </mesh>
  );
}
