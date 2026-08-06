/**
 * Outline generation — generates a closed polygon outline from a centerline
 * and width profile. Shared by both wet (ribbon) and dry (PFH-style) paths.
 *
 * The only difference between wet and dry is the `smoothingLevel`:
 *   - Wet:  smoothingLevel = 0 (raw width profile, minimal smoothing)
 *   - Dry:  smoothingLevel = 2 (extra smoothing for polished output)
 */

import { clamp } from './types'
import type { SmoothedPoint, StrokeOutline } from './types'
import type { WidthProfile } from './widthProfile'

export interface OutlineConfig {
  /** Extra smoothing passes on the width array (0 = none, 1–2 = increasing smoothness). */
  smoothingLevel: 0 | 1 | 2
  /** End-cap style. */
  capStyle: 'round' | 'flat'
  /** Number of segments for round caps. */
  capSegments: number
}

const DEFAULT_OUTLINE_CONFIG: OutlineConfig = {
  smoothingLevel: 0,
  capStyle: 'round',
  capSegments: 12,
}

/**
 * Apply one pass of 3-point weighted smoothing to a width array (in-place).
 */
function smoothWidthsPass(widths: Float32Array): void {
  const n = widths.length
  if (n < 3) return
  const prev = new Float32Array(widths)
  for (let i = 1; i < n - 1; i++) {
    widths[i] = prev[i - 1] * 0.25 + prev[i] * 0.5 + prev[i + 1] * 0.25
  }
}

/**
 * Compute the unit normal at point i from the tangent direction.
 * Uses central differences when possible, forward/backward at endpoints.
 */
function computeNormal(
  points: SmoothedPoint[],
  i: number,
): { nx: number; ny: number } {
  const n = points.length
  let tx: number, ty: number

  if (i === 0 && n >= 2) {
    tx = points[1].x - points[0].x
    ty = points[1].y - points[0].y
  } else if (i === n - 1 && n >= 2) {
    tx = points[n - 1].x - points[n - 2].x
    ty = points[n - 1].y - points[n - 2].y
  } else if (n >= 3) {
    tx = points[i + 1].x - points[i - 1].x
    ty = points[i + 1].y - points[i - 1].y
  } else {
    return { nx: 0, ny: -1 }
  }

  const len = Math.hypot(tx, ty)
  if (len < 1e-9) return { nx: 0, ny: -1 }

  // Rotate tangent 90° CCW → normal
  return { nx: -ty / len, ny: tx / len }
}

/**
 * Generate a round cap (semicircle) at the given center point.
 *
 * @param cx center x
 * @param cy center y
 * @param nx normal x
 * @param ny normal y
 * @param radius cap radius
 * @param segments number of arc segments
 * @param flip if true, generate the cap on the opposite side
 * @returns flat array of [x,y,x,y,...] vertices
 */
function generateCap(
  cx: number,
  cy: number,
  nx: number,
  ny: number,
  radius: number,
  segments: number,
  flip: boolean,
): number[] {
  const out: number[] = []
  // Base angle from normal direction
  const baseAngle = Math.atan2(ny, nx)
  const startAngle = flip ? baseAngle + Math.PI * 0.5 : baseAngle - Math.PI * 0.5
  const endAngle = flip ? baseAngle + Math.PI * 1.5 : baseAngle + Math.PI * 0.5

  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const angle = startAngle + (endAngle - startAngle) * t
    out.push(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius)
  }

  return out
}

/**
 * Generate a stroke outline from centerline points and a width profile.
 *
 * The result contains left edge, right edge, and end caps that together
 * form a closed polygon suitable for fill rendering.
 */
export function generateOutline(
  points: SmoothedPoint[],
  profile: WidthProfile,
  config: OutlineConfig = DEFAULT_OUTLINE_CONFIG,
): StrokeOutline {
  const n = points.length

  if (n === 0) {
    return { leftEdge: [], rightEdge: [], startCap: [], endCap: [] }
  }

  if (n === 1) {
    // Single point → just a circle
    const r = profile.widths[0] * 0.5
    const cap = generateCap(points[0].x, points[0].y, 0, -1, r, config.capSegments, false)
    return { leftEdge: [], rightEdge: [], startCap: cap, endCap: [] }
  }

  // ── Apply extra smoothing passes to widths ───────────────────────────
  const widths = new Float32Array(profile.widths)
  for (let pass = 0; pass < config.smoothingLevel; pass++) {
    smoothWidthsPass(widths)
  }

  // ── Compute normals and generate edges ───────────────────────────────
  const leftEdge: number[] = []
  const rightEdge: number[] = []

  for (let i = 0; i < n; i++) {
    const { nx, ny } = computeNormal(points, i)
    const halfW = widths[i] * 0.5

    leftEdge.push(points[i].x + nx * halfW, points[i].y + ny * halfW)
    rightEdge.push(points[i].x - nx * halfW, points[i].y - ny * halfW)
  }

  // ── Generate end caps ────────────────────────────────────────────────
  let startCap: number[] = []
  let endCap: number[] = []

  if (config.capStyle === 'round') {
    const n0 = computeNormal(points, 0)
    const nLast = computeNormal(points, n - 1)

    startCap = generateCap(
      points[0].x,
      points[0].y,
      n0.nx,
      n0.ny,
      widths[0] * 0.5,
      config.capSegments,
      false,
    )

    endCap = generateCap(
      points[n - 1].x,
      points[n - 1].y,
      nLast.nx,
      nLast.ny,
      widths[n - 1] * 0.5,
      config.capSegments,
      true,
    )
  }

  return { leftEdge, rightEdge, startCap, endCap }
}

/**
 * Convert a StrokeOutline into a single closed polygon coordinate array.
 *
 * Polygon order: startCap → leftEdge → endCap → rightEdge (reversed)
 */
export function outlineToPolygon(outline: StrokeOutline): number[] {
  const result: number[] = []

  // Start cap
  for (let i = 0; i < outline.startCap.length; i++) {
    result.push(outline.startCap[i])
  }

  // Left edge (forward)
  for (let i = 0; i < outline.leftEdge.length; i++) {
    result.push(outline.leftEdge[i])
  }

  // End cap
  for (let i = 0; i < outline.endCap.length; i++) {
    result.push(outline.endCap[i])
  }

  // Right edge (reversed)
  for (let i = outline.rightEdge.length - 2; i >= 0; i -= 2) {
    result.push(outline.rightEdge[i], outline.rightEdge[i + 1])
  }

  return result
}
