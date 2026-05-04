import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { motion } from 'framer-motion';

const ComingSoon = ({ pageName }) => {
  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Navbar />
      <div className="min-h-screen flex items-center justify-center px-4 pt-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="w-24 h-24 mx-auto mb-8 rounded-full border-4 border-cyan-500/20 border-t-cyan-500"
          />
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {pageName}
          </h1>
          <p className="text-gray-400 text-lg mb-8">
            This page is under construction. Check back soon!
          </p>
          <div className="inline-block px-6 py-2 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            Coming Soon
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default ComingSoon;
