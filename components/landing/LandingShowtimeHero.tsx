"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

function SplitChars({
  parts,
  active,
}: {
  parts: { text: string; em?: boolean; brAfter?: boolean }[];
  active: boolean;
}) {
  let charIndex = 0;
  return (
    <>
      {parts.map((part, pIdx) => {
        const chars = Array.from(part.text).map((ch, cIdx) => {
          const delay = charIndex * 0.024;
          charIndex++;
          return (
            <span
              key={`${pIdx}-${cIdx}`}
              className={`char ${active ? "in" : ""}`}
              style={{
                transitionDelay: active ? `${delay.toFixed(3)}s` : "0s",
              }}
            >
              {ch === " " ? "\u00A0" : ch}
            </span>
          );
        });
        const content = part.em ? (
          <em key={`em-${pIdx}`} className="italic text-[#ffc53d]">
            {chars}
          </em>
        ) : (
          <span key={`sp-${pIdx}`}>{chars}</span>
        );
        return (
          <span key={`wrap-${pIdx}`}>
            {content}
            {part.brAfter ? <br /> : null}
          </span>
        );
      })}
    </>
  );
}

interface RobotPose {
  torsoRx: number;
  torsoRy: number;
  torsoRz: number;
  torsoY: number;
  headRx: number;
  headRy: number;
  headRz: number;
  eyeScaleY: number;
  eyeScaleX: number;
  armLRx: number;
  armLRy: number;
  armLRz: number;
  elbowLRx: number;
  elbowLRz: number;
  armRRx: number;
  armRRy: number;
  armRRz: number;
  elbowRRx: number;
  elbowRRz: number;
  camAngle: number;
  camY: number;
  camDist: number;
  lookAtY: number;
  antennaGlow: number;
}

const POSES: RobotPose[] = [
  // 0: The Human Challenge (Cold stare, leaning into the mic)
  {
    torsoRx: 0.12,
    torsoRy: -0.15,
    torsoRz: 0.0,
    torsoY: 1.2,
    headRx: -0.06,
    headRy: 0.02,
    headRz: 0.0,
    eyeScaleY: 1.0,
    eyeScaleX: 1.0,
    armLRx: 0.22,
    armLRy: 0.0,
    armLRz: -0.25,
    elbowLRx: -0.55,
    elbowLRz: 0.0,
    armRRx: -0.55,
    armRRy: -0.22,
    armRRz: 0.28,
    elbowRRx: -0.85,
    elbowRRz: -0.18,
    camAngle: -0.12,
    camY: 0.24,
    camDist: 2.85,
    lookAtY: 0.22,
    antennaGlow: 0.8,
  },
  // 1: The AI Critic (Leaning back, hand stroking chin, eyes narrowed in deep skepticism)
  {
    torsoRx: -0.1,
    torsoRy: 0.26,
    torsoRz: 0.04,
    torsoY: 1.2,
    headRx: 0.06,
    headRy: -0.28,
    headRz: -0.26,
    eyeScaleY: 0.32,
    eyeScaleX: 1.25,
    armLRx: 0.1,
    armLRy: 0.0,
    armLRz: -0.28,
    elbowLRx: -0.45,
    elbowLRz: 0.0,
    armRRx: -1.15,
    armRRy: 0.35,
    armRRz: 0.55,
    elbowRRx: -1.5,
    elbowRRz: -0.42,
    camAngle: 0.72,
    camY: -0.06,
    camDist: 2.65,
    lookAtY: 0.32,
    antennaGlow: 1.4,
  },
  // 2: Blind Quorum (Sweeping arm gesture to the crowd, head turned to jury)
  {
    torsoRx: 0.02,
    torsoRy: -0.42,
    torsoRz: -0.05,
    torsoY: 1.2,
    headRx: -0.04,
    headRy: -0.45,
    headRz: 0.1,
    eyeScaleY: 1.0,
    eyeScaleX: 1.0,
    armLRx: -0.32,
    armLRy: 0.12,
    armLRz: -0.22,
    elbowLRx: -0.72,
    elbowLRz: 0.0,
    armRRx: -0.48,
    armRRy: -0.32,
    armRRz: 0.85,
    elbowRRx: -0.32,
    elbowRRz: 0.1,
    camAngle: 1.62,
    camY: 0.48,
    camDist: 3.1,
    lookAtY: 0.18,
    antennaGlow: 1.1,
  },
  // 3: The Joke Vault (Upright, authoritative master stance, golden glow)
  {
    torsoRx: 0.0,
    torsoRy: 0.0,
    torsoRz: 0.0,
    torsoY: 1.24,
    headRx: -0.08,
    headRy: 0.0,
    headRz: 0.04,
    eyeScaleY: 1.0,
    eyeScaleX: 1.0,
    armLRx: 0.16,
    armLRy: 0.0,
    armLRz: -0.2,
    elbowLRx: -0.52,
    elbowLRz: 0.0,
    armRRx: -0.32,
    armRRy: -0.12,
    armRRz: 0.32,
    elbowRRx: -0.78,
    elbowRRz: -0.12,
    camAngle: 0.0,
    camY: 0.2,
    camDist: 2.85,
    lookAtY: 0.24,
    antennaGlow: 1.8,
  },
];

