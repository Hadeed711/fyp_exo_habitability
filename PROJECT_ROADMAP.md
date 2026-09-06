# 🚀 AI Exoplanet Habitability Explorer
## Complete Project Roadmap (Optimized for FYP)

**Team**: Hadeed Ahmad (2022-ag-7746) & Tahzeeb Arif (2022-ag-8065)  
**Supervisor**: Mam Nabeela Ashraf  
**Methodology**: Hybrid Agile Incremental Model  
**Figma Design**: [View Design](https://www.figma.com/design/2QXPVY8TaQ9rnijVXoFshZ/FYP?node-id=0-1&t=I6eYn7ZZr1BrVKQB-1)

---

## 📍 CURRENT STATUS: Deployed — Phases 1–9 Complete

### ✅ **COMPLETED**:
- ✅ **Phase 1**: Data preprocessing — 9,614 rows processed from K2, Kepler, TESS
- ✅ **Phase 2**: ML Models — 6 models trained, ensemble created, habitability scorer complete
- ✅ **Phase 3**: Backend API — all endpoints complete
  - ✅ Django REST Framework setup
  - ✅ Neon PostgreSQL with **8,245 unique exoplanets** loaded
    (9,614 CSV rows de-duplicate on planet name: K2 568 + Kepler 2,742 + TESS 4,935)
  - ✅ Planets API: list, filter, search, compare, stats
  - ✅ Predictions API: single, batch, explain, model info, health
  - ✅ All models and scalers integrated
- ✅ **Phase 4**: Frontend — Home, Explore, Planet Detail, Compare, Learn, Upload, About,
  Login, Sign-in, 404
- ✅ **Phase 5**: 3D Visualization — orbital viewer, Solar System viewer, habitable-zone ring
- ✅ **Phase 6**: AI Explainability — `/api/explain/` with SHAP + LIME + physics fallback
- ✅ **Phase 7**: Authentication — JWT register/login/me/logout, saved predictions per user
- ✅ **Phase 8**: Testing — pytest suite green (12 tests), manual checklist in TESTING_GUIDE.md
- ✅ **Phase 9**: Deployment — backend on Railway, frontend on Vercel, database on Neon
- ✅ **ARIA chatbot** — Groq Cloud (Llama 3.3 70B), available on every page

### ⬅️ **CURRENT FOCUS**:
**Phase 10**: Documentation and the FYP report. Code documentation is done —
every README listed in Step 10.1 now exists. Remaining: the written report,
presentation slides and demo video.

### 🔧 Known issues / deferred

| Item | Detail |
|---|---|
| Bundle size | One ~1.87 MB JS chunk. Route-level `React.lazy` around the 3D viewers is the fix if it matters |
| `/api/auth/logout/` | Cannot revoke tokens — `token_blacklist` is not in `INSTALLED_APPS`. Returns 200 regardless |
| Minority-class ML metrics | Headline accuracy is weighted; per-class F1 for POTENTIALLY_HABITABLE is weak on K2/TESS. Mitigated by the 90% physics weighting — see `models/README.md` |
| `backend/api/` app | Not in `INSTALLED_APPS`; exists only as the import path for `habitability_scorer.py`. Its `views.py`/`urls.py` are superseded by `predictions/` |

---

## 🎨 FIGMA DESIGN STRUCTURE

### Main Navigation Pages:
1. **Home** ✅ - Landing page (COMPLETE)
2. **Explore** ✅ - Main project page (COMPLETE)
3. **Compare** ✅ - Compare multiple planets
4. **About** ✅ - Project information

### 📊 EXPLORE Page Layout (The Backbone):
The Explore page is the **heart of the application** where everything comes together:

```
┌─────────────────────────────────────────────────────────────┐
│                    NAVBAR (Home, Explore, Compare, About)   │
├─────────────────────────────────────────────────────────────┤
│  🔍 Search Bar                    🎛️ Filters Panel         │
├──────────────────────────┬──────────────────────────────────┤
│                          │                                  │
│   🪐 3D ORBITAL VIEWER   │   📋 PLANET RESULTS GRID        │
│                          │                                  │
│   (Three.js animation    │   • Planet cards with data      │
│    showing selected      │   • Click → Planet detail page  │
│    planet's orbit)       │   • Habitability scores         │
│                          │                                  │
├──────────────────────────┴──────────────────────────────────┤
│   🎯 PREDICTION PANEL (Toggleable)                         │
│   • Input sliders for custom planet parameters             │
│   • Real-time habitability prediction                      │
│   • Results display with AI insights                       │
└─────────────────────────────────────────────────────────────┘
```

**Key Integration**: Prediction functionality is **embedded in Explore page**, not a separate page.

---

## � DATA FLOW: How Backend ↔ Frontend Connect

### Backend APIs (Already Built & Working):

#### **Planets API** (`backend/planets/`)
```javascript
GET  /api/planets/                     // List all 9,614 exoplanets (paginated)
GET  /api/planets/{id}/                // Get specific planet details
GET  /api/planets/habitable/           // Filter habitable planets only
GET  /api/planets/stats/               // Dataset statistics
GET  /api/missions/                    // List missions (K2, Kepler, TESS)

// Query Parameters for filtering:
?mission=kepler                        // Filter by mission
?habitability=POTENTIALLY_HABITABLE    // Filter by class
?min_radius=0.8&max_radius=1.5         // Size range
?min_temp=250&max_temp=350             // Temperature range
?q=earth                               // Search by name
```

#### **Predictions API** (`backend/api/` & `backend/predictions/`)
```javascript
POST /api/predict/                     // Predict habitability for custom planet
     Request: { pl_rade: 1.2, pl_eqt: 288, st_teff: 5778, ... }
     Response: { 
       habitability_score: 0.78,
       classification: "POTENTIALLY_HABITABLE",
       probabilities: {...},
       esi_components: {...}
     }

GET  /api/models/info/                 // ML model metadata
GET  /api/health/                      // API health check
```

### Frontend Components → API Connections:

```
┌─────────────────────────────────────────────────────────────┐
│ EXPLORE PAGE                                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Search Bar ────────→ GET /api/planets/?q={query}          │
│                                                             │
│  Filters Panel ─────→ GET /api/planets/?mission=kepler&... │
│                                                             │
│  Planet Results ←───── Response: { results: [...] }        │
│    Grid                                                     │
│                                                             │
│  Click Planet ──────→ GET /api/planets/{id}/               │
│    Card                                                     │
│                 ←───── Navigate to Planet Detail Page      │
│                                                             │
│  3D Orbital ←────────── Planet data from API               │
│    Viewer              (orbital period, radius, etc.)       │
│                                                             │
│  Prediction ────────→ POST /api/predict/                   │
│    Panel               (user inputs custom values)          │
│                                                             │
│           ←────────── Habitability score + insights        │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 CLEAR DEVELOPMENT WORKFLOW

### ✅ **COMPLETED PHASES**:

<details>
<summary><b>Phase 1: Data Preprocessing (Module 1)</b> ✅</summary>

- ✅ 9,614 exoplanets processed from K2, Kepler, TESS
- ✅ Habitability classification system
- ✅ Features engineered (ESI, HZ flags, stellar types)
- ✅ Train/Val/Test splits (60/20/20)
- ✅ Scalers and encoders saved as artifacts
</details>

<details>
<summary><b>Phase 2: ML Model Development (Module 2)</b> ✅</summary>

- ✅ 6 classification models trained (Random Forest, XGBoost, Neural Networks)
- ✅ Model comparison and ensemble creation
- ✅ Habitability scorer implemented
- ✅ F1-score > 0.70 achieved
- ✅ All models saved and ready for deployment
</details>

<details>
<summary><b>Phase 3: Backend API Development (Module 3)</b> ✅ 98% COMPLETE</summary>

- ✅ Django REST Framework setup
- ✅ Neon PostgreSQL with 8,245 unique exoplanets (from 9,614 processed rows)
- ✅ `planets` app: List, filter, search, stats endpoints
- ✅ `predictions` app: AI prediction with ML models integrated
- ✅ Models: Mission, Exoplanet, PredictionHistory, SimulationHistory
- ✅ CORS configured for React frontend
- ✅ API fully tested and working
</details>

---

> 📘 **HISTORICAL SECTION — Phases 4 to 9 below are the original build
> instructions, kept as a record of how the project was planned and executed.
> All of this work is complete. They are NOT a to-do list. For what the system
> actually does today, read
> [PROJECT_UNDERSTANDING_GUIDE.md](./PROJECT_UNDERSTANDING_GUIDE.md); for what
> remains, see [Remaining Work](#-remaining-work) at the end of this file.**

## 🎯 Phase 4: Frontend UI Development (Module 4) — ✅ COMPLETE

**Goal**: Build React components based on Figma design and connect to backend API

**Outcome**: All pages shipped — Home, Explore, Planet Detail, Compare, Learn,
Upload, About, Login, Sign-in and a 404 route.

---

### Step 4.2: Build Explore Page (PRIMARY FOCUS) — ✅ done

The Explore page is the **backbone of the entire project**. It combines:
- Search & Filters
- 3D Orbital Visualization
- Planet Results Grid
- Integrated Prediction Panel

#### **Component Breakdown:**

**1. ExplorePlanets.jsx** (Main Page)
```javascript
// Location: frontend/src/pages/ExplorePlanets.jsx

┌────────────────────────────────────────────┐
│  Layout Structure:                         │
│  • SearchBar component                     │
│  • FiltersPanel component                  │
│  • Two-column layout:                      │
│    - Left: OrbitalViewer3D component       │
│    - Right: PlanetGrid component           │
│  • Collapsible PredictionPanel component   │
└────────────────────────────────────────────┘
**Tasks to Complete:**

**2. SearchBar Component**
```javascript
// Location: frontend/src/components/SearchBar.jsx

Features:
- Real-time search input
- Debounced API calls (wait 300ms after typing stops)
- Search suggestions dropdown
- Clear button
- Search history (localStorage)

API Connection:
  GET /api/planets/?q={searchQuery}

State Management:
- Query string
- Search results
- Loading state
- Selected planet (navigate to detail)
```

**3. FiltersPanel Component**
```javascript
// Location: frontend/src/components/FiltersPanel.jsx

Filter Options Based on API:
1. Mission Filter (K2, Kepler, TESS)
   - Checkboxes for each mission
   - API: ?mission=kepler

2. Habitability Class
   - Potentially Habitable
   - Habitability Zone
   - Non-Habitable
   - API: ?habitability=POTENTIALLY_HABITABLE

3. Radius Range Slider
   - Min: 0.5, Max: 2.0 Earth radii
   - API: ?min_radius=0.8&max_radius=1.5

4. Temperature Range Slider
   - Min: 200K, Max: 400K
   - API: ?min_temp=250&max_temp=350

5. Sort Options
   - Habitability score (high to low)
   - Temperature (Earth-like first)
   - Planet name (A-Z)
   - Discovery year (newest first)

State Management:
- All filter values
- Apply/Reset buttons
- Filter count badge
```

**4. PlanetGrid Component**
```javascript
// Location: frontend/src/components/PlanetGrid.jsx

Features:
- Grid layout (responsive: 3 cols desktop, 2 tablet, 1 mobile)
- PlanetCard components for each planet
- Pagination controls
- Loading skeleton cards
- Empty state message
- Select planet → Update 3D viewer
- Click planet card → Navigate to detail page

API Connection:
  GET /api/planets/?page=1&page_size=50
  (with filters applied from FiltersPanel)

Data Display Per Card:
- Planet name
- Mission badge
- Habitability score (0-1) with color indicator
- Temperature (K)
- Radius (Earth radii)
- Stellar type
- "View Details" button
```

**5. PlanetCard Component**
```javascript
// Location: frontend/src/components/PlanetCard.jsx

Card Design:
┌─────────────────────────────┐
│  🪐 Planet Name             │
│  [K2] Mission Badge         │
│                             │
│  ⭐ Habitability: 0.78      │
│  🌡️  Temp: 288 K           │
│  📏 Radius: 1.2 R⊕         │
│  ☀️  Star: G-type           │
│                             │
│  [View Details →]           │
└─────────────────────────────┘

Interactions:
- Hover: Elevate card, show glow
- Click card: Navigate to /planets/{id}
- Click anywhere on card → Select in 3D viewer
- Habitability color coding (thresholds per habitability_scorer.py):
  • Green  (>= 0.66)     - POTENTIALLY_HABITABLE
  • Yellow (0.30 - 0.65) - HABITABILITY_ZONE
  • Red    (< 0.30)      - NON_HABITABLE
```

**6. OrbitalViewer3D Component**
```javascript
// Location: frontend/src/components/OrbitalViewer3D.jsx

Technology: Three.js + React Three Fiber (@react-three/fiber)

Features:
- 3D visualization of planet orbiting its star
- Display selected planet from PlanetGrid
- Orbital path visualization (ellipse based on eccentricity)
- Planet size relative to Earth
- Star size and color based on stellar type
- Rotation and orbit animation
- Camera controls (orbit, zoom, pan)
- Info tooltip on hover
- Toggle animation play/pause
- Speed controls (1x, 5x, 10x)

Data from API:
- pl_orbper (orbital period) → orbit speed
- pl_orbsmax (semi-major axis) → orbit size
- pl_orbeccen (eccentricity) → orbit shape
- pl_rade (planet radius) → planet size
- st_teff (stellar temp) → star color
- st_rad (stellar radius) → star size

Implementation Notes:
- Use Canvas from @react-three/fiber
- Use OrbitControls from @react-three/drei
- Create sphere geometry for planet
- Create ellipse curve for orbital path
- Add ambient + point lights
- Performance: 60 FPS target
```

**7. PredictionPanel Component**
```javascript
// Location: frontend/src/components/PredictionPanel.jsx

Layout:
┌────────────────────────────────────────┐
│  🎯 Predict Custom Planet Habitability │
│  [Collapse ▼]                          │
├────────────────────────────────────────┤
│  Input Sliders:                        │
│  • Planet Radius (0.5 - 2.0 R⊕)       │
│  • Temperature (200 - 400 K)           │
│  • Insolation (0.1 - 2.0 S⊕)          │
│  • Orbital Period (10 - 500 days)      │
│  • Star Temperature (3000 - 7000 K)    │
│  • Star Radius (0.5 - 2.0 R☉)         │
│  • Star Mass (0.5 - 2.0 M☉)           │
│                                        │
│  [Predict] [Reset] buttons             │
├────────────────────────────────────────┤
│  Results (after prediction):           │
│  • Habitability Score: 0.78 (78%)     │
│  • Classification: POTENTIALLY_HABITABLE│
│  • Confidence gauge                    │
│  • Contributing factors chart          │
│  • Earth comparison                    │
└────────────────────────────────────────┘

API Connection:
  POST /api/predict/
  Request: { pl_rade, pl_eqt, st_teff, ... }
  Response: { habitability_score, classification, ... }

Features:
- Collapsible panel (toggle button)
- Input validation (min/max ranges)
- Real-time visual feedback
- Loading state during prediction
- Error handling
- Copy/share results button
- "Load example planet" presets
```

**8. API Service Setup**
```javascript
// Location: frontend/src/services/api.js

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const planetsAPI = {
  // Get all planets with filters
  getPlanets: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await axios.get(`${API_BASE}/planets/?${params}`);
    return response.data;
  },
  
  // Get single planet details
  getPlanet: async (id) => {
    const response = await axios.get(`${API_BASE}/planets/${id}/`);
    return response.data;
  },
  
  // Get habitable planets only
  getHabitablePlanets: async () => {
    const response = await axios.get(`${API_BASE}/planets/habitable/`);
    return response.data;
  },
  
  // Get statistics
  getStats: async () => {
    const response = await axios.get(`${API_BASE}/planets/stats/`);
    return response.data;
  },
  
  // Search planets
  searchPlanets: async (query) => {
    const response = await axios.get(`${API_BASE}/planets/?q=${query}`);
    return response.data;
  }
};

export const predictionAPI = {
  // Predict habitability
  predict: async (planetParams) => {
    const response = await axios.post(`${API_BASE}/predict/`, planetParams);
    return response.data;
  },
  
  // Get model info
  getModelInfo: async () => {
    const response = await axios.get(`${API_BASE}/models/info/`);
    return response.data;
  }
};

// Error handler
axios.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);
```

**Development Steps for Explore Page:**

```
Step 1: Create API Service ✅
  └─ frontend/src/services/api.js

Step 2: Build Basic Components (No styling yet)
  ├─ SearchBar.jsx - just input + onChange
  ├─ FiltersPanel.jsx - checkboxes and sliders
  ├─ PlanetCard.jsx - display planet data
  └─ PlanetGrid.jsx - map over cards

Step 3: Test API Connections
  └─ Verify data flows from backend to components

Step 4: Build ExplorePlanets Page
  └─ Combine all components in layout

Step 5: Add 3D Viewer
  └─ OrbitalViewer3D.jsx with Three.js

Step 6: Add Prediction Panel
  └─ PredictionPanel.jsx with sliders

Step 7: Polish with Tailwind CSS
  └─ Add animations, hover effects, colors

Step 8: Testing & Refinement
  └─ Test all interactions, fix bugs
```

---

### Step 4.3: Planet Detail Page

**Location**: `frontend/src/pages/PlanetDetail.jsx`

**Purpose**: Show comprehensive information about a single exoplanet

**Layout:**
```
┌──────────────────────────────────────────────┐
│  ← Back to Explore                           │
├──────────────────┬───────────────────────────┤
│                  │  🪐 Kepler-452b           │
│   3D PLANET      │  Mission: Kepler          │
│   VISUALIZATION  │                           │
│   (Larger view)  │  Habitability: 0.83       │
│                  │  Classification:          │
│                  │  POTENTIALLY_HABITABLE    │
│                  │                           │
├──────────────────┴───────────────────────────┤
│  📊 PARAMETERS TABLE                         │
│  ┌──────────────┬────────────┬─────────────┐ │
│  │ Parameter    │ Value      │ Earth = 1.0 │ │
│  ├──────────────┼────────────┼─────────────┤ │
│  │ Radius       │ 1.6 R⊕    │ 1.6x        │ │
│  │ Temperature  │ 265 K      │ 0.92x       │ │
│  │ Insolation   │ 1.1 S⊕    │ 1.1x        │ │
│  │ Orbital Per. │ 385 days   │ 1.05x       │ │
│  └──────────────┴────────────┴─────────────┘ │
├──────────────────────────────────────────────┤
│  🎯 HABITABILITY BREAKDOWN                   │
│  • Temperature Score: 0.92 ████████▌        │
│  • Size Score: 0.78 ███████▊                │
│  • Orbit Score: 0.85 ████████▍               │
│  • Overall ESI: 0.83 ████████▎               │
├──────────────────────────────────────────────┤
│  🌍 EARTH COMPARISON (Radar Chart)          │
│  📈 ORBITAL DIAGRAM                          │
│  ⭐ STELLAR PROPERTIES                       │
│  📚 DISCOVERY INFORMATION                    │
└──────────────────────────────────────────────┘
```

**Components Needed:**
- `PlanetVisualization3D.jsx` - Larger 3D view
- `ParametersTable.jsx` - Data table
- `HabitabilityBreakdown.jsx` - Score breakdown
- `EarthComparison.jsx` - Comparison charts
- `OrbitalDiagram.jsx` - 2D orbit sketch

**API Connection:**
```javascript
GET /api/planets/{id}/
Response: Full planet details with all parameters
```

---

### Step 4.4: Compare Page

**Location**: `frontend/src/pages/ComparePlanets.jsx`

**Purpose**: Side-by-side comparison of multiple planets (2-4 planets)

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  Select Planets to Compare:                         │
│  [Search & Select...] [+Add Planet]                 │
├───────────────┬───────────────┬──────────────────────┤
│  Planet 1     │  Planet 2     │  Planet 3            │
│  Kepler-452b  │  TRAPPIST-1e  │  Proxima Cen. b     │
│               │               │                      │
│  Score: 0.83  │  Score: 0.76  │  Score: 0.71        │
├───────────────┴───────────────┴──────────────────────┤
│  📊 COMPARISON CHART (Radar/Bar Chart)              │
│  • Radius comparison                                │
│  • Temperature comparison                           │
│  • Habitability scores                              │
│  • Orbital parameters                               │
├─────────────────────────────────────────────────────┤
│  📋 PARAMETER TABLE (Side-by-Side)                  │
│  Parameter    │ Planet 1  │ Planet 2  │ Planet 3    │
│  ─────────────┼───────────┼───────────┼───────────  │
│  Radius       │ 1.6 R⊕   │ 0.92 R⊕  │ 1.17 R⊕    │
│  Temperature  │ 265 K     │ 251 K     │ 234 K       │
│  ...          │ ...       │ ...       │ ...         │
└─────────────────────────────────────────────────────┘
```

**Features:**
- Select up to 4 planets
- Visual comparison with charts (Chart.js or D3)
- Highlight differences
- Export comparison as image/PDF
- Share comparison link

**API Connection:**
```javascript
GET /api/planets/{id1}/
GET /api/planets/{id2}/
GET /api/planets/{id3}/
// Make multiple API calls and combine data
```

---

### Step 4.5: About Page

**Location**: `frontend/src/pages/About.jsx`

**Purpose**: Project information, team, methodology, datasets

**Sections:**
1. **Project Overview**
   - FYP title and description
   - Objectives
   - Problem statement

2. **Team Information**
   - Hadeed Ahmad (2022-ag-7746)
   - Tahzeeb Arif (2022-ag-8065)
   - Supervisor: Mam Nabeela Ashraf

3. **Methodology**
   - Hybrid Agile Incremental Model
   - Development phases
   - Technologies used

4. **Datasets**
   - K2 Mission (X planets)
   - Kepler Mission (X planets)
   - TESS Mission (X planets)
   - Data sources and references

5. **Machine Learning Models**
   - Model types used
   - Performance metrics
   - Training approach

6. **Contact & Resources**
   - GitHub repository
   - Documentation links
   - Citations

**API Connection:**
```javascript
GET /api/planets/stats/
// Display dataset statistics
```

---

### Step 4.6: Additional Components

**Global Components:**

**1. Navbar Component** ✅ (Already exists)
- Update navigation links
- Add active state styling
- Mobile responsive

**2. Footer Component** ✅ (Already exists)
- Copyright information
- Links to pages
- Social media (optional)

**3. LoadingSpinner Component**
```javascript
// frontend/src/components/LoadingSpinner.jsx
// Used throughout app for loading states
```

**4. ErrorMessage Component**
```javascript
// frontend/src/components/ErrorMessage.jsx
// Consistent error display
```

**5. HabitabilityBadge Component**
```javascript
// Color-coded badge for habitability classification
// POTENTIALLY_HABITABLE = Green
// HABITABILITY_ZONE = Yellow
// NON_HABITABLE = Red
```

---

### Step 4.7: React Router Setup

**Update App.jsx with Routes:**

```javascript
// frontend/src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import ExplorePlanets from './pages/ExplorePlanets';
import PlanetDetail from './pages/PlanetDetail';
import ComparePlanets from './pages/ComparePlanets';
import About from './pages/About';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<ExplorePlanets />} />
            <Route path="/planets/:id" element={<PlanetDetail />} />
            <Route path="/compare" element={<ComparePlanets />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
```

---

### 📅 Step-by-Step Implementation Order

**Week 1: Explore Page Foundation**
```
Day 1-2: API Service & Basic Components
  ✓ Create api.js service
  ✓ Build SearchBar (basic)
  ✓ Build FiltersPanel (basic)
  ✓ Build PlanetCard (basic)
  ✓ Build PlanetGrid (basic)
  ✓ Test API connections

Day 3-4: Explore Page Assembly
  ✓ Create ExplorePlanets.jsx
  ✓ Integrate components
  ✓ Connect to backend API
  ✓ Add pagination
  ✓ Test filtering and search

Day 5-7: 3D Visualization
  ✓ Set up Three.js
  ✓ Create OrbitalViewer3D
  ✓ Add planet orbit animation
  ✓ Connect to selected planet data
  ✓ Add controls (zoom, rotate, speed)
```

**Week 2: Prediction & Styling**
```
Day 1-2: Prediction Panel
  ✓ Build PredictionPanel component
  ✓ Input sliders with validation
  ✓ Connect to /api/predict/
  ✓ Display results beautifully
  ✓ Add loading states

Day 3-5: Polish Explore Page
  ✓ Tailwind CSS styling
  ✓ Animations and transitions
  ✓ Responsive design
  ✓ Loading skeletons
  ✓ Error handling

Day 6-7: Testing
  ✓ Test all features
  ✓ Fix bugs
  ✓ Performance optimization
```

**Week 3: Other Pages**
```
Day 1-3: Planet Detail Page
  ✓ Build PlanetDetail.jsx
  ✓ Parameters table
  ✓ Charts and visualizations
  ✓ 3D viewer integration

Day 4-5: Compare Page
  ✓ Build ComparePlanets.jsx
  ✓ Multi-planet selection
  ✓ Comparison charts
  ✓ Side-by-side table

Day 6-7: About Page + Polish
  ✓ Build About.jsx
  ✓ Final styling touches
  ✓ Cross-browser testing
```

---

## 🎯 Phase 5: 3D Visualization Enhancement (Optional)

**Status**: Partially implemented - core features complete, advanced features deferred

### Implemented Features ✅
- ✅ **Better textures for planets** - Temperature-based textures (frozen <180K, ice 180-250K, lava >900K, gas giants, habitable Earth-like)
- ✅ **Habitable zone visualization** - Green ring around star showing the "Goldilocks zone" (toggleable via "HZ Ring" button)
- ✅ **Enhanced atmospheric layers** - Triple-layer atmosphere effect (outer, mid, inner) with depth-based opacity
- ✅ **Star color based on temperature** - Dynamic star colors from red dwarf to blue-white based on `st_teff` field
- ✅ **Zoom to planet surface view** - "Surface" button for close-up inspection when planet is selected

### Deferred Features (Not Yet Implemented)
- ⬜ **Multiple planets in same system** - Currently shows mixed planets from different systems (requires backend API grouping by hostname)
- ⬜ **VR/AR mode** - Advanced feature requiring @react-three/xr and VR hardware testing

### 🔍 How the 28 Planet Display Works

**The 3D viewer renders up to 28 planets dynamically based on current filters:**

1. **Dynamic fetching**: When you open the 3D viewer, it fetches planets using the **same filters and search query** from the Explore page
   - Applies mission filter (Kepler, K2, TESS)
   - Applies habitability class filter
   - Applies search query if present
   - Fetches 30 planets, displays top 28

2. **Sorting priority**: Planets are sorted by habitability class before display:
   - POTENTIALLY_HABITABLE (green) rendered first
   - HABITABILITY_ZONE (yellow) rendered second
   - NON_HABITABLE (red) rendered last

3. **Changes when**:
   - ✅ You change filters on Explore page → close and reopen 3D viewer to refresh
   - ✅ You search for specific planets → 3D viewer shows matching results
   - ✅ You filter by mission (Kepler/TESS/K2) → 3D viewer updates accordingly

4. **Fallback**: If API fails or returns no results, displays 4 demo planets (Kepler-442b, Kepler-62f, Kepler-6b, TOI-700d)

**Example scenarios:**
- Filter "Potentially Habitable" → See up to 28 green planets orbiting
- Search "Kepler-442" → See planets matching that search
- No filters → See top 28 most habitable planets from database
- Filter "TESS mission" → See planets discovered by TESS only

**Note**: Currently shows planets from **different star systems** orbiting the same central star (comparative visualization). True multi-system support would require grouping planets by hostname and rendering multiple star systems.

---

## 🎯 Phase 6: AI Explainability (Optional Enhancement)

**Priority**: LOW - Nice to have, not critical for FYP

**Current Implementation Status (April 2026):**
- ✅ `POST /api/explain/` implemented and working
- ✅ Supports `explanation_method`: `auto`, `shap`, `lime`, `fallback`
- ✅ Prediction panel shows explanation method, natural language explanation, and feature importance

If you want to add "Why this score?" feature to explain AI predictions:

**Backend Enhancement:**
```python
# Add SHAP explainability to predictions/ai_service.py
import shap

def explain_prediction(planet_params, model):
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(planet_params)
    return {
        'feature_importance': dict(zip(features, shap_values[0])),
        'explanation': generate_natural_language_explanation(shap_values)
    }
```

**Frontend Component:**
```javascript
// components/AIExplanation.jsx
// Show "Why this score?" breakdown
// Feature importance visualization
// Natural language explanation
```

**Skip this if time is limited** - Focus on core features first.

---

## 🎯 Phase 7: User Authentication (Optional)

**Purpose**: Allow users to save their prediction simulations

**Backend (Already Built):**
- ✅ `User` model exists
- ✅ `PredictionHistory` model exists
- ✅ `SimulationHistory` model exists
- ⚠️ Authentication API endpoints in `users` app are still placeholders and need implementation

**To Implement (if needed):**

**1. Backend Endpoints:**
```python
# users/views.py
POST /api/auth/register/    # User registration
POST /api/auth/login/       # JWT login
POST /api/auth/logout/      # Logout

# predictions/views.py
POST /api/simulations/save/           # Save prediction
GET  /api/simulations/                # Get user's saved simulations
DELETE /api/simulations/{id}/delete/  # Delete simulation
```

**2. Frontend Pages:**
```javascript
// pages/Login.jsx
// pages/Register.jsx
// pages/UserDashboard.jsx - Show saved simulations
```

**3. Protected Routes:**
```javascript
// Save simulation button appears only when logged in
// Dashboard page requires authentication
```

**Decision Point**: Check with supervisor if user accounts are required for FYP. If not, **skip this phase** and focus on core features.

---

## 🎯 Phase 8: Testing & Quality Assurance

### Step 8.1: Backend Testing

**Test Endpoints:**
```bash
# Test prediction API
curl -X POST http://localhost:8000/api/predict/ \
  -H "Content-Type: application/json" \
  -d '{"pl_rade": 1.2, "pl_eqt": 288, "st_teff": 5778}'

# Test planets list
curl http://localhost:8000/api/planets/

# Test filters
curl http://localhost:8000/api/planets/?mission=kepler&habitability=POTENTIALLY_HABITABLE
```

**Unit Tests (if time permits):**
```python
# backend/api/tests.py
from django.test import TestCase
from rest_framework.test import APIClient

class PlanetsAPITest(TestCase):
    def test_get_planets_list(self):
        response = self.client.get('/api/planets/')
        self.assertEqual(response.status_code, 200)
    
    def test_prediction(self):
        data = {'pl_rade': 1.2, 'pl_eqt': 288, 'st_teff': 5778}
        response = self.client.post('/api/predict/', data)
        self.assertEqual(response.status_code, 200)
        self.assertIn('habitability_score', response.data)
```

### Step 8.2: Frontend Testing

**Manual Testing Checklist:**
- [x] Home page loads correctly
- [x] Explore page shows planets from API
- [x] Search works
- [x] Filters apply correctly
- [x] Planet cards display data
- [x] Click planet → Navigate to detail page
- [ ] 3D viewer animates smoothly (60 FPS)
- [x] Prediction panel accepts input
- [x] Prediction returns results
- [x] Compare page works
- [x] About page displays info
- [ ] Mobile responsive (test on phone)
- [ ] Works in Chrome, Firefox, Safari, Edge

**Performance Testing:**
- [ ] Page load time < 2 seconds
- [ ] API response time < 3 seconds
- [ ] 3D animation runs at 60 FPS
- [ ] No memory leaks

**Error Handling:**
- [x] API offline → Show error message
- [x] Invalid input → Show validation errors
- [x] 404 page → Show "Planet not found"
- [x] Loading states for all async operations

### Step 8.3: Cross-Browser & Device Testing

**Browsers to Test:**
- Chrome (Desktop & Mobile)
- Firefox
- Safari (if available)
- Edge

**Devices to Test:**
- Desktop (1920x1080)
- Laptop (1366x768)
- Tablet (768px)
- Mobile (375px)

**Tools:**
- Browser DevTools responsive mode
- Real device testing

---

## 🎯 Phase 9: Deployment

### Step 9.1: Backend Deployment

**Option 1: Render (Recommended - Free)**

1. Create `render.yaml`:
```yaml
services:
  - type: web
    name: exoplanet-backend
    env: python
    buildCommand: "pip install -r requirements.txt"
    startCommand: "gunicorn backend.wsgi:application"
    envVars:
      - key: PYTHON_VERSION
        value: 3.11.0
      - key: DATABASE_URL
        fromDatabase:
          name: exoplanet-db
          property: connectionString
      - key: SECRET_KEY
        generateValue: true
      - key: DEBUG
        value: false

databases:
  - name: exoplanet-db
    databaseName: exoplanet
    user: exoplanet
```

2. Deploy:
```bash
# Push to GitHub
git push origin main

# Connect to Render
# Deployment automatic on push
```

**Option 2: Railway / Vercel (Alternative)**

### Step 9.2: Frontend Deployment

**Vercel (Recommended for Vite)**

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
cd frontend
npm run build
vercel --prod
```

3. Set environment variables in Vercel dashboard:
```
VITE_API_URL = https://exoplanet-backend.onrender.com/api
```

**Alternative: Netlify**
```bash
npm run build
netlify deploy --prod --dir=dist
```

### Step 9.3: Database (Neon PostgreSQL)

**Already Set Up:**
- ✅ PostgreSQL database exists
- ✅ 8,245 unique exoplanets loaded (from 9,614 processed rows)
- ✅ Missions and models configured

**For Production:**
1. Ensure database is accessible from deployed backend
2. Update `DATABASE_URL` in backend env variables
3. Run migrations on production database:
```bash
python manage.py migrate
```

### Step 9.4: Environment Variables

**Backend (.env):**
```
SECRET_KEY=your-secret-key
DEBUG=False
DATABASE_URL=postgresql://user:pass@host:5432/db
ALLOWED_HOSTS=exoplanet-backend.onrender.com
CORS_ALLOWED_ORIGINS=https://exoplanet-frontend.vercel.app
```

**Frontend (.env.production):**
```
VITE_API_URL=https://exoplanet-backend.onrender.com/api
```

---

## 🎯 Phase 10: Documentation & FYP Report

### Step 10.1: Code Documentation

**Inline Comments & Docstrings:**
```javascript
// Already document your code as you build
// Add JSDoc comments for functions
// Add README files in each directory
```

**README Files:**
- `README.md` - Main project overview ✅
- `frontend/README.md` - Frontend setup & structure ✅
- `frontend/src/pages/README.md` - Route inventory & conventions ✅
- `frontend/src/components/README.md` - Component inventory & conventions ✅
- `backend/README.md` - Backend internals & operational runbook ✅
- `models/README.md` - ML models, metrics caveats, regeneration ✅
- `TEST_MODELS_README.md` - Model evaluation harness guide ✅
- `PROJECT_UNDERSTANDING_GUIDE.md` - Deep system explanation ✅
- `TESTING_GUIDE.md` - Manual feature test checklist ✅

### Step 10.2: FYP Final Report

**Report Structure (60-80 pages):**

1. **Title Page** (1 page)
2. **Abstract** (1 page) - Summary of entire project
3. **Table of Contents** (1-2 pages)
4. **List of Figures/Tables** (1 page)
5. **Chapter 1: Introduction** (5-7 pages)
   - Background on exoplanets
   - Problem statement
   - Objectives
   - Scope and limitations
6. **Chapter 2: Literature Review** (8-10 pages)
   - Exoplanet detection methods
   - Habitability criteria
   - ML in astronomy
   - Existing systems comparison
7. **Chapter 3: System Requirements** (5-7 pages)
   - Functional requirements
   - Non-functional requirements
   - Use case diagrams
   - System constraints
8. **Chapter 4: System Design** (10-15 pages)
   - Architecture diagram
   - Database schema
   - API design
   - UI/UX design (Figma screenshots)
   - Component diagrams
   - Sequence diagrams
9. **Chapter 5: Implementation** (15-20 pages)
   - Data preprocessing methodology
   - ML model development
   - Backend implementation
   - Frontend implementation
   - Integration approach
   - Code snippets (important sections only)
10. **Chapter 6: Testing & Evaluation** (8-10 pages)
    - ML model evaluation (confusion matrix, ROC curves, metrics)
    - System testing
    - Performance testing
    - User acceptance testing
    - Results discussion
11. **Chapter 7: Results & Discussion** (5-7 pages)
    - Key findings
    - Model performance analysis
    - System capabilities
    - Screenshots of working system
    - Achievements vs objectives
12. **Chapter 8: Conclusion & Future Work** (3-4 pages)
    - Summary of achievements
    - Challenges faced and solutions
    - Future enhancements
    - Recommendations
13. **References** (2-3 pages)
    - Cite all sources (datasets, papers, libraries)
14. **Appendices**
    - Appendix A: Complete database schema
    - Appendix B: API endpoints list
    - Appendix C: User manual
    - Appendix D: Code repository link
    - Appendix E: Dataset statistics

### Step 10.3: Presentation & Demo

**PowerPoint Presentation (20-25 slides):**

```
Slide 1: Title Slide
  - Project Title
  - Team Members
  - Supervisor
  - Date

Slides 2-3: Problem Statement
  - Why exoplanet habitability?
  - Current challenges
  - Our solution

Slides 4-5: Objectives
  - What we aimed to achieve
  - Success criteria

Slide 6: Methodology
  - Hybrid Agile Incremental Model

Slides 7-9: Data & ML Models
  - 9,614 exoplanets from 3 missions
  - Model types and performance
  - Evaluation metrics

Slides 10-12: System Architecture
  - Backend (Django, PostgreSQL, ML)
  - Frontend (React, Vite, Three.js)
  - Integration flow

Slides 13-18: LIVE DEMO
  - Show each page
  - Demonstrate features
  - Run prediction
  - Show 3D viewer

Slides 19-20: Results
  - Model performance
  - System capabilities
  - Achievements

Slides 21-22: Challenges & Solutions
  - What was difficult
  - How you solved it

Slide 23: Future Work
  - Potential enhancements

Slide 24: Conclusion
  - Summary
  - Impact

Slide 25: Q&A
  - Thank you + Questions
```

**Demo Video (5-10 minutes):**
- Record screen using OBS Studio or Loom
- Show all features working
- Voice narration explaining each part

---

## 📊 OPTIMIZED PROJECT TIMELINE

### ✅ **COMPLETED** (Weeks 1-5):
- ✅ Week 1-2: Data preprocessing (9,614 exoplanets)
- ✅ Week 3-4: ML model training and evaluation
- ✅ Week 5: Backend API development (98% complete)

### ✅ **COMPLETED** (Weeks 6-10):
- ✅ Frontend React setup
- ✅ All pages built, including the Explore page and both 3D viewers
- ✅ Authentication and saved predictions
- ✅ Frontend deployed to Vercel; database live on Neon

> The week-by-week schedule below is the original plan, kept for the report's
> methodology section. It has been fully executed.

### 📅 **UPCOMING SCHEDULE:**

**Week 6-7: Explore Page**
```
Days 1-2: API service + basic components
Days 3-4: Assemble Explore page + API integration
Days 5-7: 3D Orbital Viewer + Prediction Panel
```

**Week 8: Remaining Pages**
```
Days 1-3: Planet Detail page
Days 4-5: Compare page
Days 6-7: About page + polish
```

**Week 9: Testing & Bug Fixes**
```
Days 1-3: Comprehensive testing
Days 4-5: Bug fixes and performance optimization
Days 6-7: Cross-browser and mobile testing
```

**Week 10: Deployment**
```
Days 1-2: Backend deployment (Render)
Days 3-4: Frontend deployment (Vercel)
Days 5-7: Testing deployed system, final adjustments
```

**Weeks 11-12: Documentation**
```
Week 11: Technical documentation + User manual
Week 12: FYP report writing
```

**Week 13: Presentation**
```
Days 1-3: Create presentation slides
Days 4-5: Record demo video
Days 6-7: Practice presentation, refinements
```

**Total Timeline**: ~13 weeks from current point

---

## 🎯 SUCCESS CRITERIA & METRICS

### ML Model Performance ✅ **ACHIEVED**
- ✅ F1-score > 0.70 for POTENTIALLY_HABITABLE class
- ✅ Overall accuracy > 85%
- ✅ Prediction time < 100ms ✓

### System Performance (Targets)
- ⬜ API response time < 3 seconds
- ⬜ Page load time < 2 seconds  
- ⬜ 3D visualization @ 60 FPS
- ⬜ Responsive on all devices (mobile, tablet, desktop)

### User Experience (Targets)
- ⬜ Intuitive navigation (user can find features without help)
- ⬜ Clear data visualizations
- ⬜ Smooth animations and transitions
- ⬜ Informative error messages

### Project Deliverables (Required for FYP)
- ⬜ Working web application (deployed live)
- ✅ Trained ML models
- ⬜ Complete documentation (technical + user manual)
- ⬜ FYP final report (60-80 pages)
- ⬜ Presentation slides (20-25 slides)
- ⬜ Demo video (5-10 minutes)

---

## 🚀 IMMEDIATE NEXT STEPS (This Week)

### Priority 1: Explore Page Components (Days 1-3)

**Day 1:**
```bash
✓ Create frontend/src/services/api.js
✓ Test API connections to backend
✓ Create SearchBar.jsx (basic)
✓ Create FiltersPanel.jsx (basic)
```

**Day 2:**
```bash
✓ Create PlanetCard.jsx
✓ Create PlanetGrid.jsx
✓ Test with real API data
✓ Add pagination
```

**Day 3:**
```bash
✓ Create ExplorePlanets.jsx page
✓ Integrate SearchBar, FiltersPanel, PlanetGrid
✓ Connect all components to API
✓ Test filtering and searching
```

### Priority 2: 3D Visualization (Days 4-5)

**Day 4:**
```bash
✓ Install Three.js (@react-three/fiber, @react-three/drei)
✓ Create OrbitalViewer3D.jsx component
✓ Add planet sphere and star
✓ Add orbital path
```

**Day 5:**
```bash
✓ Add animation (orbit rotation)
✓ Add camera controls (zoom, rotate, pan)
✓ Connect to selected planet data
✓ Add speed controls
```

### Priority 3: Prediction Panel (Days 6-7)

**Day 6:**
```bash
✓ Create PredictionPanel.jsx
✓ Add input sliders for parameters
✓ Add validation (min/max ranges)
✓ Style with Tailwind CSS
```

**Day 7:**
```bash
✓ Connect to POST /api/predict/
✓ Display results (score, classification)
✓ Add loading state
✓ Add error handling
✓ Make panel collapsible
```

---

## 📝 IMPORTANT NOTES & DECISIONS

### ✅ Confirmed Design Decisions:

1. **Explore Page = Main Project Hub**
   - Search, Filters, 3D Viewer, Planet Results, and Prediction all in ONE page
   - This is the backbone of the entire application
   - Not separate pages for each feature

2. **Navigation Pages (From Figma):**
   - Home (✅), Explore (✅), Planet Detail (✅), Compare (✅)
   - Learn / Concepts (✅), Upload (✅), About (✅)
   - Login + Sign-in (✅), 404 (✅)

3. **Backend is Complete**
   - All APIs working and documented in [README.md](./README.md#api-reference)
   - Database populated — 8,245 unique planets on Neon
   - ML models integrated via a singleton scorer

4. **3D Visualization Location:**
   - Primary: Explore page (orbital system view)
   - Secondary: Planet Detail page (larger single planet view)

### ❓ Optional Features (Check with Supervisor):

1. **User Authentication & Dashboard**
   - Backend models exist (User, SimulationHistory)
   - Frontend not yet implemented
   - **Question**: Do you need user accounts for FYP?
   - If NO: Skip this, save time for core features
   - If YES: Add Login, Register, Dashboard pages

2. **AI Explainability (SHAP/LIME)**
   - "Why this score?" feature
   - Adds complexity
   - **Recommendation**: Skip for now, add only if time permits

3. **Upload Data Feature**
   - Mentioned in original roadmap
   - **Question**: What should users upload?
   - If not needed, remove from navbar

### 🎨 Design Consistency:

- Follow Figma design for:
  - Color scheme
  - Typography
  - Component layouts
  - Spacing and padding
  - Button styles
- **Current**: Home page follows Figma ✅
- **Next**: Apply same style to all pages

---

## 📚 TECHNICAL STACK SUMMARY

### Backend (✅ Complete):
```
- Python 3.11+
- Django 4.2+
- Django REST Framework
- PostgreSQL (Neon DB)
- Scikit-learn, XGBoost, TensorFlow
- Pandas, NumPy
```

### Frontend (🔄 In Progress):
```
- React 18+
- Vite (Build tool)
- Tailwind CSS (Styling)
- Axios (API calls)
- React Router DOM (Navigation)
- Three.js + React Three Fiber (3D visualization)
- Chart.js or Recharts (Charts)
- Framer Motion (Animations)
```

### Deployment (🔜 Upcoming):
```
- Backend: Render (Free tier)
- Frontend: Vercel (Free tier)
- Database: Neon PostgreSQL (Free tier)
- Total Cost: $0 (All free)
```

---

## ✅ QUESTIONS RESOLVED

These were open at planning time. All are now settled:

1. **User Authentication** — Yes. Implemented: JWT register/login/me/logout plus
   per-user saved predictions.
2. **Upload Feature** — Yes. CSV batch prediction at `/upload`, capped at 100
   planets per request.
3. **AI Explainability** — Yes. `POST /api/explain/` with a SHAP → LIME →
   physics-fallback cascade, surfaced in the prediction panel.
4. **Timeline / Presentation** — Scheduling questions for the supervisor, not
   engineering work.

---

## 📞 SUPPORT & RESOURCES

### Learning Resources:

**React + Vite:**
- Official Vite Docs: https://vitejs.dev/
- React Docs: https://react.dev/

**Three.js:**
- React Three Fiber: https://docs.pmnd.rs/react-three-fiber/
- Three.js Journey: https://threejs-journey.com/ (free lessons)

**Tailwind CSS:**
- Official Docs: https://tailwindcss.com/docs
- Component Examples: https://tailwindui.com/components (free)

**Django REST Framework:**
- Official Tutorial: https://www.django-rest-framework.org/tutorial/quickstart/

### Debugging:

**Frontend:**
- Browser DevTools Console (F12)
- React DevTools extension
- Network tab for API calls

**Backend:**
- Django debug toolbar
- `python manage.py runserver` console output
- Check `backend/logs/` if configured

---

## ✨ FINAL THOUGHTS

You're in a **great position**! Here's what you have:

✅ **Solid Foundation:**
- Data processed ✓
- ML models trained ✓
- Backend API working ✓
- Frontend setup done ✓
- Home page complete ✓

✅ **Also Complete:**
- Explore page — filters, 3D viewer, planet grid and prediction studio in one
- Compare, Planet Detail, Learn, Upload and About pages
- Authentication, saved predictions, ARIA chatbot
- 3D orbital viewer and Solar System viewer

🎯 **What Is Left:**
- Redeploy the Railway backend (currently returning 404)
- Reconcile `requirements.txt` with the environment the models were trained in
- Write the FYP report, slides and demo video
- See [Remaining Work](#-remaining-work) for the full list
- Connect to backend API step-by-step
- Polish with Tailwind CSS

📅 **Timeline is Achievable:**
- ~13 weeks to completion
- That's roughly 3-4 months
- Plenty of time if you stay focused

💪 **You Got This!**
- The hardest parts (ML and Backend) are done
- Frontend is just connecting pieces together
- Follow this roadmap step-by-step
- Build incrementally, test frequently

---

**Last Updated**: April 2, 2026  
**Status**: Core Frontend + Explainability complete; moving to Auth + Deployment  
**Backend Status**: Core API complete ✅ (auth endpoints pending)  
**Frontend Status**: Core pages and API integration complete ✅  
**Next Milestone**: Implement login/signup + save prediction history, then deploy

---

## 📋 QUICK REFERENCE CHECKLIST

Copy this to track your progress:

```markdown
## Frontend Development Checklist

### Explore Page Components:
- [x] API service (api.js)
- [x] SearchBar component
- [x] FiltersPanel component
- [x] PlanetCard component
- [x] PlanetGrid component
- [x] OrbitalViewer3D component
- [x] PredictionPanel component
- [x] ExplorePlanets page (assemble all)

### Other Pages:
- [x] Home page
- [x] PlanetDetail page
- [x] ComparePlanets page
- [x] About page

### Integration:
- [ ] All API endpoints connected
- [x] Error handling implemented
- [x] Loading states added
- [ ] Responsive design done

### Testing:
- [ ] Manual testing all features
- [ ] Cross-browser testing
- [ ] Mobile responsive testing
- [ ] Performance optimization

### Deployment:
- [ ] Backend deployed (Render)
- [ ] Frontend deployed (Vercel)
- [ ] Production testing

### Documentation:
- [ ] Technical documentation
- [ ] User manual
- [ ] FYP report
- [ ] Presentation slides
- [ ] Demo video
```

---

**Good luck with your FYP! 🚀🪐**

---

## 📌 REMAINING WORK

Everything below is what is genuinely outstanding, verified against the code and
the live services on 1 September 2026. Everything else in this file is history.

### Blocking for a live demo

| Item | Detail |
|---|---|
| **Backend is down** | `exoplanet-production-d030.up.railway.app` returns `404 Application not found`. The Vercel frontend is up but has no API behind it. Redeploy, then set `VITE_API_URL` in Vercel and add the new origin to `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS`. Until then, demo locally. |

### Should fix before submission

| Item | Detail |
|---|---|
| Dependency drift | `requirements.txt` pins Django 5.0.1 / XGBoost 2.0.3 / Python 3.11; the environment that produced the `.pkl` models runs Django 6 / XGBoost 3.1.2 / Python 3.13. Pickles are not guaranteed to load across major versions. Install the pins into a clean virtualenv and run `pytest` before trusting them. |
| No tests for the scoring layer | `pytest` covers the raw classifiers only. The `0.10 × ML + 0.90 × physics` blend, the thresholds and the ESI maths have zero automated coverage. |
| Dead code | `PredictionHistory` / `SimulationHistory` models (0 rows, unreferenced), the whole `backend/api/` views/urls layer, and `frontend/src/utils/{helpers,mockData}.js` (771 lines, imported nowhere). |
| `/api/auth/logout/` | Cannot revoke tokens — `token_blacklist` is not in `INSTALLED_APPS`. Add it and migrate, or document the endpoint as client-side only. |
| No token refresh | The refresh token is stored but never used; users are dropped after the 1-hour access token expires. |

### Nice to have

| Item | Detail |
|---|---|
| Bundle size | One ~1.87 MB JS chunk. `React.lazy` around `ExoplanetViewer3D` and `SolarSystemViewer` is the highest-leverage fix. |
| Filter validation | A malformed numeric query param on `/api/planets/` raises `ValueError` → 500 instead of 400. |
| ESLint | 46 pre-existing problems, mostly unused imports. |
| Planet mass | `pl_masse` is stored but unused as a feature. Where available it gives density, which separates rock from gas. |

### Phase 10 — documentation and report

- ✅ Code documentation — every README in Step 10.1 now exists
- ⬜ FYP final report (60-80 pages)
- ⬜ Presentation slides (20-25)
- ⬜ Demo video (5-10 minutes)
