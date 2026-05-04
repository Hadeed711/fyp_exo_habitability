# Components Directory

This directory contains reusable React components for the AI Exoplanet Habitability Explorer frontend.

## Components to Create (from PROJECT_ROADMAP.md - Step 4.3):

### Navigation & Layout
- **Navbar.jsx** - Main navigation bar with links
- **Footer.jsx** - Footer component

### Planet Display
- **PlanetCard.jsx** - Display planet summary in grid/list views
- **SearchBar.jsx** - Search component for finding planets

### Data Visualization
- **HabitabilityScore.jsx** - Visual score display (0-1 scale) with gauges/progress bars
- **ComparisonChart.jsx** - Chart.js integration for comparing planets
- **DataCharts.jsx** - Various chart components for analytics

### Input Components
- **ParameterSlider.jsx** - Input sliders for planet parameters in prediction form

### UI Feedback
- **LoadingSpinner.jsx** - Loading states indicator
- **ErrorMessage.jsx** - Error handling and display

### Filtering & Stats
- **PlanetFilter.jsx** - Advanced filtering component
- **StatCard.jsx** - Dashboard statistics display

### 3D Visualization
- **PlanetVisualization.jsx** - Three.js 3D planet and orbit visualization

### AI Explainability
- **AIInsightCard.jsx** - Feature importance and SHAP value display

## Current Status

- [x] Directory created
- [ ] Components implementation (Step 4.3)

## Usage Example

```jsx
import PlanetCard from './components/PlanetCard';

<PlanetCard 
  planet={planetData}
  onClick={handlePlanetClick}
/>
```
