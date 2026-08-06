/**
 * Width profile — computes per-point stroke width by combining:
 *   1. WPF-style taper (smoothstep at stroke start/end)
 *   2. Velocity-based thinning (faster → thinner)
 *   3. Pressure-based modulation (harder → thicker)
 *
 * Replaces the legacy buildNibWidthAt() + buildNibSegments() approach with
 * a single, unified width array aligned 1:1 with the smoothed centerline.
 */

import { clamp, smoothstep } from './types'
import type { SmoothedPoint, PenKind } from './types'

export interface WidthProfileConfig {
  baseWidth: number
  penKind: PenKind
  /** Whether to apply nib (calligraphic) width variation. */
  nibEnabled: boolean

  // Taper parameters (WPF-style)
  /** Fraction of total arc length used for start taper. Default: 0.12. */
  taperStart: number
  /** Fraction of total arc length used for end taper. Default: 0.12. */
  taperEnd: number

  // Velocity sensitivity
  /** How much speed affects width (0 = none, 1 = full). Default: 0.55. */
  speedSensitivity: number
  /** Reference speed in px/ms for normalization. Default: 0.55. */
  speedReference: number

  // Pressure sensitivity
  /** How much pressure affects width (0 = none, 1 = full). Default: 0.6. */
  pressureSensitivity: number
}

export interface WidthProfile {
  /** Per-point width values aligned with the smoothed point array. */
  widths: Float32Array
  /** Cumulative arc length at each point (for parameterization). */
  cumulativeLengths: Float32Array
  /** Total arc length of the stroke. */
  totalLength: number
}

const DEFAULT_CONFIG: WidthProfileConfig = {
  baseWidth: 6,
  penKind: 'writing',
  nibEnabled: true,
  taperStart: 0.12,
  taperEnd: 0.12,
  speedSensitivity: 0.55,
  speedReference: 0.55,
  pressureSensitivity: 0.6,
}

/**
 * Create a WidthProfileConfig with sensible defaults for each pen kind.
 */
export function createWidthProfileConfig(
  baseWidth: number,
  penKind: PenKind,
  nibEnabled: boolean,
): WidthProfileConfig {
  const cfg = { ...DEFAULT_CONFIG, baseWidth, penKind, nibEnabled }

  switch (penKind) {
    case 'writing':
      // Full taper, pressure + speed sensitive
      cfg.taperStart = 0.12
      cfg.taperEnd = 0.12
      cfg.speedSensitivity = 0.55
      cfg.speedReference = 0.55
      cfg.pressureSensitivity = 0.6
      break
    case 'highlighter':
      // Light taper only, no pressure/width variation
      cfg.taperStart = 0.06
      cfg.taperEnd = 0.06
      cfg.speedSensitivity = 0.0
      cfg.pressureSensitivity = 0.0
      break
    case 'laser':
      // No taper, no width variation
      cfg.taperStart = 0.0
      cfg.taperEnd = 0.0
      cfg.speedSensitivity = 0.0
      cfg.pressureSensitivity = 0.0
      break
  }

  return cfg
}

/**
 * Compute the width profile for a sequence of smoothed points.
 *
 * The returned `widths` array has the same length as `points`.
 */
export function computeWidthProfile(
  points: SmoothedPoint[],
  config: WidthProfileConfig,
): WidthProfile {
  const n = points.length
  const widths = new Float32Array(n)
  const cumLen = new Float32Array(n)

  if (n === 0) {
    return { widths, cumulativeLengths: cumLen, totalLength: 0 }
  }

  widths[0] = config.baseWidth
  cumLen[0] = 0

  // ── Pass 1: cumulative arc length ──────────────────────────────────────
  for (let i = 1; i < n; i++) {
    const dx = points[i].x - points[i - 1].x
    const dy = points[i].y - points[i - 1].y
    cumLen[i] = cumLen[i - 1] + Math.hypot(dx, dy)
  }

  const totalLen = cumLen[n - 1]
  if (totalLen < 1e-6) {
    // Degenerate: all points at same location → uniform width
    widths.fill(config.baseWidth)
    return { widths, cumulativeLengths: cumLen, totalLength: totalLen }
  }

  // ── Pass 2: compute width at each point ────────────────────────────────
  for (let i = 0; i < n; i++) {
    const t = cumLen[i] / totalLen // arc-length parameter [0, 1]

    // 1. Taper factor (WPF-style smoothstep at start/end)
    const startTaper = smoothstep(0, config.taperStart || 0.001, t)
    const endTaper = smoothstep(0, config.taperEnd || 0.001, 1 - t)
    const taperFactor = 0.55 + 0.45 * Math.min(startTaper, endTaper)

    // 2. Speed factor (faster → thinner)
    const speed = points[i].speed
    const speedFactor = config.speedSensitivity > 0
      ? clamp(1.35 - (speed / config.speedReference) * config.speedSensitivity, 0.6, 1.35)
      : 1.0

    // 3. Pressure factor (harder → thicker)
    const pressure = points[i].pressure
    const pressureFactor = config.pressureSensitivity > 0
      ? 0.4 + 0.6 * pressure
      : 1.0

    // 4. Combine
    const pressureBlend = config.pressureSensitivity * pressureFactor + (1 - config.pressureSensitivity)
    const w = config.baseWidth * taperFactor * speedFactor * pressureBlend

    widths[i] = clamp(w, 1, 240)
  }

  return { widths, cumulativeLengths: cumLen, totalLength: totalLen }
}
