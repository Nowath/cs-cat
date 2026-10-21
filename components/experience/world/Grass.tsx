"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector2,
  Vector3,
  type Mesh,
  type Texture,
} from "three";
import { MASK_HALF } from "@/lib/path";
import { QUALITY } from "@/lib/quality";
import { cat, view } from "@/lib/runtime";
import { useGame } from "@/lib/store";
import { TERRAIN_GLSL } from "@/lib/terrain";
import { PALETTE, SUN_POSITION } from "@/lib/world";
import { NOISE_GLSL } from "./noise.glsl";

// หญ้าไม่ได้ปูทั้งแมพ แต่เป็น patch ขนาดคงที่ที่ "วน" ตามกล้องใน shader (mod)
// ได้ความหนาแน่นสูงเฉพาะส่วนที่มองเห็น โดยไม่ต้องสร้าง instance ใหม่ตอนแมวเดิน
const PATCH_SIZE = 36;
// กล้องมองไปข้างหน้า (−z) มากกว่าข้างหลัง เลื่อน patch ไปทางนั้นให้คลุมขอบบนจอ
const PATCH_SHIFT_Z = -5;
const BLADE_SEGMENTS = 4;
// ครึ่งความกว้างที่โคนใบ (เรขาคณิตกว้าง −1..1)
const BLADE_WIDTH = 0.023;
const CLUMP_COUNT = 3600;
const CLUMP_RADIUS = 0.42;
// ใบส่วนนี้โรยกระจายนอกกอ อุดช่องว่างระหว่างกอ
const SCATTER_RATIO = 0.4;

