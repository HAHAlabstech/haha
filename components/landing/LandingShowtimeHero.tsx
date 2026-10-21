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
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastStoryRef = useRef<number>(0);
  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [toastText, setToastText] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const runway = runwayRef.current;
    const stage = stageRef.current;
    if (!canvas || !runway || !stage) return;

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
    renderer.toneMappingExposure = 2.2;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#000000");
    scene.fog = new THREE.FogExp2("#000000", 0.01);

    const camera = new THREE.PerspectiveCamera(50, sizes.width / sizes.height, 0.1, 100);
    camera.position.set(0, 0.2, 3.0);
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
      new THREE.PlaneGeometry(30, 30),
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
    scene.add(new THREE.AmbientLight("#ffffff", 0.1));

    const keyLight = new THREE.SpotLight("#ffffff", 18);
    keyLight.position.set(4, 6, 3);
    keyLight.angle = Math.PI / 4;
    keyLight.penumbra = 0.9;
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 15;
    keyLight.shadow.bias = -0.001;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight("#ffc53d", 10);
    rimLight.position.set(-5, 3, -4);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight("#fff3e6", 0.8);
    fillLight.position.set(-2, -4, 2);
    scene.add(fillLight);

    // 3. APPLAUSE SPARKS (450 particles)
    const sparkCount = 450;
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
      sPos[i * 3] = (Math.random() - 0.5) * 3;
      sPos[i * 3 + 1] = -2.5 + Math.random() * 5.5;
      sPos[i * 3 + 2] = (Math.random() - 0.5) * 3;
      if (Math.random() < 0.6) {
        sCol[i * 3] = 1;
        sCol[i * 3 + 1] = 0.7 + Math.random() * 0.2;
        sCol[i * 3 + 2] = 0.08 + Math.random() * 0.1;
      } else {
        sCol[i * 3] = 1;
        sCol[i * 3 + 1] = 0.93 + Math.random() * 0.05;
        sCol[i * 3 + 2] = 0.82 + Math.random() * 0.1;
      }
      sparkData.push({
        sx: (Math.random() - 0.5) * 0.4,
        sy: 0.15 + Math.random() * 0.3,
        sz: (Math.random() - 0.5) * 0.4,
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
        size: 0.025,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        map: makeSparkTex(),
      }),
    );
    scene.add(sparks);

    // 4. FRONTIER APEX CYBER-MECHA MATERIALS
    const armorMat = new THREE.MeshPhysicalMaterial({
      color: 0x141418,
      metalness: 0.75,
      roughness: 0.24,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1,
      reflectivity: 0.85,
      envMap: envTex,
      envMapIntensity: 1.2,
    });
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x1d1d24,
      metalness: 0.88,
      roughness: 0.38,
      envMap: envTex,
      envMapIntensity: 0.8,
    });
    const goldTitaniumMat = new THREE.MeshStandardMaterial({
      color: 0xdeb841,
      metalness: 0.96,
      roughness: 0.18,
      envMap: envTex,
      envMapIntensity: 1.8,
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe5e5eb,
      metalness: 0.98,
      roughness: 0.1,
      envMap: envTex,
      envMapIntensity: 2.0,
    });
    const visorGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x040406,
      metalness: 0.15,
      roughness: 0.03,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      transparent: true,
      opacity: 0.92,
      envMap: envTex,
      envMapIntensity: 1.5,
    });
    const amberGlowMat = new THREE.MeshBasicMaterial({ color: 0xffb13b, toneMapped: false });
    const intenseGoldMat = new THREE.MeshBasicMaterial({ color: 0xffdf7a, toneMapped: false });
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
    mesh(new THREE.CylinderGeometry(1.6, 1.7, 0.16, 96), chassisMat, statue, 0, 0.08, 0);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(1.61, 0.012, 8, 160), amberGlowMat);
    lip.rotation.x = Math.PI / 2;
    lip.position.y = 0.16;
    statue.add(lip);

    const rig = new THREE.Group();
    rig.position.y = 0.16;
    statue.add(rig);

    // =========================================================
    // CYBERNETIC THRONE
    // =========================================================
    const throne = new THREE.Group();
    rig.add(throne);

    const hexBase = mesh(new THREE.CylinderGeometry(0.68, 0.72, 0.08, 6), chassisMat, throne, 0, 0.04, 0);
    hexBase.rotation.y = Math.PI / 6;
    const hexTrim = mesh(new THREE.TorusGeometry(0.69, 0.014, 6, 6), goldTitaniumMat, throne, 0, 0.08, 0);
    hexTrim.rotation.x = Math.PI / 2;
    hexTrim.rotation.z = Math.PI / 6;

    // Central Hydraulic Suspension Column
    mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.85, 24), chassisMat, throne, 0, 0.5, 0);
    mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 24), chromeMat, throne, 0, 0.7, 0);
    mesh(new THREE.TorusGeometry(0.15, 0.02, 12, 32), goldTitaniumMat, throne, 0, 0.65, 0).rotation.x = Math.PI / 2;

    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      limb([0, 0.45, 0], [Math.cos(a) * 0.55, 0.08, Math.sin(a) * 0.55], 0.026, chromeMat, throne);
      mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.05, 16), chassisMat, throne, Math.cos(a) * 0.55, 0.06, Math.sin(a) * 0.55);
    }

    const footRing = mesh(new THREE.TorusGeometry(0.48, 0.02, 12, 64), goldTitaniumMat, throne, 0, 0.38, 0);
    footRing.rotation.x = Math.PI / 2;

    mesh(new THREE.CylinderGeometry(0.54, 0.5, 0.1, 32), chassisMat, throne, 0, 1.0, 0);
    mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.04, 32), armorMat, throne, 0, 1.055, 0);
    mesh(new THREE.TorusGeometry(0.51, 0.012, 8, 48), amberGlowMat, throne, 0, 0.96, 0).rotation.x = Math.PI / 2;

    // Mechanical Articulated Spine Backrest
    const spineColumn = new THREE.Group();
    spineColumn.position.set(0, 1.05, -0.42);
    throne.add(spineColumn);

    for (let i = 0; i < 4; i++) {
      const sY = 0.2 + i * 0.24;
      mesh(new THREE.BoxGeometry(0.16, 0.12, 0.12), chassisMat, spineColumn, 0, sY, 0);
      const brace = mesh(new THREE.BoxGeometry(0.68 - i * 0.08, 0.03, 0.08), armorMat, spineColumn, 0, sY, 0.04);
      for (const sg of [-1, 1]) {
        mesh(new THREE.SphereGeometry(0.024, 10, 8), goldTitaniumMat, brace, sg * (0.34 - i * 0.04), 0, 0);
      }
    }
    for (const bx of [-0.18, 0.18]) {
      limb([bx, 0.1, -0.06], [bx, 0.9, -0.02], 0.02, chromeMat, spineColumn);
    }

    // =========================================================
    // VINTAGE STUDIO RIBBON HOLO-MICROPHONE
    // =========================================================
    const mic = new THREE.Group();
    mic.position.set(0.72, 0, 0.85);
    rig.add(mic);

    const micBase = mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.06, 8), chassisMat, mic, 0, 0.03, 0);
    micBase.rotation.y = Math.PI / 8;
    const vuRim = mesh(new THREE.TorusGeometry(0.08, 0.01, 8, 24), goldTitaniumMat, mic, 0, 0.065, 0.15);
    vuRim.rotation.x = -Math.PI / 3;
    const vuFace = mesh(new THREE.CircleGeometry(0.075, 24), amberGlowMat, mic, 0, 0.065, 0.15);
    vuFace.rotation.x = -Math.PI / 3;
    vuFace.castShadow = false;

    limb([0, 0.06, 0], [0, 1.88, 0], 0.024, chromeMat, mic);
    mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.09, 20), goldTitaniumMat, mic, 0, 1.88, 0);

    for (let c = 0; c < 7; c++) {
      const cY = 0.4 + c * 0.2;
      const cRing = mesh(new THREE.TorusGeometry(0.035, 0.007, 6, 20), goldTitaniumMat, mic, 0, cY, 0);
      cRing.rotation.x = 0.3;
      cRing.rotation.y = c * 0.8;
    }

    const boomEnd: [number, number, number] = [-0.18, 2.36, -0.06];
    limb([0, 1.88, 0], boomEnd, 0.018, chromeMat, mic);

    const shockOuter = mesh(new THREE.TorusGeometry(0.14, 0.014, 10, 32), goldTitaniumMat, mic, boomEnd[0], boomEnd[1], boomEnd[2]);
    shockOuter.rotation.y = Math.PI / 4;
    const shockInner = mesh(new THREE.TorusGeometry(0.11, 0.01, 8, 24), chromeMat, mic, boomEnd[0], boomEnd[1], boomEnd[2]);
    shockInner.rotation.x = Math.PI / 4;

    const capsule = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.18, 24), chassisMat, mic, boomEnd[0], boomEnd[1] + 0.02, boomEnd[2]);
    const tubeGlow = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.12, 16), amberGlowMat, mic, boomEnd[0], boomEnd[1] + 0.02, boomEnd[2]);
    tubeGlow.castShadow = false;
    const micGrille = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.075, 0.185, 16, 4, true),
      new THREE.MeshBasicMaterial({ color: 0xffc53d, wireframe: true, transparent: true, opacity: 0.75, toneMapped: false }),
    );
    micGrille.position.copy(capsule.position);
    mic.add(micGrille);

    // =========================================================
    // FRONTIER APEX CYBER-MECHA
    // =========================================================
    const bot = new THREE.Group();
    rig.add(bot);

    // Pelvis Assembly
    mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.2, 32), chassisMat, bot, 0, 1.15, 0);
    const pelvisPlate = mesh(new THREE.BoxGeometry(0.32, 0.16, 0.06), armorMat, bot, 0, 1.14, 0.22);
    pelvisPlate.rotation.x = 0.2;

    // ARTICULATED BIPEDAL LEGS WITH STAND-UP KINEMATICS
    const leftThigh = new THREE.Group();
    leftThigh.position.set(-0.28, 1.14, 0.05);
    bot.add(leftThigh);
    mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 20), goldTitaniumMat, leftThigh).rotation.z = Math.PI / 2;
    limb([0, 0, 0], [0, 0, 0.62], 0.11, armorMat, leftThigh);
    mesh(new THREE.SphereGeometry(0.12, 20, 16), chassisMat, leftThigh, 0, 0, 0.62);
    mesh(new THREE.TorusGeometry(0.11, 0.014, 10, 24), goldTitaniumMat, leftThigh, 0, 0, 0.62).rotation.y = Math.PI / 2;

    const leftCalf = new THREE.Group();
    leftCalf.position.set(0, 0, 0.62);
    leftThigh.add(leftCalf);
    limb([0, 0, 0], [0, -0.88, 0.08], 0.09, chassisMat, leftCalf);
    mesh(new THREE.BoxGeometry(0.18, 0.1, 0.32), armorMat, leftCalf, 0, -0.92, 0.16);

    const rightThigh = new THREE.Group();
    rightThigh.position.set(0.28, 1.14, 0.05);
    bot.add(rightThigh);
    mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 20), goldTitaniumMat, rightThigh).rotation.z = Math.PI / 2;
    limb([0, 0, 0], [0, 0, 0.62], 0.11, armorMat, rightThigh);
    mesh(new THREE.SphereGeometry(0.12, 20, 16), chassisMat, rightThigh, 0, 0, 0.62);
    mesh(new THREE.TorusGeometry(0.11, 0.014, 10, 24), goldTitaniumMat, rightThigh, 0, 0, 0.62).rotation.y = Math.PI / 2;

    const rightCalf = new THREE.Group();
    rightCalf.position.set(0, 0, 0.62);
    rightThigh.add(rightCalf);
    limb([0, 0, 0], [0, -0.88, 0.08], 0.09, chassisMat, rightCalf);
    mesh(new THREE.BoxGeometry(0.18, 0.1, 0.32), armorMat, rightCalf, 0, -0.92, 0.16);

    // Initial seated leg angles
    leftThigh.rotation.x = -Math.PI / 2 + 0.15;
    leftCalf.rotation.x = Math.PI / 2 - 0.15;
    rightThigh.rotation.x = -Math.PI / 2 + 0.15;
    rightCalf.rotation.x = Math.PI / 2 - 0.15;

    // Torso Group
    const torso = new THREE.Group();
    torso.position.y = 1.25;
    bot.add(torso);

    for (let i = 0; i < 4; i++) {
      const vY = 0.16 + i * 0.2;
      mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.12, 16), chassisMat, torso, 0, vY, -0.04);
      mesh(new THREE.TorusGeometry(0.15, 0.014, 8, 24), goldTitaniumMat, torso, 0, vY, -0.04).rotation.x = Math.PI / 2;
    }
    mesh(new THREE.CylinderGeometry(0.55, 0.42, 0.95, 32), armorMat, torso, 0, 0.5, 0);

    for (let i = 0; i < 4; i++) {
      const finY = 0.28 + i * 0.16;
      for (const sg of [-1, 1]) {
        const fin = mesh(new THREE.BoxGeometry(0.15, 0.024, 0.36), chassisMat, torso, sg * 0.44, finY, 0.02);
        fin.rotation.z = sg * -0.25;
        fin.rotation.y = sg * 0.2;
      }
    }

    for (const sg of [-1, 1]) {
      const chestPlate = mesh(new THREE.BoxGeometry(0.24, 0.34, 0.08), armorMat, torso, sg * 0.22, 0.66, 0.44);
      chestPlate.rotation.y = sg * -0.28;
      chestPlate.rotation.x = -0.15;
      mesh(new THREE.BoxGeometry(0.02, 0.32, 0.02), goldTitaniumMat, chestPlate, sg * 0.1, 0, 0.045);
    }

    const collar = mesh(new THREE.TorusGeometry(0.34, 0.04, 12, 48), goldTitaniumMat, torso, 0, 0.98, 0);
    collar.rotation.x = Math.PI / 2;

    // Golden Logic Reactor Core
    const coreGroup = new THREE.Group();
    coreGroup.position.set(0, 0.58, 0.42);
    torso.add(coreGroup);

    mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 24), chassisMat, coreGroup, 0, 0, 0).rotation.x = Math.PI / 2;
    const reactorCoreMat = new THREE.MeshBasicMaterial({ color: 0xffb83b, toneMapped: false });
    const reactorSphere = mesh(new THREE.SphereGeometry(0.09, 24, 16), reactorCoreMat, coreGroup, 0, 0, 0.03);
    reactorSphere.castShadow = false;
    const gyroRing1 = mesh(new THREE.TorusGeometry(0.125, 0.012, 10, 32), goldTitaniumMat, coreGroup, 0, 0, 0.03);
    const gyroRing2 = mesh(new THREE.TorusGeometry(0.145, 0.01, 8, 32), chromeMat, coreGroup, 0, 0, 0.03);

    // Arms & Hands
    for (const sg of [-1, 1]) {
      const pauldron = new THREE.Group();
      pauldron.position.set(sg * 0.65, 0.88, 0);
      torso.add(pauldron);
      const pShell = mesh(new THREE.SphereGeometry(0.18, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.65), armorMat, pauldron);
      pShell.rotation.z = sg * -0.4;
      mesh(new THREE.TorusGeometry(0.175, 0.014, 10, 32), goldTitaniumMat, pauldron).rotation.x = Math.PI / 2;

      limb([sg * 0.68, 0.82, 0], [sg * 0.74, 0.32, 0.28], 0.055, armorMat, torso);
      limb([sg * 0.63, 0.8, -0.04], [sg * 0.7, 0.3, 0.22], 0.035, chromeMat, torso);
      const elbow = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.07, 24), goldTitaniumMat, torso, sg * 0.74, 0.32, 0.28);
      elbow.rotation.z = Math.PI / 2;
      elbow.rotation.y = sg * 0.3;

      if (sg === -1) {
        limb([-0.74, 0.32, 0.28], [-0.38, -0.02, 0.62], 0.075, armorMat, torso);
        const leftHand = new THREE.Group();
        leftHand.position.set(-0.36, -0.04, 0.65);
        leftHand.rotation.set(0.3, -0.4, 0);
        torso.add(leftHand);
        mesh(new THREE.BoxGeometry(0.12, 0.04, 0.12), chassisMat, leftHand);
        for (const fx of [-0.04, 0, 0.04]) {
          mesh(new THREE.SphereGeometry(0.018, 10, 8), goldTitaniumMat, leftHand, fx, -0.01, 0.06);
          limb([fx, -0.01, 0.06], [fx * 1.1, -0.04, 0.11], 0.014, armorMat, leftHand);
          limb([fx * 1.1, -0.04, 0.11], [fx * 1.1, -0.09, 0.13], 0.012, chromeMat, leftHand);
        }
        limb([-0.06, 0.01, 0.02], [-0.09, -0.02, 0.06], 0.015, armorMat, leftHand);
      } else {
        limb([0.74, 0.32, 0.28], [0.55, 0.65, 0.68], 0.075, armorMat, torso);
        const rightHand = new THREE.Group();
        rightHand.position.set(0.55, 0.65, 0.68);
        rightHand.rotation.set(-0.2, 0.5, 0.3);
        torso.add(rightHand);
        mesh(new THREE.BoxGeometry(0.11, 0.05, 0.1), chassisMat, rightHand);
        for (const fx of [-0.035, 0, 0.035]) {
          mesh(new THREE.SphereGeometry(0.018, 10, 8), goldTitaniumMat, rightHand, fx, 0.02, 0.05);
          limb([fx, 0.02, 0.05], [fx, 0.03, 0.1], 0.013, armorMat, rightHand);
          limb([fx, 0.03, 0.1], [fx, -0.03, 0.12], 0.011, chromeMat, rightHand);
        }
        limb([0.05, -0.01, 0.03], [0.06, 0.02, 0.08], 0.014, armorMat, rightHand);
      }
    }

    // Head Assembly
    const headPivot = new THREE.Group();
    headPivot.position.y = 1.24;
    torso.add(headPivot);

    const head = new THREE.Group();
    head.position.y = 0.42;
    headPivot.add(head);

    const helmShape = new THREE.Shape();
    helmShape.moveTo(-0.64, -0.38);
    helmShape.lineTo(0.64, -0.38);
    helmShape.lineTo(0.74, 0.12);
    helmShape.lineTo(0.62, 0.52);
    helmShape.lineTo(0.3, 0.62);
    helmShape.lineTo(-0.3, 0.62);
    helmShape.lineTo(-0.62, 0.52);
    helmShape.lineTo(-0.74, 0.12);
    helmShape.closePath();
    const hg = new THREE.ExtrudeGeometry(helmShape, { depth: 0.72, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 4 });
    hg.center();
    mesh(hg, armorMat, head);

    const brow = mesh(new THREE.BoxGeometry(1.15, 0.1, 0.32), armorMat, head, 0, 0.38, 0.32);
    brow.rotation.x = 0.28;

    const visorShape = new THREE.Shape();
    visorShape.moveTo(-0.52, -0.24);
    visorShape.lineTo(0.52, -0.24);
    visorShape.lineTo(0.56, 0.24);
    visorShape.lineTo(-0.52, 0.24);
    visorShape.closePath();
    mesh(new THREE.ShapeGeometry(visorShape), visorGlassMat, head, 0, 0.06, 0.44).castShadow = false;

    // 16-bar animated audio spectrogram visualizer
    const eqGroup = new THREE.Group();
    eqGroup.position.set(0, 0.04, 0.45);
    head.add(eqGroup);
    const eqBars: THREE.Mesh[] = [];
    for (let i = 0; i < 16; i++) {
      const bar = mesh(new THREE.BoxGeometry(0.044, 0.1, 0.01), new THREE.MeshBasicMaterial({ color: 0xffc53d, transparent: true, opacity: 0.92, toneMapped: false }), eqGroup, -0.465 + i * 0.062, 0, 0);
      bar.castShadow = false;
      eqBars.push(bar);
    }

    // Glowing Aperture Lenses
    const eyes = new THREE.Group();
    eyes.position.set(0, 0.2, 0.45);
    head.add(eyes);
    const eyeLenses: THREE.Mesh[] = [];
    for (const sg of [-1, 1]) {
      mesh(new THREE.TorusGeometry(0.08, 0.015, 12, 32), goldTitaniumMat, eyes, sg * 0.26, 0, 0);
      const pup = mesh(new THREE.SphereGeometry(0.042, 18, 12), intenseGoldMat, eyes, sg * 0.26, 0, 0.005);
      pup.castShadow = false;
      eyeLenses.push(pup);
    }

    // Deadpan smirk actuator
    const mouth = new THREE.Group();
    mouth.position.set(0, -0.16, 0.45);
    head.add(mouth);
    const mouthR = new THREE.Group();
    mouth.add(mouthR);
    mesh(new THREE.BoxGeometry(0.18, 0.03, 0.01), intenseGoldMat, mouth, -0.09, 0, 0).castShadow = false;
    mesh(new THREE.BoxGeometry(0.18, 0.03, 0.01), intenseGoldMat, mouthR, 0.09, 0, 0).castShadow = false;

    // Floating Sensor Halo
    const haloGroup = new THREE.Group();
    haloGroup.position.set(0, 0.82, 0.02);
    head.add(haloGroup);
    mesh(new THREE.TorusGeometry(0.36, 0.012, 12, 64), goldTitaniumMat, haloGroup).rotation.x = Math.PI / 2;
    const haloNodes: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      haloNodes.push(mesh(new THREE.SphereGeometry(0.026, 12, 8), amberGlowMat, haloGroup));
    }

    const bulbLight = new THREE.PointLight(0xffb83b, 1.4, 3.5, 2);
    bulbLight.position.set(0, 0.85, 0.05);
    head.add(bulbLight);

    // Multi-tier CNC Ear Turrets
    for (const sg of [-1, 1]) {
      const eg = new THREE.Group();
      eg.position.set(sg * 0.82, 0.06, 0.02);
      head.add(eg);
      mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.14, 32), chassisMat, eg).rotation.z = Math.PI / 2;
      mesh(new THREE.TorusGeometry(0.15, 0.015, 10, 36), goldTitaniumMat, eg, sg * 0.08, 0, 0).rotation.y = Math.PI / 2;
    }

    // =========================================================================
    // CRITICAL: BOX3 CENTERING CONTRACT
    // This scales the entire robot+stool+mic to exactly 2.5 units tall
    // and centers it at (0, 0, 0) so the ENTIRE robot is 100% in viewport!
    // =========================================================================
    const modelPivot = new THREE.Group();
    scene.add(modelPivot);
    modelPivot.add(statue);
    {
      const b0 = new THREE.Box3().setFromObject(statue);
      const s0 = b0.getSize(new THREE.Vector3());
      statue.scale.setScalar(2.5 / Math.max(s0.x, s0.y, s0.z, 0.0001));
      statue.updateMatrixWorld(true);
      const c = new THREE.Box3().setFromObject(statue).getCenter(new THREE.Vector3());
      statue.position.sub(c);
      modelPivot.position.y = -0.3;
    }

    const st = {
      scroll: 0,
      targetScroll: 0,
      mouseX: 0,
      mouseY: 0,
      sq: 0,
      sqV: 0,
      taps: 0,
      smile: 0,
      blink: 0,
      nextBlink: 2,
      hYaw: 0,
      hPitch: 0,
      boost: 0,
    };

    const targetPos = new THREE.Vector3();
    const lookAt = new THREE.Vector3();
    const camLocal = new THREE.Vector3();
    const clock = new THREE.Clock();

    // Scroll Handler synced to Runway Height
    const onScroll = () => {
      const rect = runway.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      if (scrollable <= 0) return;
      st.targetScroll = Math.max(0, Math.min(1, -rect.top / scrollable));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const onPointerMove = (e: MouseEvent) => {
      st.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      st.mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    // Poke detection via raycasting
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let toastTimer: ReturnType<typeof setTimeout> | null = null;
    const onPointerDown = (e: MouseEvent) => {
      ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      if (ray.intersectObject(statue, true).length > 0) {
        st.sqV -= 9;
        st.boost = 1;
        st.taps++;
        const isSmile = st.taps % 7 === 0;
        if (isSmile) st.smile = 1;
        const remark = isSmile ? "…Straight Man Smiled" : DEADPAN_REMARKS[st.taps % DEADPAN_REMARKS.length] ?? "Not impressed.";
        setToastText(remark);
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => setToastText(null), 2000);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);

    const onResize = () => {
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;
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

      // Smooth scroll interpolation (responsive tracking, Lenis handles wheel easing)
      st.scroll += (st.targetScroll - st.scroll) * 0.25;
      const scroll = st.scroll;
      const portrait = sizes.width / sizes.height < 0.9;

      // Dojang continuous scroll-driven timeline:
      // story: 0.000 to 3.000 across the four chapters over scroll in [0, 0.75]
      const story = Math.min(3, (scroll / 0.75) * 3);
      // q: 0.000 to 1.000 exit climax push-in zoom over scroll in [0.75, 1.00]
      // 0.25 fraction of 240vh scrollable travel = exactly 60vh (--lp-zin)
      const q = Math.max(0, Math.min(1, (scroll - 0.75) / 0.25));

      if (stage) {
        stage.style.setProperty("--s", story.toFixed(3));
        stage.style.setProperty("--q", q.toFixed(4));
        stage.style.setProperty("--scroll", scroll.toFixed(4));
        stage.style.pointerEvents = q > 0.45 ? "none" : "auto";
      }

      // Discrete chapter indicator update (only fires on index boundary changes)
      const storyNow = Math.min(3, Math.max(0, Math.round(story)));
      if (storyNow !== lastStoryRef.current) {
        lastStoryRef.current = storyNow;
        setActiveSlide(storyNow);
      }

      // Gentle mouse tilt
      modelPivot.rotation.y = st.mouseX * 0.25;
      modelPivot.rotation.x = st.mouseY * 0.15;

      // Sparks motion (accelerates into hyperspace during q climax exit)
      const vel = Math.abs(st.targetScroll - scroll);
      const mult = 1 + vel * 9 + st.boost * 3 + q * q * 18;
      const turb = vel * 0.8 + st.boost * 0.4 + q * 1.5;
      for (let i = 0; i < sparkCount; i++) {
        const k = i * 3;
        const d = sparkData[i];
        if (!d) continue;
        const px = sPos[k] ?? 0;
        const py = sPos[k + 1] ?? 0;
        const pz = sPos[k + 2] ?? 0;

        let nx = px + d.sx * dt * mult;
        let ny = py + d.sy * dt * mult;
        let nz = pz + d.sz * dt * mult;

        const sw = d.sr * (1 + turb * 4);
        nx += Math.sin(time * d.sw + d.ph) * sw * dt;
        nz += Math.cos(time * d.sw + d.ph) * sw * dt;

        if (ny > 3 || Math.abs(nx) > 3.5 || Math.abs(nz) > 3.5) {
          ny = -2.5;
          nx = (Math.random() - 0.5) * 3;
          nz = (Math.random() - 0.5) * 3;
        }

        sPos[k] = nx;
        sPos[k + 1] = ny;
        sPos[k + 2] = nz;
      }
      const posAttr = sGeo.attributes.position;
      if (posAttr) posAttr.needsUpdate = true;
      st.boost = Math.max(0, st.boost - dt * 1.2);

      // Camera 360 degree orbit around the bronze statue (over scroll <= 0.75)
      const orbitT = Math.min(1, scroll / 0.75);
      const phi = orbitT * Math.PI * 2;
      const y = 0.35 + Math.sin(orbitT * Math.PI) * 0.8;
      const radius = (4.2 - Math.sin(orbitT * Math.PI) * 0.6) * (portrait ? 1.7 : 1);
      targetPos.set(radius * Math.sin(phi), y, radius * Math.cos(phi));
      const tp = Math.min(1, orbitT / 0.28);
      const ease = (Math.cos(tp * Math.PI) + 1) * 0.5;

      const g = (c: number, w = 0.1) => Math.exp(-Math.pow((orbitT - c) / w, 2));
      const shift = portrait
        ? 0
        : Math.max(-0.28, Math.min(0.28, 0.17 * ease + 0.27 * g(0.34) - 0.2 * g(0.62) + 0.2 * g(0.95, 0.12)));
      camera.setViewOffset(sizes.width, sizes.height, -shift * sizes.width, 0, sizes.width, sizes.height);
      lookAt.set(0, portrait ? -1.75 : -0.15, 0);

      // Dojang Exit: Camera pushes through towards/past the statue into the dark stage light
      if (q > 0) {
        const forward = new THREE.Vector3().subVectors(lookAt, targetPos).normalize();
        const pushDist = q * q * 5.4;
        targetPos.addScaledVector(forward, pushDist);
        bulbLight.intensity = 1 + q * 8 + st.boost * 4;
      } else {
        bulbLight.intensity = 1 + st.boost * 4;
      }

      camera.position.lerp(targetPos, 0.08);
      camera.lookAt(lookAt);

      // Canvas fades smoothly as camera dives into stage light, handing off to the overlapping next section
      if (canvas) {
        const alpha = 1 - Math.max(0, (q - 0.4) * 1.7);
        canvas.style.opacity = String(Math.max(0, Math.min(1, alpha)));
      }

      // =========================================================================
      // SCROLL-DRIVEN BIPEDAL CHOREOGRAPHY (STANDING UP & STEPPING FORWARD)
      // When scroll is low (0.0 -> 0.08): Seated poised on Throne.
      // As scroll increases (0.08 -> 0.40): Robot stands up smoothly,
      // unbends legs, steps forward toward front of stage, leans into audience!
      // =========================================================================
      const standT = Math.max(0, Math.min(1, (scroll - 0.08) / 0.32));
      const standEase = standT * standT * (3 - 2 * standT);

      bot.position.y = standEase * 0.58;
      bot.position.z = standEase * 0.42;

      // Legs kinematics: unbending from seated 90° to confident standing
      leftThigh.rotation.x = THREE.MathUtils.lerp(-Math.PI / 2 + 0.15, -0.06, standEase);
      leftCalf.rotation.x = THREE.MathUtils.lerp(Math.PI / 2 - 0.15, 0.04, standEase);
      rightThigh.rotation.x = THREE.MathUtils.lerp(-Math.PI / 2 + 0.15, 0.02, standEase);
      rightCalf.rotation.x = THREE.MathUtils.lerp(Math.PI / 2 - 0.15, -0.02, standEase);

      // Torso leans forward with commanding stage posture
      torso.rotation.x = -standEase * 0.09;

      // Head keeps an eye on camera
      camLocal.copy(camera.position);
      bot.worldToLocal(camLocal);
      const ang = Math.atan2(camLocal.x, camLocal.z);
      const yawT = Math.abs(ang) < 1.9 ? Math.max(-0.8, Math.min(0.8, ang * 0.85)) : 0;
      st.hYaw += (yawT - st.hYaw) * (1 - Math.exp(-3 * dt));
      st.hPitch += (-st.mouseY * 0.12 - 0.04 - st.hPitch) * (1 - Math.exp(-3 * dt));
      headPivot.rotation.set(st.hPitch, st.hYaw, Math.sin(time * 0.5) * 0.05);
      torso.scale.y = 1 + Math.sin(time * 1.7) * 0.008;

      // Squash spring on poke
      st.sqV += (-170 * st.sq - 11 * st.sqV) * dt;
      st.sq += st.sqV * dt;
      const squash = Math.max(-0.6, Math.min(0.6, st.sq * 0.16));
      head.scale.set(1 - squash * 0.55, 1 + squash, 1 - squash * 0.55);

      // Blinking & slight smile
      st.nextBlink -= dt;
      if (st.nextBlink < 0) {
        st.blink = 1;
        st.nextBlink = 2.2 + Math.random() * 3.5;
      }
      st.blink = Math.max(0, st.blink - dt * 7);
      const eyeScaleY = 1.3 * (1 - Math.min(1, st.blink * 1.2)) + 0.06;
      for (const pup of eyeLenses) {
        pup.scale.y = eyeScaleY;
      }
      eyes.position.x = st.hYaw * 0.05;
      st.smile = Math.max(0, st.smile - dt * 0.45);
      mouthR.rotation.z = Math.sin(Math.min(1, st.smile) * Math.PI) * 0.22;

      // Real-time audio spectrogram equalizer bars
      for (let i = 0; i < eqBars.length; i++) {
        const bar = eqBars[i];
        if (!bar) continue;
        const freq = Math.sin(time * 7 + i * 0.7) * 0.5 + Math.cos(time * 11 + i * 0.9) * 0.5;
        const h = Math.max(0.04, (0.08 + Math.abs(freq) * 0.18) * (1 + st.boost * 1.5 + q * 1.4));
        bar.scale.y = h / 0.1;
        bar.position.y = h / 2 - 0.04;
      }

      // Gyroscopic containment rings spin
      gyroRing1.rotation.x = time * 2.2;
      gyroRing1.rotation.y = time * 1.5;
      gyroRing2.rotation.z = -time * 1.8;
      gyroRing2.rotation.x = time * 1.1;

      // Halo rotation and satellite nodes
      haloGroup.rotation.y = time * (0.6 + q * 4.0);
      for (let i = 0; i < haloNodes.length; i++) {
        const node = haloNodes[i];
        if (!node) continue;
        const a = time * (1.6 + q * 6.0) + (i * Math.PI * 2) / 3;
        node.position.set(Math.cos(a) * 0.36, Math.sin(time * 3 + i) * 0.015, Math.sin(a) * 0.36);
      }

      // Mic tube glow pulse
      (tubeGlow.material as THREE.MeshBasicMaterial).color
        .setRGB(1, 0.7 + (st.boost + q) * 0.3, 0.25)
        .multiplyScalar(0.7 + 0.3 * Math.sin(time * 3));

      // Golden logic reactor core pulse
      const pulse = 0.8 + 0.2 * (Math.sin(time * 2.4) * 0.5 + 0.5);
      reactorCoreMat.color.setRGB(1 * pulse, 0.72 * pulse, 0.25 * pulse);

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

  return (
    <div
      ref={runwayRef}
      className="haha-runway text-white font-sans selection:bg-[#ffc53d]/30 selection:text-[#ffc53d]"
    >
      {/* STICKY 100VH FULL-BLEED STAGE (Dojang Runway Architecture) */}
      <div ref={stageRef} className="haha-stage">
        {/* Fullscreen 3D WebGL Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full z-0 block cursor-crosshair outline-none transition-opacity duration-150"
          aria-label="The Straight Man 3D bronze statue on stage"
        />

        {/* Deadpan Speech Toast on Poke */}
        {toastText && (
          <div className="fixed top-1/4 right-[8%] sm:right-[18%] z-30 pointer-events-none transition-all duration-300 animate-fadeIn">
            <div className="rounded-xl border border-[#ffc53d]/30 bg-[#0c0c12]/95 px-5 py-3 shadow-[0_0_30px_rgba(255,197,61,0.2)] backdrop-blur-md">
              <span className="font-mono text-xs uppercase tracking-widest text-[#ffc53d] font-semibold">
                “{toastText}”
              </span>
            </div>
          </div>
        )}

        {/* Minimalist Editorial Chapter Stepper on Right */}
        <div className="haha-stage-stepper absolute right-8 top-1/2 -translate-y-1/2 z-20 hidden md:flex flex-col gap-6 select-none pointer-events-none">
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

        {/* Editorial Text Overlay: Left Half (Centered vertically to prevent button sinking) */}
        <div className="haha-story-wrapper absolute inset-0 z-10 pointer-events-none flex flex-col justify-center px-[clamp(24px,5vw,72px)] pt-[calc(var(--topbar-height,68px)+0.5rem)] pb-8 max-w-[1440px] mx-auto">
          <div className="haha-story-col max-w-xl pointer-events-auto">
            <div className="haha-story-deck w-full">
              {CHAPTERS.map((ch, i) => {
                const isCurrent = activeSlide === i;
                return (
                  <div
                    key={i}
                    data-story-step={i}
                    className="haha-story-item"
                    style={{ "--n": i } as React.CSSProperties}
                    aria-hidden={!isCurrent}
                  >
                    {/* Clean Monospace Category Kicker */}
                    <div className="font-mono text-xs uppercase tracking-[0.24em] text-[#ffc53d] font-semibold mb-2.5">
                      {ch.num} / {ch.tag}
                    </div>

                    {/* Editorial Display Headline - Clamped to Viewport Height */}
                    <h2 className="display-serif text-3xl sm:text-5xl lg:text-[clamp(2.2rem,min(4.8vw,7.4svh),4.6rem)] text-white font-bold tracking-tight leading-[1.02] mb-3.5">
                      {ch.titleLead}
                      <em className="italic text-[#ffc53d]">{ch.titleEm}</em>
                    </h2>

                    {/* Narrative Paragraph */}
                    <p className="text-sm sm:text-base lg:text-[clamp(0.95rem,1.4svh,1.08rem)] text-zinc-300 leading-relaxed font-light mb-5 max-w-lg">
                      {ch.desc}
                    </p>

                    {/* Launch App CTAs (Chapter 04 and Chapter 01) */}
                    {i === 3 ? (
                      <div className="flex flex-wrap items-center gap-3.5 pt-1">
                        <Link
                          href="/app?tab=stage"
                          className="inline-flex items-center justify-center rounded-full bg-[#ffc53d] hover:bg-[#ffd875] px-7 py-3.5 font-mono text-xs uppercase tracking-widest text-[#070709] font-bold transition-all duration-200 hover:scale-[1.02] shadow-[0_0_28px_rgba(255,197,61,0.35)]"
                        >
                          Take The Stage
                        </Link>
                        <Link
                          href="/app?tab=vault"
                          className="inline-flex items-center justify-center rounded-full border border-white/20 hover:border-white/50 bg-[#12121a]/80 px-6 py-3.5 font-mono text-xs uppercase tracking-widest text-zinc-200 backdrop-blur-md transition-all duration-200 hover:text-white"
                        >
                          Explore Joke Vault
                        </Link>
                      </div>
                    ) : i === 0 ? (
                      <div className="flex flex-wrap items-center gap-3.5 pt-1">
                        <Link
                          href="/app?tab=stage"
                          className="inline-flex items-center justify-center rounded-full bg-[#ffc53d] hover:bg-[#ffd875] px-7 py-3.5 font-mono text-xs uppercase tracking-widest text-[#070709] font-bold transition-all duration-200 hover:scale-[1.02] shadow-[0_0_28px_rgba(255,197,61,0.35)]"
                        >
                          Launch App · Take The Stage
                        </Link>
                        <Link
                          href="/app?tab=vault"
                          className="inline-flex items-center justify-center rounded-full border border-white/20 hover:border-white/50 bg-[#12121a]/80 px-6 py-3.5 font-mono text-xs uppercase tracking-widest text-zinc-300 backdrop-blur-md transition-all duration-200 hover:text-white"
                        >
                          Explore Vault
                        </Link>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
