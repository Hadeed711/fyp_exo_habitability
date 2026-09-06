import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown, Download, Github,
  Cpu, Database, FlaskConical, Users, BookOpen, Telescope,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AboutHeroCube from '../components/AboutHeroCube';
import { getModelReport } from '../services/api';

/*
 * Every performance figure on this page is fetched from /api/models/report/,
 * which reads the metadata written by scripts/train_models.py. Nothing here is
 * hard-coded: if the models are retrained, this page changes with them. The
 * previous version quoted a hard-coded "100% accuracy" that came from a
 * label-leaking feature set and had no way of ever being corrected.
 */
const useModelReport = () => {
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getModelReport('auto')
      .then((data) => { if (!cancelled) setReport(data); })
      .catch((err) => { if (!cancelled) setError(err); });
    return () => { cancelled = true; };
  }, []);

  return { report, error };
};

const pct = (value) => (value === null || value === undefined ? '—' : `${(value * 100).toFixed(1)}%`);
const num = (value) => (value === null || value === undefined ? '—' : value.toLocaleString());

/* ─── helpers ─── */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] },
});

/* ─── Accordion ─── */
const AccordionItem = ({ title, children, delay = 0 }) => {
  const [open, setOpen] = useState(false);
  return (
    <motion.div {...fadeUp(delay)} className="border border-slate-700/60 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 bg-slate-800/50 hover:bg-slate-800/80 transition-colors text-left"
      >
        <span className="text-sm font-medium text-white">{title}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown className="w-4 h-4 text-cyan-400" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="c"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 py-4 bg-slate-800/20 border-t border-slate-700/40 text-sm text-gray-400 leading-relaxed">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ─── Section heading ─── */
const SectionHeading = ({ icon: Icon, label, color = 'cyan' }) => {
  const colors = {
    cyan:   'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    blue:   'text-blue-400 bg-blue-500/10 border-blue-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    amber:  'text-amber-400 bg-amber-500/10 border-amber-500/20',
  };
  return (
    <div className={`inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase border rounded-full px-3 py-1 mb-4 ${colors[color]}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </div>
  );
};

/* ─── Stat Card ─── */
const StatCard = ({ label, value, sub, delay = 0, accent = 'cyan' }) => {
  const ring = { cyan: 'border-cyan-500/30 shadow-cyan-500/10', green: 'border-green-500/30 shadow-green-500/10' };
  const text = { cyan: 'text-cyan-400', green: 'text-green-400' };
  return (
    <motion.div
      {...fadeUp(delay)}
      className={`bg-slate-800/60 border rounded-xl p-5 shadow-lg ${ring[accent] ?? ring.cyan}`}
    >
      <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">{label}</p>
      <p className={`text-3xl font-bold ${text[accent] ?? text.cyan}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </motion.div>
  );
};

/* ─── Mission Badge ─── */
const MissionCard = ({ name, count, year, desc, src, color, delay = 0 }) => {
  const colors = {
    purple: { badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30', dot: 'bg-purple-400', bar: 'bg-purple-500' },
    blue:   { badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',   dot: 'bg-blue-400',   bar: 'bg-blue-500'   },
    cyan:   { badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',   dot: 'bg-cyan-400',   bar: 'bg-cyan-500'   },
  }[color] ?? {};
  return (
    <motion.div
      {...fadeUp(delay)}
      className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600/60 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
          <h3 className="text-sm font-semibold text-white">{name}</h3>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colors.badge}`}>{count}</span>
      </div>
      <p className="text-xs text-gray-500 mb-3">{year}</p>
      <p className="text-sm text-gray-400 leading-relaxed mb-3">{desc}</p>
      <p className="text-xs text-gray-600 font-mono">{src}</p>
    </motion.div>
  );
};

/* ─── Team Card ─── */
const TeamCard = ({ initials, name, sub, note, colorClass, delay = 0 }) => (
  <motion.div
    {...fadeUp(delay)}
    className="flex items-start gap-4 p-5 bg-slate-800/40 border border-slate-700/40 rounded-xl hover:border-slate-600/60 transition-colors"
  >
    <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${colorClass}`}>
      {initials}
    </div>
    <div>
      <p className="text-sm font-semibold text-white">{name}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      {note && <p className="text-xs text-gray-600 mt-1">{note}</p>}
    </div>
  </motion.div>
);

/* ─── Resource Button ─── */
const ResourceButton = ({ icon: Icon, label, href, download, delay = 0 }) => (
  <motion.a
    href={href}
    download={download}
    target={download ? undefined : '_blank'}
    rel={download ? undefined : 'noopener noreferrer'}
    {...fadeUp(delay)}
    whileHover={{ x: 4 }}
    className="w-full flex items-center gap-3 px-5 py-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl text-sm text-cyan-400 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all text-left cursor-pointer"
  >
    <Icon className="w-4 h-4 flex-shrink-0" />
    <span>{label}</span>
    <span className="ml-auto text-gray-600 text-xs">→</span>
  </motion.a>
);

/* ════════════════════════════════════
   MAIN ABOUT PAGE
  ═══════════════════════════════════ */
const About = () => {
  const { report } = useModelReport();

  const perClass = report?.oof_per_class ?? [];
  const habitableRow = perClass.find((row) => row.class === 'POTENTIALLY_HABITABLE');
  const zoneRow = perClass.find((row) => row.class === 'HABITABILITY_ZONE');
  const degraded = report?.degraded_input ?? [];
  const worstDegraded = degraded.length ? degraded[degraded.length - 1] : null;
  const transfer = report?.leave_one_mission_out ?? [];
  const objects = report?.training_objects ?? null;

  return (
    <div className="w-full min-h-screen bg-slate-950 text-white overflow-x-hidden">
      <Navbar />

      {/* ╔══════════════════════════════╗
          ║  HERO                        ║
          ╚══════════════════════════════╝ */}
      <section className="relative flex items-center">
        {/* ambient glow layers */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-cyan-500/5 blur-[120px]" />
          <div className="absolute top-1/4 right-0 w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[120px]" />
          <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full bg-purple-500/4 blur-[100px]" />
          {/* subtle grid */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(rgba(100,200,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(100,200,255,.6) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 pt-32 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="text-center lg:text-left">
              <motion.div {...fadeUp(0.1)}>
                <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-cyan-400 transition-colors mb-8">
                  ← Back to Home
                </Link>
              </motion.div>

              <motion.div {...fadeUp(0.15)}>
                <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-3 py-1 mb-6">
                  <Telescope className="w-3.5 h-3.5" />
                  Final Year Project · 2024
                </span>
              </motion.div>

              <motion.h1 {...fadeUp(0.2)} className="text-5xl sm:text-6xl font-extrabold leading-tight mb-6">
                About&nbsp;&amp;&nbsp;
                <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  Methodology
                </span>
              </motion.h1>

              <motion.p {...fadeUp(0.25)} className="text-base text-gray-400 leading-relaxed max-w-xl mb-10 lg:mx-0 mx-auto">
                An AI-powered platform that combines machine learning with NASA astronomical
                data to predict and visualise the habitability of exoplanets discovered by
                Kepler, K2, and TESS missions.
              </motion.p>

              {/* mini stat row */}
              <motion.div {...fadeUp(0.3)} className="flex flex-wrap justify-center lg:justify-start gap-4 mb-4">
                {[
                  { v: num(objects), l: 'Exoplanets' },
                  { v: report ? report.oof_macro_f1.toFixed(3) : '—', l: 'Macro F1 (out-of-fold)' },
                  { v: report ? String(report.n_features) : '—', l: 'Physical Features' },
                ].map(({ v, l }) => (
                  <div key={l} className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-6 py-3 text-center">
                    <p className="text-xl font-bold text-cyan-400">{v}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{l}</p>
                  </div>
                ))}
              </motion.div>
            </div>

            <motion.div {...fadeUp(0.22)}>
              <AboutHeroCube />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Content wrapper ─── */}
      <div className="relative max-w-5xl mx-auto px-4 sm:px-8 pb-24 space-y-8">

        {/* divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-700/60 to-transparent" />

        {/* ╔══════════════════════════════╗
            ║  Project Overview            ║
            ╚══════════════════════════════╝ */}
        <motion.section {...fadeUp(0.05)}>
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/50 rounded-2xl p-8">
            <SectionHeading icon={Telescope} label="Project Overview" color="cyan" />
            <h2 className="text-xl font-bold text-white mb-4">AI-Powered Exoplanet Habitability Explorer</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-400 leading-relaxed">
              <p>
                This final year project combines machine learning with astronomical data to predict
                and visualise the potential habitability of exoplanets discovered by NASA's Kepler
                and TESS missions.
              </p>
              <p>
                The platform gives researchers, students, and space enthusiasts powerful tools to
                explore planetary characteristics, compare multiple exoplanets, and run custom
                simulations to predict habitability scores based on key physical parameters.
              </p>
            </div>
          </div>
        </motion.section>

        {/* ╔══════════════════════════════╗
            ║  AI Model Architecture       ║
            ╚══════════════════════════════╝ */}
        <motion.section {...fadeUp(0.1)}>
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/50 rounded-2xl p-8">
            <SectionHeading icon={Cpu} label="AI Model Architecture" color="blue" />
            <h2 className="text-xl font-bold text-white mb-6">
              Unified Habitability Classifier
              {report?.model_type ? ` · ${report.model_type}` : ''}
            </h2>

            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
              A single {report?.model_type ?? 'gradient-boosted'} classifier is trained on all
              {' '}{num(objects)} objects pooled across K2, Kepler and TESS. Pooling matters: only
              {' '}{habitableRow ? habitableRow.support : '—'} objects in the whole catalogue meet the
              potentially-habitable criteria, and splitting those across three per-mission models leaves
              too few in each to estimate anything reliably. Per-mission models are still trained as an
              ablation and can be selected from the API, but the pooled model is the default.
            </p>

            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
              Every figure below is read live from{' '}
              <code className="text-cyan-300 bg-slate-900/60 px-1.5 py-0.5 rounded text-xs">/api/models/report/</code>,
              which serves the metadata written by the training run — this page cannot drift from the
              artefacts it describes.
            </p>

            {/* per-class metrics, out-of-fold */}
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-semibold">
              Per-class performance &middot; 5-fold out-of-fold
            </p>
            <div className="overflow-x-auto mb-3 rounded-xl border border-slate-700/40 bg-slate-900/40">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    {['Class', 'Precision', 'Recall', 'F1', 'Objects'].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {perClass.length === 0 && (
                    <tr><td colSpan={5} className="px-5 py-4 text-gray-500">Loading metrics from the API&hellip;</td></tr>
                  )}
                  {perClass.map((row, i) => (
                    <tr key={row.class} className={i < perClass.length - 1 ? 'border-b border-slate-700/30' : ''}>
                      <td className="px-5 py-3.5 text-white font-medium">{row.class.replace(/_/g, ' ')}</td>
                      <td className="px-5 py-3.5 text-cyan-400 font-semibold">{row.precision.toFixed(3)}</td>
                      <td className="px-5 py-3.5 text-cyan-400 font-semibold">{row.recall.toFixed(3)}</td>
                      <td className="px-5 py-3.5 text-cyan-400 font-semibold">{row.f1.toFixed(3)}</td>
                      <td className="px-5 py-3.5 text-gray-400">{row.support.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mb-8 leading-relaxed">
              Out-of-fold means every object is scored by a model that never saw it during training, so the
              rare classes report their full support instead of the one or two rows a single held-out split
              would leave them.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Macro F1"         value={report ? report.oof_macro_f1.toFixed(3) : '\u2014'} sub="out-of-fold, all classes" delay={0.12} accent="green" />
              <StatCard label="Habitable Recall" value={habitableRow ? habitableRow.recall.toFixed(3) : '\u2014'} sub={habitableRow ? habitableRow.support + ' objects' : '\u2014'} delay={0.14} accent="cyan" />
              <StatCard label="Zone F1"          value={zoneRow ? zoneRow.f1.toFixed(3) : '\u2014'} sub={zoneRow ? zoneRow.support + ' objects' : '\u2014'} delay={0.16} accent="green" />
              <StatCard label="Catalogue Size"   value={num(objects)} sub="across 3 missions" delay={0.18} accent="cyan" />
            </div>

            {/* the honest caveat */}
            <div className="mt-8 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-5">
              <p className="text-sm font-semibold text-cyan-300 mb-2">What these numbers do and do not mean</p>
              <p className="text-sm text-gray-400 leading-relaxed">
                Habitability labels are a <span className="text-white">documented physics rule</span>, not observed
                ground truth &mdash; no exoplanet has confirmed habitability. The classifier is trained on the same
                observables that rule consumes, so it is a learned surrogate of it, and a high score means the model
                reproduces the rule faithfully. It is <span className="text-white">not</span> evidence of scientific
                discovery. The two results below are the ones that show capability the rule does not have.
              </p>
            </div>

            {/* degraded-input robustness: the real contribution */}
            <div className="mt-6">
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-semibold">
                Robustness to missing measurements
              </p>
              <div className="overflow-x-auto rounded-xl border border-slate-700/40 bg-slate-900/40">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      {['Observables withheld', 'Model accuracy', 'Rule accuracy', 'Rule undefined'].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {degraded.length === 0 && (
                      <tr><td colSpan={4} className="px-5 py-4 text-gray-500">Loading&hellip;</td></tr>
                    )}
                    {degraded.map((row, i) => (
                      <tr key={row.observables_withheld} className={i < degraded.length - 1 ? 'border-b border-slate-700/30' : ''}>
                        <td className="px-5 py-3.5 text-white font-medium">{row.observables_withheld}</td>
                        <td className="px-5 py-3.5 text-green-400 font-semibold">{pct(row.model_accuracy)}</td>
                        <td className="px-5 py-3.5 text-amber-400 font-semibold">{pct(row.rule_accuracy)}</td>
                        <td className="px-5 py-3.5 text-gray-400">{pct(row.rule_undefined_rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Real catalogue rows are incomplete. Withhold enough measurements and the rule cannot be evaluated
                at all, while the model still classifies most objects correctly &mdash; because it was trained on
                masked inputs and is told which values were derived rather than measured.
              </p>
            </div>

            {/* cross-mission generalisation */}
            <div className="mt-6">
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-semibold">
                Leave-one-mission-out generalisation
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {transfer.length === 0 && <p className="text-sm text-gray-500">Loading&hellip;</p>}
                {transfer.map((row) => (
                  <div key={row.held_out_mission} className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Held out</p>
                    <p className="text-sm font-semibold text-white mb-2">{row.held_out_mission.toUpperCase()}</p>
                    <p className="text-lg font-bold text-cyan-400">{row.macro_f1.toFixed(3)}</p>
                    <p className="text-xs text-gray-500">macro F1 &middot; {row.n_objects.toLocaleString()} objects</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Trained on two missions, evaluated on the third. Each mission has a different instrument,
                detection bias and period distribution, so a model that had memorised dataset structure rather
                than physics would fail here.
              </p>
            </div>

            {/* Missing data explanation */}
            <div className="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
              <div className="flex items-start gap-3">
                <span className="text-amber-400 text-lg mt-0.5">⚠</span>
                <div>
                  <p className="text-sm font-semibold text-amber-300 mb-2">How are planets with incomplete measurements handled?</p>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Most catalogue rows are missing something. Rather than substituting a median or a zero, missing
                    quantities are <span className="text-white">derived from first principles</span> wherever the physics
                    allows: orbital distance from period and stellar mass via Kepler&rsquo;s third law, stellar luminosity
                    from radius and temperature via Stefan&ndash;Boltzmann, insolation from luminosity and distance via the
                    inverse-square law, and equilibrium temperature from insolation. Feeding Earth&rsquo;s orbital period
                    and the Sun&rsquo;s radius and temperature through this chain recovers 1.00&nbsp;AU, 1.00 Earth flux
                    and 255&nbsp;K exactly.
                  </p>
                  <p className="text-sm text-gray-400 leading-relaxed mt-3">
                    Every derived value is <span className="text-white">flagged as derived</span> and the flags are model
                    inputs, so the classifier knows which numbers are measured and which are inferred &mdash; that is what
                    produces the graceful degradation shown in the robustness table above. Objects whose habitability
                    criteria cannot be resolved even after derivation are excluded rather than guessed at, and objects the
                    archives disposition as <span className="text-amber-300 font-medium">false positives</span> are dropped
                    entirely: they are not planets.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ╔══════════════════════════════╗
            ║  Data Sources                ║
            ╚══════════════════════════════╝ */}
        <motion.section {...fadeUp(0.15)}>
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/50 rounded-2xl p-8">
            <SectionHeading icon={Database} label="Data Sources" color="purple" />
            <h2 className="text-xl font-bold text-white mb-6">NASA Mission Datasets</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MissionCard
                name="K2 Mission"
                count="854 objects"
                year="2014 – 2018"
                desc="Extended Kepler mission observing different fields along the ecliptic plane. Provided a diverse sample across multiple stellar environments."
                src="keplerscience.arc.nasa.gov/k2.html"
                color="purple"
                delay={0.17}
              />
              <MissionCard
                name="Kepler Mission"
                count="4,619 objects"
                year="2009 – 2018"
                desc="NASA's primary planet-hunting telescope. Discovered thousands of confirmed exoplanets by monitoring stellar brightness for transits."
                src="archive.stsci.edu/kepler"
                color="blue"
                delay={0.19}
              />
              <MissionCard
                name="TESS Mission"
                count="5,905 objects"
                year="2018 – present"
                desc="Surveys nearly the entire sky, focusing on nearby bright stars to find planets suitable for atmospheric characterisation."
                src="archive.stsci.edu/tess"
                color="cyan"
                delay={0.21}
              />
            </div>
          </div>
        </motion.section>

        {/* ╔══════════════════════════════╗
            ║  Detailed Methodology        ║
            ╚══════════════════════════════╝ */}
        <motion.section {...fadeUp(0.2)}>
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/50 rounded-2xl p-8">
            <SectionHeading icon={FlaskConical} label="Detailed Methodology" color="cyan" />
            <h2 className="text-xl font-bold text-white mb-6">Research Process</h2>
            <div className="space-y-2">
              <AccordionItem title="Feature Engineering & Selection" delay={0.22}>
The model sees 25 features, all computable from the nine observables the API accepts: planet radius,
                equilibrium temperature, insolation flux, orbital period, semi-major axis, eccentricity, stellar
                temperature, stellar radius and stellar mass &mdash; plus derived luminosity, log transforms,
                planet/star radius ratio, orbit size in stellar radii, a continuous habitable-zone position using
                Kopparapu (2013) boundaries, and nine flags marking which inputs were derived rather than measured.
                Deliberately excluded: sky coordinates, photometric magnitudes and measurement-uncertainty columns,
                which cannot cause habitability &mdash; in the previous model the uncertainty on a visual magnitude
                ranked 7th by importance, a sign it was reading dataset structure rather than physics. Also excluded
                are boolean threshold flags that restated the labelling rule directly.
              </AccordionItem>
              <AccordionItem title="Training Process" delay={0.25}>
Gradient-boosted trees and a random forest are both fitted and the better one selected on out-of-fold
                macro F1 &mdash; macro, because 93% of objects are non-habitable and plain accuracy would be dominated
                by that majority. Class imbalance is handled with balanced sample weights rather than SMOTE, which on
                roughly a hundred habitable planets would interpolate between points that are already near-duplicates.
                Training rows are additionally duplicated with random subsets of observables masked out, so the model
                learns to classify from partial evidence. Masking and feature scaling are fitted inside each
                cross-validation fold, never across, so no information leaks into the held-out fold.
              </AccordionItem>
              <AccordionItem title="Validation & Testing" delay={0.28}>
Headline metrics are 5-fold out-of-fold: every object is scored by a model that never saw it, so the
                126 potentially-habitable objects all contribute to precision and recall instead of the ~19 a single
                held-out split would leave. A single split was rejected precisely because it had previously left the
                rare class with one test object, making its reported F1 meaningless. Two further evaluations test
                capability the labelling rule does not have: progressive withholding of observables, and
                leave-one-mission-out transfer. Reference bodies &mdash; Earth, Mars, Venus and a hot Jupiter &mdash;
                are asserted in the test suite so a regression in the score cannot ship silently.
              </AccordionItem>
            </div>
          </div>
        </motion.section>

        {/* ╔══════════════════════════════╗
            ║  Comparison with Research    ║
            ╚══════════════════════════════╝ */}
        <motion.section {...fadeUp(0.25)}>
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/50 rounded-2xl p-8">
            <SectionHeading icon={BookOpen} label="Research Context" color="amber" />
            <h2 className="text-xl font-bold text-white mb-4">Comparison with Existing Research</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-400 leading-relaxed">
              <p>
                Our AI model builds upon established habitability indices including the Earth Similarity Index
                (ESI) and the Habitable Zone Distance (HZD). By incorporating machine learning, we can capture
                complex non-linear relationships between parameters that traditional indices may miss.
              </p>
              <p>
                Comparative studies with ESI show our model achieves similar classifications for well-studied
                planets while providing more nuanced predictions for edge cases and newly discovered candidates.
              </p>
            </div>

            {/* JWST / atmospheric limitation note */}
            <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4">
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1.5">Important Limitation — Atmospheric Data</p>
              <p className="text-sm text-gray-400 leading-relaxed">
                This system predicts habitability from <span className="text-white font-medium">transit photometry</span> (brightness dips), which reveals
                a planet's size and orbit but <span className="text-white font-medium">cannot detect atmospheric composition</span>.
                Characterising a planet's stratosphere, weather patterns, or greenhouse effect requires
                transmission spectroscopy — a technique only available on instruments like the <span className="text-amber-300 font-medium">James Webb Space Telescope (JWST)</span>.
                As a concrete example, <span className="text-white font-medium">Venus</span> would score as potentially habitable using
                transit data alone (similar radius and orbit to Earth), yet its surface temperature is 465 °C due to a runaway greenhouse
                atmosphere that no transit survey can measure. JWST atmospheric observations currently exist for
                only a handful of exoplanets; this catalogue contains no atmospheric composition data at all.
              </p>
            </div>
          </div>
        </motion.section>

        {/* ╔══════════════════════════════╗
            ║  Team                        ║
            ╚══════════════════════════════╝ */}
        <motion.section {...fadeUp(0.3)}>
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/50 rounded-2xl p-8">
            <SectionHeading icon={Users} label="Project Team" color="blue" />
            <h2 className="text-xl font-bold text-white mb-6">Meet the Team</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <TeamCard
                initials="HA" name="Hadeed Ahmad"
                sub="2022-AG-7746 · Final Year Student"
                note="Data Analysis, ML integration & Full Stack Development"
                colorClass="bg-cyan-500/20 text-cyan-400"
                delay={0.32}
              />
              <TeamCard
                initials="TA" name="Tahzeeb Arif"
                sub="2022-AG-8065 · Final Year Student"
                note="Full Stack Developer, Data Visualisation"
                colorClass="bg-blue-500/20 text-blue-400"
                delay={0.34}
              />
              <TeamCard
                initials="NA" name="Mam Nabeela Ashraf"
                sub="Project Supervisor"
                note="Research guidance & project oversight"
                colorClass="bg-amber-500/20 text-amber-400"
                delay={0.36}
              />
            </div>
            <p className="text-xs text-gray-600 mt-5 text-center">
              University of Agriculture Faisalabad · Hybrid Agile Incremental Development Methodology
            </p>
          </div>
        </motion.section>

        {/* ╔══════════════════════════════╗
            ║  3D Model Credits            ║
            ╚══════════════════════════════╝ */}
        <motion.section {...fadeUp(0.32)}>
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/50 rounded-2xl p-8">
            <SectionHeading icon={BookOpen} label="3D Model Attribution" color="cyan" />
            <h2 className="text-xl font-bold text-white mb-4">Hero Cube Model Credits</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              "Impossible Cube" (
              <a
                href="https://skfb.ly/6xNIY"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-300 hover:text-cyan-200 underline underline-offset-2"
              >
                https://skfb.ly/6xNIY
              </a>
              ) by tomciomalina is licensed under Creative Commons Attribution (
              <a
                href="http://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-300 hover:text-cyan-200 underline underline-offset-2"
              >
                http://creativecommons.org/licenses/by/4.0/
              </a>
              ).
            </p>
          </div>
        </motion.section>

        {/* ╔══════════════════════════════╗
            ║  Resources                   ║
            ╚══════════════════════════════╝ */}
        <motion.section {...fadeUp(0.35)}>
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/50 rounded-2xl p-8">
            <SectionHeading icon={BookOpen} label="Resources" color="cyan" />
            <h2 className="text-xl font-bold text-white mb-6">Documentation &amp; Links</h2>
            <div className="space-y-2">
              <ResourceButton icon={Download} label="Download Literature Review (PDF)"   href="/Literature_Review_FYP.pdf"   download="Literature_Review_FYP.pdf"   delay={0.37} />
              <ResourceButton icon={Download} label="Download Model Documentation (PDF)" href="/Model_Documentation_FYP.pdf" download="Model_Documentation_FYP.pdf" delay={0.39} />
              <ResourceButton icon={Github}   label="Access Project Repository (GitHub)" href="https://github.com/Hadeed711/fyp_exo_habitability" delay={0.41} />
            </div>
          </div>
        </motion.section>

      </div>

      <Footer />
    </div>
  );
};

export default About;
