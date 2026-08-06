/**
 * Ink engine — modular ink rendering pipeline inspired by WPF's two-phase model.
 *
 * @module inkEngine
 */

// Core types
export type {
  InkInputPoint,
  SmoothedPoint,
  WidthSample,
  StrokeOutline,
  DryStroke,
  PenKind,
  StrokeRole,
} from './types'
export { clamp, smoothstep } from './types'

// Pressure model
export type { PressureModel, PressureModelConfig } from './pressure'
export { createPressureModel } from './pressure'

// Smoothing
export type { SmoothingConfig, SmoothingState } from './smoothing'
export { createSmoothingState, applySmoothing } from './smoothing'

// Width profile
export type { WidthProfileConfig, WidthProfile } from './widthProfile'
export { createWidthProfileConfig, computeWidthProfile } from './widthProfile'

// Outline generation
export type { OutlineConfig } from './outline'
export { generateOutline, outlineToPolygon } from './outline'

// Triangle builder
export { buildRibbonTriangles, buildPolygonTriangles, buildOutlineTriangles } from './triangleBuilder'

// Session & Engine
export { InkSession } from './InkSession'
export { InkEngine } from './InkEngine'
export type { InkEngineConfig } from './InkEngine'
