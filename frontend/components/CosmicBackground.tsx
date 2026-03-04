"use client";

import React, { Suspense, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { KernelSize } from "postprocessing";
import { useScroll, useMotionValue } from "framer-motion";
import * as THREE from "three";

/* ====================== PARTICLE RIVER ONLY ====================== */
const ParticleRiver = () => {
  const pointsRef = useRef<THREE.Points>(null!);
  const count = 4200; // more particles for richer feel
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);

  // Initialize swirling cosmic particle field
  for (let i = 0; i < count * 3; i += 3) {
    const radius = 40 + Math.random() * 55;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta) - 8;
    positions[i + 2] = radius * Math.cos(phi) * 0.6;
    speeds[i / 3] = 0.006 + Math.random() * 0.018;
  }

  useFrame((state) => {
    if (!pointsRef.current) return;
    const pos = pointsRef.current.geometry.attributes
      .position as THREE.BufferAttribute;
    const time = state.clock.getElapsedTime();

    for (let i = 0; i < count * 3; i += 3) {
      const idx = i / 3;
      // Gentle swirling + vertical flow
      pos.array[i + 1] +=
        Math.sin(time * 1.1 + pos.array[i] * 0.04) * speeds[idx] * 0.45;
      pos.array[i] +=
        Math.cos(time * 0.85 + pos.array[i + 2] * 0.025) * speeds[idx] * 0.35;
      pos.array[i + 2] +=
        Math.sin(time * 0.6 + pos.array[i + 1] * 0.03) * speeds[idx] * 0.2;

      // Reset particles that drift too far (infinite river effect)
      if (Math.abs(pos.array[i + 1]) > 75) pos.array[i + 1] = -70;
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#a0d8ff"
        size={0.06}
        transparent
        opacity={0.85}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

/* ====================== SCENE ====================== */
const CosmosScene: React.FC<{
  mouseX: any;
  mouseY: any;
  scrollProgress: any;
}> = ({ mouseX, mouseY, scrollProgress }) => {
  const { camera } = useThree();

  useFrame((state) => {
    const prog = scrollProgress.get();

    // Camera reacts to mouse + scroll
    camera.position.z = 45 + prog * 110;
    camera.position.x = mouseX.get() * 9;
    camera.position.y = mouseY.get() * 6.5;
    camera.lookAt(0, 0, 0);
  });

  return (
    <>
      <ambientLight intensity={0.08} color="#0a1428" />
      <pointLight position={[0, 0, 0]} color="#ffffff" intensity={2.8} />

      {/* ONLY PARTICLES */}
      <ParticleRiver />

      {/* Distant subtle grid for depth */}
      <gridHelper
        args={[320, 50, "#0a1428", "#0a1428"]}
        position={[0, -55, -35]}
        rotation={[0.65, 0, 0]}
      />
    </>
  );
};

/* ====================== FULL BACKGROUND ====================== */
const CosmicBackground: React.FC = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    mouseX.set(x);
    mouseY.set(y);
  };

  const scrollYProgress = useScroll().scrollYProgress;

  return (
    <div
      className="fixed inset-0 z-[-1] overflow-hidden pointer-events-auto"
      onMouseMove={handleMouseMove}
      style={{ background: "#000213" }}
    >
      <Canvas
        camera={{ position: [0, 0, 45], fov: 50 }}
        style={{ background: "transparent" }}
        gl={{
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true,
          powerPreference: "high-performance",
        }}
      >
        <Suspense fallback={null}>
          <CosmosScene
            mouseX={mouseX}
            mouseY={mouseY}
            scrollProgress={scrollYProgress}
          />
          <EffectComposer multisampling={0}>
            <Bloom
              luminanceThreshold={0.4}
              luminanceSmoothing={0.85}
              height={380}
              kernelSize={KernelSize.LARGE}
              intensity={1.6}
            />
          </EffectComposer>
        </Suspense>
      </Canvas>

      {/* Subtle vignette */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/30 via-transparent to-black/50" />
    </div>
  );
};

export default CosmicBackground;
