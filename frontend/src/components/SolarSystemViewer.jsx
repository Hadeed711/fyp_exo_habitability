import { useRef, useState, useMemo, useCallback, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, RotateCcw, Pause, Play, Eye, EyeOff, Layers,
  Globe, Clock, Zap, Info, Rocket,
} from 'lucide-react';

// ─── Solar System Data ────────────────────────────────────────────────────────

const PLANETS = [
  {
    name: 'Mercury', orbitRadius: 5.8,  period: 87.97,    size: 0.18,
    type: 'mercury', distanceAU: 0.387, realRadius: 0.383, axialTilt: 0.034,
    rings: null, initialAngle: 0.5,
    fact: 'Smallest planet. Temperature swings from −180 °C to 430 °C.',
    moons: [],
  },
  {
    name: 'Venus',   orbitRadius: 8.2,  period: 224.7,    size: 0.28,
    type: 'venus',   distanceAU: 0.723, realRadius: 0.949, axialTilt: 3.096,
    rings: null, initialAngle: 1.8,
    fact: 'Hottest planet (462 °C mean) due to a runaway greenhouse effect.',
    moons: [],
  },
  {
    name: 'Earth',   orbitRadius: 10.5, period: 365.25,   size: 0.30,
    type: 'earth',   distanceAU: 1.000, realRadius: 1.000, axialTilt: 0.409,
    rings: null, initialAngle: 0.8,
    fact: 'The only planet known to harbour life — so far.',
    moons: [
      { name: 'Moon',     orbitRadius: 0.85, period: 27.32,  size: 0.085, color: '#b8b0a8', initialAngle: 1.2,
        fact: "Earth's only natural satellite. Stabilises our axial tilt." },
    ],
  },
  {
    name: 'Mars',    orbitRadius: 13.8, period: 686.97,   size: 0.22,
    type: 'mars',    distanceAU: 1.524, realRadius: 0.532, axialTilt: 0.440,
    rings: null, initialAngle: 3.2,
    fact: 'The Red Planet. Olympus Mons is the tallest volcano in the solar system.',
    moons: [
      { name: 'Phobos',   orbitRadius: 0.50, period: 0.319,  size: 0.040, color: '#a08070', initialAngle: 0.0,
        fact: 'Doomed moon — spiralling inward, will crash into Mars in ~50 Myr.' },
      { name: 'Deimos',   orbitRadius: 0.82, period: 1.263,  size: 0.030, color: '#907860', initialAngle: 2.8,
        fact: 'Tiny moon slowly drifting away from Mars.' },
    ],
  },
  {
    name: 'Jupiter', orbitRadius: 20.5, period: 4332.59,  size: 1.10,
    type: 'jupiter', distanceAU: 5.203, realRadius: 11.21, axialTilt: 0.054,
    rings: null, initialAngle: 5.0,
    fact: 'Largest planet. The Great Red Spot is a storm older than 300 years.',
    moons: [
      { name: 'Io',       orbitRadius: 1.85, period: 1.769,  size: 0.130, color: '#ffcc33', initialAngle: 0.5,
        fact: 'Most volcanically active body in the solar system.' },
      { name: 'Europa',   orbitRadius: 2.50, period: 3.551,  size: 0.110, color: '#c8b8a0', initialAngle: 2.2,
        fact: 'Subsurface ocean — a leading candidate for extraterrestrial life.' },
      { name: 'Ganymede', orbitRadius: 3.30, period: 7.155,  size: 0.150, color: '#9890a0', initialAngle: 4.0,
        fact: 'Largest moon in the solar system, bigger than Mercury.' },
      { name: 'Callisto', orbitRadius: 4.20, period: 16.689, size: 0.130, color: '#706860', initialAngle: 1.0,
        fact: 'Most heavily cratered object in the solar system.' },
    ],
  },
  {
    name: 'Saturn',  orbitRadius: 27.5, period: 10759.22, size: 0.92,
    type: 'saturn',  distanceAU: 9.537, realRadius: 9.450, axialTilt: 0.467,
    rings: 'saturn', initialAngle: 2.1,
    fact: 'Ring system stretches 282,000 km but is only ~10 m thick.',
    moons: [
      { name: 'Enceladus', orbitRadius: 1.12, period: 1.370,  size: 0.050, color: '#eeeeff', initialAngle: 2.5,
        fact: 'Water-vapour geysers — may harbour life beneath the ice.' },
      { name: 'Tethys',    orbitRadius: 1.32, period: 1.888,  size: 0.070, color: '#d0ccc0', initialAngle: 5.0,
        fact: 'Giant impact crater Odysseus covers a third of its surface.' },
      { name: 'Dione',     orbitRadius: 1.62, period: 2.737,  size: 0.070, color: '#c0b8b0', initialAngle: 1.0,
        fact: 'Ice cliffs and arcuate troughs carved by ancient tectonics.' },
      { name: 'Rhea',      orbitRadius: 2.10, period: 4.518,  size: 0.080, color: '#c8c0b0', initialAngle: 3.5,
        fact: "Saturn's second-largest moon, mostly rock and ice." },
      { name: 'Titan',     orbitRadius: 2.80, period: 15.945, size: 0.130, color: '#d4a840', initialAngle: 0.0,
        fact: 'Only moon with a thick atmosphere and liquid-methane lakes.' },
    ],
  },
  {
    name: 'Uranus',  orbitRadius: 34.5, period: 30688.5,  size: 0.55,
    type: 'uranus',  distanceAU: 19.19, realRadius: 4.007, axialTilt: 1.706,
    rings: 'uranus', initialAngle: 4.2,
    fact: 'Rotates on its side (98° axial tilt) — possibly from an ancient collision.',
    moons: [
      { name: 'Miranda',  orbitRadius: 0.80, period: 1.413,  size: 0.040, color: '#c0b8b0', initialAngle: 5.5,
        fact: 'Verona Rupes — tallest known cliff in the solar system (20 km).' },
      { name: 'Ariel',    orbitRadius: 1.00, period: 2.520,  size: 0.050, color: '#b8b0a8', initialAngle: 2.0,
        fact: 'Brightest Uranian moon, geologically young surface.' },
      { name: 'Titania',  orbitRadius: 1.40, period: 8.706,  size: 0.070, color: '#b0a8a0', initialAngle: 0.8,
        fact: "Largest Uranian moon, a mix of rock and ice." },
      { name: 'Oberon',   orbitRadius: 1.68, period: 13.463, size: 0.070, color: '#a09890', initialAngle: 3.1,
        fact: 'Outermost large Uranian moon, ancient heavily cratered surface.' },
    ],
  },
  {
    name: 'Neptune', orbitRadius: 40.5, period: 60182.0,  size: 0.50,
    type: 'neptune', distanceAU: 30.07, realRadius: 3.883, axialTilt: 0.494,
    rings: null, initialAngle: 0.4,
    fact: 'Strongest winds in the solar system — up to 2,100 km/h.',
    moons: [
      { name: 'Proteus',  orbitRadius: 0.78, period: 1.122,  size: 0.040, color: '#808890', initialAngle: 4.0,
        fact: 'Dark as soot, irregularly shaped inner moon.' },
      { name: 'Triton',   orbitRadius: 1.20, period: 5.877,  size: 0.090, color: '#c0d8e0', initialAngle: 1.8,
        fact: 'Retrograde orbit — almost certainly a captured Kuiper Belt object.' },
    ],
  },
];