// ค่าที่ไม่ขึ้นกับเวลา (กอ, ทิศเอน, ขนาด, สี) คำนวณบน CPU ครั้งเดียวเก็บเป็น attribute
// shader ทำแค่ลม การงอ และแสง เพราะทุกอย่างในนี้ถูกรันซ้ำทุก vertex ทุกเฟรม
const vertexShader = /* glsl */ `
  attribute vec4 aBlade; // offset.xy, lean.xy
  attribute vec4 aShape; // height, width scale, side.xy
  attribute vec4 aTint;  // clumpRand, field, dry, rand
  uniform float uTime;
  uniform vec2 uCenter;
  uniform float uSize;
  uniform float uWidth;
  uniform vec2 uWindDir;
  uniform vec3 uCat;
  uniform sampler2D uMask;
  uniform float uMaskHalf;
  uniform vec3 uBase;
  uniform vec3 uMid;
  uniform vec3 uTip;
  uniform vec3 uDry;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uSkyColor;
  uniform vec3 uGroundColor;
  varying vec3 vColor;
  #include <fog_pars_vertex>

  ${NOISE_GLSL}
  ${TERRAIN_GLSL}

  void main() {
    vec2 rel = mod(aBlade.xy - uCenter + uSize * 0.5, uSize) - uSize * 0.5;
    vec2 base = uCenter + rel;
    // หดใบที่ขอบ patch ให้ไม่เห็นตอนมันวนไปอีกฝั่ง
    float edge = 1.0 - smoothstep(uSize * 0.4, uSize * 0.5, max(abs(rel.x), abs(rel.y)));
    // ทางเดินและลานรอบสถานี: หญ้าเตี้ยลงจนเห็นดินกับรอยเท้า
    float trail = texture2D(uMask, (base + uMaskHalf) / (2.0 * uMaskHalf)).r;
    float height = aShape.x * edge * (1.0 - 0.88 * trail);
    float rand = aTint.w;

    // ลมกระโชกเป็นหย่อมเคลื่อนตามทิศลม + สั่นเล็ก ๆ ต่อใบ
    float gust = vnoise(base * 0.18 - uWindDir * uTime * 1.6);
    float flutter = sin(uTime * (3.0 + rand * 2.0) + rand * 40.0) * 0.06;
    vec2 bendVec = aBlade.zw + uWindDir * (0.08 + gust * 0.95 + flutter);

    // แมวเดินแหวกหญ้า
    vec2 toCat = base - uCat.xz;
    float d = length(toCat);
    float push = 1.0 - smoothstep(0.15, 0.8, d);
    bendVec += toCat / max(d, 1e-3) * push * 1.4;

    // งอเป็นส่วนโค้งวงกลม ความยาวใบคงที่ ใบที่เอนมากจึงเตี้ยลงเองแบบธรรมชาติ
    float bend = length(bendVec);
    float k = min(bend, 1.45);
    vec2 dir = bendVec / max(bend, 1e-4);
    float s = position.y;
    float ks = k * s;
    float sk = sin(ks);
    float ck = cos(ks);
    float fwd = k < 1e-3 ? 0.0 : (1.0 - ck) / k;
    float up = k < 1e-3 ? s : sk / k;
    vec2 side = aShape.zw;
    float w = uWidth * aShape.y * (1.0 - s * s * 0.7) * position.x;

    vec3 world = vec3(
      base.x + dir.x * fwd * height + side.x * w,
      // ใบขึ้นจากผิวเนิน (สูตรเดียวกับ heightAt ใน lib/terrain.ts)
      terrainHeight(base) + up * height,
      base.y + dir.y * fwd * height + side.y * w
    );

    // normal จากแนวโค้ง แล้วบิดออกตามความกว้างให้ใบแบนดูมีความกลม
    vec3 T = vec3(dir.x * sk, ck, dir.y * sk);
    vec3 S = vec3(side.x, 0.0, side.y);
    vec3 n = normalize(cross(S, T) + S * position.x * 0.5);
    vec3 V = normalize(cameraPosition - world);
    // ใบสองหน้า ให้ normal หันเข้าหากล้องเสมอ
    n = dot(n, V) < 0.0 ? -n : n;

    // สี: โคนเข้ม ไล่ไปปลาย, หย่อมอุ่น, ใบแห้งประปราย
    vec3 albedo = mix(uBase, uMid, smoothstep(0.0, 0.5, s));
    albedo = mix(albedo, uTip * mix(0.88, 1.1, aTint.x), smoothstep(0.45, 1.0, s));
    albedo = mix(albedo, albedo * vec3(1.1, 1.05, 0.8), smoothstep(0.45, 0.85, aTint.y) * 0.7);
    albedo = mix(albedo, uDry, aTint.z * smoothstep(0.15, 0.9, s) * 0.75);

    // แสงคำนวณต่อ vertex (ใบแคบมาก ต่อ pixel แทบไม่ต่างแต่แพงกว่าหลายเท่า)
    float ndl = clamp(dot(n, uSunDir) * 0.6 + 0.4, 0.0, 1.0);
    float ao = mix(0.38, 1.0, pow(s, 0.7));
    vec3 ambient = mix(uGroundColor, uSkyColor, n.y * 0.5 + 0.5);
    float back = pow(clamp(dot(V, -uSunDir) * 0.5 + 0.5, 0.0, 1.0), 4.0) * s * s;
    float shade = mix(0.45, 1.0, smoothstep(0.1, 0.7, d));
    // normal ของผิวเนินใต้ใบ (ผลต่างความสูงไปข้างหน้าหนึ่งก้าว) ใช้ไล่แสงตามความชัน
    float h0 = terrainHeight(base);
    vec3 tn = normalize(vec3(h0 - terrainHeight(base + vec2(0.5, 0.0)), 0.5, h0 - terrainHeight(base + vec2(0.0, 0.5))));
    vColor = (albedo * (ambient * 0.85 + uSunColor * ndl * 0.85) * ao * shade
      + albedo * uSunColor * back * 0.7) * terrainShade(tn, uSunDir);

    vec4 mvPosition = viewMatrix * vec4(world, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  #include <fog_pars_fragment>

  void main() {
    gl_FragColor = vec4(vColor, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

// ใบหญ้าหนึ่งใบ: x = −1..1 (ความกว้างคูณใน shader), y = 0..1 ตามความยาวใบ ปลายแหลมจุดเดียว
function createBlade() {
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < BLADE_SEGMENTS; i++) {
    const y = i / BLADE_SEGMENTS;
    pos.push(-1, y, 0, 1, y, 0);
  }
  pos.push(0, 1, 0);
  for (let i = 0; i < BLADE_SEGMENTS - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const last = (BLADE_SEGMENTS - 1) * 2;
  idx.push(last, last + 1, last + 2);
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

// หย่อมสีใหญ่ทั่วทุ่ง ใช้ sin ที่คาบลงตัวกับ PATCH_SIZE เพื่อให้ต่อกันไร้รอยตอน patch วน
function fieldAt(x: number, z: number) {
  const f = (2 * Math.PI) / PATCH_SIZE;
  const v =
    Math.sin(x * f * 3 + Math.sin(z * f * 2) * 1.5) * Math.sin(z * f * 4 + Math.sin(x * f * 3) * 1.5);
  return 0.5 + 0.5 * v;
}

function wrap(v: number) {
  return ((((v + PATCH_SIZE / 2) % PATCH_SIZE) + PATCH_SIZE) % PATCH_SIZE) - PATCH_SIZE / 2;
}

// จองตามระดับสูงสุดครั้งเดียว ตอนลดคุณภาพแค่ลด instanceCount ไม่ต้องสร้างใหม่
// ลำดับ instance สุ่มอยู่แล้ว ตัดท้ายออกจึงบางลงเท่า ๆ กันทั้งทุ่ง
function createGrass(mask: Texture) {
  const max = QUALITY.high.grass;
  const blade = createBlade();
  const geometry = new InstancedBufferGeometry();
  geometry.index = blade.index;
  geometry.setAttribute("position", blade.getAttribute("position"));

  const clumps = Array.from({ length: CLUMP_COUNT }, () => ({
    x: (Math.random() - 0.5) * PATCH_SIZE,
    z: (Math.random() - 0.5) * PATCH_SIZE,
    rand: Math.random(),
  }));

  const bladeData = new Float32Array(max * 4);
  const shape = new Float32Array(max * 4);
  const tint = new Float32Array(max * 4);
  for (let i = 0; i < max; i++) {
    const rand = Math.random();
    let x: number, z: number, leanX: number, leanZ: number, clumpRand: number;
    if (Math.random() < SCATTER_RATIO) {
      x = (Math.random() - 0.5) * PATCH_SIZE;
      z = (Math.random() - 0.5) * PATCH_SIZE;
      const a = Math.random() * Math.PI * 2;
      leanX = Math.cos(a);
      leanZ = Math.sin(a);
      clumpRand = Math.random();
    } else {
      const c = clumps[(Math.random() * CLUMP_COUNT) | 0];
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * CLUMP_RADIUS;
      leanX = Math.cos(a);
      leanZ = Math.sin(a);
      x = wrap(c.x + leanX * r);
      z = wrap(c.z + leanZ * r);
      clumpRand = c.rand;
    }
    const field = fieldAt(x, z);
    const lean = 0.2 + 0.35 * Math.random();
    // ใบหันข้างตั้งฉากกับทิศที่เอน (ใบหญ้าจริงงอไปทางหน้าใบ ไม่ใช่ทางสัน)
    const face = Math.atan2(leanZ, leanX) + Math.PI / 2 + (Math.random() - 0.5) * 1.2;

    bladeData.set([x, z, leanX * lean, leanZ * lean], i * 4);
    shape.set(
      [
        (0.26 + 0.3 * rand) * (0.75 + 0.5 * clumpRand) * (0.8 + 0.35 * field),
        0.7 + 0.5 * Math.random(),
        Math.cos(face),
        Math.sin(face),
      ],
      i * 4,
    );
    tint.set([clumpRand, field, Math.random() < 0.06 ? 1 : 0, rand], i * 4);
  }
  geometry.setAttribute("aBlade", new InstancedBufferAttribute(bladeData, 4));
  geometry.setAttribute("aShape", new InstancedBufferAttribute(shape, 4));
  geometry.setAttribute("aTint", new InstancedBufferAttribute(tint, 4));

  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    side: DoubleSide,
    fog: true,
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uTime: { value: 0 },
        uCenter: { value: new Vector2() },
        uSize: { value: PATCH_SIZE },
        uWidth: { value: BLADE_WIDTH },
        uWindDir: { value: new Vector2(1, 0.35).normalize() },
        uCat: { value: new Vector3() },
        uMask: { value: mask },
        uMaskHalf: { value: MASK_HALF },
        uBase: { value: new Color(PALETTE.grassBase) },
        uMid: { value: new Color(PALETTE.grassMid) },
        uTip: { value: new Color(PALETTE.grassTip) },
        uDry: { value: new Color(PALETTE.grassDry) },
        uSunDir: { value: SUN_POSITION.clone().normalize() },
        uSunColor: { value: new Color(PALETTE.sun) },
        uSkyColor: { value: new Color(PALETTE.skyLight) },
        uGroundColor: { value: new Color(PALETTE.hemiGround) },
      },
    ]),
  });
  return { geometry, material };
}

export function Grass({ mask }: { mask: Texture }) {
  const quality = useGame((s) => s.quality);
  const count = QUALITY[quality].grass;
  const mesh = useRef<Mesh<InstancedBufferGeometry, ShaderMaterial>>(null);
  const [{ geometry, material }] = useState(() => createGrass(mask));

  useEffect(() => {
    if (!mesh.current) return;
    mesh.current.geometry.instanceCount = count;
    // ใบน้อยลงให้ใบกว้างขึ้นชดเชย พื้นจะได้ไม่โผล่เป็นหย่อม
    const widen = Math.min(Math.sqrt(QUALITY.high.grass / count), 1.8);
    mesh.current.material.uniforms.uWidth.value = BLADE_WIDTH * widen;
  }, [count]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const u = mesh.current.material.uniforms;
    u.uTime.value = clock.elapsedTime;
    u.uCenter.value.set(view.focus.x, view.focus.z + PATCH_SHIFT_Z);
    u.uCat.value.copy(cat.position);
  });

  return (
    <mesh
      ref={mesh}
      geometry={geometry}
      material={material}
      frustumCulled={false}
      // ไม่ให้หญ้ารับคลิก ไม่งั้น raycast โดนเรขาคณิตต้นแบบที่ origin แทนพื้น
      raycast={() => null}
    />
  );
}
