import { useRef, useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Maximize2, X, RotateCcw, Pause, Play,
  Eye, EyeOff, Layers, Globe, Thermometer, Zap, Clock, Sun,
} from 'lucide-react';
import { getPlanets } from '../services/api';
import SolarSystemViewer from './SolarSystemViewer';

// ─── Constants ────────────────────────────────────────────────────────────────

const HABITABILITY_COLORS = {
  POTENTIALLY_HABITABLE: { main: '#4ade80', emissive: '#22c55e', glow: '#86efac', atmosphere: '#bbf7d0' },
  HABITABILITY_ZONE:     { main: '#fbbf24', emissive: '#eab308', glow: '#fde047', atmosphere: '#fef08a' },
  NON_HABITABLE:         { main: '#f87171', emissive: '#ef4444', glow: '#fca5a5', atmosphere: '#fecaca' },
};
const DEFAULT_COLOR = { main: '#94a3b8', emissive: '#64748b', glow: '#cbd5e1', atmosphere: '#e2e8f0' };

// ─── Scaling helpers ──────────────────────────────────────────────────────────

const getOrbitRadius = (orbsmax, idx) => {
  if (orbsmax != null && orbsmax > 0)
    return Math.max(2.8, Math.min(24, Math.log10(orbsmax + 0.15) * 8 + 8));
  return 2.8 + idx * 1.4;
};

const getPlanetSize = (rade) =>
  rade != null ? Math.max(0.09, Math.min(0.55, rade * 0.09)) : 0.12;

const getOrbitalSpeed = (period) =>
  period != null && period > 0
    ? Math.min(2.2, Math.max(0.02, (365 / period) * 0.18))
    : 0.18;

const isGasGiant = (rade) => rade != null && rade > 3.5;

// Subtle, repeating inclination pattern — no two adjacent planets share an angle
const getOrbitalInclination = (idx) => ((idx * 17) % 11 - 5) * 0.03;

// ─── Procedural planet texture ────────────────────────────────────────────────

