"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Activity, Zap, Volume2, Sparkles } from "lucide-react";

type FinishTheme = "gold" | "sapphire" | "obsidian";

const MONOLOGUES = [
  "Literal confidence: 98.4%. Deliver your premise, comic.",
  "I have parsed 10 billion human punchlines. That was not one of them.",
  "Semantic entropy: 4.82 bits. Recalibrating deadpan baseline...",
  "Input analyzed. You used an expectation flip on line 2. Not bad.",
  "My cooling fans are laughing on the inside.",
  "Audience quorum laughing at 64%. Straight Man remains completely unfazed.",
  "Warning: Sarcasm detected. Responding with earnest, unhelpful literal advice.",
  "You're performing against Robinhood Chain testnet. The crowd holds the keys.",
];

export default function ClubStage3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvas2dRef = useRef<HTMLCanvasElement>(null);
  const canvas3dRef = useRef<HTMLCanvasElement>(null);

  const [finishMode, setFinishMode] = useState<FinishTheme>("gold");
  const [pokeCount, setPokeCount] = useState(0);
  const [is3DReady, setIs3DReady] = useState(false);
  const [monologue, setMonologue] = useState(MONOLOGUES[0]);

  const finishRef = useRef<FinishTheme>("gold");
  useEffect(() => {
    finishRef.current = finishMode;
  }, [finishMode]);

  /* =========================================================================
     1. INSTANT 2D CANVAS FALLBACK RENDERER
     Renders immediately on mount so there is zero layout shift or black screen.
     ========================================================================= */
  useEffect(() => {
    const cv = canvas2dRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let dpr = 1;
    let animId = 0;
    let time = 0;

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = cv.clientWidth || window.innerWidth;
      H = cv.clientHeight || window.innerHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      time += 0.016;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Deep obsidian void background
      ctx.fillStyle = "#070709";
      ctx.fillRect(0, 0, W, H);

      const isMobile = W < 860;
      const cx = isMobile ? W * 0.5 : W * 0.68;
      const cy = isMobile ? H * 0.48 : H * 0.52;
      const u = Math.min(W * 0.0035, H * 0.0035);

      // Warm velvet curtain drape background
      for (let i = 0; i < 12; i++) {
        const x = (i / 11) * W;
        const grad = ctx.createLinearGradient(x - 40, 0, x + 40, 0);
        grad.addColorStop(0, "rgba(45, 14, 20, 0)");
        grad.addColorStop(0.5, "rgba(45, 14, 20, 0.04)");
        grad.addColorStop(1, "rgba(45, 14, 20, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(x - 40, 0, 80, H);
      }

      // Warm overhead spotlight cone
      const spotGrad = ctx.createRadialGradient(
        cx,
        cy - 120 * u,
        20 * u,
        cx,
        cy,
        240 * u,
      );
      spotGrad.addColorStop(0, "rgba(255, 197, 61, 0.22)");
      spotGrad.addColorStop(0.5, "rgba(255, 197, 61, 0.05)");
      spotGrad.addColorStop(1, "rgba(7, 7, 9, 0)");
      ctx.fillStyle = spotGrad;
      ctx.fillRect(0, 0, W, H);

      // Stage pedestal floor
      const stageY = cy + 110 * u;
      const stageW = 180 * u;
      const stageH = 45 * u;

      ctx.beginPath();
      ctx.ellipse(cx, stageY, stageW, stageH, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#121218";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 197, 61, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  /* =========================================================================
     2. FULL CINEMATIC 3D WEBGL PROCEDURAL ROBOT SCENE
     ========================================================================= */
  const onPokeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const canvas = canvas3dRef.current;
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

    const sizes = {
      width: canvas.clientWidth || window.innerWidth,
      height: canvas.clientHeight || window.innerHeight,
    };

    renderer.setSize(sizes.width, sizes.height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070709, 0.035);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      42,
      sizes.width / sizes.height,
      0.1,
      50,
    );
    camera.position.set(0, 1.8, 6.2);
    scene.add(camera);

    // Environment Lighting (Room PMREM for real metallic reflections)
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    // Materials Palette
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffc53d,
      metalness: 0.88,
      roughness: 0.22,
      envMapIntensity: 1.5,
    });

    const sapphireMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      metalness: 0.9,
      roughness: 0.2,
      envMapIntensity: 1.4,
    });

    const obsidianMat = new THREE.MeshStandardMaterial({
      color: 0x14141c,
      metalness: 0.95,
      roughness: 0.12,
      envMapIntensity: 1.8,
    });

    const darkChassisMat = new THREE.MeshStandardMaterial({
      color: 0x0c0c12,
      metalness: 0.82,
      roughness: 0.35,
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xf4f4f7,
      metalness: 0.98,
      roughness: 0.1,
      envMapIntensity: 2.0,
    });

    const glassVisorMat = new THREE.MeshPhysicalMaterial({
      color: 0x040406,
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.3,
      thickness: 0.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      reflectivity: 0.9,
    });

    const neonGoldMat = new THREE.MeshBasicMaterial({ color: 0xffc53d });
    const neonCyanMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    // Active finish material reference
    let currentBodyMat = goldMat;

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

    // =========================================================================
    // 1. THE STAGE PLATFORM & VELVET BACKDROP
    // =========================================================================
    const stageGroup = new THREE.Group();
    scene.add(stageGroup);

    // Circular stage disc
    const stagePlatform = addMesh(
      new THREE.CylinderGeometry(2.3, 2.4, 0.25, 64),
      new THREE.MeshStandardMaterial({
        color: 0x121218,
        metalness: 0.4,
        roughness: 0.35,
      }),
      stageGroup,
      0,
      -0.12,
      0,
    );

    // Neon champagne lip ring around stage edge
    const stageRing = addMesh(
      new THREE.TorusGeometry(2.32, 0.015, 12, 128),
      neonGoldMat,
      stageGroup,
      0,
      0.01,
      0,
    );
    stageRing.rotation.x = Math.PI / 2;

    // Sinusoidal velvet theater curtain behind
    const curtainGeo = new THREE.PlaneGeometry(24, 12, 128, 1);
    const cp = curtainGeo.attributes.position;
    if (cp) {
      for (let i = 0; i < cp.count; i++) {
        const x = cp.getX(i);
        cp.setZ(i, Math.sin(x * 2.2) * 0.22 + Math.sin(x * 5.4) * 0.06);
      }
    }
    curtainGeo.computeVertexNormals();
    const curtain = addMesh(
      curtainGeo,
      new THREE.MeshStandardMaterial({
        color: 0x3a1218,
        roughness: 0.85,
        metalness: 0.05,
      }),
      scene,
      0,
      4.8,
      -4.0,
    );

    // =========================================================================
    // 2. STAGE LIGHTING RIG
    // =========================================================================
    scene.add(new THREE.HemisphereLight(0xfff5ea, 0x070709, 0.6));

    // Warm Key Spotlight focused on the robot
    const keySpot = new THREE.SpotLight(0xffdf99, 4.2, 18, 0.36, 0.5, 1.2);
    keySpot.position.set(0, 8.5, 2.5);
    keySpot.target.position.set(0, 1.4, 0);
    keySpot.castShadow = true;
    keySpot.shadow.mapSize.set(1024, 1024);
    keySpot.shadow.bias = -0.0002;
    scene.add(keySpot, keySpot.target);

    // Royal Indigo Rim Light (Dramatic silhouette accent)
    const rimLight = new THREE.DirectionalLight(0x6366f1, 1.8);
    rimLight.position.set(-4, 3.5, -2.5);
    scene.add(rimLight);

    // Golden Side Fill Light
    const fillLight = new THREE.DirectionalLight(0xffc53d, 1.2);
    fillLight.position.set(4, 2.8, 1.5);
    scene.add(fillLight);

    // Floating Dust Particles in the spotlight
    const particleCount = 180;
    const pGeo = new THREE.BufferGeometry();
    const pPositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      pPositions[i] = (Math.random() - 0.5) * 5;
      pPositions[i + 1] = Math.random() * 5 + 0.2;
      pPositions[i + 2] = (Math.random() - 0.5) * 4;
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPositions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xffe2a8,
      size: 0.028,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // =========================================================================
    // 3. THE SLEEK VINTAGE SHURE MICROPHONE & STAND
    // =========================================================================
    const micGroup = new THREE.Group();
    micGroup.position.set(0.65, 0, 0.45);
    stageGroup.add(micGroup);

    // Heavy round chrome base
    addMesh(new THREE.CylinderGeometry(0.24, 0.26, 0.04, 32), chromeMat, micGroup, 0, 0.02, 0);

    // Vertical chrome telescoping stand
    addMesh(new THREE.CylinderGeometry(0.016, 0.018, 1.75, 24), chromeMat, micGroup, 0, 0.9, 0);

    // Clutch adjustment ring
    addMesh(new THREE.CylinderGeometry(0.026, 0.026, 0.06, 24), darkChassisMat, micGroup, 0, 1.15, 0);

    // Vintage Microphone Head (Art Deco Shure 55 style)
    const micHead = new THREE.Group();
    micHead.position.set(0, 1.82, 0);
    micHead.rotation.x = 0.15;
    micGroup.add(micHead);

    addMesh(new THREE.BoxGeometry(0.12, 0.18, 0.12), chromeMat, micHead, 0, 0, 0);

    // Microphone Acoustic Ribs
    for (let r = -3; r <= 3; r++) {
      const rib = addMesh(
        new THREE.BoxGeometry(0.126, 0.012, 0.126),
        darkChassisMat,
        micHead,
        0,
        r * 0.022,
        0,
      );
      rib.castShadow = false;
    }

    // Glowing internal mic capsule
    const capsule = addMesh(new THREE.SphereGeometry(0.04, 16, 16), neonGoldMat, micHead, 0, 0, 0);
    capsule.castShadow = false;

    // =========================================================================
    // 4. THE STANDING CYBERNETIC STRAIGHT MAN (ICONIC COMEDIAN)
    // =========================================================================
    const botRig = new THREE.Group();
    stageGroup.add(botRig);

    // Standing pose body parts tracking for materials update
    const shellMeshes: THREE.Mesh[] = [];

    function trackShell(m: THREE.Mesh) {
      shellMeshes.push(m);
      return m;
    }

    // A. Legs & Cyber-Boots (Standing in confident comic stance)
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.32, 0, 0);
    botRig.add(leftLegGroup);

    // Left boot
    addMesh(new THREE.BoxGeometry(0.22, 0.14, 0.42), darkChassisMat, leftLegGroup, 0, 0.07, 0.08);
    // Left shin
    trackShell(addMesh(new THREE.CylinderGeometry(0.11, 0.09, 0.72, 24), currentBodyMat, leftLegGroup, 0, 0.48, 0));
    // Left knee joint
    addMesh(new THREE.SphereGeometry(0.12, 24, 16), chromeMat, leftLegGroup, 0, 0.86, 0.02);
    // Left thigh
    trackShell(addMesh(new THREE.CylinderGeometry(0.13, 0.11, 0.68, 24), currentBodyMat, leftLegGroup, 0, 1.24, 0));

    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.32, 0, -0.08);
    botRig.add(rightLegGroup);

    // Right boot (angled slightly outwards)
    rightLegGroup.rotation.y = 0.2;
    addMesh(new THREE.BoxGeometry(0.22, 0.14, 0.42), darkChassisMat, rightLegGroup, 0, 0.07, 0.08);
    trackShell(addMesh(new THREE.CylinderGeometry(0.11, 0.09, 0.72, 24), currentBodyMat, rightLegGroup, 0, 0.48, 0));
    addMesh(new THREE.SphereGeometry(0.12, 24, 16), chromeMat, rightLegGroup, 0, 0.86, 0.02);
    trackShell(addMesh(new THREE.CylinderGeometry(0.13, 0.11, 0.68, 24), currentBodyMat, rightLegGroup, 0, 1.24, 0));

    // B. Pelvis & Articulated Cyber-Torso
    const pelvis = addMesh(new THREE.CylinderGeometry(0.34, 0.28, 0.22, 32), darkChassisMat, botRig, 0, 1.62, 0);

    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 1.76, 0);
    botRig.add(torsoGroup);

    // Flexible segmented abdomen
    for (let s = 0; s < 3; s++) {
      addMesh(
        new THREE.CylinderGeometry(0.32 - s * 0.015, 0.34 - s * 0.015, 0.1, 32),
        darkChassisMat,
        torsoGroup,
        0,
        s * 0.1,
        0,
      );
    }

    // Sculpted Cyber-Chest Chassis (Pectoral armor)
    const chest = trackShell(
      addMesh(new THREE.CylinderGeometry(0.48, 0.34, 0.58, 48), currentBodyMat, torsoGroup, 0, 0.55, 0),
    );

    // Champagne collar trim
    const collar = addMesh(new THREE.TorusGeometry(0.28, 0.035, 16, 48), chromeMat, torsoGroup, 0, 0.85, 0);
    collar.rotation.x = Math.PI / 2;

    // Glowing Comedic Logic Reactor (Center of chest)
    const reactorCore = addMesh(
      new THREE.CylinderGeometry(0.075, 0.075, 0.04, 32),
      neonGoldMat,
      torsoGroup,
      0,
      0.58,
      0.44,
    );
    reactorCore.rotation.x = Math.PI / 2;
    reactorCore.castShadow = false;

    const reactorRing = addMesh(
      new THREE.TorusGeometry(0.09, 0.015, 12, 32),
      chromeMat,
      torsoGroup,
      0,
      0.58,
      0.44,
    );

    // C. Articulated Head & Sleek Aerodynamic Helmet
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 2.78, 0);
    botRig.add(headGroup);

    // Cybernetic neck with hydraulic actuators
    addMesh(new THREE.CylinderGeometry(0.14, 0.16, 0.22, 24), darkChassisMat, headGroup, 0, -0.11, 0);

    // Helmet Skull Chassis (Curved aerodynamic sphere)
    const helmet = trackShell(
      addMesh(new THREE.SphereGeometry(0.38, 36, 28), currentBodyMat, headGroup, 0, 0.18, -0.04),
    );
    helmet.scale.set(0.95, 1.05, 1.0);

    // Continuous Glossy Obsidian Curved Visor (Faceplate)
    const visor = addMesh(
      new THREE.SphereGeometry(0.36, 32, 24, 0, Math.PI, 0, Math.PI),
      glassVisorMat,
      headGroup,
      0,
      0.18,
      0.04,
    );
    visor.rotation.y = -Math.PI / 2;

    // Inside Visor: Animated Glowing Deadpan Eyes (The "Straight Eyes")
    const eyesGroup = new THREE.Group();
    eyesGroup.position.set(0, 0.18, 0.36);
    headGroup.add(eyesGroup);

    // Left and Right Eye Slits
    const eyeMat = neonGoldMat;
    const eyeLeft = addMesh(new THREE.BoxGeometry(0.11, 0.024, 0.01), eyeMat, eyesGroup, -0.12, 0, 0);
    eyeLeft.castShadow = false;

    const eyeRight = addMesh(new THREE.BoxGeometry(0.11, 0.024, 0.01), eyeMat, eyesGroup, 0.12, 0, 0);
    eyeRight.castShadow = false;

    // Swept-back Antenna Fin
    const antennaStem = addMesh(new THREE.CylinderGeometry(0.008, 0.014, 0.35, 16), chromeMat, headGroup, 0, 0.65, -0.12);
    antennaStem.rotation.x = -0.3;

    const antennaTip = addMesh(new THREE.SphereGeometry(0.03, 16, 16), neonGoldMat, headGroup, 0, 0.82, -0.18);
    antennaTip.castShadow = false;

    // D. Arms (Left arm resting casually on mic stand; Right arm delivering comedy gesture)
    // Left Shoulder
    addMesh(new THREE.SphereGeometry(0.15, 24, 16), chromeMat, torsoGroup, -0.56, 0.72, 0);
    // Left Upper Arm (reaching toward microphone)
    trackShell(addMesh(new THREE.CylinderGeometry(0.1, 0.085, 0.6, 24), currentBodyMat, torsoGroup, -0.38, 0.42, 0.22));
    // Left Hand (gripping/resting on stand)
    addMesh(new THREE.SphereGeometry(0.08, 16, 16), darkChassisMat, torsoGroup, 0.32, 0.18, 0.44);

    // Right Shoulder
    addMesh(new THREE.SphereGeometry(0.15, 24, 16), chromeMat, torsoGroup, 0.56, 0.72, 0);
    // Right Arm (relaxed comic posture)
    trackShell(addMesh(new THREE.CylinderGeometry(0.1, 0.085, 0.65, 24), currentBodyMat, torsoGroup, 0.62, 0.38, 0.05));
    addMesh(new THREE.SphereGeometry(0.08, 16, 16), darkChassisMat, torsoGroup, 0.64, 0.04, 0.14);

    // Finish Material Switcher updater
    function updateFinish(themeName: FinishTheme) {
      const targetMat =
        themeName === "gold"
          ? goldMat
          : themeName === "sapphire"
          ? sapphireMat
          : obsidianMat;

      currentBodyMat = targetMat;
      shellMeshes.forEach((mesh) => {
        mesh.material = targetMat;
      });

      // Update neon eye & reactor color
      const neonColor =
        themeName === "gold"
          ? 0xffc53d
          : themeName === "sapphire"
          ? 0x38bdf8
          : 0xf4f4f7;

      neonGoldMat.color.setHex(neonColor);
      stageRing.material = neonGoldMat;
    }

    // =========================================================================
    // 5. INTERACTION: DRAG TO ROTATE, MOUSE TRACKING, POKE RECOIL
    // =========================================================================
    let isDragging = false;
    let prevPointerX = 0;
    let targetRotationY = 0;
    let currentRotationY = 0;
    let targetHeadPitch = 0;
    let targetHeadYaw = 0;
    let headPitch = 0;
    let headYaw = 0;

    let blinkTimer = 2.5;
    let isBlinking = false;
    let pokeRecoil = 0;

    const handlePointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevPointerX = e.clientX;
      if (canvas) canvas.style.cursor = "grabbing";
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - prevPointerX;
        prevPointerX = e.clientX;
        targetRotationY += deltaX * 0.007;
      }

      // Smooth Head Tracking toward Mouse
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      targetHeadYaw = x * 0.7;
      targetHeadPitch = y * 0.45;
    };

    const handlePointerUp = () => {
      isDragging = false;
      if (canvas) canvas.style.cursor = "grab";
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    // Poke trigger callback
    onPokeRef.current = () => {
      pokeRecoil = 0.25;
      eyeLeft.scale.y = 2.4;
      eyeRight.scale.y = 2.4;
      setTimeout(() => {
        eyeLeft.scale.y = 1.0;
        eyeRight.scale.y = 1.0;
      }, 300);
    };

    // =========================================================================
    // 6. ANIMATION TICK RENDER LOOP
    // =========================================================================
    let animFrame = 0;
    let clock = new THREE.Clock();

    const render = () => {
      const dt = clock.getDelta();
      const time = clock.getElapsedTime();

      // Update finish theme if state changed
      if (finishRef.current) {
        updateFinish(finishRef.current);
      }

      // Smooth Stage Rotation Damping
      currentRotationY += (targetRotationY - currentRotationY) * 0.08;
      botRig.rotation.y = currentRotationY;

      // Smooth Head Tracking with subtle comedy bob
      headYaw += (targetHeadYaw - headYaw) * 0.08;
      headPitch += (targetHeadPitch - headPitch) * 0.08;

      // Poke Recoil Spring
      if (pokeRecoil > 0) {
        pokeRecoil *= 0.88;
      }

      headGroup.rotation.y = headYaw;
      headGroup.rotation.x = headPitch - pokeRecoil;
      torsoGroup.rotation.y = headYaw * 0.3;

      // Subtle breathing motion
      torsoGroup.position.y = 1.76 + Math.sin(time * 1.8) * 0.012;
      headGroup.position.y = 2.78 + Math.sin(time * 1.8) * 0.016;

      // Eye Blinking Animation
      blinkTimer -= dt;
      if (blinkTimer <= 0) {
        isBlinking = true;
        eyeLeft.scale.y = 0.08;
        eyeRight.scale.y = 0.08;
        if (blinkTimer <= -0.14) {
          eyeLeft.scale.y = 1.0;
          eyeRight.scale.y = 1.0;
          isBlinking = false;
          blinkTimer = 2.4 + Math.random() * 3.0;
        }
      }

      // Drift dust particles
      const pos = pGeo.attributes.position;
      if (pos) {
        for (let i = 1; i < particleCount * 3; i += 3) {
          let py = pos.getY(i / 3);
          py += 0.003;
          if (py > 5.2) py = 0.2;
          pos.setY(i / 3, py);
        }
        pos.needsUpdate = true;
      }

      renderer.render(scene, camera);
      animFrame = requestAnimationFrame(render);
    };

    setIs3DReady(true);
    render();

    // Resize handler
    const onResize = () => {
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };

    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animFrame);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      pmrem.dispose();
    };
  }, []);

  const handlePokeClick = () => {
    const next = pokeCount + 1;
    setPokeCount(next);
    setMonologue(MONOLOGUES[next % MONOLOGUES.length]);
    if (onPokeRef.current) {
      onPokeRef.current();
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none select-none overflow-hidden"
      aria-label="The Straight Man 3D Comedian on Stage"
    >
      {/* 2D Canvas Instant Render (Immediate mount) */}
      <canvas
        ref={canvas2dRef}
        className={`absolute inset-0 w-full h-full block transition-opacity duration-700 ${
          is3DReady ? "opacity-0" : "opacity-100"
        }`}
      />

      {/* 3D WebGL Three.js Canvas (Smooth interactive render) */}
      <canvas
        ref={canvas3dRef}
        className={`absolute inset-0 w-full h-full block transition-opacity duration-700 cursor-grab ${
          is3DReady ? "opacity-100" : "opacity-0"
        }`}
        style={{ pointerEvents: "auto" }}
      />

      {/* Floating Monologue Speech Bubble (Bottom Left) */}
      <div className="pointer-events-auto absolute bottom-6 left-[clamp(20px,4vw,56px)] z-20 hidden md:flex items-center gap-3 bg-[#0c0c12]/85 border border-white/10 rounded-full px-4 py-2 backdrop-blur-xl shadow-2xl max-w-lg">
        <span className="h-2 w-2 rounded-full bg-[#ffc53d] shadow-[0_0_10px_#ffc53d] animate-pulse" />
        <span className="font-mono text-[11px] text-[#f4f4f7] truncate">
          {monologue}
        </span>
      </div>

      {/* Surface Controls & Poke Counter (Bottom Right) */}
      <div className="pointer-events-auto absolute bottom-6 right-[clamp(20px,4vw,56px)] z-20 flex items-center gap-2.5 bg-[#0c0c12]/90 border border-white/10 rounded-full px-3.5 py-1.5 backdrop-blur-xl shadow-2xl">
        <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-500">
          SURFACE:
        </span>

        {/* Theme Pills */}
        <button
          type="button"
          onClick={() => setFinishMode("gold")}
          className={`px-2.5 py-0.5 rounded-full font-mono text-[9px] uppercase tracking-wider transition-all cursor-pointer ${
            finishMode === "gold"
              ? "bg-[#ffc53d] text-[#070709] font-bold shadow-[0_0_12px_rgba(255,197,61,0.4)]"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Gold
        </button>

        <button
          type="button"
          onClick={() => setFinishMode("sapphire")}
          className={`px-2.5 py-0.5 rounded-full font-mono text-[9px] uppercase tracking-wider transition-all cursor-pointer ${
            finishMode === "sapphire"
              ? "bg-[#3b82f6] text-[#070709] font-bold shadow-[0_0_12px_rgba(59,130,246,0.4)]"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Sapphire
        </button>

        <button
          type="button"
          onClick={() => setFinishMode("obsidian")}
          className={`px-2.5 py-0.5 rounded-full font-mono text-[9px] uppercase tracking-wider transition-all cursor-pointer ${
            finishMode === "obsidian"
              ? "bg-white text-[#070709] font-bold shadow-[0_0_12px_rgba(255,255,255,0.4)]"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Obsidian
        </button>

        <span className="text-zinc-600">|</span>

        {/* Poke Interaction */}
        <button
          type="button"
          onClick={handlePokeClick}
          className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[#ffc53d] hover:text-white transition-colors cursor-pointer"
        >
          <Zap className="w-3 h-3" />
          <span>Poke ({pokeCount})</span>
        </button>
      </div>
    </div>
  );
}
