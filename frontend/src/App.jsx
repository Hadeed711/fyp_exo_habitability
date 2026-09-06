import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import ExplorePlanets from './pages/ExplorePlanets';
import PlanetDetail from './pages/PlanetDetail';
import ComparePlanets from './pages/ComparePlanets';
import About from './pages/About';
import Upload from './pages/Upload';
import Concepts from './pages/Concepts';
import Login from './pages/login';
import SignIn from './pages/signin';
import NotFound from './pages/NotFound';
import ScrollToTop from './components/ScrollToTop';
import Chatbot from './components/Chatbot';

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route path="/"        element={<Home />} />
          <Route path="/explore" element={<ExplorePlanets />} />
          <Route path="/planets/:id" element={<PlanetDetail />} />
          <Route path="/compare" element={<ComparePlanets />} />
          <Route path="/about"   element={<About />} />
          <Route path="/upload"  element={<Upload />} />
          <Route path="/learn"   element={<Concepts />} />
          <Route path="/login"   element={<Login />} />
          <Route path="/signin"  element={<SignIn />} />
          <Route path="*"        element={<NotFound />} />
        </Routes>
        {/* ARIA Chatbot — available on every page */}
        <Chatbot />
      </Router>
    </AuthProvider>
  );
}

export default App;