const NOTABLE_ASTEROIDS = [
  { name: 'Ceres',    orbitRadius: 16.2, period: 1681.0, size: 0.10,
    type: 'Dwarf Planet', distanceAU: 2.77, color: '#a09888', initialAngle: 0.7, highlight: false,
    fact: 'Largest object in the asteroid belt (940 km). Classified as a dwarf planet since 2006.' },
  { name: 'Vesta',    orbitRadius: 15.4, period: 1325.0, size: 0.07,
    type: 'Asteroid', distanceAU: 2.36, color: '#988870', initialAngle: 2.3, highlight: false,
    fact: 'Second-largest asteroid (525 km). Visited by Dawn spacecraft 2011–2012.' },
  { name: 'Pallas',   orbitRadius: 16.6, period: 1686.0, size: 0.06,
    type: 'Asteroid', distanceAU: 2.77, color: '#907868', initialAngle: 4.1, highlight: false,
    fact: 'Third-largest asteroid, highly inclined orbit at 34.8°.' },
  { name: 'Apophis',  orbitRadius: 9.6,  period: 323.6,  size: 0.045,
    type: 'Aten (NEA)', distanceAU: 0.92, color: '#ff6633', initialAngle: 3.8, highlight: true,
    fact: 'Will pass within 32,000 km of Earth on April 13, 2029 — visible to the naked eye.' },
  { name: 'Bennu',    orbitRadius: 10.8, period: 436.6,  size: 0.035,
    type: 'Apollo (NEA)', distanceAU: 1.13, color: '#cc8844', initialAngle: 5.5, highlight: false,
    fact: 'Sampled by OSIRIS-REx in 2020. Small chance of impact in 2182.' },
  { name: '2024 YR4', orbitRadius: 10.3, period: 369.0,  size: 0.045,
    type: 'Near-Earth Asteroid', distanceAU: 1.01, color: '#ff3311', initialAngle: 1.5, highlight: true,
    fact: 'Gained global attention in 2024 when it briefly reached Torino Scale level 4. Later ruled out for 2032 impact.' },
];

const PLANET_THEME = {
  mercury: { atmos: '#d0c8c0', select: '#e8e0d8', emissive: '#604838' },
  venus:   { atmos: '#f8d888', select: '#ffe8a8', emissive: '#906030' },
  earth:   { atmos: '#6098dc', select: '#80b8f0', emissive: '#1a3860' },
  mars:    { atmos: '#e88060', select: '#ffa080', emissive: '#801a1a' },
  jupiter: { atmos: '#e8b070', select: '#ffd090', emissive: '#904020' },
  saturn:  { atmos: '#f0e0a0', select: '#fff0d0', emissive: '#906020' },
  uranus:  { atmos: '#98f8f8', select: '#c0ffff', emissive: '#305858' },
  neptune: { atmos: '#6080dc', select: '#80a0f0', emissive: '#182d60' },
};

// ─── Speed helpers ────────────────────────────────────────────────────────────

const planetSpeed = (period) => Math.min(2.5, (365.25 / period) * 0.55);
const moonSpeed   = (period) => Math.min(4.5, (27.32  / period) * 2.2);

// ─── Procedural planet textures ───────────────────────────────────────────────

