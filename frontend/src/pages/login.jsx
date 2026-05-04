import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, ArrowRight, ChevronLeft, AlertCircle, CheckCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../services/api';

const Login = () => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { login }  = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [formData,     setFormData]     = useState({ username: '', password: '' });
  const [errors,       setErrors]       = useState({});
  const [apiError,     setApiError]     = useState('');
  const [loading,      setLoading]      = useState(false);
  const [success,      setSuccess]      = useState(false);

  // Where to redirect after login (defaults to /explore to see prediction saving)
  const from = location.state?.from || '/explore';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev  => ({ ...prev, [name]: '' }));
    setApiError('');
  };

  const validate = () => {
    const errs = {};
    if (!formData.username.trim()) errs.username = 'Username or email is required';
    if (!formData.password)       errs.password  = 'Password is required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setApiError('');
    try {
      const data = await loginUser({
        username: formData.username.trim(),
        password: formData.password,
      });
      login(data);          // store in AuthContext + localStorage
      setSuccess(true);
      setTimeout(() => navigate(from, { replace: true }), 600);
    } catch (err) {
      const msg = err?.response?.data?.error
        || err?.response?.data?.detail
        || 'Login failed. Please check your credentials.';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Navbar />

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-md mx-auto px-4 pt-28 pb-20">

        <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="mb-8">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-cyan-400 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-8 backdrop-blur-sm shadow-2xl shadow-slate-950/50"
        >
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30"
            >
              <div className="w-7 h-7 rounded-full bg-white" />
            </motion.div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">Welcome Back</h1>
            <p className="text-sm text-gray-400">Sign in to save your habitability predictions</p>
          </div>

          {/* API error */}
          {apiError && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex items-center gap-2.5 rounded-lg bg-red-900/30 border border-red-500/30 px-3.5 py-2.5"
            >
              <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300">{apiError}</p>
            </motion.div>
          )}

          {/* Success */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex items-center gap-2.5 rounded-lg bg-emerald-900/30 border border-emerald-500/30 px-3.5 py-2.5"
            >
              <CheckCircle size={15} className="text-emerald-400 flex-shrink-0" />
              <p className="text-sm text-emerald-300">Signed in! Redirecting…</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username / Email */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Username or Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="username or email@example.com"
                  autoComplete="username"
                  className={`w-full pl-10 pr-4 py-3 bg-slate-800/60 border rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-all ${
                    errors.username
                      ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30'
                      : 'border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/30'
                  }`}
                />
              </div>
              {errors.username && <p className="text-xs text-red-400 mt-1">{errors.username}</p>}
            </motion.div>

            {/* Password */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.33 }}>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className={`w-full pl-10 pr-10 py-3 bg-slate-800/60 border rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-all ${
                    errors.password
                      ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30'
                      : 'border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/30'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password}</p>}
            </motion.div>

            {/* Submit */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }} className="pt-2">
              <motion.button
                type="submit"
                disabled={loading || success}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-800 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-cyan-500/25"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Signing in…
                  </span>
                ) : (
                  <>Sign In <ArrowRight className="w-4 h-4" /></>
                )}
              </motion.button>
            </motion.div>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-700/60" />
            <span className="text-xs text-gray-500">Don't have an account?</span>
            <div className="flex-1 h-px bg-slate-700/60" />
          </div>

          <Link to="/signin">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 bg-transparent border border-slate-700 hover:border-cyan-500/50 text-gray-300 hover:text-cyan-400 rounded-lg text-sm font-medium transition-all"
            >
              Create New Account
            </motion.button>
          </Link>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default Login;
