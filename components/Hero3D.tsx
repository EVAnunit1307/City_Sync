"use client";

import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { PerspectiveCamera, Line } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
import { motion } from "framer-motion";
import Link from "next/link";

interface BoardSceneProps {
  mouseX: number;
  mouseY: number;
}

// Board base with grid overlay and simulation indicators
function BoardBase() {
  const gridRef = useRef<THREE.Mesh>(null);
  
  return (
    <group position={[0, 0, 0]}>
      {/* Subtle grid overlay - planning board aesthetic */}
      <mesh ref={gridRef} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[15, 15]} />
        <meshBasicMaterial 
          color="#7b68ee" 
          transparent 
          opacity={0.03}
          wireframe 
        />
      </mesh>
      
      {/* Glowing parcel outline examples */}
      <Line
        points={[[-2, 0.02, -1.5], [-1, 0.02, -1.5], [-1, 0.02, -0.5], [-2, 0.02, -0.5], [-2, 0.02, -1.5]]}
        color="#7b68ee"
        lineWidth={1}
        transparent
        opacity={0.4}
      />
      
      <Line
        points={[[0.5, 0.02, 1], [1.5, 0.02, 1], [1.5, 0.02, 2], [0.5, 0.02, 2], [0.5, 0.02, 1]]}
        color="#7b68ee"
        lineWidth={1}
        transparent
        opacity={0.3}
      />
    </group>
  );
}

// Toronto GLB Model
function TorontoModel({ mouseX, mouseY }: BoardSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const gltf = useLoader(GLTFLoader, "/toronto_ontario_canada.glb");
  
  useEffect(() => {
    if (gltf.scene) {
      // Improved materials with better contrast and shadows
      gltf.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          if (mesh.material) {
            const material = mesh.material as THREE.MeshStandardMaterial;
            // Lighter, more contrasted materials
            material.color = new THREE.Color(0.8, 0.8, 0.82);
            material.emissive = new THREE.Color(0.08, 0.08, 0.1);
            material.metalness = 0.3;
            material.roughness = 0.6;
            material.side = THREE.DoubleSide;
          }
        }
      });
    }
  }, [gltf]);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      // Parallax rotation + subtle auto-drift
      const drift = Math.sin(clock.getElapsedTime() * 0.1) * 0.02;
      const targetRotationY = mouseX * 0.15 + drift;
      
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        targetRotationY,
        0.1
      );
      
      // Subtle floating animation
      groupRef.current.position.y = Math.sin(clock.getElapsedTime() * 0.3) * 0.05;
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
  
  useFrame(({ clock }) => {
    if (cameraRef.current) {
      // Camera parallax + subtle auto-drift
      const drift = Math.sin(clock.getElapsedTime() * 0.15) * 0.1;
      const targetX = mouseY * 1.2 + drift;
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
        fov={48}
      />
      
      {/* Enhanced lighting with shadows for better quality */}
      <ambientLight intensity={0.5} />
      <hemisphereLight args={[0xffffff, 0xe8ecf0, 0.4]} />
      <directionalLight 
        position={[-10, 15, 8]} 
        intensity={1.0} 
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-bias={-0.0001}
      />
      <directionalLight position={[5, 10, -5]} intensity={0.5} color="#d0d0ff" />
      <pointLight position={[0, 8, 0]} intensity={0.2} color="#7b68ee" />
      
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
        <Canvas
          shadows
          gl={{
            antialias: true,
            alpha: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.2,
          }}
        >
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
          <div className="hero-board-title-wrapper">
            <h1 className="hero-board-title">
              GrowthSync<span className="hero-title-dot">.</span>
            </h1>
            <p className="hero-board-subtitle">
              Simulate subdivision growth before it gets approved.
            </p>
          </div>
          
          <p className="hero-board-subtext">
            Real-time zoning, cost, transit, and congestion impacts.
          </p>
          
          <div className="hero-board-ctas">
            <Link href="/map" className="hero-board-btn-primary">
              Run Scenario
            </Link>
            <Link href="/editor" className="hero-board-btn-secondary">
              Open 3D Builder
            </Link>
          </div>
          
          <div className="hero-board-console">
            <span className="console-prompt">&gt;</span>
            <span className="console-text">Try: &quot;Add 200 townhouses near transit.&quot;</span>
          </div>
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
