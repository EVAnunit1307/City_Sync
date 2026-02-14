# Hero Page Features - Toronto Urban Planning Studio

## 🎨 Visual Elements

### Parallax Floating Effects
- **Blueprint Grid Overlay**: Subtle architectural grid pattern that responds to mouse movement
- **Blueprint Buildings**: Floating architectural diagrams with dimension annotations
- **Blueprint Circles**: Technical compass-style circular elements
- **Blueprint Arrows**: Directional indicators showing expansion/growth
- **Technical Annotations**: Zoning information (MU1, DENSITY: HIGH, HEIGHT: 45M)
- **Sparks & Glows**: Dynamic lighting effects with blue architectural accent colors

### Toronto Imagery
The hero uses Toronto skyline photos with:
- CN Tower views at blue hour
- Waterfront perspectives
- Toronto Islands skyline
- Sunset cityscapes

## 🎯 User Flow - Key Buttons & Navigation

### Primary Navigation (Top Nav Bar)
1. **Explore Map** → `/map` - Opens the interactive 3D Toronto map
2. **3D Builder** → `/editor` - Launches the building editor

### Hero Section CTA
- **"Enter the Studio →"** → `/map` - Main call-to-action button

### Features Section (3 Cards)
1. **Interactive Map Card**
   - Description: Explore Toronto in 3D, place buildings, analyze traffic
   - CTA: "Explore Map →" → `/map`

2. **3D Building Editor Card**
   - Description: Design custom structures with advanced controls
   - CTA: "Start Building →" → `/editor`

3. **Impact Analysis Card**
   - Description: Environmental reports, zoning compliance tracking
   - CTA: "View Analytics →" → `/map`

### Bottom CTA Section
- **"Open Live Map"** → `/map`
- **"Start Building"** → `/editor`

## 🎭 Interactive Elements

### Mouse Parallax
All floating elements respond to mouse movement with varying depth:
- **Depth 0.3-0.8**: Subtle movement (grid, annotations)
- **Depth 0.9-1.2**: Medium movement (chips, buildings)
- **Depth 1.3-1.9**: Strong movement (glows, circles)

### Scroll Animations
- Gallery cards fade and slide up on scroll (staggered timing)
- Feature cards animate in when scrolled into view
- Smooth transitions with viewport detection

## 🎨 Color Scheme
- **Primary Background**: `#efe8dd` (warm beige)
- **Blueprint Accent**: `rgba(100, 180, 255, 0.x)` (architectural blue)
- **Text**: `#16120f` (near black)
- **Muted Text**: `#675b4e` (warm gray)
- **Gold Accent**: `#d2ab63` (premium touch)

## 🏗️ Architecture
- Uses Framer Motion for animations
- Custom Floating context for parallax
- SVG-based blueprint graphics for crisp rendering
- Responsive design with mobile-first approach
- Blueprint elements hidden on mobile for performance

## 📱 Responsive Breakpoints
- **Desktop**: Full experience with all blueprint elements
- **Tablet (< 860px)**: Simplified blueprint overlay
- **Mobile (< 560px)**: Clean hero, stacked features, essential CTAs only

## 🚀 Performance
- Blueprint elements use CSS animations for GPU acceleration
- `will-change-transform` for optimized parallax
- Image optimization with Next.js Image component
- Lazy loading for gallery images
