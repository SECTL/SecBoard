/**
 * InkEngine — orchestrates the full ink pipeline:
 *
 *   PointerEvent → PressureModel → Smoothing → WidthProfile → Outline → Triangles
 *
 * This is the main entry point for the ink engine. It manages sessions,
 * configures the pipeline, and produces both wet (live) and dry (baked) output.
 */

import type { DryStroke, PenKind, StrokeRole } from './types'
import { createPressureModel, type PressureModel, type PressureModelConfig } from './pressure'
import type { SmoothingConfig } from './smoothing'
import { createWidthProfileConfig } from './widthProfile'
import type { OutlineConfig } from './outline'
import { buildRibbonTriangles } from './triangleBuilder'
import { outlineToPolygon } from './outline'
import { InkSession } from './InkSession'

export interface InkEngineConfig {
  pressure?: Partial<PressureModelConfig>
  smoothing?: Partial<SmoothingConfig>
  outline?: Partial<OutlineConfig>
}

const DEFAULT_SMOOTHING: SmoothingConfig = {
  enabled: true,
  baseAlpha: 0.22,
  speedFactor: 0.28,
}

const DEFAULT_OUTLINE: OutlineConfig = {
  smoothingLevel: 0,
  capStyle: 'round',
  capSegments: 12,
}

export class InkEngine {
  readonly pressureModel: PressureModel
  readonly smoothingConfig: SmoothingConfig
  readonly outlineConfig: OutlineConfig

  private _sessionCounter: number = 0

  constructor(config: InkEngineConfig = {}) {
    this.pressureModel = createPressureModel(config.pressure)
    this.smoothingConfig = { ...DEFAULT_SMOOTHING, ...config.smoothing }
    this.outlineConfig = { ...DEFAULT_OUTLINE, ...config.outline }
  }

  /**
   * Begin a new stroke session.
   *
   * @param id Unique pointer/session identifier.
   * @param role Whether this is a stroke or eraser.
   * @param penKind The pen type (writing, highlighter, laser).
   * @param color Stroke color (CSS color string).
   * @param opacity Stroke opacity (0–1).
   * @param baseWidth Base stroke width in world units.
   * @param firstX Initial x coordinate (world space).
   * @param firstY Initial y coordinate (world space).
   * @param firstEvent The initial PointerEvent (for pressure extraction).
   */
  beginStroke(
    id: number,
    role: StrokeRole,
    penKind: PenKind,
    color: string,
    opacity: number,
    baseWidth: number,
    firstX: number,
    firstY: number,
    firstEvent: PointerEvent,
  ): InkSession {
    const widthConfig = createWidthProfileConfig(baseWidth, penKind, penKind === 'writing')

    const session = new InkSession({
      id: id ?? ++this._sessionCounter,
      role,
      penKind,
      color,
      opacity,
      baseWidth,
      pressureModel: this.pressureModel,
      smoothingConfig: this.smoothingConfig,
      widthConfig,
      outlineConfig: this.outlineConfig,
    })

    // Add the first point
    session.addInput(firstX, firstY, firstEvent)

    return session
  }

  /**
   * Append a point to an active stroke session.
   */
  addPoint(session: InkSession, x: number, y: number, event: PointerEvent): void {
    if (!session.isActive) return
    session.addInput(x, y, event)
  }

  /**
   * Get the wet (live) triangle mesh for real-time rendering.
   *
   * @param session Active stroke session.
   * @param dpr Device pixel ratio.
   * @returns Float32Array of triangle vertices.
   */
  getWetTriangles(session: InkSession, dpr: number): Float32Array {
    if (session.smoothedPoints.length < 2) {
      // Single point → render as dot
      if (session.smoothedPoints.length === 1 && session.widthProfile) {
        const p = session.smoothedPoints[0]
        const r = session.widthProfile.widths[0] * 0.5 * dpr
        // Circle as triangle fan
        const segments = 12
        const verts = new Float32Array(segments * 3 * 2)
        let vi = 0
        const step = (Math.PI * 2) / segments
        for (let i = 0; i < segments; i++) {
          const a0 = i * step
          const a1 = (i + 1) * step
          verts[vi++] = p.x * dpr
          verts[vi++] = p.y * dpr
          verts[vi++] = (p.x + Math.cos(a0) * r) * dpr
          verts[vi++] = (p.y + Math.sin(a0) * r) * dpr
          verts[vi++] = (p.x + Math.cos(a1) * r) * dpr
          verts[vi++] = (p.y + Math.sin(a1) * r) * dpr
        }
        return verts
      }
      return new Float32Array(0)
    }

    if (!session.widthProfile) return new Float32Array(0)

    return buildRibbonTriangles(session.smoothedPoints, session.widthProfile, dpr)
  }

  /**
   * Get the wet outline (for LeaferJS Polygon-based rendering).
   */
  getWetOutline(session: InkSession): number[] {
    const outline = session.getWetOutline()
    return outlineToPolygon(outline)
  }

  /**
   * Bake (dry) a stroke session — produces the final polished output.
   *
   * @param session The session to bake.
   * @returns DryStroke with closed polygon outline.
   */
  bakeStroke(session: InkSession): DryStroke {
    return session.toDryStroke()
  }

  /**
   * End a stroke session without baking (e.g. for laser pointer that fades out).
   */
  endStroke(session: InkSession): void {
    session.isActive = false
  }
}
