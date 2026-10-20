# Implementation Plan: Qevra-Inspired 3D Scroll-Driven Mechanical Stage for HAHA Protocol

## Overview
Implement a high-performance, lightweight 3D orthographic/isometric stage engine in Canvas 2D (mirroring the architecture of Qevra's Aperture Stage Engine) for HAHA Protocol.

The 3D stage features:
- **Zero Heavy 3D Downloads**: Pure Canvas 2D mathematical projection (no 50MB GLTF assets). Instant load and 60–120 FPS on all devices.
- **Scroll-Driven Assembly**: As the user scrolls, objects assemble themselves piece-by-piece with smooth eased timing (exploded mechanical CAD reveal).
- **Interactive Orbit & Inspection**: Mouse/touch drag to rotate 360° with momentum, reset button, and interactive part hover/hotspot callouts.
- **3 Thematic Scenes**:
  1. `01 / The Joke Vault`: Obsidian & gold cryptographic safe with sliding verified-data trays and engraved Merkle roots.
  2. `02 / Consensus Lock`: Multi-ring mechanical combination tumbler with rotating semantic rings and laser alignment.
  3. `03 / Quorum Lattice`: 3D node matrix showing blind juror validation and laser beam consensus.
- **Strict Brand Visuals**: Obsidian black (`#070709`), Warm Amber Gold (`#ffc53d`), and Titanium Silver/Zinc.

---

## File Architecture

```
lib/stage3d/
├── math.ts           # 3D vector math, lerp, clamp, easing curves
├── gfx.ts            # Canvas 2D 3D renderer: camera projection, depth queue, box/cylinder/shadow drawing, lighting
├── types.ts          # Interfaces for scenes, camera, hotspots, and animation states
├── scenes/
│   ├── vault.ts      # Scene 1: The Joke Vault mechanical assembly
│   ├── tumbler.ts    # Scene 2: The Consensus Lock tumbler
│   └── lattice.ts    # Scene 3: The Blind Quorum Lattice
└── engine.ts         # Animation loop, drag rotation, scroll sync, hotspot hit-testing

components/landing/
├── VaultStage3D.tsx  # React UI container with tabs, rotate hints, reset view, and canvas
└── VaultTerminal.tsx # Integrates VaultStage3D into Section 04 (The Data Engine)
```

---

## Bite-Sized Execution Tasks

### Task 1: Scaffolding Vector Math & Easing Functions (`lib/stage3d/math.ts`)
- Implement `clamp`, `lerp`, `TAU`, angle normalization.
- Implement easing primitives (`ease.out`, `ease.inOut`, `piece(progress, start, duration)`).

### Task 2: Implementing the 3D Canvas Projection & Graphics Pipeline (`lib/stage3d/gfx.ts`, `lib/stage3d/types.ts`)
- Implement camera projection `makeCam` and `P(cam, x, y, z)`.
- Implement depth sorting `Queue` for painter's algorithm rendering.
- Implement Lambertian/Phong shaded primitives: `drawBox`, `drawCyl`, `drawFloor`, `drawLine`, `drawShadow`, and engraved text `drawLabel`.
- Implement brand tone materials: `OBSIDIAN`, `WARM_GOLD`, `TITANIUM`, `AMBER_BRIGHT`.

### Task 3: Authoring Scene 1 — The Joke Vault (`lib/stage3d/scenes/vault.ts`)
- Base plate engraved with `HAHA PROTOCOL // JOKE VAULT` and Merkle Root `0x9C4E...3B17`.
- Obsidian walls, titanium guide rails, and sliding data cartridge tray holding verified bit `#BIT-8120`.
- Keyframe-eased scroll assembly (`pBase`, `pBack`, `pTray`, `pCartridge`).

### Task 4: Authoring Scene 2 — The Consensus Lock Tumbler (`lib/stage3d/scenes/tumbler.ts`)
- Cylindrical combination lock with 3 independently rotating tumbler rings.
- Engraved labels: `ENTROPY`, `SEMANTICS`, `SUPERMAJORITY 78%`.
- Laser alignment indicator line that glows gold when tumblers align.

### Task 5: Authoring Scene 3 — The Blind Quorum Lattice (`lib/stage3d/scenes/lattice.ts`)
- 3D ring of validator juror nodes in space.
- Central Merkle verification prism.
- Golden laser beam conduits connecting juror nodes to the center.

### Task 6: Implementing Interactive Stage Engine Controller (`lib/stage3d/engine.ts`)
- Canvas lifecycle (DPR scaling capped at 2, resize observer).
- Drag-to-rotate with inertia/damping and pitch clamping.
- Scroll-driven progress scrub (`u` and formation transitions `f0, f1, f2`).
- Hotspot hit-testing for hovering over 3D parts.

### Task 7: Creating the React UI Component (`components/landing/VaultStage3D.tsx`)
- Scene switcher tabs (`01 / The Vault`, `02 / Consensus Lock`, `03 / Quorum Lattice`).
- Drag-to-rotate visual hint (`RotateCcw`, drag indicator).
- Hover part info callout card showing part name and provenance specs.

### Task 8: Integrating into `components/landing/VaultTerminal.tsx`
- Place `VaultStage3D` in the vault section grid alongside the live replacement cost terminal.
- Connect scroll-progress or viewport visibility to auto-tour / scrub the 3D model.

### Task 9: Verification & Production Deployment
- Verify local build passes with `npm run build`.
- Stage, commit, and push to `main` branch.
- Confirm GitHub Actions CI and production container status.