function buildSolarTexture(type) {
  const W = 512, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const fill = (c) => { ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); };

  if (type === 'mercury') {
    fill('#8c8880');
    for (let i = 0; i < 35; i++) {
      ctx.fillStyle = `rgba(55,50,45,${0.3 + Math.random() * 0.4})`;
      ctx.beginPath();
      ctx.arc(Math.random() * W, Math.random() * H, Math.random() * 14 + 2, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = `rgba(148,142,135,${0.3 + Math.random() * 0.3})`;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.ellipse(Math.random() * W, Math.random() * H, Math.random() * 38 + 10, Math.random() * 22 + 6, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

  } else if (type === 'venus') {
    fill('#c8a040');
    for (let y = 0; y < H; y += 16) {
      ctx.fillStyle = `rgba(240,195,110,${0.4 + 0.2 * Math.sin(y * 0.06)})`;
      ctx.fillRect(0, y, W, 12);
    }
    for (let i = 0; i < 10; i++) {
      ctx.strokeStyle = 'rgba(200,155,55,0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, Math.random() * H);
      ctx.quadraticCurveTo(W * 0.5, H * 0.5 + (Math.random() - 0.5) * 50, W, Math.random() * H);
      ctx.stroke();
    }
    const vg = ctx.createLinearGradient(0, 0, 0, H);
    vg.addColorStop(0, 'rgba(90,40,0,0.28)'); vg.addColorStop(0.3, 'transparent');
    vg.addColorStop(0.7, 'transparent');      vg.addColorStop(1, 'rgba(90,40,0,0.28)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

  } else if (type === 'earth') {
    fill('#1a4080');
    const land = ['#2d7a2d', '#3a9a3a', '#4aa04a', '#1e6b1e', '#558b2f'];
    [
      { x: 0.14 * W, y: 0.38 * H, rx: 58, ry: 48 },
      { x: 0.52 * W, y: 0.36 * H, rx: 52, ry: 44 },
      { x: 0.72 * W, y: 0.40 * H, rx: 48, ry: 42 },
      { x: 0.76 * W, y: 0.72 * H, rx: 33, ry: 23 },
      { x: 0.50 * W, y: 0.84 * H, rx: 60, ry: 14 },
    ].forEach((c, i) => {
      ctx.fillStyle = land[i % land.length];
      ctx.globalAlpha = 0.88;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.rx, c.ry, (i * 0.4), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = 'rgba(255,255,255,0.52)';
      ctx.beginPath();
      ctx.ellipse(Math.random() * W, Math.random() * H, Math.random() * 75 + 18, Math.random() * 11 + 3, Math.random() * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    const ec1 = ctx.createLinearGradient(0, 0, 0, 48);
    ec1.addColorStop(0, 'rgba(228,242,255,0.88)'); ec1.addColorStop(1, 'transparent');
    ctx.fillStyle = ec1; ctx.fillRect(0, 0, W, 48);
    const ec2 = ctx.createLinearGradient(0, H - 45, 0, H);
    ec2.addColorStop(0, 'transparent'); ec2.addColorStop(1, 'rgba(228,242,255,0.88)');
    ctx.fillStyle = ec2; ctx.fillRect(0, H - 45, W, 45);

  } else if (type === 'mars') {
    fill('#c1440e');
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = ['#8b2500', '#d4601e', '#a03010', '#c85820'][i % 4];
      ctx.globalAlpha = 0.55 + Math.random() * 0.35;
      ctx.beginPath();
      ctx.ellipse(Math.random() * W, Math.random() * H, Math.random() * 68 + 14, Math.random() * 33 + 9, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (let y = 0; y < H; y += 32) {
      ctx.fillStyle = 'rgba(195,115,55,0.07)'; ctx.fillRect(0, y, W, 13);
    }
    const mc1 = ctx.createLinearGradient(0, 0, 0, 44);
    mc1.addColorStop(0, 'rgba(244,233,222,0.82)'); mc1.addColorStop(1, 'transparent');
    ctx.fillStyle = mc1; ctx.fillRect(0, 0, W, 44);
    const mc2 = ctx.createLinearGradient(0, H - 34, 0, H);
    mc2.addColorStop(0, 'transparent'); mc2.addColorStop(1, 'rgba(244,233,222,0.65)');
    ctx.fillStyle = mc2; ctx.fillRect(0, H - 34, W, 34);

  } else if (type === 'jupiter') {
    const bands = ['#c8803a', '#e0a060', '#a06028', '#d89050', '#b87040', '#f0b870', '#c07030', '#e89858'];
    bands.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(0, Math.round(i * H / bands.length), W, Math.round(H / bands.length) + 1);
    });
    for (let i = 0; i < 22; i++) {
      ctx.fillStyle = bands[Math.floor(Math.random() * bands.length)];
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.ellipse(Math.random() * W, Math.random() * H, Math.random() * 55 + 18, Math.random() * 9 + 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#a83818'; ctx.globalAlpha = 0.88;
    ctx.beginPath(); ctx.ellipse(0.71 * W, 0.55 * H, 34, 21, 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#cc5028'; ctx.globalAlpha = 0.65;
    ctx.beginPath(); ctx.ellipse(0.71 * W, 0.55 * H, 20, 12, 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

  } else if (type === 'saturn') {
    const sb = ['#d8c890', '#e8d8a8', '#c8b878', '#d4c890', '#e0d0a0', '#ccb870'];
    sb.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(0, Math.round(i * H / sb.length), W, Math.round(H / sb.length) + 1);
    });
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = 'rgba(175,155,75,0.22)';
      ctx.fillRect(0, Math.random() * H, W, Math.random() * 7 + 2);
    }
    ctx.fillStyle = 'rgba(255,245,195,0.28)'; ctx.fillRect(0, H * 0.44, W, H * 0.12);

  } else if (type === 'uranus') {
    const ug = ctx.createLinearGradient(0, 0, 0, H);
    ug.addColorStop(0, '#4dd0d0'); ug.addColorStop(0.5, '#7de8e8'); ug.addColorStop(1, '#5ad4d4');
    ctx.fillStyle = ug; ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 28) {
      ctx.fillStyle = 'rgba(100,220,220,0.09)'; ctx.fillRect(0, y, W, 13);
    }
    const up = ctx.createLinearGradient(0, 0, 0, 58);
    up.addColorStop(0, 'rgba(0,75,75,0.32)'); up.addColorStop(1, 'transparent');
    ctx.fillStyle = up; ctx.fillRect(0, 0, W, 58);

  } else if (type === 'neptune') {
    const ng = ctx.createLinearGradient(0, 0, 0, H);
    ng.addColorStop(0, '#102898'); ng.addColorStop(0.5, '#2050d0'); ng.addColorStop(1, '#1838a8');
    ctx.fillStyle = ng; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(4,12,55,0.7)'; ctx.globalAlpha = 0.72;
    ctx.beginPath(); ctx.ellipse(0.35 * W, 0.45 * H, 27, 17, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = 'rgba(190,215,255,0.3)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, Math.random() * H); ctx.lineTo(W, Math.random() * H); ctx.stroke();
    }
    const np = ctx.createLinearGradient(0, 0, 0, 38);
    np.addColorStop(0, 'rgba(90,140,255,0.38)'); np.addColorStop(1, 'transparent');
    ctx.fillStyle = np; ctx.fillRect(0, 0, W, 38);

  } else {
    fill('#888888');
  }
  return canvas;
}

// ─── Orbit circle line ────────────────────────────────────────────────────────

const OrbitCircle = ({ radius, color = '#1e3a5f', opacity = 0.25 }) => {
  const pts = useMemo(() => {
    const p = [];
    for (let i = 0; i <= 256; i++) {
      const a = (i / 256) * Math.PI * 2;
      p.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    return p;
  }, [radius]);
  return <Line points={pts} color={color} lineWidth={0.5} transparent opacity={opacity} />;
};

// ─── Solar Sun ────────────────────────────────────────────────────────────────

const SolarSun = () => {
  const meshRef = useRef();
  const c1 = useRef(); const c2 = useRef();
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    if (meshRef.current) meshRef.current.rotation.y += 0.035 * dt;
    if (c1.current) c1.current.scale.setScalar(5.2 + Math.sin(t.current * 0.7) * 0.22);
    if (c2.current) c2.current.scale.setScalar(3.6 + Math.sin(t.current * 1.1 + 1) * 0.14);
  });
  return (
    <group>
      <mesh ref={c1}><sphereGeometry args={[2.2, 14, 14]} />
        <meshBasicMaterial color="#ff9800" transparent opacity={0.012} side={THREE.BackSide} depthWrite={false} /></mesh>
      <mesh ref={c2}><sphereGeometry args={[2.2, 14, 14]} />
        <meshBasicMaterial color="#ffaa20" transparent opacity={0.022} side={THREE.BackSide} depthWrite={false} /></mesh>
      <mesh scale={[2.2, 2.2, 2.2]}><sphereGeometry args={[2.2, 14, 14]} />
        <meshBasicMaterial color="#ff7700" transparent opacity={0.035} side={THREE.BackSide} depthWrite={false} /></mesh>
      <mesh ref={meshRef}><sphereGeometry args={[2.2, 48, 48]} />
        <meshStandardMaterial color="#ff8c00" emissive="#ff6200" emissiveIntensity={1.8} roughness={0.36} /></mesh>
      <pointLight color="#ffb040" intensity={5.0} distance={120} decay={1.8} />
      <pointLight color="#ff6600" intensity={1.5} distance={28}  decay={2.0} />
    </group>
  );
};

// ─── Planetary rings ──────────────────────────────────────────────────────────

const SaturnRingSystem = ({ size }) => (
  <group rotation={[0.467, 0, 0]}>
    {/* C ring (faint inner) */}
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[size * 1.28, size * 1.55, 128]} />
      <meshBasicMaterial color="#b89858" transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
    {/* B ring (bright, main) */}
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[size * 1.55, size * 2.00, 128]} />
      <meshBasicMaterial color="#d8c888" transparent opacity={0.72} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
    {/* Cassini division (gap) */}
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[size * 2.00, size * 2.08, 128]} />
      <meshBasicMaterial color="#080c14" transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
    {/* A ring */}
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[size * 2.08, size * 2.45, 128]} />
      <meshBasicMaterial color="#c8b878" transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
    {/* F ring (thin outer) */}
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[size * 2.54, size * 2.60, 128]} />
      <meshBasicMaterial color="#a89860" transparent opacity={0.25} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  </group>
);