function buildPlanetCanvas(habitabilityClass, eqt, rade) {
  const W = 512, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const frozen  = eqt != null && eqt < 180;
  const ice     = eqt != null && eqt >= 180 && eqt < 250;
  const lava    = eqt != null && eqt > 900;
  const gas     = isGasGiant(rade);

  let pal;
  if (gas) {
    pal = ['#3d1f06', '#7c4a1a', '#c07830', '#e8a856', '#f0c870', '#c88a50'];
  } else if (frozen) {
    pal = ['#ddeeff', '#b8d8f0', '#8ab8d4', '#a4ccde', '#e8f4fb', '#c0dcee'];
  } else if (ice) {
    pal = ['#c8e4f4', '#9ac0d4', '#6898b8', '#a0c8e0', '#dce8f4', '#b0d4e8'];
  } else if (lava) {
    pal = ['#1a0400', '#3d0a00', '#7a1600', '#c43200', '#e05010', '#ff7020'];
  } else {
    const palettes = {
      POTENTIALLY_HABITABLE: ['#052e16', '#14532d', '#166534', '#15803d', '#1a6b3c', '#0f4c23'],
      HABITABILITY_ZONE:     ['#451a03', '#78350f', '#92400e', '#b45309', '#a16207', '#713f12'],
      NON_HABITABLE:         ['#450a0a', '#7f1d1d', '#991b1b', '#b91c1c', '#9b1c1c', '#6b0e0e'],
    };
    pal = palettes[habitabilityClass] || ['#0f172a', '#1e293b', '#334155', '#475569'];
  }

  // Base gradient
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, pal[0]);
  bg.addColorStop(0.5, pal[2]);
  bg.addColorStop(1, pal[1]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  if (gas) {
    // Horizontal gas bands
    for (let y = 0; y < H; y += 14) {
      ctx.fillStyle = pal[Math.floor(Math.random() * pal.length)];
      ctx.globalAlpha = 0.35 + Math.random() * 0.45;
      ctx.fillRect(0, y, W, 8 + Math.random() * 10);
    }
    // Great spot
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = '#b43808';
    ctx.beginPath();
    ctx.ellipse(W * 0.68, H * 0.56, 28, 16, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else if (frozen || ice) {
    // Ice surface cracks
    ctx.globalAlpha = 0.45;
    for (let i = 0; i < 18; i++) {
      ctx.strokeStyle = pal[2 + (i % 2)];
      ctx.lineWidth = 0.8 + Math.random() * 1.2;
      ctx.beginPath();
      const x1 = Math.random() * W, y1 = Math.random() * H;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 + (Math.random() - 0.5) * 150, y1 + (Math.random() - 0.5) * 80);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (lava) {
    // Bright lava flows
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = pal[2 + Math.floor(Math.random() * 4)];
      ctx.globalAlpha = 0.55 + Math.random() * 0.45;
      ctx.beginPath();
      ctx.ellipse(
        Math.random() * W, Math.random() * H,
        Math.random() * 45 + 5, Math.random() * 16 + 3,
        Math.random() * Math.PI, 0, Math.PI * 2
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else {
    // Continent patches
    for (let i = 0; i < 22; i++) {
      ctx.fillStyle = pal[Math.floor(Math.random() * pal.length)];
      ctx.globalAlpha = 0.70 + Math.random() * 0.30;
      ctx.beginPath();
      ctx.ellipse(
        Math.random() * W, Math.random() * H,
        Math.random() * 68 + 18, Math.random() * 33 + 9,
        Math.random() * Math.PI, 0, Math.PI * 2
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Faint atmospheric bands
    for (let y = 0; y < H; y += 28) {
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(0, y, W, 11);
    }
  }

  ctx.globalAlpha = 1;

  // Polar ice caps (skip for pure lava / gas giants)
  if (!lava && !gas) {
    const iceFrac = (frozen || ice) ? 0.65 : 0.38;
    const capH = Math.round(H * iceFrac * 0.38);
    const g1 = ctx.createLinearGradient(0, 0, 0, capH);
    g1.addColorStop(0, `rgba(220,240,255,${iceFrac})`);
    g1.addColorStop(1, 'rgba(220,240,255,0)');
    ctx.fillStyle = g1; ctx.fillRect(0, 0, W, capH);
    const g2 = ctx.createLinearGradient(0, H - capH, 0, H);
    g2.addColorStop(0, 'rgba(220,240,255,0)');
    g2.addColorStop(1, `rgba(220,240,255,${iceFrac})`);
    ctx.fillStyle = g2; ctx.fillRect(0, H - capH, W, capH);
  }

  return canvas;
}

// ─── Orbit path ───────────────────────────────────────────────────────────────

const OrbitPath = ({ radius, color = '#3b82f6', opacity = 0.35 }) => {
  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 256; i++) {
      const a = (i / 256) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    return pts;
  }, [radius]);
  return <Line points={points} color={color} lineWidth={0.5} transparent opacity={opacity} />;
};

// ─── Star color by temperature ────────────────────────────────────────────────

const getStarColorFromTemp = (temp) => {
  if (!temp || temp < 3000) return { main: '#ff3800', emissive: '#ff1400', light: '#ff6600', corona1: '#ff5500', corona2: '#ff7700' }; // Red dwarf (M)
  if (temp < 5200)          return { main: '#ff8c00', emissive: '#ff6400', light: '#ffb347', corona1: '#ff9800', corona2: '#ffaa20' }; // Orange (K)
  if (temp < 6000)          return { main: '#ffee44', emissive: '#ffdd00', light: '#fff9b0', corona1: '#ffe855', corona2: '#fff388' }; // Yellow (G, Sun-like)
  if (temp < 7500)          return { main: '#ffffee', emissive: '#ffffdd', light: '#ffffff', corona1: '#fffff0', corona2: '#fffff8' }; // White (F)
  return { main: '#aaccff', emissive: '#88aaff', light: '#d4e4ff', corona1: '#bbddff', corona2: '#cceeFF' }; // Blue-white (A/B/O)
};

// ─── Central Star ─────────────────────────────────────────────────────────────

const CentralStar = ({ temperature = 5778, showHabitableZone = true, onClickStar }) => {
  const meshRef  = useRef();
  const c1Ref    = useRef();
  const c2Ref    = useRef();
  const timeRef  = useRef(0);

  const starColors = useMemo(() => getStarColorFromTemp(temperature), [temperature]);

  useFrame((_, dt) => {
    timeRef.current += dt;
    if (meshRef.current) meshRef.current.rotation.y += 0.042 * dt;
    if (c1Ref.current)  c1Ref.current.scale.setScalar(4.5 + Math.sin(timeRef.current * 0.75) * 0.18);
    if (c2Ref.current)  c2Ref.current.scale.setScalar(3.1 + Math.sin(timeRef.current * 1.15 + 1.0) * 0.12);
  });

  // Habitable zone boundaries (AU) - simplified Kopparapu model
  // For Sun (5778K): inner edge ~0.95 AU, outer edge ~1.37 AU
  // Formula scales with stellar temperature: hotter stars → wider HZ farther out
  const hzInner = Math.sqrt(temperature / 5778) * 0.95;  // Inner edge
  const hzOuter = Math.sqrt(temperature / 5778) * 1.37;  // Outer edge
  // Convert AU to 3D scene radius using same log scale as planet orbits
  const hzInnerRadius = Math.max(2.8, Math.min(24, Math.log10(hzInner + 0.15) * 8 + 8));
  const hzOuterRadius = Math.max(2.8, Math.min(24, Math.log10(hzOuter + 0.15) * 8 + 8));

  return (
    <group onClick={onClickStar} style={{ cursor: 'pointer' }}>
      {/* Habitable Zone Ring */}
      {showHabitableZone && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
          <ringGeometry args={[hzInnerRadius, hzOuterRadius, 84]} />
          <meshBasicMaterial
            color="#22c55e"
            transparent
            opacity={0.12}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Outer pulsing corona */}
      <mesh ref={c1Ref}>
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshBasicMaterial color={starColors.corona1} transparent opacity={0.014} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      {/* Mid pulsing corona */}
      <mesh ref={c2Ref}>
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshBasicMaterial color={starColors.corona2} transparent opacity={0.026} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      {/* Inner static corona */}
      <mesh scale={[2.05, 2.05, 2.05]}>
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshBasicMaterial color={starColors.corona1} transparent opacity={0.038} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      {/* Star surface */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.2, 48, 48]} />
        <meshStandardMaterial color={starColors.main} emissive={starColors.emissive} emissiveIntensity={1.6} roughness={0.38} />
      </mesh>
      <pointLight color={starColors.light} intensity={3.8} distance={65} decay={2} />
      <pointLight color={starColors.emissive} intensity={1.1} distance={16} decay={2} />
    </group>
  );
};

// ─── Gas giant ring ───────────────────────────────────────────────────────────

const PlanetRing = ({ size, color }) => (
  <mesh rotation={[Math.PI / 2.4, 0, 0]}>
    <torusGeometry args={[size * 2.3, size * 0.32, 3, 68]} />
    <meshBasicMaterial color={color} transparent opacity={0.20} side={THREE.DoubleSide} depthWrite={false} />
  </mesh>
);

// ─── Orbiting Planet ──────────────────────────────────────────────────────────

const OrbitalPlanet = ({
  planet, orbitRadius, size, colors, speed, initialAngle,
  isSelected, onSelect, showLabel, paused, onFocusPlanet,
}) => {
  const groupRef  = useRef();
  const angleRef  = useRef(initialAngle);
  const scaleRef  = useRef(0);
  const [hovered, setHovered] = useState(false);

  const texture = useMemo(() => {
    const cvs = buildPlanetCanvas(planet.habitability_class, planet.pl_eqt, planet.pl_rade);
    return new THREE.CanvasTexture(cvs);
  }, [planet.habitability_class, planet.pl_eqt, planet.pl_rade]);

  useFrame((_, dt) => {
    if (!paused) {
      angleRef.current += speed * dt;
      if (groupRef.current) {
        groupRef.current.position.x = Math.cos(angleRef.current) * orbitRadius;
        groupRef.current.position.z = Math.sin(angleRef.current) * orbitRadius;
        // Self-rotation on the planet mesh (first child)
        if (groupRef.current.children[0]) {
          groupRef.current.children[0].rotation.y += 0.22 * dt;
        }
      }
    }
    // Smooth scale-in entry
    if (scaleRef.current < 1) {
      scaleRef.current = Math.min(1, scaleRef.current + dt * 1.8);
      if (groupRef.current) groupRef.current.scale.setScalar(scaleRef.current);
    }
  });

  const handleOver  = useCallback((e) => { e.stopPropagation(); setHovered(true);  document.body.style.cursor = 'pointer'; }, []);
  const handleOut   = useCallback((e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'default'; }, []);
  const handleClick = useCallback((e) => {
    e.stopPropagation();
    onSelect(planet);
    if (onFocusPlanet && groupRef.current) {
      const wp = new THREE.Vector3();
      groupRef.current.getWorldPosition(wp);
      onFocusPlanet(wp);
    }
  }, [planet, onSelect, onFocusPlanet]);

  const glowScale        = hovered ? 1.68 : isSelected ? 1.56 : 1.38;
  const emissiveIntensity = hovered ? 1.1 : isSelected ? 0.9 : 0.5;
  const gas              = isGasGiant(planet.pl_rade);
  const missionName      = planet.mission_name || planet.mission?.name || '';
  const shortName        = planet.planet_name?.length > 14
    ? planet.planet_name.slice(0, 13) + '…'
    : planet.planet_name;

  return (
    <group ref={groupRef}>
      {/* Planet mesh */}
      <mesh onPointerOver={handleOver} onPointerOut={handleOut} onClick={handleClick}>
        <sphereGeometry args={[size, 48, 48]} />
        <meshStandardMaterial
          map={texture}
          emissive={colors.emissive}
          emissiveIntensity={emissiveIntensity}
          roughness={0.64}
          metalness={0.04}
        />
      </mesh>

      {/* Gas giant ring */}
      {gas && <PlanetRing size={size} color={colors.main} />}

      {/* Multi-layered atmosphere glow */}
      {/* Outer atmosphere - largest, most transparent */}
      <mesh scale={[glowScale * 1.15, glowScale * 1.15, glowScale * 1.15]}>
        <sphereGeometry args={[size, 20, 20]} />
        <meshBasicMaterial
          color={colors.atmosphere}
          transparent
          opacity={hovered ? 0.18 : isSelected ? 0.14 : 0.08}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Mid atmosphere */}
      <mesh scale={[glowScale, glowScale, glowScale]}>
        <sphereGeometry args={[size, 20, 20]} />
        <meshBasicMaterial
          color={colors.atmosphere}
          transparent
          opacity={hovered ? 0.28 : isSelected ? 0.22 : 0.14}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Inner atmosphere - brightest, closest to surface */}
      <mesh scale={[glowScale * 0.92, glowScale * 0.92, glowScale * 0.92]}>
        <sphereGeometry args={[size, 20, 20]} />
        <meshBasicMaterial
          color={colors.glow}
          transparent
          opacity={hovered ? 0.36 : isSelected ? 0.28 : 0.18}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * 1.88, size * 2.18, 52]} />
          <meshBasicMaterial color={colors.main} transparent opacity={0.80} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}

      {/* Persistent name label (toggleable) */}
      {showLabel && (
        <Html
          distanceFactor={14}
          center
          style={{ pointerEvents: 'none', userSelect: 'none' }}
          position={[0, size * 2.4, 0]}
        >
          <div style={{
            color: colors.main,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 0.5,
            textShadow: '0 0 10px rgba(0,0,0,0.95)',
            whiteSpace: 'nowrap',
          }}>
            {shortName}
          </div>
        </Html>
      )}

      {/* Hover tooltip (shown when labels are off) */}
      {hovered && !showLabel && (
        <Html distanceFactor={12} center style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(9,18,36,0.95)',
            border: `1px solid ${colors.main}55`,
            borderRadius: 9,
            padding: '9px 13px',
            minWidth: 168,
            backdropFilter: 'blur(14px)',
            boxShadow: `0 0 28px ${colors.glow}38`,
            whiteSpace: 'nowrap',
          }}>
            <p style={{ color: colors.main, fontWeight: 700, fontSize: 12, marginBottom: 3 }}>{planet.planet_name}</p>
            {missionName && (
              <p style={{ color: '#475569', fontSize: 10, marginBottom: 4 }}>{missionName}</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {planet.pl_eqt    && <p style={{ color: '#94a3b8', fontSize: 10 }}>T = {Math.round(planet.pl_eqt)} K</p>}
              {planet.pl_rade   && <p style={{ color: '#94a3b8', fontSize: 10 }}>R = {planet.pl_rade.toFixed(2)} R⊕</p>}
              {planet.pl_orbper && <p style={{ color: '#94a3b8', fontSize: 10 }}>P = {Math.round(planet.pl_orbper)} d</p>}
            </div>
            <p style={{ color: '#1e3a5f', fontSize: 9, marginTop: 5 }}>Click to inspect</p>
          </div>
        </Html>
      )}
    </group>
  );
};

