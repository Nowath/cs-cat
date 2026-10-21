"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CanvasTexture, Matrix4, Quaternion, Vector3, type CatmullRomCurve3, type InstancedMesh } from "three";
import { FOOTPRINT_SPACING } from "@/lib/path";
import { heightAt, normalAt } from "@/lib/terrain";
import { PALETTE } from "@/lib/world";

const PRINT_SIZE = 0.15;

// รอยอุ้งเท้าแมว: ฝ่าเท้าใหญ่หนึ่ง + นิ้วสี่ วาดครั้งเดียวด้วย canvas
function createPawTexture() {
  const s = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = s;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(s * 0.5, s * 0.68, s * 0.2, s * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  const toes = [
    [0.27, 0.42, 0.25],
    [0.42, 0.3, 0.08],
    [0.58, 0.3, -0.08],
    [0.73, 0.42, -0.25],
  ];
  for (const [x, y, rot] of toes) {
    ctx.beginPath();
    ctx.ellipse(s * x, s * y, s * 0.075, s * 0.095, rot, 0, Math.PI * 2);
    ctx.fill();
  }
  return new CanvasTexture(canvas);
}

// รอยเท้าวางตายตัวตามเส้นทาง สลับซ้าย-ขวา เบี้ยวเล็กน้อยทีละรอยให้ดูเป็นการเดินจริง
// ใช้ InstancedMesh ก้อนเดียว ทั้งทางจึงเป็น draw call เดียว
export function Footprints({ curve }: { curve: CatmullRomCurve3 }) {
  const ref = useRef<InstancedMesh>(null);
  const [texture] = useState(createPawTexture);
  const [count] = useState(() => Math.floor(curve.getLength() / FOOTPRINT_SPACING));

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new Matrix4();
    const q = new Quaternion();
    const flat = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);
    const up = new Vector3(0, 1, 0);
    const pos = new Vector3();
    const scale = new Vector3(1, 1, 1);
    const normal = new Vector3();
    const slope = new Quaternion();
    for (let i = 0; i < count; i++) {
      const u = (i + 0.5) / count;
      const p = curve.getPointAt(u);
      const t = curve.getTangentAt(u);
      const side = new Vector3(-t.z, 0, t.x).normalize();
      // ใช้ sin ของ index เป็น jitter ที่คงที่ ไม่ต้องสุ่มใหม่ทุกครั้งที่ render
      const jitter = Math.sin(i * 12.9898) * 0.5;
      pos.copy(p).addScaledVector(side, (i % 2 ? 1 : -1) * 0.065 + jitter * 0.03);
      pos.y = heightAt(pos.x, pos.z) + 0.015;
      // ปลายนิ้ว (ด้านบนของ texture) ชี้ไปทางที่เดิน
      const heading = Math.atan2(t.x, t.z) + Math.PI + jitter * 0.25;
      // เอียงรอยให้แนบผิวเนิน แล้วค่อยหมุนตามทิศเดินและวางราบ
      slope.setFromUnitVectors(up, normalAt(pos.x, pos.z, normal));
      q.setFromAxisAngle(up, heading).premultiply(slope).multiply(flat);
      m.compose(pos, q, scale);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [curve, count]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} raycast={() => null} frustumCulled={false}>
      <planeGeometry args={[PRINT_SIZE * 0.9, PRINT_SIZE]} />
      <meshBasicMaterial
        map={texture}
        color={PALETTE.footprint}
        transparent
        opacity={0.75}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2}
      />
    </instancedMesh>
  );
}
