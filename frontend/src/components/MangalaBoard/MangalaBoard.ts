import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';
import type { PhysicsStone, PhysicsBoundary } from './physics';
import { updatePhysics, packStonesStatically } from './physics';
import { soundManager } from './audio';

const BOARD_X = 100;
const BOARD_Y = 150;
const BOARD_WIDTH = 1400;
const BOARD_HEIGHT = 600;
const BOARD_RADIUS = 50;

const PIT_RADIUS = 65;
const TREASURY_WIDTH = 120;
const TREASURY_HEIGHT = 440;
const TREASURY_RADIUS = 60; // For capsule ends

const STONE_RADIUS = 15;

// Stone color palette
const STONE_COLORS = [
  { name: 'ruby', base: '#d50000', highlight: '#ffffff' },
  { name: 'sapphire', base: '#2962ff', highlight: '#ffffff' },
  { name: 'emerald', base: '#00c853', highlight: '#ffffff' },
  { name: 'amber', base: '#ffd600', highlight: '#ffffff' },
  { name: 'amethyst', base: '#aa00ff', highlight: '#ffffff' }
];

interface VisualStone {
  id: string;
  container: PIXI.Container;
  stoneSprite: PIXI.Sprite;
  shadowSprite: PIXI.Sprite;
  colorIndex: number;
  
  // Physics parameters (mapped to screen space inside the pit/treasury)
  x: number;
  y: number;
  vx: number;
  vy: number;
  isSleeping: boolean;
  
  // Animation height parameter (0 = on board, 1 = max flight height)
  flightZ: number;
}

export class MangalaBoard extends PIXI.Container {
  // Texture cache to prevent recreating textures
  private textureCache: { [key: string]: PIXI.Texture } = {};
  
  // Pixi Elements
  private boardBackground: PIXI.Sprite | null = null;
  private boardGraphics: PIXI.Graphics | null = null;
  private pitContainers: PIXI.Container[] = [];
  private pitGlows: PIXI.Sprite[] = [];
  private pathDots: PIXI.Graphics[] = [];
  
  // Pits coordinates & boundaries
  private pitCenters: { x: number; y: number }[] = [];
  private pitBoundaries: PhysicsBoundary[] = [];
  
  // Game state
  private stonesInPits: VisualStone[][] = Array.from({ length: 14 }, () => []);
  private isMyTurn: boolean = false;
  private clickablePits: number[] = [];
  
  // Interactivity block
  private isAnimating: boolean = false;
  
  // Physics Ticker
  private tickerActive: boolean = false;
  private physicsTickerCallback: () => void;
  
  // Callbacks
  public onPitClicked: ((pitIndex: number) => void) | null = null;
  public onAnimationComplete: (() => void) | null = null;
  
  // Player Labels
  private p1Label: PIXI.Text | null = null;
  private p2Label: PIXI.Text | null = null;
  private perspective: number = 0; // 0 = Player 1, 1 = Player 2

  constructor(perspective: number = 0) {
    super();
    this.perspective = perspective;
    this.createTextureCache();
    this.setupLayout();
    this.drawBoard();
    this.createLabels();
    
    // Bind physics update
    this.physicsTickerCallback = this.tickPhysics.bind(this);
  }

  /**
   * Responsive Scaling: fits the board within the canvas width/height
   * while maintaining a 16:9 aspect ratio and centering the container.
   */
  public resize(width: number, height: number): void {
    const targetRatio = 1400 / 600;
    const currentRatio = width / height;
    let scale = 1;

    if (currentRatio > targetRatio) {
      scale = height / 600;
    } else {
      scale = width / 1400;
    }

    this.scale.set(scale);
    // Center the 1400x600 board inside the canvas and adjust for the local offsets (BOARD_X=100, BOARD_Y=150)
    this.x = (width - 1400 * scale) / 2 - 100 * scale;
    this.y = (height - 600 * scale) / 2 - 150 * scale;
  }

