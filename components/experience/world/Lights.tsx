"use client";

import { PALETTE, SUN_POSITION } from "@/lib/world";

// แสงเช้า: ฟ้าอมฟ้าจากบน + แดดอุ่นมุมต่ำ (ทิศเดียวกับที่หญ้าใช้ใน shader)
// เงาใช้ blob ใต้ตัวแมวแทน shadow map เพื่อให้มือถือไหว
export function Lights() {
  return (
    <>
      <hemisphereLight args={[PALETTE.skyLight, PALETTE.hemiGround, 1.6]} />
      <directionalLight color={PALETTE.sun} intensity={2.4} position={SUN_POSITION.toArray()} />
      {/* แสงเติมจากฝั่งกล้อง แดดเช้าส่องจากหลังฉาก หน้าแมวดำที่หันมาหากล้องจะได้ไม่มืดจนไม่เห็นตา */}
      <directionalLight color={PALETTE.skyLight} intensity={0.9} position={[2, 3, 10]} />
    </>
  );
}
