/**
 * Tests for the ink engine core modules:
 * - PressureModel
 * - WidthProfile
 * - Outline generation
 * - InkEngine integration
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createPressureModel, type PressureModel } from '../leaferjs/inkEngine/pressure'
import { computeWidthProfile, createWidthProfileConfig } from '../leaferjs/inkEngine/widthProfile'
import { generateOutline, outlineToPolygon } from '../leaferjs/inkEngine/outline'
import { InkEngine } from '../leaferjs/inkEngine/InkEngine'
import type { SmoothedPoint } from '../leaferjs/inkEngine/types'

// ─── Pressure Model ───────────────────────────────────────────────────────────

describe('PressureModel', () => {
  let model: PressureModel

  beforeEach(() => {
    model = createPressureModel()
  })

  it('should detect non-pressure device after repeated identical readings', () => {
    const mockEvent = { pressure: 0.5 } as PointerEvent
    // First 5 readings at 0.5 → should detect as non-pressure device
    for (let i = 0; i < 4; i++) {
      model.extractPressure(mockEvent, 0.5)
    }
    // After 5 identical readings, should switch to simulation
    const pressure = model.extractPressure(mockEvent, 0.5)
    // Should now use velocity simulation (speed=0.5, ref=1.2 → ~0.58)
    expect(pressure).toBeGreaterThan(0)
    expect(pressure).toBeLessThanOrEqual(1)
    expect(model.hasHardwarePressure).toBe(false)
  })

  it('should accept hardware pressure when values vary', () => {
    const event1 = { pressure: 0.3 } as PointerEvent
    const event2 = { pressure: 0.7 } as PointerEvent

    model.extractPressure(event1, 0)
    model.extractPressure(event2, 0)

    // Should detect hardware pressure (values differ from default 0.5)
    expect(model.hasHardwarePressure).toBe(true)
  })

  it('should smooth pressure values', () => {
    const smoothed1 = model.smoothPressure(0.5)
    expect(smoothed1).toBe(0.5) // First value passes through

    const smoothed2 = model.smoothPressure(1.0)
    expect(smoothed2).toBeGreaterThan(0.5)
    expect(smoothed2).toBeLessThan(1.0) // EWMA smoothing
  })
})

// ─── Width Profile ────────────────────────────────────────────────────────────

describe('WidthProfile', () => {
  it('should compute uniform width for static points', () => {
    const points: SmoothedPoint[] = [
      { x: 0, y: 0, pressure: 0.5, speed: 0 },
      { x: 10, y: 0, pressure: 0.5, speed: 0 },
      { x: 20, y: 0, pressure: 0.5, speed: 0 },
    ]

    const config = createWidthProfileConfig(10, 'writing', true)
    const profile = computeWidthProfile(points, config)

    expect(profile.widths.length).toBe(3)
    expect(profile.totalLength).toBe(20)
    // All widths should be positive
    for (const w of profile.widths) {
      expect(w).toBeGreaterThan(0)
    }
  })

  it('should apply taper at stroke start and end', () => {
    const points: SmoothedPoint[] = []
    for (let i = 0; i < 20; i++) {
      points.push({ x: i * 5, y: 0, pressure: 0.5, speed: 0.3 })
    }

    const config = createWidthProfileConfig(10, 'writing', true)
    const profile = computeWidthProfile(points, config)

    // First and last widths should be smaller due to taper
    const midIdx = Math.floor(points.length / 2)
    expect(profile.widths[0]).toBeLessThan(profile.widths[midIdx])
    expect(profile.widths[points.length - 1]).toBeLessThan(profile.widths[midIdx])
  })

  it('should use fixed width for highlighter (no nib)', () => {
    const points: SmoothedPoint[] = [
      { x: 0, y: 0, pressure: 0.3, speed: 0.5 },
      { x: 10, y: 0, pressure: 0.8, speed: 0.2 },
    ]

    const config = createWidthProfileConfig(15, 'highlighter', false)
    const profile = computeWidthProfile(points, config)

    // Highlighter should have minimal width variation
    const diff = Math.abs(profile.widths[0] - profile.widths[1])
    expect(diff).toBeLessThan(2) // Very small difference
  })
})

// ─── Outline Generation ───────────────────────────────────────────────────────

describe('Outline', () => {
  it('should generate a closed polygon from centerline', () => {
    const points: SmoothedPoint[] = [
      { x: 0, y: 0, pressure: 0.5, speed: 0 },
      { x: 10, y: 0, pressure: 0.5, speed: 0 },
      { x: 20, y: 0, pressure: 0.5, speed: 0 },
    ]

    const config = createWidthProfileConfig(6, 'writing', true)
    const profile = computeWidthProfile(points, config)
    const outline = generateOutline(points, profile, {
      smoothingLevel: 0,
      capStyle: 'round',
      capSegments: 8,
    })

    expect(outline.leftEdge.length).toBeGreaterThan(0)
    expect(outline.rightEdge.length).toBeGreaterThan(0)
    expect(outline.startCap.length).toBeGreaterThan(0)
    expect(outline.endCap.length).toBeGreaterThan(0)

    // Convert to polygon
    const polygon = outlineToPolygon(outline)
    expect(polygon.length).toBeGreaterThan(0)
    expect(polygon.length % 2).toBe(0) // Even number of coordinates
  })

  it('should handle single-point stroke', () => {
    const points: SmoothedPoint[] = [{ x: 5, y: 5, pressure: 0.5, speed: 0 }]
    const config = createWidthProfileConfig(6, 'writing', true)
    const profile = computeWidthProfile(points, config)
    const outline = generateOutline(points, profile)

    // Single point should produce a cap (circle)
    expect(outline.startCap.length).toBeGreaterThan(0)
  })
})

// ─── InkEngine Integration ────────────────────────────────────────────────────

describe('InkEngine', () => {
  let engine: InkEngine

  beforeEach(() => {
    engine = new InkEngine()
  })

  it('should create a session and bake a stroke', () => {
    const mockEvent = { pressure: 0.5 } as PointerEvent

    const session = engine.beginStroke(
      1,
      'stroke',
      'writing',
      '#000000',
      1.0,
      6,
      0,
      0,
      mockEvent,
    )

    // Add some points
    for (let i = 1; i <= 10; i++) {
      session.addInput(i * 5, 0, mockEvent)
    }

    expect(session.smoothedPoints.length).toBe(11)
    expect(session.isActive).toBe(true)

    // Bake the stroke
    const dry = engine.bakeStroke(session)

    expect(dry.outline.length).toBeGreaterThan(0)
    expect(dry.centerline.length).toBeGreaterThan(0)
    expect(dry.widths.length).toBeGreaterThan(0)
    expect(dry.color).toBe('#000000')
    expect(dry.opacity).toBe(1.0)
    expect(dry.baseWidth).toBe(6)
    expect(session.isBaked).toBe(true)
    expect(session.isActive).toBe(false)
  })

  it('should produce wet triangles for GPU rendering', () => {
    const mockEvent = { pressure: 0.5 } as PointerEvent

    const session = engine.beginStroke(1, 'stroke', 'writing', '#000', 1, 6, 0, 0, mockEvent)
    session.addInput(10, 0, mockEvent)
    session.addInput(20, 0, mockEvent)

    const triangles = engine.getWetTriangles(session, 2) // dpr=2
    expect(triangles.length).toBeGreaterThan(0)
    expect(triangles instanceof Float32Array).toBe(true)
  })

  it('should handle highlighter pen kind', () => {
    const mockEvent = { pressure: 0.5 } as PointerEvent

    const session = engine.beginStroke(1, 'stroke', 'highlighter', '#FFFF00', 0.28, 20, 0, 0, mockEvent)
    for (let i = 1; i <= 5; i++) {
      session.addInput(i * 10, i * 5, mockEvent)
    }

    const dry = engine.bakeStroke(session)
    expect(dry.color).toBe('#FFFF00')
    expect(dry.opacity).toBe(0.28)
    expect(dry.baseWidth).toBe(20)
  })
})
