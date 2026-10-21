import { useFrame } from "@react-three/fiber";
import { useRef, type RefObject } from "react";
import { MathUtils, type Object3D } from "three";
import { cat } from "@/lib/runtime";
import { CAT_SCALE, WALK_SPEED } from "@/lib/world";

/*
 * ท่าทางแมวแบบ procedural ใช้ร่วมกันทั้งแมว placeholder และโมเดล .glb ที่มีกระดูก
 * ตัว animator คิดมุมในกรอบของเกม (แมวหันหน้า +z, x = ด้านข้าง, y = ขึ้น)
 * แต่ละโมเดลแค่ห่อกระดูกเป็น Joint ที่แปลงมุมเหล่านี้เป็นการหมุนของกระดูกตัวเอง
 *   x บวก = ก้ม/เหวี่ยงไปข้างหลัง (ขา: เท้าไปข้างหลัง · หัว: ก้มลง · หาง: ยกขึ้น)
 *   y บวก = หันซ้ายของแมว · z = เอียง
 */

export interface Joint {
  set(x: number, y?: number, z?: number): void;
}

export interface AnimLeg {
  hip: Joint;
  knee: Joint;
  paw: Joint;
  front: boolean;
  // จังหวะก้าวของขานี้ (rad) แบบ lateral sequence: หลังซ้าย → หน้าซ้าย → หลังขวา → หน้าขวา
  phase: number;
  // มุมงอตอนยืนพักที่ต้องบวกเพิ่ม (โมเดลที่ท่าพักงออยู่แล้วใส่ 0)
  a1: number;
  a2: number;
}

export interface AnimRig {
  // จุดหมุนลำตัว (หน่วยก่อนคูณ CAT_SCALE): เด้งตอนเดิน โยกซ้ายขวา เชิดขึ้นตอนนั่ง
  body: Object3D;
  bodyRestY: number;
  chest: Joint;
  neck: Joint;
  head: Joint;
  tail: Joint[];
  legs: AnimLeg[];
  // ความยาวขา (สะโพกถึงพื้น) ใช้คำนวณรอบก้าวให้พอดีความเร็ว เท้าจะไม่ไถลบนพื้น
  legLength: number;
  // ท่าพักของหางแต่ละข้อ (ก่อนใส่การแกว่ง) ตามความเร็วเดิน 0..1 และท่านั่ง 0..1
  tailPose: (i: number, k: number, walk: number, sit: number) => [x: number, y: number];
  // ก้มคอเพิ่มตอนยืน (โมเดลที่คอตั้งสูงเกินไป)
  neckPitch?: number;
  // ท่าเลียอุ้งเท้า: ยกขาหน้า (hip/knee/paw) และก้มคอ/หัวมาหาอุ้งเท้า (rad) — สัดส่วนแต่ละโมเดลต่างกัน
  lick?: LickPose;
  eyes: Object3D[];
  ears: Joint[];
}

export interface LickPose {
  hip: number;
  knee: number;
  paw: number;
  neck: number;
  head: number;
  // ขาหน้าเบนเข้ากลางลำตัว (rad) ให้อุ้งเท้ามาอยู่ใต้ปาก
  inward: number;
}

const DEFAULT_LICK: LickPose = { hip: 1.5, knee: 1.9, paw: 0, neck: 0.35, head: 0.5, inward: 0 };

// มุมเหวี่ยงขาจากสะโพก (rad)
const STRIDE_ANGLE = 0.5;
// ท่านั่ง: ลำตัวเชิดหน้าขึ้น (rad) และสะโพกลดลงใกล้พื้น (สัดส่วนของความยาวขา)
const SIT_PITCH = 0.55;
const SIT_DROP = 0.45;

