"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Mic, ArrowUpRight, Database, Sparkles } from "lucide-react";
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

export default function LandingShowtimeHero() {
  const runwayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [pokes, setPokes] = useState<{ id: number; x: number; y: number; text: string }[]>([]);

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
      const gr = g.createRadialGradient(8, 8, 0, 8, 8, 8);
      gr.addColorStop(0, "rgba(255,255,255,1)");
      gr.addColorStop(0.25, "rgba(255,255,255,.85)");
      gr.addColorStop(0.6, "rgba(255,255,255,.3)");
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, 16, 16);
      return new THREE.CanvasTexture(c);
    }
    const sGeo = new THREE.BufferGeometry();
    const sPos = new Float32Array(sparkCount * 3);
    const sCol = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount; i++) {
      sPos[i * 3] = (Math.random() - 0.5) * 6.5;
      sPos[i * 3 + 1] = (Math.random() - 0.5) * 5 - 0.5;
      sPos[i * 3 + 2] = (Math.random() - 0.5) * 6.5;
      if (Math.random() < 0.6) {
        sCol[i * 3] = 1;
        sCol[i * 3 + 1] = 0.5 + Math.random() * 0.2;
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

    const chest = new THREE.MeshBasicMaterial({ color: 0xffc53d, toneMapped: false });
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
    mesh(new THREE.SphereGeometry(0.085, 20, 16), amber, head, 0, 1.06, 0);

    // Microphone on Stage
    const mic = new THREE.Group();
    mic.position.set(0.68, 0, 0.85);
    statue.add(mic);
    mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.04, 32), darkMetal, mic, 0, 0.02, 0);
    limb([0, 0.02, 0], [0, 1.7, 0], 0.02, darkMetal, mic);
    mesh(new THREE.SphereGeometry(0.08, 16, 12), darkMetal, mic, 0, 1.7, 0);
    mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.24, 16), darkMetal, mic, -0.04, 1.8, 0).rotation.z = 0.4;
    mesh(new THREE.SphereGeometry(0.075, 20, 16), amber, mic, -0.09, 1.9, 0);
    const bulbLight = new THREE.PointLight("#ffc53d", 1.2, 3);
    bulbLight.position.set(-0.09, 1.9, 0);
    mic.add(bulbLight);

    statue.position.set(0, -1.2, 0);
    statue.scale.set(0.9, 0.9, 0.9);

    const modelPivot = new THREE.Group();
    modelPivot.add(statue);
    scene.add(modelPivot);

    const st = {
      targetScroll: 0,
      scroll: 0,
      hYaw: 0,
      hPitch: 0,
      blink: 0,
      nextBlink: 2,
      smile: 0,
      sq: 0,
      sqV: 0,
      mouseX: 0,
      mouseY: 0,
      boost: 0,
      taps: 0,
    };

    const targetPos = new THREE.Vector3();
    const camLocal = new THREE.Vector3();
    const lookAt = new THREE.Vector3();
    const clock = new THREE.Clock();

    // Scroll Handler synced to Runway Height
    const onScroll = () => {
      const rect = runway.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      if (scrollable <= 0) return;
      const s = Math.max(0, Math.min(1, -rect.top / scrollable));
      st.targetScroll = s;
      if (s < 0.24) setActiveSlide(0);
      else if (s < 0.5) setActiveSlide(1);
      else if (s < 0.76) setActiveSlide(2);
      else setActiveSlide(3);
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
    const onPointerDown = (e: MouseEvent) => {
      ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      if (ray.intersectObject(statue, true).length > 0) {
        st.sqV -= 9;
        st.boost = 1;
        st.taps++;
        const isSmile = st.taps % 7 === 0;
        if (isSmile) st.smile = 1;
        const newPoke = {
          id: Date.now() + Math.random(),
          x: e.clientX,
          y: e.clientY,
          text: isSmile ? "…Straight Man Smiled" : "?",
        };
        setPokes((prev) => [...prev, newPoke]);
        setTimeout(() => {
          setPokes((prev) => prev.filter((p) => p.id !== newPoke.id));
        }, 1300);
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

    // Pause rendering when runway scrolls completely out of view
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
      st.scroll += (st.targetScroll - st.scroll) * 0.05;
      const scroll = st.scroll;
      const portrait = sizes.width / sizes.height < 0.9;

      // Gentle mouse tilt
      modelPivot.rotation.y = st.mouseX * 0.25;
      modelPivot.rotation.x = st.mouseY * 0.15;

      // Sparks
      const vel = Math.abs(st.targetScroll - scroll);
      const mult = 1 + vel * 9 + st.boost * 3;
      const turb = vel * 0.8 + st.boost * 0.4;
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

      // Camera 360 degree orbit around the bronze statue
      const phi = scroll * Math.PI * 2;
      const y = 0.35 + Math.sin(scroll * Math.PI) * 0.8;
      const radius = (4.2 - Math.sin(scroll * Math.PI) * 0.6) * (portrait ? 1.7 : 1);
      targetPos.set(radius * Math.sin(phi), y, radius * Math.cos(phi));
      const tp = Math.min(1, scroll / 0.28);
      const ease = (Math.cos(tp * Math.PI) + 1) * 0.5;

      const g = (c: number, w = 0.1) => Math.exp(-Math.pow((scroll - c) / w, 2));
      const shift = portrait
        ? 0
        : Math.max(-0.28, Math.min(0.28, 0.17 * ease + 0.27 * g(0.34) - 0.2 * g(0.62) + 0.2 * g(0.95, 0.12)));
      camera.setViewOffset(sizes.width, sizes.height, -shift * sizes.width, 0, sizes.width, sizes.height);
      lookAt.set(0, portrait ? -1.75 : -0.15, 0);
      camera.position.lerp(targetPos, 0.05);
      camera.lookAt(lookAt);

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
      const q = Math.max(-0.6, Math.min(0.6, st.sq * 0.16));
      head.scale.set(1 - q * 0.55, 1 + q, 1 - q * 0.55);

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
      className="relative w-full h-[450vh] bg-black text-white font-sans selection:bg-[#ffc53d]/30 selection:text-[#ffc53d]"
    >
      {/* Dynamic Pokes Overlays */}
      {pokes.map((p) => (
        <div
          key={p.id}
          className="fixed z-50 pointer-events-none font-serif text-3xl font-bold text-[#ffc53d] animate-ping"
          style={{ left: p.x, top: p.y, transform: "translate(-50%, -50%)" }}
        >
          {p.text}
        </div>
      ))}

      {/* STICKY 100VH FULL-BLEED STAGE (Pins while scrolling 450vh runway) */}
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* Fullscreen 3D WebGL Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full z-0 block cursor-crosshair outline-none"
          aria-label="The Straight Man 3D bronze statue on stage. Scroll to orbit him 360 degrees, click to poke."
        />

        {/* Vertical Story Dashes Tracker */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3 pointer-events-none">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-1 rounded-full transition-all duration-300 ${
                activeSlide === idx
                  ? "bg-[#ffc53d] shadow-[0_0_12px_#ffc53d] h-12"
                  : "bg-white/20 h-8"
              }`}
            />
          ))}
        </div>

        {/* Pinned Editorial Slides Overlay */}
        <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-end p-[clamp(20px,4vw,56px)] pb-16 max-w-[1440px] mx-auto">
          {/* Slide 01: Tell a Joke */}
          {activeSlide === 0 && (
            <div className="max-w-2xl pointer-events-auto animate-fadeIn space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-white/10 bg-[#0c0c12]/80 backdrop-blur-md font-mono text-[10px] uppercase tracking-[0.24em] text-[#ffc53d]">
                <Sparkles className="w-3.5 h-3.5 text-[#ffc53d]" />
                <span>Chapter 01 · The Human Challenge</span>
              </div>
              <h1 className="display-serif text-5xl sm:text-7xl lg:text-8xl text-white font-bold tracking-tight leading-[0.95]">
                <SplitChars
                  parts={[
                    { text: "Tell a " },
                    { text: "Joke.", em: true },
                  ]}
                  active={activeSlide === 0}
                />
              </h1>
              <p className="text-base sm:text-lg text-zinc-300 leading-relaxed max-w-xl font-light">
                AI has ingested almost everything humanity ever wrote. But the most human nuances were never written down: the pause before "I'm fine", deadpan irony, and why a bit kills in one room and bombs in another.
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/app?tab=stage"
                  className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-[#ffc53d] to-[#f59e0b] hover:from-[#ffd875] hover:to-[#ffc53d] px-8 py-4 font-mono text-xs uppercase tracking-widest text-[#070709] font-bold transition-all duration-200 hover:scale-[1.02] shadow-[0_0_28px_rgba(255,197,61,0.35)]"
                >
                  <Mic className="w-4 h-4" />
                  <span>Launch App · Take The Stage</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/app?tab=vault"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#12121a]/80 px-6 py-4 font-mono text-xs uppercase tracking-widest text-zinc-200 backdrop-blur-md transition-all duration-200 hover:bg-white/10 hover:text-white"
                >
                  <Database className="w-4 h-4 text-zinc-400" />
                  <span>Explore Joke Vault</span>
                </Link>
              </div>
            </div>
          )}

          {/* Slide 02: Fool the AI */}
          {activeSlide === 1 && (
            <div className="max-w-2xl pointer-events-auto animate-fadeIn space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-white/10 bg-[#0c0c12]/80 backdrop-blur-md font-mono text-[10px] uppercase tracking-[0.24em] text-[#ffc53d]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ffc53d] animate-pulse" />
                <span>Chapter 02 · The Straight Man AI</span>
              </div>
              <h2 className="display-serif text-5xl sm:text-7xl lg:text-8xl text-white font-bold tracking-tight leading-[0.95]">
                <SplitChars
                  parts={[
                    { text: "Fool the " },
                    { text: "AI.", em: true },
                  ]}
                  active={activeSlide === 1}
                />
              </h2>
              <p className="text-base sm:text-lg text-zinc-300 leading-relaxed max-w-xl font-light">
                Tell the Straight Man something only a human would understand: subtext, innuendo, or double meanings. If it misses with deadpan confidence and the blind crowd agrees, you killed it.
              </p>
              <div className="font-mono text-xs text-[#ffc53d]/90 pt-1">
                AI REASONING: LITERAL CONFIDENCE 98.4% · PRO STAGE 2.5× MULTIPLIER
              </div>
            </div>
          )}

          {/* Slide 03: Get Paid */}
          {activeSlide === 2 && (
            <div className="max-w-2xl pointer-events-auto animate-fadeIn space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-white/10 bg-[#0c0c12]/80 backdrop-blur-md font-mono text-[10px] uppercase tracking-[0.24em] text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Chapter 03 · Blind Quorum</span>
              </div>
              <h2 className="display-serif text-5xl sm:text-7xl lg:text-8xl text-white font-bold tracking-tight leading-[0.95]">
                <SplitChars
                  parts={[
                    { text: "Get " },
                    { text: "Paid.", em: true },
                  ]}
                  active={activeSlide === 2}
                />
              </h2>
              <p className="text-base sm:text-lg text-zinc-300 leading-relaxed max-w-xl font-light">
                Verified human jurors judge blind with zero author or AI labels. When 60%+ side with you, rewards settle on-chain in USDG directly from the Tip Jar at midnight UTC.
              </p>
              <div className="font-mono text-xs text-emerald-400/90 pt-1">
                CONSENSUS CRITERIA: ≥60% BLIND CONSENSUS · 5 TO 7 HUMAN JURORS
              </div>
            </div>
          )}

          {/* Slide 04: The Joke Vault */}
          {activeSlide === 3 && (
            <div className="max-w-2xl pointer-events-auto animate-fadeIn space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-white/10 bg-[#0c0c12]/80 backdrop-blur-md font-mono text-[10px] uppercase tracking-[0.24em] text-[#ffc53d]">
                <Database className="w-3.5 h-3.5 text-[#ffc53d]" />
                <span>Chapter 04 · Immutable Data Asset</span>
              </div>
              <h2 className="display-serif text-5xl sm:text-7xl lg:text-8xl text-white font-bold tracking-tight leading-[0.95]">
                <SplitChars
                  parts={[
                    { text: "The Joke " },
                    { text: "Vault.", em: true },
                  ]}
                  active={activeSlide === 3}
                />
              </h2>
              <p className="text-base sm:text-lg text-zinc-300 leading-relaxed max-w-xl font-light">
                Every verified bit becomes an immutable data asset in the Joke Vault. AI labs license the Vault to align frontier reasoning models, and 10% lifetime royalties flow back to the comedians forever.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <Link
                  href="/app?tab=stage"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-[#ffc53d] to-[#f59e0b] font-mono text-xs uppercase tracking-widest text-black font-bold hover:scale-[1.02] transition-all shadow-[0_0_24px_rgba(255,197,61,0.4)]"
                >
                  <Mic className="w-4 h-4" />
                  <span>Launch App</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/app?tab=vault"
                  className="inline-flex items-center gap-2 px-6 py-4 rounded-full border border-white/20 bg-white/5 font-mono text-xs uppercase tracking-widest text-white hover:bg-white/10 transition-all"
                >
                  <Database className="w-4 h-4" />
                  <span>Explore Vault</span>
                </Link>
              </div>
            </div>
          )}

          {/* Bottom HUD Bar */}
          <div className="pointer-events-none mt-8 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500 border-t border-white/10 pt-4">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ffc53d] animate-pulse" />
              Scroll to orbit 360° · Click statue to poke
            </span>
            <span className="text-[#ffc53d]">Chapter 0{activeSlide + 1} / 04</span>
          </div>
        </div>
      </div>
    </div>
  );
}
