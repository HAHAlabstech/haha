"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

type FinishTheme = "bronze" | "sapphire" | "obsidian";

export default function ClubStage3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvas2dRef = useRef<HTMLCanvasElement>(null);
  const canvas3dRef = useRef<HTMLCanvasElement>(null);

  const [finishMode, setFinishMode] = useState<FinishTheme>("bronze");
  const [pokeCount, setPokeCount] = useState(0);
  const [is3DReady, setIs3DReady] = useState(false);
  const [lastReaction, setLastReaction] = useState<string>(
    "Straight Man active. Literal confidence: 98.4%.",
  );

  const finishRef = useRef<FinishTheme>("bronze");
  useEffect(() => {
    finishRef.current = finishMode;
  }, [finishMode]);

  /* =========================================================================
     1. INSTANT HIGH-RES 2D CANVAS RENDERER
     Renders immediately on mount so there is zero layout shift and zero delay.
     ========================================================================= */
  useEffect(() => {
    const cv = canvas2dRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let dpr = 1;
    let raf2d = 0;
    let running2d = true;

    const S = {
      tilt: 0,
      tiltT: 0,
      ex: 0,
      ey: 0,
      exT: 0,
      eyT: 0,
      squash: 0,
      squashT: 0,
      heat: 0.2,
      heatT: 0.2,
      blink: 0,
      nextBlink: 2.2,
      pulses: [] as { k: number }[],
      q: 0,
      smile: 0,
      taps: 0,
      drag: null as { x: number } | null,
      spin: 0,
      spinV: 0,
    };

    const sizeStage = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = cv.clientWidth || window.innerWidth;
      H = cv.clientHeight || window.innerHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
    };

    const geo = () => {
      const mobile = W < 860;
      const cx = mobile ? W * 0.5 : W * 0.68;
      const cy = mobile ? H * 0.36 : H * 0.44;
      const u = Math.min(
        mobile ? W * 0.0042 : W * 0.0034,
        H * (mobile ? 0.0024 : 0.0034),
      );
      return { cx, cy, u };
    };

    const rr = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x, y, w, h, r);
      } else {
        ctx.rect(x, y, w, h);
      }
    };

    const draw = (t: number) => {
      const { cx, cy, u } = geo();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Deep void background
      ctx.fillStyle = "#060606";
      ctx.fillRect(0, 0, W, H);

      // Curtain folds with subtle Laocoon sapphire & burgundy undertone
      for (let i = 0; i < 14; i++) {
        const x = (i / 13) * W;
        const a = 0.035 + (i % 2) * 0.025;
        const g = ctx.createLinearGradient(x - 45, 0, x + 45, 0);
        g.addColorStop(0, "rgba(80, 24, 32, 0)");
        g.addColorStop(0.5, `rgba(80, 24, 32, ${a})`);
        g.addColorStop(1, "rgba(80, 24, 32, 0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - 45, 0, 90, H);
      }

      // Spotlight cone
      const floorY = cy + 110 * u;
      const heat = 0.26 + S.heat * 0.18;
      const cg = ctx.createLinearGradient(0, 0, 0, floorY);
      cg.addColorStop(0, `rgba(255, 177, 59, ${heat})`);
      cg.addColorStop(1, `rgba(255, 177, 59, ${heat * 0.18})`);
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.moveTo(cx - 28 * u, -10);
      ctx.lineTo(cx + 28 * u, -10);
      ctx.lineTo(cx + 155 * u, floorY);
      ctx.lineTo(cx - 155 * u, floorY);
      ctx.closePath();
      ctx.fill();

      // Floor reflection pool
      const fg = ctx.createRadialGradient(cx, floorY, 0, cx, floorY, 175 * u);
      fg.addColorStop(0, `rgba(255, 177, 59, ${0.32 + S.heat * 0.14})`);
      fg.addColorStop(1, "rgba(255, 177, 59, 0)");
      ctx.save();
      ctx.translate(cx, floorY);
      ctx.scale(1, 0.14);
      ctx.translate(-cx, -floorY);
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(cx, floorY, 175 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Drifting molten dust sparks
      ctx.fillStyle = "rgba(255, 214, 150, 0.65)";
      for (let i = 0; i < 28; i++) {
        const s = (i * 97.13) % 1;
        const yy = (i * 53.7 + t * 0.008 * (1 + s)) % floorY;
        const spread = 28 * u + (155 - 28) * u * (yy / floorY);
        const xx =
          cx +
          (((i * 37.9) % 2) - 1) * spread * 0.9 +
          Math.sin(t * 0.0006 + i) * 6;
        ctx.globalAlpha = 0.18 + (0.35 * ((i * 13) % 7)) / 7;
        ctx.beginPath();
        ctx.arc(xx, yy, 0.9 + s * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Microphone stand
      const mx = cx - 92 * u;
      ctx.strokeStyle = "rgba(239, 232, 220, 0.65)";
      ctx.lineWidth = 2.5 * u;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(mx, floorY);
      ctx.lineTo(mx, cy - 6 * u);
      ctx.lineTo(mx + 26 * u, cy - 22 * u);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mx - 22 * u, floorY);
      ctx.lineTo(mx + 22 * u, floorY);
      ctx.stroke();

      // Mic head
      ctx.fillStyle = "#120f0c";
      ctx.strokeStyle = "#ffb13b";
      ctx.lineWidth = 2 * u;
      ctx.beginPath();
      ctx.ellipse(mx + 32 * u, cy - 26 * u, 9.5 * u, 7.5 * u, -0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Stool legs & frame
      ctx.strokeStyle = "rgba(239, 232, 220, 0.45)";
      ctx.lineWidth = 2 * u;
      ctx.beginPath();
      ctx.moveTo(cx - 30 * u, floorY);
      ctx.lineTo(cx - 20 * u, cy + 70 * u);
      ctx.moveTo(cx + 30 * u, floorY);
      ctx.lineTo(cx + 20 * u, cy + 70 * u);
      ctx.moveTo(cx - 24 * u, cy + 92 * u);
      ctx.lineTo(cx + 24 * u, cy + 92 * u);
      ctx.stroke();

      // Robot torso
      const bg = ctx.createLinearGradient(cx - 45 * u, 0, cx + 45 * u, 0);
      bg.addColorStop(0, "#3a2d21");
      bg.addColorStop(0.55, "#221a14");
      bg.addColorStop(1, "#120e0b");
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.moveTo(cx - 34 * u, cy + 30 * u);
      ctx.lineTo(cx + 34 * u, cy + 30 * u);
      ctx.lineTo(cx + 46 * u, cy + 74 * u);
      ctx.lineTo(cx - 46 * u, cy + 74 * u);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 177, 59, 0.4)";
      ctx.lineWidth = 1.2 * u;
      ctx.beginPath();
      ctx.moveTo(cx - 34 * u, cy + 30 * u);
      ctx.lineTo(cx + 34 * u, cy + 30 * u);
      ctx.stroke();

      // Neck
      ctx.fillStyle = "#1a1511";
      ctx.fillRect(cx - 8 * u, cy + 14 * u, 16 * u, 18 * u);

      // Beveled Head
      ctx.save();
      ctx.translate(cx, cy + 22 * u);
      ctx.rotate(S.tilt + S.spin);
      ctx.translate(-cx, -(cy + 22 * u));

      const hw = 114 * u * (1 + S.squash * 0.08);
      const hh = 82 * u * (1 - S.squash * 0.16);
      const hx = cx - hw / 2;
      const hy = cy + 16 * u - hh;

      const hg = ctx.createLinearGradient(hx, hy, hx + hw, hy + hh);
      hg.addColorStop(0, "#4a3b2b");
      hg.addColorStop(0.48, "#281f18");
      hg.addColorStop(1, "#120e0b");
      ctx.fillStyle = hg;
      rr(hx, hy, hw, hh, 22 * u);
      ctx.fill();

      // Golden bevel highlight rim
      ctx.strokeStyle = `rgba(255, 177, 59, ${0.55 + S.heat * 0.35})`;
      ctx.lineWidth = 2 * u;
      ctx.beginPath();
      ctx.moveTo(hx + 10 * u, hy + hh * 0.55);
      ctx.quadraticCurveTo(hx + 2 * u, hy + 2 * u, hx + hw * 0.55, hy + 1 * u);
      ctx.stroke();

      // Antenna
      ctx.strokeStyle = "rgba(239, 232, 220, 0.55)";
      ctx.lineWidth = 2 * u;
      ctx.beginPath();
      ctx.moveTo(cx, hy);
      ctx.lineTo(cx, hy - 20 * u);
      ctx.stroke();

      ctx.fillStyle = `rgba(255, 177, 59, ${0.65 + S.heat * 0.35})`;
      ctx.shadowColor = "#ffb13b";
      ctx.shadowBlur = (8 + S.heat * 18) * u;
      ctx.beginPath();
      ctx.arc(cx, hy - 23 * u, 4.8 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Glossy Face Screen
      const fx = hx + 13 * u;
      const fy = hy + 12 * u;
      const fw = hw - 26 * u;
      const fh = hh - 24 * u;
      ctx.fillStyle = "#080706";
      rr(fx, fy, fw, fh, 14 * u);
      ctx.fill();

      // Glowing oval eyes that blink & track pointer
      const fcx = cx + S.ex * 7 * u;
      const fcy = fy + fh / 2 + S.ey * 4 * u;
      ctx.fillStyle = "#efe8dc";
      const eh = 7 * u * (1 - S.blink);
      [-1, 1].forEach((sg) => {
        ctx.beginPath();
        ctx.ellipse(
          fcx + sg * 22 * u,
          fcy - 7 * u,
          6 * u,
          Math.max(0.6, eh),
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      });

      // Expressive mouth (flat, with subtle smirk on tap)
      ctx.strokeStyle = "#efe8dc";
      ctx.lineWidth = 2.4 * u;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(fcx - 16 * u, fcy + 13 * u);
      ctx.quadraticCurveTo(
        fcx + 4 * u,
        fcy + 13 * u + S.smile * 3.2 * u,
        fcx + 16 * u,
        fcy + 13 * u - S.smile * 1.6 * u,
      );
      ctx.stroke();
      ctx.restore();

      // Expanding ripple rings on tap
      S.pulses.forEach((p) => {
        ctx.strokeStyle = `rgba(255, 177, 59, ${(1 - p.k) * 0.75})`;
        ctx.lineWidth = 2 * u;
        ctx.beginPath();
        ctx.arc(cx, cy - 20 * u, (50 + p.k * 125) * u, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Floating '?' Question Mark
      if (S.q > 0.01) {
        ctx.globalAlpha = S.q;
        ctx.fillStyle = "#ffb13b";
        ctx.font = `300 ${46 * u}px Fraunces, Georgia, serif`;
        ctx.textAlign = "center";
        ctx.fillText("?", cx + 64 * u, cy - 70 * u - (1 - S.q) * 16 * u);
        ctx.globalAlpha = 1;
      }
    };

    let last2d = performance.now();
    const loop2d = (t: number) => {
      if (!running2d) return;
      const dt = Math.min(50, t - (last2d || t)) / 1000;
      last2d = t;
      const k = 1 - Math.pow(0.001, dt);

      S.tilt += (S.tiltT - S.tilt) * k * 0.9;
      S.ex += (S.exT - S.ex) * k;
      S.ey += (S.eyT - S.ey) * k;
      S.squash += (S.squashT - S.squash) * k * 1.6;
      S.heat += (S.heatT - S.heat) * k * 0.6;

      if (!S.drag) {
        S.spin += S.spinV * dt;
        S.spinV *= Math.pow(0.05, dt);
        S.spin += (0 - S.spin) * k * 0.35;
      }

      S.nextBlink -= dt;
      if (S.nextBlink < 0) {
        S.blink = 1;
        S.nextBlink = 2.4 + Math.random() * 3.2;
      }
      S.blink = Math.max(0, S.blink - dt * 7);
      S.q = Math.max(0, S.q - dt * 0.8);
      S.smile = Math.max(0, S.smile - dt * 0.9);

      S.pulses.forEach((p) => (p.k += dt * 1.1));
      S.pulses = S.pulses.filter((p) => p.k < 1);

      draw(t);
      raf2d = requestAnimationFrame(loop2d);
    };

    sizeStage();
    raf2d = requestAnimationFrame(loop2d);
    window.addEventListener("resize", sizeStage);

    return () => {
      running2d = false;
      cancelAnimationFrame(raf2d);
      window.removeEventListener("resize", sizeStage);
    };
  }, []);

  /* =========================================================================
     2. HIGH-END 3D THREE.JS RENDERER WITH LAOCOON SHADERS & BEVELED GEOMETRY
     ========================================================================= */
  useEffect(() => {
    const c3 = canvas3dRef.current;
    if (!c3) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: c3,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x060606, 11, 25);
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
    const lookTarget = new THREE.Vector3(0, 2.05, 0);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    /* Rounded shape generator for true beveled extruded solids */
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

    /* Materials */
    const shellMat = new THREE.MeshPhysicalMaterial({
      color: 0xd8cdbb,
      metalness: 0.1,
      roughness: 0.28,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      reflectivity: 0.8,
      envMapIntensity: 1.25,
    });

    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x1e1914,
      metalness: 0.65,
      roughness: 0.38,
      envMapIntensity: 0.9,
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xc4b7a4,
      metalness: 0.98,
      roughness: 0.18,
      envMapIntensity: 1.6,
    });

    const screenMat = new THREE.MeshPhysicalMaterial({
      color: 0x030304,
      metalness: 0.02,
      roughness: 0.04,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
    });

    const glowMat = new THREE.MeshBasicMaterial({ color: 0xfff3de });
    const amberBasic = new THREE.MeshBasicMaterial({ color: 0xffb13b });

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

    const UP = new THREE.Vector3(0, 1, 0);
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
      const len = d.length();
      const m = addMesh(new THREE.CylinderGeometry(r, r, len, 24), mat, parent);
      m.position.copy(A).add(B).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(UP, d.normalize());
      return m;
    }

    /* Stage Floor with glowing lip ring */
    const floor = addMesh(
      new THREE.CircleGeometry(30, 64),
      new THREE.MeshStandardMaterial({
        color: 0x0c0a08,
        roughness: 0.72,
        metalness: 0.12,
      }),
      scene,
    );
    floor.rotation.x = -Math.PI / 2;
    floor.castShadow = false;

    const stageMat = new THREE.MeshStandardMaterial({
      color: 0x221a14,
      roughness: 0.42,
      metalness: 0.18,
    });
    const stage = addMesh(
      new THREE.CylinderGeometry(2.1, 2.2, 0.22, 120),
      stageMat,
      scene,
      0,
      0.11,
      0,
    );
    stage.castShadow = false;

    // Amber neon edge ring
    const lip = new THREE.Mesh(
      new THREE.TorusGeometry(2.11, 0.009, 8, 200),
      amberBasic,
    );
    lip.rotation.x = Math.PI / 2;
    lip.position.y = 0.22;
    scene.add(lip);

    // Sinusoidal Velvet Curtain
    const cg = new THREE.PlaneGeometry(28, 12, 320, 1);
    const cp = cg.attributes.position;
    if (cp) {
      for (let i = 0; i < cp.count; i++) {
        const x = cp.getX(i);
        cp.setZ(
          i,
          Math.sin(x * 2.4) * 0.28 + Math.sin(x * 5.9 + 1.3) * 0.08,
        );
      }
    }
    cg.computeVertexNormals();
    const curtain = new THREE.Mesh(
      cg,
      new THREE.MeshStandardMaterial({
        color: 0x58140e,
        roughness: 0.82,
        metalness: 0.02,
      }),
    );
    curtain.position.set(0, 5.4, -4.3);
    curtain.receiveShadow = true;
    scene.add(curtain);

    /* Stage Lighting Rig */
    scene.add(new THREE.HemisphereLight(0x5a4430, 0x080605, 0.58));
    const keySpot = new THREE.SpotLight(0xfff0dc, 0.6, 20, 0.32, 0.88, 1);
    keySpot.position.set(-2.6, 4.4, 8);
    keySpot.target.position.set(0, 2.4, 0);
    scene.add(keySpot, keySpot.target);

    const SPOT_BASE = 3.6;
    const apex = new THREE.Vector3(0, 9.6, 1.4);
    const aim = new THREE.Vector3(0, 0.2, 0);
    const spot = new THREE.SpotLight(0xffd7a3, SPOT_BASE, 19, 0.35, 0.45, 1.1);
    spot.position.copy(apex);
    spot.target.position.copy(aim);
    spot.castShadow = true;
    spot.shadow.mapSize.set(1024, 1024);
    spot.shadow.bias = -0.0004;
    spot.shadow.radius = 4;
    scene.add(spot, spot.target);

    const wash = new THREE.SpotLight(0xff8a3c, 0.95, 16, 0.55, 0.9, 1.3);
    wash.position.set(0, 6.6, 2.5);
    wash.target.position.set(0, 3.2, -4.2);
    scene.add(wash, wash.target);

    const rim1 = new THREE.DirectionalLight(0xffb13b, 1.2);
    rim1.position.set(-5, 5, -3);
    scene.add(rim1);

    const rim2 = new THREE.DirectionalLight(0x60a5fa, 0.75); // Sapphire rim highlight
    rim2.position.set(5, 3.6, -2.6);
    scene.add(rim2);

    /* Volumetric Light Cone with custom AdditiveBlending GLSL shader */
    const coneLen = apex.distanceTo(aim);
    const coneR = Math.tan(0.36) * coneLen;
    const coneMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xffb04a) },
        uK: { value: 0.55 },
      },
      vertexShader: `
        varying float vY;
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          vY = uv.y;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal);
          vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uK;
        varying float vY;
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          float edge = pow(abs(dot(normalize(vN), normalize(vV))), 2.2);
          float a = edge * (0.14 + 0.86 * vY * vY) * smoothstep(1.0, 0.91, vY);
          gl_FragColor = vec4(uColor * a * uK, 1.0);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(coneR, coneLen, 72, 1, true),
      coneMat,
    );
    const dir = apex.clone().sub(aim).normalize();
    cone.quaternion.setFromUnitVectors(UP, dir);
    cone.position.copy(aim).add(apex).multiplyScalar(0.5);
    scene.add(cone);

    /* 420 Floating Dust Motes in the beam */
    const dotCanvas = document.createElement("canvas");
    dotCanvas.width = dotCanvas.height = 32;
    const dg = dotCanvas.getContext("2d");
    if (dg) {
      const rg = dg.createRadialGradient(16, 16, 0, 16, 16, 16);
      rg.addColorStop(0, "rgba(255,255,255,1)");
      rg.addColorStop(1, "rgba(255,255,255,0)");
      dg.fillStyle = rg;
      dg.fillRect(0, 0, 32, 32);
    }
    const ND = 420;
    const dpos = new Float32Array(ND * 3);
    const dustMotes: {
      t: number;
      a: number;
      r: number;
      s: number;
      w: number;
    }[] = [];
    for (let i = 0; i < ND; i++) {
      dustMotes.push({
        t: Math.random(),
        a: Math.random() * Math.PI * 2,
        r: Math.sqrt(Math.random()),
        s: 0.012 + Math.random() * 0.022,
        w: Math.random() * Math.PI * 2,
      });
    }
    const dGeo = new THREE.BufferGeometry();
    dGeo.setAttribute("position", new THREE.BufferAttribute(dpos, 3));
    const dMat = new THREE.PointsMaterial({
      color: 0xffd59a,
      size: 0.046,
      map: new THREE.CanvasTexture(dotCanvas),
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    scene.add(new THREE.Points(dGeo, dMat));
    const side1 = new THREE.Vector3(1, 0, 0);
    const side2 = new THREE.Vector3().crossVectors(dir, side1).normalize();

    /* ==========================================================
       THE ROBOT RIG (STOOL, TAPERED BODY, BEVELED HEAD, MIC)
       ========================================================== */
    const rig = new THREE.Group();
    rig.position.y = 0.22;
    scene.add(rig);

    // Stool
    addMesh(new THREE.CylinderGeometry(0.52, 0.5, 0.09, 48), darkMat, rig, 0, 1.0, 0);
    addMesh(
      new THREE.CylinderGeometry(0.5, 0.5, 0.02, 48),
      new THREE.MeshStandardMaterial({ color: 0x7a2418, roughness: 0.6 }),
      rig,
      0,
      1.055,
      0,
    );
    for (let i = 0; i < 3; i++) {
      const a = i * 2.094 + 0.5;
      addLimb(
        [Math.cos(a) * 0.36, 0.97, Math.sin(a) * 0.36],
        [Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5],
        0.025,
        chromeMat,
        rig,
      );
    }
    const ring = addMesh(
      new THREE.TorusGeometry(0.43, 0.018, 8, 64),
      chromeMat,
      rig,
      0,
      0.38,
      0,
    );
    ring.rotation.x = Math.PI / 2;

    // Robot Main Group
    const bot = new THREE.Group();
    rig.add(bot);

    // Pelvis & Legs
    addMesh(new THREE.CylinderGeometry(0.4, 0.44, 0.18, 40), darkMat, bot, 0, 1.15, 0);
    [-1, 1].forEach((sg) => {
      addLimb([sg * 0.22, 1.12, 0.02], [sg * 0.28, 1.1, 0.66], 0.12, shellMat, bot);
      addMesh(
        new THREE.SphereGeometry(0.135, 24, 16),
        darkMat,
        bot,
        sg * 0.28,
        1.1,
        0.68,
      );
      addLimb([sg * 0.29, 1.08, 0.7], [sg * 0.31, 0.16, 0.8], 0.095, shellMat, bot);
      addMesh(
        new THREE.BoxGeometry(0.24, 0.11, 0.4),
        darkMat,
        bot,
        sg * 0.31,
        0.07,
        0.9,
      );
    });

    // Sleek Tapered Torso
    const torso = new THREE.Group();
    torso.position.y = 1.2;
    bot.add(torso);

    addMesh(
      new THREE.CylinderGeometry(0.6, 0.45, 1.0, 56),
      shellMat,
      torso,
      0,
      0.5,
      0,
    );
    const collar = addMesh(
      new THREE.TorusGeometry(0.33, 0.055, 12, 48),
      chromeMat,
      torso,
      0,
      1.0,
      0,
    );
    collar.rotation.x = Math.PI / 2;

    // Chest indicator light
    const chestCore = new THREE.MeshBasicMaterial({ color: 0xffb13b });
    const chestLight = addMesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.03, 24),
      chestCore,
      torso,
      0,
      0.62,
      0.565,
    );
    chestLight.rotation.x = Math.PI / 2 - 0.13;
    chestLight.castShadow = false;

    // Arms
    [-1, 1].forEach((sg) => {
      addMesh(
        new THREE.SphereGeometry(0.17, 24, 16),
        shellMat,
        torso,
        sg * 0.64,
        0.88,
        0,
      );
      addLimb(
        [sg * 0.7, 0.85, 0],
        [sg * 0.74, 0.32, 0.28],
        0.085,
        darkMat,
        torso,
      );
      addMesh(
        new THREE.SphereGeometry(0.1, 16, 12),
        chromeMat,
        torso,
        sg * 0.74,
        0.32,
        0.28,
      );
      addLimb(
        [sg * 0.74, 0.32, 0.28],
        [sg * 0.38, -0.02, 0.62],
        0.075,
        darkMat,
        torso,
      );
      addMesh(
        new THREE.SphereGeometry(0.115, 20, 14),
        shellMat,
        torso,
        sg * 0.36,
        -0.04,
        0.64,
      );
    });

    // Neck
    addMesh(new THREE.CylinderGeometry(0.11, 0.13, 0.26, 20), chromeMat, torso, 0, 1.12, 0);

    // Head Pivot & BEVELED Rounded Head Solid
    const headPivot = new THREE.Group();
    headPivot.position.y = 1.22;
    torso.add(headPivot);

    const head = new THREE.Group();
    head.position.y = 0.6;
    headPivot.add(head);

    const hg = new THREE.ExtrudeGeometry(rounded(1.5, 1.06, 0.32), {
      depth: 0.8,
      bevelEnabled: true,
      bevelThickness: 0.09,
      bevelSize: 0.09,
      bevelSegments: 5,
      curveSegments: 16,
    });
    hg.center();
    addMesh(hg, shellMat, head);

    const faceZ = 0.4 + 0.09 + 0.004;
    const face = addMesh(
      new THREE.ShapeGeometry(rounded(1.2, 0.78, 0.24), 16),
      screenMat,
      head,
      0,
      0,
      faceZ,
    );
    face.castShadow = false;

    // Glowing Oval Eyes
    const eyes = new THREE.Group();
    eyes.position.set(0, 0.07, faceZ + 0.01);
    head.add(eyes);
    const eyeGeo = new THREE.SphereGeometry(0.085, 24, 16);
    const eyeL = addMesh(eyeGeo, glowMat, eyes, -0.26, 0, 0);
    const eyeR = addMesh(eyeGeo, glowMat, eyes, 0.26, 0, 0);
    [eyeL, eyeR].forEach((e) => {
      e.scale.set(1, 1.3, 0.3);
      e.castShadow = false;
    });

    // Expressive Deadpan Mouth with Smirk Pivot
    const mouth = new THREE.Group();
    mouth.position.set(0, -0.18, faceZ + 0.01);
    head.add(mouth);
    const mGeo = new THREE.BoxGeometry(0.21, 0.034, 0.02);
    addMesh(mGeo, glowMat, mouth, -0.105, 0, 0).castShadow = false;
    const mouthR = new THREE.Group();
    mouth.add(mouthR);
    addMesh(mGeo, glowMat, mouthR, 0.105, 0, 0).castShadow = false;

    // Acoustic Sensor Ears
    [-1, 1].forEach((sg) => {
      const ear = addMesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.14, 32),
        darkMat,
        head,
        sg * 0.86,
        0,
        0,
      );
      ear.rotation.z = Math.PI / 2;
      const er = new THREE.Mesh(
        new THREE.TorusGeometry(0.15, 0.016, 8, 40),
        amberBasic,
      );
      er.position.set(sg * 0.935, 0, 0);
      er.rotation.y = Math.PI / 2;
      head.add(er);
    });

    // Antenna stem & glowing bulb
    addMesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.4, 10),
      chromeMat,
      head,
      0,
      0.53 + 0.09 + 0.2,
      0,
    );
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffb13b });
    const bulb = addMesh(
      new THREE.SphereGeometry(0.075, 20, 14),
      bulbMat,
      head,
      0,
      1.05,
      0,
    );
    bulb.castShadow = false;
    const bulbLight = new THREE.PointLight(0xffb13b, 0.6, 2.5);
    bulbLight.position.set(0, 1.05, 0);
    head.add(bulbLight);

    // Vintage Broadcast Microphone with Wireframe Grille
    const mic = new THREE.Group();
    mic.position.set(1.25, 0, 0.85);
    rig.add(mic);
    addMesh(new THREE.CylinderGeometry(0.24, 0.28, 0.04, 40), darkMat, mic, 0, 0.02, 0);
    addLimb([0, 0, 0], [0, 2.0, 0], 0.022, chromeMat, mic);
    const boomEnd: [number, number, number] = [-0.5, 2.32, 0.05];
    addLimb([0, 1.95, 0], boomEnd, 0.016, chromeMat, mic);
    addLimb(boomEnd, [-0.6, 2.4, 0.1], 0.045, darkMat, mic);
    const grille = addMesh(
      new THREE.SphereGeometry(0.085, 18, 12),
      darkMat,
      mic,
      -0.64,
      2.44,
      0.12,
    );
    const gw = new THREE.Mesh(
      new THREE.SphereGeometry(0.088, 12, 8),
      new THREE.MeshBasicMaterial({
        color: 0xffb13b,
        wireframe: true,
        transparent: true,
        opacity: 0.55,
      }),
    );
    gw.position.copy(grille.position);
    mic.add(gw);

    // Floor Shockwave Tap Rings
    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const rm = new THREE.Mesh(
        new THREE.RingGeometry(0.96, 1.0, 96),
        new THREE.MeshBasicMaterial({
          color: 0xffb13b,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        }),
      );
      rm.rotation.x = -Math.PI / 2;
      rm.position.y = 0.225;
      rm.userData.life = 1;
      scene.add(rm);
      rings.push(rm);
    }

    // Floating '?' Fraunces Serif Question Mark Sprite
    const qc = document.createElement("canvas");
    qc.width = qc.height = 256;
    const qTex = new THREE.CanvasTexture(qc);
    function drawQ() {
      const g = qc.getContext("2d");
      if (!g) return;
      g.clearRect(0, 0, 256, 256);
      g.fillStyle = "#ffb13b";
      g.font = "300 210px Fraunces, Georgia, serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("?", 128, 140);
      qTex.needsUpdate = true;
    }
    drawQ();
    if (document.fonts) document.fonts.ready.then(drawQ);

    const qSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: qTex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    qSprite.scale.set(0.8, 0.8, 1);
    scene.add(qSprite);

    /* Animation and Physics State */
    const st = {
      ndc: new THREE.Vector2(0, 0),
      hover: false,
      heat: 0,
      intro: 0,
      t0: 0,
      yaw: 0,
      yawV: 0,
      pitch: 0,
      drag: null as {
        x: number;
        y: number;
        x0: number;
        y0: number;
        t: number;
        t0: number;
        moved: number;
      } | null,
      lastMove: -10,
      hYaw: 0,
      hPitch: 0.45,
      hRoll: 0,
      rollT: 0,
      nextTilt: 4,
      sq: 0,
      sqV: 0,
      sqT: 0,
      rock: 0,
      rockV: 0,
      blink: 0,
      nextBlink: 2.5,
      smile: 0,
      taps: 0,
      q: 1,
      flare: 0,
    };

    const ray = new THREE.Raycaster();
    const tmp = new THREE.Vector3();
    let w = 0;
    let h = 0;
    let mobile = false;
    let raf3 = 0;
    let last3 = 0;
    let time = 0;

    const resize = () => {
      w = c3.clientWidth || window.innerWidth;
      h = c3.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      mobile = w < 860;
      camera.aspect = w / h;
      if (mobile) {
        camera.fov = 34;
        camera.setViewOffset(w, h, 0, h * 0.18, w, h);
      } else {
        camera.fov = 28;
        camera.setViewOffset(w, h, -w * 0.17, h * 0.03, w, h);
      }
      camera.updateProjectionMatrix();
    };

    function camDist() {
      return mobile ? Math.max(15, 9.5 / Math.max(0.4, w / h)) : 12.5;
    }

    const onMove = (e: PointerEvent) => {
      const r = c3.getBoundingClientRect();
      st.ndc.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        -((e.clientY - r.top) / r.height) * 2 + 1,
      );
      st.lastMove = time;
      if (st.drag) {
        const dx = e.clientX - st.drag.x;
        const dy = e.clientY - st.drag.y;
        st.drag.moved = Math.max(
          st.drag.moved,
          Math.abs(e.clientX - st.drag.x0) + Math.abs(e.clientY - st.drag.y0),
        );
        st.yawV =
          ((dx * 0.9) / Math.max(1 / 60, (performance.now() - st.drag.t) / 1000)) *
          0.01;
        st.yaw += dx * 0.011;
        st.pitch = Math.max(-0.22, Math.min(0.22, st.pitch + dy * 0.003));
        st.drag.x = e.clientX;
        st.drag.y = e.clientY;
        st.drag.t = performance.now();
      }
    };

    c3.addEventListener("pointermove", onMove);
    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      onMove(e);
      st.drag = {
        x: e.clientX,
        y: e.clientY,
        x0: e.clientX,
        y0: e.clientY,
        t: performance.now(),
        t0: performance.now(),
        moved: 0,
      };
      st.sqT = 1;
      st.yawV = 0;
      c3.classList.add("dragging");
      try {
        c3.setPointerCapture(e.pointerId);
      } catch {}
    };
    c3.addEventListener("pointerdown", onDown);

    const REACTIONS = [
      "“Wait. Are you saying the horse actually studied medicine?” — Conf: 98.4%",
      "“Subtext parsing error: 'fine.' detected with fatal terminal period.” — Conf: 99.1%",
      "“Newtonian mechanics confirmed: water does not decelerate with dashboard.” — Conf: 97.5%",
      "“Checking semantic dictionary for dual reading… stand by.” — Conf: 96.0%",
      "“...Oh. Wait. Was that entire routine at my expense?” — Smile Glitch Detected",
    ];

    const onUp = () => {
      if (!st.drag) return;
      const tap = st.drag.moved < 8 && performance.now() - st.drag.t0 < 400;
      st.drag = null;
      st.sqT = 0;
      c3.classList.remove("dragging");
      st.yaw = Math.atan2(Math.sin(st.yaw), Math.cos(st.yaw));

      if (tap) {
        st.rockV -= 2.6;
        st.flare = 1;
        st.q = 0;
        st.taps++;
        setPokeCount(st.taps);

        const rg = rings.find((r) => r.userData.life >= 1) || rings[0];
        if (rg) rg.userData.life = 0;

        if (st.taps % 7 === 0) {
          st.smile = 1;
          setLastReaction(REACTIONS[4] ?? "");
        } else {
          setLastReaction(REACTIONS[st.taps % (REACTIONS.length - 1)] ?? "");
        }
      }
    };
    c3.addEventListener("pointerup", onUp);
    c3.addEventListener("pointercancel", onUp);
    c3.addEventListener("pointerleave", () => {
      st.hover = false;
    });

    const damp = (a: number, b: number, k: number, dt: number) =>
      a + (b - a) * (1 - Math.exp(-k * dt));
    const ease = (x: number) =>
      x < 0 ? 0 : x > 1 ? 1 : 1 - Math.pow(1 - x, 3);

    /* Render Frame Loop */
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - (last3 || now)) / 1000);
      last3 = now;
      time += dt;

      if (!st.t0) {
        st.t0 = now;
        setIs3DReady(true);
      }
      st.intro = Math.min(1, (now - st.t0) / 1800);
      const k = ease((st.intro - 0.12) / 0.8);
      const flicker =
        st.intro < 0.45 ? (Math.sin(now * 0.061) > 0.2 ? 1 : 0.35) : 1;

      // Update materials dynamically according to Laocoon finish mode
      const activeFinish = finishRef.current;
      if (activeFinish === "bronze") {
        // Laocoon Molten Bronze
        shellMat.color.lerp(new THREE.Color(0xd89c56), 0.08);
        shellMat.metalness = THREE.MathUtils.lerp(shellMat.metalness, 0.75, 0.08);
        shellMat.roughness = THREE.MathUtils.lerp(shellMat.roughness, 0.26, 0.08);
      } else if (activeFinish === "sapphire") {
        // Laocoon Deep Sapphire Drift
        shellMat.color.lerp(new THREE.Color(0x244268), 0.08);
        shellMat.metalness = THREE.MathUtils.lerp(shellMat.metalness, 0.88, 0.08);
        shellMat.roughness = THREE.MathUtils.lerp(shellMat.roughness, 0.18, 0.08);
      } else {
        // Obsidian Onyx
        shellMat.color.lerp(new THREE.Color(0x1a1816), 0.08);
        shellMat.metalness = THREE.MathUtils.lerp(shellMat.metalness, 0.55, 0.08);
        shellMat.roughness = THREE.MathUtils.lerp(shellMat.roughness, 0.32, 0.08);
      }

      // Hover test
      ray.setFromCamera(st.ndc, camera);
      st.hover = !!ray.intersectObject(bot, true).length;
      st.heat = damp(st.heat, st.hover || st.drag ? 1 : 0, 5, dt);
      st.flare = Math.max(0, st.flare - dt * 1.6);

      spot.intensity =
        SPOT_BASE * k * flicker * (1 + st.heat * 0.35 + st.flare * 0.4);
      wash.intensity = 0.9 * k;
      rim1.intensity = 1.1 * k;
      rim2.intensity = 0.5 * k;
      keySpot.intensity = 0.55 * k;

      if (coneMat.uniforms.uK) {
        coneMat.uniforms.uK.value =
          0.55 * k * flicker * (1 + st.heat * 0.5 + st.flare * 0.6);
      }
      dMat.opacity = 0.75 * k;

      bulbMat.color.setRGB(1, 0.69 + st.flare * 0.25, 0.23 + st.flare * 0.5);
      bulbLight.intensity = (0.5 + st.heat * 0.6 + st.flare * 2) * k;
      chestCore.color
        .setRGB(1, 0.69, 0.23)
        .multiplyScalar(0.55 + 0.45 * (Math.sin(time * 2.2) * 0.5 + 0.5));

      // Drag spin with inertia and smooth rest return
      if (!st.drag) {
        st.yaw += st.yawV * dt;
        st.yawV *= Math.exp(-2.4 * dt);
        st.yaw = damp(st.yaw, 0, 0.9, dt);
        st.pitch = damp(st.pitch, 0, 1.6, dt);
      }
      st.rockV += (-60 * st.rock - 7 * st.rockV) * dt;
      st.rock += st.rockV * dt;
      bot.rotation.y = st.yaw;
      bot.rotation.x = st.pitch * 0.5;
      rig.rotation.x = st.rock * 0.06;
      torso.scale.y = 1 + Math.sin(time * 1.7) * 0.008;

      // Pointer tracking and idle tilts
      head.getWorldPosition(tmp);
      tmp.project(camera);
      const idle = time - st.lastMove > 2.5;
      let yawT = Math.max(-0.6, Math.min(0.6, (st.ndc.x - tmp.x) * 0.55));
      let pitchT = Math.max(-0.3, Math.min(0.35, -(st.ndc.y - tmp.y) * 0.35));
      if (idle) {
        yawT = Math.sin(time * 0.45) * 0.18;
        pitchT = Math.sin(time * 0.31) * 0.05;
      }
      if (st.intro < 0.55) pitchT = 0.45;

      st.nextTilt -= dt;
      if (st.nextTilt < 0) {
        st.rollT = st.rollT ? 0 : (Math.random() < 0.5 ? -1 : 1) * 0.2;
        st.nextTilt = st.rollT ? 1.4 : 3 + Math.random() * 4;
      }
      st.hYaw = damp(st.hYaw, yawT, 4, dt);
      st.hPitch = damp(st.hPitch, pitchT, 3, dt);
      st.hRoll = damp(st.hRoll, st.rollT, 3, dt);
      headPivot.rotation.set(st.hPitch, st.hYaw, st.hRoll);
      headPivot.position.y = 1.22 + Math.sin(time * 1.7) * 0.012;

      // Squash and stretch spring
      st.sqV += (170 * (st.sqT - st.sq) - 12 * st.sqV) * dt;
      st.sq += st.sqV * dt;
      head.scale.set(1 + st.sq * 0.09, 1 - st.sq * 0.16, 1 + st.sq * 0.09);

      // Blinking & Eyes Gaze
      st.nextBlink -= dt;
      if (st.nextBlink < 0) {
        st.blink = 1;
        st.nextBlink = 2.2 + Math.random() * 3.5;
      }
      st.blink = Math.max(0, st.blink - dt * 7);
      const ey = 1.3 * (1 - Math.min(1, st.blink * 1.2)) + 0.06;
      eyeL.scale.y = eyeR.scale.y = ey;
      eyes.position.x = st.hYaw * 0.06;

      st.smile = Math.max(0, st.smile - dt * 0.5);
      mouthR.rotation.z = Math.sin(Math.min(1, st.smile) * Math.PI) * 0.2;

      // Forge Sparks Drifting down beam
      for (let i = 0; i < ND; i++) {
        const p = dustMotes[i];
        if (!p) continue;
        p.t += p.s * dt * (1 + st.heat * 1.5);
        if (p.t > 1) p.t -= 1;
        const rr = p.r * coneR * p.t * 0.92;
        const a = p.a + time * 0.05 + Math.sin(time * 0.6 + p.w) * 0.2;
        tmp
          .copy(apex)
          .lerp(aim, p.t)
          .addScaledVector(side1, Math.cos(a) * rr)
          .addScaledVector(side2, Math.sin(a) * rr);
        dpos[i * 3] = tmp.x;
        dpos[i * 3 + 1] = tmp.y;
        dpos[i * 3 + 2] = tmp.z;
      }
      if (dGeo.attributes.position) {
        dGeo.attributes.position.needsUpdate = true;
      }

      // Expanding floor rings & '?' sprite
      rings.forEach((r) => {
        const L = r.userData.life;
        if (L < 1) {
          r.userData.life = Math.min(1, L + dt * 0.9);
          const s = 1 + ease(L) * 1.9;
          r.scale.set(s, s, 1);
          (r.material as THREE.MeshBasicMaterial).opacity = (1 - L) * 0.9;
        } else {
          (r.material as THREE.MeshBasicMaterial).opacity = 0;
        }
      });

      st.q = Math.min(1, st.q + dt * 0.75);
      head.getWorldPosition(tmp);
      qSprite.position.set(tmp.x + 0.85, tmp.y + 0.55 + ease(st.q) * 0.5, tmp.z);
      qSprite.material.opacity = st.q < 1 ? Math.sin(st.q * Math.PI) : 0;
      const qs = 0.5 + ease(Math.min(1, st.q * 3)) * 0.45;
      qSprite.scale.set(qs, qs, 1);

      // Low seat house perspective camera
      const cd = camDist();
      camera.position.set(
        st.ndc.x * 0.45,
        3.1 + st.ndc.y * 0.18 - (1 - k) * 0.4,
        cd,
      );
      camera.lookAt(lookTarget);

      renderer.render(scene, camera);
      raf3 = requestAnimationFrame(frame);
    };

    resize();
    raf3 = requestAnimationFrame(frame);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(raf3);
      window.removeEventListener("resize", resize);
      c3.removeEventListener("pointermove", onMove);
      c3.removeEventListener("pointerdown", onDown);
      c3.removeEventListener("pointerup", onUp);
      c3.removeEventListener("pointercancel", onUp);
      pmrem.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <>
      <div ref={containerRef} className="stage-canvas-wrap">
        {/* Instant 2D Canvas Fallback */}
        <canvas
          ref={canvas2dRef}
          className="stage-cv-2d"
          style={{ opacity: is3DReady ? 0 : 1 }}
          aria-hidden="true"
        />

        {/* Cinematic 3D WebGL Canvas */}
        <canvas
          ref={canvas3dRef}
          className={`stage-3d-cv ${is3DReady ? "on" : ""}`}
          aria-label="The Straight Man 3D stage robot under warm spotlight. Drag to rotate, tap to poke."
          role="img"
        />
      </div>

      <div className="stage-vignette" aria-hidden="true" />

      {/* Floating Theme Selector & Hint */}
      <div className="stage-hint">
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-zinc-400 font-mono tracking-wider">SURFACE:</span>
          <button
            type="button"
            onClick={() => setFinishMode("bronze")}
            className={`cursor-pointer rounded-full px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider transition-all ${
              finishMode === "bronze"
                ? "bg-[#ffb13b] text-[#060606] font-semibold shadow-[0_0_12px_rgba(255,177,59,0.35)]"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Molten Bronze
          </button>
          <button
            type="button"
            onClick={() => setFinishMode("sapphire")}
            className={`cursor-pointer rounded-full px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider transition-all ${
              finishMode === "sapphire"
                ? "bg-[#3b82f6] text-[#060606] font-semibold shadow-[0_0_12px_rgba(59,130,246,0.35)]"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Sapphire Drift
          </button>
          <button
            type="button"
            onClick={() => setFinishMode("obsidian")}
            className={`cursor-pointer rounded-full px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider transition-all ${
              finishMode === "obsidian"
                ? "bg-white text-[#060606] font-semibold shadow-[0_0_12px_rgba(255,255,255,0.35)]"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Obsidian
          </button>
        </div>
        <span className="text-zinc-600">|</span>
        <span className="text-[10px] text-zinc-300 font-mono">
          TAP TO POKE ({pokeCount})
        </span>
      </div>

      {/* Live Straight Man Monologue Ticker */}
      <div className="pointer-events-none absolute bottom-6 left-[clamp(20px,4vw,56px)] z-6 hidden max-w-md rounded-full border border-white/10 bg-[#060606]/85 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-400 backdrop-blur-md lg:flex lg:items-center lg:gap-2.5 shadow-xl">
        <span className="h-2 w-2 rounded-full bg-[#ffb13b] shadow-[0_0_12px_#ffb13b]" />
        <span className="truncate text-[#f4f4f5]">{lastReaction}</span>
      </div>
    </>
  );
}