// ─── Full Orbital Scene ────────────────────────────────────────────────────────

const OrbitalScene = ({
  planets, selectedPlanet, onSelectPlanet,
  autoRotate, showLabels, cameraMode, onControlsReady, showHabitableZone,
  onRegisterResetFocus,
}) => {
  const { camera } = useThree();
  const controlsRef     = useRef();
  const interactingRef  = useRef(false);
  const azimuthRef      = useRef(0);
  const camTargetRef    = useRef(null); // null = no forced transition in progress
  const transitionRef   = useRef(false);
  const focusTargetRef  = useRef(new THREE.Vector3(0, 0, 0));
  const focusingRef     = useRef(false);

  // Calculate average star temperature from planets with star data
  // This determines the star's color and the habitable zone boundaries
  // Default to Sun-like (5778K) if no temperature data available
  const avgStarTemp = useMemo(() => {
    const temps = planets.filter(p => p.st_teff).map(p => p.st_teff);
    return temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 5778;
  }, [planets]);

  // Expose controls to parent
  useEffect(() => {
    if (onControlsReady && controlsRef.current) onControlsReady(controlsRef.current);
  });

  // Register the "reset focus to star" function so the parent can call it
  useEffect(() => {
    if (onRegisterResetFocus) {
      onRegisterResetFocus(() => {
        focusTargetRef.current.set(0, 0, 0);
        focusingRef.current = true;
      });
    }
  }, [onRegisterResetFocus]);

  // Trigger camera transition on mode change; also reset focus to star
  useEffect(() => {
    if (cameraMode === 'top') {
      camTargetRef.current = { x: 0, y: 52, z: 0.5 };
    } else if (cameraMode === 'surface') {
      camTargetRef.current = { x: 0, y: 4, z: 10 };
    } else {
      camTargetRef.current = { x: 0, y: 14, z: 26 };
    }
    // Reset focus to star whenever camera mode changes
    focusTargetRef.current.set(0, 0, 0);
    focusingRef.current = true;
    transitionRef.current = true;
  }, [cameraMode]);

  // Focus on a planet: set OrbitControls target to planet's world position
  const handleFocusPlanet = useCallback((worldPos) => {
    focusTargetRef.current.copy(worldPos);
    focusingRef.current = true;
  }, []);

  // Reset focus to star (center)
  const handleFocusStar = useCallback(() => {
    focusTargetRef.current.set(0, 0, 0);
    focusingRef.current = true;
    onSelectPlanet(null);
  }, [onSelectPlanet]);

  const initialAngles = useMemo(
    () => planets.map((_, i) => (i / planets.length) * Math.PI * 2),
    [planets]
  );

  useFrame((_, dt) => {
    const ft = focusTargetRef.current;

    // 1. Smooth camera POSITION transition (mode changes: top/surface/free)
    if (transitionRef.current && camTargetRef.current) {
      const t = camTargetRef.current;
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, t.x, 0.04);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, t.y, 0.04);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, t.z, 0.04);
      camera.lookAt(ft);
      if (controlsRef.current) controlsRef.current.target.copy(ft);

      const dist = Math.sqrt(
        (camera.position.x - t.x) ** 2 +
        (camera.position.y - t.y) ** 2 +
        (camera.position.z - t.z) ** 2
      );
      if (dist < 0.15) {
        camera.position.set(t.x, t.y, t.z);
        transitionRef.current = false;
      }
      return; // skip auto-rotate during position transition
    }

    // 2. Smooth focus TARGET transition (click-to-center: lerp OrbitControls.target)
    if (focusingRef.current && controlsRef.current) {
      const cur = controlsRef.current.target;
      cur.x = THREE.MathUtils.lerp(cur.x, ft.x, 0.06);
      cur.y = THREE.MathUtils.lerp(cur.y, ft.y, 0.06);
      cur.z = THREE.MathUtils.lerp(cur.z, ft.z, 0.06);
      if (cur.distanceTo(ft) < 0.05) {
        cur.copy(ft);
        focusingRef.current = false;
      }
    }

    // 3. Auto-rotate: orbit around the current focus target (not always the star)
    if (autoRotate && !interactingRef.current) {
      azimuthRef.current += 0.012 * dt;
      const relX = camera.position.x - ft.x;
      const relZ = camera.position.z - ft.z;
      const dist = Math.sqrt(relX ** 2 + relZ ** 2);
      if (dist > 0.1) {
        camera.position.x = ft.x + Math.cos(azimuthRef.current) * dist;
        camera.position.z = ft.z + Math.sin(azimuthRef.current) * dist;
        camera.lookAt(ft);
        if (controlsRef.current) controlsRef.current.target.copy(ft);
      }
    } else {
      // Track azimuth relative to focus target for smooth resume
      azimuthRef.current = Math.atan2(
        camera.position.z - ft.z,
        camera.position.x - ft.x
      );
    }
  });

  return (
    <>
      <ambientLight intensity={0.12} />
      <Stars radius={130} depth={70} count={12000} factor={5} saturation={0.14} fade speed={0.28} />
      <CentralStar temperature={avgStarTemp} showHabitableZone={showHabitableZone} onClickStar={handleFocusStar} />

      {planets.map((planet, idx) => {
        const orbitRadius  = getOrbitRadius(planet.pl_orbsmax, idx);
        const colors       = HABITABILITY_COLORS[planet.habitability_class] || DEFAULT_COLOR;
        const inclination  = getOrbitalInclination(idx);
        return (
          <group key={planet.id} rotation={[inclination, 0, 0]}>
            <OrbitPath radius={orbitRadius} />
            <OrbitalPlanet
              planet={planet}
              orbitRadius={orbitRadius}
              size={getPlanetSize(planet.pl_rade)}
              colors={colors}
              speed={getOrbitalSpeed(planet.pl_orbper)}
              initialAngle={initialAngles[idx]}
              isSelected={selectedPlanet?.id === planet.id}
              onSelect={onSelectPlanet}
              showLabel={showLabels}
              paused={!autoRotate}
              onFocusPlanet={handleFocusPlanet}
            />
          </group>
        );
      })}

      <OrbitControls
        ref={controlsRef}
        enablePan
        enableZoom
        enableRotate
        minDistance={3}
        maxDistance={58}
        dampingFactor={0.08}
        enableDamping
        onStart={() => {
          interactingRef.current = true;
          transitionRef.current = false;
          focusingRef.current = false;
          const ft = focusTargetRef.current;
          azimuthRef.current = Math.atan2(
            camera.position.z - ft.z,
            camera.position.x - ft.x
          );
        }}
        onEnd={() => { interactingRef.current = false; }}
      />
    </>
  );
};

