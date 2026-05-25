import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Orbit, Brain, GitCompare } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Home = () => {
  const heroRef = useRef(null);
  const orbitRef = useRef(null);
  
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  // Scroll animations for orbit section
  const { scrollYProgress: orbitScroll } = useScroll({
    target: orbitRef,
    offset: ['start end', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.8]);
  
  // Scroll-based transformations for planets/sun/rings
  const planet1Y = useTransform(orbitScroll, [0, 1], [80, -80]);
  const planet2Y = useTransform(orbitScroll, [0, 1], [-60, 60]);
  const planet3Y = useTransform(orbitScroll, [0, 1], [100, -100]);
  const ringScale = useTransform(orbitScroll, [0, 0.5, 1], [1, 1.1, 1]);
  const ringOpacity = useTransform(orbitScroll, [0, 0.5, 1], [0.3, 0.5, 0.3]);
  const ringRotate = useTransform(orbitScroll, [0, 1], [0, 180]);
  // Ring movements: ring1 (smallest) stays in place, ring2 (medium) moves up, ring3 (largest) moves left
  const ring1Movement = useTransform(orbitScroll, [0, 1], [0, 5]); // Very slight movement
  const ring2Y = useTransform(orbitScroll, [0, 1], [0, -500]); // Move up/top
  const ring3X = useTransform(orbitScroll, [0, 1], [0, -450]); // Move left to middle screen
  const sunScale = useTransform(orbitScroll, [0, 0.5, 1], [1, 1.2, 1]);
  const sunRotate = useTransform(orbitScroll, [0, 1], [0, 360]);
  const sunY = useTransform(orbitScroll, [0, 1], [-20, 40]);

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Navbar />

      {/* Hero Section */}
      <motion.section
        ref={heroRef}
        style={{ opacity, scale }}
        className="relative min-h-screen flex items-center justify-center px-4 pt-16 overflow-hidden"
      >
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-slate-900/50 to-slate-950"></div>
          <motion.div
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 100,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="absolute top-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              rotate: -360,
            }}
            transition={{
              duration: 80,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-left space-y-6"
          >
            {/* Main Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight"
            >
              AI-Powered
              <br />
              <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">
                Exoplanet
              </span>
              <br />
              Habitability
              <br />
              Explorer
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-gray-400 text-lg max-w-xl"
            >
              Discover and analyze potentially habitable worlds beyond our solar
              system using cutting-edge AI and data from Kepler and TESS
              missions.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex flex-wrap gap-4"
            >
              <Link to="/explore">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center space-x-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors shadow-lg shadow-cyan-500/25"
                >
                  <span>Explore Exoplanets</span>
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
              <Link to="/learn">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center space-x-2 px-6 py-3 bg-transparent border-2 border-slate-700 hover:border-purple-500 text-white rounded-lg font-medium transition-colors"
                >
                  <span>Explore Concepts</span>
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Right Side - Animated Solar System */}
          <motion.div
            ref={orbitRef}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="relative hidden lg:flex items-center justify-center"
          >
            <OrbitAnimation planet1Y={planet1Y} planet2Y={planet2Y} planet3Y={planet3Y} ringScale={ringScale} ringOpacity={ringOpacity} ringRotate={ringRotate} ring1Movement={ring1Movement} ring2Y={ring2Y} ring3X={ring3X} sunScale={sunScale} sunRotate={sunRotate} sunY={sunY} />
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-6 h-10 rounded-full border-2 border-slate-600 flex items-start justify-center p-2"
          >
            <motion.div className="w-1 h-2 bg-cyan-400 rounded-full" />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Key Features Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Key Features
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Powerful tools and visualizations to explore the habitability of
              distant worlds
            </p>
          </motion.div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureCard key={index} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Ready to Explore Section - with Grid Background */}
      <section className="relative py-20 px-4 pb-0">
        {/* Professional Grid Background - Blue & White Lines with Gradient */}
        <div className="absolute inset-0 overflow-hidden">
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(96, 165, 250, 0.15) 1px, transparent 1px),
                linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(96, 165, 250, 0.15) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px, 60px 60px, 60px 60px, 60px 60px',
              backgroundPosition: '0 0, 30px 30px, 0 0, 30px 30px',
              maskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 100%)',
            }}
          />
        </div>
        
        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-900/20 via-slate-900/50 to-blue-900/20 border border-cyan-500/20 p-12 text-center"
          >
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 blur-3xl"></div>

            <div className="relative z-10">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-3xl md:text-4xl font-bold text-white mb-4"
              >
                Ready to Explore?
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto"
              >
                Start your journey through the cosmos and discover potentially
                habitable exoplanets using our AI-powered platform.
              </motion.p>
              <Link to="/explore">
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center space-x-2 px-8 py-4 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors shadow-lg shadow-cyan-500/25"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Extended grid section before footer */}
      <div className="relative h-20" style={{
        backgroundImage: `
          linear-gradient(to right, rgba(96, 165, 250, 0.15) 1px, transparent 1px),
          linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(96, 165, 250, 0.15) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px, 60px 60px, 60px 60px, 60px 60px',
        backgroundPosition: '0 0, 30px 30px, 0 0, 30px 30px',
      }}></div>

      <Footer />
    </div>
  );
};

// Orbit Animation Component
const OrbitAnimation = ({ planet1Y, planet2Y, planet3Y, ringScale, ringOpacity, ringRotate, ring1Movement, ring2Y, ring3X, sunScale, sunRotate, sunY }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="relative w-96 h-96">
      {/* Central Star - with scroll rotation and movement */}
      <motion.div
        initial={{ scale: 0, rotate: 0 }}
        animate={{ scale: 1 }}
        style={{ 
          scale: sunScale,
          rotate: sunRotate,
          y: sunY,
        }}
        transition={{ duration: 0.8 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 shadow-2xl shadow-orange-500/50"
      >
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-yellow-300 to-orange-400">
          {/* Sun surface details for visible rotation */}
          <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-orange-600/40"></div>
          <div className="absolute bottom-3 right-2 w-1.5 h-1.5 rounded-full bg-yellow-200/50"></div>
        </div>
      </motion.div>

      {/* Orbit Rings - with individual scroll movements */}
      {[1, 2, 3].map((ring) => {
        // Ring 1 (smallest): very slight Y movement, Ring 2 (medium): moves up, Ring 3 (largest): moves left
        let ringXMovement = 0;
        let ringYMovement = 0;
        
        if (ring === 1) {
          ringYMovement = ring1Movement; // Very slight Y movement
        } else if (ring === 2) {
          ringYMovement = ring2Y; // Move up/top
        } else if (ring === 3) {
          ringXMovement = ring3X; // Move left
        }
        
        return (
          <motion.div
            key={ring}
            initial={{ scale: 0, opacity: 0, rotate: 0 }}
            animate={{ scale: 1, opacity: 0.3 }}
            transition={{ duration: 0.8, delay: ring * 0.2 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-white/30 rounded-full"
            style={{
              width: `${ring * 120}px`,
              height: `${ring * 120}px`,
              scale: ringScale,
              opacity: ringOpacity,
              rotate: ringRotate,
              x: ringXMovement,
              y: ringYMovement,
              transformOrigin: 'center',
            }}
          />
        );
      })}

      {/* Planets - asymmetric positions with opposite scroll movements */}
      <OrbitingPlanet delay={0} duration={10} radius={60} size={12} color="from-blue-400 to-cyan-500" planetY={planet1Y} startAngle={45} />
      <OrbitingPlanet delay={2} duration={15} radius={120} size={16} color="from-purple-400 to-pink-500" planetY={planet2Y} startAngle={180} />
      <OrbitingPlanet delay={4} duration={20} radius={180} size={14} color="from-green-400 to-emerald-500" planetY={planet3Y} startAngle={280} />
    </div>
  );
};

// Orbiting Planet Component - with scroll animations and asymmetric positioning
const OrbitingPlanet = ({ delay, duration, radius, size, color, planetY, startAngle }) => {
  return (
    <motion.div
      initial={{ rotate: startAngle }}
      animate={{ rotate: startAngle + 360 }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'linear',
        delay,
      }}
      className="absolute top-1/2 left-1/2"
      style={{
        width: radius * 2,
        height: radius * 2,
        marginLeft: -radius,
        marginTop: -radius,
      }}
    >
      <motion.div
        whileHover={{ scale: 1.2 }}
        className={`absolute top-0 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-br ${color} shadow-lg cursor-pointer`}
        style={{
          y: planetY,
          width: size,
          height: size,
        }}
      />
    </motion.div>
  );
};

// Feature Card Component
const FeatureCard = ({ feature, index }) => {
  return (
    <Link to={feature.link} className="block">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        whileHover={{ y: -5 }}
        className="group relative overflow-hidden rounded-xl bg-slate-900/50 border border-slate-800 p-8 hover:border-cyan-500/50 transition-all duration-300 cursor-pointer"
      >
        {/* Glow Effect on Hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-blue-500/0 group-hover:from-cyan-500/10 group-hover:to-blue-500/10 transition-all duration-300"></div>

        <div className="relative z-10">
          {/* Icon */}
          <motion.div
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center justify-center w-14 h-14 rounded-lg bg-cyan-500/10 text-cyan-400 mb-4"
          >
            <feature.icon className="w-7 h-7" />
          </motion.div>

          {/* Title */}
          <h3 className="text-xl font-semibold text-white mb-3">
            {feature.title}
          </h3>

          {/* Description */}
          <p className="text-gray-400 leading-relaxed">{feature.description}</p>

          {/* Explore link hint */}
          <div className="mt-4 flex items-center gap-1 text-cyan-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <span>Explore</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
};

// Features Data
const features = [
  {
    icon: Orbit,
    title: 'Interactive Orbit Maps',
    description:
      'Visualize exoplanets in their orbital systems with real-time 3D rendering and interactive exploration.',
    link: '/explore',
  },
  {
    icon: Brain,
    title: 'AI Habitability Scoring',
    description:
      'Advanced machine learning models predict habitability based on multiple planetary parameters.',
    link: '/explore',
  },
  {
    icon: GitCompare,
    title: 'Planet Comparison',
    description:
      'Compare up to 4 exoplanets side-by-side with detailed metrics and visualizations.',
    link: '/compare',
  },
];

export default Home;
