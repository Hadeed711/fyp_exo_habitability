import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const MODEL_PATH = '/models/scene.gltf';

const FallbackCube = () => {
  const groupRef = useRef(null);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.45;
    groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.8) * 0.12;
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.2) * 0.08;
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <boxGeometry args={[1.9, 1.9, 1.9]} />
        <meshStandardMaterial color="#0f172a" metalness={0.2} roughness={0.75} />
      </mesh>
      <mesh scale={[1.22, 1.22, 1.22]}>
        <boxGeometry args={[1.9, 1.9, 1.9]} />
        <meshStandardMaterial color="#22d3ee" emissive="#0891b2" emissiveIntensity={0.3} wireframe />
      </mesh>
    </group>
  );
};

const AnimatedModel = ({ pointer, model }) => {
  const groupRef = useRef(null);
  const clonedModel = useMemo(() => model?.clone(true), [model]);

  useEffect(() => {
    if (!clonedModel) return;
    clonedModel.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [clonedModel]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const t = state.clock.elapsedTime;
    // Stronger cursor influence - make cube face towards cursor
    const targetX = -pointer.y * 0.8 + Math.sin(t * 0.7) * 0.08;
    const targetY = pointer.x * 1.2 + t * 0.15;
    const smoothing = 1 - Math.exp(-3.5 * delta);

    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetX, smoothing);
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetY, smoothing);
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, Math.sin(t * 1.3) * 0.1, smoothing);
  });

  if (!clonedModel) return null;

  return (
    <group ref={groupRef} scale={[0.0062, 0.0062, 0.0062]}>
      <primitive object={clonedModel} />
    </group>
  );
};

const AboutHeroCube = () => {
  const [model, setModel] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    let isMounted = true;
    const loader = new GLTFLoader();

    loader.load(
      MODEL_PATH,
      (gltf) => {
        if (!isMounted) return;
        setModel(gltf.scene);
        setLoadFailed(false);
      },
      undefined,
      () => {
        if (!isMounted) return;
        setLoadFailed(true);
      }
    );

    return () => {
      isMounted = false;
    };
  }, []);

  const handlePointerMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    setPointer({ x, y });

    // For cursor spotlight effect (0-100%)
    const cursorX = ((event.clientX - rect.left) / rect.width) * 100;
    const cursorY = ((event.clientY - rect.top) / rect.height) * 100;
    setCursorPos({ x: cursorX, y: cursorY });
  };

  const handlePointerLeave = () => setPointer({ x: 0, y: 0 });

  return (
    <div
      className="relative w-full max-w-xl mx-auto h-[300px] sm:h-[360px] md:h-[420px]"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {/* Subtle dot pattern background with cursor spotlight */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-300 ease-out"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.08) 0.5px, transparent 0.5px)`,
          backgroundSize: '20px 20px',
          maskImage: `radial-gradient(circle 180px at ${cursorPos.x}% ${cursorPos.y}%, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0) 100%)`,
          WebkitMaskImage: `radial-gradient(circle 180px at ${cursorPos.x}% ${cursorPos.y}%, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0) 100%)`,
        }}
      />

      <Canvas camera={{ position: [0, 1.3, 3.7], fov: 34 }} dpr={[1, 2]}>
        <ambientLight intensity={0.55} />
        <directionalLight position={[2, 3, 4]} intensity={1.0} color="#9ee7ff" />
        <directionalLight position={[-3, -1, -2]} intensity={0.45} color="#67e8f9" />
        <Environment preset="city" />

        {model && !loadFailed ? <AnimatedModel pointer={pointer} model={model} /> : <FallbackCube />}
      </Canvas>
    </div>
  );
};

export default AboutHeroCube;
