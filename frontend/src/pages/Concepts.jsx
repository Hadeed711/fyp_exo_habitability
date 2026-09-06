import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Globe, Thermometer, Star, Telescope, Brain, Orbit,
         Zap, BookOpen, HelpCircle, Activity } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';

/**
 * Concepts Page — Important concepts every user should know
 * before exploring the ExoHab Explorer platform.
 */

const concepts = [
  {
    id: 'exoplanet',
    icon: Globe,
    color: 'cyan',
    gradient: 'from-cyan-500/20 to-cyan-500/5',
    border: 'border-cyan-500/30',
    iconBg: 'bg-cyan-500/20 text-cyan-400',
    title: 'What is an Exoplanet?',
    summary: 'A planet orbiting a star outside our Solar System.',
    content: `An exoplanet (short for extrasolar planet) is any planet that orbits a star other 
than our Sun. Thousands have been discovered by missions like Kepler, K2, and TESS using techniques 
such as the transit method (measuring the slight dimming of a star as a planet crosses in front of it).

Exoplanets come in many types: rocky Earth-sized worlds, "super-Earths" larger than Earth but 
smaller than Neptune, gas giants like Jupiter, and hot Jupiters orbiting extremely close to their 
stars. Unlike planets in our Solar System, we cannot visit or see them directly — everything we 
know comes from indirect measurements.

This platform focuses on exoplanets from three NASA missions: Kepler (2009–2018), K2 (2014–2018), 
and TESS (2018–present).`,
    tag: 'Foundation'
  },
  {
    id: 'habitability',
    icon: Activity,
    color: 'green',
    gradient: 'from-green-500/20 to-green-500/5',
    border: 'border-green-500/30',
    iconBg: 'bg-green-500/20 text-green-400',
    title: 'What is Exoplanet Habitability?',
    summary: 'The potential of an exoplanet to support liquid water and life.',
    content: `Habitability refers to the likelihood that an exoplanet could support life as we know 
it — primarily the existence of liquid water on its surface. Scientists assess this using several 
physical properties:

• **Equilibrium Temperature**: A planet's blackbody temperature (without atmospheric effects). 
  The "Goldilocks" range is roughly 200–350 K.
• **Planet Radius**: Rocky planets (< 2 Earth radii) are more likely to be solid and retain thin 
  atmospheres, unlike gas giants.
• **Insolation Flux**: The amount of stellar radiation received compared to Earth. Values near 
  0.3–1.7 S⊕ are considered potentially habitable.
• **Orbital Period**: Influences seasons and long-term climate stability.
• **Stellar Type**: Stars similar to our Sun (G-type) or cooler (K, M-type) are the best candidates.

Our AI models combine these parameters to produce a habitability score (0–100%) and classify 
exoplanets into three categories: Potentially Habitable, Habitability Zone, or Non-Habitable.`,
    tag: 'Core Concept'
  },
  {
    id: 'hz',
    icon: Orbit,
    color: 'yellow',
    gradient: 'from-yellow-500/20 to-yellow-500/5',
    border: 'border-yellow-500/30',
    iconBg: 'bg-yellow-500/20 text-yellow-400',
    title: 'The Habitable Zone (Goldilocks Zone)',
    summary: 'The orbital region around a star where liquid water can exist on a planet\'s surface.',
    content: `The Habitable Zone (HZ), often called the "Goldilocks Zone," is the range of orbital 
distances from a star where conditions might be just right — not too hot, not too cold — for liquid 
water to exist on a planet's surface.

The HZ boundaries depend heavily on the host star's luminosity and temperature:
• **F-type stars** (hotter, brighter): HZ is farther out (~1.4–2.4 AU)
• **G-type stars** (Sun-like): HZ is at ~0.95–1.67 AU (Earth is at 1 AU)
• **K-type stars** (cooler, dimmer): HZ is closer at ~0.38–1.02 AU
• **M-type stars** (red dwarfs): HZ is very close at ~0.08–0.23 AU

Being in the HZ does not guarantee habitability — it merely means liquid water is possible. 
A planet still needs the right atmosphere, geology, and other factors. Venus, for example, 
is technically at the inner edge of the HZ but has a runaway greenhouse effect making it 
uninhabitable (see the Important Note about Venus below).`,
    tag: 'Zone'
  },
  {
    id: 'radius',
    icon: Globe,
    color: 'blue',
    gradient: 'from-blue-500/20 to-blue-500/5',
    border: 'border-blue-500/30',
    iconBg: 'bg-blue-500/20 text-blue-400',
    title: 'Planet Radius (R⊕)',
    summary: 'Size of the exoplanet compared to Earth\'s radius.',
    content: `Planet radius is measured in units of Earth radii (R⊕), where 1 R⊕ = Earth's radius 
(~6371 km). It is one of the most important habitability indicators because:

• **0.5–1.5 R⊕** — Earth-sized rocky worlds. Most likely to have solid surfaces.
• **1.5–2.0 R⊕** — Super-Earths. May be rocky or have thick hydrogen envelopes.
• **2.0–4.0 R⊕** — Mini-Neptunes / Sub-Neptunes. Likely gas/ice-dominated.
• **> 4.0 R⊕** — Giant planets (Neptune, Jupiter-like). Gas giants are generally 
  considered non-habitable.

The "radius gap" (around 1.5–2.0 R⊕) is a well-observed boundary separating rocky and 
volatile-rich worlds. Exoplanet radius is detected by the transit method — larger planets 
block more starlight during transits.`,
    tag: 'Parameter'
  },
  {
    id: 'temperature',
    icon: Thermometer,
    color: 'orange',
    gradient: 'from-orange-500/20 to-orange-500/5',
    border: 'border-orange-500/30',
    iconBg: 'bg-orange-500/20 text-orange-400',
    title: 'Equilibrium Temperature (K)',
    summary: 'The theoretical surface temperature assuming no greenhouse effect.',
    content: `Equilibrium temperature (pl_eqt in our data) is the theoretical temperature a 
planet would have if it were a perfect blackbody in radiative equilibrium with its star — 
i.e., without any atmosphere or greenhouse effect.

This is important to understand: **Venus has an equilibrium temperature of ~232 K**, suggesting 
it could support liquid water based on orbital parameters alone. Yet Venus's actual surface 
temperature is ~737 K due to a massive CO₂ greenhouse effect. Our models use equilibrium 
temperature because atmospheric composition data is not available for exoplanets — we can only 
measure what light is absorbed/emitted.

Temperature ranges for habitability:
• **< 170 K** — Too cold for liquid water
• **170–373 K** — Potentially habitable range
• **> 373 K** — Too hot (water boils)
• **> 700 K** — Extreme heat (Venus-like runaway greenhouse zone)

⚠️ **Important**: The 'Venus-like' preset uses pl_eqt = 232 K (Venus's true equilibrium 
temperature), NOT the actual surface temperature. This is the physically correct input for 
the model, as it mirrors how exoplanet data is measured.`,
    tag: 'Parameter'
  },
  {
    id: 'insolation',
    icon: Zap,
    color: 'yellow',
    gradient: 'from-yellow-400/20 to-yellow-400/5',
    border: 'border-yellow-400/30',
    iconBg: 'bg-yellow-400/20 text-yellow-400',
    title: 'Insolation Flux (S⊕)',
    summary: 'How much stellar radiation an exoplanet receives compared to Earth.',
    content: `Insolation flux measures the total energy received by a planet from its host star, 
expressed in units of Earth's insolation (S⊕ = 1361 W/m²). It's closely related to orbital 
distance and stellar luminosity:

S = L_star / (4π × d²)

Where L_star is stellar luminosity and d is orbital distance.

Habitability thresholds:
• **< 0.1 S⊕** — Too little energy; likely frozen world
• **0.25–4.0 S⊕** — Conservative habitable zone
• **0.1–10.0 S⊕** — Optimistic habitable zone  
• **> 10 S⊕** — Too hot; likely runaway greenhouse
• **> 40 S⊕** — Extreme irradiation (hot Jupiters, lava worlds)

Earth receives 1.0 S⊕ by definition. Mars receives 0.43 S⊕ (further out, less energy), 
and Venus receives 1.91 S⊕ (closer in, more energy).`,
    tag: 'Parameter'
  },
  {
    id: 'stellar',
    icon: Star,
    color: 'purple',
    gradient: 'from-purple-500/20 to-purple-500/5',
    border: 'border-purple-500/30',
    iconBg: 'bg-purple-500/20 text-purple-400',
    title: 'Stellar Properties (Teff, R☉, M☉)',
    summary: 'Characteristics of the host star that influence planetary habitability.',
    content: `The host star's properties directly determine the environment an exoplanet lives in:

**Stellar Effective Temperature (Teff, Kelvin)**
Classifies the star's spectral type:
• M-dwarfs: 2300–3700 K (red dwarfs, most common)
• K-dwarfs: 3700–5200 K (orange dwarfs — considered "best" for life)
• G-dwarfs: 5200–6000 K (Sun-like stars, our Sun is ~5778 K)
• F-dwarfs: 6000–7500 K (brighter, shorter lifespan)

**Stellar Radius (R☉)**: Controls how much of a planet's star-transit is detected. 
Larger stars = harder to detect small rocky planets.

**Stellar Mass (M☉)**: Determines orbital dynamics via Kepler's laws. Also affects 
stellar lifetime — lower mass stars live much longer, giving more time for life to evolve.

K-type and M-type stars are considered the best targets for habitable exoplanet searches 
because they are abundant, long-lived, and have stable habitable zones.`,
    tag: 'Parameter'
  },
  {
    id: 'missions',
    icon: Telescope,
    color: 'cyan',
    gradient: 'from-cyan-400/20 to-cyan-400/5',
    border: 'border-cyan-400/30',
    iconBg: 'bg-cyan-400/20 text-cyan-400',
    title: 'The Three Missions: Kepler, K2, TESS',
    summary: 'NASA space missions that discovered thousands of exoplanets.',
    content: `This platform uses data from three NASA exoplanet-hunting missions:

**Kepler (2009–2018)**
Observed ~150,000 stars continuously in a fixed field of the Milky Way. Discovered 2,600+ 
confirmed exoplanets using the transit method. Our Kepler dataset contains the most 
statistically complete sample of exoplanets.

**K2 (2014–2018)**
Kepler's extended mission after losing two reaction wheels. Observed different parts of 
the sky in 80-day campaigns. Discovered ~500+ confirmed exoplanets across diverse 
stellar environments.

**TESS (2018–present)**
The Transiting Exoplanet Survey Satellite. Surveys nearly the entire sky in two-year 
cycles. Focuses on bright, nearby stars — ideal for follow-up atmospheric studies. 
Has found 7,000+ candidates so far.

All three missions use the **photometric transit method**: measuring tiny dips in stellar 
brightness when a planet passes in front of its star as seen from Earth.`,
    tag: 'Mission'
  },
  {
    id: 'ml',
    icon: Brain,
    color: 'green',
    gradient: 'from-green-400/20 to-green-400/5',
    border: 'border-green-400/30',
    iconBg: 'bg-green-400/20 text-green-400',
    title: 'How Our AI / ML Models Work',
    summary: 'One classifier trained on all three missions pooled, and what its score really means.',
    content: `ExoHab Explorer uses a single XGBoost classifier trained on all 11,378 catalogued
objects pooled across Kepler, K2 and TESS. Per-mission models are also trained, but only as an
ablation: just 126 objects in the entire catalogue meet the potentially-habitable criteria, and
splitting those across three models leaves too few in each to estimate anything reliably.

**Training Labels - read this carefully:**
The three classes come from a **documented physics rule**, not from observed ground truth. No
exoplanet has confirmed habitability, so there is nothing to observe. The rule is:
1. **Potentially Habitable** - radius 0.5-2.0 R(E), flux 0.25-4.0 S(E), equilibrium temperature
180-310 K, and orbital period 10-500 days (all four required)
2. **Habitability Zone** - flux 0.25-4.0 S(E) OR equilibrium temperature 200-350 K
3. **Non-Habitable** - everything else

Because the classifier is trained on the same measurements the rule consumes, it is a **learned
surrogate** of that rule. High accuracy means it reproduces the rule faithfully - it is not
evidence of a scientific discovery, and we do not present it as one.

**So why use ML at all?**
Because the rule breaks on incomplete data and the model does not. Real catalogue rows are
missing measurements. Withhold four of eight observables and the rule cannot be evaluated for
95% of objects, while the model still classifies 97.6% of them correctly. It gets there by being
trained on deliberately masked inputs, and by being told which of its inputs were measured and
which were derived.

**Features (25, all derived from 9 observables):**
- Planet radius, equilibrium temperature, insolation flux, orbital period and distance, eccentricity
- Stellar temperature, radius, mass and derived luminosity
- Log transforms, planet/star radius ratio, orbit size in stellar radii
- Continuous habitable-zone position using Kopparapu (2013) boundaries
- Nine flags marking which inputs were derived rather than measured

Deliberately **excluded**: boolean threshold flags that simply restate the labelling rule. An
earlier version included them and reported 100% accuracy - the model was reading the answer off
its own input. Sky coordinates, photometric magnitudes and measurement-uncertainty columns are
excluded for the same reason: they cannot cause habitability.

**Important Limitation:**
These models use orbital and physical parameters ONLY. They do not account for atmospheric
composition, magnetic fields, geological activity, or other habitability factors that cannot
currently be measured for exoplanets.`,
    tag: 'AI/ML'
  },
  {
    id: 'score',
    icon: Activity,
    color: 'blue',
    gradient: 'from-blue-400/20 to-blue-400/5',
    border: 'border-blue-400/30',
    iconBg: 'bg-blue-400/20 text-blue-400',
    title: 'Understanding the Habitability Score',
    summary: 'What the 0-100% score actually means and its limitations.',
    content: `The habitability score blends the classifier with a deterministic physics
calculation:

    score = 0.60 x ML_score + 0.40 x physics_score

**ML_score** collapses the three class probabilities onto one axis: P(habitable) x 1.0 +
P(zone) x 0.5 + P(non-habitable) x 0.0.

**physics_score** is closed-form and hand-checkable: the geometric mean of radius, temperature
and flux similarity to Earth, multiplied by habitable-zone membership and a stellar-type factor.
The geometric mean means any single disqualifying property drags the whole score down - a
Jupiter-sized planet scores zero regardless of its orbit.

**Why 0.60 and not some other number?** It is calibrated, not chosen by taste. A sweep over the
weight and the class thresholds picks the combination that best agrees with the physics label
across all 11,378 objects, using out-of-fold probabilities so the weight is not tuned against
memorised answers. An earlier version of this project used 0.10, which existed only to stop a
broken classifier - one being fed 90% zero-filled features - from dragging Earth-like inputs
down. That bug is fixed and the weight rose accordingly.

**Score Thresholds** (calibrated alongside the weight):
- **>= 71%** (Green) - Potentially Habitable
- **24-70%** (Yellow) - Habitability Zone
- **< 24%** (Red) - Non-Habitable

**What it measures:**
1. Classifier probability across the three habitability classes
2. Temperature similarity to Earth's equilibrium temperature (255 K)
3. Whether insolation falls in the conservative habitable zone
4. Planet size (rocky vs. gas giant)
5. Stellar type suitability

**What it does NOT measure:**
• ❌ Actual atmospheric composition
• ❌ Surface geology or plate tectonics
• ❌ Magnetic field strength (affects atmospheric retention)
• ❌ Surface water presence (direct)
• ❌ Moons or tidal effects

Treat the score as a **priority ranking tool** — higher scores should receive more 
follow-up observation, not as a definitive verdict on life's existence.`,
    tag: 'Score'
  },
  {
    id: 'venus-note',
    icon: HelpCircle,
    color: 'orange',
    gradient: 'from-orange-500/20 to-orange-500/5',
    border: 'border-orange-500/30',
    iconBg: 'bg-orange-500/20 text-orange-400',
    title: '⚠️ Why Does Venus Score ~29% (Not Near 0%)?',
    summary: 'Understanding the Venus prediction — a data modeling limitation.',
    content: `This is an excellent and important question. Venus is clearly non-habitable, 
yet our model gives it around 29%. Here's why, and why that's actually correct behavior:

**What the model receives for Venus:**
• Planet radius: 0.95 R⊕ (nearly identical to Earth — high score)
• Orbital period: 225 days
• Insolation: 1.91 S⊕ (within the optimistic HZ range of 0.1–10)
• Equilibrium temperature: ~232 K (NOT the actual 737 K surface temperature)
• Star: Sun-identical

**Why the equilibrium temperature is used:**
In exoplanet science, we cannot measure actual surface temperatures from light curves. 
We calculate equilibrium temperature — the theoretical temperature without greenhouse 
effect. For exoplanets, this is the standard input. Venus's equilibrium temperature 
is ~232 K, which is actually within the habitable range!

**The real-world gap:**
Venus's actual surface is 737 K due to a CO₂ runaway greenhouse effect. But this 
is caused by atmospheric composition — something we **cannot measure** for exoplanets 
with current technology.

**Conclusion:** The model is working correctly given its data. The ~29% score for 
Venus reflects that its orbital position and size are Earth-similar. The model simply 
cannot account for Venus's thick toxic atmosphere. This is a fundamental limitation 
of current exoplanet habitability assessment, not a bug.`,
    tag: 'Important Note'
  },
];

