import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Telescope, Home, ArrowLeft, Search } from 'lucide-react';

const NotFound = () => (
  <div className="w-full min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-4 overflow-hidden">

    {/* ambient glows */}
    <div className="pointer-events-none fixed inset-0">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-cyan-500/5 blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-violet-500/5 blur-[100px]" />
    </div>

    {/* star field dots */}
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {[...Array(40)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            width:  `${Math.random() * 2 + 1}px`,
            height: `${Math.random() * 2 + 1}px`,
            top:    `${Math.random() * 100}%`,
            left:   `${Math.random() * 100}%`,
            opacity: Math.random() * 0.4 + 0.1,
          }}
        />
      ))}
    </div>

    <div className="relative z-10 text-center max-w-lg">

      {/* icon */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="flex justify-center mb-8"
      >
        <div className="w-24 h-24 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
          <Telescope className="w-10 h-10 text-cyan-400" />
        </div>
      </motion.div>

      {/* 404 */}
      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="text-8xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent leading-none mb-4"
      >
        404
      </motion.p>

      {/* heading */}
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="text-2xl font-bold text-white mb-3"
      >
        Lost in Deep Space
      </motion.h1>

      {/* subtext */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="text-gray-400 text-sm leading-relaxed mb-10"
      >
        This page drifted beyond the observable universe.<br />
        It may have never existed, or it was moved to another orbit.
      </motion.p>

      {/* actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="flex flex-col sm:flex-row gap-3 justify-center"
      >
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-cyan-500/25"
        >
          <Home className="w-4 h-4" />
          Back to Home
        </Link>

        <Link
          to="/explore"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-gray-300 hover:text-white rounded-lg text-sm font-semibold transition-all"
        >
          <Search className="w-4 h-4" />
          Explore Planets
        </Link>

        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-transparent border border-slate-700 hover:border-cyan-500/50 text-gray-400 hover:text-cyan-400 rounded-lg text-sm font-semibold transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
      </motion.div>
    </div>
  </div>
);

export default NotFound;
