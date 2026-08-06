/**
 * Core types for the ink engine pipeline.
 *
 * Data flow:
 *   PointerEvent → InkInputPoint → SmoothedPoint → WidthProfile → StrokeOutline → DryStroke
 */

/** Raw input point with pressure (from hardware or simulation). */
export interface InkInputPoint {
  x: number
  y: number
  /** 0.0–1.0 — hardware pressure or velocity-simulated value. */
  pressure: number
  /** performance.now() timestamp. */
  timestamp: number
}

/** Position-smoothed point carrying pressure and derived speed. */
export interface SmoothedPoint {
  x: number
  y: number
  pressure: number
  /** Pixels per millisecond since the previous point. */
  speed: number
}

/** Per-point width sample with normal vector (used by outline generation). */
export interface WidthSample {
  x: number
  y: number
  /** Final stroke width at this point. */
  width: number
  /** Unit-normal x component (perpendicular to the centerline). */
  nx: number
  /** Unit-normal y component. */
  ny: number
}

/** Outline result shared by wet and dry rendering paths. */
export interface StrokeOutline {
  /** Left edge coordinates [x,y,x,y,…]. */
  leftEdge: number[]
  /** Right edge coordinates [x,y,x,y,…] (reversed order for polygon closure). */
  rightEdge: number[]
  /** Start-cap triangle fan vertices. */
  startCap: number[]
  /** End-cap triangle fan vertices. */
  endCap: number[]
}

/** Final output — a dried (completed) stroke ready for rendering / persistence. */
export interface DryStroke {
  /** Closed polygon [x,y,x,y,…] for fill rendering. */
  outline: number[]
  /** Smoothed centerline [x,y,x,y,…] for persistence. */
  centerline: number[]
  /** Per-point widths aligned with centerline (for v3 persistence). */
  widths: number[]
  color: string
  opacity: number
  baseWidth: number
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
}

export type PenKind = 'writing' | 'highlighter' | 'laser'
export type StrokeRole = 'stroke' | 'eraserPixel'

// ─── Utility ──────────────────────────────────────────────────────────────────

export const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v))

export const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}
