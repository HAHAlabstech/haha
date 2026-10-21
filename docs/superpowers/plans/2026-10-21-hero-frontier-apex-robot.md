# Frontier Apex 3D Robot & Scroll-Driven Choreography Implementation Plan

> **Goal**: Replace the outdated procedural robot in `components/landing/LandingShowtimeHero.tsx` with the user-approved **Frontier Apex (Military Cyber-Mecha)**, the **Cybernetic Throne**, and the **Vintage Studio Ribbon Holo-Mic**, featuring dynamic **scroll-driven bipedal choreography** (sitting on throne at rest → standing up → stepping forward & commanding the stage on scroll).

---

## 1. Overview & Architecture

### Components & File Scope:
1. `components/landing/LandingShowtimeHero.tsx` (Main Production Hero):
   - Replace old robot primitives (lines 330–480) with the new **Frontier Apex** geometry, materials, and hierarchy.
   - Add the **Cybernetic Throne** with hexagonal CNC titanium base plate, central hydraulic shock absorber column, 4 outrigger struts, knurled footrest ring, and mechanical articulated spine backrest.
   - Add the **Vintage Ribbon Holo-Microphone** with octagonal base, glowing analog VU meter dial, telescopic riser with gold spiral cable, gimbal shockmount rings, and inner glowing vacuum tube capsule.
   - Connect **scroll-driven kinematic rigging**:
     - At `scroll = 0.0`: Sits poised on the throne, head tracking cursor, spectrogram active.
     - At `scroll = 0.25 -> 0.50` (Chapter 2): Robot **stands up off the throne**, unbending knees and extending spine actuators.
     - At `scroll = 0.50 -> 0.75` (Chapter 3): Robot **steps forward toward the stage edge**, leaning in and taking command of the mic.
     - At `scroll = 0.75 -> 1.00` (Chapter 4 / Climax): Arm delivers an expressive stage gesture, halo spins into overdrive as camera dives forward into the light.
2. `public/robot-preview.html`:
   - Updated with the same scroll-test slider / toggle so the user can test the exact standing-up / stepping forward animation interactively.

---

## 2. Kinetic Choreography Rigging Math

### Leg & Torso IK / Interpolation:
```typescript
// Stand progress: 0 when sitting (scroll <= 0.15), smoothly rises to 1 (scroll >= 0.45)
const standT = Math.max(0, Math.min(1, (scroll - 0.15) / 0.30));
const standEase = standT * standT * (3 - 2 * standT); // smoothstep

// Pelvis & Torso Rise:
// Sitting height = 0.22, Standing height = 0.75
const botY = 0.22 + standEase * 0.53;
const botZ = standEase * 0.35; // Steps 0.35m forward toward the front lip of the stage

// Knee unbending (from 90° seated to straight standing):
const kneeAngle = (1 - standEase) * (Math.PI / 2);
const thighPitch = (1 - standEase) * 0.35;

// Spine & Torso straightening:
torso.position.y = 1.25 + standEase * 0.1;
torso.rotation.x = -standEase * 0.08; // Confident lean into the crowd
```

---

## 3. Step-by-Step Task Breakdown

### Task 1: Update `LandingShowtimeHero.tsx` Model Rigging
- **File**: `components/landing/LandingShowtimeHero.tsx`
- **Actions**:
  1. Define materials (`armorMat`, `goldTitaniumMat`, `chromeMat`, `chassisMat`, `visorGlassMat`, `intenseGoldMat`, `amberGlowMat`).
  2. Build **Cybernetic Throne** group (base, column, seat, spine backrest).
  3. Build **Vintage Studio Ribbon Holo-Mic** group with glowing vacuum tube and VU meter.
  4. Build **Frontier Apex Cyber-Mecha** hierarchy:
     - Articulated legs with hip, thigh, knee, calf, and boot groups that interpolate between seated and standing angles.
     - Torso with split pectoral armor, lateral cooling fins, and Golden Logic Reactor Core (with counter-rotating gyroscopic containment rings).
     - Pauldron deltoid plates, upper arm spars, rotary elbow discs, and articulated 4-finger hands.
     - Stealth polyhedral helmet with brow ridge, rear exhaust fins, and dynamic 16-bar animated audio spectrogram visor.
     - Floating sensor halo with 3 orbiting satellite nodes.
  5. Add kinematic scroll-driven standing/stepping logic into the `animate()` loop.

### Task 2: Update `public/robot-preview.html` with Stand-Up / Walk Animation
- **File**: `public/robot-preview.html`
- **Actions**:
  1. Add a "Scroll Choreography / Stand Up" animation toggle & slider to `robot-preview.html` so the user can immediately scrub or play the stand-up transition directly in their browser.

### Task 3: TypeScript Typecheck & Build Verification
- **Command**: `npm run typecheck`
- **Actions**: Ensure 0 compiler errors, 0 runtime warnings, and clean 60fps WebGL execution.

---

## 4. Verification & Validation Plan
1. Run `npm run typecheck` to confirm clean compilation.
2. Test interactive controls and smooth scroll interpolation at `http://localhost:3000/`.
3. Check mobile responsiveness (portrait aspect ratio fallback).
