"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { ContainerScroll } from "@/components/ui/container-scroll";
import { MapPin, Building2, BarChart3, Home } from "lucide-react";
import { Hero3D } from "@/components/Hero3D";

export default function Landing() {
  return (
    <main className="premium-page">
      {/* 3D Interactive Hero */}
      <Hero3D />

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
          <h2>From planning vision to implementation.</h2>
          <p>Model subdivision impacts, analyze infrastructure capacity, and move from concept to approval with Vaughan&apos;s digital twin platform.</p>
          <div className="tp-bottom-links">
            <Link href="/map">Open Live Map</Link>
            <Link href="/editor">Start Building</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