const UranusRingSystem = ({ size }) => (
  <group rotation={[1.706, 0, 0]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[size * 1.6, size * 1.72, 96]} />
      <meshBasicMaterial color="#669090" transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[size * 1.85, size * 1.95, 96]} />
      <meshBasicMaterial color="#558080" transparent opacity={0.14} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  </group>
);

// ─── Moon orbit ───────────────────────────────────────────────────────────────
// Rendered as a child of PlanetWithMoons' orbit group — positions are planet-relative.

const MoonOrbit = ({ data, paused, selectedObj, onSelect, showLabels }) => {
  const groupRef = useRef();
  const angleRef = useRef(data.initialAngle ?? 0);
  const [hovered, setHovered] = useState(false);

  useFrame((_, dt) => {
    if (!paused) {
      angleRef.current += moonSpeed(data.period) * dt;
      if (groupRef.current) {
        groupRef.current.position.x = Math.cos(angleRef.current) * data.orbitRadius;
        groupRef.current.position.z = Math.sin(angleRef.current) * data.orbitRadius;
      }
    }
  });

  const isSelected = selectedObj?.name === data.name;
  const over  = useCallback((e) => { e.stopPropagation(); setHovered(true);  document.body.style.cursor = 'pointer'; }, []);
  const out   = useCallback((e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'default'; }, []);
  const click = useCallback((e) => { e.stopPropagation(); onSelect({ ...data, objectType: 'moon' }); }, [data, onSelect]);

  return (
    <group ref={groupRef}>
      <mesh onPointerOver={over} onPointerOut={out} onClick={click}>
        <sphereGeometry args={[data.size, 20, 20]} />
        <meshStandardMaterial
          color={data.color}
          emissive={data.color}
          emissiveIntensity={hovered ? 1.0 : isSelected ? 0.85 : 0.4}
          roughness={0.80}
        />
      </mesh>
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[data.size * 2.0, data.size * 2.35, 32]} />
          <meshBasicMaterial color={data.color} transparent opacity={0.85} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
      {(hovered || (showLabels && data.size >= 0.07)) && (
        <Html distanceFactor={10} center style={{ pointerEvents: 'none' }} position={[0, data.size * 2.8, 0]}>
          <div style={{ color: '#94a3b8', fontSize: 8, fontWeight: 600, whiteSpace: 'nowrap', textShadow: '0 0 8px #000' }}>
            {data.name}
          </div>
        </Html>
      )}
    </group>
  );
};

// ─── Planet with moons ────────────────────────────────────────────────────────

const PlanetWithMoons = ({ data, paused, selectedObj, onSelect, showLabels }) => {
  const orbitGroupRef = useRef();
  const meshRef       = useRef();
  const angleRef      = useRef(data.initialAngle ?? 0);
  const scaleRef      = useRef(0);
  const [hovered, setHovered] = useState(false);

  const texture = useMemo(() => new THREE.CanvasTexture(buildSolarTexture(data.type)), [data.type]);
  const theme   = PLANET_THEME[data.type] || PLANET_THEME.mercury;

  useFrame((_, dt) => {
    if (!paused) {
      angleRef.current += planetSpeed(data.period) * dt;
      if (orbitGroupRef.current) {
        orbitGroupRef.current.position.x = Math.cos(angleRef.current) * data.orbitRadius;
        orbitGroupRef.current.position.z = Math.sin(angleRef.current) * data.orbitRadius;
      }
      if (meshRef.current) meshRef.current.rotation.y += 0.18 * dt;
    }
    if (scaleRef.current < 1) {
      scaleRef.current = Math.min(1, scaleRef.current + dt * 1.6);
      if (orbitGroupRef.current) orbitGroupRef.current.scale.setScalar(scaleRef.current);
    }
  });

  const isSelected = selectedObj?.name === data.name;
  const glowScale  = hovered ? 1.55 : isSelected ? 1.45 : 1.28;

  const over  = useCallback((e) => { e.stopPropagation(); setHovered(true);  document.body.style.cursor = 'pointer'; }, []);
  const out   = useCallback((e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'default'; }, []);
  const click = useCallback((e) => { e.stopPropagation(); onSelect({ ...data, objectType: 'planet' }); }, [data, onSelect]);

  const label = data.name;

  return (
    <group ref={orbitGroupRef}>
      {/* Planet sphere */}
      <mesh ref={meshRef} rotation={[data.axialTilt ?? 0, 0, 0]}
        onPointerOver={over} onPointerOut={out} onClick={click}>
        <sphereGeometry args={[data.size, 48, 48]} />
        <meshStandardMaterial
          map={texture}
          emissive={theme.emissive}
          emissiveIntensity={hovered ? 0.75 : isSelected ? 0.6 : 0.28}
          roughness={0.68}
          metalness={0.04}
        />
      </mesh>

      {/* Atmosphere glow */}
      <mesh scale={[glowScale, glowScale, glowScale]}>
        <sphereGeometry args={[data.size, 16, 16]} />
        <meshBasicMaterial color={theme.atmos} transparent
          opacity={hovered ? 0.24 : isSelected ? 0.20 : 0.10}
          side={THREE.BackSide} depthWrite={false} />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[data.size * 1.82, data.size * 2.10, 52]} />
          <meshBasicMaterial color={theme.select} transparent opacity={0.78}
            side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}

      {/* Rings */}
      {data.rings === 'saturn' && <SaturnRingSystem size={data.size} />}
      {data.rings === 'uranus' && <UranusRingSystem size={data.size} />}

      {/* Moon orbit paths (inside planet group → follow planet automatically) */}
      {data.moons.map(m => (
        <OrbitCircle key={`path-${m.name}`} radius={m.orbitRadius} color="#1e3a5f" opacity={0.22} />
      ))}

      {/* Moon objects */}
      {data.moons.map(m => (
        <MoonOrbit key={m.name} data={m} paused={paused}
          selectedObj={selectedObj} onSelect={onSelect} showLabels={showLabels} />
      ))}

      {/* Name label */}
      {showLabels && (
        <Html distanceFactor={16} center style={{ pointerEvents: 'none' }}
          position={[0, data.size * 2.3, 0]}>
          <div style={{
            color: theme.atmos, fontSize: 9.5, fontWeight: 700,
            letterSpacing: 0.6, whiteSpace: 'nowrap', textShadow: '0 0 10px #000',
          }}>{label}</div>
        </Html>
      )}

      {/* Simple hover name (when labels off) */}
      {hovered && !showLabels && (
        <Html distanceFactor={14} center style={{ pointerEvents: 'none' }}
          position={[0, data.size * 2.5, 0]}>
          <div style={{
            color: theme.atmos, fontSize: 10, fontWeight: 700,
            whiteSpace: 'nowrap', textShadow: '0 0 12px #000',
          }}>{data.name}</div>
        </Html>
      )}
    </group>
  );
};