function smoothstep(min: number, max: number, value: number) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

function lerpPose(pA: RobotPose, pB: RobotPose, t: number): RobotPose {
  const l = (a: number, b: number) => a + (b - a) * t;
  return {
    torsoRx: l(pA.torsoRx, pB.torsoRx),
    torsoRy: l(pA.torsoRy, pB.torsoRy),
    torsoRz: l(pA.torsoRz, pB.torsoRz),
    torsoY: l(pA.torsoY, pB.torsoY),
    headRx: l(pA.headRx, pB.headRx),
    headRy: l(pA.headRy, pB.headRy),
    headRz: l(pA.headRz, pB.headRz),
    eyeScaleY: l(pA.eyeScaleY, pB.eyeScaleY),
    eyeScaleX: l(pA.eyeScaleX, pB.eyeScaleX),
    armLRx: l(pA.armLRx, pB.armLRx),
    armLRy: l(pA.armLRy, pB.armLRy),
    armLRz: l(pA.armLRz, pB.armLRz),
    elbowLRx: l(pA.elbowLRx, pB.elbowLRx),
    elbowLRz: l(pA.elbowLRz, pB.elbowLRz),
    armRRx: l(pA.armRRx, pB.armRRx),
    armRRy: l(pA.armRRy, pB.armRRy),
    armRRz: l(pA.armRRz, pB.armRRz),
    elbowRRx: l(pA.elbowRRx, pB.elbowRRx),
    elbowRRz: l(pA.elbowRRz, pB.elbowRRz),
    camAngle: l(pA.camAngle, pB.camAngle),
    camY: l(pA.camY, pB.camY),
    camDist: l(pA.camDist, pB.camDist),
    lookAtY: l(pA.lookAtY, pB.lookAtY),
    antennaGlow: l(pA.antennaGlow, pB.antennaGlow),
  };
}

function samplePose(s: number): RobotPose {
  if (s <= 0.33) {
    const t = smoothstep(0.0, 0.33, s);
    return lerpPose(POSES[0]!, POSES[1]!, t);
  } else if (s <= 0.66) {
    const t = smoothstep(0.33, 0.66, s);
    return lerpPose(POSES[1]!, POSES[2]!, t);
  } else {
    const t = smoothstep(0.66, 1.0, s);
    return lerpPose(POSES[2]!, POSES[3]!, t);
  }
}

const CHAPTERS = [
  {
    num: "01",
    tag: "The Human Challenge",
    titleLead: "Tell a ",
    titleEm: "Joke.",
    desc: "AI has ingested almost everything humanity ever wrote. But the most human nuances were never written down: the pause before 'I'm fine', deadpan irony, and why a bit kills in one room and bombs in another.",
  },
  {
    num: "02",
    tag: "The Straight Man AI",
    titleLead: "Fool the ",
    titleEm: "AI.",
    desc: "Tell the Straight Man something only a human would understand: subtext, innuendo, or double meanings. If it misses with deadpan confidence and the blind crowd agrees, you killed it.",
  },
  {
    num: "03",
    tag: "Blind Quorum",
    titleLead: "Get ",
    titleEm: "Paid.",
    desc: "Verified human jurors judge blind with zero author or AI labels. When 60%+ side with you, rewards settle on-chain in USDG directly from the Tip Jar at midnight UTC.",
  },
  {
    num: "04",
    tag: "The Joke Vault",
    titleLead: "The Joke ",
    titleEm: "Vault.",
    desc: "Every verified bit becomes an immutable data asset in the Joke Vault. Frontier AI labs license the Vault to align reasoning models, and 10% lifetime royalties flow back to the comedians forever.",
  },
];

const DEADPAN_REMARKS = [
  "Not impressed.",
  "Zero entropy detected.",
  "Try harder.",
  "Predictable token sequence.",
  "404: Humor not found.",
  "Literal confidence: 99.8%.",
  "Is that your punchline?",
];

