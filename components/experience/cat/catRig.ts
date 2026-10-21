import {
  Bone,
  BufferGeometry,
  CatmullRomCurve3,
  ConeGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  Skeleton,
  SkinnedMesh,
  SphereGeometry,
  Uint16BufferAttribute,
  Vector3,
  type Material,
  type Object3D,
} from "three";
import { PALETTE } from "@/lib/world";

/*
 * แมวดำแบบ procedural เป็น SkinnedMesh ชิ้นเดียว: ลำตัว-คอ-หัว, หาง และขาทั้งสี่
 * ขึ้นรูปด้วยการ "กวาด" หน้าตัดวงรีไปตามแนวแกน แล้วผูกน้ำหนักกับกระดูกแบบไล่ระดับ
 * ผิวจึงต่อกันเนียนและงอเป็นโค้ง ไม่เป็นก้อนแยกกันเหมือนประกอบจาก primitive
 *
 * พิกัด: หน้าแมวชี้ +z, พื้นอยู่ที่ y = 0, ตัวยาวราว 0.75 (ก่อนคูณ CAT_SCALE)
 */

export const TAIL_SEGMENTS = 9;
export const TAIL_LEN = 0.055;

// ขาสองท่อน: สะโพก/ไหล่ → เข่า/ข้อเท้า → อุ้งเท้า · ขาหลังพับเป็นข้อเท้าแบบแมวจริง
// จังหวะก้าวแบบ lateral sequence: หลังซ้าย → หน้าซ้าย → หลังขวา → หน้าขวา
export const LEGS = [
  { x: 0.06, y: 0.31, z: 0.15, phase: Math.PI * 0.5, front: true, l1: 0.14, l2: 0.145, a1: 0, a2: 0 },
  { x: -0.06, y: 0.31, z: 0.15, phase: Math.PI * 1.5, front: true, l1: 0.14, l2: 0.145, a1: 0, a2: 0 },
  { x: 0.072, y: 0.29, z: -0.19, phase: 0, front: false, l1: 0.13, l2: 0.148, a1: -0.35, a2: 0.6 },
  { x: -0.072, y: 0.29, z: -0.19, phase: Math.PI, front: false, l1: 0.13, l2: 0.148, a1: -0.35, a2: 0.6 },
] as const;

const RING = 18;
const EPS = 0.002;

// ลำตัวต่อเนื่องตั้งแต่ก้นถึงปลายจมูก: [z, y, ครึ่งกว้าง, ครึ่งสูง]
const TORSO: [number, number, number, number][] = [
  [-0.335, 0.378, EPS, EPS],
  [-0.322, 0.378, 0.07, 0.075],
  [-0.28, 0.378, 0.11, 0.115],
  [-0.19, 0.37, 0.12, 0.125],
  [-0.08, 0.362, 0.1, 0.106],
  [0.04, 0.366, 0.11, 0.126],
  [0.13, 0.382, 0.108, 0.128],
  [0.195, 0.415, 0.092, 0.102],
  [0.235, 0.458, 0.078, 0.083],
  [0.265, 0.5, 0.08, 0.084],
  [0.295, 0.538, 0.1, 0.094],
  [0.33, 0.548, 0.118, 0.1],
  [0.37, 0.54, 0.11, 0.09],
  [0.395, 0.532, 0.088, 0.07],
  [0.41, 0.518, 0.05, 0.04],
  [0.418, 0.516, EPS, EPS],
];

type Influence = [bone: number, weight: number][];
interface Ring {
  c: Vector3;
  t: Vector3;
  rx: number;
  ry: number;
  belly?: number;
  inf: Influence;
}

class SweepBuilder {
  pos: number[] = [];
  idx: number[] = [];
  skinIndex: number[] = [];
  skinWeight: number[] = [];

