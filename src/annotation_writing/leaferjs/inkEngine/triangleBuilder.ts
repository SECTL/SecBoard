/**
 * Triangle mesh builder — converts stroke outlines into triangle vertex
 * arrays suitable for GPU rendering (WebGL / WebGPU / Canvas2D).
 *
 * Replaces the legacy buildStrokeTriangles() with proper variable-width
 * ribbon support driven by the WidthProfile.
 */

import { clamp } from './types'
import type { SmoothedPoint, StrokeOutline } from './types'
import type { WidthProfile } from './widthProfile'

/**
 * Build triangle vertices for a variable-width ribbon stroke.
 *
 * For each consecutive pair of centerline points, generates two triangles
 * forming a quad between the left/right edge points at that segment.
 *
 * @param points Smoothed centerline points.
 * @param profile Width profile aligned with points.
 * @param dpr Device pixel ratio for scaling.
 * @returns Flat Float32Array of [x,y, x,y, ...] triangle vertices.
 */
export function buildRibbonTriangles(
  points: SmoothedPoint[],
  profile: WidthProfile,
  dpr: number,
): Float32Array {
  const n = points.length
  if (n < 2) {
    // Single point → render as a circle
    if (n === 1) {
      return buildCircleTriangles(points[0].x, points[0].y, profile.widths[0] * 0.5, dpr, 12)
    }
    return new Float32Array(0)
  }

  // Pre-allocate: (n-1) segments × 2 triangles × 3 verts × 2 floats = (n-1)*12 floats
  const verts = new Float32Array((n - 1) * 12 + n * 2 * 3 * 2) // generous upper bound
  let vi = 0

  const pushVert = (x: number, y: number) => {
    verts[vi++] = x * dpr
    verts[vi++] = y * dpr
  }

  // ── Ribbon quads ─────────────────────────────────────────────────────
  for (let i = 0; i < n - 1; i++) {
    const halfW0 = profile.widths[i] * 0.5
    const halfW1 = profile.widths[i + 1] * 0.5

    // Compute normals
    const dx = points[i + 1].x - points[i].x
    const dy = points[i + 1].y - points[i].y
    const len = Math.hypot(dx, dy)
    if (len < 1e-6) continue

    const nx = -dy / len
    const ny = dx / len

    // Quad corners
    const l0x = points[i].x + nx * halfW0
    const l0y = points[i].y + ny * halfW0
    const r0x = points[i].x - nx * halfW0
    const r0y = points[i].y - ny * halfW0
    const l1x = points[i + 1].x + nx * halfW1
    const l1y = points[i + 1].y + ny * halfW1
    const r1x = points[i + 1].x - nx * halfW1
    const r1y = points[i + 1].y - ny * halfW1

    // Triangle 1: l0, r0, l1
    pushVert(l0x, l0y)
    pushVert(r0x, r0y)
    pushVert(l1x, l1y)
    // Triangle 2: l1, r0, r1
    pushVert(l1x, l1y)
    pushVert(r0x, r0y)
    pushVert(r1x, r1y)
  }

  // ── End caps (circle fans) ───────────────────────────────────────────
  const segments = 12
  const cap0 = buildCircleTriangles(points[0].x, points[0].y, profile.widths[0] * 0.5, dpr, segments)
  const cap1 = buildCircleTriangles(
    points[n - 1].x,
    points[n - 1].y,
    profile.widths[n - 1] * 0.5,
    dpr,
    segments,
  )

  // Combine all triangles
  const totalLen = vi + cap0.length + cap1.length
  const result = new Float32Array(totalLen)
  result.set(verts.subarray(0, vi), 0)
  result.set(cap0, vi)
  result.set(cap1, vi + cap0.length)

  return result
}

/**
 * Build triangle vertices from a closed polygon (for dry stroke rendering).
 *
 * Uses a triangle fan from the centroid.
 *
 * @param polygon Closed polygon [x,y,x,y,...].
 * @param dpr Device pixel ratio for scaling.
 * @returns Flat Float32Array of triangle vertices.
 */
export function buildPolygonTriangles(polygon: number[], dpr: number): Float32Array {
  const pointCount = Math.floor(polygon.length / 2)
  if (pointCount < 3) return new Float32Array(0)

  // Compute centroid
  let cx = 0,
    cy = 0
  for (let i = 0; i < pointCount; i++) {
    cx += polygon[i * 2]
    cy += polygon[i * 2 + 1]
  }
  cx /= pointCount
  cy /= pointCount

  // Triangle fan: centroid → edge[i] → edge[i+1]
  const triCount = pointCount
  const result = new Float32Array(triCount * 3 * 2)
  let vi = 0

  for (let i = 0; i < pointCount; i++) {
    const j = (i + 1) % pointCount

    // Centroid
    result[vi++] = cx * dpr
    result[vi++] = cy * dpr
    // Edge vertex i
    result[vi++] = polygon[i * 2] * dpr
    result[vi++] = polygon[i * 2 + 1] * dpr
    // Edge vertex j
    result[vi++] = polygon[j * 2] * dpr
    result[vi++] = polygon[j * 2 + 1] * dpr
  }

  return result
}

/**
 * Build a StrokeOutline into triangle vertices (for wet rendering via outline).
 *
 * @param outline The stroke outline with left/right edges and caps.
 * @param dpr Device pixel ratio.
 * @returns Flat Float32Array of triangle vertices.
 */
export function buildOutlineTriangles(outline: StrokeOutline, dpr: number): Float32Array {
  // Convert to polygon then triangulate
  const polygon: number[] = []

  // Start cap
  for (let i = 0; i < outline.startCap.length; i++) polygon.push(outline.startCap[i])
  // Left edge
  for (let i = 0; i < outline.leftEdge.length; i++) polygon.push(outline.leftEdge[i])
  // End cap
  for (let i = 0; i < outline.endCap.length; i++) polygon.push(outline.endCap[i])
  // Right edge (reversed)
  for (let i = outline.rightEdge.length - 2; i >= 0; i -= 2) {
    polygon.push(outline.rightEdge[i], outline.rightEdge[i + 1])
  }

  return buildPolygonTriangles(polygon, dpr)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildCircleTriangles(
  cx: number,
  cy: number,
  radius: number,
  dpr: number,
  segments: number,
): Float32Array {
  const result = new Float32Array(segments * 3 * 2)
  let vi = 0
  const step = (Math.PI * 2) / segments

  for (let i = 0; i < segments; i++) {
    const a0 = i * step
    const a1 = (i + 1) * step

    // Center
    result[vi++] = cx * dpr
    result[vi++] = cy * dpr
    // Vertex 0
    result[vi++] = (cx + Math.cos(a0) * radius) * dpr
    result[vi++] = (cy + Math.sin(a0) * radius) * dpr
    // Vertex 1
    result[vi++] = (cx + Math.cos(a1) * radius) * dpr
    result[vi++] = (cy + Math.sin(a1) * radius) * dpr
  }

  return result
}