// ─── Asteroid belt (particle cloud) ──────────────────────────────────────────

const AsteroidBelt = () => {
  const positions = useMemo(() => {
    const pos = [];
    for (let i = 0; i < 3800; i++) {
      // Belt between Mars (13.8) and Jupiter (20.5), concentrated at 15–19
      const r     = 14.6 + Math.random() * 4.2 + Math.sin(Math.random() * Math.PI * 2) * 0.6;
      const theta = Math.random() * Math.PI * 2;
      const y     = (Math.random() - 0.5) * 1.0;
      pos.push(Math.cos(theta) * r, y, Math.sin(theta) * r);
    }
    return new Float32Array(pos);
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3}
          array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#9a9278" size={0.07} transparent opacity={0.65} sizeAttenuation />
    </points>
  );
};

// ─── Notable / named asteroid ─────────────────────────────────────────────────

const NamedAsteroid = ({ data, paused, selectedObj, onSelect, showLabels }) => {
  const groupRef = useRef();
  const angleRef = useRef(data.initialAngle ?? 0);
  const [hovered, setHovered] = useState(false);

  useFrame((_, dt) => {
    if (!paused) {
      angleRef.current += planetSpeed(data.period) * dt * 1.2;
      if (groupRef.current) {
        groupRef.current.position.x = Math.cos(angleRef.current) * data.orbitRadius;
        groupRef.current.position.z = Math.sin(angleRef.current) * data.orbitRadius;
      }
    }
  });

  const isSelected = selectedObj?.name === data.name;
  const glowColor  = data.highlight ? data.color : '#a09878';

  const over  = useCallback((e) => { e.stopPropagation(); setHovered(true);  document.body.style.cursor = 'pointer'; }, []);
  const out   = useCallback((e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'default'; }, []);
  const click = useCallback((e) => { e.stopPropagation(); onSelect({ ...data, objectType: 'asteroid' }); }, [data, onSelect]);

  return (
    <group ref={groupRef}>
      <mesh onPointerOver={over} onPointerOut={out} onClick={click}>
        <sphereGeometry args={[data.size, 14, 14]} />
        <meshStandardMaterial
          color={data.color}
          emissive={data.color}
          emissiveIntensity={hovered ? 0.7 : isSelected ? 0.55 : data.highlight ? 0.35 : 0.08}
          roughness={0.80}
        />
      </mesh>

      {/* Glow for hazardous NEAs */}
      {data.highlight && (
        <mesh scale={[2.2, 2.2, 2.2]}>
          <sphereGeometry args={[data.size, 8, 8]} />
          <meshBasicMaterial color={glowColor} transparent opacity={0.10}
            side={THREE.BackSide} depthWrite={false} />
        </mesh>
      )}

      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[data.size * 2.2, data.size * 2.7, 28]} />
          <meshBasicMaterial color={data.color} transparent opacity={0.60}
            side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}

      {(hovered || showLabels) && (
        <Html distanceFactor={10} center style={{ pointerEvents: 'none' }}
          position={[0, data.size * 3.5, 0]}>
          <div style={{
            color: data.highlight ? data.color : '#64748b',
            fontSize: 8.5, fontWeight: data.highlight ? 700 : 600,
            whiteSpace: 'nowrap', textShadow: '0 0 8px #000',
          }}>{data.name}</div>
        </Html>
      )}

      {hovered && !showLabels && (
        <Html distanceFactor={10} center style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(9,18,36,0.95)',
            border: `1px solid ${data.highlight ? data.color + '55' : '#1e3a5f44'}`,
            borderRadius: 8, padding: '8px 11px',
            backdropFilter: 'blur(14px)', whiteSpace: 'nowrap',
            boxShadow: data.highlight ? `0 0 20px ${data.color}30` : 'none',
          }}>
            <p style={{ color: data.highlight ? data.color : '#94a3b8', fontWeight: 700, fontSize: 11, marginBottom: 2 }}>
              {data.name}
            </p>
            <p style={{ color: '#475569', fontSize: 10 }}>{data.type} · {data.distanceAU} AU</p>
            {data.highlight && (
              <p style={{ color: data.color, fontSize: 9, marginTop: 3 }}>⚠ Near-Earth Object</p>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};

// ─── Kuiper belt hint (outer sparse particles) ────────────────────────────────

const KuiperHint = () => {
  const positions = useMemo(() => {
    const pos = [];
    for (let i = 0; i < 1200; i++) {
      const r     = 42 + Math.random() * 10;
      const theta = Math.random() * Math.PI * 2;
      const y     = (Math.random() - 0.5) * 2.5;
      pos.push(Math.cos(theta) * r, y, Math.sin(theta) * r);
    }
    return new Float32Array(pos);
  }, []);
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3}
          array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#607090" size={0.05} transparent opacity={0.35} sizeAttenuation />
    </points>
  );
};

// ─── Artemis 2 Free-Return Trajectory ────────────────────────────────────────
// Artemis 2 (2025) — first crewed Artemis mission.
// Trajectory: Earth → TLI (Trans-Lunar Injection) → Lunar flyby (~7,400 km)
//             → free-return arc → re-entry at Earth (~10-day mission).
// Visualised as a dashed line + animated Orion capsule that loops continuously.

