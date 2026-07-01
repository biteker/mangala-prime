/**
 * Micro-Physics Engine for Mangala Stones
 * Handles collisions, boundary limits (circle and capsule), gravity, and elastic bounciness.
 */

export interface PhysicsStone {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  bounce: number;
  mass: number;
  isSleeping: boolean;
}

export interface PitBoundary {
  type: 'circle';
  cx: number;
  cy: number;
  radius: number;
}

export interface TreasuryBoundary {
  type: 'capsule';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  radius: number;
}

export type PhysicsBoundary = PitBoundary | TreasuryBoundary;

/**
 * Returns the closest point on a line segment to a given point.
 */
function getClosestPointOnSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const abX = x2 - x1;
  const abY = y2 - y1;
  const apX = px - x1;
  const apY = py - y1;

  const abLen2 = abX * abX + abY * abY;
  if (abLen2 === 0) return { x: x1, y: y1 };

  // Project ap onto ab, clamp between 0 and 1
  let t = (apX * abX + apY * abY) / abLen2;
  t = Math.max(0, Math.min(1, t));

  return {
    x: x1 + t * abX,
    y: y1 + t * abY,
  };
}

/**
 * Updates the physics simulation for a set of stones inside a boundary.
 * Run this in a loop until all stones settle (velocity becomes very low).
 * @returns boolean true if at least one stone is still active (moving), false if all are sleeping.
 */
export function updatePhysics(
  stones: PhysicsStone[],
  boundary: PhysicsBoundary,
  subSteps: number = 8
): boolean {
  const gravity = 0.15; // Soft downward gravity
  const centerPull = 0.08; // Soft pull to the center to keep marbles clumped nicely
  const friction = 0.94; // Friction damping
  const sleepThreshold = 0.05;

  let anyActive = false;

  // Run sub-steps for physics stability
  for (let step = 0; step < subSteps; step++) {
    // 1. Apply gravity, center pull, friction, and update position
    for (let i = 0; i < stones.length; i++) {
      const s = stones[i];
      if (s.isSleeping) continue;

      // Calculate center pull force
      let targetX = 0;
      let targetY = 0;
      if (boundary.type === 'circle') {
        targetX = boundary.cx;
        targetY = boundary.cy + boundary.radius * 0.15; // Pull slightly below center
      } else {
        // Capsule center line mid-point
        targetX = (boundary.x1 + boundary.x2) / 2;
        targetY = (boundary.y1 + boundary.y2) / 2 + boundary.radius * 0.2;
      }

      const dx = targetX - s.x;
      const dy = targetY - s.y;
      
      // Apply forces
      s.vx += dx * centerPull * (1 / subSteps);
      s.vy += (dy * centerPull + gravity) * (1 / subSteps);
      
      // Apply friction
      s.vx *= Math.pow(friction, 1 / subSteps);
      s.vy *= Math.pow(friction, 1 / subSteps);

      // Move stone
      s.x += s.vx * (1 / subSteps);
      s.y += s.vy * (1 / subSteps);
    }

    // 2. Resolve Stone-Stone Collisions (Circle-Circle)
    for (let i = 0; i < stones.length; i++) {
      for (let j = i + 1; j < stones.length; j++) {
        const s1 = stones[i];
        const s2 = stones[j];

        if (s1.isSleeping && s2.isSleeping) continue;

        const dx = s2.x - s1.x;
        const dy = s2.y - s1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = s1.radius + s2.radius;

        if (dist < minDist) {
          // Wake up sleeping stones
          s1.isSleeping = false;
          s2.isSleeping = false;

          // Push vectors
          const overlap = minDist - dist;
          const nx = dist > 0 ? dx / dist : 1;
          const ny = dist > 0 ? dy / dist : 0;

          // Push apart equally (assuming equal masses for simplicity)
          const pushX = nx * overlap * 0.5;
          const pushY = ny * overlap * 0.5;

          s1.x -= pushX;
          s1.y -= pushY;
          s2.x += pushX;
          s2.y += pushY;

          // Elastic collision velocity response
          const kx = s1.vx - s2.vx;
          const ky = s1.vy - s2.vy;
          const relativeVelocity = kx * nx + ky * ny;

          if (relativeVelocity > 0) {
            // Combined bounce factor
            const b = (s1.bounce + s2.bounce) * 0.5;
            const impulse = (1 + b) * relativeVelocity * 0.5; // Equal mass

            s1.vx -= impulse * nx;
            s1.vy -= impulse * ny;
            s2.vx += impulse * nx;
            s2.vy += impulse * ny;
          }
        }
      }
    }

    // 3. Resolve Boundary Constraints
    for (let i = 0; i < stones.length; i++) {
      const s = stones[i];
      if (s.isSleeping) continue;
      
      if (boundary.type === 'circle') {
        const dx = s.x - boundary.cx;
        const dy = s.y - boundary.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = boundary.radius - s.radius;

        if (dist > maxDist) {
          s.isSleeping = false;
          
          const nx = dist > 0 ? dx / dist : 1;
          const ny = dist > 0 ? dy / dist : 0;

          // Push back inside
          s.x = boundary.cx + nx * maxDist;
          s.y = boundary.cy + ny * maxDist;

          // Reflect velocity along normal
          const dot = s.vx * nx + s.vy * ny;
          if (dot > 0) {
            s.vx -= (1 + s.bounce) * dot * nx;
            s.vy -= (1 + s.bounce) * dot * ny;
          }
        }
      } else {
        // Capsule constraint
        // Find closest point on segment (x1,y1) -> (x2,y2)
        const closest = getClosestPointOnSegment(s.x, s.y, boundary.x1, boundary.y1, boundary.x2, boundary.y2);
        const dx = s.x - closest.x;
        const dy = s.y - closest.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = boundary.radius - s.radius;

        if (dist > maxDist) {
          s.isSleeping = false;

          const nx = dist > 0 ? dx / dist : 1;
          const ny = dist > 0 ? dy / dist : 0;

          // Push back inside
          s.x = closest.x + nx * maxDist;
          s.y = closest.y + ny * maxDist;

          // Reflect velocity
          const dot = s.vx * nx + s.vy * ny;
          if (dot > 0) {
            s.vx -= (1 + s.bounce) * dot * nx;
            s.vy -= (1 + s.bounce) * dot * ny;
          }
        }
      }
    }
  }

  // 4. Update sleep states
  for (let i = 0; i < stones.length; i++) {
    const s = stones[i];
    const speed2 = s.vx * s.vx + s.vy * s.vy;
    
    if (speed2 < sleepThreshold * sleepThreshold) {
      s.vx = 0;
      s.vy = 0;
      // Soft sleep check
      if (Math.abs(s.vx) < 0.01 && Math.abs(s.vy) < 0.01) {
        s.isSleeping = true;
      }
    } else {
      s.isSleeping = false;
      anyActive = true;
    }
  }

  return anyActive;
}