const tagColors = {
  'Foundation': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  'Core Concept': 'bg-green-500/15 text-green-400 border-green-500/30',
  'Zone': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  'Parameter': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'Mission': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  'AI/ML': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'Score': 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  'Important Note': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
};

const ConceptCard = ({ concept, index }) => {
  const [open, setOpen] = useState(false);
  const Icon = concept.icon;

  return (
    <motion.div
      id={concept.id}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: index * 0.04, ease: 'easeOut' }}
      className={`bg-gradient-to-br ${concept.gradient} border ${concept.border} 
                  rounded-xl overflow-hidden`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-5 flex items-start gap-4 text-left hover:bg-white/5 
                   transition-colors group"
      >
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 
                         mt-0.5 ${concept.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-white font-semibold text-base leading-snug">
              {concept.title}
            </h3>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${tagColors[concept.tag]}`}>
              {concept.tag}
            </span>
          </div>
          <p className="text-slate-400 text-sm">{concept.summary}</p>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 mt-1"
        >
          <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-0">
              <div className="h-px bg-white/10 mb-4" />
              <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                {concept.content.split('\n').map((line, i) => {
                  if (line.trim().startsWith('•')) {
                    return (
                      <div key={i} className="flex items-start gap-2 mt-1.5">
                        <span className="text-cyan-400 mt-0.5 flex-shrink-0">•</span>
                        <span dangerouslySetInnerHTML={{
                          __html: line.replace('•', '').trim()
                            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                        }} />
                      </div>
                    );
                  }
                  if (line.trim() === '') return <div key={i} className="h-2" />;
                  return (
                    <p key={i} className="mt-1" dangerouslySetInnerHTML={{
                      __html: line
                        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                        .replace(/⚠️/g, '<span class="text-orange-400">⚠️</span>')
                        .replace(/❌/g, '<span class="text-red-400">❌</span>')
                    }} />
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const Concepts = () => {
  const [filter, setFilter] = useState('All');
  const tags = ['All', 'Foundation', 'Core Concept', 'Zone', 'Parameter', 'Mission', 'AI/ML', 'Score', 'Important Note'];

  const filtered = filter === 'All' ? concepts : concepts.filter(c => c.tag === filter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-16">
      <Navbar />

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border 
                          border-cyan-500/30 rounded-full text-cyan-400 text-sm mb-6">
            <BookOpen className="w-4 h-4" />
            Learning Center
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Important{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Concepts
            </span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Everything you need to know about exoplanets, habitability science, and 
            how our AI models work — before you start exploring.
          </p>
        </motion.div>
      </div>

      {/* Filter chips */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-6">
        <div className="flex flex-wrap gap-2 justify-center">
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => setFilter(tag)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                filter === tag
                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:border-slate-500'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Concepts list */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-16 space-y-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((concept, i) => (
            <ConceptCard key={concept.id} concept={concept} index={i} />
          ))}
        </AnimatePresence>
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto px-4 sm:px-6 pb-20 text-center"
      >
        <div className="p-8 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border 
                        border-cyan-500/20 rounded-2xl">
          <h2 className="text-2xl font-bold text-white mb-3">Ready to Explore?</h2>
          <p className="text-slate-400 mb-6">
            Now that you understand the concepts, start discovering exoplanets and 
            using our AI habitability predictor.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/explore"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 
                         bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg 
                         font-medium transition-all"
            >
              <Telescope className="w-4 h-4" />
              Explore Exoplanets
            </Link>
            <Link
              to="/upload"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 
                         bg-slate-700 hover:bg-slate-600 text-white rounded-lg 
                         font-medium transition-all border border-slate-600"
            >
              <Brain className="w-4 h-4" />
              Batch Predictions
            </Link>
          </div>
        </div>
      </motion.div>

      <Footer />
    </div>
  );
};

export default Concepts;
