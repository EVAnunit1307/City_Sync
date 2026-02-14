# 3D Toronto Model Command Table Integration

## Overview
Replaced the flat 2D plane with a full 3D GLB model of Toronto to create an immersive "command table" aesthetic inspired by strategic planning interfaces.

## Key Changes

### 1. **3D Model Integration**
- **File**: `public/toronto_ontario_canada.glb`
- Loaded using `GLTFLoader` from Three.js
- Applied grayscale/monochrome treatment for tactical aesthetic
- Model properties:
  - Position: `[0, -2, 0]`
  - Scale: `0.02` (adjustable for optimal viewing)
  - Material overrides: Metalness `0.4`, Roughness `0.7`

### 2. **Camera & Lighting Setup**
- **Camera**: PerspectiveCamera at `[0, 4, 12]` with FOV `55°`
- **Lighting**:
  - Ambient: `0.6` intensity (base visibility)
  - Directional key light: `[10, 15, 10]` at `1.5` intensity with shadows
  - Fill light: `[-8, 8, -5]` at `0.6` intensity
  - Rim spotlight: `[0, 20, -10]` at `0.8` intensity for depth

### 3. **Interactive Rotation**
- Mouse-driven rotation with smooth lerping
- Base tilt: `-0.5` radians for dramatic perspective
- Mouse influence: `0.12` factor for subtle interactive movement
- Smooth interpolation factor: `0.05` for fluid motion

### 4. **Grid Floor (Command Table)**
- Infinite grid using `@react-three/drei`
- Cell size: `1` unit, Section size: `5` units
- Colors: `#333333` (cells), `#444444` (sections)
- Position: `[0, -2, 0]` (same Y as model for grounded look)
- Fade distance: `80` units for seamless horizon

### 5. **Technical UI Overlays**
- Two `Html` overlays with geospatial data:
  - **Left**: `LAT: 43.6532° N`, `LNG: 79.3832° W`
  - **Right**: `TORONTO METRO`, `SCALE: 1:50000`
- Styling:
  - Courier New monospace font
  - Cyan glow: `rgba(100, 180, 255, 0.85)`
  - Text shadow with blur for holographic effect
  - Semi-transparent black background with border

### 6. **Visual Enhancements**
- **Background**: Pure black `#000000`
- **Overlay gradients**: Radial and linear for depth and focus
- **Grid pattern**: Subtle repeating lines (`rgba(50, 120, 200, 0.03)`)
- **Cursor**: Changed to `crosshair` for tactical feel
- **Typography**: Cyan glow on title with multiple text-shadow layers

## Material Treatment
```typescript
// Applied to all mesh materials in the GLB
material.color = new THREE.Color(0.6, 0.6, 0.6);  // Grayscale
material.emissive = new THREE.Color(0.05, 0.05, 0.08);  // Subtle blue tint
material.metalness = 0.4;
material.roughness = 0.7;
```

## Design Philosophy
- **Command Center Aesthetic**: Dark, tactical interface with holographic elements
- **Strategic Planning**: Overhead view of city model like a planning table
- **Interactive Control**: Mouse-driven rotation gives sense of control/exploration
- **Technical Data**: Overlays provide context and reinforce the analytical nature
- **Monochrome Foundation**: Grayscale model keeps focus on data and structure

## Performance Considerations
- GLB model is optimized for web (check file size)
- Material overrides applied once on mount (not per frame)
- Lerp smoothing reduces jitter and creates natural motion
- Grid uses `infiniteGrid` for seamless performance
- Shadows enabled on key light only (not all lights)

## Future Enhancements
- LOD (Level of Detail) for large models
- Animated scan lines or pulse effects
- Interactive hotspots on specific city regions
- Toggle between different city models
- Real-time data visualization overlays