const ARTEMIS_SEGS   = 100;   // path resolution
const ARTEMIS_PERIOD = 12;    // seconds per loop (real-time animation)

const ArtemisTrajectory = ({ showArtemis, paused }) => {
  const timeRef    = useRef(0);
  const capsuleRef = useRef();

  // Geometry & material created once (memoized)
  const geometry = useMemo(() => {
    const geo  = new THREE.BufferGeometry();
    const pos  = new Float32Array((ARTEMIS_SEGS + 1) * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  const material = useMemo(() => new THREE.LineBasicMaterial({
    color: '#00e5ff',
    transparent: true,
    opacity: 0.80,
  }), []);

  const lineObject = useMemo(() => new THREE.Line(geometry, material), [geometry, material]);

  // Glow ring around capsule
  const glowGeo = useMemo(() => new THREE.SphereGeometry(0.14, 10, 10), []);
  const glowMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#00e5ff', transparent: true, opacity: 0.18,
    side: THREE.BackSide, depthWrite: false,
  }), []);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
    glowGeo.dispose();
    glowMat.dispose();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, dt) => {
    if (!paused) timeRef.current += dt;

    // Visibility toggle without unmounting
    lineObject.visible = showArtemis;
    if (capsuleRef.current) capsuleRef.current.visible = showArtemis;
    if (!showArtemis) return;

    const t = timeRef.current;

    // ── Earth's current world position ────────────────────────────────────
    const earthAngle = 0.8 + planetSpeed(365.25) * t;
    const ex = Math.cos(earthAngle) * 10.5;
    const ez = Math.sin(earthAngle) * 10.5;

    // ── Moon direction relative to Earth (for orientation of trajectory) ──
    const moonAngle = 1.2 + moonSpeed(27.32) * t;
    const mx = Math.cos(moonAngle) * 0.85;
    const mz = Math.sin(moonAngle) * 0.85;
    const moonDir = Math.atan2(mz, mx); // angle from Earth to Moon

    // ── Build path relative to Earth ──────────────────────────────────────
    // Phase 0.00–0.28: TLI — accelerate toward Moon and a bit beyond
    // Phase 0.28–0.68: Lunar swing-by — large arc around Moon (free return)
    // Phase 0.68–1.00: Return — fall back toward Earth
    const positions = geometry.attributes.position.array;

    for (let i = 0; i <= ARTEMIS_SEGS; i++) {
      const phase = i / ARTEMIS_SEGS;
      let px = 0, pz = 0;

      if (phase < 0.28) {
        // TLI phase — smooth ease toward Moon direction, overshoot to 1.3×
        const f = phase / 0.28;
        const ease = f * f * (3 - 2 * f);      // smooth-step
        px = Math.cos(moonDir) * 0.85 * 1.35 * ease;
        pz = Math.sin(moonDir) * 0.85 * 1.35 * ease;
      } else if (phase < 0.68) {
        // Swing-by arc around Moon
        const f = (phase - 0.28) / 0.40;
        // Start on the near side of Moon, swing ~200° around it
        const startAngle = moonDir + Math.PI + 0.2;
        const swingAngle = startAngle + Math.PI * 1.15 * f;
        const r = 0.22;                          // closest approach
        px = mx + Math.cos(swingAngle) * r;
        pz = mz + Math.sin(swingAngle) * r;
      } else {
        // Return to Earth
        const f = (phase - 0.68) / 0.32;
        const ease = 1 - (1 - f) * (1 - f);     // ease-in
        // Start from swing exit point
        const exitAngle = moonDir + Math.PI + 0.2 + Math.PI * 1.15;
        const startX = mx + Math.cos(exitAngle) * 0.22;
        const startZ = mz + Math.sin(exitAngle) * 0.22;
        px = startX * (1 - ease);
        pz = startZ * (1 - ease);
      }

      positions[i * 3]     = ex + px;
      positions[i * 3 + 1] = 0.0;
      positions[i * 3 + 2] = ez + pz;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeBoundingSphere();

    // ── Animate capsule along path ─────────────────────────────────────────
    if (capsuleRef.current) {
      const missionPhase = (t % ARTEMIS_PERIOD) / ARTEMIS_PERIOD;
      const segIdx = Math.min(Math.floor(missionPhase * ARTEMIS_SEGS), ARTEMIS_SEGS - 1);
      capsuleRef.current.position.set(
        positions[segIdx * 3],
        positions[segIdx * 3 + 1],
        positions[segIdx * 3 + 2],
      );
      // Pulse emissive
      if (capsuleRef.current.material) {
        capsuleRef.current.material.emissiveIntensity = 1.4 + Math.sin(t * 4) * 0.4;
      }
    }
  });

  return (
    <>
      <primitive object={lineObject} />

      {/* Orion Capsule sphere */}
      <mesh ref={capsuleRef} visible={showArtemis}>
        <sphereGeometry args={[0.08, 14, 14]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#00e5ff"
          emissiveIntensity={1.6}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Capsule glow (child of capsule for auto-follow) */}
      {showArtemis && (
        <mesh ref={null} visible={showArtemis}>
          {/* Rendered as sibling — position updated imperatively above */}
        </mesh>
      )}
    </>
  );
};

// ─── Full Solar Scene ─────────────────────────────────────────────────────────

