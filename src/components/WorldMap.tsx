import { WORLD_LAND_PATH, WORLD_MAP_WIDTH, WORLD_MAP_HEIGHT } from './worldMapPath'

export type ResolverStatus = 'match' | 'diff' | 'nodata' | 'error'

export interface MapPoint {
  name: string
  region: string
  ip: string
  lat: number
  lon: number
  values: string[]
  error: string | null
  status: ResolverStatus
}

const LABEL_BOX_WIDTH = 140
const LABEL_BOX_HEIGHT = 34

// All 12 resolvers sit north of y=100 except Telstra (south, y=320) — every
// label lives in the empty margin above y=82 or below y=400, well clear of
// every dot, so labels never overlap each other or a dot. A leader line
// connects each label back to its actual (approximate) position.
const LABEL_POS: Record<string, { x: number; y: number; side: 'top' | 'bottom' }> = {
  Cloudflare: { x: 8,   y: 6,  side: 'top' },
  OpenDNS:    { x: 156, y: 6,  side: 'top' },
  Google:     { x: 304, y: 6,  side: 'top' },
  Level3:     { x: 452, y: 6,  side: 'top' },
  Verisign:   { x: 600, y: 6,  side: 'top' },
  Quad9:      { x: 748, y: 6,  side: 'top' },
  AdGuard:    { x: 10,  y: 48, side: 'top' },
  Baidu:      { x: 190, y: 48, side: 'top' },
  Alibaba:    { x: 370, y: 48, side: 'top' },
  KT:         { x: 550, y: 48, side: 'top' },
  KDDI:       { x: 730, y: 48, side: 'top' },
  Telstra:    { x: 730, y: 404, side: 'bottom' },
}

const STATUS_LABEL: Record<ResolverStatus, string> = {
  match: 'match',
  diff: 'different',
  nodata: 'no data',
  error: 'timeout',
}

function geoToXY(lat: number, lon: number): [number, number] {
  const x = (lon + 180) * (WORLD_MAP_WIDTH / 360)
  const y = (90 - lat) * (WORLD_MAP_HEIGHT / 180)
  return [x, y]
}

function valueText(p: MapPoint): string {
  if (p.error) return STATUS_LABEL.error
  if (p.values.length === 0) return 'no data'
  const shown = p.values.slice(0, 2).join(', ')
  return p.values.length > 2 ? `${shown} +${p.values.length - 2}` : shown
}

export default function WorldMap({ points }: { points: MapPoint[] }) {
  return (
    <div className="wm-wrap">
      <svg
        className="wm-svg"
        viewBox={`0 0 ${WORLD_MAP_WIDTH} ${WORLD_MAP_HEIGHT}`}
        role="img"
        aria-label="World map of DNS resolvers and their propagation status"
      >
        <path className="wm-land" d={WORLD_LAND_PATH} />

        {points.map(p => {
          const pos = LABEL_POS[p.name]
          if (!pos) return null
          const [dotX, dotY] = geoToXY(p.lat, p.lon)
          const connectX = pos.x + LABEL_BOX_WIDTH / 2
          const connectY = pos.side === 'top' ? pos.y + LABEL_BOX_HEIGHT : pos.y
          return (
            <line
              key={`leader-${p.name}`}
              className="wm-leader"
              x1={dotX}
              y1={dotY}
              x2={connectX}
              y2={connectY}
            />
          )
        })}

        {points.map(p => {
          const [dotX, dotY] = geoToXY(p.lat, p.lon)
          return (
            <circle
              key={`dot-${p.name}`}
              className={`wm-dot-marker status-${p.status}`}
              cx={dotX}
              cy={dotY}
              r={4}
            />
          )
        })}

        {points.map(p => {
          const pos = LABEL_POS[p.name]
          if (!pos) return null
          return (
            <foreignObject
              key={`label-${p.name}`}
              x={pos.x}
              y={pos.y}
              width={LABEL_BOX_WIDTH}
              height={LABEL_BOX_HEIGHT}
            >
              <div className="wm-label">
                <div className="wm-label-head">
                  <span className={`wm-dot status-${p.status}`} />
                  <span className="wm-name">{p.name}</span>
                  <span className="wm-region">{p.region}</span>
                </div>
                <div className="wm-value">{valueText(p)}</div>
              </div>
            </foreignObject>
          )
        })}
      </svg>

      <div className="wm-legend">
        <span className="wm-legend-item"><span className="wm-dot status-match" /> match</span>
        <span className="wm-legend-item"><span className="wm-dot status-diff" /> different</span>
        <span className="wm-legend-item"><span className="wm-dot status-nodata" /> no data</span>
        <span className="wm-legend-item"><span className="wm-dot status-error" /> timeout</span>
      </div>
      <p className="wm-caveat">resolver positions are approximate — most are anycast networks that answer from whichever point of presence is nearest the query, not from a single fixed location</p>
    </div>
  )
}