  // กวาดวงรีไปตามวงแหวนที่ให้มา วางสามเหลี่ยมให้ normal ชี้ออกนอกผิว
  add(rings: Ring[]) {
    const base = this.pos.length / 3;
    const xAxis = new Vector3(1, 0, 0);
    const up = new Vector3();
    const side = new Vector3();
    for (const r of rings) {
      up.crossVectors(r.t, xAxis).normalize();
      side.crossVectors(up, r.t).normalize();
      for (let j = 0; j < RING; j++) {
        const a = (j / RING) * Math.PI * 2;
        const cx = Math.cos(a) * r.rx;
        // ครึ่งล่างลึกกว่าครึ่งบน (r.belly) ให้ท้อง/อกป่องลงแบบแมว หลังแบนกว่า
        const sy = Math.sin(a) * r.ry * (Math.sin(a) < 0 ? r.belly ?? 1 : 1);
        this.pos.push(
          r.c.x + side.x * cx + up.x * sy,
          r.c.y + side.y * cx + up.y * sy,
          r.c.z + side.z * cx + up.z * sy,
        );
        for (let k = 0; k < 4; k++) {
          this.skinIndex.push(r.inf[k]?.[0] ?? 0);
          this.skinWeight.push(r.inf[k]?.[1] ?? 0);
        }
      }
    }
    for (let i = 0; i < rings.length - 1; i++) {
      for (let j = 0; j < RING; j++) {
        const a = base + i * RING + j;
        const b = base + i * RING + ((j + 1) % RING);
        const c = a + RING;
        const d = b + RING;
        this.idx.push(a, b, c, b, d, c);
      }
    }
  }

  build() {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(this.pos, 3));
    g.setAttribute("skinIndex", new Uint16BufferAttribute(this.skinIndex, 4));
    g.setAttribute("skinWeight", new Float32BufferAttribute(this.skinWeight, 4));
    g.setIndex(this.idx);
    g.computeVertexNormals();
    return g;
  }
}

// น้ำหนักไล่จาก bone a ไป b ในช่วง [from, to] แบบ smoothstep ไม่ให้ผิวหักตรงข้อต่อ
function blend(v: number, from: number, to: number, a: number, b: number): Influence {
  const t = Math.min(1, Math.max(0, (v - from) / (to - from)));
  const w = t * t * (3 - 2 * t);
  if (w <= 0) return [[a, 1]];
  if (w >= 1) return [[b, 1]];
  return [
    [a, 1 - w],
    [b, w],
  ];
}

function lerpProfile<T extends number[]>(keys: T[], at: number, axis = 0): T {
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1][axis] < at) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const t = Math.min(1, Math.max(0, (at - a[axis]) / (b[axis] - a[axis])));
  // ใช้ cosine ease ระหว่างคีย์ให้เส้นโค้งของรูปร่างนุ่ม ไม่เป็นเหลี่ยมตามจุดคีย์
  const e = (1 - Math.cos(t * Math.PI)) / 2;
  return a.map((v, k) => v + (b[k] - v) * e) as T;
}

export interface CatRig {
  object: Object3D;
  root: Bone;
  rootRestY: number;
  chest: Bone;
  neck: Bone;
  head: Bone;
  tail: Bone[];
  legs: { hip: Bone; knee: Bone; paw: Bone }[];
  eyes: Object3D[];
  ears: Object3D[];
  dispose: () => void;
}

