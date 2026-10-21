"use client";

import { useGLTF } from "@react-three/drei";
import { Suspense } from "react";
import { CAT_MODEL } from "@/lib/cat-model";
import { GltfCat } from "./GltfCat";
import { PlaceholderCat } from "./PlaceholderCat";
import { RiggedCat } from "./RiggedCat";

// เริ่มโหลดไฟล์ตั้งแต่โหลดโค้ดฉาก แถบ loading จะรอไฟล์นี้ด้วย
if (CAT_MODEL.kind !== "placeholder") useGLTF.preload(CAT_MODEL.url);

// เลือกโมเดลแมวตาม lib/cat-model.ts — ระหว่างโหลดไฟล์ .glb แสดงแมว placeholder ไปก่อน
export function CatModel() {
  if (CAT_MODEL.kind === "placeholder") return <PlaceholderCat />;
  return (
    <Suspense fallback={<PlaceholderCat />}>
      {CAT_MODEL.kind === "rigged" ? <RiggedCat config={CAT_MODEL} /> : <GltfCat config={CAT_MODEL} />}
    </Suspense>
  );
}
