"use client";

import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { PerspectiveCamera, Circle } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
import { motion } from "framer-motion";
import Link from "next/link";

interface BoardSceneProps {
  mouseX: number;
  mouseY: number;
}

// Board base - minimal, clean (no rings for clean look)
function BoardBase() {
  return (
    <group position={[0, 0, 0]}>
      {/* Empty - clean background with no circular shadows */}
    </group>
  );
}

// Toronto GLB Model
function TorontoModel({ mouseX, mouseY }: BoardSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const gltf = useLoader(GLTFLoader, "/toronto_ontario_canada.glb");
  
  useEffect(() => {
    if (gltf.scene) {
      // Apply clean light gray material - prevent black rendering
      gltf.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.material) {
            const material = mesh.material as THREE.MeshStandardMaterial;
            material.color = new THREE.Color(0.65, 0.65, 0.65);
            material.emissive = new THREE.Color(0.05, 0.05, 0.05);
            material.metalness = 0.2;
            material.roughness = 0.75;
            material.side = THREE.DoubleSide; // Ensure both sides render
          }
        }
      });
    }
  }, [gltf]);

  useFrame(() => {
    if (groupRef.current) {
      // More noticeable parallax rotation for better interaction feedback
      const targetRotationY = mouseX * 0.15;
      
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        targetRotationY,
        0.1
      );
    }
  });

  // Scale for board game size - small miniature like reference
  return (
    <group ref={groupRef} position={[0, 0, 0]} scale={0.0015} rotation={[0, 0, 0]}>
      <primitive object={gltf.scene} />
    </group>
  );
}

// Main 3D Scene
function Scene({ mouseX, mouseY }: BoardSceneProps) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  
  useFrame(() => {
    if (cameraRef.current) {
      // More dramatic camera movement - increased sensitivity
      const targetX = mouseY * 1.2;
      const targetZ = 8 + mouseX * 1.5;
      
      cameraRef.current.position.x = THREE.MathUtils.lerp(
        cameraRef.current.position.x,
        targetX,
        0.08
      );
      cameraRef.current.position.z = THREE.MathUtils.lerp(
        cameraRef.current.position.z,
        targetZ,
        0.08
      );
      
      cameraRef.current.lookAt(0, 0, 0);
    }
  });

  return (
    <>
      {/* Top-down isometric camera - board game view for small miniature */}
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        position={[0, 8, 8]}
        fov={50}
      />
      
      {/* Simplified lighting - no shadows for performance */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 15, 5]} intensity={1.0} />
      <directionalLight position={[-5, 10, -5]} intensity={0.4} />
      
      {/* Board base plate */}
      <BoardBase />
      
      {/* Toronto model on the board */}
      <TorontoModel mouseX={mouseX} mouseY={mouseY} />
    </>
  );
}

export function Hero3D() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY, currentTarget } = e;
    const { width, height } = currentTarget.getBoundingClientRect();
    
    const x = (clientX / width - 0.5) * 2;
    const y = -(clientY / height - 0.5) * 2;
    
    setMousePosition({ x, y });
  };

  return (
    <section 
      className="hero-board-container" 
      onMouseMove={handleMouseMove}
    >
      {/* Header - Brand */}
      <div className="hero-board-header">
        <span className="hero-board-brand">GrowthSync</span>
      </div>

      {/* 3D Canvas - Full Screen */}
      <div className="hero-board-canvas">
        <Canvas>
          <Scene mouseX={mousePosition.x} mouseY={mousePosition.y} />
        </Canvas>
      </div>

      {/* Main Content - Left Side */}
      <div className="hero-board-content">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <p className="hero-board-kicker">reimagine.</p>
          <h1 className="hero-board-title">
            GrowthSync<span className="hero-title-dot">.</span>
          </h1>
          <p className="hero-board-subtitle">
            A subdivision digital twin for real-time zoning, cost, and mobility impacts.
          </p>
          
          <div className="hero-board-ctas">
            <Link href="#demo" className="hero-board-btn-primary">
              Explore the platform
            </Link>
            <Link href="/editor" className="hero-board-btn-secondary">
              Open 3D Builder
            </Link>
          </div>
          
          <p className="hero-board-voice-hint">
            Try: &quot;Add 200 townhouses near transit.&quot;
          </p>
        </motion.div>
      </div>

      {/* Coordinates - Top Right Corner */}
      <motion.div
        className="hero-board-coords"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
      >
        <div className="coords-line">LATITUDE: 43.6532° N</div>
        <div className="coords-line coords-highlight">FOCAL DEPTH: 80MM</div>
      </motion.div>

      {/* Grain overlay */}
      <div className="hero-board-grain" />
    </section>
  );
}
