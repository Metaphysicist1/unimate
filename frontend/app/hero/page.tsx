"use client"; // For Next.js App Router (remove if using CRA/Vite)

import React, { Suspense, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { KernelSize } from "postprocessing";
import { useScroll, useMotionValue, useTransform, motion } from "framer-motion";
import * as THREE from "three";

/* ====================== 3D SUB-COMPONENTS ====================== */

const Atom = ({ basePos }: { basePos: [number, number, number] }) => {
  const group = useRef<THREE.Group>(null!);
  useFrame((state) => {
    if (group.current)
      group.current.rotation.y = state.clock.getElapsedTime() * 0.4;
  });
  return (
    <group
      ref={group}
      position={basePos}
      userData={{ basePos: { x: basePos[0], y: basePos[1] } }}
    >
      {/* Nucleus - bright core */}
      <mesh>
        <sphereGeometry args={[1.8]} />
        <meshBasicMaterial color="#ffffff" wireframe />
      </mesh>
      {/* Electron orbits - glowing blue */}
      {[2.8, 4.2, 5.5].map((r, i) => (
        <mesh key={i} rotation={[i * 0.7, i * 1.1, 0]}>
          <torusGeometry args={[r, 0.04, 16, 64]} />
          <meshBasicMaterial color="#3373FD" wireframe />
        </mesh>
      ))}
    </group>
  );
};

const OpenBook = ({ basePos }: { basePos: [number, number, number] }) => {
  const group = useRef<THREE.Group>(null!);
  useFrame((state) => {
    if (group.current)
      group.current.rotation.y =
        Math.sin(state.clock.getElapsedTime() * 0.3) * 0.15;
  });
  return (
    <group
      ref={group}
      position={basePos}
      userData={{ basePos: { x: basePos[0], y: basePos[1] } }}
    >
      {/* Left page */}
      <mesh position={[-3.2, 0, 0]} rotation={[0.15, 0.9, 0]}>
        <planeGeometry args={[5.5, 7.8]} />
        <meshBasicMaterial color="#e0f0ff" wireframe side={THREE.DoubleSide} />
      </mesh>
      {/* Right page */}
      <mesh position={[3.2, 0, 0]} rotation={[0.15, -0.9, 0]}>
        <planeGeometry args={[5.5, 7.8]} />
        <meshBasicMaterial color="#e0f0ff" wireframe side={THREE.DoubleSide} />
      </mesh>
      {/* Spine + binding lines */}
      <mesh position={[0, 0, 0.2]}>
        <boxGeometry args={[0.6, 8, 0.3]} />
        <meshBasicMaterial color="#3373FD" wireframe />
      </mesh>
    </group>
  );
};

const Compass = ({ basePos }: { basePos: [number, number, number] }) => {
  const group = useRef<THREE.Group>(null!);
  useFrame((state) => {
    if (group.current)
      group.current.rotation.z = state.clock.getElapsedTime() * 0.2;
  });
  return (
    <group
      ref={group}
      position={basePos}
      userData={{ basePos: { x: basePos[0], y: basePos[1] } }}
    >
      {/* Outer ring */}
      <mesh>
        <torusGeometry args={[4.5, 0.12, 16, 64]} />
        <meshBasicMaterial color="#3373FD" wireframe />
      </mesh>
      {/* Cardinal lines */}
      <mesh rotation={[0, 0, 0]}>
        <boxGeometry args={[9, 0.08, 0.08]} />
        <meshBasicMaterial color="#3373FD" wireframe />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[9, 0.08, 0.08]} />
        <meshBasicMaterial color="#3373FD" wireframe />
      </mesh>
      {/* Rising needle (pointing "up") */}
      <mesh position={[0, 2.2, 0]} rotation={[0, 0, 0]}>
        <coneGeometry args={[0.4, 4.5, 4]} />
        <meshBasicMaterial color="#ffffff" wireframe />
      </mesh>
    </group>
  );
};

const GeometricShapes = () => {
  const group = useRef<THREE.Group>(null!);
  const positions: [number, number, number][] = [
    [14, 12, -8],
    [-16, -10, 6],
    [11, -14, -5],
    [-13, 9, 7],
  ];
  useFrame((state) => {
    if (group.current)
      group.current.rotation.y = state.clock.getElapsedTime() * 0.08;
  });
  return (
    <group ref={group}>
      {positions.map((pos, i) => (
        <mesh
          key={i}
          position={pos}
          userData={{ basePos: { x: pos[0], y: pos[1] } }}
        >
          <icosahedronGeometry args={[i % 2 === 0 ? 3.8 : 4.6]} />
          <meshBasicMaterial color="#3373FD" wireframe />
        </mesh>
      ))}
      {/* Extra torus-knot for variety */}
      <mesh position={[0, 18, -12]} userData={{ basePos: { x: 0, y: 18 } }}>
        <torusKnotGeometry args={[3.2, 0.6, 120, 16]} />
        <meshBasicMaterial color="#3373FD" wireframe />
      </mesh>
    </group>
  );
};

