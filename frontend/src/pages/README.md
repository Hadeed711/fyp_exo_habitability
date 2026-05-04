# Pages Directory

This directory contains all main page components for the AI Exoplanet Habitability Explorer.

## Pages to Create (from PROJECT_ROADMAP.md - Step 4.2):

### 1. **Home.jsx**
- Hero section with project description
- Statistics cards (total planets, habitable found)
- Call-to-action buttons
- Featured planets carousel
- Futuristic design with animations

### 2. **ExplorePlanets.jsx**
- Grid/List view of all exoplanets
- Search and filter functionality
- Pagination
- Sort by habitability score, distance, temperature
- Planet cards with key details

### 3. **PlanetDetail.jsx**
- Detailed planet profile
- All parameters displayed
- Habitability breakdown
- Comparison with Earth
- 3D visualization preview

### 4. **PredictPage.jsx**
- Input form for custom planet parameters
- Real-time validation
- Submit button
- Results display with habitability score
- Visual indicators (gauges, progress bars)
- Feature importance chart

### 5. **Dashboard.jsx**
- Saved simulations list
- Prediction history
- Export functionality
- Statistics of user activity

### 6. **Login.jsx**
- Login form with JWT
- Registration form
- Password validation
- Error handling

### 7. **Register.jsx** (optional separate component)
- User registration form
- Email and password validation

### 8. **VisualizePage.jsx**
- 3D visualization showcase
- Interactive planet comparison
- Orbital mechanics demonstration

## Current Status

- [x] Directory created
- [ ] Pages implementation (Step 4.2)

## Routing Structure

```jsx
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/explore" element={<ExplorePlanets />} />
  <Route path="/planet/:id" element={<PlanetDetail />} />
  <Route path="/predict" element={<PredictPage />} />
  <Route path="/visualize" element={<VisualizePage />} />
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />
</Routes>
```