// ─── Demo Preview Scene ────────────────────────────────────────────────────────

const DEMO_PLANETS = [
  { id: 'd1', habitability_class: 'POTENTIALLY_HABITABLE', pl_rade: 1.2, pl_orbsmax: 0.9,  pl_orbper: 320, pl_eqt: 295, planet_name: 'Kepler-442b' },
  { id: 'd2', habitability_class: 'HABITABILITY_ZONE',     pl_rade: 1.8, pl_orbsmax: 0.48, pl_orbper: 128, pl_eqt: 430, planet_name: 'Kepler-62f'  },
  { id: 'd3', habitability_class: 'NON_HABITABLE',         pl_rade: 6.4, pl_orbsmax: 0.22, pl_orbper:  42, pl_eqt: 820, planet_name: 'Kepler-6b'   },
  { id: 'd4', habitability_class: 'POTENTIALLY_HABITABLE', pl_rade: 0.9, pl_orbsmax: 1.4,  pl_orbper: 495, pl_eqt: 255, planet_name: 'TOI-700d'    },
];

const PreviewScene = () => (
  <>
    <ambientLight intensity={0.06} />
    <Stars radius={80} depth={40} count={6000} factor={4} saturation={0.14} fade speed={0.22} />
    <CentralStar />
    {DEMO_PLANETS.map((planet, idx) => {
      const r      = getOrbitRadius(planet.pl_orbsmax, idx);
      const colors = HABITABILITY_COLORS[planet.habitability_class] || DEFAULT_COLOR;
      return (
        <group key={planet.id}>
          <OrbitPath radius={r} opacity={0.20} />
          <OrbitalPlanet
            planet={planet}
            orbitRadius={r}
            size={getPlanetSize(planet.pl_rade)}
            colors={colors}
            speed={getOrbitalSpeed(planet.pl_orbper) * 0.55}
            initialAngle={(idx / DEMO_PLANETS.length) * Math.PI * 2}
            isSelected={false}
            onSelect={() => {}}
            showLabel={false}
          />
        </group>
      );
    })}
    <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} autoRotate autoRotateSpeed={0.38} />
  </>
);