const ParticleRiver = () => {
  const pointsRef = useRef<THREE.Points>(null!);
  const count = 2800;
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);

  // Initialize swirling particle field
  for (let i = 0; i < count * 3; i += 3) {
    const radius = 35 + Math.random() * 45;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta) - 5;
    positions[i + 2] = radius * Math.cos(phi);
    speeds[i / 3] = 0.008 + Math.random() * 0.012;
  }

  useFrame((state) => {
    if (!pointsRef.current) return;
    const pos = pointsRef.current.geometry.attributes
      .position as THREE.BufferAttribute;
    const time = state.clock.getElapsedTime();

    for (let i = 0; i < count * 3; i += 3) {
      const idx = i / 3;
      // Gentle orbital flow + slight noise
      pos.array[i + 1] +=
        Math.sin(time * 1.2 + pos.array[i] * 0.05) * speeds[idx] * 0.4;
      pos.array[i] +=
        Math.cos(time * 0.9 + pos.array[i + 2] * 0.03) * speeds[idx] * 0.3;
      // Reset particles that drift too far (digital river loop)
      if (Math.abs(pos.array[i + 1]) > 60) pos.array[i + 1] = -55;
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#a0d0ff"
        size={0.18}
        transparent
        opacity={0.75}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

/* ====================== MAIN 3D SCENE ====================== */

const CosmosScene: React.FC<{
  mouseX: any;
  mouseY: any;
  scrollProgress: any;
}> = ({ mouseX, mouseY, scrollProgress }) => {
  const { camera } = useThree();
  const centralGroup = useRef<THREE.Group>(null!);

  useFrame((state) => {
    const prog = scrollProgress.get();

    // Gentle central swirl
    if (centralGroup.current) {
      centralGroup.current.rotation.y = state.clock.getElapsedTime() * 0.035;
      centralGroup.current.rotation.x =
        Math.sin(state.clock.getElapsedTime() * 0.1) * 0.07;
    }

    // Scroll dispersion + camera pull-back
    const disperse = prog * 28;
    if (centralGroup.current) {
      centralGroup.current.children.forEach((child) => {
        if (child.userData.basePos) {
          child.position.x =
            child.userData.basePos.x +
            disperse * (child.position.x > 0 ? 1 : -1) * 0.8;
          child.position.y = child.userData.basePos.y + disperse * 0.6;
        }
      });
    }

    // Camera dynamics
    camera.position.z = 38 + prog * 92; // pull back on scroll
    camera.position.x = mouseX.get() * 7.5;
    camera.position.y = mouseY.get() * 5.2;
    camera.lookAt(0, 0, 0);
  });

  return (
    <>
      <ambientLight intensity={0.1} color="#112244" />
      <pointLight position={[0, 0, 0]} color="#ffffff" intensity={3.2} />

      <group ref={centralGroup}>
        <Atom basePos={[0, 0, 0]} />
        <OpenBook basePos={[-18, 6, -4]} />
        <Compass basePos={[19, -9, 3]} />
        <GeometricShapes />
      </group>

      <ParticleRiver />

      {/* Distant subtle grid (echoes landing page) */}
      <gridHelper
        args={[280, 45, "#080C26", "#080C26"]}
        position={[0, -48, -30]}
        rotation={[0.6, 0, 0]}
      />
    </>
  );
};

/* ====================== FULL HERO COMPONENT ====================== */

const Dynamic3DMotionDiv: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null!);

  const scrollYProgress = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  }).scrollYProgress;

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    mouseX.set(x);
    mouseY.set(y);
  };

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-full overflow-hidden select-none"
      style={{ background: "#000213" }}
      onMouseMove={handleMouseMove}
    >
      {/* 3D Canvas - absolute full bleed */}
      <Canvas
        camera={{ position: [0, 0, 38], fov: 52 }}
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
              luminanceThreshold={0.55}
              luminanceSmoothing={0.9}
              height={420}
              kernelSize={KernelSize.LARGE}
              intensity={1.35}
            />
          </EffectComposer>
        </Suspense>
      </Canvas>

      {/* Text & UI Layer - perfectly layered over 3D */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center text-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ y: useTransform(scrollYProgress, [0, 0.4], [0, -120]) }}
          className="pointer-events-auto"
        >
          <div className="text-[13vw] md:text-[9.5vw] leading-none font-black tracking-[-0.07em] text-white">
            UNIMATE.
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 1 }}
          style={{
            y: useTransform(scrollYProgress, [0, 0.5], [0, -60]),
          }}
          className="mt-8 pointer-events-auto"
        >
          <div className="text-4xl md:text-5xl font-light tracking-wide text-[#3373FD]">
            Agentic Analysis 2026
          </div>
          <p className="mt-6 max-w-xl mx-auto text-lg md:text-xl text-white/70 leading-relaxed">
            A living constellation of intelligence. Where atoms of knowledge
            orbit, books unfold into dimensions, and compasses point toward the
            next frontier.
          </p>
        </motion.div>

        {/* CTA Button - floats in its own depth layer */}
        <motion.button
          whileHover={{ scale: 1.05, backgroundColor: "#4a8fff" }}
          whileTap={{ scale: 0.96 }}
          style={{
            y: useTransform(scrollYProgress, [0, 0.6], [0, -40]),
          }}
          className="pointer-events-auto mt-16 px-10 py-5 rounded-full bg-[#3373FD] text-white text-lg font-medium tracking-wider shadow-2xl shadow-[#3373FD]/30 transition-all"
        >
          ENTER THE COSMOS
        </motion.button>
      </div>

      {/* Very subtle vignette overlay for extra depth */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/20 via-transparent to-black/40 z-20" />
    </div>
  );
};

export default Dynamic3DMotionDiv;
