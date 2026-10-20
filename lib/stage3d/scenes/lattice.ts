/*
 * Scene 3: The Blind Quorum Lattice
 * 3D orbital node ring firing golden laser rays into central Merkle prism.
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

const BOUNDS = box8([0, 35, 0], [190, 80, 190]);
const JURORS = 6;
const RADIUS = 55;

export const LATTICE_SCENE: SceneDef = {
  id: "lattice",
  title: "Quorum Lattice",
  tag: "03 // Consensus Engine",
  yaw: 0.5,
  pitch: 0.58,
  turn: 0.5,
  limit: 0.85,
  bounds: BOUNDS,
  draw(a: SceneArgs): void {
    const { ctx, cam, q, font, form, u, hot, hover } = a;

    const pBase = ease.out(piece(form, 0, 0.25));
    const pCenter = ease.out(piece(form, 0.2, 0.35));
    const pNodes = ease.out(piece(form, 0.35, 0.4));
    const pBeams = piece(form, 0.65, 0.35);

    drawFloor(ctx, cam, 105, pBase);
    q.add(-2e6, () => drawShadow(ctx, cam, [0, 0, 0], 90, 70, 0.8 * pBase));

    // 1. Central Merkle Settlement Monolith
    if (pCenter > 0.01) {
      q.add(-1e5, () => {
        // Monolith base
        drawBox(ctx, cam, font, {
          c: [0, 8, 0],
          size: [36, 16, 36],
          tone: OBSIDIAN,
          edgeTone: "rgba(255,197,61,0.5)",
          engraved: "MERKLE",
        });

        // Monolith pillar
        drawBox(ctx, cam, font, {
          c: [0, 32 + 25 * (1 - pCenter), 0],
          size: [24, 38, 24],
          tone: OBSIDIAN_DARK,
          topTone: WARM_GOLD,
          edgeTone: "rgba(255,197,61,0.8)",
          glow: true,
        });
      });
    }

    // 2. Ring of Juror Nodes & Laser Conduits
    if (pNodes > 0.01) {
      for (let i = 0; i < JURORS; i++) {
        const angle = (i / JURORS) * TAU + u * 0.4;
        const nx = Math.cos(angle) * RADIUS;
        const nz = Math.sin(angle) * RADIUS;
        const ny = 12 * pNodes;

        // Juror pedestal
        q.add(1e5, () => {
          drawCyl(ctx, cam, [nx, ny / 2, nz], 8, ny, OBSIDIAN, 12);
          drawBox(ctx, cam, font, {
            c: [nx, ny + 3, nz],
            size: [10, 6, 10],
            tone: i < 5 ? WARM_GOLD : TITANIUM,
            edgeTone: "rgba(255,255,255,0.7)",
            glow: i < 5,
          });

          // Laser beam to central monolith
          if (pBeams > 0.3) {
            const isHumanVote = i < 5;
            drawLaser(
              ctx,
              cam,
              [nx, ny + 3, nz],
              [0, 32, 0],
              isHumanVote ? "rgba(255,197,61,0.8)" : "rgba(160,165,175,0.4)",
              isHumanVote ? 1.5 : 1
            );
          }
        });
      }
    }

    // Hotspots
    if (form > 0.85) {
      const p1 = P(cam, 0, 32, 0);
      hot.push({
        id: "merkle-prism",
        label: "Consensus Aggregator",
        detail: "Aggregates blind human rater entropy vs Straight Man priors.",
        x: p1[0],
        y: p1[1],
        r: 22,
        wx: 0,
        wy: 32,
        wz: 0,
        zoom: 1.5,
      });
    }
  },
};