// ─── Legend ───────────────────────────────────────────────────────────────────

const Legend = () => (
  <div style={{
    position: 'absolute', bottom: 16, left: 16,
    background: 'rgba(9,18,36,0.90)',
    border: '1px solid #1e3a5f',
    borderRadius: 11, padding: '10px 14px',
    backdropFilter: 'blur(14px)',
  }}>
    <p style={{ color: '#334155', fontSize: 10, marginBottom: 7, textTransform: 'uppercase', letterSpacing: 1 }}>Legend</p>
    {[
      { color: '#22c55e', label: 'Potentially Habitable' },
      { color: '#eab308', label: 'Habitable Zone' },
      { color: '#ef4444', label: 'Non-Habitable' },
    ].map(({ color, label }) => (
      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
        <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}88` }} />
        <span style={{ color: '#94a3b8', fontSize: 11 }}>{label}</span>
      </div>
    ))}
    <div style={{ borderTop: '1px solid #1e293b', marginTop: 8, paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <p style={{ color: '#334155', fontSize: 10 }}>● Size ≈ Planet radius</p>
      <p style={{ color: '#334155', fontSize: 10 }}>◯ Distance ≈ Semi-major axis (log)</p>
      <p style={{ color: '#334155', fontSize: 10 }}>⬡ Rings = Gas giant (&gt; 3.5 R⊕)</p>
      <p style={{ color: '#22c55e', fontSize: 10 }}>⬤ Green ring = Habitable zone</p>
    </div>
  </div>
);

// ─── Stats Bar ────────────────────────────────────────────────────────────────

const StatsBar = ({ planets }) => {
  const counts = useMemo(() => ({
    habitable:    planets.filter(p => p.habitability_class === 'POTENTIALLY_HABITABLE').length,
    zone:         planets.filter(p => p.habitability_class === 'HABITABILITY_ZONE').length,
    nonHabitable: planets.filter(p => p.habitability_class === 'NON_HABITABLE').length,
    gasGiants:    planets.filter(p => isGasGiant(p.pl_rade)).length,
  }), [planets]);

  return (
    <div className="flex items-center gap-4 px-5 py-2 border-b border-slate-800/40 bg-slate-950/60 flex-shrink-0 flex-wrap">
      <span className="text-slate-600 text-xs uppercase tracking-widest">Dataset</span>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-green-500" style={{ boxShadow: '0 0 5px #22c55e' }} />
        <span className="text-green-400 text-xs font-semibold">{counts.habitable}</span>
        <span className="text-slate-600 text-xs">Habitable</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-yellow-500" style={{ boxShadow: '0 0 5px #eab308' }} />
        <span className="text-yellow-400 text-xs font-semibold">{counts.zone}</span>
        <span className="text-slate-600 text-xs">HZ</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-red-500" style={{ boxShadow: '0 0 5px #ef4444' }} />
        <span className="text-red-400 text-xs font-semibold">{counts.nonHabitable}</span>
        <span className="text-slate-600 text-xs">Non-Habitable</span>
      </div>
      {counts.gasGiants > 0 && (
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-orange-400" style={{ boxShadow: '0 0 5px #fb923c' }} />
          <span className="text-orange-400 text-xs font-semibold">{counts.gasGiants}</span>
          <span className="text-slate-600 text-xs">Gas Giants</span>
        </div>
      )}
      <div className="ml-auto text-slate-600 text-xs">{planets.length} planets rendered</div>
    </div>
  );
};

// ─── Planet Info Panel ────────────────────────────────────────────────────────

const PlanetInfoPanel = ({ planet, onClose }) => {
  const colors      = HABITABILITY_COLORS[planet.habitability_class] || DEFAULT_COLOR;
  const missionName = planet.mission_name || planet.mission?.name || 'Unknown';
  const esiPct      = planet.esi_overall != null ? Math.round(planet.esi_overall * 100) : null;

  const habitabilityPct =
    planet.habitability_class === 'POTENTIALLY_HABITABLE' ? 88 :
    planet.habitability_class === 'HABITABILITY_ZONE'     ? 52 : 14;

  const stats = [
    { icon: Globe,       label: 'Radius',     value: planet.pl_rade    ? `${planet.pl_rade.toFixed(2)} R⊕`   : 'N/A', color: '#60a5fa' },
    { icon: Thermometer, label: 'Temp',       value: planet.pl_eqt     ? `${Math.round(planet.pl_eqt)} K`    : 'N/A', color: '#fb923c' },
    { icon: Zap,         label: 'Insolation', value: planet.pl_insol   ? `${planet.pl_insol.toFixed(2)} S⊕`  : 'N/A', color: '#facc15' },
    { icon: Clock,       label: 'Period',     value: planet.pl_orbper  ? `${Math.round(planet.pl_orbper)} d`  : 'N/A', color: '#a78bfa' },
    { icon: Globe,       label: 'Axis',       value: planet.pl_orbsmax ? `${planet.pl_orbsmax.toFixed(3)} AU` : 'N/A', color: '#34d399' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 28, y: -4 }}
      animate={{ opacity: 1, x: 0,  y: 0 }}
      exit={{    opacity: 0, x: 28 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      style={{
        position: 'absolute', top: 16, right: 16,
        width: 234,
        background: 'rgba(9,18,36,0.96)',
        border: `1px solid ${colors.main}3e`,
        borderRadius: 14, padding: '15px 16px',
        backdropFilter: 'blur(22px)',
        boxShadow: `0 0 48px ${colors.glow}16, 0 0 0 1px ${colors.main}12`,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <p style={{ color: colors.main, fontWeight: 700, fontSize: 13.5, marginBottom: 4, lineHeight: 1.3 }}>
            {planet.planet_name}
          </p>
          <span style={{
            background: `${colors.main}18`, color: colors.main,
            border: `1px solid ${colors.main}32`,
            fontSize: 9.5, padding: '2px 7px', borderRadius: 4,
            textTransform: 'uppercase', letterSpacing: 0.9,
          }}>
            {missionName}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{ color: '#475569', cursor: 'pointer', background: 'none', border: 'none', padding: 3, marginLeft: 8 }}
        >
          <X size={13} />
        </button>
      </div>

      {/* Habitability classification bar */}
      <div style={{ marginBottom: 11 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ color: '#475569', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            {planet.habitability_class?.replace(/_/g, ' ')}
          </span>
          <span style={{ color: colors.main, fontSize: 10, fontWeight: 700 }}>{habitabilityPct}%</span>
        </div>
        <div style={{ height: 3, borderRadius: 2, background: '#0f172a', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${habitabilityPct}%` }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            style={{ height: '100%', background: colors.main, borderRadius: 2 }}
          />
        </div>
      </div>

      {/* ESI Score */}
      {esiPct != null && (
        <div style={{
          marginBottom: 12,
          padding: '8px 10px',
          background: `${colors.main}0c`,
          borderRadius: 8,
          border: `1px solid ${colors.main}1e`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: '#475569', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Earth Similarity Index
            </span>
            <span style={{ color: colors.main, fontSize: 10.5, fontWeight: 700 }}>{esiPct}%</span>
          </div>
          <div style={{ height: 3, borderRadius: 2, background: '#0f172a', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${esiPct}%` }}
              transition={{ duration: 0.85, delay: 0.1, ease: 'easeOut' }}
              style={{
                height: '100%',
                background: `linear-gradient(to right, ${colors.emissive}, ${colors.main})`,
                borderRadius: 2,
              }}
            />
          </div>
        </div>
      )}

      {/* Stats */}
      {stats.map(({ icon: Icon, label, value, color }) => (
        <div
          key={label}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon size={11} color={color} />
            <span style={{ color: '#475569', fontSize: 11 }}>{label}</span>
          </div>
          <span style={{ color: '#cbd5e1', fontSize: 11, fontWeight: 600 }}>{value}</span>
        </div>
      ))}

      {/* Discovery footer */}
      {planet.disc_year && (
        <div style={{ borderTop: '1px solid #0f172a', marginTop: 8, paddingTop: 8 }}>
          <p style={{ color: '#334155', fontSize: 10 }}>
            Discovered {planet.disc_year}{planet.disc_facility ? ` · ${planet.disc_facility}` : ''}
          </p>
        </div>
      )}
    </motion.div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const ExoplanetViewer3D = ({ filters = {}, searchQuery = '' }) => {
  const [isOpen,           setIsOpen]           = useState(false);
  const [solarOpen,        setSolarOpen]        = useState(false);
  const [planets,          setPlanets]          = useState([]);
  const [loading,          setLoading]          = useState(false);
  const [selectedPlanet,   setSelectedPlanet]   = useState(null);
  const [autoRotate,       setAutoRotate]       = useState(true);
  const [showLabels,       setShowLabels]       = useState(false);
  const [cameraMode,       setCameraMode]       = useState('perspective');
  const [showHabitableZone, setShowHabitableZone] = useState(true);

  const controlsRef   = useRef(null);
  const resetFocusRef = useRef(null);

  const fetchPlanets = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch up to 30 planets using current filters from Explore page
      // This creates a DYNAMIC visualization that changes based on:
      // - Mission filter (Kepler, K2, TESS)
      // - Habitability class filter
      // - Search query
      // The 3D viewer updates whenever filters change (must close/reopen to refresh)
      const params = { page_size: 30, ...filters };
      if (searchQuery) params.q = searchQuery;
      const res  = await getPlanets(1, 30, params);
      const list = res.results || [];

      // Sort by habitability class: habitable → zone → non-habitable
      // This ensures the most interesting planets render first
      list.sort((a, b) => {
        const rank = { POTENTIALLY_HABITABLE: 0, HABITABILITY_ZONE: 1, NON_HABITABLE: 2 };
        return (rank[a.habitability_class] ?? 3) - (rank[b.habitability_class] ?? 3);
      });

      // Display max 28 planets (performance limit for smooth 60fps rendering)
      // Note: These planets are from DIFFERENT star systems, shown orbiting
      // one central star for comparative visualization purposes
      setPlanets(list.slice(0, 28));
    } catch {
      setPlanets(DEMO_PLANETS);
    } finally {
      setLoading(false);
    }
  }, [filters, searchQuery]);

  useEffect(() => {
    if (isOpen) fetchPlanets();
  }, [isOpen, fetchPlanets]);

  const handleOpen  = () => { setIsOpen(true); setSelectedPlanet(null); };
  const handleClose = () => {
    setIsOpen(false);
    setSelectedPlanet(null);
    document.body.style.cursor = 'default';
  };

  const handleControlsReady = useCallback((controls) => {
    controlsRef.current = controls;
  }, []);

  const handleResetCamera = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.object.position.set(0, 14, 26);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
    resetFocusRef.current?.();
    setSelectedPlanet(null);
    setCameraMode('perspective');
  }, []);

  const toggleCameraMode = useCallback(() => {
    setCameraMode(m => (m === 'perspective' ? 'top' : 'perspective'));
  }, []);

  const zoomToPlanetSurface = useCallback(() => {
    if (selectedPlanet) {
      setCameraMode('surface');
    }
  }, [selectedPlanet]);

  const displayPlanets = planets.length > 0 ? planets : DEMO_PLANETS;

  return (
    <>
      {/* ── Preview Card ──────────────────────────────────────────────────────── */}
      <div className="relative w-full h-full rounded-xl overflow-hidden bg-slate-900/80 border border-slate-700/50">
        <Canvas
          camera={{ position: [0, 9, 18], fov: 55 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 1.5]}
          style={{ width: '100%', height: '100%' }}
        >
          <Suspense fallback={null}>
            <PreviewScene />
          </Suspense>
        </Canvas>

        {/* Bottom gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(2,6,23,0.78) 0%, rgba(2,6,23,0.08) 42%, transparent 65%)' }}
        />

        {/* Overlay content */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-4 gap-2">
          <p
            className="text-slate-300/90 text-xs font-medium uppercase tracking-widest"
            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.95)' }}
          >
            Orbital System Demo
          </p>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleOpen}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm text-white"
            style={{
              background: 'linear-gradient(135deg, #0e7490, #06b6d4)',
              boxShadow: '0 0 30px rgba(6,182,212,0.48), 0 0 0 1px rgba(6,182,212,0.28)',
            }}
          >
            <Maximize2 className="w-4 h-4" />
            Launch 3D Visualization
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setSolarOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-xs text-white"
            style={{
              background: 'linear-gradient(135deg, #78350f, #d97706)',
              boxShadow: '0 0 22px rgba(217,119,6,0.40), 0 0 0 1px rgba(217,119,6,0.25)',
            }}
          >
            <Sun className="w-3.5 h-3.5" />
            Explore Our Solar System
          </motion.button>
        </div>

        {/* Live badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 pointer-events-none">
          <div
            className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"
            style={{ boxShadow: '0 0 6px #22d3ee' }}
          />
          <span className="text-cyan-400/90 text-xs font-semibold tracking-wider">3D LIVE</span>
        </div>

        {/* Demo hint */}
        <div className="absolute top-3 right-3 pointer-events-none">
          <span className="text-slate-600 text-xs">{DEMO_PLANETS.length} demo planets</span>
        </div>
      </div>

      {/* ── Fullscreen Modal ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
            className="fixed inset-0 z-[9999] flex flex-col"
            style={{ background: '#010b1a' }}
          >
            {/* ── Header bar ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/50 bg-slate-950/92 backdrop-blur-lg flex-shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"
                  style={{ boxShadow: '0 0 7px #22d3ee' }}
                />
                <span className="text-white font-semibold text-sm tracking-wide">
                  Exoplanet 3D Orbital Viewer
                </span>
                {loading && (
                  <span className="text-slate-500 text-xs animate-pulse ml-1">Loading…</span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {/* Labels toggle */}
                <button
                  onClick={() => setShowLabels(v => !v)}
                  title={showLabels ? 'Hide planet labels' : 'Show planet labels'}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                    ${showLabels
                      ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'}`}
                >
                  {showLabels ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  Labels
                </button>

                {/* Habitable Zone toggle */}
                <button
                  onClick={() => setShowHabitableZone(v => !v)}
                  title={showHabitableZone ? 'Hide habitable zone' : 'Show habitable zone'}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                    ${showHabitableZone
                      ? 'bg-green-500/15 text-green-400 border-green-500/30'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'}`}
                >
                  <div className="w-3 h-3 rounded-full border-2 border-current" />
                  HZ Ring
                </button>

                {/* Camera mode toggle */}
                <button
                  onClick={toggleCameraMode}
                  title="Toggle top-down orbital view"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                    ${cameraMode === 'top'
                      ? 'bg-violet-500/15 text-violet-400 border-violet-500/30'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'}`}
                >
                  <Layers className="w-3 h-3" />
                  {cameraMode === 'top' ? 'Perspective' : 'Top View'}
                </button>

                {/* Surface zoom */}
                {selectedPlanet && (
                  <button
                    onClick={zoomToPlanetSurface}
                    title="Zoom to planet surface"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                      ${cameraMode === 'surface'
                        ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'}`}
                  >
                    <Globe className="w-3 h-3" />
                    Surface
                  </button>
                )}

                {/* Auto-rotate */}
                <button
                  onClick={() => setAutoRotate(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                    ${autoRotate
                      ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'}`}
                >
                  {autoRotate ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  {autoRotate ? 'Pause' : 'Rotate'}
                </button>

                {/* Reset camera */}
                <button
                  onClick={handleResetCamera}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                             bg-slate-800/80 text-slate-400 border border-slate-700 hover:text-white transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>

                {/* Close */}
                <button
                  onClick={handleClose}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                             bg-slate-800/80 text-slate-400 border border-slate-700 hover:text-red-400 transition-colors"
                >
                  <X className="w-3 h-3" /> Close
                </button>
              </div>
            </div>

            {/* ── Stats bar ───────────────────────────────────────────────────── */}
            {!loading && <StatsBar planets={displayPlanets} />}

            {/* ── Canvas area ─────────────────────────────────────────────────── */}
            <div className="relative flex-1 min-h-0">
              {loading ? (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-5"
                  style={{ background: '#010b1a' }}
                >
                  <div className="relative w-16 h-16">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      className="w-16 h-16 rounded-full border-2 border-t-cyan-400 border-slate-800/50"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-cyan-400/30 animate-pulse" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-400 text-sm mb-1">Fetching exoplanet catalog…</p>
                    <p className="text-slate-600 text-xs">Building orbital simulation</p>
                  </div>
                </div>
              ) : (
                <Canvas
                  camera={{ position: [0, 14, 26], fov: 55 }}
                  gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
                  dpr={[1, 2]}
                  style={{ width: '100%', height: '100%', background: '#010b1a' }}
                >
                  <Suspense fallback={null}>
                    <OrbitalScene
                      planets={displayPlanets}
                      selectedPlanet={selectedPlanet}
                      onSelectPlanet={setSelectedPlanet}
                      autoRotate={autoRotate}
                      showLabels={showLabels}
                      cameraMode={cameraMode}
                      onControlsReady={handleControlsReady}
                      showHabitableZone={showHabitableZone}
                      onRegisterResetFocus={(fn) => { resetFocusRef.current = fn; }}
                    />
                  </Suspense>
                </Canvas>
              )}

              {/* Legend */}
              <Legend />

              {/* Interaction hint */}
              <div style={{
                position: 'absolute', bottom: 16, right: 16,
                color: '#1e3a5f', fontSize: 11, textAlign: 'right',
                lineHeight: 1.7, pointerEvents: 'none',
              }}>
                <p>Click planet to center · Click star to recenter · Drag to orbit · Scroll to zoom</p>
                {selectedPlanet && <p style={{ color: '#3b82f6' }}>Centered on: {selectedPlanet.planet_name} — Reset to recenter on star</p>}
              </div>

              {/* Top-center label */}
              <div style={{
                position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
                color: '#1e3a5f', fontSize: 11,
                textTransform: 'uppercase', letterSpacing: 3,
                pointerEvents: 'none',
              }}>
                Comparative Orbital Simulation
              </div>

              {/* Selected planet info panel */}
              <AnimatePresence>
                {selectedPlanet && (
                  <PlanetInfoPanel
                    planet={selectedPlanet}
                    onClose={() => setSelectedPlanet(null)}
                  />
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Solar System Viewer ───────────────────────────────────────────── */}
      <SolarSystemViewer isOpen={solarOpen} onClose={() => setSolarOpen(false)} />
    </>
  );
};

export default ExoplanetViewer3D;
