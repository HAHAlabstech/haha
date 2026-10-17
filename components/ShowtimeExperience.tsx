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
          <em key={`em-${pIdx}`}>{chars}</em>
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

export default function ShowtimeExperience() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const pokeGlyphRef = useRef<HTMLDivElement>(null);
  const bitCardRef = useRef<HTMLDivElement>(null);

  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [dashScales, setDashScales] = useState<[number, number, number, number]>([
    0.05, 0, 0, 0,
  ]);
  const [slideTransforms, setSlideTransforms] = useState<number[]>([
    0, 120, 120, 120,
  ]);

  useEffect(() => {
    const wrap = canvasWrapRef.current;
    const scrollEl = scrollContainerRef.current;
    if (!wrap || !scrollEl) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.28;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.setAttribute("data-cursor-hot", "true");
    renderer.domElement.setAttribute("data-cursor-label", "POKE");
    wrap.innerHTML = "";
    wrap.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    scene.add(camera);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    // 1. Liquid Stage-Light GLSL Shader attached to Camera
    const bgUniforms = {
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uResolution: { value: new THREE.Vector2(1920, 1080) },
      uBoost: { value: 0 },
    };

    const bgMat = new THREE.ShaderMaterial({
      uniforms: bgUniforms,
      depthTest: false,
      depthWrite: false,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uScroll;
        uniform vec2 uMouse;
        uniform vec2 uResolution;
        uniform float uBoost;
        varying vec2 vUv;

        void main() {
          vec2 uv = vUv;
          float aspect = uResolution.x / max(1.0, uResolution.y);

          vec2 p = uv * 2.0 - 1.0;
          p.x *= aspect;

          vec2 m = (uMouse * 2.0 - 1.0) * 0.35;
          p -= m;

          for (float i = 1.0; i < 4.0; i++) {
            p.x += 0.38 / i * sin(i * 2.4 * p.y + uTime * 0.25 + uScroll * 4.5);
            p.y += 0.38 / i * cos(i * 2.4 * p.x + uTime * 0.3 + uScroll * 4.5);
          }

          float wave = sin(p.x * 2.0 + p.y * 2.0) * 0.5 + 0.5;
          float highlight = pow(wave, 3.8);

          vec3 colBase = vec3(0.02, 0.015, 0.012);
          vec3 colStage = mix(
            vec3(0.28, 0.16, 0.05),
            vec3(0.26, 0.05, 0.04),
            sin(uScroll * 3.14159) * 0.65
          );
          vec3 colHot = vec3(1.0, 0.69, 0.23);

          vec3 color = mix(colBase, colStage, wave * 0.65);
          color += colHot * highlight * (0.28 + uBoost * 0.35);

          float dist = length(vUv - 0.5);
          color *= smoothstep(0.95, 0.12, dist);

          float noise = fract(sin(dot(vUv, vec2(12.9898, 78.233) + uTime * 0.1)) * 43758.5453);
          color += (noise - 0.5) * 0.016;

          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });

    const bgPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), bgMat);
    bgPlane.position.z = -25;
    camera.add(bgPlane);

    // 2. 480 Additive Forge / Applause Sparks
    const sparkCount = 480;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(sparkCount * 3);
    const sparkSpeed = new Float32Array(sparkCount);
    const sparkSeed = new Float32Array(sparkCount);
    for (let i = 0; i < sparkCount; i++) {
      sparkPos[i * 3] = (Math.random() - 0.5) * 22;
      sparkPos[i * 3 + 1] = (Math.random() - 0.5) * 22;
      sparkPos[i * 3 + 2] = (Math.random() - 0.5) * 18;
      sparkSpeed[i] = 0.004 + Math.random() * 0.012;
      sparkSeed[i] = Math.random() * 100;
    }
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0xffcf7d,
      size: 0.05,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sparks = new THREE.Points(sparkGeo, sparkMat);
    scene.add(sparks);

    // 3. Aged Bronze Straight Man Statue (Laocoon finish)
    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0xd4a472,
      metalness: 0.92,
      roughness: 0.4,
      envMapIntensity: 1.5,
    });
    const darkBronze = new THREE.MeshStandardMaterial({
      color: 0x3a2819,
      metalness: 0.85,
      roughness: 0.52,
      envMapIntensity: 1.0,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffb84d,
      metalness: 0.96,
      roughness: 0.22,
      envMapIntensity: 1.8,
    });
    const eyeGlow = new THREE.MeshStandardMaterial({
      color: 0xffe09e,
      emissive: 0xffa726,
      emissiveIntensity: 2.4,
      roughness: 0.2,
    });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x120d08 });
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xffb13b,
      wireframe: true,
      transparent: true,
      opacity: 0.22,
    });

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

    const stageGroup = new THREE.Group();
    stageGroup.scale.setScalar(1.38);
    stageGroup.position.y = 0.15;
    scene.add(stageGroup);

    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.28, 0.14, 48),
      darkBronze,
    );
    plinth.position.y = -1.62;
    stageGroup.add(plinth);

    const plinthRim = new THREE.Mesh(
      new THREE.TorusGeometry(1.16, 0.015, 16, 64),
      goldMat,
    );
    plinthRim.rotation.x = Math.PI / 2;
    plinthRim.position.y = -1.55;
    stageGroup.add(plinthRim);

    // Stool
    const stool = new THREE.Group();
    stool.position.y = -0.95;
    stageGroup.add(stool);
    stool.add(
      new THREE.Mesh(
        new THREE.CylinderGeometry(0.46, 0.44, 0.09, 40),
        darkBronze,
      ),
    );
    const seatRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.45, 0.015, 16, 48),
      goldMat,
    );
    seatRim.rotation.x = Math.PI / 2;
    seatRim.position.y = 0.01;
    stool.add(seatRim);

    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.3;
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028, 0.022, 0.66, 16),
        darkBronze,
      );
      leg.position.set(Math.cos(a) * 0.3, -0.32, Math.sin(a) * 0.3);
      leg.rotation.z = -Math.cos(a) * 0.14;
      leg.rotation.x = Math.sin(a) * 0.14;
      stool.add(leg);
    }
    const footRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.016, 16, 48),
      goldMat,
    );
    footRing.rotation.x = Math.PI / 2;
    footRing.position.y = -0.4;
    stool.add(footRing);

    // Robot
    const robot = new THREE.Group();
    robot.position.y = -0.9;
    stageGroup.add(robot);

    const pelvis = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.3, 0.18, 32),
      darkBronze,
    );
    pelvis.position.y = 0.12;
    robot.add(pelvis);

    const torso = new THREE.Group();
    torso.position.y = 0.58;
    robot.add(torso);

    const chest = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.36, 0.76, 48),
      bronzeMat,
    );
    chest.position.y = 0.02;
    torso.add(chest);

    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.045, 12, 48),
      goldMat,
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.4;
    torso.add(collar);

    const shoulderBar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.94, 24),
      goldMat,
    );
    shoulderBar.rotation.z = Math.PI / 2;
    shoulderBar.position.set(0, 0.39, 0);
    torso.add(shoulderBar);

    const tie = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.48, 0.022),
      goldMat,
    );
    tie.position.set(0, 0.02, 0.265);
    torso.add(tie);

    const badge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.02, 24),
      goldMat,
    );
    badge.rotation.x = Math.PI / 2;
    badge.position.set(0.24, 0.18, 0.265);
    torso.add(badge);

    for (let i = -2; i <= 2; i++) {
      const rib = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.016, 0.02),
        darkBronze,
      );
      rib.position.set(-0.2, -0.14 + i * 0.036, 0.265);
      torso.add(rib);
    }

    const makeLimb = (len: number, r1 = 0.055, r2 = 0.048) => {
      const g = new THREE.CylinderGeometry(r1, r2, len, 20);
      g.translate(0, -len / 2, 0);
      return new THREE.Mesh(g, bronzeMat);
    };

    const armL = new THREE.Group();
    armL.position.set(-0.48, 0.32, 0);
    torso.add(armL);
    armL.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 20, 20), goldMat));
    const upperL = makeLimb(0.42);
    upperL.rotation.z = 0.18;
    upperL.rotation.x = 0.28;
    armL.add(upperL);
    const foreL = makeLimb(0.38, 0.048, 0.042);
    foreL.position.set(-0.07, -0.39, 0.11);
    foreL.rotation.x = -0.85;
    foreL.rotation.z = -0.25;
    armL.add(foreL);

    const armR = new THREE.Group();
    armR.position.set(0.48, 0.32, 0);
    torso.add(armR);
    armR.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 20, 20), goldMat));
    const upperR = makeLimb(0.42);
    upperR.rotation.z = -0.15;
    upperR.rotation.x = 0.55;
    armR.add(upperR);
    const foreR = makeLimb(0.4, 0.048, 0.042);
    foreR.position.set(0.05, -0.35, 0.22);
    foreR.rotation.x = -1.18;
    foreR.rotation.z = 0.32;
    armR.add(foreR);

    for (const s of [-1, 1]) {
      const thigh = makeLimb(0.46, 0.075, 0.065);
      thigh.position.set(s * 0.2, 0.08, 0.04);
      thigh.rotation.x = -1.25;
      thigh.rotation.z = s * -0.08;
      robot.add(thigh);

      const knee = new THREE.Mesh(
        new THREE.SphereGeometry(0.068, 18, 18),
        goldMat,
      );
      knee.position.set(s * 0.22, -0.06, 0.46);
      robot.add(knee);

      const shin = makeLimb(0.48, 0.062, 0.05);
      shin.position.set(s * 0.22, -0.06, 0.46);
      shin.rotation.x = 0.18;
      robot.add(shin);

      const boot = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.09, 0.26),
        darkBronze,
      );
      boot.position.set(s * 0.22, -0.52, 0.6);
      robot.add(boot);
    }

    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.11, 0.18, 24),
      goldMat,
    );
    neck.position.y = 0.46;
    torso.add(neck);

    const head = new THREE.Group();
    head.position.set(0, 0.88, 0);
    torso.add(head);

    const hg = new THREE.ExtrudeGeometry(rounded(1.2, 0.85, 0.24), {
      depth: 0.64,
      bevelEnabled: true,
      bevelThickness: 0.07,
      bevelSize: 0.07,
      bevelSegments: 5,
      curveSegments: 16,
    });
    hg.center();
    const skull = new THREE.Mesh(hg, bronzeMat);
    head.add(skull);

    const faceZ = 0.32 + 0.07 + 0.004;
    const faceplate = new THREE.Mesh(
      new THREE.ShapeGeometry(rounded(0.96, 0.62, 0.18), 16),
      darkBronze,
    );
    faceplate.position.z = faceZ;
    head.add(faceplate);

    const brow = new THREE.Mesh(
      new THREE.BoxGeometry(0.76, 0.055, 0.09),
      goldMat,
    );
    brow.position.set(0, 0.15, 0.335);
    head.add(brow);

    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 0.07, 24),
        goldMat,
      );
      ear.rotation.z = Math.PI / 2;
      ear.position.set(s * 0.49, 0.02, 0);
      head.add(ear);
    }

    const antStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.02, 0.26, 12),
      goldMat,
    );
    antStem.position.set(0, 0.47, 0);
    head.add(antStem);

    const antTipMat = eyeGlow.clone();
    const antTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 20, 20),
      antTipMat,
    );
    antTip.position.set(0, 0.62, 0);
    head.add(antTip);

    const eyes: { pupil: THREE.Mesh; lid: THREE.Mesh }[] = [];
    for (const s of [-1, 1]) {
      const socket = new THREE.Group();
      socket.position.set(s * 0.21, 0.03, 0.33);
      head.add(socket);

      socket.add(
        new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.016, 16, 36), goldMat),
      );
      const iris = new THREE.Mesh(
        new THREE.CircleGeometry(0.102, 32),
        eyeGlow,
      );
      iris.position.z = 0.004;
      socket.add(iris);

      const pupil = new THREE.Mesh(
        new THREE.CircleGeometry(0.038, 24),
        pupilMat,
      );
      pupil.position.z = 0.008;
      socket.add(pupil);

      const lid = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.24, 0.03),
        darkBronze,
      );
      lid.position.set(0, 0.24, 0.012);
      socket.add(lid);

      eyes.push({ pupil, lid });
    }

    const mouthGroup = new THREE.Group();
    mouthGroup.position.set(0, -0.17, 0.338);
    head.add(mouthGroup);
    mouthGroup.add(
      new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.024, 0.02), goldMat),
    );
    const mouthR = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.024, 0.022),
      goldMat,
    );
    mouthR.position.set(0.17, 0, 0.001);
    mouthGroup.add(mouthR);

    // Mic Stand with Wireframe Accent
    const micGroup = new THREE.Group();
    micGroup.position.set(0.18, -1.55, 0.64);
    stageGroup.add(micGroup);

    const micBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.28, 0.06, 32),
      darkBronze,
    );
    micBase.position.y = 0.03;
    micGroup.add(micBase);

    const micPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.022, 1.48, 16),
      goldMat,
    );
    micPole.position.y = 0.77;
    micGroup.add(micPole);

    const micHead = new THREE.Group();
    micHead.position.y = 1.54;
    micHead.rotation.x = -0.22;
    micGroup.add(micHead);

    const cradle = new THREE.Mesh(
      new THREE.TorusGeometry(0.088, 0.01, 12, 28, Math.PI),
      goldMat,
    );
    cradle.rotation.z = Math.PI;
    micHead.add(cradle);

    const capsuleGeo = new THREE.SphereGeometry(0.072, 20, 16);
    const capsule = new THREE.Mesh(capsuleGeo, bronzeMat);
    capsule.scale.set(1, 1.32, 1);
    capsule.position.y = 0.02;
    micHead.add(capsule);

    const capsuleWire = new THREE.Mesh(capsuleGeo, wireMat);
    capsuleWire.scale.set(1.06, 1.38, 1.06);
    capsuleWire.position.y = 0.02;
    micHead.add(capsuleWire);

    const raycaster = new THREE.Raycaster();
    const mouseNDC = new THREE.Vector2();

    const st = {
      scroll: 0,
      targetScroll: 0,
      scrollVel: 0,
      mx: 0,
      my: 0,
      tx: 0,
      ty: 0,
      blink: 0,
      nextBlink: 2.0,
      sq: 0,
      sqV: 0,
      nod: 0,
      nodV: 0,
      smile: 0,
      taps: 0,
      boost: 0,
    };

    const updateBgScale = () => {
      const dist = Math.abs(bgPlane.position.z);
      const vFov = (camera.fov * Math.PI) / 180;
      const h = 2 * Math.tan(vFov / 2) * dist;
      const w = h * camera.aspect;
      bgPlane.scale.set(w * 1.6, h * 1.6, 1);
    };

    const resize = () => {
      const w = wrap.clientWidth || window.innerWidth;
      const h = wrap.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
      bgUniforms.uResolution.value.set(w, h);
      updateBgScale();
    };
    resize();
    window.addEventListener("resize", resize);

    const onScroll = () => {
      const rect = scrollEl.getBoundingClientRect();
      const total = Math.max(1, scrollEl.offsetHeight - window.innerHeight);
      const scrolled = Math.max(0, Math.min(total, -rect.top));
      st.targetScroll = scrolled / total;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const onPointerMove = (e: PointerEvent) => {
      st.tx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      st.ty = -(e.clientY / Math.max(1, window.innerHeight)) * 2 + 1;
      bgUniforms.uMouse.value.set(
        e.clientX / Math.max(1, window.innerWidth),
        1.0 - e.clientY / Math.max(1, window.innerHeight),
      );
      mouseNDC.set(st.tx, st.ty);
    };

    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement | null)?.closest("a, button")) return;
      raycaster.setFromCamera(mouseNDC, camera);
      const hits = raycaster.intersectObjects(stageGroup.children, true);
      if (hits.length > 0) {
        st.taps++;
        st.sqV = -0.14;
        st.nodV = 0.34;
        st.blink = 1;
        st.boost = 1.0;
        if (st.taps % 7 === 0) st.smile = 1.0;
        if (pokeGlyphRef.current) {
          pokeGlyphRef.current.textContent =
            st.taps % 3 === 0 ? "…" : st.taps % 7 === 0 ? "!" : "?";
          pokeGlyphRef.current.style.left = `${e.clientX}px`;
          pokeGlyphRef.current.style.top = `${e.clientY - 24}px`;
          pokeGlyphRef.current.style.opacity = "1";
          setTimeout(() => {
            if (pokeGlyphRef.current) {
              pokeGlyphRef.current.style.opacity = "0";
            }
          }, 850);
        }
      }
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("click", onClick);

    const smoothstep = (min: number, max: number, v: number) => {
      const x = Math.max(0, Math.min(1, (v - min) / (max - min)));
      return x * x * (3 - 2 * x);
    };

    let rafId = 0;
    let last = performance.now();
    let prevActiveIdx = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now * 0.001;

      const prevScroll = st.scroll;
      st.scroll += (st.targetScroll - st.scroll) * 0.075;
      st.scrollVel = Math.abs(st.targetScroll - prevScroll);

      st.mx += (st.tx - st.mx) * 0.08;
      st.my += (st.ty - st.my) * 0.08;
      st.boost = Math.max(0, st.boost - dt * 1.5);

      bgUniforms.uTime.value = t;
      bgUniforms.uScroll.value = st.scroll;
      bgUniforms.uBoost.value = st.boost;

      // Sparks
      const posAttr = sparkGeo.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < sparkCount; i++) {
        const idxY = i * 3 + 1;
        const idxX = i * 3;
        const nextY =
          (arr[idxY] ?? 0) +
          (sparkSpeed[i] ?? 0.006) +
          st.scrollVel * 0.4 +
          st.boost * 0.03;
        arr[idxY] = nextY > 11 ? -11 : nextY;
        arr[idxX] =
          (arr[idxX] ?? 0) + Math.sin(t * 0.8 + (sparkSeed[i] ?? 0)) * 0.002;
      }
      posAttr.needsUpdate = true;
      sparks.rotation.y = t * 0.025 + st.scroll * 0.6;

      // 360° Laocoon Camera Orbit + Dynamic View Offset
      const radius = 5.4;
      const phi = st.scroll * Math.PI * 2;
      const camY = Math.sin(st.scroll * Math.PI * 2) * 0.75 + 0.15;

      camera.position.x = Math.sin(phi) * radius + st.mx * 0.24;
      camera.position.z = Math.cos(phi) * radius;
      camera.position.y = camY + st.my * 0.18;
      camera.lookAt(0, -0.05, 0);

      const isMobile = window.innerWidth <= 960;
      const w = wrap.clientWidth || window.innerWidth;
      const h = wrap.clientHeight || window.innerHeight;
      if (!isMobile) {
        const offsetFactor = -0.22 * Math.cos(st.scroll * Math.PI * 3);
        camera.setViewOffset(w, h, w * offsetFactor, 0, w, h);
      } else {
        camera.clearViewOffset();
      }

      // Straight Man spring physics & head tracking
      st.sqV += (0 - st.sq) * 28 * dt;
      st.sqV *= Math.pow(0.82, dt * 60);
      st.sq += st.sqV;
      robot.scale.set(1 - st.sq * 0.45, 1 + st.sq, 1 - st.sq * 0.45);

      torso.position.y = 0.58 + Math.sin(t * 1.7) * 0.014;
      torso.rotation.z = Math.sin(t * 0.9) * 0.015;

      st.nodV += (0 - st.nod) * 22 * dt;
      st.nodV *= Math.pow(0.84, dt * 60);
      st.nod += st.nodV;

      head.rotation.y = st.mx * 0.38 + Math.sin(t * 0.6) * 0.06;
      head.rotation.x = -st.my * 0.22 + st.nod;

      for (const e of eyes) {
        e.pupil.position.x = st.mx * 0.036;
        e.pupil.position.y = st.my * 0.028;
      }

      st.nextBlink -= dt;
      if (st.nextBlink <= 0) {
        st.blink = 1;
        st.nextBlink = 2.4 + Math.random() * 3.0;
      }
      if (st.blink > 0) st.blink = Math.max(0, st.blink - dt * 7.5);
      const lidClose = Math.sin(st.blink * Math.PI);
      for (const e of eyes) {
        e.lid.position.y = 0.24 - lidClose * 0.22;
      }

      st.smile = Math.max(0, st.smile - dt * 0.55);
      mouthR.rotation.z = st.smile * 0.38;
      mouthR.position.y = st.smile * 0.014;
      antTipMat.emissiveIntensity =
        1.8 + Math.sin(t * 3.2) * 0.6 + st.boost * 2.5;

      // Chapter transitions (4 slides at 0.0, 0.333, 0.666, 1.0)
      const slideCenters = [0.0, 0.333, 0.666, 1.0];
      const nextIdx = slideCenters.reduce(
        (best, c, idx) =>
          Math.abs(st.scroll - c) <
          Math.abs(st.scroll - (slideCenters[best] ?? 0))
            ? idx
            : best,
        0,
      );
      if (nextIdx !== prevActiveIdx) {
        prevActiveIdx = nextIdx;
        setActiveSlide(nextIdx);
      }

      const d0 = smoothstep(0.0, 0.25, st.scroll);
      const d1 = smoothstep(0.25, 0.5, st.scroll);
      const d2 = smoothstep(0.5, 0.75, st.scroll);
      const d3 = smoothstep(0.75, 1.0, st.scroll);
      setDashScales([Math.max(0.06, d0), d1, d2, d3]);

      setSlideTransforms(
        slideCenters.map((c) => (st.scroll - c) * -140),
      );

      // Bit #0417 clip-path reveal on Chapter 2
      if (bitCardRef.current) {
        const dist2 = st.scroll - 0.333;
        if (Math.abs(dist2) < 0.22) {
          let prog = 0;
          if (dist2 < -0.05) {
            prog = smoothstep(-0.2, -0.05, dist2);
            bitCardRef.current.style.clipPath = `inset(${(1 - prog) * 100}% 0% 0% 0% round 14px)`;
          } else if (dist2 > 0.05) {
            prog = 1 - smoothstep(0.05, 0.2, dist2);
            bitCardRef.current.style.clipPath = `inset(0% 0% ${(1 - prog) * 100}% 0% round 14px)`;
          } else {
            bitCardRef.current.style.clipPath = `inset(0% 0% 0% 0% round 14px)`;
          }
          bitCardRef.current.style.transform = `translate3d(0, calc(-50% + ${dist2 * -180}px), 0)`;
        } else {
          bitCardRef.current.style.clipPath = `inset(100% 0% 0% 0% round 14px)`;
        }
      }

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("click", onClick);
      pmrem.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={scrollContainerRef} className="showtime-scroll-container">
      <div ref={ stationaryViewport => {} } className="showtime-sticky-viewport">
        {/* 3D WebGL Canvas */}
        <div ref={canvasWrapRef} className="absolute inset-0 z-1" />

        {/* Story Progress Dashes on the 5th Laocoon Grid Column */}
        <div
          className="pointer-events-none fixed top-[70px] right-[5%] z-20 flex h-[calc(100vh-70px)] w-[3px] flex-col"
          aria-hidden="true"
        >
          {dashScales.map((s, idx) => (
            <div
              key={idx}
              className="story-dash"
              style={{ transform: `scaleY(${s})` }}
            />
          ))}
        </div>

        {/* Floating Poke Glyph */}
        <div
          ref={pokeGlyphRef}
          className="pointer-events-none fixed z-50 font-serif text-4xl italic text-[#ffb13b] opacity-0 transition-opacity duration-300"
        >
          ?
        </div>

        {/* Chapter 2 Editorial Clip-Path Bit Card */}
        <div
          ref={bitCardRef}
          className="showtime-bit-card"
          style={{ clipPath: "inset(100% 0% 0% 0% round 14px)" }}
        >
          <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-[#a49b8e]">
            <span>Bit #0417 · Punchline</span>
            <span className="text-[#ffb13b]">Stumped</span>
          </div>
          <div>
            <div className="mb-3 font-serif text-xl leading-snug text-[#fff6ed]">
              “My wife told me to stop impersonating a flamingo. I had to put my
              foot down.”
            </div>
            <div className="border-l-2 border-[#ffb13b] pl-3 font-mono text-[11px] leading-relaxed text-[#a49b8e]">
              STRAIGHT MAN (97% CONF):
              <br />
              Setting a firm boundary in a marriage is healthy. Good for you.
            </div>
          </div>
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-[#a49b8e]">
            <span>Crowd 9 · 94% Laugh</span>
            <span className="border border-[#ffb13b] px-2 py-0.5 text-[#ffb13b]">
              ★ Entered Vault
            </span>
          </div>
        </div>

        {/* CHAPTER 01 — TELL A JOKE */}
        <div
          className="showtime-slide left"
          style={{
            transform: `translate3d(0, calc(-50% + ${slideTransforms[0]}px), 0)`,
          }}
        >
          <div
            className={`showtime-slide-body mb-4 ${activeSlide === 0 ? "in" : ""}`}
          >
            <span className="eyebrow">01 · Showtime · Open Mic &amp; Pro Stage</span>
          </div>
          <h1 className="showtime-slide-title">
            <SplitChars
              active={activeSlide === 0}
              parts={[
                { text: "Tell a", brAfter: true },
                { text: "Joke", em: true },
              ]}
            />
          </h1>
          <div className={`showtime-slide-body ${activeSlide === 0 ? "in" : ""}`}>
            <p>
              Step up to the mic. Drop a one-liner, a passive-aggressive text,
              an awkward real-life moment, or a double meaning across four club
              categories: <b>Punchline</b>, <b>Subtext</b>, <b>IRL</b>, and{" "}
              <b>Double Meaning</b>.
            </p>
            <Link href="/stage" className="showtime-slide-cta">
              <span>🎤 Take the stage</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* CHAPTER 02 — FOOL THE AI */}
        <div
          className="showtime-slide right"
          style={{
            transform: `translate3d(0, calc(-50% + ${slideTransforms[1]}px), 0)`,
          }}
        >
          <div
            className={`showtime-slide-body mb-4 ${activeSlide === 1 ? "in" : ""}`}
          >
            <span className="eyebrow">02 · The Straight Man · SM-01</span>
          </div>
          <h2 className="showtime-slide-title">
            <SplitChars
              active={activeSlide === 1}
              parts={[
                { text: "Fool", brAfter: true },
                { text: "the ", em: false },
                { text: "AI", em: true },
              ]}
            />
          </h2>
          <div className={`showtime-slide-body ${activeSlide === 1 ? "in" : ""}`}>
            <p>
              Meet the <b>Straight Man</b> — an AI with encyclopedic grammar and
              zero sense of humor. It answers every premise with 97% literal
              confidence. When it misses the flip and the <b>Human Crowd</b>{" "}
              gets it, you win the round.
            </p>
            <Link href="/crowd" className="showtime-slide-cta">
              <span>Judge in the Crowd</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* CHAPTER 03 — GET PAID */}
        <div
          className="showtime-slide left"
          style={{
            transform: `translate3d(0, calc(-50% + ${slideTransforms[2]}px), 0)`,
          }}
        >
          <div
            className={`showtime-slide-body mb-4 ${activeSlide === 2 ? "in" : ""}`}
          >
            <span className="eyebrow">03 · The Tip Jar · Daily Settlement</span>
          </div>
          <h2 className="showtime-slide-title">
            <SplitChars
              active={activeSlide === 2}
              parts={[
                { text: "Get", brAfter: true },
                { text: "Paid", em: true },
              ]}
            />
          </h2>
          <div className={`showtime-slide-body ${activeSlide === 2 ? "in" : ""}`}>
            <p>
              A panel of 7–9 staked human judges scores the laugh. Verified
              stumpers earn daily Merkle-settled shares of the{" "}
              <b>Tip Jar (60% Comics · 30% Crowd · 10% House)</b>, claimable
              directly on-chain.
            </p>
            <Link href="/tipjar" className="showtime-slide-cta">
              <span>Inspect the Tip Jar</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* CHAPTER 04 — GET THE JOKE */}
        <div
          className="showtime-slide right"
          style={{
            transform: `translate3d(0, calc(-50% + ${slideTransforms[3]}px), 0)`,
          }}
        >
          <div
            className={`showtime-slide-body mb-4 ${activeSlide === 3 ? "in" : ""}`}
          >
            <span className="eyebrow">04 · The Joke Vault · Season 01</span>
          </div>
          <h2 className="showtime-slide-title">
            <SplitChars
              active={activeSlide === 3}
              parts={[
                { text: "Get the", brAfter: true },
                { text: "Joke", em: true },
              ]}
            />
          </h2>
          <div className={`showtime-slide-body ${activeSlide === 3 ? "in" : ""}`}>
            <p>
              Every bit that fools the Straight Man enters{" "}
              <b>The Joke Vault</b> — a provenance-signed dataset of human
              nuance. Each season, the AI studies the Vault, gets harder to
              fool, and raises the bar for human wit.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/vault" className="showtime-slide-cta">
                <span>Explore the Vault</span>
                <span>→</span>
              </Link>
              <Link
                href="/"
                className="showtime-slide-cta"
                style={{
                  background: "transparent",
                  color: "var(--bone)",
                  borderColor: "var(--line-strong)",
                }}
              >
                <span>Back to Club</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom HUD Bar */}
        <div className="pointer-events-none absolute bottom-6 left-[5%] right-[5%] z-20 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-[#a49b8e]">
          <span>
            Laocoon 360° Orbit · Chapter 0{activeSlide + 1} / 04
          </span>
          <span className="hidden sm:inline">
            Scroll to orbit · Click bronze Straight Man to poke
          </span>
          <span>SM-01 · Literal Confidence 97%</span>
        </div>
      </div>
    </div>
  );
}
