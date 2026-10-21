"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { Vector3 } from "three";
import type { Content } from "@/content";
import { cat } from "@/lib/runtime";
import { NEAR_RADIUS, SIGN_OFFSET_Z } from "@/lib/stations";
import { heightAt } from "@/lib/terrain";
import { useGame } from "@/lib/store";
import { LabelProjector } from "./LabelProjector";
import { Station } from "./Station";

interface StationsProps {
  content: Content;
  positions: Vector3[];
}

// เดินผ่านสถานีในระยะนี้ แมวจะหันหัวไปมองป้าย
const LOOK_RADIUS = 4.5;

export function Stations({ content, positions }: StationsProps) {
  // จุดที่แมวมอง: กลางแผ่นป้ายไม้ (ป้ายตั้งบนพื้นเนินตรงตำแหน่งป้าย)
  const [signs] = useState(() =>
    positions.map((p) => new Vector3(p.x, heightAt(p.x, p.z + SIGN_OFFSET_Z) + 1.0, p.z + SIGN_OFFSET_Z)),
  );

  // หาสถานีที่ใกล้ที่สุด: ในรัศมีเล็ก = ยืนที่สถานี (โชว์ปุ่ม/นับว่าไปถึงแล้ว) · รัศมีใหญ่ = หันไปมองป้าย
  // เขียนลง store เฉพาะตอนค่าเปลี่ยน (setNear/markVisited เช็คซ้ำให้แล้ว)
  useFrame(() => {
    let best = Infinity;
    let index = -1;
    positions.forEach((p, i) => {
      const d = (p.x - cat.position.x) ** 2 + (p.z - cat.position.z) ** 2;
      if (d < best) {
        best = d;
        index = i;
      }
    });
    const { setNear, markVisited } = useGame.getState();
    const near = best < NEAR_RADIUS * NEAR_RADIUS;
    setNear(near ? content.topics[index].id : null);
    if (near) markVisited(index);
    cat.lookAt = best < LOOK_RADIUS * LOOK_RADIUS ? signs[index] : null;
  });

  // กด E เปิดรายละเอียดของสถานีที่ยืนอยู่ (Enter/Space ใช้กับปุ่มที่ focus อยู่แล้วตามปกติ)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code !== "KeyE" || e.repeat) return;
      const { phase, nearStationId, openStationId, openStation } = useGame.getState();
      if (phase === "explore" && nearStationId && !openStationId) openStation(nearStationId);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <LabelProjector ids={content.topics.map((t) => t.id)} positions={positions} />
      {content.topics.map((topic, i) => (
        <Station key={topic.id} index={i} position={positions[i]} />
      ))}
    </>
  );
}
