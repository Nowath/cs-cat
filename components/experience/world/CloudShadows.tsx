"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import {
  AddEquation,
  CustomBlending,
  DstColorFactor,
  ShaderMaterial,
  Vector2,
  ZeroFactor,
  type Mesh,
  type PlaneGeometry,
} from "three";
import { view } from "@/lib/runtime";
import { CLOUD_WIND } from "@/lib/world";
import { NOISE_GLSL } from "./noise.glsl";

const SIZE = 90;
// ต้องสูงกว่ายอดเนิน + ป้ายสถานี ทุกอย่างในฉากจึงอยู่ใต้แผ่นเงา
const HEIGHT = 4;
// ความเข้มของเงาเมฆ (0 = ไม่มี) — นุ่ม ๆ พอให้รู้ว่ามีเมฆผ่าน ไม่ให้ฉากมืด
const STRENGTH = 0.28;

// เงาเมฆเคลื่อนผ่านทุ่ง: แผ่นใสลอยเหนือฉาก คูณความสว่างของทุกอย่างที่อยู่ใต้มัน (หญ้า พื้น แมว ป้าย)
// ใช้ blending แบบคูณ จึงวาดรอบเดียวทั้งจอ ไม่ต้องแก้ shader หญ้าที่หนักอยู่แล้ว
const vertexShader = /* glsl */ `
  varying vec2 vXZ;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vXZ = world.xz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uWind;
  uniform vec2 uCenter;
  uniform float uStrength;
  uniform float uRadius;
  varying vec2 vXZ;
  ${NOISE_GLSL}

  void main() {
    // ก้อนเงาใหญ่ราว 20–30 ม. ขอบนุ่ม ลอยตามลม ~0.4 ม./วินาที
    // (เร็วกว่านี้ฉากทั้งจอมืด-สว่างสลับถี่ ดูเหมือนเวลาเช้าเย็นเปลี่ยนเร็ว)
    vec2 p = (vXZ - uWind * uTime * 0.4) * 0.03;
    float shadow = smoothstep(0.46, 0.66, fbm(p, 3));
    // จางออกที่ขอบแผ่น ไม่ให้เห็นขอบเงาตัดกลางหมอก
    float fade = 1.0 - smoothstep(uRadius * 0.6, uRadius, length(vXZ - uCenter));
    gl_FragColor = vec4(vec3(1.0 - uStrength * shadow * fade), 1.0);
  }
`;

function createShadowMaterial() {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: CustomBlending,
    blendEquation: AddEquation,
    blendSrc: DstColorFactor,
    blendDst: ZeroFactor,
    uniforms: {
      uTime: { value: 0 },
      uWind: { value: new Vector2(CLOUD_WIND.x, CLOUD_WIND.y) },
      uCenter: { value: new Vector2() },
      uStrength: { value: STRENGTH },
      uRadius: { value: SIZE / 2 },
    },
  });
}

export function CloudShadows() {
  const ref = useRef<Mesh<PlaneGeometry, ShaderMaterial>>(null);
  const [material] = useState(createShadowMaterial);
  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    // แผ่นตามกล้อง แต่ลายเงาคิดจากพิกัดโลก เงาจึงลอยตามลมเอง ไม่เลื่อนตามแมว
    mesh.position.set(view.focus.x, HEIGHT, view.focus.z - 6);
    const u = mesh.material.uniforms;
    u.uTime.value = clock.elapsedTime;
    u.uCenter.value.set(mesh.position.x, mesh.position.z);
  });

  return (
    // หันหน้าขึ้นฟ้าอย่างเดียว ช่วง intro กล้องอยู่ใต้แผ่นจะมองไม่เห็นมัน (ฟ้าไม่มืดตาม)
    <mesh ref={ref} material={material} rotation-x={-Math.PI / 2} raycast={() => null} renderOrder={20}>
      <planeGeometry args={[SIZE, SIZE]} />
    </mesh>
  );
}
