/*
 * Scene 1: The Joke Vault
 * Mechanical obsidian cryptographic vault with sliding data cartridges and engraved Merkle roots.
 */

import { piece, ease } from "../math";
import {
  drawBox,
  drawFloor,
  drawShadow,
  OBSIDIAN,
  OBSIDIAN_DARK,
  WARM_GOLD,
  TITANIUM,
  GOLD_BRIGHT,
  P,
} from "../gfx";
import { box8, type SceneArgs, type SceneDef } from "../types";

const BOUNDS = box8([0, 40, 0], [200, 100, 160]);

export const VAULT_SCENE: SceneDef = {
  id: "vault",
  title: "The Joke Vault",
  tag: "01 // Data Engine",
  yaw: 0.65,
  pitch: 0.52,
  turn: 0.45,
  limit: 0.7,
  bounds: BOUNDS,
  draw(a: SceneArgs): void {
    const { ctx, cam, q, font, form, hot, hover } = a;

    // Phased animation timing
    const pBase = ease.out(piece(form, 0, 0.28));
    const pWalls = ease.out(piece(form, 0.2, 0.3));
    const pRoof = ease.out(piece(form, 0.35, 0.3));
    const pTray = ease.out(piece(form, 0.55, 0.35));
    const pGlow = piece(form, 0.7, 0.3);

    // Floor & ambient shadow
    drawFloor(ctx, cam, 110, pBase);
    q.add(-2e6, () => drawShadow(ctx, cam, [0, 0, 0], 85, 65, 0.8 * pBase));

    // 1. Heavy Base Slab
    q.add(-1e6, () => {
      drawBox(ctx, cam, font, {
        c: [0, 6, 25 * (1 - pBase)],
        size: [140, 12, 110],
        tone: OBSIDIAN,
        topTone: OBSIDIAN_DARK,
        edgeTone: "rgba(255,197,61,0.35)",
        engraved: "HAHA PROTOCOL // VAULT DEPOSIT",
      });
    });

    // 2. Vault Left & Right Pillars
    if (pWalls > 0.01) {
      q.add(-5e5, () => {
        // Left pillar
        drawBox(ctx, cam, font, {
          c: [-55, 32 + 30 * (1 - pWalls), -15],
          size: [18, 50, 45],
          tone: OBSIDIAN,
          edgeTone: "rgba(255,255,255,0.12)",
        });
        // Right pillar
        drawBox(ctx, cam, font, {
          c: [55, 32 + 30 * (1 - pWalls), -15],
          size: [18, 50, 45],
          tone: OBSIDIAN,
          edgeTone: "rgba(255,255,255,0.12)",
        });
        // Back wall
        drawBox(ctx, cam, font, {
          c: [0, 32, -35 - 20 * (1 - pWalls)],
          size: [100, 50, 10],
          tone: OBSIDIAN_DARK,
          edgeTone: "rgba(255,197,61,0.2)",
        });
      });
    }

    // 3. Vault Top Architrave / Merkle Seal Header
    if (pRoof > 0.01) {
      q.add(-2e5, () => {
        drawBox(ctx, cam, font, {
          c: [0, 62 + 25 * (1 - pRoof), -15],
          size: [136, 12, 50],
          tone: OBSIDIAN,
          topTone: TITANIUM,
          edgeTone: "rgba(255,197,61,0.5)",
          engraved: "MERKLE: 0x9C4E...3B17",
          glow: true,
        });
      });
    }

    // 4. Slide-Out Provenance Data Tray (slides forward out of vault!)
    if (pTray > 0.01) {
      const trayZ = -10 + 45 * pTray;
      q.add(1e5, () => {
        // Metal tray
        drawBox(ctx, cam, font, {
          c: [0, 16, trayZ],
          size: [80, 6, 60],
          tone: TITANIUM,
          edgeTone: "rgba(255,197,61,0.4)",
        });

        // Data Cartridge 1 (#BIT-8120)
        drawBox(ctx, cam, font, {
          c: [-22, 23, trayZ],
          size: [30, 8, 40],
          tone: WARM_GOLD,
          topTone: GOLD_BRIGHT,
          edgeTone: "rgba(255,255,255,0.8)",
          engraved: "#BIT-8120",
          glow: pGlow > 0.5,
        });

        // Data Cartridge 2 (#BIT-8121)
        drawBox(ctx, cam, font, {
          c: [22, 23, trayZ],
          size: [30, 8, 40],
          tone: OBSIDIAN,
          edgeTone: "rgba(255,197,61,0.6)",
          engraved: "#BIT-8121",
        });
      });
    }

    // Register interactive hotspots when assembled
    if (form > 0.85) {
      const p1 = P(cam, -22, 23, 35);
      hot.push({
        id: "cartridge-8120",
        label: "Data Asset #BIT-8120",
        detail: "10% perpetual royalty share locked on-chain.",
        x: p1[0],
        y: p1[1],
        r: 22,
        wx: -22,
        wy: 23,
        wz: 35,
        zoom: 1.5,
      });

      const p2 = P(cam, 0, 62, -15);
      hot.push({
        id: "merkle-root",
        label: "Cryptographic Seal",
        detail: "SHA-256 Merkle root verified against blind jury quorum.",
        x: p2[0],
        y: p2[1],
        r: 20,
        wx: 0,
        wy: 62,
        wz: -15,
        zoom: 1.3,
      });
    }
  },
};
