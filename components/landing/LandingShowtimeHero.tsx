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

    // 4. THE STRAIGHT MAN STATUE IN FULL CAST BRONZE
    const bronze = new THREE.MeshStandardMaterial({
      color: 0xc08a52,
      roughness: 0.42,
      metalness: 0.92,
      envMap: envTex,
      envMapIntensity: 0.55,
    });
    const darkMetal = new THREE.MeshStandardMaterial({
      color: 0x3a2a1c,
      roughness: 0.38,
      metalness: 0.95,
      envMap: envTex,
      envMapIntensity: 0.4,
    });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x020202,
      roughness: 0.06,
      metalness: 0.2,
      envMap: envTex,
      envMapIntensity: 1,
    });
    const lamp = new THREE.MeshBasicMaterial({ color: 0xfff2dc, toneMapped: false });
    const amber = new THREE.MeshBasicMaterial({ color: 0xffb13b, toneMapped: false });
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
    mesh(new THREE.CylinderGeometry(1.35, 1.42, 0.16, 96), darkMetal, statue, 0, 0.08, 0);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(1.36, 0.01, 6, 160), amber);
    lip.rotation.x = Math.PI / 2;
    lip.position.y = 0.16;
    statue.add(lip);

    const rig = new THREE.Group();
    rig.position.y = 0.16;
    statue.add(rig);

    // Stool
    mesh(new THREE.CylinderGeometry(0.52, 0.5, 0.09, 48), darkMetal, rig, 0, 1.0, 0);
    for (let i = 0; i < 3; i++) {
      const a = i * 2.094 + 0.5;
      limb([Math.cos(a) * 0.36, 0.97, Math.sin(a) * 0.36], [Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5], 0.025, darkMetal, rig);
    }
    const ring = mesh(new THREE.TorusGeometry(0.43, 0.018, 8, 64), darkMetal, rig, 0, 0.38, 0);
    ring.rotation.x = Math.PI / 2;

    // Bot Lower Body & Legs
    const bot = new THREE.Group();
    rig.add(bot);
    mesh(new THREE.CylinderGeometry(0.4, 0.44, 0.18, 40), darkMetal, bot, 0, 1.15, 0);
    for (const s of [-1, 1]) {
      limb([s * 0.22, 1.12, 0.02], [s * 0.28, 1.1, 0.66], 0.12, bronze, bot);
      mesh(new THREE.SphereGeometry(0.135, 24, 16), darkMetal, bot, s * 0.28, 1.1, 0.68);
      limb([s * 0.29, 1.08, 0.7], [s * 0.31, 0.16, 0.8], 0.095, bronze, bot);
      mesh(new THREE.BoxGeometry(0.24, 0.11, 0.4), darkMetal, bot, s * 0.31, 0.07, 0.9);
    }

    // Torso
    const torso = new THREE.Group();
    torso.position.y = 1.2;
    bot.add(torso);
    mesh(new THREE.CylinderGeometry(0.6, 0.45, 1.0, 64), bronze, torso, 0, 0.5, 0);
    const collar = mesh(new THREE.TorusGeometry(0.33, 0.055, 12, 48), darkMetal, torso, 0, 1.0, 0);
    collar.rotation.x = Math.PI / 2;

    const chest = new THREE.MeshBasicMaterial({ color: 0xffb13b, toneMapped: false });
    const cl = mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 24), chest, torso, 0, 0.62, 0.565);
    cl.rotation.x = Math.PI / 2 - 0.13;

    for (const s of [-1, 1]) {
      mesh(new THREE.SphereGeometry(0.17, 24, 16), bronze, torso, s * 0.64, 0.88, 0);
      limb([s * 0.7, 0.85, 0], [s * 0.74, 0.32, 0.28], 0.085, darkMetal, torso);
      mesh(new THREE.SphereGeometry(0.1, 16, 12), bronze, torso, s * 0.74, 0.32, 0.28);
      limb([s * 0.74, 0.32, 0.28], [s * 0.38, -0.02, 0.62], 0.075, darkMetal, torso);
      mesh(new THREE.SphereGeometry(0.115, 20, 14), bronze, torso, s * 0.36, -0.04, 0.64);
    }
    mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.26, 20), darkMetal, torso, 0, 1.12, 0);

    // Head
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
      bevelSegments: 6,
      curveSegments: 18,
    });
    hg.center();
    mesh(hg, bronze, head);

    const faceZ = 0.4 + 0.09 + 0.004;
    mesh(new THREE.ShapeGeometry(rounded(1.2, 0.78, 0.24), 18), glass, head, 0, 0, faceZ);

    const eyes = new THREE.Group();
    eyes.position.set(0, 0.07, faceZ + 0.01);
    head.add(eyes);

    const eg = new THREE.SphereGeometry(0.085, 24, 16);
    const eyeL = mesh(eg, lamp, eyes, -0.26, 0, 0);
    const eyeR = mesh(eg, lamp, eyes, 0.26, 0, 0);
    [eyeL, eyeR].forEach((e) => {
      e.scale.set(1, 1.3, 0.3);
      e.castShadow = false;
    });

    const mouth = new THREE.Group();
    mouth.position.set(0, -0.18, faceZ + 0.01);
    head.add(mouth);
    const mg = new THREE.BoxGeometry(0.21, 0.034, 0.02);
    mesh(mg, lamp, mouth, -0.105, 0, 0);
    const mouthR = new THREE.Group();
    mouth.add(mouthR);
    mesh(mg, lamp, mouthR, 0.105, 0, 0);

    for (const s of [-1, 1]) {
      const ear = mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.14, 32), darkMetal, head, s * 0.86, 0, 0);
      ear.rotation.z = Math.PI / 2;
      const er = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.016, 8, 40), amber);
      er.position.set(s * 0.935, 0, 0);
      er.rotation.y = Math.PI / 2;
      head.add(er);
    }

    mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.4, 10), darkMetal, head, 0, 0.82, 0);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffb13b, toneMapped: false });
    mesh(new THREE.SphereGeometry(0.075, 20, 14), bulbMat, head, 0, 1.05, 0).castShadow = false;
    const bulbLight = new THREE.PointLight(0xffb13b, 1.2, 3, 2);
    bulbLight.position.set(0, 1.05, 0);
    head.add(bulbLight);

    // Mic Stand on Stage
    const mic = new THREE.Group();
    mic.position.set(1.0, 0, 0.75);
    rig.add(mic);
    mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.04, 40), darkMetal, mic, 0, 0.02, 0);
    limb([0, 0, 0], [0, 2.0, 0], 0.022, darkMetal, mic);
    limb([0, 1.95, 0], [-0.42, 2.32, 0.05], 0.016, darkMetal, mic);
    limb([-0.42, 2.32, 0.05], [-0.52, 2.4, 0.1], 0.045, darkMetal, mic);
    mesh(new THREE.SphereGeometry(0.085, 18, 12), bronze, mic, -0.56, 2.44, 0.12);
    const gw = new THREE.Mesh(
      new THREE.SphereGeometry(0.088, 12, 8),
      new THREE.MeshBasicMaterial({
        color: 0xffb13b,
        wireframe: true,
        transparent: true,
        opacity: 0.5,
        toneMapped: false,
      }),
    );
    gw.position.set(-0.56, 2.44, 0.12);
    mic.add(gw);

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
      eyeL.scale.y = eyeR.scale.y = 1.3 * (1 - Math.min(1, st.blink * 1.2)) + 0.06;
      eyes.position.x = st.hYaw * 0.05;
      st.smile = Math.max(0, st.smile - dt * 0.45);
      mouthR.rotation.z = Math.sin(Math.min(1, st.smile) * Math.PI) * 0.22;
      const pulse = 0.8 + 0.2 * (Math.sin(time * 2.2) * 0.5 + 0.5);
      chest.color.setRGB(1 * pulse, 0.69 * pulse, 0.23 * pulse);
      bulbLight.intensity = 1 + st.boost * 4;

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
                    <div className="font-mono text-xs uppercase tracking-[0.24em] text-[#ffc53d] font-semibold mb-2.5 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rotate-45 bg-[#ffc53d] inline-block" />
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