export function useCatAnimation(rigRef: RefObject<AnimRig | null>) {
  const state = useRef({
    phase: 0,
    walk: 0,
    look: 0,
    sit: 0,
    lick: 0,
    gaze: 0,
    tailPhase: 0,
    tailWalk: 0,
    tailX: [] as number[],
    tailY: [] as number[],
    nextBlink: 2,
    blinkAt: -1,
    nextTwitch: 3,
    twitchAt: -1,
    twitchEar: 0,
  });

  useFrame(({ clock }, rawDt) => {
    const r = rigRef.current;
    if (!r) return;
    const dt = Math.min(rawDt, 0.05);
    const s = state.current;
    const t = clock.elapsedTime;
    // เท้าข้างหนึ่งเหยียบครึ่งรอบ: ระยะที่ตัวเลื่อนในครึ่งรอบ = ระยะที่เท้าถอยหลังได้
    const stanceTravel = 2 * r.legLength * Math.sin(STRIDE_ANGLE) * CAT_SCALE;
    s.walk = MathUtils.damp(s.walk, Math.min(cat.speed / WALK_SPEED, 1), 6, dt);
    s.phase += (dt * cat.speed * Math.PI) / stanceTravel;
    const idle = 1 - s.walk;
    // นั่ง/เลียอุ้งเท้า: ผสมท่าแบบหน่วง ลุกขึ้นเร็วกว่านั่งลง (พอเริ่มเดินต้องลุกทันใจ)
    const sitting = cat.action === "sit" || cat.action === "lick";
    s.sit = MathUtils.damp(s.sit, sitting ? 1 : 0, sitting ? 2.5 : 7, dt);
    s.lick = MathUtils.damp(s.lick, cat.action === "lick" ? 1 : 0, 4, dt);
    const sit = s.sit;
    const lick = s.lick * sit;
    const lickLeg = r.legs.findIndex((l) => l.front);
    const pose = r.lick ?? DEFAULT_LICK;

    r.legs.forEach((leg, i) => {
      const p = s.phase + leg.phase;
      // มุมบวก = เท้าไปข้างหลัง (ช่วงเหยียบ) · ช่วงที่มุมลดลงคือยกเท้าก้าวไปข้างหน้า
      const swing = Math.sin(p) * STRIDE_ANGLE * s.walk;
      const lift = Math.pow(Math.max(0, -Math.cos(p)), 1.5) * s.walk;
      let hip = leg.a1 + swing - (leg.front ? 0.15 : 0.3) * lift;
      // งอข้อตอนยกเท้า ขาที่งอสั้นลงเองจึงพ้นพื้นโดยไม่ต้องยกทั้งขา
      let knee = leg.a2 + (leg.front ? 1.1 : 0.8) * lift;
      // ท่านั่ง: ลำตัวเชิดหน้าขึ้น ขาหน้าชดเชยให้ตั้งตรง ขาหลังพับต้นขาไปข้างหน้าแล้วพับข้อเท้าวางราบกับพื้น
      if (leg.front) {
        hip += SIT_PITCH * sit;
        // เลียอุ้งเท้า: ยกขาหน้าข้างหนึ่งขึ้นมาหน้าปาก
        if (i === lickLeg) {
          hip -= pose.hip * lick;
          knee += pose.knee * lick;
        }
      } else {
        hip -= 1.2 * sit;
        knee += 1.55 * sit;
      }
      const licking = i === lickLeg ? lick : 0;
      // เบนเข้ากลางตัว: ขาข้างซ้ายของแมว (ข้อแรก) หมุนรอบแกนหน้า-หลังไปทาง −x
      leg.hip.set(hip, 0, -pose.inward * licking);
      leg.knee.set(knee);
      // อุ้งเท้าหักกลับให้เกือบขนานพื้นตลอด · ตอนเลียพับอุ้งเท้าหันฝ่าเท้าเข้าหาปาก
      leg.paw.set(-(hip - leg.a1 + knee - leg.a2) * 0.8 * (1 - licking) + pose.paw * licking);
    });

    r.body.position.y =
      r.bodyRestY + Math.sin(s.phase * 2) * 0.008 * s.walk - SIT_DROP * r.legLength * sit;
    r.body.rotation.z = Math.sin(s.phase) * 0.025 * s.walk;
    r.body.rotation.x = -SIT_PITCH * sit;
    // หายใจ: อกยกขึ้นลงเบา ๆ ตอนยืนนิ่ง
    r.chest.set(Math.sin(t * 2.2) * 0.02 * idle);

    // ท่า look (ฉาก intro): เลิกมองไปรอบ ๆ หันหน้าตรงเงยขึ้นสบตากล้อง
    s.look = MathUtils.damp(s.look, cat.action === "look" ? 1 : 0, 4, dt);
    // เดินผ่านสถานี: หันไปมองป้าย (มุมเทียบกับทิศที่ตัวหัน จำกัดไม่ให้หันเกินคอ)
    let gazeTarget = 0;
    if (cat.lookAt && cat.action !== "look") {
      const want = Math.atan2(cat.lookAt.x - cat.position.x, cat.lookAt.z - cat.position.z) - cat.heading;
      gazeTarget = MathUtils.clamp(Math.atan2(Math.sin(want), Math.cos(want)), -1.1, 1.1);
    }
    s.gaze = MathUtils.damp(s.gaze, gazeTarget, 4, dt);
    const gazing = Math.min(1, Math.abs(s.gaze) * 3);
    // ยืนนิ่งแล้วมองไปรอบ ๆ ช้า ๆ (คอหมุนส่วนหนึ่ง หัวหมุนที่เหลือ ให้โค้งต่อเนื่อง)
    const calm = idle * (1 - s.look) * (1 - gazing) * (1 - lick);
    const around = (Math.sin(t * 0.45) * 0.35 + Math.sin(t * 1.3) * 0.08) * calm;
    // เลีย: ก้มคอลงหาอุ้งเท้าด้วย (โมเดลคอยาวก้มแค่หัวไม่ถึง)
    r.neck.set((r.neckPitch ?? 0) * (1 - sit) + pose.neck * lick, around * 0.4 + s.gaze * 0.45);
    // หัวนิ่งกว่าตัวตอนเดิน (แมวจริงทรงหัวให้นิ่ง) จึงชดเชยการโยกของลำตัว
    // นั่ง: ชดเชยลำตัวที่เชิดขึ้นให้หน้ามองตรง · เลีย: ก้มหาอุ้งเท้าแล้วขยับเลียเป็นจังหวะ
    r.head.set(
      Math.sin(t * 0.6) * 0.06 * calm -
        Math.sin(s.phase * 2) * 0.02 * s.walk -
        0.14 * s.look +
        SIT_PITCH * 0.6 * sit +
        (pose.head + Math.sin(t * 11) * 0.07) * lick,
      around * 0.6 + s.gaze * 0.55,
      0.25 * lick,
    );

    // กะพริบตาเป็นระยะแบบสุ่ม
    if (t > s.nextBlink) {
      s.blinkAt = t;
      s.nextBlink = t + 2.5 + Math.random() * 3;
    }
    // ระหว่างเลียหรี่ตาครึ่งหนึ่ง
    const blink = Math.min(t - s.blinkAt < 0.13 ? 0.12 : 1, 1 - 0.55 * lick);
    r.eyes.forEach((e) => (e.scale.y = blink));

    // กระดิกหูข้างเดียวบางครั้ง
    if (t > s.nextTwitch) {
      s.twitchAt = t;
      s.twitchEar = Math.random() < 0.5 ? 0 : 1;
      s.nextTwitch = t + 3 + Math.random() * 4;
    }
    r.ears.forEach((ear, i) => {
      const k = t - s.twitchAt;
      ear.set(0, i === s.twitchEar && k < 0.25 ? Math.sin((k / 0.25) * Math.PI) * 0.6 * (i ? 1 : -1) : 0);
    });

    // หาง: สะสมเฟสเองแทน sin(t·freq) เพราะความถี่เปลี่ยนตามความเร็ว ถ้าคูณตรง ๆ มุมจะกระโดด
    // ท่าหางเปลี่ยนช้ากว่าขา แล้วแต่ละข้อไล่ตามข้อก่อนหน้าแบบหน่วง ได้การสะบัดตามแบบนุ่ม ๆ
    s.tailWalk = MathUtils.damp(s.tailWalk, Math.min(cat.speed / WALK_SPEED, 1), 2.2, dt);
    s.tailPhase += dt * MathUtils.lerp(1.1, 2, s.tailWalk);
    const n = r.tail.length;
    r.tail.forEach((seg, i) => {
      const k = n > 1 ? i / (n - 1) : 0;
      const [poseX, poseY] = r.tailPose(i, k, s.tailWalk, sit);
      const targetX = poseX + Math.sin(s.tailPhase * 0.7 - i * 0.5) * 0.025;
      const targetY = poseY + Math.sin(s.tailPhase - i * 0.55) * (0.04 + k * 0.12) * (1 - sit * 0.6);
      const follow = 9 - k * 5.5;
      s.tailX[i] = MathUtils.damp(s.tailX[i] ?? targetX, targetX, follow, dt);
      s.tailY[i] = MathUtils.damp(s.tailY[i] ?? targetY, targetY, follow, dt);
      seg.set(s.tailX[i], s.tailY[i]);
    });
  });
}
