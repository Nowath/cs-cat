"use client";

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import {
  Bone,
  Group,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
  type Object3D,
} from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { RiggedCatConfig } from "@/lib/cat-model";
import { PALETTE } from "@/lib/world";
import { useCatAnimation, type AnimRig, type Joint } from "./catAnimator";
import { LEGS } from "./catRig";

const AXES = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)];

// แปลงมุมในกรอบเกม (x ข้าง, y ขึ้น, z หน้า) เป็นการหมุนของกระดูกที่แกนในไฟล์วางมาทางไหนก็ได้
// หาแกนทั้งสามในพิกัดของกระดูกตอนท่าพักครั้งเดียว แล้วหมุนรอบแกนนั้นซ้อนบนท่าพัก
function boneJoint(bone: Object3D, frame: Object3D): Joint {
  const rest = bone.quaternion.clone();
  const inFrame = frame.getWorldQuaternion(new Quaternion()).invert().multiply(bone.getWorldQuaternion(new Quaternion()));
  const inv = inFrame.invert();
  const [ax, ay, az] = AXES.map((a) => a.clone().applyQuaternion(inv));
  const qx = new Quaternion();
  const qy = new Quaternion();
  const qz = new Quaternion();
  return {
    set(x, y = 0, z = 0) {
      bone.quaternion
        .copy(rest)
        .multiply(qy.setFromAxisAngle(ay, y))
        .multiply(qx.setFromAxisAngle(ax, x))
        .multiply(qz.setFromAxisAngle(az, z));
    },
  };
}

function findBone(root: Object3D, name: string): Bone {
  const found = root.getObjectByName(name);
  if (!(found instanceof Bone)) throw new Error(`[cat-model] ไม่พบกระดูก "${name}" ในไฟล์`);
  return found;
}

function buildRig(scene: Object3D, config: RiggedCatConfig) {
  const model = clone(scene);
  const owned: { dispose(): void }[] = [];
  model.traverse((o) => {
    if (o instanceof Mesh) {
      // ท่าที่ขยับออกนอกกรอบท่าพัก (หางสะบัด ขาเหยียด) ไม่ให้ถูกตัดทิ้ง
      o.frustumCulled = false;
      // ขนแมวด้าน ๆ: ไฟล์ตั้งค่าเงาวาวจนเห็นแสงฟ้าสะท้อนเป็นแผ่นขาวบนหน้าตัดเหลี่ยม
      if (o.material instanceof MeshStandardMaterial) {
        o.material = o.material.clone();
        o.material.roughness = 0.75;
        o.material.metalness = 0;
        owned.push(o.material);
      }
    }
  });

  // body (จุดหมุนที่สะโพก หน่วยเกม) → fit (หมุน/ย่อไฟล์ให้เข้ากรอบเกม) → model
  const s = config.scale;
  const pivot = new Vector3(...config.pivot).multiplyScalar(s).applyAxisAngle(AXES[1], config.rotationY);
  const body = new Group();
  body.position.set(pivot.x, pivot.y + (config.offsetY ?? 0), pivot.z);
  const fit = new Group();
  fit.position.copy(pivot).negate();
  fit.rotation.y = config.rotationY;
  fit.scale.setScalar(s);
  fit.add(model);
  body.add(fit);
  const object = new Group();
  object.add(body);
  object.updateMatrixWorld(true);

  const joint = (name: string) => boneJoint(findBone(model, name), object);
  const head = findBone(model, config.bones.head);

  // ตาเหลืองแมวดำ: ลูกตาแบนเรืองแสงนิด ๆ + ม่านตาเป็นขีดตั้ง ผูกกับกระดูกหัว
  const eyes: Object3D[] = [];
  if (config.eyes) {
    const { position, radius, yaw } = config.eyes;
    const ballGeo = new SphereGeometry(radius * s, 14, 10);
    const slitGeo = new SphereGeometry(radius * s * 0.5, 8, 8);
    const eyeMat = new MeshStandardMaterial({
      color: PALETTE.catEye,
      emissive: PALETTE.catEye,
      emissiveIntensity: 0.35,
      roughness: 0.2,
    });
    const pupilMat = new MeshStandardMaterial({ color: "#0b0b0f", roughness: 0.2 });
    owned.push(ballGeo, slitGeo, eyeMat, pupilMat);
    for (const side of [1, -1]) {
      const at = new Vector3(position[0], position[1], position[2] * side)
        .applyAxisAngle(AXES[1], config.rotationY)
        .multiplyScalar(s)
        .add(new Vector3(0, config.offsetY ?? 0, 0));
      // place: วางตำแหน่ง/ทิศในกรอบเกม แล้ว attach เข้ากระดูกหัวโดยคงตำแหน่งเดิม
      const place = new Group();
      place.position.copy(at);
      place.rotation.y = yaw * -side;
      // blink: ชั้นที่ย่อแกน y ตอนกะพริบ (แกนของชั้นนี้ตรงกับกรอบเกมเสมอ)
      const blink = new Group();
      const ball = new Mesh(ballGeo, eyeMat);
      ball.scale.set(1, 0.8, 0.55);
      const slit = new Mesh(slitGeo, pupilMat);
      slit.scale.set(0.28, 1.5, 0.4);
      slit.position.z = radius * s * 0.45;
      blink.add(ball, slit);
      place.add(blink);
      object.add(place);
      head.attach(place);
      eyes.push(blink);
    }
  }

  const rig: AnimRig = {
    body,
    bodyRestY: body.position.y,
    chest: joint(config.bones.chest),
    neck: joint(config.bones.neck),
    head: boneJoint(head, object),
    tail: config.bones.tail.map(joint),
    legs: config.bones.legs.map(([front, hip, knee, paw], i) => ({
      hip: joint(hip),
      knee: joint(knee),
      paw: joint(paw),
      front,
      phase: LEGS[i].phase,
      a1: 0,
      a2: 0,
    })),
    legLength: pivot.y,
    neckPitch: config.neckPitch,
    lick: config.lick,
    tailPose: (i, k, walk, sit) => {
      const { idle, walk: moving, sit: sitting, curl } = config.tail;
      const j = i === 0 ? 0 : 1;
      const stand = idle[j] + (moving[j] - idle[j]) * walk;
      // ยืนนิ่งปลายหางม้วนขึ้น · นั่งหางวนอ้อมมาข้างตัว
      return [stand * (1 - sit) + sitting[j] * sit + curl * k * (1 - walk) * (1 - sit), sit * (i === 0 ? 0.5 : 0.3)];
    },
    eyes,
    ears: [],
  };
  return { object, rig, dispose: () => owned.forEach((o) => o.dispose()) };
}

// โมเดล .glb ที่มีกระดูก (ตั้งค่าที่ lib/cat-model.ts) ขยับด้วยท่าทาง procedural ชุดเดียวกับ placeholder
export function RiggedCat({ config }: { config: RiggedCatConfig }) {
  const { scene } = useGLTF(config.url);
  const built = useMemo(() => buildRig(scene, config), [scene, config]);
  const rig = useRef<AnimRig>(null);
  useEffect(() => {
    rig.current = built.rig;
    return built.dispose;
  }, [built]);
  useCatAnimation(rig);

  return <primitive object={built.object} />;
}