export default function LandingShowtimeHero() {
  const runwayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [toastText, setToastText] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const runway = runwayRef.current;
    if (!canvas || !runway) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch {
      return;
    }

    const sizes = { width: window.innerWidth, height: window.innerHeight };
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 2.4;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#050507");
    scene.fog = new THREE.FogExp2("#050507", 0.012);

    const camera = new THREE.PerspectiveCamera(46, sizes.width / sizes.height, 0.1, 100);
    camera.position.set(0, 0.3, 3.0);
    scene.add(camera);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    // 1. LIQUID STAGE-LIGHT SHADER (Camera child)
    const shaderUniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(sizes.width, sizes.height) },
      uMouse: { value: new THREE.Vector2() },
      uScroll: { value: 0 },
    };

    const vs = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
    const fs = `
      varying vec2 vUv; uniform float uTime; uniform vec2 uResolution; uniform vec2 uMouse; uniform float uScroll;
      void main(){
        vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
        float aspect = uResolution.x / uResolution.y;
        float time = uTime * 0.08; float scroll = uScroll;
        float angle1 = 0.6, angle2 = -0.7, angle3 = 1.2;
        float freq1 = 2.4, freq2 = 3.2, freq3 = 4.0;
        vec2 w = uv; float sd = scroll * 5.0;
        w.x += sin(uv.y * 2.5 + time * 0.2 + sd) * 0.35;
        w.y += cos(uv.x * 2.5 - time * 0.15 - sd * 0.8) * 0.35;
        w.x += sin(uv.y * 1.2 - time * 0.1 - sd * 1.5) * 0.25;
        w.y += cos(uv.x * 1.2 + time * 0.18 + sd * 1.2) * 0.25;
        w += vec2(scroll * 0.04, -scroll * 0.02) + vec2(uMouse.x * aspect * 0.05, uMouse.y * 0.05);
        float w1 = sin(dot(w, vec2(cos(angle1), sin(angle1))) * freq1 + time);
        float w2 = cos(dot(w, vec2(cos(angle2), sin(angle2))) * freq2 - time * 1.4 + w1 * 0.4);
        float w3 = sin(dot(w, vec2(cos(angle3), sin(angle3))) * freq3 + time * 1.8 + w2 * 0.5);
        float field = w1 * 0.50 + w2 * 0.35 + w3 * 0.15;
        float wide = pow(max(0.0, 1.0 - abs(field - 0.1)), 2.5);
        float crisp = pow(max(0.0, 1.0 - abs(field - 0.15)), 8.0);
        float crest = wide * 0.5 + crisp * 0.9;
        vec3 c0s = vec3(0.0012,0.0007,0.0003), c0a = vec3(0.095,0.052,0.012), c0b = vec3(0.052,0.027,0.006), c0c = vec3(0.52,0.33,0.10);
        vec3 c1s = vec3(0.0012,0.0003,0.0002), c1a = vec3(0.080,0.018,0.012), c1b = vec3(0.044,0.010,0.007), c1c = vec3(0.48,0.15,0.09);
        float t = smoothstep(0.0, 1.0, scroll);
        vec3 col = mix(c0s, c1s, t);
        col = mix(col, mix(c0b, c1b, t), smoothstep(-0.6, 0.2, field));
        col = mix(col, mix(c0a, c1a, t), smoothstep(0.0, 0.8, field));
        col += mix(c0c, c1c, t) * crest * 0.85;
        col *= 1.0 - dot(uv, uv) * 0.12;
        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(32, 32),
      new THREE.ShaderMaterial({
        vertexShader: vs,
        fragmentShader: fs,
        uniforms: shaderUniforms,
        depthWrite: false,
        depthTest: false,
      }),
    );
    bg.position.set(0, 0, -8);
    bg.renderOrder = -10;
    camera.add(bg);

    // 2. CHIAROSCURO LIGHTING RIG
    scene.add(new THREE.AmbientLight("#ffffff", 0.15));

    const keyLight = new THREE.SpotLight("#ffffff", 22);
    keyLight.position.set(4, 6, 3);
    keyLight.angle = Math.PI / 4;
    keyLight.penumbra = 0.85;
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.bias = -0.001;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight("#ffc53d", 12);
    rimLight.position.set(-5, 4, -4);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight("#fff3e6", 1.2);
    fillLight.position.set(-2, -3, 3);
    scene.add(fillLight);

    // 3. APPLAUSE SPARKS
    const sparkCount = 380;
    const sparkData: { sx: number; sy: number; sz: number; sw: number; sr: number; ph: number }[] = [];
    function makeSparkTex() {
      const c = document.createElement("canvas");
      c.width = c.height = 16;
      const g = c.getContext("2d");
      if (!g) return new THREE.Texture();
      const r = g.createRadialGradient(8, 8, 0, 8, 8, 8);
      r.addColorStop(0, "rgba(255,255,255,1)");
      r.addColorStop(0.3, "rgba(255,214,120,0.8)");
      r.addColorStop(0.8, "rgba(255,177,59,0.2)");
      r.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = r;
      g.fillRect(0, 0, 16, 16);
      return new THREE.CanvasTexture(c);
    }

    const sGeo = new THREE.BufferGeometry();
    const sPos = new Float32Array(sparkCount * 3);
    const sCol = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount; i++) {
      sPos[i * 3] = (Math.random() - 0.5) * 4;
      sPos[i * 3 + 1] = -2.0 + Math.random() * 4.5;
      sPos[i * 3 + 2] = (Math.random() - 0.5) * 4;
      if (Math.random() < 0.6) {
        sCol[i * 3] = 1;
        sCol[i * 3 + 1] = 0.77 + Math.random() * 0.15;
        sCol[i * 3 + 2] = 0.15 + Math.random() * 0.1;
      } else {
        sCol[i * 3] = 1;
        sCol[i * 3 + 1] = 0.95;
        sCol[i * 3 + 2] = 0.88;
      }
      sparkData.push({
        sx: (Math.random() - 0.5) * 0.35,
        sy: 0.2 + Math.random() * 0.3,
        sz: (Math.random() - 0.5) * 0.35,
        sw: 0.5 + Math.random() * 1.5,
        sr: 0.05 + Math.random() * 0.15,
        ph: Math.random() * Math.PI * 2,
      });
    }
    sGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
    sGeo.setAttribute("color", new THREE.BufferAttribute(sCol, 3));
    const sparks = new THREE.Points(
      sGeo,
      new THREE.PointsMaterial({
        size: 0.024,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        map: makeSparkTex(),
      }),
    );
    scene.add(sparks);

    // 4. THE STRAIGHT MAN STATUE IN FULL CAST BRONZE
    const bronze = new THREE.MeshStandardMaterial({
      color: 0xc48f57,
      roughness: 0.4,
      metalness: 0.92,
      envMap: envTex,
      envMapIntensity: 0.65,
    });
    const darkMetal = new THREE.MeshStandardMaterial({
      color: 0x36281b,
      roughness: 0.36,
      metalness: 0.95,
      envMap: envTex,
      envMapIntensity: 0.5,
    });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x020202,
      roughness: 0.06,
      metalness: 0.25,
      envMap: envTex,
      envMapIntensity: 1,
    });
    const lamp = new THREE.MeshBasicMaterial({ color: 0xfff6e8, toneMapped: false });
    const amber = new THREE.MeshBasicMaterial({ color: 0xffc53d, toneMapped: false });
    const UP = new THREE.Vector3(0, 1, 0);

    function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    }

    function limb(a: number[], b: number[], r: number, mat: THREE.Material, parent: THREE.Object3D) {
      const A = new THREE.Vector3(a[0], a[1], a[2]);
      const B = new THREE.Vector3(b[0], b[1], b[2]);
      const d = B.clone().sub(A);
      const m = mesh(new THREE.CylinderGeometry(r, r, d.length(), 24), mat, parent);
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

    const statue = new THREE.Group();

    // Stage Plinth
    mesh(new THREE.CylinderGeometry(1.4, 1.48, 0.16, 96), darkMetal, statue, 0, 0.08, 0);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(1.41, 0.012, 8, 160), amber);
    lip.rotation.x = Math.PI / 2;
    lip.position.y = 0.16;
    statue.add(lip);

    const rig = new THREE.Group();
    rig.position.y = 0.16;
    statue.add(rig);

    // Stool
    mesh(new THREE.CylinderGeometry(0.54, 0.52, 0.09, 48), darkMetal, rig, 0, 1.0, 0);
    for (let i = 0; i < 3; i++) {
      const a = i * 2.094 + 0.5;
      limb([Math.cos(a) * 0.38, 0.97, Math.sin(a) * 0.38], [Math.cos(a) * 0.52, 0, Math.sin(a) * 0.52], 0.026, darkMetal, rig);
    }
    const ring = mesh(new THREE.TorusGeometry(0.44, 0.018, 8, 64), darkMetal, rig, 0, 0.38, 0);
    ring.rotation.x = Math.PI / 2;

    // Bot Pelvis & Legs
    const bot = new THREE.Group();
    rig.add(bot);
    mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.18, 40), darkMetal, bot, 0, 1.15, 0);
    for (const s of [-1, 1]) {
      limb([s * 0.22, 1.12, 0.02], [s * 0.28, 1.1, 0.66], 0.12, bronze, bot);
      mesh(new THREE.SphereGeometry(0.135, 24, 16), darkMetal, bot, s * 0.28, 1.1, 0.68);
      limb([s * 0.29, 1.08, 0.7], [s * 0.31, 0.16, 0.8], 0.095, bronze, bot);
      mesh(new THREE.BoxGeometry(0.24, 0.11, 0.4), darkMetal, bot, s * 0.31, 0.07, 0.9);
    }

    // Torso Group
    const torso = new THREE.Group();
    torso.position.y = 1.2;
    bot.add(torso);
    mesh(new THREE.CylinderGeometry(0.62, 0.46, 1.0, 64), bronze, torso, 0, 0.5, 0);
    const collar = mesh(new THREE.TorusGeometry(0.34, 0.055, 12, 48), darkMetal, torso, 0, 1.0, 0);
    collar.rotation.x = Math.PI / 2;

    const chest = new THREE.MeshBasicMaterial({ color: 0xffc53d, toneMapped: false });
    const cl = mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.03, 24), chest, torso, 0, 0.62, 0.58);
    cl.rotation.x = Math.PI / 2 - 0.13;

    // LEFT ARM RIG (Shoulder -> UpperArm -> Elbow -> Forearm -> Hand)
    const shoulderL = new THREE.Group();
    shoulderL.position.set(-0.66, 0.88, 0);
    torso.add(shoulderL);
    mesh(new THREE.SphereGeometry(0.17, 24, 16), bronze, shoulderL);

    const armL = new THREE.Group();
    shoulderL.add(armL);
    mesh(new THREE.CylinderGeometry(0.085, 0.08, 0.55, 20), darkMetal, armL, 0, -0.275, 0);

    const elbowL = new THREE.Group();
    elbowL.position.set(0, -0.55, 0);
    armL.add(elbowL);
    mesh(new THREE.SphereGeometry(0.1, 16, 12), bronze, elbowL);

    const forearmL = new THREE.Group();
    elbowL.add(forearmL);
    mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.5, 20), darkMetal, forearmL, 0, -0.25, 0);
    mesh(new THREE.SphereGeometry(0.115, 20, 14), bronze, forearmL, 0, -0.5, 0);

    // RIGHT ARM RIG (Shoulder -> UpperArm -> Elbow -> Forearm -> Hand)
    const shoulderR = new THREE.Group();
    shoulderR.position.set(0.66, 0.88, 0);
    torso.add(shoulderR);
    mesh(new THREE.SphereGeometry(0.17, 24, 16), bronze, shoulderR);

    const armR = new THREE.Group();
    shoulderR.add(armR);
    mesh(new THREE.CylinderGeometry(0.085, 0.08, 0.55, 20), darkMetal, armR, 0, -0.275, 0);

    const elbowR = new THREE.Group();
    elbowR.position.set(0, -0.55, 0);
    armR.add(elbowR);
    mesh(new THREE.SphereGeometry(0.1, 16, 12), bronze, elbowR);

    const forearmR = new THREE.Group();
    elbowR.add(forearmR);
    mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.5, 20), darkMetal, forearmR, 0, -0.25, 0);
    mesh(new THREE.SphereGeometry(0.115, 20, 14), bronze, forearmR, 0, -0.5, 0);

    // Neck
    mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.26, 20), darkMetal, torso, 0, 1.12, 0);

    // Head Pivot & Head
    const headPivot = new THREE.Group();
    headPivot.position.y = 1.24;
    torso.add(headPivot);

    const head = new THREE.Group();
    head.position.y = 0.6;
    headPivot.add(head);

    const hg = new THREE.ExtrudeGeometry(rounded(1.5, 1.06, 0.32), {
      depth: 0.8,
      bevelEnabled: true,
      bevelThickness: 0.09,
      bevelSize: 0.09,
      bevelSegments: 6,
      curveSegments: 18,
    });
    hg.center();
    mesh(hg, bronze, head);

    const screenHole = rounded(1.24, 0.82, 0.2);
    const sg = new THREE.ExtrudeGeometry(screenHole, { depth: 0.06, bevelEnabled: false });
    sg.center();
    mesh(sg, glass, head, 0, 0, 0.48);

    // Eyes
    const eyes = new THREE.Group();
    eyes.position.set(0, 0.08, 0.52);
    head.add(eyes);
    const eyeL = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.015, 24), lamp, eyes, -0.25, 0, 0);
    eyeL.rotation.x = Math.PI / 2;
    const eyeR = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.015, 24), lamp, eyes, 0.25, 0, 0);
    eyeR.rotation.x = Math.PI / 2;

    const mouthL = mesh(new THREE.BoxGeometry(0.15, 0.03, 0.01), lamp, eyes, -0.08, -0.19, 0);
    const mouthR = mesh(new THREE.BoxGeometry(0.15, 0.03, 0.01), lamp, eyes, 0.08, -0.19, 0);
    mouthR.position.x = 0.08;

    // Ears / Antenna
    mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.22, 24), darkMetal, head, -0.86, 0.05, 0).rotation.z = Math.PI / 2;
    mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.22, 24), darkMetal, head, 0.86, 0.05, 0).rotation.z = Math.PI / 2;
    mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.44, 16), darkMetal, head, 0, 0.82, 0);
    const antennaMesh = mesh(new THREE.SphereGeometry(0.095, 20, 16), amber, head, 0, 1.06, 0);

    // Vintage Microphone on Stage
    const mic = new THREE.Group();
    mic.position.set(0.62, 0, 0.82);
    statue.add(mic);
    mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.04, 32), darkMetal, mic, 0, 0.02, 0);
    limb([0, 0.02, 0], [0, 1.75, 0], 0.022, darkMetal, mic);
    mesh(new THREE.SphereGeometry(0.085, 16, 12), darkMetal, mic, 0, 1.75, 0);
    mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.24, 16), darkMetal, mic, -0.04, 1.85, 0).rotation.z = 0.4;
    mesh(new THREE.SphereGeometry(0.085, 20, 16), amber, mic, -0.09, 1.95, 0);
    const bulbLight = new THREE.PointLight("#ffc53d", 1.8, 4);
    bulbLight.position.set(-0.09, 1.95, 0);
    mic.add(bulbLight);

    // Prominent Hero Framing: Robot is 35% larger and centered right
    const portrait = sizes.width / sizes.height < 0.95;
    statue.position.set(portrait ? 0 : 0.48, -1.05, 0);
    statue.scale.set(1.22, 1.22, 1.22);

    const modelPivot = new THREE.Group();
    modelPivot.add(statue);
    scene.add(modelPivot);

    const st = {
      targetScroll: 0,
      scroll: 0,
      hYaw: 0,
      hPitch: 0,
      blink: 0,
      nextBlink: 2.5,
      smile: 0,
      sq: 0,
      sqV: 0,
      mouseX: 0,
      mouseY: 0,
      boost: 0,
      taps: 0,
    };

    const targetPos = new THREE.Vector3();
    const lookAt = new THREE.Vector3();
    const clock = new THREE.Clock();

    // Scroll Handler synced to Runway Height
    const onScroll = () => {
      const rect = runway.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      if (scrollable <= 0) return;
      const s = Math.max(0, Math.min(1, -rect.top / scrollable));
      st.targetScroll = s;
      if (s < 0.25) setActiveSlide(0);
      else if (s < 0.5) setActiveSlide(1);
      else if (s < 0.75) setActiveSlide(2);
      else setActiveSlide(3);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const onPointerMove = (e: MouseEvent) => {
      st.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      st.mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    // Interactive Poke on Robot
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let toastTimer: ReturnType<typeof setTimeout> | null = null;
    const onPointerDown = (e: MouseEvent) => {
      ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      if (ray.intersectObject(statue, true).length > 0) {
        st.sqV -= 11;
        st.boost = 1.2;
        st.taps++;
        const remark = DEADPAN_REMARKS[st.taps % DEADPAN_REMARKS.length] ?? "Not impressed.";
        setToastText(remark);
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => setToastText(null), 2000);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);

    const onResize = () => {
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;
      const isPortrait = sizes.width / sizes.height < 0.95;
      statue.position.set(isPortrait ? 0 : 0.48, -1.05, 0);
      camera.aspect = sizes.width / sizes.height;
      camera.updateProjectionMatrix();
      renderer.setSize(sizes.width, sizes.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      shaderUniforms.uResolution.value.set(
        sizes.width * renderer.getPixelRatio(),
        sizes.height * renderer.getPixelRatio(),
      );
    };
    window.addEventListener("resize", onResize);

    // Pause rendering when runway scrolls out of view
    let isVisible = true;
    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.02 },
    );
    observer.observe(runway);

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      if (!isVisible) return;

      const dt = Math.min(0.05, clock.getDelta());
      const time = clock.getElapsedTime();

      // Smooth scroll interpolation
      st.scroll += (st.targetScroll - st.scroll) * 0.06;
      const scroll = st.scroll;
      const isPortrait = sizes.width / sizes.height < 0.95;

      // Sample keyframe pose along scroll progress
      const pose = samplePose(scroll);

      // 1. Dynamic Robot Posing
      torso.position.y = pose.torsoY + Math.sin(time * 1.8) * 0.006;
      torso.rotation.set(pose.torsoRx, pose.torsoRy, pose.torsoRz);

      // Head: Base pose + reactive mouse tracking
      st.hYaw += (pose.headRy + st.mouseX * 0.18 - st.hYaw) * (1 - Math.exp(-4 * dt));
      st.hPitch += (pose.headRx - st.mouseY * 0.12 - st.hPitch) * (1 - Math.exp(-4 * dt));
      headPivot.rotation.set(st.hPitch, st.hYaw, pose.headRz);

      // Arms: Shoulder and Elbow joints
      armL.rotation.set(pose.armLRx, pose.armLRy, pose.armLRz);
      elbowL.rotation.set(pose.elbowLRx, 0, pose.elbowLRz);

      armR.rotation.set(pose.armRRx, pose.armRRy, pose.armRRz);
      elbowR.rotation.set(pose.elbowRRx, 0, pose.elbowRRz);

      // Eyes: Scale aperture based on skeptical evaluation pose
      eyeL.scale.set(pose.eyeScaleX, pose.eyeScaleY * (1 - st.blink), 1);
      eyeR.scale.set(pose.eyeScaleX, pose.eyeScaleY * (1 - st.blink), 1);

      // Antenna glow & Chest pulsation
      const pulseRate = scroll > 0.25 && scroll < 0.5 ? 4.5 : 2.0;
      const pulse = 0.8 + 0.2 * (Math.sin(time * pulseRate) * 0.5 + 0.5);
      chest.color.setRGB(1 * pulse, 0.72 * pulse, 0.24 * pulse);
      antennaMesh.scale.setScalar(0.9 + 0.2 * pose.antennaGlow + st.boost * 0.3);

      // 2. Dynamic Camera Positioning keyed to pose
      const phi = pose.camAngle + (scroll * Math.PI * 0.6);
      const rad = pose.camDist * (isPortrait ? 1.45 : 1.0);
      targetPos.set(rad * Math.sin(phi), pose.camY, rad * Math.cos(phi));
      camera.position.lerp(targetPos, 0.06);
      lookAt.set(isPortrait ? 0 : 0.42, pose.lookAtY, 0);
      camera.lookAt(lookAt);

      // Gentle interactive mouse parallax
      modelPivot.rotation.y = st.mouseX * 0.12;
      modelPivot.rotation.x = st.mouseY * 0.08;

      // 3. Squash spring on poke
      st.sqV += (-180 * st.sq - 12 * st.sqV) * dt;
      st.sq += st.sqV * dt;
      const q = Math.max(-0.5, Math.min(0.5, st.sq * 0.15));
      head.scale.set(1 - q * 0.5, 1 + q, 1 - q * 0.5);

      // Blinking
      st.nextBlink -= dt;
      if (st.nextBlink < 0) {
        st.blink = 1;
        st.nextBlink = 2.5 + Math.random() * 4.0;
      }
      st.blink = Math.max(0, st.blink - dt * 7);

      // Sparks motion
      const vel = Math.abs(st.targetScroll - scroll);
      const mult = 1 + vel * 8 + st.boost * 3;
      for (let i = 0; i < sparkCount; i++) {
        const k = i * 3;
        const d = sparkData[i];
        if (!d) continue;
        let ny = (sPos[k + 1] ?? 0) + d.sy * dt * mult;
        let nx = (sPos[k] ?? 0) + Math.sin(time * d.sw + d.ph) * d.sr * dt;
        let nz = (sPos[k + 2] ?? 0) + Math.cos(time * d.sw + d.ph) * d.sr * dt;
        if (ny > 3.2) {
          ny = -2.2;
          nx = (Math.random() - 0.5) * 4;
          nz = (Math.random() - 0.5) * 4;
        }
        sPos[k] = nx;
        sPos[k + 1] = ny;
        sPos[k + 2] = nz;
      }
      const posAttr = sGeo.attributes.position;
      if (posAttr) posAttr.needsUpdate = true;
      st.boost = Math.max(0, st.boost - dt * 1.5);

      // Shader uniforms
      shaderUniforms.uTime.value = time;
      shaderUniforms.uMouse.value.set(st.mouseX, -st.mouseY);
      shaderUniforms.uScroll.value = scroll;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      if (toastTimer) clearTimeout(toastTimer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      pmrem.dispose();
      envTex.dispose();
    };
  }, []);

  const currentChapter = CHAPTERS[activeSlide] ?? CHAPTERS[0]!;

  return (
    <div
      ref={runwayRef}
      className="relative w-full h-[450vh] bg-[#050507] text-white font-sans selection:bg-[#ffc53d]/30 selection:text-[#ffc53d]"
    >
      {/* STICKY 100VH STAGE */}
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* Fullscreen 3D WebGL Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full z-0 block cursor-pointer outline-none"
          aria-label="The Straight Man 3D bronze robot on stage"
        />

        {/* Deadpan Speech Toast on Poke */}
        {toastText && (
          <div className="fixed top-1/4 right-[10%] sm:right-[20%] z-30 pointer-events-none transition-all duration-300 animate-fadeIn">
            <div className="rounded-xl border border-[#ffc53d]/30 bg-[#0c0c12]/95 px-5 py-3 shadow-[0_0_30px_rgba(255,197,61,0.2)] backdrop-blur-md">
              <span className="font-mono text-xs uppercase tracking-widest text-[#ffc53d] font-semibold">
                “{toastText}”
              </span>
            </div>
          </div>
        )}

        {/* Minimalist Editorial Chapter Stepper on Right */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 z-20 hidden md:flex flex-col gap-6 select-none pointer-events-none">
          {CHAPTERS.map((ch, i) => (
            <div
              key={i}
              className="flex items-center justify-end gap-3 transition-all duration-300"
            >
              <span
                className={`font-mono text-[11px] tracking-widest transition-colors duration-300 ${
                  activeSlide === i ? "text-[#ffc53d] font-semibold" : "text-white/25"
                }`}
              >
                0{i + 1}
              </span>
              <div
                className={`transition-all duration-300 rounded-full ${
                  activeSlide === i
                    ? "w-8 h-[2px] bg-[#ffc53d] shadow-[0_0_8px_#ffc53d]"
                    : "w-3 h-[1px] bg-white/20"
                }`}
              />
            </div>
          ))}
        </div>

        {/* Editorial Text Overlay: Left Half */}
        <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-end p-[clamp(24px,5vw,72px)] pb-16 max-w-[1440px] mx-auto">
          <div className="max-w-xl pointer-events-auto space-y-4">
            {/* Clean Monospace Category Kicker */}
            <div className="font-mono text-xs uppercase tracking-[0.28em] text-[#ffc53d] font-semibold">
              {currentChapter.num} / {currentChapter.tag}
            </div>

            {/* Editorial Display Headline */}
            <h1 className="display-serif text-5xl sm:text-7xl lg:text-8xl text-white font-bold tracking-tight leading-[0.95]">
              <SplitChars
                parts={[
                  { text: currentChapter.titleLead },
                  { text: currentChapter.titleEm, em: true },
                ]}
                active={true}
              />
            </h1>

            {/* Narrative Paragraph */}
            <p className="text-base sm:text-lg text-zinc-300 leading-relaxed font-light pt-1">
              {currentChapter.desc}
            </p>

            {/* Launch App CTAs (Chapter 04 and Chapter 01) */}
            {activeSlide === 3 ? (
              <div className="flex flex-wrap items-center gap-4 pt-4">
                <Link
                  href="/app?tab=stage"
                  className="inline-flex items-center justify-center rounded-full bg-[#ffc53d] hover:bg-[#ffd875] px-8 py-4 font-mono text-xs uppercase tracking-widest text-[#070709] font-bold transition-all duration-200 hover:scale-[1.02] shadow-[0_0_28px_rgba(255,197,61,0.35)]"
                >
                  Take The Stage
                </Link>
                <Link
                  href="/app?tab=vault"
                  className="inline-flex items-center justify-center rounded-full border border-white/20 hover:border-white/50 bg-[#12121a]/80 px-6 py-4 font-mono text-xs uppercase tracking-widest text-zinc-200 backdrop-blur-md transition-all duration-200 hover:text-white"
                >
                  Explore Joke Vault
                </Link>
              </div>
            ) : activeSlide === 0 ? (
              <div className="flex flex-wrap items-center gap-4 pt-4">
                <Link
                  href="/app?tab=stage"
                  className="inline-flex items-center justify-center rounded-full bg-[#ffc53d] hover:bg-[#ffd875] px-8 py-4 font-mono text-xs uppercase tracking-widest text-[#070709] font-bold transition-all duration-200 hover:scale-[1.02] shadow-[0_0_28px_rgba(255,197,61,0.35)]"
                >
                  Launch App · Take The Stage
                </Link>
                <Link
                  href="/app?tab=vault"
                  className="inline-flex items-center justify-center rounded-full border border-white/20 hover:border-white/50 bg-[#12121a]/80 px-6 py-4 font-mono text-xs uppercase tracking-widest text-zinc-300 backdrop-blur-md transition-all duration-200 hover:text-white"
                >
                  Explore Vault
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