export function createCatRig(): CatRig {
  const bones: Bone[] = [];
  const world = new Map<Bone, Vector3>();
  function bone(at: Vector3, parent?: Bone) {
    const b = new Bone();
    b.position.copy(parent ? at.clone().sub(world.get(parent)!) : at);
    parent?.add(b);
    world.set(b, at.clone());
    bones.push(b);
    return { bone: b, index: bones.length - 1 };
  }

  const root = bone(new Vector3(0, 0.37, -0.12));
  const chest = bone(new Vector3(0, 0.38, 0.12), root.bone);
  const neck = bone(new Vector3(0, 0.45, 0.235), chest.bone);
  const head = bone(new Vector3(0, 0.54, 0.31), neck.bone);

  const tail: { bone: Bone; index: number }[] = [];
  const tailBase = new Vector3(0, 0.4, -0.29);
  for (let i = 0; i < TAIL_SEGMENTS; i++) {
    const at = tailBase.clone().setZ(tailBase.z - i * TAIL_LEN);
    tail.push(bone(at, i === 0 ? root.bone : tail[i - 1].bone));
  }

  const legs = LEGS.map((leg) => {
    const top = new Vector3(leg.x, leg.y, leg.z);
    const hip = bone(top, leg.front ? chest.bone : root.bone);
    const knee = bone(top.clone().setY(leg.y - leg.l1), hip.bone);
    const paw = bone(top.clone().setY(leg.y - leg.l1 - leg.l2), knee.bone);
    return { hip, knee, paw };
  });

  const geo = new SweepBuilder();

  // ลำตัว-คอ-หัว: เส้นแกนผ่านจุดกลางของคีย์ แล้วกวาดตามความยาวจริงของเส้นโค้ง
  {
    const curve = new CatmullRomCurve3(TORSO.map(([z, y]) => new Vector3(0, y, z)), false, "centripetal");
    // ตำแหน่งของคีย์บนเส้นโค้ง (สัดส่วนความยาว) ใช้เทียบหาขนาดหน้าตัด
    const lengths = curve.getLengths(400);
    const total = lengths[lengths.length - 1];
    const keyU = TORSO.map((_, i) => lengths[Math.round((i / (TORSO.length - 1)) * 400)] / total);
    const keys = TORSO.map(([, , rx, ry], i) => [keyU[i], rx, ry]);
    const rings: Ring[] = [];
    const N = 48;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const c = curve.getPointAt(u);
      const [, rx, ry] = lerpProfile(keys, u);
      const z = c.z;
      let inf: Influence;
      if (z < 0.14) inf = blend(z, -0.02, 0.12, root.index, chest.index);
      else if (z < 0.255) inf = blend(z, 0.18, 0.24, chest.index, neck.index);
      else inf = blend(z, 0.26, 0.3, neck.index, head.index);
      // ช่วงอก-ท้อง (ก่อนถึงคอ) ป่องลงล่าง ช่วงหัวคงรูปไข่ปกติ
      const belly = z > -0.25 && z < 0.2 ? 1.12 : 1;
      rings.push({ c, t: curve.getTangentAt(u), rx, ry, belly, inf });
    }
    geo.add(rings);
  }

  // หาง: ท่อเรียวยื่นไปทาง −z เริ่มจากในตัว น้ำหนักไล่ระหว่างข้อติดกัน หางจึงงอเป็นโค้งต่อเนื่อง
  {
    const rings: Ring[] = [];
    const start = -0.03;
    const end = TAIL_SEGMENTS * TAIL_LEN - 0.01;
    const N = 40;
    const t = new Vector3(0, 0, -1);
    for (let i = 0; i <= N; i++) {
      const s = start + ((end - start) * i) / N;
      const k = Math.max(0, s) / (TAIL_SEGMENTS * TAIL_LEN);
      let r = 0.03 + (0.016 - 0.03) * k;
      // ปลายหางมน
      if (s > end - 0.02) r *= Math.sqrt(Math.max(0, (end - s) / 0.02));
      if (i === N) r = EPS;
      let inf: Influence;
      if (s < 0.01) inf = blend(s, -0.03, 0.01, root.index, tail[0].index);
      else {
        const f = s / TAIL_LEN;
        const a = Math.min(TAIL_SEGMENTS - 1, Math.floor(f));
        const b = Math.min(TAIL_SEGMENTS - 1, a + 1);
        const w = f - a;
        inf = a === b ? [[tail[a].index, 1]] : [
          [tail[a].index, 1 - w],
          [tail[b].index, w],
        ];
      }
      rings.push({ c: tailBase.clone().setZ(tailBase.z - s), t, rx: r, ry: r, inf });
    }
    geo.add(rings);
  }

  // ขา: โคนบานใหญ่ฝังเข้าลำตัว (ไหล่/สะโพก) เรียวลงถึงข้อ แล้วป่องเป็นอุ้งเท้ายื่นไปข้างหน้า
  LEGS.forEach((leg, li) => {
    const { hip, knee, paw } = legs[li];
    const reach = leg.l1 + leg.l2;
    const top = leg.front ? 0.05 : 0.065;
    // [ระยะลงจากสะโพก, ครึ่งกว้าง, ครึ่งลึก(แกน z), เลื่อนไปข้างหน้า]
    const profile: [number, number, number, number][] = [
      [-0.07, EPS, EPS, 0],
      [-0.055, top * 0.7, top * 0.8, 0],
      [0, top, top * 1.15, 0],
      [0.07, top * 0.7, top * 0.8, 0],
      [leg.l1, 0.027, 0.03, 0],
      [leg.l1 + 0.06, 0.024, 0.026, 0],
      [reach - 0.02, 0.026, 0.03, 0.004],
      [reach + 0.004, 0.034, 0.046, 0.014],
      [reach + 0.014, 0.024, 0.032, 0.012],
      [reach + 0.018, EPS, EPS, 0.012],
    ];
    const rings: Ring[] = [];
    const t = new Vector3(0, -1, 0);
    const N = 30;
    for (let i = 0; i <= N; i++) {
      const d = -0.07 + ((reach + 0.088) * i) / N;
      const [, rx, rz, dz] = lerpProfile(profile, d);
      let inf: Influence;
      if (d < leg.l1 - 0.02) inf = [[hip.index, 1]];
      else if (d < leg.l1 + 0.02) inf = blend(d, leg.l1 - 0.025, leg.l1 + 0.025, hip.index, knee.index);
      else inf = blend(d, reach - 0.03, reach - 0.005, knee.index, paw.index);
      rings.push({ c: new Vector3(leg.x, leg.y - d, leg.z + dz), t, rx, ry: rz, inf });
    }
    geo.add(rings);
  });

  const fur = new MeshStandardMaterial({ color: PALETTE.cat, roughness: 0.55 });
  const geometry = geo.build();
  const mesh = new SkinnedMesh(geometry, fur);
  mesh.add(root.bone);
  mesh.updateMatrixWorld(true);
  mesh.bind(new Skeleton(bones));
  // bounding sphere คำนวณจากท่าพัก หางกับขาที่ขยับออกนอกกรอบจะถูกตัดทิ้งผิด ๆ
  mesh.frustumCulled = false;

  // ตา หู จมูก เป็นชิ้นเล็กเกาะกระดูกหัว (ต้องแยกเพราะต้องกะพริบ/กระดิก)
  const inner = new MeshStandardMaterial({ color: PALETTE.catInner, roughness: 0.8 });
  const eye = new MeshStandardMaterial({
    color: PALETTE.catEye,
    emissive: PALETTE.catEye,
    emissiveIntensity: 0.35,
    roughness: 0.2,
  });
  const pupil = new MeshStandardMaterial({ color: "#0b0b0f", roughness: 0.2 });
  const owned: { dispose(): void }[] = [geometry, fur, inner, eye, pupil];
  const headAt = world.get(head.bone)!;
  const local = (x: number, y: number, z: number) => new Vector3(x, y, z).sub(headAt);
  function part(geometry: BufferGeometry, material: Material) {
    owned.push(geometry);
    return new Mesh(geometry, material);
  }

  const eyes = [1, -1].map((side) => {
    const g = new Group();
    g.position.copy(local(0.046 * side, 0.556, 0.41));
    g.rotation.y = 0.35 * side;
    const ball = part(new SphereGeometry(0.024, 14, 10), eye);
    ball.scale.set(1, 0.78, 0.55);
    ball.rotation.z = 0.18 * side;
    const slit = part(new SphereGeometry(0.012, 8, 8), pupil);
    slit.scale.set(0.28, 1.55, 0.4);
    slit.position.z = 0.011;
    g.add(ball, slit);
    head.bone.add(g);
    return g;
  });

  const ears = [1, -1].map((side) => {
    const g = new Group();
    g.position.copy(local(0.06 * side, 0.615, 0.315));
    g.rotation.set(-0.15, 0, -0.3 * side);
    // กรวย 3 เหลี่ยมหมุน π ให้หน้าแบนหันไปข้างหน้าเป็นหูสามเหลี่ยม โคนฝังลงในหัว
    const outer = part(new ConeGeometry(0.055, 0.11, 3), fur);
    outer.position.y = 0.04;
    outer.rotation.y = Math.PI;
    const pink = part(new ConeGeometry(0.033, 0.07, 3), inner);
    pink.position.set(0, 0.032, 0.014);
    pink.rotation.y = Math.PI;
    g.add(outer, pink);
    head.bone.add(g);
    return g;
  });

  const nose = part(new SphereGeometry(0.012, 8, 6), inner);
  nose.scale.set(1.3, 0.75, 0.6);
  nose.position.copy(local(0, 0.522, 0.42));
  head.bone.add(nose);

  return {
    object: mesh,
    root: root.bone,
    rootRestY: root.bone.position.y,
    chest: chest.bone,
    neck: neck.bone,
    head: head.bone,
    tail: tail.map((t) => t.bone),
    legs: legs.map(({ hip, knee, paw }) => ({ hip: hip.bone, knee: knee.bone, paw: paw.bone })),
    eyes,
    ears,
    dispose: () => owned.forEach((o) => o.dispose()),
  };
}