/**
 * Helper to pack a specific count of stones inside a boundary statically (no animation).
 * Uses iterative push-out to arrange circles without overlap.
 */
export function packStonesStatically(
  count: number,
  boundary: PhysicsBoundary,
  stoneRadius: number
): { id: string; x: number; y: number }[] {
  const stones: PhysicsStone[] = [];
  
  // Initialize stones with slight random offsets around the center
  let cx = 0;
  let cy = 0;
  if (boundary.type === 'circle') {
    cx = boundary.cx;
    cy = boundary.cy;
  } else {
    cx = (boundary.x1 + boundary.x2) / 2;
    cy = (boundary.y1 + boundary.y2) / 2;
  }

  for (let i = 0; i < count; i++) {
    const angle = (i / Math.max(1, count)) * Math.PI * 2 + Math.random() * 0.5;
    const dist = (i === 0) ? 0 : Math.min(boundary.radius * 0.4, stoneRadius * 1.5 * Math.sqrt(i));
    
    stones.push({
      id: `stone_${i}_${Math.random().toString(36).substr(2, 9)}`,
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      vx: 0,
      vy: 0,
      radius: stoneRadius,
      bounce: 0.4,
      mass: 1,
      isSleeping: false
    });
  }

  // Run the physics loop for many steps to let them pack and settle
  let active = true;
  let iterations = 0;
  // Cap at 200 iterations for safety
  while (active && iterations < 200) {
    active = updatePhysics(stones, boundary, 4);
    iterations++;
  }

  return stones.map(s => ({
    id: s.id,
    x: s.x,
    y: s.y
  }));
}