const SolarScene = ({ paused, selectedObj, onSelectObj, showLabels, cameraMode, onControlsReady, showArtemis }) => {
  const { camera }     = useThree();
  const controlsRef    = useRef();
  const interactRef    = useRef(false);
  const azimuthRef     = useRef(0);
  const camTargetRef   = useRef(null);
  const transitionRef  = useRef(false);

  useEffect(() => {
    if (onControlsReady && controlsRef.current) onControlsReady(controlsRef.current);
  });

  useEffect(() => {
    camTargetRef.current = cameraMode === 'top'
      ? { x: 0, y: 65, z: 0.5 }
      : { x: 0, y: 30, z: 75 };
    transitionRef.current = true;
  }, [cameraMode]);

  useFrame((_, dt) => {
    if (transitionRef.current && camTargetRef.current) {
      const t = camTargetRef.current;
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, t.x, 0.04);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, t.y, 0.04);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, t.z, 0.04);
      camera.lookAt(0, 0, 0);
      if (controlsRef.current) controlsRef.current.target.set(0, 0, 0);
      const d = Math.hypot(camera.position.x - t.x, camera.position.y - t.y, camera.position.z - t.z);
      if (d < 0.2) { camera.position.set(t.x, t.y, t.z); transitionRef.current = false; }
      return;
    }
    if (!paused && !interactRef.current) {
      azimuthRef.current += 0.008 * dt;
      const dist = Math.hypot(camera.position.x, camera.position.z);
      if (dist > 0.1) {
        camera.position.x = Math.cos(azimuthRef.current) * dist;
        camera.position.z = Math.sin(azimuthRef.current) * dist;
        camera.lookAt(0, 0, 0);
        if (controlsRef.current) controlsRef.current.target.set(0, 0, 0);
      }
    } else {
      azimuthRef.current = Math.atan2(camera.position.z, camera.position.x);
    }
  });

  return (
    <>
      <ambientLight intensity={0.12} />
      <Stars radius={160} depth={80} count={14000} factor={5} saturation={0.12} fade speed={0.22} />
      <SolarSun />

      {/* Planet orbit paths */}
      {PLANETS.map(p => (
        <OrbitCircle key={`orbit-${p.name}`} radius={p.orbitRadius} color="#1e3a5f" opacity={0.22} />
      ))}

      {/* Notable asteroid orbit paths */}
      {NOTABLE_ASTEROIDS.map(a => (
        <OrbitCircle key={`orbit-${a.name}`} radius={a.orbitRadius}
          color={a.highlight ? '#3d1a0a' : '#1a2a1a'} opacity={a.highlight ? 0.30 : 0.16} />
      ))}

      {/* Asteroid belt */}
      <AsteroidBelt />

      {/* Kuiper belt hint */}
      <KuiperHint />

      {/* Planets with moons */}
      {PLANETS.map(p => (
        <PlanetWithMoons key={p.name} data={p} paused={paused}
          selectedObj={selectedObj} onSelect={onSelectObj} showLabels={showLabels} />
      ))}

      {/* Named asteroids */}
      {NOTABLE_ASTEROIDS.map(a => (
        <NamedAsteroid key={a.name} data={a} paused={paused}
          selectedObj={selectedObj} onSelect={onSelectObj} showLabels={showLabels} />
      ))}

      {/* Artemis 2 free-return trajectory */}
      <ArtemisTrajectory showArtemis={showArtemis} paused={paused} />

      <OrbitControls ref={controlsRef}
        enablePan enableZoom enableRotate
        minDistance={2} maxDistance={160}
        dampingFactor={0.08} enableDamping
        onStart={() => { interactRef.current = true;  transitionRef.current = false;
          azimuthRef.current = Math.atan2(camera.position.z, camera.position.x); }}
        onEnd={() => { interactRef.current = false; }}
      />
    </>
  );
};

// ─── Legend ───────────────────────────────────────────────────────────────────

