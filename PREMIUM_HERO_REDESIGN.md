# Premium Hero Redesign - GrowthSync

## 🎯 Design Direction: "Digital Twin Precision"

Clean, sophisticated, slightly desaturated palette with focus on architectural massing models, aerial suburban patterns, and technical planning visuals. Premium feel—think Apple keynote meets Bentley Systems.

## 🖼️ Image Selection (6 Premium Technical Images)

All images sourced from Unsplash with proper licensing:

1. **Suburban Development Aerial** - Shows actual subdivision patterns (core use case)
2. **Highway Interchange** - Infrastructure systems, connectivity impact
3. **Architectural Massing Model** - Pure digital twin vibes, planning studies
4. **Transit Infrastructure** - Mobility systems, technical but elegant
5. **Construction Site Aerial** - Development lifecycle, planning to reality
6. **Technical Blueprint** - Planning origins, technical credibility

### Visual Coherence
- ✅ Consistent cool gray/blue palette
- ✅ All images slightly desaturated for unity
- ✅ Mixed scales: aerial + close-up + model
- ✅ Zero touristy skylines
- ✅ Tells story: Plan → Build → Infrastructure → Mobility

## 🎨 Premium Design Features

### Visual Design
- **Rounded corners**: 20px for modern, soft feel
- **Soft shadows**: Multi-layer for depth (4px + 24px)
- **Glass morphism**: Blurred backgrounds, subtle borders (rgba white 8-12%)
- **Dark overlay**: 20-45% black gradient on images for palette unity
- **Subtle borders**: 1px rgba white 10% for definition

### Interactions
- **Slow float animation**: 6s ease-in-out infinite (12px Y-axis)
- **Hover lift**: Translates up 8px + scales 1.02
- **Image zoom**: Scale 1.05 on hover
- **Button arrow**: Slides right 4px on hover

### Typography
- **Headline**: System UI font stack, 700 weight, -0.04em tracking
- **Subtitle**: Technical copy explaining digital twin
- **Location**: "Vaughan, Ontario" in small caps
- **CTA**: "Explore the Platform" with arrow icon

## 📐 Technical Implementation

### File Structure
```
lib/heroImageSet.ts          → Image configuration with metadata
app/page.tsx                 → Hero component implementation
app/globals.css              → Premium styling (.premium-*)
```

### Key Components
- **Image config**: Centralized in `heroImageSet.ts` with id, category, src, alt, focalPosition
- **Responsive tiles**: 6 tiles → 4 (tablet) → 2 (mobile)
- **Performance**: Next.js Image component with proper sizes, lazy loading
- **Animation**: CSS-based for GPU acceleration

### Responsive Breakpoints
- **Desktop (>1200px)**: All 6 tiles visible, full size
- **Tablet (968-1200px)**: 4 tiles, scaled 0.75x
- **Mobile (<968px)**: 2 tiles, scaled 0.5x, reduced opacity

## 🚀 Performance Optimizations
- Next.js `<Image>` with fill + sizes prop
- CSS transforms (GPU accelerated)
- Lazy loading for off-screen images
- Optimized Unsplash URLs (w=800, q=80)
- Reduced tile count (8 → 6) for less DOM weight

## 🎭 Brand Positioning

**Before**: Tourist-y Toronto skyline with casual floating images
**After**: Premium technical platform for municipal engineering professionals

**Tone**: Systems engineering, data-driven, professional, future-forward
**Audience**: City planners, development engineers, municipal staff
**Message**: "This is a serious planning tool, not a consumer app"
