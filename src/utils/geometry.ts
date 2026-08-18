import { polygon as turfPolygon } from '@turf/helpers'
import booleanOverlap from '@turf/boolean-overlap'

export type Point = [number, number]

// 叉积符号：判断点 c 在直线 ab 的哪一侧
function cross(o: Point, a: Point, b: Point): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
}

function onSegment(p: Point, q: Point, r: Point): boolean {
  return (
    Math.min(p[0], r[0]) <= q[0] && q[0] <= Math.max(p[0], r[0]) &&
    Math.min(p[1], r[1]) <= q[1] && q[1] <= Math.max(p[1], r[1])
  )
}

// 判断线段 p1p2 与 p3p4 是否相交（含端点落在对方线段上的情形）
function segmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const d1 = cross(p3, p4, p1)
  const d2 = cross(p3, p4, p2)
  const d3 = cross(p1, p2, p3)
  const d4 = cross(p1, p2, p4)
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true
  }
  if (d1 === 0 && onSegment(p3, p1, p4)) return true
  if (d2 === 0 && onSegment(p3, p2, p4)) return true
  if (d3 === 0 && onSegment(p1, p3, p2)) return true
  if (d4 === 0 && onSegment(p1, p4, p2)) return true
  return false
}

/**
 * 判断多边形是否自相交。顶点按顺序传入（[lat, lng]），首尾自动闭合。
 * 相邻边共享端点不算自相交；少于 3 个点视为不构成多边形，返回 false。
 */
export function isSelfIntersectingPolygon(points: Point[]): boolean {
  const n = points.length
  if (n < 3) return false
  for (let i = 0; i < n; i++) {
    const a = points[i]
    const b = points[(i + 1) % n]
    for (let j = i + 1; j < n; j++) {
      // 跳过共享端点的相邻边（含首尾闭合边）
      if (j === i + 1 || (i === 0 && j === n - 1)) continue
      const c = points[j]
      const d = points[(j + 1) % n]
      if (segmentsIntersect(a, b, c, d)) return true
    }
  }
  return false
}

// Leaflet [lat, lng] → GeoJSON [lng, lat]，自动闭合
function toRing(points: Point[]): [number, number][] {
  const ring = points.map(([lat, lng]) => [lng, lat] as [number, number])
  const last = ring[ring.length - 1]
  if (ring.length > 1 && last && (ring[0][0] !== last[0] || ring[0][1] !== last[1])) {
    ring.push([...ring[0]])
  }
  return ring
}

// 严格真交叉：跨立且不含共线端点（相邻地块共享端点不算相交）
function strictCross(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const d1 = cross(p3, p4, p1)
  const d2 = cross(p3, p4, p2)
  const d3 = cross(p1, p2, p3)
  const d4 = cross(p1, p2, p4)
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
}

// 射线法：点是否严格在多边形内部（边界上的点不算，避免共享边误报）
function pointInRingStrict(p: Point, ring: Point[]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/**
 * 判断两个多边形是否有面积重叠。边界相邻/共享边/共享端点不算重叠。
 * turf 的 booleanOverlap 对「完全包含」返回 false（交集等于被包含者），
 * 故叠加严格边交叉 + 顶点严格内含检测兜底。
 */
export function polygonsOverlap(a: Point[], b: Point[]): boolean {
  if (a.length < 3 || b.length < 3) return false
  if (booleanOverlap(turfPolygon([toRing(a)]), turfPolygon([toRing(b)]))) return true
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      if (strictCross(a[i], a[(i + 1) % a.length], b[j], b[(j + 1) % b.length])) return true
    }
  }
  return a.some((p) => pointInRingStrict(p, b)) || b.some((p) => pointInRingStrict(p, a))
}
