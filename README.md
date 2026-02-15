# GrowthSync – Real-Time Subdivision Impact Simulator

A 3D digital twin platform that allows city planners to test housing proposals inside an existing neighborhood and instantly see projected impacts on traffic congestion, transit load, infrastructure strain, and financial feasibility.

---

## Overview

GrowthSync re-engineers traditional planning review by transforming static development reports into an interactive, scenario-based simulation tool. Instead of reviewing consultant PDFs after the fact, planners can model impacts immediately.

Place a proposed subdivision into the 3D environment, define unit count and housing mix, and watch real-time projections update across transportation, transit, infrastructure, and cost metrics.

---

## Features

- **3D Digital Twin** - Real-time rendering of 4,600+ buildings, roads, and transit infrastructure in the Toronto area
- **Voice-Driven Planning** - Describe developments naturally: *"Add 800 mixed units near transit with 20% townhouses"*
- **Transportation Impact** - Peak hour trip generation, congestion scoring per road segment, color-coded road load visualization
- **Transit Load Analysis** - Population-based rider projections against route capacity with overload indicators
- **Infrastructure Index** - Composite scoring across water, sewer, school capacity, and parkland ratio
- **Financial Projections** - Developer build cost, municipal servicing cost, and development charge recovery estimates
- **AI Constraint Explanation** - Ask *"Why did congestion spike?"* and get causal analysis
- **AI Optimization** - Request *"Keep units at 1,000 but reduce congestion"* for density redistribution suggestions
- **Randomized Building Generation** - Each placed building gets unique dimensions, orientation, roof style, and facade
- **Environmental Reports** - Carbon footprint, noise propagation, habitat, and community impact analysis

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
git clone https://github.com/EVAnunit1307/CHD_city_pathing.git
cd CHD_city_pathing
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
GEMINI_API_KEY=your_gemini_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

### Development

```bash
npm run dev
```

Open [http://localhost:3002](http://localhost:3002) in your browser.

---

## Demo Flow

1. View baseline neighborhood in 3D
2. Add 1,200 detached homes — watch congestion spike, transit underused
3. Switch to transit-oriented mixed density
4. Congestion drops, transit usage increases, infrastructure index stabilizes
5. Generate environmental impact report
6. Ask AI for optimization suggestions

---

## Architecture

```
Voice Input --> Web Speech API --> /api/design --> Gemini 2.5 Flash
                                                       |
                                               3D Building Editor (Three.js)
                                               + AI Sound Effects (ElevenLabs)
                                                       |
                                               3D City Map (traffic, transit, zoning)
                                                       |
                               /api/environmental-report --> Impact Analysis (Gemini)
                               /api/tree-advisor --> Species Recommendations (Gemini)
```

---

## Project Structure

```
├── app/                    # Next.js app router
│   └── api/                # API routes (design, environmental reports, map data)
├── components/             # React components
│   ├── editor/             # Building editor (viewport, controls)
│   └── ThreeMap.tsx        # Main 3D map component
├── lib/                    # Core logic
│   ├── editor/             # Building spec types, geometry builders, randomizer
│   ├── traffic/            # Vehicle behavior, collision, signal coordination
│   ├── buildingRenderer.ts # Building rendering with varied facades
│   ├── projection.ts       # Web Mercator coordinate projection
│   ├── roadNetwork.ts      # Road graph and A* pathfinding
│   └── simulationConfig.ts # Traffic simulation parameters
├── public/ 
│   ├── map-data/           # Pre-processed building, road, and signal data
│   └── sounds/             # AI-generated sound effects
└── scripts/                # Data processing utilities
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| 3D Engine | Three.js, React Three Fiber, Drei |
| AI | Google Gemini 2.5 Flash |
| Voice/Audio | ElevenLabs TTS + Sound Generation, Web Speech API |
| Validation | Zod |
| Geospatial | Turf.js, Web Mercator projection, OpenStreetMap |
| Traffic | A* pathfinding, spatial grid collision, signal coordination |
| Export | GLB (3D model), GeoJSON (geospatial) |

---

## Team

- **Evan Liem**

---

## License

MIT
