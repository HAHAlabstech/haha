/*
 * Scene 2: The Consensus Lock Tumbler
 * Mechanical multi-ring cylinder lock that aligns semantic rings and fires golden laser on consensus.
 */

import { piece, ease, TAU } from "../math";
import {
  drawBox,
  drawCyl,
  drawFloor,
  drawShadow,
  drawLaser,
  OBSIDIAN,
  OBSIDIAN_DARK,
  WARM_GOLD,
  TITANIUM,
  GOLD_BRIGHT,
  P,
} from "../gfx";
import { box8, type SceneArgs, type SceneDef } from "../types";

const BOUNDS = box8([0, 35, 0], [180, 80, 140]);

export const TUMBLER_SCENE: SceneDef = {
  id: "tumbler",
  title: "Consensus Lock",
  tag: "02 // Intent Engine",
  yaw: 0.8,
  pitch: 0.48,
  turn: 0.6,
  limit: 0.8,
  bounds: BOUNDS,
  draw(a: SceneArgs): void {
    const { ctx, cam, q, font, form, u, hot, hover } = a;

    const pBase = ease.out(piece(form, 0, 0.3));
    const pShaft = ease.out(piece(form, 0.2, 0.3));
    const pRings = ease.out(piece(form, 0.35, 0.4));
    const pAligned = piece(form, 0.75, 0.25);

    drawFloor(ctx, cam, 100, pBase);
    q.add(-2e6, () => drawShadow(ctx, cam, [0, 0, 0], 80, 55, 0.75 * pBase));

    // 1. Bedplate & Mounting Brackets
    q.add(-1e6, () => {
      drawBox(ctx, cam, font, {
        c: [0, 5, 20 * (1 - pBase)],
        size: [130, 10, 80],
        tone: OBSIDIAN,
        edgeTone: "rgba(255,197,61,0.25)",
        engraved: "SEMANTIC CONSENSUS TUMBLER",
      });

      // Left bracket
      drawBox(ctx, cam, font, {
        c: [-50, 22 + 20 * (1 - pShaft), 0],
        size: [12, 30, 50],
        tone: TITANIUM,
        edgeTone: "rgba(255,255,255,0.15)",
      });

      // Right bracket
      drawBox(ctx, cam, font, {
        c: [50, 22 + 20 * (1 - pShaft), 0],
        size: [12, 30, 50],
        tone: TITANIUM,
        edgeTone: "rgba(255,255,255,0.15)",
      });
    });

    // 2. Central Core Shaft
    if (pShaft > 0.01) {
      q.add(-5e5, () => {
        drawBox(ctx, cam, font, {
          c: [0, 25, 0],
          size: [100, 10, 10],
          tone: OBSIDIAN_DARK,
          edgeTone: "rgba(255,197,61,0.4)",
        });
      });
    }

    // 3. Three Independent Rotating Tumbler Cylinders
    if (pRings > 0.01) {
      // Rotation angles driven by scroll u
      const r1Angle = (u * 1.5) % 1;
      const r2Angle = (u * 2.2 + 0.3) % 1;
      const r3Angle = (u * 1.8 + 0.6) % 1;

      q.add(1e5, () => {
        // Ring 1: Entropy
        drawCyl(ctx, cam, [-28, 25, 0], 22, 18, OBSIDIAN, 20);
        drawBox(ctx, cam, font, {
          c: [-28, 38, 12],
          size: [16, 6, 8],
          tone: WARM_GOLD,
          edgeTone: "rgba(255,255,255,0.8)",
          engraved: "ENTROPY",
          glow: true,
        });

        // Ring 2: Subtext
        drawCyl(ctx, cam, [0, 25, 0], 22, 18, TITANIUM, 20);
        drawBox(ctx, cam, font, {
          c: [0, 38, 12],
          size: [16, 6, 8],
          tone: OBSIDIAN,
          edgeTone: "rgba(255,197,61,0.6)",
          engraved: "SUBTEXT",
        });

        // Ring 3: Quorum
        drawCyl(ctx, cam, [28, 25, 0], 22, 18, OBSIDIAN, 20);
        drawBox(ctx, cam, font, {
          c: [28, 38, 12],
          size: [16, 6, 8],
          tone: WARM_GOLD,
          edgeTone: "rgba(255,255,255,0.8)",
          engraved: "78% JURY",
          glow: true,
        });
      });
    }

    // 4. Laser Conduit Beam when consensus aligns!
    if (pAligned > 0.5) {
      q.add(2e5, () => {
        drawLaser(ctx, cam, [-55, 38, 12], [55, 38, 12], "rgba(255,197,61,0.9)", 2);
      });
    }

    // Hotspots
    if (form > 0.85) {
      const p1 = P(cam, 0, 38, 12);
      hot.push({
        id: "tumbler-align",
        label: "Consensus Alignment Beam",
        detail: "Supermajority lock engages when human jury votes surpass 66%.",
        x: p1[0],
        y: p1[1],
        r: 22,
        wx: 0,
        wy: 38,
        wz: 12,
        zoom: 1.4,
      });
    }
  },
};
