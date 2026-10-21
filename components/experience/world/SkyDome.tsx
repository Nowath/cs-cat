"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { BackSide, Color, ShaderMaterial, Vector2, type Mesh, type SphereGeometry } from "three";
import { CLOUD_WIND, PALETTE, SUN_POSITION } from "@/lib/world";
import { NOISE_GLSL } from "./noise.glsl";

// ฟ้าเช้า: ขอบฟ้าเป็นสีหมอกเดียวกับ fog (พื้นไกล ๆ จึงกลืนเข้าฟ้าไร้รอยต่อ) ไล่ขึ้นเป็นฟ้าใส
// + ดวงอาทิตย์ทิศเดียวกับแสงในฉาก + เมฆก้อนลอยช้า ๆ ด้านรับแดดสว่าง ท้องเมฆเทาอมฟ้า
// เห็นชัดตอนมุม intro ที่กล้องมองระดับสายตาแมว (มุมเกมมองลงพื้น เห็นแค่เงาเมฆ ดู CloudShadows)
const vertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uHorizon;
  uniform vec3 uZenith;
  uniform vec3 uSun;
  uniform vec3 uSunDisc;
  uniform vec3 uSunDir;
  uniform vec3 uCloudLight;
  uniform vec3 uCloudShade;
  uniform vec2 uWind;
  uniform float uTime;
  varying vec3 vDir;
  ${NOISE_GLSL}

  void main() {
    vec3 d = normalize(vDir);
    vec3 col = mix(uHorizon, uZenith, smoothstep(0.0, 0.55, d.y));

    // ดวงอาทิตย์: ดวงกลมขอบนุ่ม + แสงเรืองสองชั้น (ใกล้ดวงเข้ม, ฟุ้งกว้างจาง)
    float s = max(dot(d, uSunDir), 0.0);
    col += uSun * (pow(s, 48.0) * 0.5 + pow(s, 6.0) * 0.12);
    col = mix(col, uSunDisc * 1.08, smoothstep(0.99972, 0.99985, s));

    // เมฆ: ฉายทิศมองลงบนระนาบเมฆเหนือหัว แล้วตัดด้วย fbm ให้เป็นก้อน ๆ
    if (d.y > 0.0) {
      // ลอยช้าเท่า ๆ กับเงาเมฆบนพื้น
      vec2 p = d.xz / (d.y + 0.1) * 1.4 + uWind * uTime * 0.002;
      float n = fbm(p, 5);
      float cover = smoothstep(0.55, 0.68, n);
      // แสงหลอก: เทียบความหนาแน่นกับจุดที่ขยับเข้าหาดวงอาทิตย์ ด้านที่บางกว่า = รับแดด
      float toward = fbm(p + normalize(uSunDir.xz) * 0.12, 3);
      float lit = clamp(0.65 + (n - toward) * 4.0, 0.0, 1.0);
      vec3 cloud = mix(uCloudShade, uCloudLight, lit);
      // เมฆใกล้ดวงอาทิตย์ขอบเรืองอุ่น
      cloud += uSun * pow(s, 12.0) * 0.35 * (1.0 - cover);
      // ใกล้ขอบฟ้าจางเข้าหมอก
      cover *= smoothstep(0.0, 0.07, d.y);
      // ฟ้ารอบดวงอาทิตย์โล่ง เมฆไม่บังดวง
      cover *= 1.0 - smoothstep(0.996, 0.9993, s);
      col = mix(col, cloud, cover * 0.95);
    }

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

function createSkyMaterial() {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    side: BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uHorizon: { value: new Color(PALETTE.fog) },
      uZenith: { value: new Color(PALETTE.skyZenith) },
      uSun: { value: new Color(PALETTE.sunGlow) },
      uSunDisc: { value: new Color(PALETTE.sunDisc) },
      uSunDir: { value: SUN_POSITION.clone().normalize() },
      uCloudLight: { value: new Color(PALETTE.cloudLight) },
      uCloudShade: { value: new Color(PALETTE.cloudShade) },
      uWind: { value: new Vector2(CLOUD_WIND.x, CLOUD_WIND.y) },
      uTime: { value: 0 },
    },
  });
}

export function SkyDome() {
  const ref = useRef<Mesh<SphereGeometry, ShaderMaterial>>(null);
  const [material] = useState(createSkyMaterial);
  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ camera, clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    // ยึดโดมไว้ที่กล้อง ฟ้าจึงอยู่ไกลสุดเสมอไม่ว่าแมวจะเดินไปไหน
    mesh.position.copy(camera.position);
    mesh.material.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    // วาดหลังของทึบทั้งหมด (renderOrder สูง + depth test) pixel ที่พื้น/หญ้าบังอยู่จะถูกข้าม
    // มุมเกมแทบทั้งจอเป็นพื้น shader เมฆจึงแทบไม่ได้ทำงาน
    <mesh ref={ref} material={material} renderOrder={10} raycast={() => null} frustumCulled={false}>
      <sphereGeometry args={[100, 32, 16]} />
    </mesh>
  );
}
