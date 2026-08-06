/**
 * Pressure model — extracts pressure from PointerEvent or falls back to
 * velocity-based simulation for devices without a pressure-sensitive digitizer.
 *
 * Detection heuristic: if the first N consecutive pressure readings are
 * identical (e.g. all 0.5), the device is deemed non-pressure-capable and
 * the model permanently switches to velocity simulation.
 */

import { clamp } from './types'

export interface PressureModel {
  /** Extract pressure from a PointerEvent. Uses hardware pressure when available, otherwise simulates from speed. */
  extractPressure(event: PointerEvent, speed: number): number

  /** Exponential-weighted smoothing of raw pressure values. */
  smoothPressure(raw: number): number

  /** Whether the current device provides real hardware pressure. */
  readonly hasHardwarePressure: boolean
}

export interface PressureModelConfig {
  /** Number of identical readings required to declare "no hardware pressure". Default: 5. */
  detectionWindow: number
  /** Reference speed (px/ms) for velocity simulation. Default: 1.2. */
  referenceSpeed: number
  /** Minimum simulated pressure. Default: 0.3. */
  minPressure: number
  /** Smoothing alpha for pressure EWMA. Default: 0.4. */
  smoothAlpha: number
}

const DEFAULT_CONFIG: PressureModelConfig = {
  detectionWindow: 5,
  referenceSpeed: 1.2,
  minPressure: 0.3,
  smoothAlpha: 0.4,
}

export function createPressureModel(config?: Partial<PressureModelConfig>): PressureModel {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  let resolved: boolean = false
  let hardwareOk: boolean = true
  let identicalCount: number = 0
  let lastRawPressure: number = -1

  // Smoothed pressure state
  let smoothedValue: number = 0.5
  let hasSmoothed: boolean = false

  const simulateFromSpeed = (speed: number): number => {
    // Slow → thick (high pressure), fast → thin (low pressure)
    const normalized = clamp(1.0 - speed / cfg.referenceSpeed, cfg.minPressure, 1.0)
    return normalized
  }

  const model: PressureModel = {
    extractPressure(event: PointerEvent, speed: number): number {
      const raw = event.pressure

      // Detection phase: check if hardware pressure is meaningful
      if (!resolved) {
        if (lastRawPressure >= 0 && Math.abs(raw - lastRawPressure) < 1e-6) {
          identicalCount++
        } else {
          identicalCount = 1
          lastRawPressure = raw
        }

        if (identicalCount >= cfg.detectionWindow) {
          // All readings identical → no real hardware pressure
          resolved = true
          hardwareOk = false
        } else if (identicalCount === 1 && raw > 0 && raw < 1 && Math.abs(raw - 0.5) > 0.01) {
          // First reading is clearly non-default → hardware pressure available
          resolved = true
          hardwareOk = true
        }
      }

      if (!hardwareOk) {
        return simulateFromSpeed(speed)
      }

      return clamp(raw, 0, 1)
    },

    smoothPressure(raw: number): number {
      if (!hasSmoothed) {
        hasSmoothed = true
        smoothedValue = raw
        return raw
      }
      smoothedValue = cfg.smoothAlpha * raw + (1 - cfg.smoothAlpha) * smoothedValue
      return smoothedValue
    },

    get hasHardwarePressure(): boolean {
      return hardwareOk
    },
  }

  return model
}
