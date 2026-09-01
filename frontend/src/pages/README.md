# Pages Directory

Route-level components. Every route is registered in
[`src/App.jsx`](../App.jsx) inside a single `<Routes>` block, wrapped by
`AuthProvider`, with `ScrollToTop` and the ARIA `Chatbot` mounted globally
outside the route switch.

## Routes

| Path | Component | Purpose |
|---|---|---|
| `/` | `Home.jsx` | Landing page — hero, live dataset stats, feature cards |
| `/explore` | `ExplorePlanets.jsx` | Main page — filters, 3D viewer, planet grid, prediction panel |
| `/planets/:id` | `PlanetDetail.jsx` | Full planet profile with an ML prediction for that planet |
| `/compare` | `ComparePlanets.jsx` | Side-by-side comparison of up to 4 planets |
| `/learn` | `Concepts.jsx` | Habitability concepts — HZ, ESI, transit method, stellar types |
| `/upload` | `Upload.jsx` | CSV batch prediction — template download, validation, results export |
| `/about` | `About.jsx` | Project, dataset and academic context; 3D hero cube |
| `/login` | `login.jsx` | Login form |
| `/signin` | `signin.jsx` | Registration, including avatar upload |
| `*` | `NotFound.jsx` | 404 fallback |

`ComingSoon.jsx` is a generic placeholder component. It is not currently bound
to any route — keep it for stubbing a new page.

> Note the filename casing: `login.jsx` and `signin.jsx` are lowercase while
> every other page is PascalCase. Imports in `App.jsx` match the files exactly.
> Renaming them needs a case-sensitive-safe two-step `git mv` — Windows and
> Linux disagree about case, and Vercel builds on Linux.

## Conventions

- **Data fetching** — always through `services/api.js`. No page calls `axios`
  or `fetch` directly.
- **State** — local `useState` only. There is no Redux, Zustand or reducer
  layer; `AuthContext` is the single shared context and carries auth only.
- **Auth** — read `useAuth()` from `context/AuthContext`. The JWT lives in
  `localStorage` and an axios interceptor attaches it; pages never touch the
  token directly.
- **Styling** — Tailwind utility classes inline. Shared tokens (the `slate.950`
  colour, `pulse-slow` / `spin-slow` animations) are in
  [`tailwind.config.js`](../../tailwind.config.js).
- **Animation** — Framer Motion for page and element transitions.
- **Loading and errors** — every async call needs an explicit loading state and
  a rendered error branch. The API can be cold-starting or entirely offline.

## Page notes

**`ExplorePlanets.jsx`** is deliberately thin (~110 lines). It owns filter and
search state and composes `FiltersPanel`, `SearchBar`, `PlanetGrid`,
`ExoplanetViewer3D` and `PredictionPanel`. Add feature logic to the child
component, not to this page.

**`PlanetDetail.jsx`** fetches one planet and runs a live prediction against its
stored parameters, so the score shown reflects the current scorer rather than
the `habitability_class` frozen in the database at load time.

**`Upload.jsx`** validates client-side before POSTing — CSV only, under 5 MB, at
least one data row — and caps a batch at 100 planets to match the backend limit.
