# Frontend — React + Vite

The Exoplanet Habitability Explorer client. React 19, Vite 7, Tailwind CSS 3,
React Router 7, Framer Motion, and React Three Fiber for the 3D orbital viewer.

Setup, environment variables and the API reference are in the
[root README](../README.md). This file covers the frontend specifically.

---

## Running it

```bash
npm install
npm run dev        # http://localhost:3000
```

| Script | Does |
|---|---|
| `npm run dev` | Dev server on port 3000, proxying `/api/*` to `localhost:8000` |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run lint` | ESLint across the project |

The Vite proxy in [`vite.config.js`](./vite.config.js) means **no CORS setup is
needed in development** — the browser only ever talks to port 3000.

---

## Configuration

| Variable | Required | Purpose |
|---|---|---|
| `VITE_API_URL` | Production only | Absolute API base URL including the trailing `/api` |

Leave it unset locally so the proxy handles routing. In production it is set in
the Vercel dashboard. `services/api.js` falls back to the relative `/api` and
normalises the trailing slash either way.

Copy [`.env.example`](./.env.example) to `.env` for local overrides.

---

## Structure

```
src/
├── App.jsx              Router, AuthProvider, globally-mounted Chatbot
├── main.jsx             Entry point
├── pages/               Route-level components  → see pages/README.md
├── components/          Shared components       → see components/README.md
├── context/
│   └── AuthContext.jsx  JWT auth state
└── services/
    └── api.js           Axios instance + every API call
```

`public/` holds the favicon, logo, the `models/scene.gltf` asset used by the 3D
views, and the two FYP PDFs linked from the About page.

---

## Architecture notes

**State is deliberately local.** There is no Redux, Zustand or reducer layer.
Pages own their own `useState`, and the only shared context is `AuthContext`,
which carries auth alone. Keep it that way unless something genuinely needs to
be global.

**All API access goes through `services/api.js`.** It exports one configured
axios instance with two interceptors:

- a request interceptor that reads `auth_token` from `localStorage` and sets the
  `Authorization: Bearer` header
- a response interceptor that clears stored credentials on a 401 but does *not*
  hard-redirect, so the UI can handle it gracefully

`apiClient` is a separate axios instance, so `axios.defaults` set anywhere else
do **not** apply to it. Always go through the exported helpers.

**Routing** is flat — a single `<Routes>` block in `App.jsx`. `ScrollToTop` and
`Chatbot` sit outside it so they persist across navigation.

---

## Build size

A production build currently emits one JS chunk of roughly **1.87 MB**
(~547 kB gzipped), which trips Vite's 500 kB chunk warning. Three.js, the drei
helpers and the two large 3D scenes account for most of it.

This is a known accepted tradeoff, not an oversight. If it needs addressing, the
highest-leverage fix is a route-level `React.lazy` boundary around
`ExoplanetViewer3D` and `SolarSystemViewer` so the 3D stack only loads on the
routes that render it.

---

## Deployment

Vercel, built from this directory. [`vercel.json`](./vercel.json) rewrites all
paths to `/index.html` so client-side routes survive a hard refresh — without
it, loading `/explore` directly returns a 404.

Set `VITE_API_URL` in the Vercel project settings before deploying, otherwise
the build falls back to a relative `/api` that has no backend behind it.