  /**
   * Helper to create all procedural textures on startup.
   */
  private createTextureCache(): void {
    // 1. Board Texture (Linear Gradient - rich mahogany/walnut wood)
    this.textureCache['board'] = this.createLinearGradientTexture(
      BOARD_WIDTH, BOARD_HEIGHT,
      ['#2e150d', '#4a2216', '#2e150d'],
      [0.0, 0.5, 1.0]
    );

    // 2. Pit recessed texture (Radial Gradient - dark inner shadow to light wood)
    this.textureCache['pit_bg'] = this.createRadialGradientTexture(
      PIT_RADIUS * 2, PIT_RADIUS * 2,
      ['#0b0402', '#21100b', '#3d2017'],
      [0.0, 0.6, 1.0],
      { x0: PIT_RADIUS * 0.7, y0: PIT_RADIUS * 0.7, r0: 0,
        x1: PIT_RADIUS, y1: PIT_RADIUS, r1: PIT_RADIUS }
    );

    // 3. Treasury recessed texture (Linear Gradient - dark top/left to lighter bottom/right)
    this.textureCache['treasury_bg'] = this.createLinearGradientTexture(
      TREASURY_WIDTH, TREASURY_HEIGHT,
      ['#0f0705', '#2a140f', '#3a1e16'],
      [0.0, 0.7, 1.0]
    );

    // 4. Pit Glow Texture (Pulsing neon-gold halo)
    this.textureCache['glow'] = this.createGlowTexture(PIT_RADIUS * 2 + 60);

    // 5. Stone textures (Glossy circular radial gradients)
    STONE_COLORS.forEach((color, idx) => {
      this.textureCache[`stone_${idx}`] = this.createRadialGradientTexture(
        STONE_RADIUS * 2, STONE_RADIUS * 2,
        [color.highlight, color.base, '#050100'],
        [0.0, 0.6, 1.0],
        { x0: STONE_RADIUS * 0.6, y0: STONE_RADIUS * 0.6, r0: 0,
          x1: STONE_RADIUS, y1: STONE_RADIUS, r1: STONE_RADIUS }
      );
    });

    // 6. Stone Shadow Texture (Blurry soft dark shadow)
    this.textureCache['stone_shadow'] = this.createRadialGradientTexture(
      STONE_RADIUS * 2 + 10, STONE_RADIUS * 2 + 10,
      ['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0)'],
      [0.0, 0.4, 1.0],
      { x0: (STONE_RADIUS + 5), y0: (STONE_RADIUS + 5), r0: 0,
        x1: (STONE_RADIUS + 5), y1: (STONE_RADIUS + 5), r1: STONE_RADIUS + 5 }
    );
  }

