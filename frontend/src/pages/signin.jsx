import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, User, Mail, Lock, ArrowRight, ChevronLeft, Camera, AlertCircle, CheckCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { registerUser } from '../services/api';

// ── Avatar preview with upload area ─────────────────────────────────────────

const AvatarUpload = ({ preview, onImageSelect }) => {
  const inputRef = useRef();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be under 2 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => onImageSelect(ev.target.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center gap-2 mb-6">
      <div
        onClick={() => inputRef.current?.click()}
        className="relative w-20 h-20 rounded-full cursor-pointer group"
      >
        {/* Avatar display */}
        {preview ? (
          <img src={preview} alt="avatar" className="w-20 h-20 rounded-full object-cover border-2 border-cyan-500/40" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-dashed border-slate-600
                          group-hover:border-cyan-500/60 flex items-center justify-center transition-colors">
            <User className="w-8 h-8 text-slate-500 group-hover:text-cyan-400 transition-colors" />
          </div>
        )}

        {/* Camera overlay */}
        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100
                        transition-opacity flex items-center justify-center">
          <Camera className="w-5 h-5 text-white" />
        </div>
      </div>

      <p className="text-[11px] text-slate-500">
        {preview ? (
          <button
            type="button"
            onClick={() => onImageSelect('')}
            className="text-red-400/70 hover:text-red-400 transition-colors"
          >
            Remove photo
          </button>
        ) : (
          <span className="text-slate-500">Click to upload profile photo <span className="text-slate-600">(optional)</span></span>
        )}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

// ── Field component (must be outside SignIn to avoid focus-loss on re-render) ─

const Field = ({ label, name, type = 'text', placeholder, icon: Icon, autoComplete,
                 showToggle, toggled, onToggle, value, onChange, error }) => (
  <div>
    <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />}
      <input
        type={showToggle ? (toggled ? 'text' : 'password') : type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`w-full ${Icon ? 'pl-10' : 'pl-4'} ${showToggle ? 'pr-10' : 'pr-4'} py-3 bg-slate-800/60 border rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-all ${
          error
            ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30'
            : 'border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/30'
        }`}
      />
      {showToggle && (
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
        >
          {toggled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      )}
    </div>
    {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
  </div>
);

// ── Main Signup Component ────────────────────────────────────────────────────

const SignIn = () => {
  const navigate      = useNavigate();
  const { login }     = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [profileImage, setProfileImage] = useState('');
  const [formData,     setFormData]     = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors,    setErrors]    = useState({});
  const [apiError,  setApiError]  = useState('');
  const [loading,   setLoading]   = useState(false);
  const [success,   setSuccess]   = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev  => ({ ...prev, [name]: '' }));
    setApiError('');
  };

  const validate = () => {
    const errs = {};
    if (!formData.username.trim())         errs.username = 'Username is required';
    else if (formData.username.length < 3) errs.username = 'Username must be at least 3 characters';
    if (!formData.email.trim())            errs.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'Enter a valid email';
    if (!formData.password)                errs.password = 'Password is required';
    else if (formData.password.length < 6) errs.password = 'Minimum 6 characters';
    if (formData.password !== formData.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setApiError('');
    try {
      const data = await registerUser({
        username:      formData.username.trim(),
        email:         formData.email.trim(),
        password:      formData.password,
        profile_image: profileImage,
      });
      login(data);
      setSuccess(true);
      setTimeout(() => navigate('/explore', { replace: true }), 700);
    } catch (err) {
      const errData = err?.response?.data?.errors || {};
      const flatErrs = {};
      Object.entries(errData).forEach(([field, msgs]) => {
        flatErrs[field] = Array.isArray(msgs) ? msgs[0] : msgs;
      });
      if (Object.keys(flatErrs).length) {
        setErrors(flatErrs);
      } else {
        setApiError(
          err?.response?.data?.detail
          || err?.response?.data?.error
          || 'Registration failed. Please try again.',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Navbar />

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-violet-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-md mx-auto px-4 pt-24 pb-20">

        <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="mb-8">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-cyan-400 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back to Home
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-8 backdrop-blur-sm shadow-2xl shadow-slate-950/50"
        >
          <div className="text-center mb-2">
            <h1 className="text-2xl font-bold text-white">Create Account</h1>
            <p className="text-sm text-gray-400 mt-1">Join to save your habitability predictions</p>
          </div>

          {/* Profile image upload */}
          <AvatarUpload preview={profileImage} onImageSelect={setProfileImage} />

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

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex items-center gap-2.5 rounded-lg bg-emerald-900/30 border border-emerald-500/30 px-3.5 py-2.5"
            >
              <CheckCircle size={15} className="text-emerald-400 flex-shrink-0" />
              <p className="text-sm text-emerald-300">Account created! Redirecting to Explore…</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field
              label="Username" name="username" placeholder="astronomer42"
              icon={User} autoComplete="username"
              value={formData.username} onChange={handleChange} error={errors.username}
            />
            <Field
              label="Email Address" name="email" type="email" placeholder="you@example.com"
              icon={Mail} autoComplete="email"
              value={formData.email} onChange={handleChange} error={errors.email}
            />
            <Field
              label="Password" name="password" placeholder="At least 6 characters"
              icon={Lock} autoComplete="new-password"
              showToggle toggled={showPassword} onToggle={() => setShowPassword(v => !v)}
              value={formData.password} onChange={handleChange} error={errors.password}
            />
            <Field
              label="Confirm Password" name="confirmPassword" placeholder="Repeat password"
              icon={Lock} autoComplete="new-password"
              showToggle toggled={showConfirm} onToggle={() => setShowConfirm(v => !v)}
              value={formData.confirmPassword} onChange={handleChange} error={errors.confirmPassword}
            />

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="pt-2">
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
                    Creating account…
                  </span>
                ) : (
                  <>Create Account <ArrowRight className="w-4 h-4" /></>
                )}
              </motion.button>
            </motion.div>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-700/60" />
            <span className="text-xs text-gray-500">Already have an account?</span>
            <div className="flex-1 h-px bg-slate-700/60" />
          </div>

          <Link to="/login">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 bg-transparent border border-slate-700 hover:border-cyan-500/50 text-gray-300 hover:text-cyan-400 rounded-lg text-sm font-medium transition-all"
            >
              Sign In Instead
            </motion.button>
          </Link>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default SignIn;
