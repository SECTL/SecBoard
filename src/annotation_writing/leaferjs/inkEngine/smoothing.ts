/**
 * Position smoothing — exponential moving average (EMA) filter that reduces
 * jitter from raw pointer input while preserving responsiveness.
 *
 * Extracted from AnnotationOverlay's applySmoothing() and enhanced with
 * structured config / output types.
 */

import type { SmoothedPoint } from './types'

export interface SmoothingConfig {
  /** Master enable flag. When false, raw coordinates pass through unchanged. */
  enabled: boolean
  /** Minimum EMA alpha (higher = more responsive, less smooth). Default: 0.22. */
  baseAlpha: number
  /** Speed-dependent alpha boost (higher = smoothing decreases with speed). Default: 0.28. */
  speedFactor: number
}

export interface SmoothingState {
  smoothX: number
  smoothY: number
  hasSmooth: boolean
  lastTime: number
}

const DEFAULT_CONFIG: SmoothingConfig = {
  enabled: true,
  baseAlpha: 0.22,
  speedFactor: 0.28,
}

export function createSmoothingState(): SmoothingState {
  return {
    smoothX: 0,
    smoothY: 0,
    hasSmooth: false,
    lastTime: 0,
  }
}

/**
 * Apply EMA smoothing to a raw (x, y) input.
 *
 * Returns a SmoothedPoint with position, speed, and timing info.
 */
export function applySmoothing(
  state: SmoothingState,
  x: number,
  y: number,
  config: SmoothingConfig = DEFAULT_CONFIG,
): SmoothedPoint {
  const now = performance.now()
  const dt = Math.max(1, now - (state.lastTime || now))
  state.lastTime = now

  if (!config.enabled) {
    return { x, y, pressure: 0, speed: 0 }
  }

  if (!state.hasSmooth) {
    state.hasSmooth = true
    state.smoothX = x
    state.smoothY = y
    return { x, y, pressure: 0, speed: 0 }
  }

  const dx = x - state.smoothX
  const dy = y - state.smoothY
  const speed = Math.hypot(dx, dy) / dt
  const alpha = Math.min(config.baseAlpha + speed * config.speedFactor, 0.78)

  const nx = state.smoothX + dx * alpha
  const ny = state.smoothY + dy * alpha
  state.smoothX = nx
  state.smoothY = ny

  return { x: nx, y: ny, pressure: 0, speed }
}
