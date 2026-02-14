"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

import Floating, { FloatingElement } from "@/components/ui/floating";
import { ContainerScroll } from "@/components/ui/container-scroll";
import { MapPin, Building2, BarChart3, Home } from "lucide-react";


const sparks = [
  { className: "tp-spark-1", depth: 1.1 },
  { className: "tp-spark-2", depth: 1.4 },
  { className: "tp-spark-3", depth: 0.9 },
  { className: "tp-spark-4", depth: 1.7 },
  { className: "tp-spark-5", depth: 1.2 },
  { className: "tp-spark-6", depth: 1.6 },
  { className: "tp-spark-7", depth: 1.3 },
  { className: "tp-spark-8", depth: 1 },
  { className: "tp-spark-9", depth: 1.5 },
  { className: "tp-spark-10", depth: 1.2 },
  { className: "tp-spark-11", depth: 1.8 },
  { className: "tp-spark-12", depth: 1.1 },
];

// Blueprint SVG components
const BlueprintGrid = () => (
  <svg className="blueprint-grid" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice">
    <defs>
      <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(100, 180, 255, 0.15)" strokeWidth="0.5"/>
      </pattern>
      <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
        <rect width="100" height="100" fill="url(#smallGrid)"/>
        <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(100, 180, 255, 0.3)" strokeWidth="1"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid)" />
  </svg>
);

const BlueprintBuilding = ({ className }: { className: string }) => (
  <svg className={className} viewBox="0 0 200 300" fill="none">
    <rect x="40" y="50" width="120" height="220" stroke="rgba(100, 180, 255, 0.6)" strokeWidth="2" fill="none"/>
    {[...Array(10)].map((_, i) => (
      <line
        key={i}
        x1="40"
        y1={70 + i * 20}
        x2="160"
        y2={70 + i * 20}
        stroke="rgba(100, 180, 255, 0.3)"
        strokeWidth="1"
      />
    ))}
    {[...Array(10)].map((_, floor) =>
      [...Array(4)].map((_, col) => (
        <rect
          key={`${floor}-${col}`}
          x={50 + col * 25}
          y={55 + floor * 20}
          width="15"
          height="12"
          stroke="rgba(100, 180, 255, 0.4)"
          strokeWidth="1"
          fill="none"
        />
      ))
    )}
    <line x1="30" y1="50" x2="30" y2="270" stroke="rgba(100, 180, 255, 0.5)" strokeWidth="1"/>
    <line x1="25" y1="50" x2="35" y2="50" stroke="rgba(100, 180, 255, 0.5)" strokeWidth="1"/>
    <line x1="25" y1="270" x2="35" y2="270" stroke="rgba(100, 180, 255, 0.5)" strokeWidth="1"/>
    <text x="15" y="160" fill="rgba(100, 180, 255, 0.7)" fontSize="12" transform="rotate(-90 15 160)">220m</text>
  </svg>
);

const BlueprintCircle = ({ className }: { className: string }) => (
  <svg className={className} viewBox="0 0 200 200" fill="none">
    <circle cx="100" cy="100" r="80" stroke="rgba(100, 180, 255, 0.4)" strokeWidth="2" fill="none"/>
    <circle cx="100" cy="100" r="60" stroke="rgba(100, 180, 255, 0.3)" strokeWidth="1" fill="none"/>
    <circle cx="100" cy="100" r="40" stroke="rgba(100, 180, 255, 0.3)" strokeWidth="1" fill="none"/>
    <line x1="20" y1="100" x2="180" y2="100" stroke="rgba(100, 180, 255, 0.3)" strokeWidth="1"/>
    <line x1="100" y1="20" x2="100" y2="180" stroke="rgba(100, 180, 255, 0.3)" strokeWidth="1"/>
    <line x1="40" y1="40" x2="160" y2="160" stroke="rgba(100, 180, 255, 0.2)" strokeWidth="1"/>
    <line x1="160" y1="40" x2="40" y2="160" stroke="rgba(100, 180, 255, 0.2)" strokeWidth="1"/>
  </svg>
);

