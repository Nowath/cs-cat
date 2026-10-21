"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { BoxGeometry, CylinderGeometry, Euler, Matrix4, MeshStandardMaterial, Quaternion, Vector3, type InstancedMesh } from "three";
import type { Bounds } from "@/lib/bounds";
import { heightAt } from "@/lib/terrain";
import { PALETTE } from "@/lib/world";

// รั้วไม้เตี้ยรอบขอบเขตที่แมวเดินได้ (กำแพงใสใน lib/bounds.ts)
// วางออกไปนอกแนวที่แมวหยุด (จุดหยุดคือกลางตัว หัวยื่นไปข้างหน้าราว 0.55 ม.) จมูกจึงชิดรั้วพอดี ไม่ทะลุ
const OUTSET = 0.75;
const SPACING = 2;
const POST_HEIGHT = 0.8;
// ราวสองเส้น (ความสูงจากพื้น)
const RAILS = [0.32, 0.6];

interface Piece {
  pos: Vector3;
  quat: Quaternion;
  scale: Vector3;
}

function buildFence(b: Bounds) {
  const minX = b.minX - OUTSET;
  const maxX = b.maxX + OUTSET;
  const minZ = b.minZ - OUTSET;
  const maxZ = b.maxZ + OUTSET;
  const corners = [
    new Vector3(minX, 0, minZ),
    new Vector3(maxX, 0, minZ),
    new Vector3(maxX, 0, maxZ),
    new Vector3(minX, 0, maxZ),
  ];

  // เสาไล่รอบสี่ด้าน ระยะห่างเท่า ๆ กันในแต่ละด้าน (มุมมีเสาเสมอ)
  const points: Vector3[] = [];
  corners.forEach((a, i) => {
    const c = corners[(i + 1) % 4];
    const n = Math.max(1, Math.round(a.distanceTo(c) / SPACING));
    for (let k = 0; k < n; k++) {
      const p = a.clone().lerp(c, k / n);
      points.push(p.setY(heightAt(p.x, p.z)));
    }
  });

  const posts: Piece[] = points.map((p, i) => {
    // เสาเอียงนิด ๆ ไม่เท่ากัน ดูเป็นรั้วไม้ทำมือ
    const wobble = Math.sin(i * 12.9898) * 0.04;
    return {
      pos: p.clone().setY(p.y + POST_HEIGHT / 2 - 0.08),
      quat: new Quaternion().setFromEuler(new Euler(wobble, i * 1.7, -wobble)),
      scale: new Vector3(1, 1, 1),
    };
  });

  // ราว: กล่องยาวจากเสาหนึ่งถึงเสาถัดไป เอียงตามความลาดของเนิน
  const rails: Piece[] = [];
  const x = new Vector3(1, 0, 0);
  points.forEach((a, i) => {
    const c = points[(i + 1) % points.length];
    for (const h of RAILS) {
      const from = a.clone().setY(a.y + h);
      const to = c.clone().setY(c.y + h);
      const dir = to.clone().sub(from);
      const len = dir.length();
      rails.push({
        pos: from.clone().add(to).multiplyScalar(0.5),
        quat: new Quaternion().setFromUnitVectors(x, dir.normalize()),
        scale: new Vector3(len + 0.06, 1, 1),
      });
    }
  });
  return { posts, rails };
}

export function Fence({ bounds }: { bounds: Bounds }) {
  const postsRef = useRef<InstancedMesh>(null);
  const railsRef = useRef<InstancedMesh>(null);
  const fence = useMemo(() => buildFence(bounds), [bounds]);
  const res = useMemo(
    () => ({
      post: new CylinderGeometry(0.055, 0.07, POST_HEIGHT, 6),
      rail: new BoxGeometry(1, 0.07, 0.045),
      wood: new MeshStandardMaterial({ color: PALETTE.signWood, roughness: 0.9 }),
      woodDark: new MeshStandardMaterial({ color: PALETTE.signWoodDark, roughness: 0.95 }),
    }),
    [],
  );

  useLayoutEffect(() => {
    const m = new Matrix4();
    const posts = postsRef.current;
    const rails = railsRef.current;
    if (!posts || !rails) return;
    fence.posts.forEach((p, i) => posts.setMatrixAt(i, m.compose(p.pos, p.quat, p.scale)));
    fence.rails.forEach((p, i) => rails.setMatrixAt(i, m.compose(p.pos, p.quat, p.scale)));
    posts.instanceMatrix.needsUpdate = true;
    rails.instanceMatrix.needsUpdate = true;
    posts.computeBoundingSphere();
    rails.computeBoundingSphere();
  }, [fence]);

  useEffect(
    () => () => {
      res.post.dispose();
      res.rail.dispose();
      res.wood.dispose();
      res.woodDark.dispose();
    },
    [res],
  );

  return (
    <>
      <instancedMesh
        ref={postsRef}
        args={[res.post, res.woodDark, fence.posts.length]}
        raycast={() => null}
      />
      <instancedMesh
        ref={railsRef}
        args={[res.rail, res.wood, fence.rails.length]}
        raycast={() => null}
      />
    </>
  );
}