  /**
   * Helper: Draw a linear gradient canvas and return a PixiJS Texture.
   */
  private createLinearGradientTexture(w: number, h: number, colors: string[], stops: number[]): PIXI.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    colors.forEach((c, idx) => grad.addColorStop(stops[idx], c));

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    return PIXI.Texture.from(canvas);
  }

  /**
   * Helper: Draw a radial gradient canvas and return a PixiJS Texture.
   */
  private createRadialGradientTexture(
    w: number, h: number,
    colors: string[], stops: number[],
    coords: { x0: number; y0: number; r0: number; x1: number; y1: number; r1: number }
  ): PIXI.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(
      coords.x0, coords.y0, coords.r0,
      coords.x1, coords.y1, coords.r1
    );
    colors.forEach((c, idx) => grad.addColorStop(stops[idx], c));

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    return PIXI.Texture.from(canvas);
  }

  /**
   * Helper: Generate a soft neon-gold glow texture for pit highlights.
   */
  private createGlowTexture(size: number): PIXI.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const center = size / 2;

    // Glowing radial ring
    const grad = ctx.createRadialGradient(
      center, center, PIT_RADIUS - 10,
      center, center, center
    );
    grad.addColorStop(0.0, 'rgba(255, 215, 0, 0.0)');
    grad.addColorStop(0.3, 'rgba(255, 215, 0, 0.45)');
    grad.addColorStop(0.5, 'rgba(255, 140, 0, 0.25)');
    grad.addColorStop(0.8, 'rgba(255, 69, 0, 0.05)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(center, center, center, 0, Math.PI * 2);
    ctx.fill();

    return PIXI.Texture.from(canvas);
  }

  /**
   * Define coordinate layout for pits and treasuries.
   * Mangala board configuration:
   * Pits 0-5: Player 1 (bottom, left-to-right)
   * Pit 6: Player 1 Treasury (right)
   * Pits 7-12: Player 2 (top, right-to-left)
   * Pit 13: Player 2 Treasury (left)
   */
  private setupLayout(): void {
    const colXs = [
      BOARD_X + 260, // Col 0
      BOARD_X + 430, // Col 1
      BOARD_X + 600, // Col 2
      BOARD_X + 770, // Col 3
      BOARD_X + 940, // Col 4
      BOARD_X + 1110 // Col 5
    ];

    const bottomY = BOARD_Y + 440;
    const topY = BOARD_Y + 160;

    // Bottom Pits: index 0 to 5 -> Col 0 to Col 5
    for (let i = 0; i < 6; i++) {
      const cx = colXs[i];
      const cy = bottomY;
      this.pitCenters[i] = { x: cx, y: cy };
      this.pitBoundaries[i] = { type: 'circle', cx, cy, radius: PIT_RADIUS - 8 };
    }

    // Right Treasury (Player 1): index 6
    const rtx = BOARD_X + BOARD_WIDTH - 110;
    const rty = BOARD_Y + 300;
    this.pitCenters[6] = { x: rtx, y: rty };
    this.pitBoundaries[6] = {
      type: 'capsule',
      x1: rtx,
      y1: rty - (TREASURY_HEIGHT / 2) + TREASURY_RADIUS + 10,
      x2: rtx,
      y2: rty + (TREASURY_HEIGHT / 2) - TREASURY_RADIUS - 10,
      radius: TREASURY_RADIUS - 5
    };

    // Top Pits: index 7 to 12 -> Col 5 to Col 0 (right-to-left)
    for (let i = 0; i < 6; i++) {
      const cx = colXs[5 - i];
      const cy = topY;
      this.pitCenters[7 + i] = { x: cx, y: cy };
      this.pitBoundaries[7 + i] = { type: 'circle', cx, cy, radius: PIT_RADIUS - 8 };
    }

    // Left Treasury (Player 2): index 13
    const ltx = BOARD_X + 110;
    const lty = BOARD_Y + 300;
    this.pitCenters[13] = { x: ltx, y: lty };
    this.pitBoundaries[13] = {
      type: 'capsule',
      x1: ltx,
      y1: lty - (TREASURY_HEIGHT / 2) + TREASURY_RADIUS + 10,
      x2: ltx,
      y2: lty + (TREASURY_HEIGHT / 2) - TREASURY_RADIUS - 10,
      radius: TREASURY_RADIUS - 5
    };

    // Apply perspective rotation (180 degrees) if playing as Player 2
    if (this.perspective === 1) {
      const boardCenterX = BOARD_X + BOARD_WIDTH / 2;
      const boardCenterY = BOARD_Y + BOARD_HEIGHT / 2;

      for (let i = 0; i < 14; i++) {
        // Rotate center
        const center = this.pitCenters[i];
        center.x = 2 * boardCenterX - center.x;
        center.y = 2 * boardCenterY - center.y;

        // Rotate boundary
        const boundary = this.pitBoundaries[i];
        if (boundary.type === 'circle') {
          boundary.cx = 2 * boardCenterX - boundary.cx;
          boundary.cy = 2 * boardCenterY - boundary.cy;
        } else if (boundary.type === 'capsule') {
          const x1 = boundary.x1;
          const y1 = boundary.y1;
          const x2 = boundary.x2;
          const y2 = boundary.y2;
          boundary.x1 = 2 * boardCenterX - x1;
          boundary.y1 = 2 * boardCenterY - y1;
          boundary.x2 = 2 * boardCenterX - x2;
          boundary.y2 = 2 * boardCenterY - y2;
        }
      }
    }
  }

  /**
   * Draw the wooden board surface, beveled edges, pits, and treasuries.
   */
  private drawBoard(): void {
    // 1. Board Drop Shadow
    const shadow = new PIXI.Graphics();
    shadow.roundRect(BOARD_X, BOARD_Y + 12, BOARD_WIDTH, BOARD_HEIGHT, BOARD_RADIUS)
      .fill({ color: 0x000000, alpha: 0.4 });
    this.addChild(shadow);

    // 2. Wooden Board Base Sprite
    this.boardBackground = new PIXI.Sprite(this.textureCache['board']);
    this.boardBackground.x = BOARD_X;
    this.boardBackground.y = BOARD_Y;
    
    // Mask to give it rounded corners
    const boardMask = new PIXI.Graphics();
    boardMask.roundRect(BOARD_X, BOARD_Y, BOARD_WIDTH, BOARD_HEIGHT, BOARD_RADIUS)
      .fill({ color: 0xffffff });
    this.addChild(boardMask);
    this.boardBackground.mask = boardMask;
    this.addChild(this.boardBackground);

    // 3. Beveled borders (3D visual depth)
    this.boardGraphics = new PIXI.Graphics();
    // Inner border lines to catch light/shadow
    // Light top-left bevel line
    this.boardGraphics.roundRect(BOARD_X + 2, BOARD_Y + 2, BOARD_WIDTH - 4, BOARD_HEIGHT - 4, BOARD_RADIUS - 2)
      .stroke({ width: 3, color: 0xffffff, alpha: 0.18 });
    // Dark bottom-right bevel line
    this.boardGraphics.roundRect(BOARD_X + 4, BOARD_Y + 4, BOARD_WIDTH - 8, BOARD_HEIGHT - 8, BOARD_RADIUS - 4)
      .stroke({ width: 3, color: 0x000000, alpha: 0.45 });
    this.addChild(this.boardGraphics);

    // 4. Draw Pit wells and Treasury slots
    for (let i = 0; i < 14; i++) {
      const b = this.pitBoundaries[i];
      const center = this.pitCenters[i];
      const pitContainer = new PIXI.Container();
      this.addChild(pitContainer);
      this.pitContainers[i] = pitContainer;

      // Glow sprite (behind the pit)
      const glow = new PIXI.Sprite(this.textureCache['glow']);
      glow.anchor.set(0.5);
      glow.x = center.x;
      glow.y = center.y;
      glow.alpha = 0;
      glow.visible = false;
      this.addChild(glow);
      this.pitGlows[i] = glow;

      // Inner recess graphics
      if (b.type === 'circle') {
        // Shadow base
        const shadowBase = new PIXI.Graphics();
        shadowBase.circle(center.x, center.y + 4, PIT_RADIUS).fill({ color: 0x000000, alpha: 0.35 });
        pitContainer.addChild(shadowBase);

        // Recessed sprite
        const sprite = new PIXI.Sprite(this.textureCache['pit_bg']);
        sprite.anchor.set(0.5);
        sprite.x = center.x;
        sprite.y = center.y;
        pitContainer.addChild(sprite);

        // Rim highlight/shadow ring
        const rim = new PIXI.Graphics();
        // Dark top shadow
        rim.arc(center.x, center.y, PIT_RADIUS, Math.PI, 0)
           .stroke({ width: 2, color: 0x000000, alpha: 0.5 });
        // Light bottom highlight
        rim.arc(center.x, center.y, PIT_RADIUS, 0, Math.PI)
           .stroke({ width: 2, color: 0xffffff, alpha: 0.15 });
        pitContainer.addChild(rim);

        // Set up interactive hit area
        const hitArea = new PIXI.Graphics();
        hitArea.circle(center.x, center.y, PIT_RADIUS).fill({ color: 0xffffff, alpha: 0.001 });
        hitArea.interactive = true;
        hitArea.cursor = 'pointer';
        
        // Setup events
        this.setupPitInteractivity(hitArea, i);
        pitContainer.addChild(hitArea);

      } else {
        // Capsule Treasury
        // Shadow base
        const shadowBase = new PIXI.Graphics();
        shadowBase.roundRect(
          center.x - TREASURY_WIDTH / 2,
          center.y - TREASURY_HEIGHT / 2 + 4,
          TREASURY_WIDTH,
          TREASURY_HEIGHT,
          TREASURY_RADIUS
        ).fill({ color: 0x000000, alpha: 0.35 });
        pitContainer.addChild(shadowBase);

        // Recessed sprite
        const sprite = new PIXI.Sprite(this.textureCache['treasury_bg']);
        sprite.anchor.set(0.5);
        sprite.x = center.x;
        sprite.y = center.y;

        // Mask for rounded capsule ends
        const tMask = new PIXI.Graphics();
        tMask.roundRect(
          center.x - TREASURY_WIDTH / 2,
          center.y - TREASURY_HEIGHT / 2,
          TREASURY_WIDTH,
          TREASURY_HEIGHT,
          TREASURY_RADIUS
        ).fill({ color: 0xffffff });
        pitContainer.addChild(tMask);
        sprite.mask = tMask;
        pitContainer.addChild(sprite);

        // Rim highlight/shadow capsule border
        const rim = new PIXI.Graphics();
        rim.roundRect(
          center.x - TREASURY_WIDTH / 2,
          center.y - TREASURY_HEIGHT / 2,
          TREASURY_WIDTH,
          TREASURY_HEIGHT,
          TREASURY_RADIUS
        ).stroke({ width: 2, color: 0x000000, alpha: 0.5 });
        // Add subtle light highlight at the bottom rim
        rim.roundRect(
          center.x - TREASURY_WIDTH / 2 + 1,
          center.y - TREASURY_HEIGHT / 2 + 1,
          TREASURY_WIDTH - 2,
          TREASURY_HEIGHT - 2,
          TREASURY_RADIUS - 1
        ).stroke({ width: 1.5, color: 0xffffff, alpha: 0.12 });
        pitContainer.addChild(rim);
      }
    }
  }

  /**
   * Add text labels for Player 1 and Player 2.
   */
  private createLabels(): void {
    const labelStyle = new PIXI.TextStyle({
      fontFamily: '"Outfit", "Inter", sans-serif',
      fontSize: 24,
      fontWeight: '600',
      fill: '#efebe9',
      dropShadow: {
        color: '#000000',
        blur: 4,
        distance: 2,
        alpha: 0.6
      }
    });

    this.p1Label = new PIXI.Text({ text: 'Player 1', style: labelStyle });
    this.p1Label.x = BOARD_X + 260;
    this.p1Label.y = BOARD_Y + BOARD_HEIGHT - 40;
    this.addChild(this.p1Label);

    this.p2Label = new PIXI.Text({ text: 'Player 2', style: labelStyle });
    this.p2Label.x = BOARD_X + 260;
    this.p2Label.y = BOARD_Y + 15;
    this.addChild(this.p2Label);
  }

  /**
   * Set user information labels dynamically.
   */
  public setPlayerInfo(p1: { name: string; elo: number }, p2: { name: string; elo: number }): void {
    const bottomPlayer = this.perspective === 0 ? p1 : p2;
    const topPlayer = this.perspective === 0 ? p2 : p1;

    if (this.p1Label) {
      this.p1Label.text = `${bottomPlayer.name} (ELO: ${bottomPlayer.elo})`;
    }
    if (this.p2Label) {
      this.p2Label.text = `${topPlayer.name} (ELO: ${topPlayer.elo})`;
    }
  }

  /**
   * Add interaction callbacks to clickable pits.
   */
  private setupPitInteractivity(graphics: PIXI.Graphics, index: number): void {
    graphics.on('pointerover', () => this.onPitHover(index));
    graphics.on('pointerout', () => this.onPitOut(index));
    graphics.on('pointerdown', () => this.onPitClick(index));
  }

  /**
   * Hover State: Pulsing glow ring, marble jiggling, and predictive path rendering.
   */
  private onPitHover(index: number): void {
    if (this.isAnimating) return;

    // Check if the pit is interactive on the player's turn
    const isInteractive = this.isMyTurn && this.clickablePits.includes(index);
    if (!isInteractive) return;

    // 1. Show and Pulse glowing ring
    const glow = this.pitGlows[index];
    if (glow) {
      glow.visible = true;
      gsap.killTweensOf(glow);
      // Soft pulsing scale and alpha
      gsap.fromTo(glow, 
        { alpha: 0.35, scale: 0.95 },
        { 
          alpha: 0.95, 
          scale: 1.05, 
          duration: 0.8, 
          yoyo: true, 
          repeat: -1, 
          ease: 'power1.inOut' 
        }
      );
    }

    // 2. Marble Jiggling (Sine wave translation on stones inside the pit)
    const stones = this.stonesInPits[index];
    stones.forEach((stone, sIdx) => {
      gsap.killTweensOf(stone.container);
      // Subtle float up and shake
      const delay = sIdx * 0.04;
      gsap.to(stone.container, {
        y: stone.y - 4,
        duration: 0.4,
        ease: 'power1.out'
      });
      // Infinite horizontal jiggle
      gsap.to(stone.container, {
        x: stone.x + (Math.random() > 0.5 ? 2 : -2),
        duration: 0.1,
        repeat: -1,
        yoyo: true,
        delay,
        ease: 'sine.inOut'
      });
    });

    // 3. Render Predictive Sowing Path
    this.drawPredictivePath(index);
  }

  /**
   * Reset Hover State
   */
  private onPitOut(index: number): void {
    this.clearPredictivePath();

    // Reset glow
    const glow = this.pitGlows[index];
    if (glow) {
      gsap.killTweensOf(glow);
      gsap.to(glow, { alpha: 0, duration: 0.2, onComplete: () => { glow.visible = false; } });
    }

    // Reset stones position and stop jiggle
    const stones = this.stonesInPits[index];
    stones.forEach((stone) => {
      gsap.killTweensOf(stone.container);
      gsap.to(stone.container, {
        x: stone.x,
        y: stone.y,
        duration: 0.25,
        ease: 'power2.out'
      });
    });
  }

  /**
   * Action trigger when clicked.
   */
  private onPitClick(index: number): void {
    if (this.isAnimating) return;
    
    const isInteractive = this.isMyTurn && this.clickablePits.includes(index);
    if (!isInteractive) return;

    // Trigger callback
    if (this.onPitClicked) {
      // Clear hover visual states immediately before animating
      this.onPitOut(index);
      this.onPitClicked(index);
    }
  }

  /**
   * Draws pulsing dots along the exact distribution path.
   */
  private drawPredictivePath(startPit: number): void {
    this.clearPredictivePath();

    const stonesCount = this.stonesInPits[startPit].length;
    if (stonesCount === 0) return;

    // In Mangala:
    // If there is only 1 stone, it moves to the next pit.
    // If there are more, the first stone stays in startPit, and the rest are sown counter-clockwise.
    const path: number[] = [];
    let currentPit = startPit;

    if (stonesCount === 1) {
      path.push((startPit + 1) % 14);
    } else {
      path.push(startPit); // Sows one in start pit
      for (let i = 1; i < stonesCount; i++) {
        currentPit = (currentPit + 1) % 14;
        
        // Skip opponent's treasury depending on active player
        // For Player 1 (me), skip 13 (opponent treasury)
        // For Player 2 (me), skip 6 (opponent treasury)
        const activePlayer = startPit <= 5 || startPit === 6 ? 1 : 2;
        if (activePlayer === 1 && currentPit === 13) {
          currentPit = 0; // Wrap around to P1 pit 0
        } else if (activePlayer === 2 && currentPit === 6) {
          currentPit = 7; // Wrap around to P2 pit 7
        }
        path.push(currentPit);
      }
    }

    // Draw indicators along the path
    path.forEach((pitIdx, stepNum) => {
      const center = this.pitCenters[pitIdx];
      const dot = new PIXI.Graphics();
      
      // Highlight the final landing destination with a larger gold circle
      const isLast = stepNum === path.length - 1;
      const radius = isLast ? 14 : 7;
      const color = isLast ? 0xffd700 : 0x2962ff;

      dot.x = center.x;
      dot.y = center.y;
      dot.circle(0, 0, radius)
         .fill({ color, alpha: 0.8 })
         .stroke({ width: 2, color: 0xffffff, alpha: 0.7 });

      this.addChild(dot);
      this.pathDots.push(dot);

      // Pulse animation
      gsap.fromTo(dot.scale,
        { x: 0.8, y: 0.8 },
        {
          x: 1.2,
          y: 1.2,
          duration: 0.6,
          delay: stepNum * 0.05,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut'
        }
      );
      gsap.fromTo(dot,
        { alpha: 0.4 },
        {
          alpha: 1.0,
          duration: 0.6,
          delay: stepNum * 0.05,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut'
        }
      );
    });
  }

  private clearPredictivePath(): void {
    this.pathDots.forEach((dot) => {
      gsap.killTweensOf(dot);
      this.removeChild(dot);
      dot.destroy();
    });
    this.pathDots = [];
  }

  /**
   * Set board interactive state.
   */
  public setInteractive(isMyTurn: boolean, clickablePits: number[]): void {
    this.isMyTurn = isMyTurn;
    this.clickablePits = clickablePits;
  }

  /**
   * API Contract: Resets board instantly without animations.
   */
  public initializeBoard(initialBoard: number[]): void {
    console.log("[MangalaBoard] initializeBoard called. Target state:", initialBoard);
    this.isAnimating = false;

    const surplusPool: VisualStone[] = [];
    const hasChanged: boolean[] = Array(14).fill(false);

    // Step 1: Collect surplus stones from pits that have more stones than their target count
    for (let pitIdx = 0; pitIdx < 14; pitIdx++) {
      const targetCount = initialBoard[pitIdx] || 0;
      const currentCount = this.stonesInPits[pitIdx].length;

      if (currentCount > targetCount) {
        hasChanged[pitIdx] = true;
        const diff = currentCount - targetCount;
        for (let idx = 0; idx < diff; idx++) {
          const stone = this.stonesInPits[pitIdx].pop();
          if (stone) {
            surplusPool.push(stone);
          }
        }
      }
    }

    // Step 2: Distribute surplus stones (or create new ones if empty) to pits with a deficit
    for (let pitIdx = 0; pitIdx < 14; pitIdx++) {
      const targetCount = initialBoard[pitIdx] || 0;
      const currentCount = this.stonesInPits[pitIdx].length;

      if (currentCount < targetCount) {
        hasChanged[pitIdx] = true;
        const diff = targetCount - currentCount;
        for (let idx = 0; idx < diff; idx++) {
          const stone = surplusPool.pop();
          if (stone) {
            this.stonesInPits[pitIdx].push(stone);
          } else {
            // Pool is empty, create a new stone (will be correctly positioned below)
            this.createVisualStone(pitIdx, 0, 0);
          }
        }
      }
    }

    // Step 3: Destroy any leftover surplus stones
    while (surplusPool.length > 0) {
      const stone = surplusPool.pop();
      if (stone) {
        this.removeChild(stone.container);
        stone.container.destroy({ children: true });
      }
    }

    // Step 4: Statically pack and reposition stones ONLY in pits that have changed
    for (let pitIdx = 0; pitIdx < 14; pitIdx++) {
      if (!hasChanged[pitIdx]) continue;

      const stones = this.stonesInPits[pitIdx];
      const targetCount = stones.length;
      if (targetCount > 0) {
        const boundary = this.pitBoundaries[pitIdx];
        const packedPositions = packStonesStatically(targetCount, boundary, STONE_RADIUS);
        
        for (let idx = 0; idx < targetCount; idx++) {
          const stone = stones[idx];
          stone.x = packedPositions[idx].x;
          stone.y = packedPositions[idx].y;
          stone.vx = 0;
          stone.vy = 0;
          stone.isSleeping = true;
        }
      }
    }

    // Trigger full redraw of shadows and positions
    this.syncStonesVisuals();
  }



  /**
   * Instantiates a single glossy stone at target coordinates.
   */
  private createVisualStone(pitIndex: number, x: number, y: number): VisualStone {
    const stoneContainer = new PIXI.Container();

    // Randomize stone color
    const colorIdx = Math.floor(Math.random() * STONE_COLORS.length);

    // 1. Shadow sprite
    const shadowSprite = new PIXI.Sprite(this.textureCache['stone_shadow']);
    shadowSprite.anchor.set(0.5);
    // Shadow position offset slightly bottom-right
    shadowSprite.x = 2;
    shadowSprite.y = 5;
    shadowSprite.alpha = 0.55;
    stoneContainer.addChild(shadowSprite);

    // 2. Glossy marble sprite
    const stoneSprite = new PIXI.Sprite(this.textureCache[`stone_${colorIdx}`]);
    stoneSprite.anchor.set(0.5);
    stoneContainer.addChild(stoneSprite);

    // Position container
    stoneContainer.x = x;
    stoneContainer.y = y;
    this.addChild(stoneContainer);

    const vStone: VisualStone = {
      id: `stone_${Math.random().toString(36).substr(2, 9)}`,
      container: stoneContainer,
      stoneSprite,
      shadowSprite,
      colorIndex: colorIdx,
      x,
      y,
      vx: 0,
      vy: 0,
      isSleeping: true,
      flightZ: 0
    };

    this.stonesInPits[pitIndex].push(vStone);
    return vStone;
  }

  /**
   * API Contract: Main entry point for state changes.
   * If moveDetails is provided, it executes the sequential sowing animation queue.
   * Otherwise, it updates the layout instantly.
   */
  public updateBoardState(
    nextBoard: number[],
    moveDetails?: { startPit: number; steps: number[] }
  ): void {
    console.log("[MangalaBoard] updateBoardState called. isAnimating:", this.isAnimating, "hasMoveDetails:", !!moveDetails);
    if (this.isAnimating) {
      console.warn("[MangalaBoard] updateBoardState blocked because isAnimating is true!");
      return;
    }

    if (!moveDetails) {
      this.initializeBoard(nextBoard);
      return;
    }

    this.isAnimating = true;
    this.runSowingAnimation(moveDetails.startPit, moveDetails.steps, nextBoard);
  }

  /**
   * Premium sowing sequence with 2.5D parabolic trajectory, wood scrape and clink sound cues.
   */
  private runSowingAnimation(startPit: number, steps: number[], finalBoardState: number[]): void {
    console.log("[MangalaBoard] runSowingAnimation started. startPit:", startPit, "steps:", steps);
    const startStones = this.stonesInPits[startPit];
    if (startStones.length === 0) {
      console.warn("[MangalaBoard] runSowingAnimation: startPit has 0 stones! Running safeguard.");
      // Safeguard: if there are no stones, instantly sync and end
      this.isAnimating = false;
      this.initializeBoard(finalBoardState);
      if (this.onAnimationComplete) {
        console.log("[MangalaBoard] runSowingAnimation safeguard triggering onAnimationComplete");
        this.onAnimationComplete();
      }
      return;
    }

    // Play scrape/gather sound
    soundManager.playGather();

    // 1. Gather all stones and lift them up visually
    const tl = gsap.timeline();
    
    // Sort stones slightly so they lift in sequence
    const gatheredStones = [...startStones];

    // Map and pop each stone beforehand to construct the timeline
    const stonesToSow = steps.map(() => gatheredStones.pop()).filter(Boolean) as VisualStone[];

    // Remove from source array immediately
    stonesToSow.forEach((stone) => {
      const srcIdx = this.stonesInPits[startPit].indexOf(stone);
      if (srcIdx > -1) {
        this.stonesInPits[startPit].splice(srcIdx, 1);
      }
    });
    
    // Animate lifting
    stonesToSow.forEach((stone, sIdx) => {
      // Sleep state off during animation
      stone.isSleeping = false;

      // Animate flightZ height up to represent lifting
      tl.to(stone, {
        flightZ: 0.35,
        duration: 0.25,
        ease: 'power2.out',
        onUpdate: () => this.updateStoneVisual(stone)
      }, sIdx * 0.03);
    });

    // 2. Sequential distribution along target steps
    // Delays are spaced by 150ms per step
    const stepDuration = 0.38; // Flight speed
    const stepDelay = 0.16;    // Timing between sequential drops

    stonesToSow.forEach((stone, stepIdx) => {
      const targetPitIdx = steps[stepIdx];
      const targetCenter = this.pitCenters[targetPitIdx];
      
      // Target random point inside target boundary to avoid overlapping landing spots
      const b = this.pitBoundaries[targetPitIdx];
      const angle = Math.random() * Math.PI * 2;
      const radius = (b.type === 'circle' ? b.radius : b.radius * 0.8) * Math.random() * 0.45;
      const tx = targetCenter.x + Math.cos(angle) * radius;
      const ty = targetCenter.y + Math.sin(angle) * radius;

      const startTime = 0.2 + stepIdx * stepDelay;

      // Animate coordinate motion
      tl.to(stone, {
        x: tx,
        y: ty,
        duration: stepDuration,
        ease: 'power1.inOut',
        onUpdate: () => {
          // Shadow stays at ground coordinates
          stone.container.x = stone.x;
          stone.container.y = stone.y;
          this.updateStoneVisual(stone);
        }
      }, startTime);

      // Parabolic arc (Bezier shape of height flightZ) - Height Bezier Arc (Up)
      tl.fromTo(stone,
        { flightZ: 0.35 },
        {
          flightZ: 1.0, // Peak height at midpoint
          duration: stepDuration / 2,
          ease: 'power1.out',
          onUpdate: () => this.updateStoneVisual(stone)
        },
        startTime
      );

      // Height Bezier Arc (Down / Land)
      tl.to(stone, {
        flightZ: 0.0, // Lands on target pit
        duration: stepDuration / 2,
        ease: 'power1.in',
        onUpdate: () => this.updateStoneVisual(stone),
        onComplete: () => {
          // LANDED!
          // Put into the target pit's array
          this.stonesInPits[targetPitIdx].push(stone);
          
          // Apply physics splash velocity
          stone.vx = (Math.random() * 4 - 2);
          stone.vy = (Math.random() * 4 + 2); // Downward splash velocity
          stone.isSleeping = false;

          // Play drop sound!
          const isTreasury = targetPitIdx === 6 || targetPitIdx === 13;
          if (isTreasury) {
            soundManager.playTreasuryCapture();
          } else {
            soundManager.playDrop();
          }

          // Wake up all existing stones in target pit to react to splash
          this.stonesInPits[targetPitIdx].forEach((s) => {
            s.isSleeping = false;
          });

          // Trigger physics updates
          this.startPhysicsTicker();
        }
      }, startTime + stepDuration / 2);
    });

    // Trigger completion immediately after the last stone lands (with a tiny buffer of 0.02s)
    tl.add(() => {
      this.checkAnimationSettle();
    }, 0.2 + steps.length * stepDelay + stepDuration + 0.02);
  }

  /**
   * Snaps the animation to completion as soon as all stones land, allowing immediate next turn interaction
   * while the stones continue to physically settle in the background.
   */
  private checkAnimationSettle(): void {
    console.log("[MangalaBoard] checkAnimationSettle called. Settle complete, enabling next turn.");
    this.isAnimating = false;
    if (this.onAnimationComplete) {
      this.onAnimationComplete();
    }
  }

  /**
   * Redraw/Sync the visual elements of a single stone based on height (flightZ)
   */
  private updateStoneVisual(stone: VisualStone): void {
    const z = stone.flightZ;
    
    // Scale stone up visually based on flight height
    const stoneScale = 1.0 + z * 0.28;
    stone.stoneSprite.scale.set(stoneScale);
    
    // Displace stone graphic y position upwards to simulate Z height
    stone.stoneSprite.y = -z * 85;

    // Shadow offset increases, opacity drops, and scale decreases/fades as height peaks
    const shadowScale = 1.0 - z * 0.18;
    stone.shadowSprite.scale.set(shadowScale);
    stone.shadowSprite.x = 2 + z * 18;
    stone.shadowSprite.y = 5 + z * 32;
    stone.shadowSprite.alpha = 0.55 * (1 - z * 0.65);
  }

  /**
   * Force update position on all stones (used during non-animated resets)
   */
  private syncStonesVisuals(): void {
    for (let i = 0; i < 14; i++) {
      this.stonesInPits[i].forEach((stone) => {
        stone.container.x = stone.x;
        stone.container.y = stone.y;
        stone.flightZ = 0;
        this.updateStoneVisual(stone);
      });
    }
  }

  /**
   * Physics Loop Management
   */
  private startPhysicsTicker(): void {
    if (this.tickerActive) return;
    this.tickerActive = true;
    PIXI.Ticker.shared.add(this.physicsTickerCallback);
  }

  private stopPhysicsTicker(): void {
    if (!this.tickerActive) return;
    this.tickerActive = false;
    PIXI.Ticker.shared.remove(this.physicsTickerCallback);
  }

  /**
   * Tick Physics loop. Called every frame while physics is active.
   */
  private tickPhysics(): void {
    let anyActive = false;

    for (let pitIdx = 0; pitIdx < 14; pitIdx++) {
      const stones = this.stonesInPits[pitIdx];
      const boundary = this.pitBoundaries[pitIdx];

      // Format to PhysicsStone model
      const pStones: PhysicsStone[] = stones.map((s) => ({
        id: s.id,
        x: s.x,
        y: s.y,
        vx: s.vx,
        vy: s.vy,
        radius: STONE_RADIUS,
        bounce: 0.45,
        mass: 1,
        isSleeping: s.isSleeping
      }));

      // Run simulation step
      const active = updatePhysics(pStones, boundary, 4);
      if (active) anyActive = true;

      // Map back coordinates
      pStones.forEach((ps, idx) => {
        const s = stones[idx];
        s.x = ps.x;
        s.y = ps.y;
        s.vx = ps.vx;
        s.vy = ps.vy;
        s.isSleeping = ps.isSleeping;

        // Position container
        s.container.x = s.x;
        s.container.y = s.y;
        this.updateStoneVisual(s);
      });
    }

    if (!anyActive) {
      this.stopPhysicsTicker();
    }
  }

  public override destroy(options?: any): void {
    this.stopPhysicsTicker();
    super.destroy(options);
  }
}
