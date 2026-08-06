/**
 * InkSession — state machine for a single stroke from pointer-down to pointer-up.
 *
 * Manages the accumulation of input points, smoothing, width profile computation,
 * and outline generation for both wet (live) and dry (baked) rendering.
 */

import type { InkInputPoint, SmoothedPoint, StrokeOutline, DryStroke, PenKind, StrokeRole } from './types'
import type { WidthProfile, WidthProfileConfig } from './widthProfile'
import { computeWidthProfile } from './widthProfile'
import { generateOutline, outlineToPolygon } from './outline'
import type { OutlineConfig } from './outline'
import type { PressureModel } from './pressure'
import type { SmoothingState, SmoothingConfig } from './smoothing'
import { createSmoothingState, applySmoothing } from './smoothing'

export class InkSession {
  readonly id: number
  readonly role: StrokeRole
  readonly penKind: PenKind
  readonly color: string
  readonly opacity: number
  readonly baseWidth: number

  /** Raw input points (with pressure). */
  readonly inputPoints: InkInputPoint[] = []

  /** Smoothed points (position + pressure + speed). */
  readonly smoothedPoints: SmoothedPoint[] = []

  /** Current width profile (recomputed incrementally). */
  widthProfile: WidthProfile | null = null

  /** Whether the stroke is still being drawn. */
  isActive: boolean = true

  /** Whether the stroke has been baked (dried). */
  isBaked: boolean = false

  // Internal state
  private _smoothingState: SmoothingState
  private _pressureModel: PressureModel
  private _widthConfig: WidthProfileConfig
  private _outlineConfig: OutlineConfig

  constructor(args: {
    id: number
    role: StrokeRole
    penKind: PenKind
    color: string
    opacity: number
    baseWidth: number
    pressureModel: PressureModel
    smoothingConfig: SmoothingConfig
    widthConfig: WidthProfileConfig
    outlineConfig: OutlineConfig
  }) {
    this.id = args.id
    this.role = args.role
    this.penKind = args.penKind
    this.color = args.color
    this.opacity = args.opacity
    this.baseWidth = args.baseWidth
    this._pressureModel = args.pressureModel
    this._smoothingState = createSmoothingState()
    this._widthConfig = args.widthConfig
    this._outlineConfig = { ...args.outlineConfig, smoothingLevel: 0 }
  }

  /**
   * Add a new input point to the session.
   *
   * This performs:
   * 1. Position smoothing
   * 2. Pressure extraction/smoothing
   * 3. Append to smoothed points
   * 4. Recompute width profile
   */
  addInput(x: number, y: number, event: PointerEvent): void {
    // 1. Smooth position
    const smoothed = applySmoothing(this._smoothingState, x, y, this._getSmoothingConfig())

    // 2. Extract & smooth pressure
    const rawPressure = this._pressureModel.extractPressure(event, smoothed.speed)
    const pressure = this._pressureModel.smoothPressure(rawPressure)

    // 3. Build smoothed point
    const point: SmoothedPoint = {
      x: smoothed.x,
      y: smoothed.y,
      pressure,
      speed: smoothed.speed,
    }

    this.smoothedPoints.push(point)

    // 4. Store raw input
    this.inputPoints.push({
      x,
      y,
      pressure,
      timestamp: performance.now(),
    })

    // 5. Recompute width profile
    this.widthProfile = computeWidthProfile(this.smoothedPoints, this._widthConfig)
  }

  /**
   * Get the wet (live) outline — minimal smoothing, suitable for real-time display.
   */
  getWetOutline(): StrokeOutline {
    if (!this.widthProfile || this.smoothedPoints.length === 0) {
      return { leftEdge: [], rightEdge: [], startCap: [], endCap: [] }
    }
    return generateOutline(this.smoothedPoints, this.widthProfile, {
      ...this._outlineConfig,
      smoothingLevel: 0,
    })
  }

  /**
   * Get the dry (baked) outline — extra smoothing for a polished final stroke.
   */
  getDryOutline(): StrokeOutline {
    if (!this.widthProfile || this.smoothedPoints.length === 0) {
      return { leftEdge: [], rightEdge: [], startCap: [], endCap: [] }
    }
    return generateOutline(this.smoothedPoints, this.widthProfile, {
      ...this._outlineConfig,
      smoothingLevel: 2,
    })
  }

  /**
   * Convert this session into a finalized DryStroke for rendering and persistence.
   */
  toDryStroke(): DryStroke {
    this.isBaked = true
    this.isActive = false

    const outline = this.getDryOutline()
    const polygon = outlineToPolygon(outline)

    // Build centerline from smoothed points
    const centerline: number[] = []
    const widths: number[] = []
    for (const p of this.smoothedPoints) {
      centerline.push(p.x, p.y)
    }
    if (this.widthProfile) {
      for (let i = 0; i < this.widthProfile.widths.length; i++) {
        widths.push(this.widthProfile.widths[i])
      }
    }

    // Compute bounds
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity
    for (let i = 0; i < polygon.length; i += 2) {
      const x = polygon[i]
      const y = polygon[i + 1]
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }

    return {
      outline: polygon,
      centerline,
      widths,
      color: this.color,
      opacity: this.opacity,
      baseWidth: this.baseWidth,
      bounds: { minX, minY, maxX, maxY },
    }
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  private _getSmoothingConfig(): SmoothingConfig {
    return {
      enabled: true,
      baseAlpha: 0.22,
      speedFactor: 0.28,
    }
  }
}
