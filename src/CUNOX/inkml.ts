export type PersistedAnnotationNodeV1 = {
  role: 'stroke' | 'eraserPixel'
  groupId?: number
  strokeWidth: number
  points: number[]
  color?: string
  opacity?: number
  pfh?: boolean
}

export type PersistedAnnotationDocV1 = { version: 1; nodes: PersistedAnnotationNodeV1[] }
export type PersistedAnnotationBookV2 = { version: 2; currentPage: number; pages: PersistedAnnotationDocV1[] }

export type InkmlexcV1 = {
  version: 1
  traces: Array<{
    id: string
    role: 'stroke' | 'eraserPixel'
    strokeWidth: number
    color?: string
    opacity?: number
    pfh?: boolean
    groupId?: number
  }>
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

function sanitizePoints(points: number[]): number[] {
  const out: number[] = []
  for (const n of points) if (isFiniteNumber(n)) out.push(n)
  if (out.length % 2 === 1) out.length -= 1
  return out
}

function escapeXmlText(s: string): string {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function pointsToInkmlTrace(points: number[]): string {
  const pts = sanitizePoints(points)
  const pairs: string[] = []
  for (let i = 0; i + 1 < pts.length; i += 2) pairs.push(`${pts[i]} ${pts[i + 1]}`)
  return pairs.join(', ')
}

export function encodeDocToInkmlAndExc(doc: PersistedAnnotationDocV1): { inkml: string; inkmlexc: string } {
  const traces: string[] = []
  const exc: InkmlexcV1 = { version: 1, traces: [] }

  const nodes = Array.isArray(doc?.nodes) ? doc.nodes : []
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]
    if (!n || (n.role !== 'stroke' && n.role !== 'eraserPixel')) continue
    const id = `t${i}`
    const traceBody = pointsToInkmlTrace(Array.isArray(n.points) ? n.points : [])
    traces.push(`<trace id="${escapeXmlText(id)}">${escapeXmlText(traceBody)}</trace>`)
    exc.traces.push({
      id,
      role: n.role,
      strokeWidth: typeof n.strokeWidth === 'number' && Number.isFinite(n.strokeWidth) ? n.strokeWidth : 1,
      color: typeof n.color === 'string' ? n.color : undefined,
      opacity: typeof n.opacity === 'number' && Number.isFinite(n.opacity) ? n.opacity : undefined,
      pfh: typeof n.pfh === 'boolean' ? n.pfh : undefined,
      groupId: typeof n.groupId === 'number' && Number.isFinite(n.groupId) ? n.groupId : undefined
    })
  }

  const inkml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<ink xmlns="http://www.w3.org/2003/InkML">\n` +
    `${traces.map((t) => `  ${t}`).join('\n')}\n` +
    `</ink>\n`

  return { inkml, inkmlexc: JSON.stringify(exc) }
}

function parseInkmlTraces(inkml: string): Map<string, number[]> {
  const map = new Map<string, number[]>()
  const s = String(inkml ?? '')
  const re = /<trace\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/trace>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(s))) {
    const id = m[1] ?? ''
    const body = m[2] ?? ''
    const pairs = body
      .replaceAll('\r', ' ')
      .replaceAll('\n', ' ')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
    const pts: number[] = []
    for (const pair of pairs) {
      const parts = pair.split(/\s+/).filter(Boolean)
      if (parts.length < 2) continue
      const x = Number(parts[0])
      const y = Number(parts[1])
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue
      pts.push(x, y)
    }
    map.set(id, pts)
  }
  return map
}

export function decodeInkmlAndExcToDoc(args: { inkml: string; inkmlexc: string }): PersistedAnnotationDocV1 {
  const tracePoints = parseInkmlTraces(args.inkml)
  let exc: InkmlexcV1 | null = null
  try {
    const parsed = JSON.parse(String(args.inkmlexc ?? ''))
    if (parsed && typeof parsed === 'object' && parsed.version === 1 && Array.isArray((parsed as any).traces)) exc = parsed as InkmlexcV1
  } catch {
    exc = null
  }

  const nodes: PersistedAnnotationNodeV1[] = []
  for (const t of exc?.traces ?? []) {
    const id = typeof t?.id === 'string' ? t.id : ''
    const role = t?.role === 'stroke' || t?.role === 'eraserPixel' ? t.role : 'stroke'
    const strokeWidth = typeof t?.strokeWidth === 'number' && Number.isFinite(t.strokeWidth) ? t.strokeWidth : 1
    const points = tracePoints.get(id) ?? []
    nodes.push({
      role,
      groupId: typeof t?.groupId === 'number' && Number.isFinite(t.groupId) ? t.groupId : undefined,
      strokeWidth,
      points: points.slice(),
      color: typeof t?.color === 'string' ? t.color : undefined,
      opacity: typeof t?.opacity === 'number' && Number.isFinite(t.opacity) ? t.opacity : undefined,
      pfh: typeof t?.pfh === 'boolean' ? t.pfh : undefined
    })
  }

  return { version: 1, nodes }
}

// ─── V3 format — supports per-point widths for ink engine ─────────────────────

export type PersistedAnnotationNodeV3 = {
  role: 'stroke' | 'eraserPixel'
  groupId?: number
  /** Base stroke width (replaces strokeWidth from v1). */
  baseWidth: number
  /** Centerline coordinates [x,y,x,y,…]. */
  points: number[]
  /** Optional per-point widths aligned with centerline (for ink engine). */
  widths?: number[]
  color?: string
  opacity?: number
  pfh?: boolean
}

export type PersistedAnnotationDocV3 = { version: 3; nodes: PersistedAnnotationNodeV3[] }
export type PersistedAnnotationBookV3 = { version: 3; currentPage: number; pages: PersistedAnnotationDocV3[] }

export type InkmlexcV3 = {
  version: 3
  traces: Array<{
    id: string
    role: 'stroke' | 'eraserPixel'
    baseWidth: number
    color?: string
    opacity?: number
    pfh?: boolean
    groupId?: number
    /** Comma-separated width values (optional). */
    widths?: string
  }>
}

/** Migrate a v1 node to v3 format. */
export function migrateNodeV1ToV3(node: PersistedAnnotationNodeV1): PersistedAnnotationNodeV3 {
  return {
    role: node.role,
    groupId: node.groupId,
    baseWidth: typeof node.strokeWidth === 'number' && Number.isFinite(node.strokeWidth) ? node.strokeWidth : 1,
    points: Array.isArray(node.points) ? node.points.slice() : [],
    color: node.color,
    opacity: node.opacity,
    pfh: node.pfh,
  }
}

/** Migrate a v1 doc to v3 format. */
export function migrateDocV1ToV3(doc: PersistedAnnotationDocV1): PersistedAnnotationDocV3 {
  const nodes = Array.isArray(doc?.nodes) ? doc.nodes : []
  return {
    version: 3,
    nodes: nodes.map(migrateNodeV1ToV3),
  }
}

function sanitizeWidth(widths: number[], expectedCount: number): number[] {
  const out: number[] = []
  for (let i = 0; i < expectedCount && i < widths.length; i++) {
    const w = widths[i]
    out.push(isFiniteNumber(w) && w > 0 ? w : 1)
  }
  return out
}

function widthsToInkmlAttr(widths: number[]): string {
  return sanitizePoints(widths).map((w) => String(Math.round(w * 100) / 100)).join(',')
}

function parseInkmlWidths(attr: string | undefined, expectedCount: number): number[] | undefined {
  if (!attr) return undefined
  const parts = attr.split(',').map((s) => s.trim()).filter(Boolean)
  if (!parts.length) return undefined
  const out: number[] = []
  for (let i = 0; i < expectedCount; i++) {
    const w = i < parts.length ? Number(parts[i]) : NaN
    out.push(isFiniteNumber(w) && w > 0 ? w : 1)
  }
  return out.length ? out : undefined
}

export function encodeDocV3ToInkmlAndExc(doc: PersistedAnnotationDocV3): { inkml: string; inkmlexc: string } {
  const traces: string[] = []
  const exc: InkmlexcV3 = { version: 3, traces: [] }

  const nodes = Array.isArray(doc?.nodes) ? doc.nodes : []
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]
    if (!n || (n.role !== 'stroke' && n.role !== 'eraserPixel')) continue
    const id = `t${i}`
    const traceBody = pointsToInkmlTrace(Array.isArray(n.points) ? n.points : [])
    const widthsAttr = n.widths?.length ? ` widths="${escapeXmlText(widthsToInkmlAttr(n.widths))}"` : ''
    traces.push(`<trace id="${escapeXmlText(id)}"${widthsAttr}>${escapeXmlText(traceBody)}</trace>`)
    exc.traces.push({
      id,
      role: n.role,
      baseWidth: typeof n.baseWidth === 'number' && Number.isFinite(n.baseWidth) ? n.baseWidth : 1,
      color: typeof n.color === 'string' ? n.color : undefined,
      opacity: typeof n.opacity === 'number' && Number.isFinite(n.opacity) ? n.opacity : undefined,
      pfh: typeof n.pfh === 'boolean' ? n.pfh : undefined,
      groupId: typeof n.groupId === 'number' && Number.isFinite(n.groupId) ? n.groupId : undefined,
      widths: n.widths?.length ? widthsToInkmlAttr(n.widths) : undefined,
    })
  }

  const inkml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<ink xmlns="http://www.w3.org/2003/InkML">\n` +
    `${traces.map((t) => `  ${t}`).join('\n')}\n` +
    `</ink>\n`

  return { inkml, inkmlexc: JSON.stringify(exc) }
}

