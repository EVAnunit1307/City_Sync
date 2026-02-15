# Performance Optimization Guide

## Current Performance Bottlenecks

### 1. **Large 3D Model Files (~60 MB)**
- 60+ GLB building files loaded at runtime
- Causes initial load delays of 10-30 seconds
- Blocks page rendering

### 2. **Large JSON Data Files (~10 MB)**
- `buildings-raw.json`: 5.87 MB
- `buildings.json`: 3.3 MB
- Loaded synchronously on page load

### 3. **Heavy Dependencies**
- Three.js bundle: ~600 KB
- Multiple AI SDKs loaded upfront

## Implemented Optimizations

### ✅ Turbopack Enabled
```json
"dev": "next dev -p 3002 --turbo"
```
- **Result**: 5-10x faster hot module replacement
- **Benefit**: Faster development iteration

### ✅ Package Import Optimization
```typescript
experimental: {
  optimizePackageImports: ['three', '@react-three/fiber', '@react-three/drei', 'lucide-react', 'framer-motion'],
}
```
- **Result**: Reduces bundle size by tree-shaking unused exports
- **Benefit**: Faster initial load

### ✅ Webpack Optimization
```typescript
webpack: (config, { isServer }) => {
  config.optimization = {
    ...config.optimization,
    moduleIds: 'deterministic',
  };
  return config;
}
```
- **Result**: Better caching and consistent module IDs
- **Benefit**: Faster rebuilds

## Recommended Future Optimizations

### 1. **Lazy Load 3D Models**

Current issue: All 60+ building models load immediately.

**Solution A: Load on Demand**
```typescript
// Instead of loading all buildings upfront, load them as they come into view
const BuildingModel = dynamic(() => import('./BuildingModel'), {
  loading: () => <mesh><boxGeometry /><meshBasicMaterial color="gray" /></mesh>,
  ssr: false
});
```

**Solution B: Level of Detail (LOD)**
```typescript
// Show simplified boxes for distant buildings, detailed models for near buildings
import { Lod } from '@react-three/drei';

<Lod distances={[0, 50, 100]}>
  <DetailedBuilding />  {/* Close: Full detail */}
  <SimplifiedBox />     {/* Medium: Low poly */}
  <BoundingBox />       {/* Far: Just bounding box */}
</Lod>
```

### 2. **Compress GLB Files**

Current: Average 1 MB per building

**Command to compress:**
```bash
# Install gltf-pipeline
npm install -g gltf-pipeline

# Compress all GLB files
gltf-pipeline -i input.glb -o output.glb -d
```

**Expected**: 50-70% size reduction (60 MB → 18-30 MB)

### 3. **Split JSON Data**

Current: Loading 5.87 MB of building data upfront

**Solution: Split by Region**
```typescript
// Instead of:
import buildings from './map-data/buildings.json';

// Do:
const loadBuildingsForRegion = async (bounds) => {
  const response = await fetch(`/api/buildings?bounds=${bounds}`);
  return response.json();
};
```

### 4. **Enable Service Worker Caching**

```typescript
// next.config.ts
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
});

module.exports = withPWA(nextConfig);
```

**Benefit**: Second load will be instant (cached locally)

### 5. **Use CDN for Static Assets**

Move GLB files to a CDN (Cloudflare, AWS CloudFront):
```typescript
const MODEL_BASE_URL = process.env.NEXT_PUBLIC_CDN_URL || '/map-data/buildings';
const modelPath = `${MODEL_BASE_URL}/${buildingId}.glb`;
```

**Benefit**: Parallel loading, edge caching, faster delivery

## Performance Targets

| Metric | Current | Target | Strategy |
|--------|---------|--------|----------|
| Initial Load | 10-30s | <3s | Lazy loading + compression |
| Dev Server Start | 30-60s | <10s | ✅ Turbopack enabled |
| Hot Reload | 5-10s | <1s | ✅ Turbopack enabled |
| Bundle Size | ~5 MB | <1 MB | Code splitting + tree shaking |
| 3D Models | 60 MB | <5 MB initial | LOD + streaming |

## Quick Wins (Immediate Impact)

1. **✅ Enable Turbopack** (DONE)
   - Run: `npm run dev`
   - Expected: 5-10x faster HMR

2. **Remove Unused Dependencies**
   ```bash
   npm uninstall <unused-package>
   ```

3. **Add Loading States**
   ```typescript
   <Suspense fallback={<LoadingSpinner />}>
     <ThreeMap />
   </Suspense>
   ```

4. **Reduce Building Count**
   - Only load buildings in viewport
   - Use virtual scrolling/culling

## Monitoring

Add performance monitoring:
```typescript
if (typeof window !== 'undefined') {
  console.log('[Perf] Initial Load:', performance.now());
  
  window.addEventListener('load', () => {
    const perfData = performance.getEntriesByType('navigation')[0];
    console.log('[Perf] DOM Load:', perfData.domContentLoadedEventEnd);
    console.log('[Perf] Full Load:', perfData.loadEventEnd);
  });
}
```

## Next Steps

1. Test current improvements: `npm run dev`
2. Measure load time improvement
3. Implement lazy loading for 3D models (highest impact)
4. Compress GLB files with gltf-pipeline
5. Split building data by region

## Commands

```bash
# Development with Turbopack (faster)
npm run dev

# Build for production
npm run build

# Analyze bundle size
npm run build -- --profile
```
