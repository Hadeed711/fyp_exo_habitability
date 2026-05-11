import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, Menu, X, LogOut, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

// ── Avatar circle component ──────────────────────────────────────────────────
const Avatar = ({ user, size = 8 }) => {
  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : '??';

  if (user?.profile_image) {
    return (
      <img
        src={user.profile_image}
        alt={user.username}
        className={`w-${size} h-${size} rounded-full object-cover border-2 border-cyan-500/40`}
      />
    );
  }

  // Deterministic background colour from username
  const colors = [
    'from-cyan-500 to-blue-600',
    'from-violet-500 to-purple-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-red-600',
    'from-pink-500 to-rose-600',
  ];
  const idx = (user?.username?.charCodeAt(0) || 0) % colors.length;

  return (
    <div className={`w-${size} h-${size} rounded-full bg-gradient-to-br ${colors[idx]}
                     flex items-center justify-center text-white font-bold
                     border-2 border-transparent`}
         style={{ fontSize: size === 8 ? 13 : 11 }}>
      {initials}
    </div>
  );
};

// ── Main Navbar ──────────────────────────────────────────────────────────────
const Navbar = () => {
  const [isScrolled,       setIsScrolled]       = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [dropdownOpen,     setDropdownOpen]     = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, user, logout } = useAuth();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const navLinks = [
    { name: 'Home',    path: '/' },
    { name: 'Explore', path: '/explore' },
    { name: 'Compare', path: '/compare' },
    { name: 'Upload',  path: '/upload' },
    { name: 'About',   path: '/about' },
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    setDropdownOpen(false);
    setIsMobileMenuOpen(false);
    logout();
    navigate('/');
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-slate-900/95 backdrop-blur-lg shadow-lg shadow-cyan-500/10'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group flex-shrink-0">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              className="relative w-10 h-10 flex items-center justify-center"
            >
              <img src="/logo.svg" alt="ExoHab Logo" className="w-full h-full drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
            </motion.div>
            <span className="text-2xl font-black tracking-tight text-white group-hover:text-cyan-400 transition-colors bg-clip-text">
              ExoHab<span className="text-cyan-500">Explorer</span>
            </span>
          </Link>

          {/* Right area: nav links + auth */}
          <div className="hidden md:flex items-center ml-auto gap-2 lg:gap-4">
            <div className="flex items-center space-x-1">
              {navLinks.map((link) => (
                <Link key={link.path} to={link.path} className="relative px-3 py-2 group">
                  <span className={`relative z-10 transition-colors ${
                    isActive(link.path) ? 'text-cyan-400' : 'text-gray-300 group-hover:text-white'
                  }`}>
                    {link.name}
                  </span>
                  {isActive(link.path) && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 bg-cyan-500/20 rounded-lg"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </Link>
              ))}
            </div>

            {/* User area */}
            {isLoggedIn ? (
              /* Avatar + dropdown */
              <div ref={dropdownRef} className="relative">
                <button
                  onClick={() => setDropdownOpen(v => !v)}
                  className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-800/60 transition-colors"
                >
                  <Avatar user={user} size={8} />
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0,  scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-52 rounded-xl
                                 bg-slate-900/98 border border-slate-700/60
                                 shadow-xl shadow-slate-950/60 backdrop-blur-xl overflow-hidden"
                    >
                      {/* User info */}
                      <div className="px-4 py-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                          <Avatar user={user} size={9} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{user?.username}</p>
                            <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                          </div>
                        </div>
                      </div>

                      {/* Logout */}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm
                                   text-slate-300 hover:text-red-400 hover:bg-red-900/20
                                   transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-cyan-500 text-sm text-gray-300 hover:text-white transition-all"
                  >
                    <User className="w-4 h-4" />
                    Login
                  </motion.button>
                </Link>
                <Link to="/signin">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-sm text-cyan-300 hover:text-white hover:bg-cyan-500/30 transition-all"
                  >
                    Sign Up
                  </motion.button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setIsMobileMenuOpen(v => !v)}
            className="md:hidden p-2 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-cyan-500 transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-slate-900/98 backdrop-blur-lg border-t border-slate-800"
          >
            <div className="px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-4 py-2 rounded-lg transition-colors ${
                    isActive(link.path) ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-300 hover:bg-slate-800'
                  }`}
                >
                  {link.name}
                </Link>
              ))}

              {isLoggedIn ? (
                <div className="pt-1 space-y-2">
                  <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-800/50">
                    <Avatar user={user} size={8} />
                    <div>
                      <p className="text-sm font-semibold text-white">{user?.username}</p>
                      <p className="text-xs text-slate-500">{user?.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-red-400 hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-300 hover:bg-slate-800 transition-colors"
                >
                  <User className="w-5 h-5" />
                  <span>Login</span>
                </Link>
              )}

              {!isLoggedIn && (
                <Link
                  to="/signin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:text-white hover:bg-cyan-500/30 transition-colors"
                >
                  Sign Up
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
