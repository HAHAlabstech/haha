"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export default function ClubStage3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [finishMode, setFinishMode] = useState<"obsidian" | "bronze">(
    "obsidian",
  );
  const [pokeCount, setPokeCount] = useState(0);
  const [lastReaction, setLastReaction] = useState<string>(
    "Standing by. Literal confidence: 97%.",
  );
  const finishRef = useRef<"obsidian" | "bronze">("obsidian");

  useEffect(() => {
    finishRef.current = finishMode;
  }, [finishMode]);

  useEffect(() => {
    const wrap = containerRef.current;
    if (!wrap) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.setAttribute("data-cursor-hot", "true");
    renderer.domElement.setAttribute("data-cursor-label", "POKE");
    wrap.innerHTML = "";
    wrap.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0d0b09, 0.055);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
    camera.position.set(0, 0.55, 6.4);

    // Lighting
    const hemi = new THREE.HemisphereLight(0xffe6c2, 0x160f0a, 0.42);
    scene.add(hemi);

    const spot = new THREE.SpotLight(
      0xffb84d,
      16,
      18,
      Math.PI * 0.2,
      0.65,
      1.5,
    );
    spot.position.set(0, 5.4, 1.7);
    spot.target.position.set(0, -0.3, 0);
    scene.add(spot);
    scene.add(spot.target);

    const keyLight = new THREE.DirectionalLight(0xffddb0, 2.2);
    keyLight.position.set(2.4, 3.6, 3.4);
    scene.add(keyLight);

    const rimWarm = new THREE.DirectionalLight(0xff8a2b, 2.0);
    rimWarm.position.set(-3.2, 1.8, -2.5);
    scene.add(rimWarm);

    const rimCool = new THREE.DirectionalLight(0x6e85a8, 0.9);
    rimCool.position.set(3.2, 1.2, -2.8);
    scene.add(rimCool);

    const footLight = new THREE.PointLight(0xffa434, 2.2, 5.5, 2.0);
    footLight.position.set(0, -1.35, 1.6);
    scene.add(footLight);

    // Velvet Curtain with procedural pleats
    const curtainGeo = new THREE.PlaneGeometry(18, 9, 96, 24);
    const cPos = curtainGeo.attributes.position;
    if (cPos) {
      for (let i = 0; i < cPos.count; i++) {
        const x = cPos.getX(i);
        const y = cPos.getY(i);
        const fold =
          Math.sin(x * 3.6) * 0.18 +
          Math.sin(x * 7.2 + 0.8) * 0.06 +
          Math.cos(x * 1.8) * 0.08;
        const drape = 1 - Math.max(0, (y + 4.5) / 9) * 0.25;
        cPos.setZ(i, fold * drape);
      }
    }
    curtainGeo.computeVertexNormals();
    const curtainMat = new THREE.MeshPhysicalMaterial({
      color: 0x3b0f0c,
      roughness: 0.86,
      metalness: 0.04,
      sheen: 1.0,
      sheenColor: new THREE.Color(0xa8281e),
      sheenRoughness: 0.55,
      envMapIntensity: 0.2,
    });
    const curtain = new THREE.Mesh(curtainGeo, curtainMat);
    curtain.position.set(0, 1.2, -3.2);
    scene.add(curtain);

    // Stage floor & amber rings
    const floorGeo = new THREE.CylinderGeometry(3.8, 4.1, 0.18, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1a130d,
      roughness: 0.42,
      metalness: 0.15,
      envMapIntensity: 0.55,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -1.64;
    scene.add(floor);

    const rimRingMat = new THREE.MeshBasicMaterial({
      color: 0xffb13b,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const rimRing = new THREE.Mesh(
      new THREE.RingGeometry(1.75, 1.79, 96),
      rimRingMat,
    );
    rimRing.rotation.x = -Math.PI / 2;
    rimRing.position.y = -1.545;
    scene.add(rimRing);

    const rimRing2Mat = new THREE.MeshBasicMaterial({
      color: 0xffb13b,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
    });
    const rimRing2 = new THREE.Mesh(
      new THREE.RingGeometry(2.35, 2.365, 96),
      rimRing2Mat,
    );
    rimRing2.rotation.x = -Math.PI / 2;
    rimRing2.position.y = -1.546;
    scene.add(rimRing2);

    // Volumetric Spotlight Cone Shader
    const coneGeo = new THREE.ConeGeometry(2.35, 6.6, 64, 1, true);
    coneGeo.translate(0, -3.3, 0);
    const coneMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: new THREE.Color(0xffb84d) },
        uBoost: { value: 0.0 },
        uTime: { value: 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vViewDir = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        uniform vec3 uColor;
        uniform float uBoost;
        uniform float uTime;
        void main() {
          float edge = pow(1.0 - abs(dot(vNormal, vViewDir)), 1.6);
          float vertical = smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.55, 1.0, vUv.y));
          float shimmer = 0.92 + 0.08 * sin(vUv.y * 18.0 - uTime * 2.2);
          float a = edge * vertical * (0.14 + uBoost * 0.18) * shimmer;
          gl_FragColor = vec4(uColor, a);
        }
      `,
    });
    const lightCone = new THREE.Mesh(coneGeo, coneMat);
    lightCone.position.set(0, 4.9, 0.1);
    scene.add(lightCone);

    // Materials for Straight Man (Obsidian vs Bronze toggleable)
    const bodyMetal = new THREE.MeshPhysicalMaterial({
      color: 0x1c1714,
      roughness: 0.32,
      metalness: 0.78,
      clearcoat: 0.45,
      clearcoatRoughness: 0.28,
      envMapIntensity: 1.15,
    });
    const darkTrim = new THREE.MeshStandardMaterial({
      color: 0x0e0b09,
      roughness: 0.5,
      metalness: 0.6,
    });
    const brass = new THREE.MeshStandardMaterial({
      color: 0xe09a32,
      roughness: 0.24,
      metalness: 0.92,
      envMapIntensity: 1.4,
    });
    const chrome = new THREE.MeshStandardMaterial({
      color: 0xdcd4c6,
      roughness: 0.18,
      metalness: 0.95,
      envMapIntensity: 1.5,
    });
    const wood = new THREE.MeshStandardMaterial({
      color: 0x3b2615,
      roughness: 0.55,
      metalness: 0.08,
    });
    const eyeGlow = new THREE.MeshStandardMaterial({
      color: 0xffd27d,
      emissive: 0xffa726,
      emissiveIntensity: 2.2,
      roughness: 0.2,
    });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x120d08 });

    // Root stage rig
    const stageGroup = new THREE.Group();
    scene.add(stageGroup);

    // Stool
    const stool = new THREE.Group();
    stool.position.y = -0.95;
    stageGroup.add(stool);

    const seat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.44, 0.09, 40),
      wood,
    );
    stool.add(seat);

    const seatRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.45, 0.014, 16, 48),
      brass,
    );
    seatRim.rotation.x = Math.PI / 2;
    seatRim.position.y = 0.01;
    stool.add(seatRim);

    for (let i = 0; i < 3; i++) {
      const ang = (i / 3) * Math.PI * 2 + 0.3;
      const legGeo = new THREE.CylinderGeometry(0.028, 0.022, 0.66, 16);
      const leg = new THREE.Mesh(legGeo, wood);
      leg.position.set(Math.cos(ang) * 0.3, -0.32, Math.sin(ang) * 0.3);
      leg.rotation.z = -Math.cos(ang) * 0.14;
      leg.rotation.x = Math.sin(ang) * 0.14;
      stool.add(leg);
    }

    const footRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.016, 16, 48),
      brass,
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
      darkTrim,
    );
    pelvis.position.y = 0.12;
    robot.add(pelvis);

    const torso = new THREE.Group();
    torso.position.y = 0.58;
    robot.add(torso);

    const chest = new THREE.Mesh(
      new THREE.BoxGeometry(0.86, 0.78, 0.52),
      bodyMetal,
    );
    torso.add(chest);

    const shoulderBar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.94, 24),
      brass,
    );
    shoulderBar.rotation.z = Math.PI / 2;
    shoulderBar.position.set(0, 0.39, 0);
    torso.add(shoulderBar);

    const tie = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.48, 0.02),
      brass,
    );
    tie.position.set(0, 0.02, 0.265);
    torso.add(tie);

    const badge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.018, 24),
      brass,
    );
    badge.rotation.x = Math.PI / 2;
    badge.position.set(0.24, 0.18, 0.265);
    torso.add(badge);

    for (let i = -2; i <= 2; i++) {
      const rib = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.016, 0.02),
        darkTrim,
      );
      rib.position.set(-0.2, -0.14 + i * 0.036, 0.265);
      torso.add(rib);
    }

    // Arms & Legs
    const makeLimb = (len: number, r1 = 0.055, r2 = 0.048) => {
      const g = new THREE.CylinderGeometry(r1, r2, len, 20);
      g.translate(0, -len / 2, 0);
      return new THREE.Mesh(g, bodyMetal);
    };

    const armL = new THREE.Group();
    armL.position.set(-0.48, 0.32, 0);
    torso.add(armL);
    armL.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 20, 20), brass));
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
    armR.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 20, 20), brass));
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
        brass,
      );
      knee.position.set(s * 0.22, -0.06, 0.46);
      robot.add(knee);

      const shin = makeLimb(0.48, 0.062, 0.05);
      shin.position.set(s * 0.22, -0.06, 0.46);
      shin.rotation.x = 0.18;
      robot.add(shin);

      const boot = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.09, 0.26),
        darkTrim,
      );
      boot.position.set(s * 0.22, -0.52, 0.6);
      robot.add(boot);
    }

    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.11, 0.18, 24),
      brass,
    );
    neck.position.y = 0.46;
    torso.add(neck);

    // Head
    const head = new THREE.Group();
    head.position.set(0, 0.88, 0);
    torso.add(head);

    const skull = new THREE.Mesh(
      new THREE.BoxGeometry(0.92, 0.68, 0.64),
      bodyMetal,
    );
    head.add(skull);

    const faceplate = new THREE.Mesh(
      new THREE.BoxGeometry(0.82, 0.56, 0.04),
      darkTrim,
    );
    faceplate.position.z = 0.315;
    head.add(faceplate);

    const brow = new THREE.Mesh(
      new THREE.BoxGeometry(0.76, 0.055, 0.09),
      brass,
    );
    brow.position.set(0, 0.15, 0.335);
    head.add(brow);

    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 0.07, 24),
        brass,
      );
      ear.rotation.z = Math.PI / 2;
      ear.position.set(s * 0.49, 0.02, 0);
      head.add(ear);
    }

    const antStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.02, 0.26, 12),
      brass,
    );
    antStem.position.set(0, 0.47, 0);
    head.add(antStem);

    const antTipMat = eyeGlow.clone();
    const antTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 20, 20),
      antTipMat,
    );
    antTip.position.set(0, 0.62, 0);
    head.add(antTip);

    // Eyes + Pupils + Eyelids
    const eyes: {
      socket: THREE.Group;
      pupil: THREE.Mesh;
      lid: THREE.Mesh;
      baseX: number;
    }[] = [];

    for (const s of [-1, 1]) {
      const socket = new THREE.Group();
      socket.position.set(s * 0.21, 0.03, 0.33);
      head.add(socket);

      const bezel = new THREE.Mesh(
        new THREE.TorusGeometry(0.115, 0.016, 16, 36),
        brass,
      );
      socket.add(bezel);

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
        darkTrim,
      );
      lid.position.set(0, 0.24, 0.012);
      socket.add(lid);

      eyes.push({ socket, pupil, lid, baseX: s * 0.21 });
    }

    // Deadpan mouth + secret 1-in-7 half-smile corner
    const mouthGroup = new THREE.Group();
    mouthGroup.position.set(0, -0.17, 0.338);
    head.add(mouthGroup);

    const mouthBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.024, 0.02),
      brass,
    );
    mouthGroup.add(mouthBar);

    const mouthR = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.024, 0.022),
      brass,
    );
    mouthR.position.set(0.17, 0, 0.001);
    mouthGroup.add(mouthR);

    // Microphone & Stand
    const micGroup = new THREE.Group();
    micGroup.position.set(0.16, -1.55, 0.62);
    stageGroup.add(micGroup);

    const micBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.28, 0.06, 32),
      darkTrim,
    );
    micBase.position.y = 0.03;
    micGroup.add(micBase);

    const micBaseRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.25, 0.012, 12, 36),
      brass,
    );
    micBaseRim.rotation.x = Math.PI / 2;
    micBaseRim.position.y = 0.06;
    micGroup.add(micBaseRim);

    const micPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.022, 1.48, 16),
      chrome,
    );
    micPole.position.y = 0.77;
    micGroup.add(micPole);

    const micClutch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.034, 0.034, 0.08, 16),
      brass,
    );
    micClutch.position.y = 1.1;
    micGroup.add(micClutch);

    const micHead = new THREE.Group();
    micHead.position.y = 1.54;
    micHead.rotation.x = -0.22;
    micGroup.add(micHead);

    const cradle = new THREE.Mesh(
      new THREE.TorusGeometry(0.085, 0.01, 12, 28, Math.PI),
      brass,
    );
    cradle.rotation.z = Math.PI;
    micHead.add(cradle);

    const capsule = new THREE.Mesh(
      new THREE.SphereGeometry(0.068, 20, 16),
      chrome,
    );
    capsule.scale.set(1, 1.32, 1);
    capsule.position.y = 0.02;
    micHead.add(capsule);

    for (let i = -2; i <= 2; i++) {
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(
          0.068 * Math.cos(i * 0.28),
          0.004,
          8,
          24,
        ),
        darkTrim,
      );
      band.rotation.x = Math.PI / 2;
      band.position.y = 0.02 + i * 0.022;
      micHead.add(band);
    }

    // Floating '?' / '…' glyph sprite
    const qCanvas = document.createElement("canvas");
    qCanvas.width = 128;
    qCanvas.height = 128;
    const qCtx = qCanvas.getContext("2d");
    const drawGlyph = (ch: string) => {
      if (!qCtx) return;
      qCtx.clearRect(0, 0, 128, 128);
      qCtx.font = '300 84px "Fraunces", Georgia, serif';
      qCtx.fillStyle = "#ffb13b";
      qCtx.textAlign = "center";
      qCtx.textBaseline = "middle";
      qCtx.fillText(ch, 64, 68);
    };
    drawGlyph("?");
    const qTex = new THREE.CanvasTexture(qCanvas);
    const qMat = new THREE.SpriteMaterial({
      map: qTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const qSprite = new THREE.Sprite(qMat);
    qSprite.scale.set(0.42, 0.42, 1);
    qSprite.position.set(0.62, 0.72, 0.2);
    stageGroup.add(qSprite);

    // 450 Drifting Dust Motes
    const moteCount = 450;
    const moteGeo = new THREE.BufferGeometry();
    const motePos = new Float32Array(moteCount * 3);
    const moteSeed = new Float32Array(moteCount);
    for (let i = 0; i < moteCount; i++) {
      const y = -1.5 + Math.random() * 5.2;
      const spread = 0.35 + (1 - (y + 1.5) / 5.2) * 1.9;
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * spread;
      motePos[i * 3] = Math.cos(a) * r;
      motePos[i * 3 + 1] = y;
      motePos[i * 3 + 2] = Math.sin(a) * r;
      moteSeed[i] = Math.random() * 100;
    }
    moteGeo.setAttribute("position", new THREE.BufferAttribute(motePos, 3));
    const moteMat = new THREE.PointsMaterial({
      color: 0xffcf7d,
      size: 0.032,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const motes = new THREE.Points(moteGeo, moteMat);
    scene.add(motes);

    // Expanding floor pulse rings on poke
    const pulses: {
      mesh: THREE.Mesh;
      mat: THREE.MeshBasicMaterial;
      age: number;
    }[] = [];
    const spawnPulse = () => {
      const g = new THREE.RingGeometry(0.25, 0.29, 64);
      const m = new THREE.MeshBasicMaterial({
        color: 0xffb13b,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(g, m);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = -1.54;
      scene.add(mesh);
      pulses.push({ mesh, mat: m, age: 0 });
    };

    // Interaction State
    const st = {
      mx: 0,
      my: 0,
      tx: 0,
      ty: 0,
      rotY: 0,
      spinVel: 0,
      dragging: false,
      lastX: 0,
      downX: 0,
      downY: 0,
      blink: 0,
      nextBlink: 2.2,
      squash: 0,
      squashV: 0,
      nod: 0,
      nodV: 0,
      smile: 0,
      taps: 0,
      qAge: 99,
      boost: 0,
    };

    const REACTIONS = [
      "“Wait. Are you saying the horse actually studied medicine?” — Confidence: 97%",
      "“Subtext parsing error: you said 'No worries' with 3 periods.” — Confidence: 99%",
      "“Literal calculation complete. Humor not detected in database.” — Confidence: 96%",
      "“Checking dictionary for double reading… stand by.” — Confidence: 94%",
      "“...Oh. Wait a second. Is that at my expense?” — Confidence: 12% (Smile Glitch)",
    ];

    const resize = () => {
      const w = wrap.clientWidth || window.innerWidth;
      const h = wrap.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    const triggerPoke = () => {
      st.taps++;
      setPokeCount(st.taps);
      st.squashV = -0.11;
      st.nodV = 0.28;
      st.blink = 1;
      st.qAge = 0;
      st.boost = 1;
      const glyphs = ["?", "…", "?", "!"];
      drawGlyph(glyphs[st.taps % glyphs.length] ?? "?");
      qTex.needsUpdate = true;
      if (st.taps % 7 === 0) {
        st.smile = 1;
        setLastReaction(REACTIONS[4] ?? "");
      } else {
        setLastReaction(REACTIONS[st.taps % (REACTIONS.length - 1)] ?? "");
      }
      spawnPulse();
    };

    const el = renderer.domElement;
    const onPointerDown = (e: PointerEvent) => {
      st.dragging = true;
      st.lastX = e.clientX;
      st.downX = e.clientX;
      st.downY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      st.tx = ((e.clientX - r.left) / Math.max(1, r.width) - 0.5) * 2;
      st.ty = ((e.clientY - r.top) / Math.max(1, r.height) - 0.5) * 2;
      if (st.dragging) {
        const dx = e.clientX - st.lastX;
        st.lastX = e.clientX;
        st.spinVel = dx * 0.009;
        st.rotY += st.spinVel;
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      if (
        st.dragging &&
        Math.hypot(e.clientX - st.downX, e.clientY - st.downY) < 6
      ) {
        triggerPoke();
      }
      st.dragging = false;
    };

    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp);

    let rafId = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now * 0.001;

      // Update finish material smoothly (Obsidian vs Forged Bronze)
      if (finishRef.current === "bronze") {
        bodyMetal.color.lerp(new THREE.Color(0xcd9b6a), 0.08);
        bodyMetal.metalness = THREE.MathUtils.lerp(bodyMetal.metalness, 0.92, 0.08);
        bodyMetal.roughness = THREE.MathUtils.lerp(bodyMetal.roughness, 0.38, 0.08);
      } else {
        bodyMetal.color.lerp(new THREE.Color(0x1c1714), 0.08);
        bodyMetal.metalness = THREE.MathUtils.lerp(bodyMetal.metalness, 0.78, 0.08);
        bodyMetal.roughness = THREE.MathUtils.lerp(bodyMetal.roughness, 0.32, 0.08);
      }

      st.mx += (st.tx - st.mx) * Math.min(1, dt * 8);
      st.my += (st.ty - st.my) * Math.min(1, dt * 8);

      if (!st.dragging) {
        st.rotY += st.spinVel;
        st.spinVel *= Math.pow(0.92, dt * 60);
        st.rotY += Math.sin(t * 0.45) * 0.0008;
      }
      stageGroup.rotation.y = st.rotY + st.mx * 0.18;

      camera.position.x = st.mx * 0.28;
      camera.position.y = 0.55 - st.my * 0.16;
      camera.lookAt(0, -0.15, 0);

      // Spring squash & nod
      st.squashV += (0 - st.squash) * 28 * dt;
      st.squashV *= Math.pow(0.82, dt * 60);
      st.squash += st.squashV;
      robot.scale.set(1 - st.squash * 0.45, 1 + st.squash, 1 - st.squash * 0.45);

      const breathe = Math.sin(t * 1.7) * 0.014;
      torso.position.y = 0.58 + breathe;
      torso.rotation.z = Math.sin(t * 0.9) * 0.015;

      st.nodV += (0 - st.nod) * 22 * dt;
      st.nodV *= Math.pow(0.84, dt * 60);
      st.nod += st.nodV;

      head.rotation.y = st.mx * 0.42;
      head.rotation.x = st.my * 0.25 + st.nod;
      head.rotation.z = -st.mx * 0.08 + (st.qAge < 1.2 ? 0.12 : 0);

      for (const e of eyes) {
        e.pupil.position.x = st.mx * 0.036;
        e.pupil.position.y = -st.my * 0.028;
      }

      st.nextBlink -= dt;
      if (st.nextBlink <= 0) {
        st.blink = 1;
        st.nextBlink = 2.4 + Math.random() * 3.2;
      }
      if (st.blink > 0) {
        st.blink = Math.max(0, st.blink - dt * 7.5);
      }
      const lidClose = Math.sin(st.blink * Math.PI);
      for (const e of eyes) {
        e.lid.position.y = 0.24 - lidClose * 0.22;
      }

      st.smile = Math.max(0, st.smile - dt * 0.55);
      mouthR.rotation.z = st.smile * 0.38;
      mouthR.position.y = st.smile * 0.014;

      antTipMat.emissiveIntensity =
        1.6 + Math.sin(t * 3.2) * 0.6 + st.boost * 2.2;

      st.boost = Math.max(0, st.boost - dt * 1.6);
      if (coneMat.uniforms.uBoost) coneMat.uniforms.uBoost.value = st.boost;
      if (coneMat.uniforms.uTime) coneMat.uniforms.uTime.value = t;
      spot.intensity = 16 + st.boost * 9;

      if (st.qAge < 1.6) {
        st.qAge += dt;
        const p = st.qAge / 1.6;
        qMat.opacity = Math.sin(Math.min(1, p) * Math.PI) * 0.95;
        qSprite.position.y = 0.68 + p * 0.28;
      } else {
        qMat.opacity = 0;
      }

      // Dust motes
      const posAttr = moteGeo.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < moteCount; i++) {
        const idxY = i * 3 + 1;
        const idxX = i * 3;
        const curY = (arr[idxY] ?? 0) + dt * (0.06 + (i % 5) * 0.012);
        arr[idxY] = curY > 3.7 ? -1.5 : curY;
        arr[idxX] =
          (arr[idxX] ?? 0) + Math.sin(t * 0.7 + (moteSeed[i] ?? 0)) * 0.0009;
      }
      posAttr.needsUpdate = true;

      // Floor pulses
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        if (!p) continue;
        p.age += dt;
        const k = p.age / 1.3;
        const s = 1 + k * 7.5;
        p.mesh.scale.set(s, s, 1);
        p.mat.opacity = Math.max(0, (1 - k) * 0.65);
        if (k >= 1) {
          scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          p.mat.dispose();
          pulses.splice(i, 1);
        }
      }

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      pmrem.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <>
      <div ref={containerRef} className="stage-canvas-wrap" />
      <div className="stage-vignette" aria-hidden="true" />
      <div className="stage-hint">
        <button
          type="button"
          onClick={() =>
            setFinishMode((m) => (m === "obsidian" ? "bronze" : "obsidian"))
          }
          className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.16em] text-[#ffb13b] hover:underline"
        >
          ✦ Finish:{" "}
          {finishMode === "obsidian" ? "Obsidian & Brass" : "Laocoon Bronze"}
        </button>
        <span className="text-[#6c6459]">|</span>
        <span>Drag to orbit · Tap Straight Man ({pokeCount})</span>
      </div>
      {/* Live Straight Man Monologue Ticker */}
      <div className="pointer-events-none absolute top-[94px] left-[clamp(20px,4vw,56px)] z-6 hidden max-w-md rounded-full border border-[#efe8dc]/12 bg-[#0d0b09]/70 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#a49b8e] backdrop-blur-md lg:flex lg:items-center lg:gap-2.5">
        <span className="h-2 w-2 rounded-full bg-[#ffb13b] shadow-[0_0_10px_#ffb13b]" />
        <span className="truncate">{lastReaction}</span>
      </div>
    </>
  );
}