const BlueprintArrow = ({ className }: { className: string }) => (
  <svg className={className} viewBox="0 0 150 100" fill="none">
    <defs>
      <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
        <polygon points="0 0, 10 3, 0 6" fill="rgba(100, 180, 255, 0.6)" />
      </marker>
    </defs>
    <line x1="10" y1="50" x2="140" y2="50" stroke="rgba(100, 180, 255, 0.6)" strokeWidth="2" markerEnd="url(#arrowhead)"/>
    <text x="60" y="40" fill="rgba(100, 180, 255, 0.7)" fontSize="12">EXPANSION</text>
  </svg>
);

export default function Landing() {
  return (
    <main className="fancy-page">
      {/* Fancy Floating Images Hero */}
      <section className="fancy-hero">
        {/* Fixed Navigation */}
        <nav className="fancy-nav">
          <span className="fancy-logo">GrowthSync</span>
          <div className="fancy-nav-links">
            <Link href="/map">Explore Map</Link>
            <Link href="/editor">3D Builder</Link>
          </div>
        </nav>

        {/* Floating Images Container */}
        <Floating className="fancy-floating-container" sensitivity={1.5} easingFactor={0.08}>
          {/* Top Left - CN Tower at night */}
          <FloatingElement depth={1.2} className="fancy-image fancy-img-1">
            <Image
              src="/carousel/kingston-waterfront-at-night.jpg"
              alt="Toronto CN Tower at night"
              width={280}
              height={350}
              className="fancy-img-content"
            />
          </FloatingElement>

          {/* Top Center-Left - Abstract gradient (Toronto sunset) */}
          <FloatingElement depth={0.9} className="fancy-image fancy-img-2">
            <Image
              src="/toronto/toronto-sunset-snake-island.jpg"
              alt="Toronto sunset gradient"
              width={220}
              height={220}
              className="fancy-img-content"
            />
          </FloatingElement>

          {/* Top Right - Skyline perspective */}
          <FloatingElement depth={1.6} className="fancy-image fancy-img-3">
            <Image
              src="/toronto/toronto-islands-skyline.jpg"
              alt="Toronto skyline from islands"
              width={320}
              height={240}
              className="fancy-img-content"
            />
          </FloatingElement>

          {/* Top Far Right - Water/lake texture */}
          <FloatingElement depth={0.8} className="fancy-image fancy-img-4">
            <Image
              src="/toronto/toronto-trillium-park.jpg"
              alt="Toronto waterfront"
              width={200}
              height={200}
              className="fancy-img-content"
            />
          </FloatingElement>

          {/* Left Side - Urban buildings */}
          <FloatingElement depth={1.4} className="fancy-image fancy-img-5">
            <Image
              src="/carousel/city-of-kingston-ontario-canada.jpg"
              alt="Urban cityscape"
              width={260}
              height={320}
              className="fancy-img-content"
            />
          </FloatingElement>

          {/* Bottom Left - Downtown architecture */}
          <FloatingElement depth={1.1} className="fancy-image fancy-img-6">
            <Image
              src="/carousel/PZeSqEBK-RS12147_Kingston-Glamour-Shots-Downtown-1-1024x683.jpg"
              alt="Downtown architecture"
              width={380}
              height={260}
              className="fancy-img-content"
            />
          </FloatingElement>

          {/* Bottom Center - Green space / park */}
          <FloatingElement depth={1.3} className="fancy-image fancy-img-7">
            <Image
              src="/toronto/toronto-sunset-2010.jpg"
              alt="Toronto urban green space"
              width={240}
              height={180}
              className="fancy-img-content"
            />
          </FloatingElement>

          {/* Right Side - Aerial view */}
          <FloatingElement depth={0.95} className="fancy-image fancy-img-8">
            <Image
              src="/toronto/toronto-skyline-canada7.jpg"
              alt="Toronto aerial view"
              width={300}
              height={220}
              className="fancy-img-content"
            />
          </FloatingElement>
        </Floating>

        {/* Center Content */}
        <div className="fancy-center-content">
          <h1 className="fancy-title">
            reimagine<span className="fancy-dot">.</span>
          </h1>
          <p className="fancy-tagline">Toronto Digital Planning Studio</p>
          <Link href="#demo" className="fancy-cta-btn">
            Experience the Platform
          </Link>
        </div>
      </section>

      {/* Interactive Demo Section with Tablet */}
      <div id="demo">
        <ContainerScroll
        titleComponent={
          <div className="tablet-header-section">
            <p className="tp-section-label">Interactive Platform</p>
            <h2 className="tablet-title">
              Experience the future of urban planning
            </h2>
            <p className="tablet-subtitle">
              Navigate through our tools to design, simulate, and optimize Toronto&apos;s urban landscape
            </p>
          </div>
        }
      >
        <div className="tablet-interface">
          {/* Navigation Buttons - Top Bar */}
          <div className="tablet-nav-bar">
            <Link href="/" className="tablet-nav-btn tablet-nav-btn-home">
              <Home size={16} />
              <span>Home</span>
            </Link>
            <Link href="/map" className="tablet-nav-btn tablet-nav-btn-map">
              <MapPin size={16} />
              <span>Live Map</span>
            </Link>
            <Link href="/editor" className="tablet-nav-btn tablet-nav-btn-editor">
              <Building2 size={16} />
              <span>3D Editor</span>
            </Link>
            <Link href="/map" className="tablet-nav-btn tablet-nav-btn-analytics">
              <BarChart3 size={16} />
              <span>Analytics</span>
            </Link>
          </div>

          {/* Demo Content Area - Empty for now */}
          <div className="tablet-demo-area">
            <div className="demo-placeholder">
              <div className="demo-placeholder-icon">🎬</div>
              <p className="demo-placeholder-text">Demo content coming soon</p>
              <p className="demo-placeholder-subtext">Interactive visualization will appear here</p>
            </div>
          </div>

          {/* Powered By Section - Bottom */}
          <div className="tablet-footer">
            <div className="powered-by-label">POWERED BY</div>
            <div className="powered-by-logos">
              <div className="powered-by-item">
                <span className="powered-logo">✨</span>
                <span className="powered-name">Google Gemini</span>
              </div>
              <div className="powered-by-divider">·</div>
              <div className="powered-by-item">
                <span className="powered-logo">🎙️</span>
                <span className="powered-name">ElevenLabs</span>
              </div>
              <div className="powered-by-divider">·</div>
              <div className="powered-by-item">
                <span className="powered-logo">🗺️</span>
                <span className="powered-name">OpenStreetMap</span>
              </div>
              <div className="powered-by-divider">·</div>
              <div className="powered-by-item">
                <span className="powered-logo">🎨</span>
                <span className="powered-name">Three.js</span>
              </div>
            </div>
          </div>
        </div>
      </ContainerScroll>
      </div>

      {/* Features Section */}
      <section className="tp-features-section">
        <motion.div
          className="tp-features-grid"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <motion.div
            className="tp-feature-card"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: 0.1 }}
          >
            <div className="tp-feature-icon">📍</div>
            <h3>Interactive Map</h3>
            <p>Explore Toronto in 3D. Place buildings, analyze traffic, and simulate urban growth in real-time.</p>
            <Link href="/map" className="tp-feature-link">Explore Map →</Link>
          </motion.div>

          <motion.div
            className="tp-feature-card"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: 0.2 }}
          >
            <div className="tp-feature-icon">🏗️</div>
            <h3>3D Building Editor</h3>
            <p>Design custom structures with advanced controls. Configure height, materials, and architectural style.</p>
            <Link href="/editor" className="tp-feature-link">Start Building →</Link>
          </motion.div>

          <motion.div
            className="tp-feature-card"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: 0.3 }}
          >
            <div className="tp-feature-icon">📊</div>
            <h3>Impact Analysis</h3>
            <p>Generate environmental reports, track zoning compliance, and measure development impact.</p>
            <Link href="/map" className="tp-feature-link">View Analytics →</Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Bottom CTA */}
      <section className="tp-bottom-cta">
        <div className="tp-bottom-cta-content">
          <h2>From skyline vision to street-level execution.</h2>
          <p>Model impact, compare alternatives, and move from concept to implementation with Toronto&apos;s most advanced digital planning platform.</p>
          <div className="tp-bottom-links">
            <Link href="/map">Open Live Map</Link>
            <Link href="/editor">Start Building</Link>
          </div>
        </div>
        
        <div className="tp-bottom-blueprint">
          <BlueprintCircle className="blueprint-decoration" />
        </div>
      </section>
    </main>
  );
}
