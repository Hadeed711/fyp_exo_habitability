# Components Directory

Shared React components. Every one is a function component using hooks; there
are no class components and no prop-types layer.

## Inventory

### 3D visualisation (React Three Fiber)

| Component | Lines | Purpose |
|---|---|---|
| `ExoplanetViewer3D.jsx` | ~1,235 | The main orbital viewer. Preview canvas plus a fullscreen modal rendering up to 28 real planets around a shared central star |
| `SolarSystemViewer.jsx` | ~1,244 | Solar System scene. Opened from a button **inside** the `ExoplanetViewer3D` modal — it is not bound to any route |
| `AboutHeroCube.jsx` | ~142 | Rotating 3D cube on the About page hero |

`ExoplanetViewer3D` is the largest component in the codebase. Its internal tree:

```
ExoplanetViewer3D            state, data fetching, modal control
├── PreviewScene             4 demo planets, auto-rotating, non-interactive
└── Fullscreen modal
    ├── Header controls      Labels · HZ Ring · Top View · Surface · Rotate · Reset · Close
    ├── StatsBar             counts per habitability class
    └── OrbitalScene         real API data
        ├── CentralStar      colour by temperature, pulsing corona, habitable-zone ring
        ├── Stars            drei starfield, 12,000 points
        ├── OrbitPath  × N   Line, 256 points per orbit
        └── OrbitalPlanet × N  textures, gas-giant rings, labels, tooltips
```

Behaviour worth knowing before editing:

- Capped at **28 planets** to hold 60 fps. Planets are sorted
  POTENTIALLY_HABITABLE → HABITABILITY_ZONE → NON_HABITABLE.
- It receives `filters` and `searchQuery` from `ExplorePlanets` and refetches
  when the modal **opens** — changing a filter with the modal already open does
  not live-update it.
- It is a *comparative* visualisation: planets from different star systems are
  drawn around one synthetic star whose colour and habitable zone come from the
  mean `st_teff` of whatever is on screen. It is not a real star system.
- Textures are chosen by temperature: frozen <180 K, ice <250 K, lava >900 K,
  gas giant >3.5 R⊕, otherwise Earth-like.
- Auto-rotate and manual orbit fight each other; an `interactingRef` flag set on
  the `OrbitControls` `onStart` / `onEnd` handlers suppresses auto-rotate while
  the user is dragging. Preserve it.

### Planet display

| Component | Purpose |
|---|---|
| `PlanetGrid.jsx` | Paginated card list with a "Load More" pager |
| `PlanetCard.jsx` | One planet summary — mission badge, habitability chip, key parameters |
| `SearchBar.jsx` | Debounced typeahead; suggestions link straight to `/planets/:id` |
| `FiltersPanel.jsx` | Explore sidebar — mission, habitability class, radius and temperature ranges |

### Prediction

| Component | Purpose |
|---|---|
| `PredictionPanel.jsx` | The prediction studio — 7 parameter sliders, Earth/Mars/Venus presets, live score, factor breakdown, SHAP/LIME explanation, and save-to-account for signed-in users |

At ~817 lines this is the second-largest component and the densest in API
surface: it calls `predictHabitability`, `explainPrediction`, `savePrediction`,
`getSavedPredictions` and `deleteSavedPrediction`.

### Chrome and layout

| Component | Purpose |
|---|---|
| `Navbar.jsx` | Navigation, auth state, avatar menu |
| `Footer.jsx` | Links, credits, copyright |
| `ScrollToTop.jsx` | Resets scroll on route change. Renders nothing |
| `Chatbot.jsx` | ARIA floating widget. Mounted once in `App.jsx`, present on every route |

`Chatbot.jsx` probes `GET /api/chatbot/` on mount to check Groq connectivity and
degrades to a setup hint when `GROQ_API_KEY` is missing, rather than erroring.

## Conventions

- **API access** goes through `services/api.js`. No component calls `axios` or
  `fetch` directly — the shared instance carries the auth interceptor and the
  401 handler.
- **Styling** is Tailwind utilities inline; shared tokens live in
  `tailwind.config.js`.
- **Icons** come from `lucide-react`.
- **Animation** uses Framer Motion, except inside R3F canvases where animation
  belongs in `useFrame`.
- **3D work** must run inside a `<Canvas>`. Never call R3F hooks (`useFrame`,
  `useThree`) from a component rendered outside one.
- **Loading and error states** are required for anything async.

## Unused modules

`../utils/helpers.js` (271 lines of formatting and validation helpers) and
`../utils/mockData.js` (500 lines of offline sample data) are **imported
nowhere**. Components inline their own formatting instead. They are harmless
but misleading to a reader — either wire `helpers.js` up or delete both.

## Performance notes

`ExoplanetViewer3D` and `SolarSystemViewer` dominate the bundle — a production
build emits a single ~1.87 MB JS chunk, and these two are most of it. If build
size becomes a problem, route-level `React.lazy` around the 3D views is the
highest-leverage change available.
