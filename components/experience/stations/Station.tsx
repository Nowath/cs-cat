"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useMemo } from "react";
import { MeshStandardMaterial, Vector3 } from "three";
import { input } from "@/lib/runtime";
import { SIGN_OFFSET_Z } from "@/lib/stations";
import { useGame } from "@/lib/store";
import { heightAt } from "@/lib/terrain";
import { PALETTE } from "@/lib/world";

interface StationProps {
  index: number;
  position: Vector3;
}

// ป้ายไม้ปักหน้าลานโล่ง + วงหินรอบลาน (ป้ายชื่อเป็น DOM แยกอยู่ใน StationLabels)
export function Station({ index, position }: StationProps) {
  const mats = useMemo(
    () => ({
      wood: new MeshStandardMaterial({ color: PALETTE.signWood, roughness: 0.85 }),
      woodDark: new MeshStandardMaterial({ color: PALETTE.signWoodDark, roughness: 0.9 }),
      board: new MeshStandardMaterial({ color: PALETTE.signBoard, roughness: 0.75 }),
      chula: new MeshStandardMaterial({ color: PALETTE.chula, roughness: 0.6 }),
      stone: new MeshStandardMaterial({ color: PALETTE.stone, roughness: 0.95 }),
    }),
    [],
  );

  // คลิกที่ป้ายจากไกล ๆ = พาแมวเดินไปยืนหน้าป้าย
  function walkHere(e: ThreeEvent<PointerEvent>) {
    if (e.button !== 0 || useGame.getState().phase !== "explore") return;
    e.stopPropagation();
    input.target = position.clone();
    input.targetSetAt = performance.now();
    useGame.getState().setAutoWalk(false);
  }

  // ของในสถานีวางสัมพัทธ์กับจุดกลาง แต่พื้นเนินสูงไม่เท่ากันทุกจุด จึงชดเชยความสูงทีละชิ้น
  const groundY = (dx: number, dz: number) => heightAt(position.x + dx, position.z + dz) - position.y;

  return (
    <group position={position}>
      {/* หินวางเป็นวงรอบลาน บอกขอบเขตสถานีจากมุมสูง */}
      {Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2 + index;
        const r = 1.75 + Math.sin(i * 7.1 + index) * 0.12;
        const sx = Math.cos(a) * r;
        const sz = Math.sin(a) * r;
        return (
          <mesh
            key={i}
            material={mats.stone}
            position={[sx, groundY(sx, sz) + 0.03, sz]}
            rotation-y={a}
            scale={[1, 0.45, 0.8]}
            raycast={() => null}
          >
            <dodecahedronGeometry args={[0.13, 0]} />
          </mesh>
        );
      })}

      <group position={[0, groundY(0, SIGN_OFFSET_Z), SIGN_OFFSET_Z]} onPointerDown={walkHere}>
        {/* เสาอยู่หลังแผ่นป้าย กล้องมองจากด้านหน้าจะไม่เห็นเสาพาดกลางป้าย
            ฝังลงดินลึกหน่อย บนพื้นลาดโคนเสาจะได้ไม่ลอย */}
        <mesh material={mats.woodDark} position={[0, 0.45, -0.08]}>
          <cylinderGeometry args={[0.045, 0.055, 1.3, 8]} />
        </mesh>
        <mesh material={mats.chula} position={[0, 1.02, -0.01]}>
          <boxGeometry args={[0.92, 0.5, 0.05]} />
        </mesh>
        <mesh material={mats.board} position={[0, 1.02, 0.02]}>
          <boxGeometry args={[0.82, 0.4, 0.04]} />
        </mesh>
        <mesh material={mats.wood} position={[0, 1.3, -0.02]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.03, 0.03, 1.0, 6]} />
        </mesh>
      </group>
    </group>
  );
}
