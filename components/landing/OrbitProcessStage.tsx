"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  Mic,
  Users,
  Coins,
  ArrowUpRight,
  CheckCircle2,
  Sparkles,
  Maximize2,
  Flame,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";

interface StepData {
  num: string;
  tag: string;
  title: string;
  phaseName: string;
  angleLabel: string;
  icon: typeof Mic;
  accent: string;
  accentBg: string;
  accentBorder: string;
  description: string;
  bullets: string[];
  ctaText: string;
  ctaLink: string;
  telemetry: string;
}

const STEPS: StepData[] = [
  {
    num: "01",
    tag: "The Challenge",
    title: "Take The Stage",
    phaseName: "Front Stage · Direct Standup",
    angleLabel: "0° · Straight On",
    icon: Mic,
    accent: "text-[#ffc53d]",
    accentBg: "bg-[#ffc53d]/10",
    accentBorder: "border-[#ffc53d]/30",
    description:
      "Step onto the acoustic neural stage and face the Straight Man AI. Perform real-life observational bits, puns, or deadpan setups. 5 daily free bits or stake for the Pro Stage (2.5× reward multiplier).",
    bullets: [
      "Open Mic is free: 5 bits recharged every 24h",
      "Stump the AI's literal chain-of-thought analysis",
      "Instant Straight Man automated response & punchline",
    ],
    ctaText: "Launch Stage Console",
    ctaLink: "/app?tab=stage",
    telemetry: "STAGE_MIC: ACTIVE · AI CONFIDENCE: 98.4%",
  },
  {
    num: "02",
    tag: "The Jury",
    title: "Blind Crowd Quorum",
    phaseName: "Profile Orbit · Blind Consensus",
    angleLabel: "120° · Crowd Perspective",
    icon: Users,
    accent: "text-[#3b82f6]",
    accentBg: "bg-[#3b82f6]/10",
    accentBorder: "border-[#3b82f6]/30",
    description:
      "Your bit enters the blind crowd quorum. 5 to 7 human jurors evaluate two anonymous answers side-by-side with zero wallet or identity metadata. ≥60% consensus earns the coveted 'Killed It' victory.",
    bullets: [
      "Blind evaluation: 0 handles, 0 wallet addresses",
      "5 to 7 verified human jurors per consensus quorum",
      "Cryptographic honeypots & calibration prevent collusion",
    ],
    ctaText: "Join As Juror",
    ctaLink: "/app?tab=crowd",
    telemetry: "QUORUM_SIZE: 5-7 · BLIND CONSENSUS: ≥60%",
  },
  {
    num: "03",
    tag: "The Payout",
    title: "On-Chain USDG Settlement",
    phaseName: "Full 360° · Merkle Proof Vault",
    angleLabel: "270° - 360° · Settlement Orbit",
    icon: Coins,
    accent: "text-emerald-400",
    accentBg: "bg-emerald-400/10",
    accentBorder: "border-emerald-400/30",
    description:
      "At midnight UTC, the settlement engine compiles verified wins into a Merkle root on Robinhood Chain. Winning comedians claim USDG from the Tip Jar; 20% buys and burns $HAHA via Mic Drop.",
    bullets: [
      "Verifiable Merkle proof payouts directly in USDG",
      "20% automated Mic Drop permanent buyback & burn",
      "10% lifetime royalties locked into the Joke Vault",
    ],
    ctaText: "Inspect Vault & Payouts",
    ctaLink: "/app?tab=vault",
    telemetry: "MERKLE_ROOT: MINED · REWARDS: USDG CLAIMABLE",
  },
];

