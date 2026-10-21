"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";
import type { Content, Locale } from "@/content";
import { createBounds } from "@/lib/bounds";
import { getPathData } from "@/lib/path";
import { QUALITY } from "@/lib/quality";
import { walkArea } from "@/lib/runtime";
import { stationPosition } from "@/lib/stations";
import { ambience } from "@/lib/sound";
import { useGame } from "@/lib/store";
import { CAMERA_FOV, FOG_INTRO, INTRO_OFFSET, PALETTE } from "@/lib/world";
import { CameraRig } from "./camera/CameraRig";
import { Cat } from "./cat/Cat";
import { ControlsHint } from "./ControlsHint";
import { AutoWalker } from "./hud/AutoWalker";
import { PerfHint } from "./hud/PerfHint";
import { Hud } from "./hud/Hud";
import { MapDialog } from "./hud/MapDialog";
import { IntroOverlay } from "./IntroOverlay";
import { Joystick } from "./input/Joystick";
import { useKeyboard } from "./input/useKeyboard";
import { applyResume } from "./resume";
import { SceneReady } from "./SceneReady";
import { Footprints } from "./path/Footprints";
import { StationDialog } from "./stations/StationDialog";
import { StationLabels } from "./stations/StationLabels";
import { Stations } from "./stations/Stations";
import { CloudShadows } from "./world/CloudShadows";
import { Fence } from "./world/Fence";
import { Grass } from "./world/Grass";
import { Ground } from "./world/Ground";
import { Lights } from "./world/Lights";
import { SkyDome } from "./world/SkyDome";
import { warpCurtain } from "./travel";
import { TargetMarker } from "./world/TargetMarker";

export default function Experience({ content, lang }: { content: Content; lang: Locale }) {
  useKeyboard();
  const quality = useGame((s) => s.quality);
  const degrade = useGame((s) => s.degrade);
  // antialias เปลี่ยนหลังสร้าง context ไม่ได้ ใช้ค่าตามระดับตอนเริ่มเท่านั้น
  const [antialias] = useState(() => QUALITY[quality].antialias);
  // ทางและตำแหน่งสถานีขึ้นกับลำดับหัวข้อเท่านั้น (เหมือนกันทุกภาษา) คำนวณครั้งเดียว
  const [world] = useState(() => {
    const ids = content.topics.map((t) => t.id);
    const path = getPathData(ids);
    return { path, positions: ids.map(stationPosition), bounds: createBounds(path.curve.getSpacedPoints(200)) };
  });

  useEffect(() => {
    walkArea.bounds = world.bounds;
    return () => {
      walkArea.bounds = null;
    };
  }, [world]);

  // ขั้นการโหลด: โค้ด 3D มาถึงแล้ว (ขั้นถัดไปอยู่ใน SceneReady)
  // และถ้าเพิ่งสลับภาษามา วางแมวกลับที่เดิมแล้วข้าม intro
  useEffect(() => {
    const { reachLoad, setSkipIntro } = useGame.getState();
    reachLoad(0.55);
    if (applyResume()) setSkipIntro(true);
    // ออกจากหน้า (เช่นไปหน้า Menu) ปิดเสียงบรรยากาศด้วย
    return () => {
      ambience.disable();
      useGame.getState().setSoundOn(false);
    };
  }, []);

  return (
    <div className="fixed inset-0 touch-none bg-(--sky-haze)">
      {/* flat = ปิด tone mapping ให้สีออกตรงตาม PALETTE ซึ่งสำคัญกับงาน stylized */}
      {/* ฉาก 3D ไม่มีความหมายกับ screen reader — เนื้อหาเดียวกันอยู่ใน sr-only ของหน้าและปุ่ม/dialog ที่เป็น DOM */}
      <Canvas
        aria-hidden
        flat
        dpr={QUALITY[quality].dpr}
        gl={{ antialias, powerPreference: "high-performance" }}
        camera={{ fov: CAMERA_FOV, near: 0.1, far: 120, position: INTRO_OFFSET.toArray() }}
      >
        <color attach="background" args={[PALETTE.fog]} />
        <fog attach="fog" args={[PALETTE.fog, ...FOG_INTRO]} />
        <PerformanceMonitor onDecline={degrade} />
        <SceneReady />
        <SkyDome />
        <Lights />
        <Ground mask={world.path.mask} />
        <Footprints curve={world.path.curve} />
        <Grass mask={world.path.mask} />
        <Stations content={content} positions={world.positions} />
        <Fence bounds={world.bounds} />
        <Cat />
        <TargetMarker />
        <AutoWalker path={world.path} positions={world.positions} />
        <CloudShadows />
        <CameraRig />
      </Canvas>
      <IntroOverlay ui={content.ui} />
      <StationLabels content={content} />
      <ControlsHint ui={content.ui} />
      <Joystick />
      <Hud content={content} lang={lang} />
      <PerfHint ui={content.ui} lang={lang} />
      <StationDialog content={content} />
      <MapDialog content={content} path={world.path} bounds={world.bounds} />
      {/* ม่านจางตอนวาร์ปไปสถานี (Skip / แผนที่) */}
      <div
        ref={(el) => {
          warpCurtain.el = el;
        }}
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-(--sky-haze) opacity-0"
      />
    </div>
  );
}
