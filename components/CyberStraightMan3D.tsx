"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export type FinishTheme = "obsidian" | "bronze" | "sapphire";

interface CyberStraightMan3DProps {
  finishMode?: FinishTheme;
  interactive?: boolean;
  onPoke?: (count: number, reaction: string) => void;
  showControls?: boolean;
}

export default function CyberStraightMan3D({
  finishMode = "obsidian",
  interactive = true,
  onPoke,
  showControls = false,
}: CyberStraightMan3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [activeFinish, setActiveFinish] = useState<FinishTheme>(finishMode);
  const [pokeCount, setPokeCount] = useState(0);
  const [lastReaction, setLastReaction] = useState<string>(
    "Straight Man v2 logic core online. Literal confidence: 99.4%.",
  );
  const [isReady, setIsReady] = useState(false);

  const finishRef = useRef<FinishTheme>(activeFinish);
  useEffect(() => {
    finishRef.current = activeFinish;
  }, [activeFinish]);

  useEffect(() => {
    setActiveFinish(finishMode);
  }, [finishMode]);

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

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.24;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x060608, 12, 28);
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
    const lookTarget = new THREE.Vector3(0, 2.05, 0);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    /* ---------------------------------------------------------
       MATERIALS LIBRARY (CYBERNETIC LUXURY: OBSIDIAN + WARM GOLD)
       --------------------------------------------------------- */
    // Ballistic Composite Armor Plates
    const armorMat = new THREE.MeshPhysicalMaterial({
      color: 0x141418,
      metalness: 0.72,
      roughness: 0.28,
      clearcoat: 0.85,
      clearcoatRoughness: 0.12,
      reflectivity: 0.85,
      envMapIntensity: 1.4,
    });

    // Dark Gunmetal Internal Skeletal Structure
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a20,
      metalness: 0.88,
      roughness: 0.35,
      envMapIntensity: 1.1,
    });

    // Warm Gold Titanium Alloy Accents & Conduits
    const goldTitaniumMat = new THREE.MeshStandardMaterial({
      color: 0xdeb841,
      metalness: 0.96,
      roughness: 0.18,
      envMapIntensity: 1.9,
    });

    // Polished Mirror Chrome Pistons & Rings
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xded8ce,
      metalness: 0.98,
      roughness: 0.12,
      envMapIntensity: 2.0,
    });

    // High-Gloss Visor Glass Outer Shield
    const visorGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x040406,
      metalness: 0.1,
      roughness: 0.04,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      transparent: true,
      opacity: 0.94,
    });

    // Emissive Amber Glow
    const amberGlowMat = new THREE.MeshBasicMaterial({ color: 0xffb13b });
    const intenseGoldMat = new THREE.MeshBasicMaterial({ color: 0xffd56b });

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

    /* ---------------------------------------------------------
       STAGE & LIGHTING SETUP
       --------------------------------------------------------- */
    const floor = addMesh(
      new THREE.CircleGeometry(30, 64),
      new THREE.MeshStandardMaterial({
        color: 0x09090b,
        roughness: 0.75,
        metalness: 0.15,
      }),
      scene,
    );
    floor.rotation.x = -Math.PI / 2;
    floor.castShadow = false;

    // Stage Platform
    const stage = addMesh(
      new THREE.CylinderGeometry(2.1, 2.2, 0.22, 120),
      new THREE.MeshStandardMaterial({
        color: 0x18171d,
        roughness: 0.38,
        metalness: 0.25,
      }),
      scene,
      0,
      0.11,
      0,
    );
    stage.castShadow = false;

    // Glowing Amber Stage Edge Ring
    const lip = new THREE.Mesh(
      new THREE.TorusGeometry(2.11, 0.012, 12, 160),
      amberGlowMat,
    );
    lip.rotation.x = Math.PI / 2;
    lip.position.y = 0.22;
    scene.add(lip);

    // Sinusoidal Velvet Curtain Backdrop
    const cg = new THREE.PlaneGeometry(28, 12, 280, 1);
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
        color: 0x221014,
        roughness: 0.86,
        metalness: 0.04,
      }),
    );
    curtain.position.set(0, 5.4, -4.3);
    curtain.receiveShadow = true;
    scene.add(curtain);

    // Stage Lighting Rig
    scene.add(new THREE.HemisphereLight(0x4a3b30, 0x08080a, 0.6));
    const keySpot = new THREE.SpotLight(0xfff5e6, 0.7, 22, 0.34, 0.88, 1.1);
    keySpot.position.set(-2.6, 4.8, 8);
    keySpot.target.position.set(0, 2.3, 0);
    scene.add(keySpot, keySpot.target);

    const SPOT_BASE = 3.8;
    const apex = new THREE.Vector3(0, 9.6, 1.4);
    const aim = new THREE.Vector3(0, 0.2, 0);
    const spot = new THREE.SpotLight(0xffd7a3, SPOT_BASE, 19, 0.36, 0.45, 1.1);
    spot.position.copy(apex);
    spot.target.position.copy(aim);
    spot.castShadow = true;
    spot.shadow.mapSize.set(1024, 1024);
    spot.shadow.bias = -0.0004;
    spot.shadow.radius = 4;
    scene.add(spot, spot.target);

    const wash = new THREE.SpotLight(0xff8f3d, 1.1, 16, 0.55, 0.9, 1.3);
    wash.position.set(0, 6.6, 2.5);
    wash.target.position.set(0, 3.2, -4.2);
    scene.add(wash, wash.target);

    // Warm Gold Rim Accent
    const rim1 = new THREE.DirectionalLight(0xffb84d, 1.35);
    rim1.position.set(-5, 5, -3);
    scene.add(rim1);

    // Cool Titanium Rim Accent
    const rim2 = new THREE.DirectionalLight(0x7da2c8, 0.85);
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

    /* ---------------------------------------------------------
       THE HIGH-TECH CYBER ROBOT RIG ("THE STRAIGHT MAN v2")
       --------------------------------------------------------- */
    const rig = new THREE.Group();
    rig.position.y = 0.22;
    scene.add(rig);

    // Upgraded CNC Machined Stool
    addMesh(new THREE.CylinderGeometry(0.52, 0.5, 0.08, 48), chassisMat, rig, 0, 1.0, 0);
    addMesh(
      new THREE.CylinderGeometry(0.48, 0.48, 0.03, 48),
      new THREE.MeshStandardMaterial({ color: 0x121216, roughness: 0.5 }),
      rig,
      0,
      1.05,
      0,
    );
    // Knurled CNC rim ring
    const stoolRim = addMesh(
      new THREE.TorusGeometry(0.49, 0.012, 12, 64),
      goldTitaniumMat,
      rig,
      0,
      1.045,
      0,
    );
    stoolRim.rotation.x = Math.PI / 2;

    // Stool 3 Legs with Knurled Brackets
    for (let i = 0; i < 3; i++) {
      const a = i * 2.094 + 0.5;
      addLimb(
        [Math.cos(a) * 0.36, 0.97, Math.sin(a) * 0.36],
        [Math.cos(a) * 0.52, 0, Math.sin(a) * 0.52],
        0.024,
        chromeMat,
        rig,
      );
    }
    const stoolFootRing = addMesh(
      new THREE.TorusGeometry(0.44, 0.016, 12, 64),
      goldTitaniumMat,
      rig,
      0,
      0.38,
      0,
    );
    stoolFootRing.rotation.x = Math.PI / 2;

    // Robot Main Group
    const bot = new THREE.Group();
    rig.add(bot);

    // Articulated Pelvis & Mechanical Hips
    addMesh(new THREE.CylinderGeometry(0.38, 0.44, 0.2, 40), chassisMat, bot, 0, 1.15, 0);
    // Pelvic Armor Plate
    const pelvisPlate = addMesh(
      new THREE.BoxGeometry(0.32, 0.16, 0.06),
      armorMat,
      bot,
      0,
      1.14,
      0.22,
    );
    pelvisPlate.rotation.x = 0.2;

    // Articulated Legs Resting on Stool Ring
    [-1, 1].forEach((sg) => {
      // Hip rotary actuator disc
      const hipDisc = addMesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.08, 24),
        goldTitaniumMat,
        bot,
        sg * 0.26,
        1.14,
        0.05,
      );
      hipDisc.rotation.z = Math.PI / 2;

      // Heavy cyber thigh
      addLimb([sg * 0.25, 1.14, 0.05], [sg * 0.3, 1.1, 0.68], 0.11, armorMat, bot);

      // Knee actuator housing with chrome cap
      addMesh(
        new THREE.SphereGeometry(0.12, 24, 16),
        chassisMat,
        bot,
        sg * 0.3,
        1.1,
        0.68,
      );
      const kneeCap = addMesh(
        new THREE.TorusGeometry(0.11, 0.014, 12, 24),
        goldTitaniumMat,
        bot,
        sg * 0.3,
        1.1,
        0.72,
      );
      kneeCap.rotation.y = Math.PI / 2;

      // Calf strut down to stool footrest
      addLimb([sg * 0.3, 1.08, 0.7], [sg * 0.31, 0.2, 0.78], 0.09, chassisMat, bot);
      // Cyber ankle & foot pad
      addMesh(
        new THREE.BoxGeometry(0.18, 0.1, 0.34),
        armorMat,
        bot,
        sg * 0.31,
        0.12,
        0.86,
      );
    });

    // ---------------------------------------------------------
    // TORSO: EXOSKELETON, RADIATOR RIBS & GOLDEN LOGIC CORE
    // ---------------------------------------------------------
    const torso = new THREE.Group();
    torso.position.y = 1.25;
    bot.add(torso);

    // Spine Column (Segmented vertebra cylinders)
    for (let i = 0; i < 4; i++) {
      const vY = 0.15 + i * 0.22;
      addMesh(new THREE.CylinderGeometry(0.14, 0.15, 0.14, 20), chassisMat, torso, 0, vY, -0.04);
      addMesh(new THREE.TorusGeometry(0.16, 0.015, 8, 24), goldTitaniumMat, torso, 0, vY, -0.04)
        .rotation.x = Math.PI / 2;
    }

    // Outer Exoskeleton Torso Shell (Faceted aerodynamic armor)
    addMesh(
      new THREE.CylinderGeometry(0.55, 0.42, 0.95, 32),
      armorMat,
      torso,
      0,
      0.5,
      0,
    );

    // Lateral Radiator Cooling Fins (4 pairs on ribs)
    for (let i = 0; i < 4; i++) {
      const finY = 0.28 + i * 0.16;
      [-1, 1].forEach((sg) => {
        const fin = addMesh(
          new THREE.BoxGeometry(0.16, 0.024, 0.38),
          chassisMat,
          torso,
          sg * 0.44,
          finY,
          0.02,
        );
        fin.rotation.z = sg * -0.25;
        fin.rotation.y = sg * 0.2;
      });
    }

    // Split Pectoral Armor Plates (Left & Right chest shields)
    [-1, 1].forEach((sg) => {
      const chestPlate = addMesh(
        new THREE.BoxGeometry(0.24, 0.34, 0.08),
        armorMat,
        torso,
        sg * 0.22,
        0.66,
        0.44,
      );
      chestPlate.rotation.y = sg * -0.28;
      chestPlate.rotation.x = -0.15;

      // Gold Accent Trim on chest plate
      const trim = addMesh(
        new THREE.BoxGeometry(0.02, 0.32, 0.02),
        goldTitaniumMat,
        chestPlate,
        sg * 0.1,
        0,
        0.045,
      );
    });

    // Clavicle Collar Ring
    const collar = addMesh(
      new THREE.TorusGeometry(0.34, 0.04, 12, 48),
      goldTitaniumMat,
      torso,
      0,
      0.98,
      0,
    );
    collar.rotation.x = Math.PI / 2;

    // GOLDEN LOGIC REACTOR CORE ("The Comedy Engine")
    const coreGroup = new THREE.Group();
    coreGroup.position.set(0, 0.58, 0.4);
    torso.add(coreGroup);

    // Recessed core cavity
    addMesh(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 24), chassisMat, coreGroup, 0, 0, 0)
      .rotation.x = Math.PI / 2;

    // Glowing Reactor Core Sphere
    const reactorCoreMat = new THREE.MeshBasicMaterial({ color: 0xffb83b });
    const reactorSphere = addMesh(
      new THREE.SphereGeometry(0.09, 24, 16),
      reactorCoreMat,
      coreGroup,
      0,
      0,
      0.03,
    );
    reactorSphere.castShadow = false;

    // Dual Gyroscopic Containment Rings (Spinning around reactor)
    const gyroRing1 = addMesh(
      new THREE.TorusGeometry(0.125, 0.012, 10, 32),
      goldTitaniumMat,
      coreGroup,
      0,
      0,
      0.03,
    );
    const gyroRing2 = addMesh(
      new THREE.TorusGeometry(0.145, 0.01, 8, 32),
      chromeMat,
      coreGroup,
      0,
      0,
      0.03,
    );

    // Internal Core PointLight (illuminates chest & floor)
    const reactorLight = new THREE.PointLight(0xffb83b, 1.2, 2.8);
    reactorLight.position.set(0, 0, 0.05);
    coreGroup.add(reactorLight);

    // Micro Fiber-Optic Gold Conduits (Feeding from core to shoulders)
    [-1, 1].forEach((sg) => {
      addLimb(
        [sg * 0.08, 0.58, 0.42],
        [sg * 0.35, 0.88, 0.2],
        0.016,
        goldTitaniumMat,
        torso,
      );
    });

    // ---------------------------------------------------------
    // ARMS: ARTICULATED PAULDRONS, HYDRAULICS & CYBER HANDS
    // ---------------------------------------------------------
    [-1, 1].forEach((sg) => {
      // Articulated Shoulder Pauldron (Deltoid Armor Plate)
      const pauldron = new THREE.Group();
      pauldron.position.set(sg * 0.65, 0.88, 0);
      torso.add(pauldron);

      // Pauldron outer shell
      const pShell = addMesh(
        new THREE.SphereGeometry(0.18, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.65),
        armorMat,
        pauldron,
      );
      pShell.rotation.z = sg * -0.4;

      // Pauldron gold perimeter bevel
      const pBevel = addMesh(
        new THREE.TorusGeometry(0.175, 0.014, 10, 32),
        goldTitaniumMat,
        pauldron,
      );
      pBevel.rotation.x = Math.PI / 2;

      // Rotary Deltoid Joint
      addMesh(new THREE.SphereGeometry(0.13, 20, 16), chassisMat, pauldron, 0, -0.04, 0);

      // Upper Arm Dual Titanium Spars
      addLimb(
        [sg * 0.68, 0.82, 0],
        [sg * 0.74, 0.32, 0.28],
        0.055,
        armorMat,
        torso,
      );
      addLimb(
        [sg * 0.63, 0.8, -0.04],
        [sg * 0.7, 0.3, 0.22],
        0.035,
        chromeMat,
        torso,
      );

      // Elbow Rotary Actuator Disc
      const elbowDisc = addMesh(
        new THREE.CylinderGeometry(0.11, 0.11, 0.07, 24),
        goldTitaniumMat,
        torso,
        sg * 0.74,
        0.32,
        0.28,
      );
      elbowDisc.rotation.z = Math.PI / 2;
      elbowDisc.rotation.y = sg * 0.3;

      // Forearm Cyber Gauntlet
      if (sg === -1) {
        // Left hand resting on thigh
        addLimb(
          [-0.74, 0.32, 0.28],
          [-0.38, -0.02, 0.62],
          0.075,
          armorMat,
          torso,
        );

        // Wrist actuator cuff
        addMesh(new THREE.TorusGeometry(0.08, 0.014, 10, 24), goldTitaniumMat, torso, -0.38, -0.02, 0.62)
          .rotation.x = Math.PI / 2;

        // Articulated Cyber Hand (Left Palm + 4 articulated fingers)
        const leftHand = new THREE.Group();
        leftHand.position.set(-0.36, -0.04, 0.65);
        leftHand.rotation.set(0.3, -0.4, 0);
        torso.add(leftHand);

        // Palm base
        addMesh(new THREE.BoxGeometry(0.12, 0.04, 0.12), chassisMat, leftHand);

        // 4 Articulated Fingers (Thumb, Index, Middle, Ring)
        [-0.04, 0, 0.04].forEach((fx, idx) => {
          // Knuckle
          addMesh(new THREE.SphereGeometry(0.018, 12, 8), goldTitaniumMat, leftHand, fx, -0.01, 0.06);
          // Proximal Phalanx
          addLimb([fx, -0.01, 0.06], [fx * 1.1, -0.04, 0.11], 0.014, armorMat, leftHand);
          // Distal Phalanx (curling down onto thigh)
          addLimb([fx * 1.1, -0.04, 0.11], [fx * 1.1, -0.09, 0.13], 0.012, chromeMat, leftHand);
        });
        // Thumb
        addLimb([-0.06, 0.01, 0.02], [-0.09, -0.02, 0.06], 0.015, armorMat, leftHand);
      } else {
        // Right Arm Gripping Mic Stand
        addLimb(
          [0.74, 0.32, 0.28],
          [0.55, 0.65, 0.68],
          0.075,
          armorMat,
          torso,
        );

        // Wrist actuator cuff
        addMesh(new THREE.TorusGeometry(0.08, 0.014, 10, 24), goldTitaniumMat, torso, 0.55, 0.65, 0.68)
          .rotation.x = Math.PI / 2;

        // Articulated Right Hand Gripping Mic Stand
        const rightHand = new THREE.Group();
        rightHand.position.set(0.55, 0.65, 0.68);
        rightHand.rotation.set(-0.2, 0.5, 0.3);
        torso.add(rightHand);

        // Palm
        addMesh(new THREE.BoxGeometry(0.11, 0.05, 0.1), chassisMat, rightHand);

        // Fingers wrapping around mic shaft
        [-0.035, 0, 0.035].forEach((fx) => {
          addMesh(new THREE.SphereGeometry(0.018, 12, 8), goldTitaniumMat, rightHand, fx, 0.02, 0.05);
          addLimb([fx, 0.02, 0.05], [fx, 0.03, 0.1], 0.013, armorMat, rightHand);
          addLimb([fx, 0.03, 0.1], [fx, -0.03, 0.12], 0.011, chromeMat, rightHand);
        });
        // Thumb wrapped opposite
        addLimb([0.05, -0.01, 0.03], [0.06, 0.02, 0.08], 0.014, armorMat, rightHand);
      }
    });

    // ---------------------------------------------------------
    // NECK: DUAL ARTICULATED HYDRAULIC PISTONS & SPINE
    // ---------------------------------------------------------
    const neckBase = new THREE.Group();
    neckBase.position.set(0, 1.05, 0);
    torso.add(neckBase);

    // Central vertebrae column
    addMesh(new THREE.CylinderGeometry(0.12, 0.14, 0.26, 20), chassisMat, neckBase, 0, 0.13, 0);

    // Dual Hydraulic Neck Dampers (Left & Right pistons)
    const leftPiston = new THREE.Group();
    leftPiston.position.set(-0.16, 0.06, 0.02);
    neckBase.add(leftPiston);
    addMesh(new THREE.CylinderGeometry(0.032, 0.032, 0.18, 16), chassisMat, leftPiston, 0, 0.09, 0);
    const leftPistonRod = addMesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.18, 16),
      chromeMat,
      leftPiston,
      0,
      0.16,
      0,
    );

    const rightPiston = new THREE.Group();
    rightPiston.position.set(0.16, 0.06, 0.02);
    neckBase.add(rightPiston);
    addMesh(new THREE.CylinderGeometry(0.032, 0.032, 0.18, 16), chassisMat, rightPiston, 0, 0.09, 0);
    const rightPistonRod = addMesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.18, 16),
      chromeMat,
      rightPiston,
      0,
      0.16,
      0,
    );

    // ---------------------------------------------------------
    // HEAD: STEALTH POLYHEDRAL CYBER-CHASSIS & DYNAMIC VISOR
    // ---------------------------------------------------------
    const headPivot = new THREE.Group();
    headPivot.position.y = 1.28;
    torso.add(headPivot);

    const head = new THREE.Group();
    head.position.y = 0.58;
    headPivot.add(head);

    // Main Stealth Polyhedral Helmet Solid
    // (Beveled extruded angular contour)
    const helmShape = new THREE.Shape();
    // Angular cyber jawline and chiseled crown
    helmShape.moveTo(-0.68, -0.42);
    helmShape.lineTo(0.68, -0.42);
    helmShape.lineTo(0.78, 0.15);
    helmShape.lineTo(0.64, 0.58);
    helmShape.lineTo(0.32, 0.68);
    helmShape.lineTo(-0.32, 0.68);
    helmShape.lineTo(-0.64, 0.58);
    helmShape.lineTo(-0.78, 0.15);
    helmShape.closePath();

    const helmGeo = new THREE.ExtrudeGeometry(helmShape, {
      depth: 0.78,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.07,
      bevelSegments: 4,
    });
    helmGeo.center();
    addMesh(helmGeo, armorMat, head);

    // Crown Brow Ridge (Angled stealth visor hood)
    const browRidge = addMesh(
      new THREE.BoxGeometry(1.2, 0.1, 0.32),
      armorMat,
      head,
      0,
      0.46,
      0.34,
    );
    browRidge.rotation.x = 0.28;

    // Gold Titanium Crown Trim
    const crownTrim = addMesh(
      new THREE.TorusGeometry(0.48, 0.016, 8, 32, Math.PI),
      goldTitaniumMat,
      head,
      0,
      0.58,
      0.18,
    );
    crownTrim.rotation.x = -Math.PI / 2;

    // Occipital Exhaust Cooling Fins (Back of head)
    for (let i = 0; i < 3; i++) {
      const eFin = addMesh(
        new THREE.BoxGeometry(0.72, 0.024, 0.12),
        goldTitaniumMat,
        head,
        0,
        0.18 - i * 0.15,
        -0.45,
      );
      eFin.rotation.x = -0.3;
    }

    // DYNAMIC CURVED VISOR FACE
    const faceZ = 0.39 + 0.08;
    const visorShape = new THREE.Shape();
    visorShape.moveTo(-0.54, -0.26);
    visorShape.lineTo(0.54, -0.26);
    visorShape.lineTo(0.58, 0.26);
    visorShape.lineTo(-0.58, 0.26);
    visorShape.closePath();

    const visorGeo = new THREE.ShapeGeometry(visorShape);
    const visor = addMesh(visorGeo, visorGlassMat, head, 0, 0.08, faceZ);
    visor.castShadow = false;

    // PROCEDURAL AUDIO SPECTROGRAM DISPLAY (Equalizer wave bars inside visor)
    const spectrogramGroup = new THREE.Group();
    spectrogramGroup.position.set(0, 0.06, faceZ + 0.008);
    head.add(spectrogramGroup);

    // 12 Animated Spectrogram Frequency Bars
    const eqBars: THREE.Mesh[] = [];
    const NUM_BARS = 14;
    const barWidth = 0.048;
    const barSpacing = 0.07;
    const barStartX = -((NUM_BARS - 1) * barSpacing) / 2;

    for (let i = 0; i < NUM_BARS; i++) {
      const bGeo = new THREE.BoxGeometry(barWidth, 0.1, 0.01);
      const bMat = new THREE.MeshBasicMaterial({
        color: 0xffc53d,
        transparent: true,
        opacity: 0.88,
      });
      const bar = addMesh(bGeo, bMat, spectrogramGroup, barStartX + i * barSpacing, 0, 0);
      bar.castShadow = false;
      eqBars.push(bar);
    }

    // DUAL-APERTURE OPTICAL SENSOR LENSES (Glowing aperture rings)
    const opticsGroup = new THREE.Group();
    opticsGroup.position.set(0, 0.18, faceZ + 0.012);
    head.add(opticsGroup);

    const eyeLenses: THREE.Mesh[] = [];
    [-1, 1].forEach((sg) => {
      // Outer gold iris ring
      const iris = addMesh(
        new THREE.TorusGeometry(0.085, 0.016, 12, 32),
        goldTitaniumMat,
        opticsGroup,
        sg * 0.28,
        0,
        0,
      );
      // Inner glowing core pupil
      const pupil = addMesh(
        new THREE.SphereGeometry(0.045, 18, 12),
        intenseGoldMat,
        opticsGroup,
        sg * 0.28,
        0,
        0.005,
      );
      pupil.castShadow = false;
      eyeLenses.push(pupil);
    });

    // Temple Micro LED Status Matrix (4 tiny amber lights on left temple)
    const templeGroup = new THREE.Group();
    templeGroup.position.set(-0.76, 0.22, 0.1);
    head.add(templeGroup);
    const templeLeds: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const led = addMesh(
        new THREE.SphereGeometry(0.016, 10, 8),
        amberGlowMat,
        templeGroup,
        0,
        i * 0.045,
        0,
      );
      led.castShadow = false;
      templeLeds.push(led);
    }

    // FLOATING SENSOR HALO (Replaces toy stick antenna)
    const haloGroup = new THREE.Group();
    haloGroup.position.set(0, 0.88, 0.02);
    head.add(haloGroup);

    // Floating Main Halo Ring
    const haloRing = addMesh(
      new THREE.TorusGeometry(0.38, 0.014, 12, 64),
      goldTitaniumMat,
      haloGroup,
    );
    haloRing.rotation.x = Math.PI / 2;

    // Glowing Inner Plasma Ring
    const haloGlow = new THREE.Mesh(
      new THREE.TorusGeometry(0.375, 0.008, 8, 48),
      intenseGoldMat,
    );
    haloGlow.rotation.x = Math.PI / 2;
    haloGroup.add(haloGlow);

    // 3 Orbiting Data Bit Nodes on Halo
    const haloNodes: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const node = addMesh(
        new THREE.SphereGeometry(0.028, 12, 8),
        amberGlowMat,
        haloGroup,
      );
      node.castShadow = false;
      haloNodes.push(node);
    }

    // Halo Central Beacon Light
    const haloLight = new THREE.PointLight(0xffb83b, 0.8, 3.2);
    haloLight.position.set(0, 0.02, 0);
    haloGroup.add(haloLight);

    // ACOUSTIC EAR HEAT-SINK TURRETS (Multi-tier CNC ear pods)
    [-1, 1].forEach((sg) => {
      const earGroup = new THREE.Group();
      earGroup.position.set(sg * 0.86, 0.08, 0.02);
      head.add(earGroup);

      // Base cylinder pod
      const earBase = addMesh(
        new THREE.CylinderGeometry(0.2, 0.22, 0.16, 32),
        chassisMat,
        earGroup,
      );
      earBase.rotation.z = Math.PI / 2;

      // Radial cooling fins
      for (let f = 0; f < 3; f++) {
        const finRing = addMesh(
          new THREE.TorusGeometry(0.21, 0.012, 8, 32),
          armorMat,
          earGroup,
          sg * (f * 0.04 - 0.04),
          0,
          0,
        );
        finRing.rotation.y = Math.PI / 2;
      }

      // Outer gold resonator ring
      const goldRing = addMesh(
        new THREE.TorusGeometry(0.17, 0.016, 10, 36),
        goldTitaniumMat,
        earGroup,
        sg * 0.09,
        0,
        0,
      );
      goldRing.rotation.y = Math.PI / 2;

      // Center amber acoustic lens
      const lens = addMesh(
        new THREE.SphereGeometry(0.08, 16, 12),
        amberGlowMat,
        earGroup,
        sg * 0.095,
        0,
        0,
      );
      lens.scale.set(0.4, 1, 1);
      lens.castShadow = false;
    });

    // ---------------------------------------------------------
    // VINTAGE STAGE BROADCAST MICROPHONE
    // ---------------------------------------------------------
    const mic = new THREE.Group();
    mic.position.set(0.68, 0, 0.85);
    rig.add(mic);

    // Cast Iron Heavy Base
    addMesh(new THREE.CylinderGeometry(0.24, 0.28, 0.04, 40), chassisMat, mic, 0, 0.02, 0);
    // Vertical Chrome Stand
    addLimb([0, 0, 0], [0, 1.85, 0], 0.022, chromeMat, mic);
    // Knurled Height Adjustment Clutch
    addMesh(new THREE.CylinderGeometry(0.04, 0.04, 0.08, 20), goldTitaniumMat, mic, 0, 1.85, 0);

    // Articulated Boom Arm
    const boomEnd: [number, number, number] = [-0.15, 2.3, -0.05];
    addLimb([0, 1.85, 0], boomEnd, 0.018, chromeMat, mic);

    // Mic Capsule Shockmount
    const shockMount = addMesh(
      new THREE.TorusGeometry(0.12, 0.014, 10, 32),
      goldTitaniumMat,
      mic,
      boomEnd[0],
      boomEnd[1],
      boomEnd[2],
    );
    shockMount.rotation.y = Math.PI / 4;

    // Capsule Grille Housing
    const grille = addMesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.16, 24),
      chassisMat,
      mic,
      boomEnd[0],
      boomEnd[1] + 0.02,
      boomEnd[2],
    );
    // Wireframe Gold Grille Cage
    const gw = new THREE.Mesh(
      new THREE.CylinderGeometry(0.074, 0.074, 0.165, 16, 4, true),
      new THREE.MeshBasicMaterial({
        color: 0xffc53d,
        wireframe: true,
        transparent: true,
        opacity: 0.65,
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
          color: 0xffb83b,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
        }),
      );
      rm.rotation.x = -Math.PI / 2;
      rm.position.y = 0.225;
      rm.userData.life = 1;
      scene.add(rm);
      rings.push(rm);
    }

    /* ---------------------------------------------------------
       INTERACTION, SPRING PHYSICS & ANIMATION STATE
       --------------------------------------------------------- */
    const st = {
      t0: 0,
      intro: 0,
      ndc: new THREE.Vector2(0, 0),
      hover: false,
      heat: 0.2,
      drag: null as {
        x: number;
        y: number;
        x0: number;
        y0: number;
        t: number;
        t0: number;
        moved: number;
      } | null,
      yaw: 0,
      pitch: 0,
      yawV: 0,
      hYaw: 0,
      hPitch: 0,
      hRoll: 0,
      rollT: 0,
      lastMove: 0,
      nextTilt: 3.5,
      sq: 0,
      sqV: 0,
      sqT: 0,
      rock: 0,
      rockV: 0,
      blink: 0,
      nextBlink: 2.2,
      smile: 0,
      taps: 0,
      flare: 0,
    };

    let w = 0;
    let h = 0;
    let mobile = false;
    let raf = 0;
    let last = 0;
    let time = 0;

    const resize = () => {
      w = canvas.clientWidth || window.innerWidth;
      h = canvas.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      mobile = w < 860;
      camera.aspect = w / h;
      if (mobile) {
        camera.fov = 34;
        camera.setViewOffset(w, h, 0, h * 0.15, w, h);
      } else {
        camera.fov = 28;
        camera.setViewOffset(w, h, -w * 0.16, h * 0.02, w, h);
      }
      camera.updateProjectionMatrix();
    };

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
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
        st.pitch = Math.max(-0.25, Math.min(0.25, st.pitch + dy * 0.003));
        st.drag.x = e.clientX;
        st.drag.y = e.clientY;
        st.drag.t = performance.now();
      }
    };

    canvas.addEventListener("pointermove", onMove);

    const onDown = (e: PointerEvent) => {
      if (!interactive) return;
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
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {}
    };

    canvas.addEventListener("pointerdown", onDown);

    const REACTIONS = [
      "“Wait. Are you saying comedy reached mathematical determinism?” [Conf: 99.4%]",
      "“Spectrogram anomaly: Punchline frequency spike detected at 14.2 kHz.” [Conf: 98.9%]",
      "“Evaluating semantic entropy of current routine: Variance approaching zero.” [Conf: 99.2%]",
      "“Straight Man logic core recalibrated: Deadpan smirk threshold lowered by 3.2%.” [Conf: 97.8%]",
      "“Critical glitch: Humor detection algorithm registered unexpected amusement.” (Smile Emote Triggered)",
    ];

    const onUp = () => {
      if (!st.drag) return;
      const tap = st.drag.moved < 8 && performance.now() - st.drag.t0 < 400;
      st.drag = null;
      st.sqT = 0;

      if (tap) {
        st.rockV -= 2.8;
        st.flare = 1;
        st.taps++;
        setPokeCount(st.taps);

        const rg = rings.find((r) => r.userData.life >= 1) || rings[0];
        if (rg) rg.userData.life = 0;

        const reactionText =
          st.taps % 5 === 0
            ? REACTIONS[4]!
            : REACTIONS[st.taps % (REACTIONS.length - 1)]!;

        setLastReaction(reactionText);
        if (onPoke) {
          onPoke(st.taps, reactionText);
        }
      }
    };

    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    const damp = (a: number, b: number, k: number, dt: number) =>
      a + (b - a) * (1 - Math.exp(-k * dt));

    /* ---------------------------------------------------------
       RENDER FRAME LOOP
       --------------------------------------------------------- */
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      time += dt;

      if (!st.t0) {
        st.t0 = now;
        setIsReady(true);
      }
      st.intro = Math.min(1, (now - st.t0) / 1600);
      const k = st.intro;

      // Update finish theme dynamically
      const currentFinish = finishRef.current;
      if (currentFinish === "bronze") {
        armorMat.color.lerp(new THREE.Color(0xb87a3d), 0.08);
        armorMat.metalness = THREE.MathUtils.lerp(armorMat.metalness, 0.85, 0.08);
        armorMat.roughness = THREE.MathUtils.lerp(armorMat.roughness, 0.22, 0.08);
      } else if (currentFinish === "sapphire") {
        armorMat.color.lerp(new THREE.Color(0x1d3557), 0.08);
        armorMat.metalness = THREE.MathUtils.lerp(armorMat.metalness, 0.9, 0.08);
        armorMat.roughness = THREE.MathUtils.lerp(armorMat.roughness, 0.18, 0.08);
      } else {
        // Obsidian Onyx
        armorMat.color.lerp(new THREE.Color(0x141418), 0.08);
        armorMat.metalness = THREE.MathUtils.lerp(armorMat.metalness, 0.72, 0.08);
        armorMat.roughness = THREE.MathUtils.lerp(armorMat.roughness, 0.28, 0.08);
      }

      st.flare = Math.max(0, st.flare - dt * 1.8);

      // Spotlights & Glow Pulses
      spot.intensity = SPOT_BASE * k * (1 + st.flare * 0.4);
      wash.intensity = 1.1 * k;
      rim1.intensity = 1.35 * k;
      rim2.intensity = 0.85 * k;
      keySpot.intensity = 0.7 * k;

      if (coneMat.uniforms.uK) {
        coneMat.uniforms.uK.value = 0.55 * k * (1 + st.flare * 0.5);
      }

      // Reactor Core Breathing Pulse & Poke Flare
      const corePulse = Math.sin(time * 2.4) * 0.5 + 0.5;
      reactorCoreMat.color
        .setRGB(1, 0.72, 0.25)
        .multiplyScalar(0.7 + 0.3 * corePulse + st.flare * 0.8);
      reactorLight.intensity = (1.2 + 0.6 * corePulse + st.flare * 2.5) * k;

      // Gyroscopic Containment Rings Spin
      gyroRing1.rotation.x = time * 1.8;
      gyroRing1.rotation.y = time * 1.2;
      gyroRing2.rotation.z = -time * 1.4;
      gyroRing2.rotation.x = time * 0.9;

      // Halo Rotation & Orbiting Nodes
      haloGroup.rotation.y = time * 0.5;
      haloNodes.forEach((node, idx) => {
        const angle = time * 1.5 + (idx * Math.PI * 2) / 3;
        node.position.set(Math.cos(angle) * 0.38, Math.sin(time * 3 + idx) * 0.015, Math.sin(angle) * 0.38);
      });
      haloLight.intensity = (0.8 + 0.3 * Math.sin(time * 3) + st.flare * 1.5) * k;

      // ANIMATED AUDIO SPECTROGRAM EQ BARS (Inside Visor)
      eqBars.forEach((bar, idx) => {
        // Procedural frequency modulation
        const freq1 = Math.sin(time * 7 + idx * 0.65);
        const freq2 = Math.cos(time * 11 + idx * 0.9);
        const height = Math.max(
          0.04,
          (0.08 + Math.abs(freq1 * 0.12 + freq2 * 0.08)) * (1 + st.flare * 0.8),
        );
        bar.scale.y = height / 0.1;
        bar.position.y = height / 2 - 0.04;
      });

      // Temple Micro LEDs Blinking Cycle
      templeLeds.forEach((led, idx) => {
        const on = (Math.floor(time * 6) + idx) % 4 === 0;
        (led.material as THREE.MeshBasicMaterial).color.setHex(on ? 0xffc53d : 0x4a320d);
      });

      // Drag / Inertia on Bot Body
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
      torso.scale.y = 1 + Math.sin(time * 1.8) * 0.008;

      // Head Tracking & Deadpan Tilts
      const tmp = new THREE.Vector3();
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
        st.rollT = st.rollT ? 0 : (Math.random() < 0.5 ? -1 : 1) * 0.18;
        st.nextTilt = st.rollT ? 1.4 : 3 + Math.random() * 4;
      }
      st.hYaw = damp(st.hYaw, yawT, 4, dt);
      st.hPitch = damp(st.hPitch, pitchT, 3, dt);
      st.hRoll = damp(st.hRoll, st.rollT, 3, dt);
      headPivot.rotation.set(st.hPitch, st.hYaw, st.hRoll);
      headPivot.position.y = 1.28 + Math.sin(time * 1.8) * 0.012;

      // Hydraulic Neck Pistons Slide Tracking
      leftPistonRod.position.y = 0.16 + st.hPitch * 0.08 - st.hRoll * 0.05;
      rightPistonRod.position.y = 0.16 + st.hPitch * 0.08 + st.hRoll * 0.05;

      // Squash and stretch spring
      st.sqV += (170 * (st.sqT - st.sq) - 12 * st.sqV) * dt;
      st.sq += st.sqV * dt;
      head.scale.set(1 + st.sq * 0.08, 1 - st.sq * 0.14, 1 + st.sq * 0.08);

      // Expanding Shockwave Rings
      rings.forEach((r) => {
        const L = r.userData.life;
        if (L < 1) {
          r.userData.life = Math.min(1, L + dt * 0.9);
          const s = 1 + L * 2.2;
          r.scale.set(s, s, 1);
          (r.material as THREE.MeshBasicMaterial).opacity = (1 - L) * 0.85;
        } else {
          (r.material as THREE.MeshBasicMaterial).opacity = 0;
        }
      });

      // Camera Position
      const dist = mobile ? 14.5 : 12.0;
      camera.position.set(0, 2.5, dist);
      camera.lookAt(lookTarget);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      renderer.dispose();
      pmrem.dispose();
    };
  }, [interactive]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[500px] overflow-hidden select-none"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />

      {/* Status Overlay */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#0a0a0e]/80 border border-[#ffc53d]/30 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-[#ffc53d] animate-pulse shadow-[0_0_8px_#ffc53d]" />
          <span className="text-xs font-mono tracking-widest text-[#ffc53d] uppercase font-semibold">
            THE STRAIGHT MAN v2 // FRONTIER CYBER-CORE
          </span>
        </div>

        <div className="max-w-md px-3.5 py-2 rounded-xl bg-[#0a0a0e]/75 border border-white/10 backdrop-blur-md">
          <p className="text-xs text-zinc-300 font-mono italic">
            {lastReaction}
          </p>
        </div>
      </div>

      {/* Interactive Controls (if enabled) */}
      {showControls && (
        <div className="absolute bottom-6 right-6 z-10 flex items-center gap-2 bg-[#0a0a0e]/80 border border-white/10 rounded-2xl p-2 backdrop-blur-md">
          {(["obsidian", "bronze", "sapphire"] as FinishTheme[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setActiveFinish(mode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
                activeFinish === mode
                  ? "bg-[#ffc53d] text-black shadow-[0_0_12px_rgba(255,197,61,0.4)]"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {mode.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {/* Interaction Hint */}
      <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
        <span className="text-[11px] font-mono text-zinc-500 tracking-wider">
          DRAG TO ROTATE 360° • TAP TO STIMULATE LOGIC REACTOR ({pokeCount} TAPS)
        </span>
      </div>
    </div>
  );
}