function parseInkmlTracesV3(inkml: string): Map<string, { points: number[]; widths?: string }> {
  const map = new Map<string, { points: number[]; widths?: string }>()
  const s = String(inkml ?? '')
  const re = /<trace\b([^>]*)>([\s\S]*?)<\/trace>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(s))) {
    const attrs = m[1] ?? ''
    const body = m[2] ?? ''
    const idMatch = /\bid="([^"]+)"/.exec(attrs)
    const id = idMatch?.[1] ?? ''
    const widthsMatch = /\bwidths="([^"]+)"/.exec(attrs)
    const widths = widthsMatch?.[1]

    const pairs = body
      .replaceAll('\r', ' ')
      .replaceAll('\n', ' ')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
    const pts: number[] = []
    for (const pair of pairs) {
      const parts = pair.split(/\s+/).filter(Boolean)
      if (parts.length < 2) continue
      const x = Number(parts[0])
      const y = Number(parts[1])
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue
      pts.push(x, y)
    }
    map.set(id, { points: pts, widths })
  }
  return map
}

export function decodeInkmlAndExcToDocV3(args: { inkml: string; inkmlexc: string }): PersistedAnnotationDocV3 {
  const traceData = parseInkmlTracesV3(args.inkml)
  let exc: InkmlexcV3 | null = null
  try {
    const parsed = JSON.parse(String(args.inkmlexc ?? ''))
    if (parsed && typeof parsed === 'object') {
      if (parsed.version === 3 && Array.isArray((parsed as any).traces)) {
        exc = parsed as InkmlexcV3
      } else if (parsed.version === 1 && Array.isArray((parsed as any).traces)) {
        // Migrate v1 exc to v3
        const v1Exc = parsed as InkmlexcV1
        exc = {
          version: 3,
          traces: v1Exc.traces.map((t) => ({
            ...t,
            baseWidth: t.strokeWidth,
          })),
        }
      }
    }
  } catch {
    exc = null
  }

  const nodes: PersistedAnnotationNodeV3[] = []
  for (const t of exc?.traces ?? []) {
    const id = typeof t?.id === 'string' ? t.id : ''
    const role = t?.role === 'stroke' || t?.role === 'eraserPixel' ? t.role : 'stroke'
    const baseWidth = typeof t?.baseWidth === 'number' && Number.isFinite(t.baseWidth) ? t.baseWidth : 1
    const data = traceData.get(id)
    const points = data?.points ?? []
    const pointCount = Math.floor(points.length / 2)
    const widths = parseInkmlWidths(data?.widths ?? t?.widths, pointCount)

    nodes.push({
      role,
      groupId: typeof t?.groupId === 'number' && Number.isFinite(t.groupId) ? t.groupId : undefined,
      baseWidth,
      points: points.slice(),
      widths,
      color: typeof t?.color === 'string' ? t.color : undefined,
      opacity: typeof t?.opacity === 'number' && Number.isFinite(t.opacity) ? t.opacity : undefined,
      pfh: typeof t?.pfh === 'boolean' ? t.pfh : undefined,
    })
  }

  return { version: 3, nodes }
}

