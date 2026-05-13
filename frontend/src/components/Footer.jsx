import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ExternalLink, Telescope, Database, Brain, Star, Globe, Github } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const exploreLinks = [
    { name: 'Explore Exoplanets', path: '/explore' },
    { name: 'Compare Exoplanets', path: '/compare' },
    { name: 'Batch Predictions', path: '/upload' },
    { name: 'About Project', path: '/about' },
  ];

  const learnLinks = [
    { name: 'Important Concepts', path: '/learn' },
    { name: 'Habitability Guide', path: '/learn#habitability' },
    { name: 'What is an Exoplanet?', path: '/learn#exoplanet' },
    { name: 'Mission Overview', path: '/learn#missions' },
  ];

  const dataSources = [
    { name: 'NASA Exoplanet Archive', url: 'https://exoplanetarchive.ipac.caltech.edu/', Icon: Database },
    { name: 'Kepler Mission', url: 'https://www.nasa.gov/mission_pages/kepler/main/index.html', Icon: Telescope },
    { name: 'TESS Mission', url: 'https://tess.mit.edu/', Icon: Star },
    { name: 'K2 Mission', url: 'https://keplerscience.arc.nasa.gov/k2.html', Icon: Globe },
  ];

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.06, duration: 0.4, ease: 'easeOut' }
    })
  };

  return (
    <footer className="w-full mt-20 relative overflow-hidden">
      {/* Top gradient line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent" />

      <div className="bg-gradient-to-b from-slate-900/90 to-slate-950 backdrop-blur-md relative">
        {/* Subtle star-field decoration */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
          {[...Array(24)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: i % 3 === 0 ? '2px' : '1px',
                height: i % 3 === 0 ? '2px' : '1px',
                left: `${(i * 41) % 100}%`,
                top: `${(i * 29) % 100}%`,
                opacity: 0.2 + (i % 5) * 0.1,
              }}
            />
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">

            {/* Brand Column */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={0}
              variants={itemVariants}
              className="lg:col-span-1"
            >
              <Link to="/" className="flex items-center space-x-3 mb-4 group w-fit">
                <motion.div
                  whileHover={{ rotate: 5, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  className="w-10 h-10 flex items-center justify-center"
                >
                  <img src="/logo.svg" alt="ExoHab Logo" className="w-full h-full drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                </motion.div>
                <span className="text-xl font-black text-white group-hover:text-cyan-400 transition-colors">
                  ExoHab<span className="text-cyan-500">Explorer</span>
                </span>
              </Link>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                AI-powered platform for exploring and predicting exoplanet habitability.
                Built on Kepler, K2, and TESS mission data with machine learning models.
              </p>
              <div className="mt-5 flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 
                                 bg-slate-800/60 border border-slate-700 rounded-full px-3 py-1">
                  <Brain className="w-3 h-3 text-cyan-400" />
                  ML Powered
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 
                                 bg-slate-800/60 border border-slate-700 rounded-full px-3 py-1">
                  <Database className="w-3 h-3 text-purple-400" />
                  Real Data
                </span>
              </div>
            </motion.div>

            {/* Navigate Links */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={1}
              variants={itemVariants}
            >
              <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider 
                             flex items-center gap-2">
                <span className="w-5 h-px bg-cyan-500" />
                Navigate
              </h3>
              <ul className="space-y-2.5">
                {exploreLinks.map((link, i) => (
                  <motion.li key={link.path} custom={i + 2} variants={itemVariants}>
                    <Link
                      to={link.path}
                      className="text-slate-400 hover:text-cyan-400 transition-colors text-sm 
                                 flex items-center gap-2 group"
                    >
                      <span className="w-1 h-1 rounded-full bg-slate-600 
                                       group-hover:bg-cyan-400 transition-colors flex-shrink-0" />
                      {link.name}
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* Learn Links */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={2}
              variants={itemVariants}
            >
              <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider 
                             flex items-center gap-2">
                <span className="w-5 h-px bg-purple-500" />
                Learn
              </h3>
              <ul className="space-y-2.5">
                {learnLinks.map((link, i) => (
                  <motion.li key={link.path} custom={i + 2} variants={itemVariants}>
                    <Link
                      to={link.path}
                      className="text-slate-400 hover:text-purple-400 transition-colors text-sm 
                                 flex items-center gap-2 group"
                    >
                      <span className="w-1 h-1 rounded-full bg-slate-600 
                                       group-hover:bg-purple-400 transition-colors flex-shrink-0" />
                      {link.name}
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* Data Sources */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={3}
              variants={itemVariants}
            >
              <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider 
                             flex items-center gap-2">
                <span className="w-5 h-px bg-blue-500" />
                Data Sources
              </h3>
              <ul className="space-y-2.5">
                {dataSources.map(({ name, url, Icon }, i) => (
                  <motion.li key={name} custom={i + 2} variants={itemVariants}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-blue-400 transition-colors text-sm 
                                 flex items-center gap-2 group"
                    >
                      <Icon className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 
                                       transition-colors flex-shrink-0" />
                      <span>{name}</span>
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 
                                               transition-opacity ml-auto flex-shrink-0" />
                    </a>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-12 p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl 
                       grid grid-cols-2 md:grid-cols-4 gap-4 text-center"
          >
            {[
              { value: '3', label: 'Missions', color: 'text-cyan-400' },
              { value: '10K+', label: 'Exoplanets', color: 'text-purple-400' },
              { value: '3', label: 'ML Models', color: 'text-blue-400' },
              { value: 'Real-time', label: 'Predictions', color: 'text-green-400' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Copyright */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="mt-8 pt-6 border-t border-slate-800 flex flex-col md:flex-row 
                       items-center justify-between gap-4"
          >
            <p className="text-slate-500 text-sm">
              © {currentYear} ExoHab Explorer — Final Year Project. All rights reserved.
            </p>
            <div className="flex items-center gap-5 text-xs text-slate-600">
              <Link to="/about" className="hover:text-slate-400 transition-colors">About</Link>
              <Link to="/learn" className="hover:text-slate-400 transition-colors">Concepts</Link>
              <a
                href="https://github.com/Hadeed711/fyp_exo_habitability"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-400 transition-colors flex items-center gap-1"
              >
                <Github className="w-3.5 h-3.5" />
                Source
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