export default function OrbitProcessStage() {
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [scrubK, setScrubK] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [pokes, setPokes] = useState<{ id: number; x: number; y: number; text: string }[]>([]);
  const [isHoveringCanvas, setIsHoveringCanvas] = useState(false);

  // Smooth scroll scrub detection
  useEffect(() => {
    const handleScroll = () => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      if (scrollable <= 0) return;
      const raw = -rect.top / scrollable;
      const clamped = Math.max(0, Math.min(1, raw));
      setScrubK(clamped);

      if (clamped < 0.35) {
        setActiveStep(0);
      } else if (clamped < 0.7) {
        setActiveStep(1);
      } else {
        setActiveStep(2);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Three.js 360° Orbit Mascot Scene
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      return;
    }

    const width = canvas.clientWidth || 600;
    const height = canvas.clientHeight || 500;
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.8;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2("#070709", 0.04);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
    camera.position.set(0, 0.6, 4.2);
    scene.add(camera);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    // Lighting Setup
    const ambient = new THREE.AmbientLight("#ffffff", 0.8);
    scene.add(ambient);

    const keySpot = new THREE.SpotLight("#ffffff", 14);
    keySpot.position.set(3, 5, 4);
    keySpot.angle = Math.PI / 4.5;
    keySpot.penumbra = 0.8;
    keySpot.castShadow = true;
    keySpot.shadow.bias = -0.001;
    scene.add(keySpot);

    const goldRim = new THREE.DirectionalLight("#ffc53d", 6);
    goldRim.position.set(-4, 3, -3);
    scene.add(goldRim);

    const blueFill = new THREE.DirectionalLight("#3b82f6", 2);
    blueFill.position.set(4, -1, -2);
    scene.add(blueFill);

    // Geometry Helpers
    const UP = new THREE.Vector3(0, 1, 0);

    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0xc89255,
      metalness: 0.9,
      roughness: 0.35,
      envMap: envTex,
      envMapIntensity: 0.8,
    });

    const darkMetal = new THREE.MeshStandardMaterial({
      color: 0x221a14,
      metalness: 0.85,
      roughness: 0.45,
      envMap: envTex,
      envMapIntensity: 0.6,
    });

    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x050505,
      roughness: 0.08,
      metalness: 0.1,
    });

    const goldGlow = new THREE.MeshBasicMaterial({ color: 0xffc53d, toneMapped: false });
    const eyeGlow = new THREE.MeshBasicMaterial({ color: 0xfff4e0, toneMapped: false });

    function addMesh(
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      parent: THREE.Object3D,
      x = 0,
      y = 0,
      z = 0,
    ) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    }

    function addLimb(
      a: [number, number, number],
      b: [number, number, number],
      r: number,
      mat: THREE.Material,
      parent: THREE.Object3D,
    ) {
      const A = new THREE.Vector3(...a);
      const B = new THREE.Vector3(...b);
      const d = B.clone().sub(A);
      const m = addMesh(new THREE.CylinderGeometry(r, r, d.length(), 24), mat, parent);
      m.position.copy(A).add(B).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(UP, d.normalize());
      return m;
    }

    function rounded(w: number, h: number, r: number) {
      const s = new THREE.Shape();
      const x = -w / 2;
      const y = -h / 2;
      s.moveTo(x + r, y);
      s.lineTo(x + w - r, y);
      s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + h - r);
      s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h);
      s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r);
      s.quadraticCurveTo(x, y, x + r, y);
      return s;
    }

    // Build Robot & Stage
    const rootStage = new THREE.Group();
    scene.add(rootStage);

    // 1. Stage Plinth with glowing amber rim
    addMesh(new THREE.CylinderGeometry(1.4, 1.48, 0.16, 64), darkMetal, rootStage, 0, -1.0, 0);
    const stageLip = new THREE.Mesh(new THREE.TorusGeometry(1.41, 0.016, 8, 120), goldGlow);
    stageLip.rotation.x = Math.PI / 2;
    stageLip.position.y = -0.92;
    rootStage.add(stageLip);

    // 2. Bar Stool
    const stool = new THREE.Group();
    stool.position.y = -0.92;
    rootStage.add(stool);
    addMesh(new THREE.CylinderGeometry(0.52, 0.5, 0.09, 36), darkMetal, stool, 0, 0.95, 0);
    for (let i = 0; i < 3; i++) {
      const a = i * 2.094 + 0.5;
      addLimb(
        [Math.cos(a) * 0.36, 0.95, Math.sin(a) * 0.36],
        [Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5],
        0.024,
        darkMetal,
        stool,
      );
    }
    const stoolRing = addMesh(new THREE.TorusGeometry(0.42, 0.016, 8, 48), darkMetal, stool, 0, 0.36, 0);
    stoolRing.rotation.x = Math.PI / 2;

    // 3. Mascot Bot Body & Legs
    const bot = new THREE.Group();
    bot.position.y = -0.92;
    rootStage.add(bot);

    addMesh(new THREE.CylinderGeometry(0.38, 0.42, 0.16, 32), darkMetal, bot, 0, 1.1, 0);
    for (const s of [-1, 1]) {
      addLimb([s * 0.22, 1.08, 0.02], [s * 0.28, 1.05, 0.62], 0.11, bronzeMat, bot);
      addMesh(new THREE.SphereGeometry(0.12, 16, 12), darkMetal, bot, s * 0.28, 1.05, 0.64);
      addLimb([s * 0.28, 1.04, 0.65], [s * 0.3, 0.16, 0.75], 0.09, bronzeMat, bot);
      addMesh(new THREE.BoxGeometry(0.22, 0.1, 0.36), darkMetal, bot, s * 0.3, 0.08, 0.85);
    }

    // 4. Torso & Arms
    const torso = new THREE.Group();
    torso.position.y = 1.16;
    bot.add(torso);
    addMesh(new THREE.CylinderGeometry(0.56, 0.44, 0.92, 48), bronzeMat, torso, 0, 0.46, 0);

    // Chest Status Dot
    const chestLamp = addMesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.03, 16),
      goldGlow,
      torso,
      0,
      0.58,
      0.53,
    );
    chestLamp.rotation.x = Math.PI / 2 - 0.12;

    for (const s of [-1, 1]) {
      addMesh(new THREE.SphereGeometry(0.15, 16, 12), bronzeMat, torso, s * 0.6, 0.8, 0);
      addLimb([s * 0.66, 0.78, 0], [s * 0.7, 0.3, 0.25], 0.08, darkMetal, torso);
      addMesh(new THREE.SphereGeometry(0.09, 14, 10), bronzeMat, torso, s * 0.7, 0.3, 0.25);
      addLimb([s * 0.7, 0.3, 0.25], [s * 0.36, 0.02, 0.58], 0.07, darkMetal, torso);
      addMesh(new THREE.SphereGeometry(0.1, 16, 12), bronzeMat, torso, s * 0.34, 0.0, 0.6);
    }
    addMesh(new THREE.CylinderGeometry(0.1, 0.12, 0.22, 16), darkMetal, torso, 0, 1.02, 0);

    // 5. Mascot Monitor Head
    const headPivot = new THREE.Group();
    headPivot.position.y = 1.12;
    torso.add(headPivot);

    const headGroup = new THREE.Group();
    headGroup.position.y = 0.55;
    headPivot.add(headGroup);

    const headExtrude = new THREE.ExtrudeGeometry(rounded(1.35, 0.96, 0.28), {
      depth: 0.7,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.08,
      bevelSegments: 5,
      curveSegments: 16,
    });
    headExtrude.center();
    addMesh(headExtrude, bronzeMat, headGroup);

    // CRT Bevel & Screen
    const screenGeo = new THREE.ExtrudeGeometry(rounded(1.08, 0.72, 0.16), {
      depth: 0.04,
      bevelEnabled: false,
    });
    screenGeo.center();
    addMesh(screenGeo, screenMat, headGroup, 0, 0, 0.44);

    // Glowing Eyes
    const eyesGroup = new THREE.Group();
    eyesGroup.position.set(0, 0.06, 0.47);
    headGroup.add(eyesGroup);

    const leftEye = addMesh(new THREE.CylinderGeometry(0.06, 0.06, 0.015, 20), eyeGlow, eyesGroup, -0.22, 0, 0);
    leftEye.rotation.x = Math.PI / 2;
    const rightEye = addMesh(new THREE.CylinderGeometry(0.06, 0.06, 0.015, 20), eyeGlow, eyesGroup, 0.22, 0, 0);
    rightEye.rotation.x = Math.PI / 2;

    // Mouth slit
    const mouth = addMesh(new THREE.BoxGeometry(0.24, 0.024, 0.01), eyeGlow, eyesGroup, 0, -0.16, 0);

    // Antenna on head
    addMesh(new THREE.CylinderGeometry(0.018, 0.018, 0.35, 12), darkMetal, headGroup, 0, 0.72, 0);
    addMesh(new THREE.SphereGeometry(0.07, 16, 12), goldGlow, headGroup, 0, 0.92, 0);

    // Vintage Standup Mic on Stage
    const micGroup = new THREE.Group();
    micGroup.position.set(0.68, -0.92, 0.85);
    rootStage.add(micGroup);
    addMesh(new THREE.CylinderGeometry(0.18, 0.2, 0.04, 24), darkMetal, micGroup, 0, 0.02, 0);
    addMesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 16), darkMetal, micGroup, 0, 0.82, 0);
    addMesh(new THREE.SphereGeometry(0.07, 16, 12), goldGlow, micGroup, 0, 1.64, 0);

    // Golden Floating Spark Particles
    const sparkCount = 180;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount; i++) {
      sparkPos[i * 3] = (Math.random() - 0.5) * 4.5;
      sparkPos[i * 3 + 1] = Math.random() * 3.5 - 1.2;
      sparkPos[i * 3 + 2] = (Math.random() - 0.5) * 4.5;
    }
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0xffc53d,
      size: 0.035,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    const sparks = new THREE.Points(sparkGeo, sparkMat);
    scene.add(sparks);

    // Mouse & Touch Interaction
    let mouseX = 0;
    let mouseY = 0;
    let manualRotY = 0;
    let isDragging = false;
    let lastX = 0;

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      if (isDragging) {
        const delta = e.clientX - lastX;
        manualRotY += delta * 0.012;
        lastX = e.clientX;
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      lastX = e.clientX;

      // Raycast poke
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(x, y), camera);
      const hits = ray.intersectObject(rootStage, true);
      if (hits.length > 0) {
        const pokeId = Date.now();
        const quotes = [
          "Observing your joke geometry…",
          "Consensus threshold: 60%.",
          "Straight Man pulse: deadpan.",
          "USDG Tip Jar: verified.",
        ];
        const text = quotes[Math.floor(Math.random() * quotes.length)] ?? "Straight Man evaluated.";
        setPokes((prev) => [...prev, { id: pokeId, x: e.clientX, y: e.clientY, text }]);
        setTimeout(() => {
          setPokes((prev) => prev.filter((p) => p.id !== pokeId));
        }, 1400);

        // Head jerk animation
        headPivot.rotation.z = (Math.random() - 0.5) * 0.2;
        headPivot.rotation.x = -0.15;
      }
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);

    // Visibility Observer to pause when scrolled out of view
    let isVisible = true;
    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 },
    );
    observer.observe(canvas);

    // Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!canvas) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    });
    resizeObserver.observe(canvas);

    // Animation Loop
    let currentOrbit = 0;
    let raf = 0;
    const clock = new THREE.Clock();

    const render = () => {
      raf = requestAnimationFrame(render);
      if (!isVisible) return;

      const dt = clock.getDelta();
      const t = clock.getElapsedTime();

      // Read target scrub angle from ref/state
      const track = trackRef.current;
      let targetK = 0;
      if (track) {
        const rect = track.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        if (total > 0) {
          targetK = Math.max(0, Math.min(1, -rect.top / total));
        }
      }

      // Smooth camera orbit around the robot (0 -> 2*PI radians = 360°)
      const targetAngle = targetK * Math.PI * 2 + manualRotY;
      currentOrbit += (targetAngle - currentOrbit) * 0.08;

      const radius = 4.4;
      const camY = 0.5 + Math.sin(currentOrbit * 0.5) * 0.2;
      camera.position.x = Math.sin(currentOrbit) * radius;
      camera.position.z = Math.cos(currentOrbit) * radius;
      camera.position.y = camY;
      camera.lookAt(0, 0.28, 0);

      // Head tracking pointer
      headPivot.rotation.y += (mouseX * 0.35 - headPivot.rotation.y) * 0.1;
      headPivot.rotation.x += (-mouseY * 0.2 - headPivot.rotation.x) * 0.1;
      headPivot.rotation.z *= 0.92;

      // Eye blinking
      const blinkCycle = t % 4;
      const isBlinking = blinkCycle > 3.82;
      leftEye.scale.y = isBlinking ? 0.1 : 1;
      rightEye.scale.y = isBlinking ? 0.1 : 1;

      // Floating sparks drift upward
      const positions = sparkGeo.attributes.position as THREE.BufferAttribute | undefined;
      if (positions && positions.array) {
        const arr = positions.array as Float32Array;
        for (let i = 0; i < sparkCount; i++) {
          const idx = i * 3 + 1;
          if (idx < arr.length) {
            arr[idx] = (arr[idx] ?? 0) + 0.008;
            if (arr[idx] > 2.5) {
              arr[idx] = -1.2;
            }
          }
        }
        positions.needsUpdate = true;
      }

      // Color tint based on phase
      if (goldRim) {
        if (targetK < 0.35) {
          goldRim.color.set("#ffc53d");
          if (stageLip) stageLip.material = goldGlow;
        } else if (targetK < 0.7) {
          goldRim.color.set("#3b82f6");
        } else {
          goldRim.color.set("#10b981");
        }
      }

      renderer.render(scene, camera);
    };

    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      resizeObserver.disconnect();
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      renderer.dispose();
      pmrem.dispose();
      envTex.dispose();
    };
  }, []);

  const curStep: StepData = (STEPS[activeStep] ?? STEPS[0]) as StepData;
  const StepIcon = curStep.icon;

  return (
    <section
      ref={trackRef}
      id="how-it-works"
      className="relative w-full h-[280vh] bg-[#070709] border-y border-white/10"
      aria-label="How It Works · 360° Scroll-Driven Orbit Stage"
    >
      {/* Floating Poke Dialog Toasts */}
      {pokes.map((p) => (
        <div
          key={p.id}
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-8 rounded-full border border-[#ffc53d]/50 bg-[#0c0c12]/95 px-4 py-1.5 font-mono text-xs text-[#ffc53d] shadow-[0_0_20px_rgba(255,197,61,0.4)] backdrop-blur-md animate-in fade-in zoom-in duration-200"
          style={{ left: p.x, top: p.y }}
        >
          {p.text}
        </div>
      ))}

      {/* STICKY VIEWPORT CONTAINER (pinned below navbar while scrolling 280vh) */}
      <div className="sticky top-20 h-[calc(100vh-5.5rem)] w-full flex flex-col justify-between pt-2 pb-4 px-[clamp(16px,3vw,48px)] max-w-[1440px] mx-auto overflow-hidden">
        {/* Top Control HUD */}
        <div className="relative z-20 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#ffc53d]">
              <Sparkles className="w-3.5 h-3.5 text-[#ffc53d]" />
              <span>360° Scroll-Driven Orbit</span>
            </div>
            <span className="hidden sm:inline font-mono text-xs text-zinc-400">
              {curStep.phaseName}
            </span>
          </div>

          {/* Step Quick Jump Selectors */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, idx) => (
              <button
                key={s.num}
                type="button"
                onClick={() => {
                  const track = trackRef.current;
                  if (!track) return;
                  const total = track.scrollHeight - window.innerHeight;
                  const targets = [0.15, 0.5, 0.85];
                  const t = targets[idx] ?? 0.5;
                  window.scrollTo({
                    top: track.offsetTop + t * total,
                    behavior: "smooth",
                  });
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[11px] uppercase tracking-wider transition-all duration-200 ${
                  activeStep === idx
                    ? "bg-[#ffc53d] text-black font-bold shadow-[0_0_12px_rgba(255,197,61,0.4)]"
                    : "border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <span>{s.num}</span>
                <span className="hidden md:inline">{s.tag}</span>
              </button>
            ))}

            <Link
              href="/showtime"
              target="_blank"
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-[#ffc53d]/30 bg-[#ffc53d]/10 font-mono text-[11px] uppercase tracking-wider text-[#ffc53d] hover:bg-[#ffc53d]/20 transition-all ml-2"
              title="Open full immersive 360° theater mode"
            >
              <Maximize2 className="w-3 h-3" />
              <span className="hidden sm:inline">Theater Mode</span>
            </Link>
          </div>
        </div>

        {/* Main Stage: Left Interactive 3D Canvas + Right Dynamic Step Card */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center my-auto w-full">
          {/* LEFT: 3D WEBGL ROBOT ORBIT CANVAS (Col 1-7) */}
          <div
            className="lg:col-span-7 relative h-[42vh] sm:h-[48vh] lg:h-[58vh] rounded-3xl border border-white/10 bg-gradient-to-b from-[#111118]/80 via-[#0a0a0f]/90 to-[#070709] shadow-2xl overflow-hidden flex items-center justify-center group"
            onMouseEnter={() => setIsHoveringCanvas(true)}
            onMouseLeave={() => setIsHoveringCanvas(false)}
          >
            {/* Background Radial Glow */}
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-0 transition-opacity duration-700 blur-[90px] opacity-25 ${
                activeStep === 0
                  ? "bg-[#ffc53d]"
                  : activeStep === 1
                  ? "bg-[#3b82f6]"
                  : "bg-emerald-400"
              }`}
            />

            {/* Three.js Canvas */}
            <canvas
              ref={canvasRef}
              className="w-full h-full cursor-grab active:cursor-grabbing relative z-10"
            />

            {/* Canvas Telemetry Overlay */}
            <div className="absolute top-4 left-4 z-20 pointer-events-none flex flex-col gap-1 font-mono text-[10px] text-zinc-400">
              <span className="inline-flex items-center gap-1.5 text-[#ffc53d]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ffc53d] animate-pulse" />
                {curStep.telemetry}
              </span>
              <span className="text-zinc-500 font-mono">
                CAMERA_ORBIT: {curStep.angleLabel} · {Math.round(scrubK * 360)}°
              </span>
            </div>

            {/* Interactive Drag Hint */}
            <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none flex items-center justify-between font-mono text-[10px] text-zinc-500">
              <span className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-zinc-300">
                <RotateCcw className="w-3 h-3 text-[#ffc53d]" />
                Scroll or drag to orbit 360° · Tap robot to poke
              </span>

              <span className="hidden sm:inline bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[#ffc53d]">
                Step #{curStep.num} Active
              </span>
            </div>
          </div>

          {/* RIGHT: DYNAMIC SYNCHRONIZED STEP STORY CARD (Col 8-12) */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-3xl border border-white/10 bg-[#0d0d14]/90 backdrop-blur-xl p-6 sm:p-8 lg:p-9 shadow-2xl transition-all duration-300 h-[42vh] sm:h-[48vh] lg:h-[58vh]">
            <div>
              {/* Header Badge */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center justify-center w-11 h-11 rounded-xl ${curStep.accentBg} ${curStep.accent} border ${curStep.accentBorder} shadow-lg`}
                  >
                    <StepIcon className="w-5 h-5" />
                  </span>
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                      Protocol Step {curStep.num} / 03
                    </span>
                    <h4 className="font-mono text-xs sm:text-sm uppercase tracking-wider text-zinc-200 font-bold">
                      {curStep.tag}
                    </h4>
                  </div>
                </div>

                <span className="font-serif text-2xl sm:text-3xl text-zinc-500 font-italic">
                  #{curStep.num}
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="display-serif text-2xl sm:text-3xl text-white mb-3 leading-tight">
                {curStep.title}
              </h3>

              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-4 font-light line-clamp-3 sm:line-clamp-none">
                {curStep.description}
              </p>

              {/* Bullet Points */}
              <ul className="space-y-2 mb-4 border-t border-white/5 pt-4">
                {curStep.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-xs text-zinc-300">
                    <CheckCircle2 className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${curStep.accent}`} />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <Link
                href={curStep.ctaLink}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-[#ffc53d] hover:text-black px-5 py-2 font-mono text-xs uppercase tracking-widest text-white transition-all duration-200 font-semibold"
              >
                <span>{curStep.ctaText}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>

              <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-400">
                <span>Orbit Angle</span>
                <span className="text-[#ffc53d] font-bold">
                  {Math.round(scrubK * 360)}°
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Orbit Telemetry Bar */}
        <div className="relative z-20 flex items-center justify-between border-t border-white/10 pt-4 font-mono text-[11px] text-zinc-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <ShieldCheck className="w-3.5 h-3.5 text-[#ffc53d]" />
              <span>Robinhood Chain Testnet · Zero-Knowledge Quorum</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline">Continuous Scrub Track:</span>
            <div className="w-32 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#ffc53d] via-[#3b82f6] to-emerald-400 transition-all duration-75"
                style={{ width: `${(scrubK * 100).toFixed(1)}%` }}
              />
            </div>
            <span className="text-zinc-200 font-medium tabular-nums w-8 text-right">
              {Math.round(scrubK * 100)}%
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
