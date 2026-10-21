"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { Color, PlaneGeometry, ShaderMaterial, UniformsLib, UniformsUtils, Vector3, type Texture } from "three";
import { MASK_HALF } from "@/lib/path";
import { input, walkArea } from "@/lib/runtime";
import { useGame } from "@/lib/store";
import { heightAt, TERRAIN_GLSL } from "@/lib/terrain";
import { PALETTE, SUN_POSITION } from "@/lib/world";
import { NOISE_GLSL } from "./noise.glsl";

// พื้นใหญ่กว่าแมพมากให้หายเข้าหมอกเอง ไม่เห็นขอบ
const GROUND_SIZE = 220;
// ~1 ม. ต่อช่อง ละเอียดพอสำหรับเนินที่กว้างหลายสิบเมตร (≈48k vertex)
const GROUND_SEGMENTS = 220;

const vertexShader = /* glsl */ `
  varying vec2 vXZ;
  varying vec3 vNormal;
  #include <fog_pars_vertex>
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vXZ = world.xz;
    vNormal = normal;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

// ลายพื้นใต้ทุ่ง: หย่อมมอส/เงาขนาดกลาง + จุดเล็ก ๆ ให้ดูเป็นหญ้าสั้นและใบไม้ทับถม
// + ดินโผล่ประปราย ทำให้ช่องระหว่างใบหญ้าไม่เป็นสีเรียบ
const fragmentShader = /* glsl */ `
  uniform vec3 uShadow;
  uniform vec3 uMoss;
  uniform vec3 uBright;
  uniform vec3 uSoil;
  uniform vec3 uTrail;
  uniform vec3 uTrailDark;
  uniform sampler2D uMask;
  uniform float uMaskHalf;
  uniform vec3 uSunDir;
  varying vec2 vXZ;
  varying vec3 vNormal;
  #include <fog_pars_fragment>
  ${NOISE_GLSL}
  ${TERRAIN_GLSL}

  void main() {
    float large = vnoise(vXZ * 0.12);
    float mid = vnoise(vXZ * 0.9 + 7.3);
    float fine = vnoise(vXZ * 6.0 - 3.1);
    float speck = vnoise(vXZ * 18.0 + 1.7);

    vec3 col = mix(uShadow, uMoss, smoothstep(0.25, 0.75, mid * 0.65 + large * 0.35));
    col = mix(col, uBright, smoothstep(0.55, 0.9, large) * 0.55);
    col = mix(col, uSoil, smoothstep(0.72, 0.9, mid * 0.6 + fine * 0.4) * 0.6);
    // จุดอ่อน/เข้มละเอียด ให้ผิวพื้นมีเนื้อแทนสีทาเรียบ
    col *= 0.86 + 0.2 * fine + 0.12 * (speck - 0.5);

    // ทางเดินดินอัดแน่น ขอบกลืนเข้าหญ้าตาม mask ที่วาดไว้แบบนุ่ม
    float trail = texture2D(uMask, (vXZ + uMaskHalf) / (2.0 * uMaskHalf)).r;
    vec3 dirt = mix(uTrailDark, uTrail, smoothstep(0.2, 0.8, mid * 0.5 + fine * 0.5)) * (0.92 + 0.16 * speck);
    col = mix(col, dirt, smoothstep(0.3, 0.85, trail));
    col *= terrainShade(normalize(vNormal), uSunDir);

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

function createGroundMaterial(mask: Texture) {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    fog: true,
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uShadow: { value: new Color(PALETTE.groundShadow) },
        uMoss: { value: new Color(PALETTE.groundMoss) },
        uBright: { value: new Color(PALETTE.groundBright) },
        uSoil: { value: new Color(PALETTE.groundSoil) },
        uTrail: { value: new Color(PALETTE.trail) },
        uTrailDark: { value: new Color(PALETTE.trailDark) },
        uMask: { value: mask },
        uMaskHalf: { value: MASK_HALF },
        uSunDir: { value: SUN_POSITION.clone().normalize() },
      },
    ]),
  });
}

// ยกความสูงเนินบน CPU (ไม่ใช่ใน shader) เพราะการคลิกพื้นต้อง raycast โดนผิวเนินจริง
function createGroundGeometry() {
  const g = new PlaneGeometry(GROUND_SIZE, GROUND_SIZE, GROUND_SEGMENTS, GROUND_SEGMENTS);
  g.rotateX(-Math.PI / 2);
  const pos = g.getAttribute("position");
  for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

export function Ground({ mask }: { mask: Texture }) {
  const [material] = useState(() => createGroundMaterial(mask));
  const [geometry] = useState(createGroundGeometry);
  useEffect(
    () => () => {
      material.dispose();
      geometry.dispose();
    },
    [material, geometry],
  );

  function handlePointerDown(e: ThreeEvent<PointerEvent>) {
    // คลิกซ้ายหรือแตะเท่านั้น
    if (e.button !== 0 || useGame.getState().phase !== "explore") return;
    e.stopPropagation();
    const p = e.point;
    const target = new Vector3(p.x, 0, p.z);
    // ความสูงของจุดหมายคำนวณใหม่หลังดึงเข้าขอบ (ใช้วางวงแหวนบอกจุด)
    // คลิกนอกเขตเดินได้: ดึงจุดหมายมาไว้ที่ขอบ แมวจะเดินไปหยุดตรงนั้นแทนการดันกำแพงค้าง
    walkArea.bounds?.clamp(target);
    target.y = heightAt(target.x, target.z);
    input.target = target;
    input.targetSetAt = performance.now();
    // ผู้ใช้เลือกทางเอง ยกเลิกโหมดเดินเอง
    useGame.getState().setAutoWalk(false);
  }

  return (
    <mesh geometry={geometry} material={material} onPointerDown={handlePointerDown} />
  );
}