const SolarLegend = ({ showArtemis }) => (
  <div style={{
    position: 'absolute', bottom: 16, left: 16,
    background: 'rgba(9,18,36,0.90)', border: '1px solid #1e3a5f',
    borderRadius: 11, padding: '10px 14px', backdropFilter: 'blur(14px)',
  }}>
    <p style={{ color: '#334155', fontSize: 10, marginBottom: 7, textTransform: 'uppercase', letterSpacing: 1 }}>
      Our Solar System
    </p>
    {[
      { color: '#ff8c00', label: 'Sun' },
      { color: '#94a3b8', label: '8 Planets + rings' },
      { color: '#b8b0a8', label: 'Moons (all major)' },
      { color: '#9a9278', label: 'Asteroid belt' },
      { color: '#ff5533', label: 'Near-Earth objects ⚠' },
      { color: '#607090', label: 'Kuiper belt region' },
    ].map(({ color, label }) => (
      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
        <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}88` }} />
        <span style={{ color: '#94a3b8', fontSize: 11 }}>{label}</span>
      </div>
    ))}
    {showArtemis && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
        <div style={{ width: 9, height: 3, borderRadius: 2, background: '#00e5ff', boxShadow: '0 0 6px #00e5ff' }} />
        <span style={{ color: '#00e5ff', fontSize: 11, fontWeight: 600 }}>Artemis 2 trajectory 🚀</span>
      </div>
    )}
    <div style={{ borderTop: '1px solid #1e293b', marginTop: 8, paddingTop: 8 }}>
      <p style={{ color: '#334155', fontSize: 10 }}>Orbital speeds proportional to real periods</p>
    </div>
  </div>
);

// ─── Info Panel ───────────────────────────────────────────────────────────────

const SolarInfoPanel = ({ obj, onClose }) => {
  const isPlanet   = obj.objectType === 'planet';
  const isMoon     = obj.objectType === 'moon';
  const isAsteroid = obj.objectType === 'asteroid';
  const theme      = PLANET_THEME[obj.type] || null;
  const accentColor = theme?.select ?? (obj.highlight ? obj.color : '#94a3b8');

  const period = obj.period < 365 ? `${Math.round(obj.period)} days`
    : `${(obj.period / 365.25).toFixed(2)} years`;

  return (
    <motion.div
      initial={{ opacity: 0, x: 28, y: -4 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: 28 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      style={{
        position: 'absolute', top: 16, right: 16, width: 240,
        background: 'rgba(9,18,36,0.97)',
        border: `1px solid ${accentColor}38`,
        borderRadius: 14, padding: '15px 16px',
        backdropFilter: 'blur(22px)',
        boxShadow: `0 0 45px ${accentColor}14`,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <p style={{ color: accentColor, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{obj.name}</p>
          <span style={{
            background: `${accentColor}18`, color: accentColor,
            border: `1px solid ${accentColor}30`,
            fontSize: 9.5, padding: '2px 7px', borderRadius: 4,
            textTransform: 'uppercase', letterSpacing: 0.8,
          }}>
            {isPlanet ? 'Planet' : isMoon ? 'Moon' : obj.type ?? 'Asteroid'}
          </span>
        </div>
        <button onClick={onClose} style={{ color: '#475569', cursor: 'pointer', background: 'none', border: 'none', padding: 3 }}>
          <X size={13} />
        </button>
      </div>

      {/* Stats */}
      {[
        isPlanet && { icon: Globe, label: 'Radius',      value: `${obj.realRadius?.toFixed(3)} R⊕`,          color: '#60a5fa' },
        isPlanet && { icon: Zap,   label: 'Distance',    value: `${obj.distanceAU} AU`,                       color: '#facc15' },
        !isMoon  && { icon: Clock, label: 'Orbital period', value: period,                                    color: '#a78bfa' },
        isPlanet && { icon: Info,  label: 'Moons',       value: `${obj.moons?.length ?? 0}`,                  color: '#34d399' },
        isMoon   && { icon: Zap,   label: 'Orbit radius', value: `${obj.orbitRadius?.toFixed(2)} (scaled)`,   color: '#facc15' },
        isMoon   && { icon: Clock, label: 'Period',       value: `${obj.period?.toFixed(2)} days`,             color: '#a78bfa' },
        isAsteroid && { icon: Zap, label: 'Distance',    value: `${obj.distanceAU} AU`,                       color: '#facc15' },
      ].filter(Boolean).map(({ icon: Icon, label, value, color }) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon size={11} color={color} />
            <span style={{ color: '#475569', fontSize: 11 }}>{label}</span>
          </div>
          <span style={{ color: '#cbd5e1', fontSize: 11, fontWeight: 600 }}>{value}</span>
        </div>
      ))}

      {/* Fact */}
      {obj.fact && (
        <div style={{
          marginTop: 10, padding: '8px 10px',
          background: `${accentColor}0c`, border: `1px solid ${accentColor}1a`,
          borderRadius: 8,
        }}>
          <p style={{ color: '#475569', fontSize: 10, lineHeight: 1.55 }}>{obj.fact}</p>
        </div>
      )}

      {/* NEO warning */}
      {obj.highlight && (
        <div style={{
          marginTop: 8, padding: '6px 10px',
          background: '#3d0a0a', border: '1px solid #ff553330',
          borderRadius: 7, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ fontSize: 13 }}>⚠</span>
          <span style={{ color: '#ff6644', fontSize: 10, fontWeight: 600 }}>Near-Earth Object — monitored</span>
        </div>
      )}
    </motion.div>
  );
};

// ─── Stats strip ──────────────────────────────────────────────────────────────

const SolarStatsBar = () => {
  const totalMoons = PLANETS.reduce((s, p) => s + p.moons.length, 0);
  return (
    <div className="flex items-center gap-5 px-5 py-2 border-b border-slate-800/40 bg-slate-950/60 flex-shrink-0 flex-wrap">
      <span className="text-slate-600 text-xs uppercase tracking-widest">Solar System</span>
      {[
        { dot: '#ff8c00', count: 1,                   label: 'Star' },
        { dot: '#94a3b8', count: PLANETS.length,       label: 'Planets' },
        { dot: '#b8b0a8', count: totalMoons,           label: 'Moons' },
        { dot: '#9a9278', count: '3800+',              label: 'Belt particles' },
        { dot: '#ff5533', count: NOTABLE_ASTEROIDS.filter(a => a.highlight).length, label: 'Tracked NEOs' },
      ].map(({ dot, count, label }) => (
        <div key={label} className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: dot, boxShadow: `0 0 5px ${dot}` }} />
          <span className="text-slate-300 text-xs font-semibold">{count}</span>
          <span className="text-slate-600 text-xs">{label}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Main SolarSystemViewer ───────────────────────────────────────────────────

const SolarSystemViewer = ({ isOpen, onClose }) => {
  const [paused,      setPaused]      = useState(false);
  const [showLabels,  setShowLabels]  = useState(false);
  const [cameraMode,  setCameraMode]  = useState('perspective');
  const [selectedObj, setSelectedObj] = useState(null);
  const [showArtemis, setShowArtemis] = useState(false);
  const controlsRef = useRef(null);

  const handleControlsReady = useCallback((c) => { controlsRef.current = c; }, []);

  const handleReset = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.object.position.set(0, 30, 75);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
    setCameraMode('perspective');
  }, []);

  const handleClose = useCallback(() => {
    onClose();
    setSelectedObj(null);
    document.body.style.cursor = 'default';
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] flex flex-col"
          style={{ background: '#010810' }}
        >
          {/* ── Header ──────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/50 bg-slate-950/92 backdrop-blur-lg flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-pulse"
                style={{ boxShadow: '0 0 8px #fb923c' }} />
              <span className="text-white font-semibold text-sm tracking-wide">
                Solar System — Interactive 3D Atlas
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setShowArtemis(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                  ${showArtemis ? 'bg-cyan-400/15 text-cyan-300 border-cyan-400/40 shadow-[0_0_10px_#00e5ff30]'
                                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'}`}>
                <Rocket className="w-3 h-3" /> Artemis 2
              </button>
              <button onClick={() => setShowLabels(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                  ${showLabels ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                               : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'}`}>
                {showLabels ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />} Labels
              </button>
              <button onClick={() => setCameraMode(m => m === 'top' ? 'perspective' : 'top')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                  ${cameraMode === 'top' ? 'bg-violet-500/15 text-violet-400 border-violet-500/30'
                                        : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'}`}>
                <Layers className="w-3 h-3" /> {cameraMode === 'top' ? 'Perspective' : 'Top View'}
              </button>
              <button onClick={() => setPaused(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                  ${!paused ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                            : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'}`}>
                {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                {paused ? 'Resume' : 'Pause'}
              </button>
              <button onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                           bg-slate-800/80 text-slate-400 border border-slate-700 hover:text-white transition-colors">
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
              <button onClick={handleClose}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                           bg-slate-800/80 text-slate-400 border border-slate-700 hover:text-red-400 transition-colors">
                <X className="w-3 h-3" /> Close
              </button>
            </div>
          </div>

          {/* ── Stats bar ───────────────────────────────────────────────────── */}
          <SolarStatsBar />

          {/* ── Canvas ──────────────────────────────────────────────────────── */}
          <div className="relative flex-1 min-h-0">
            <Canvas
              camera={{ position: [0, 30, 75], fov: 55 }}
              gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
              dpr={[1, 2]}
              style={{ width: '100%', height: '100%', background: '#010810' }}
            >
              <Suspense fallback={null}>
                <SolarScene
                  paused={paused}
                  selectedObj={selectedObj}
                  onSelectObj={setSelectedObj}
                  showLabels={showLabels}
                  cameraMode={cameraMode}
                  onControlsReady={handleControlsReady}
                  showArtemis={showArtemis}
                />
              </Suspense>
            </Canvas>

            <SolarLegend showArtemis={showArtemis} />

            {/* Hint */}
            <div style={{
              position: 'absolute', bottom: 16, right: 16,
              color: '#1e3a5f', fontSize: 11, textAlign: 'right',
              lineHeight: 1.7, pointerEvents: 'none',
            }}>
              <p>Drag to orbit · Scroll to zoom · Click any object to inspect</p>
              {showArtemis && (
                <p style={{ color: '#00e5ff88', marginTop: 2 }}>
                  Artemis 2 — crewed lunar free-return (2025)
                </p>
              )}
            </div>

            {/* Centre label */}
            <div style={{
              position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
              color: '#1e3a5f', fontSize: 11, textTransform: 'uppercase', letterSpacing: 3,
              pointerEvents: 'none',
            }}>
              Our Solar System — Proportional Orbital Simulation
            </div>

            <AnimatePresence>
              {selectedObj && (
                <SolarInfoPanel obj={selectedObj} onClose={() => setSelectedObj(null)} />
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SolarSystemViewer;
