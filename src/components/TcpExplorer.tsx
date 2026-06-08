import { useState, useEffect, useRef } from 'react'

type Dir = 'c2s' | 's2c'
type Phase = 'handshake' | 'data' | 'teardown'

interface Packet {
  dir: Dir
  flags: string[]
  seq: number
  ack: number
  label: string
  payload?: string
  note: string
}

interface Frame {
  packet?: Packet
  clientState: string
  serverState: string
  phase: Phase
  annotation?: string
}

const C = 1000
const S = 5000

const FRAMES: Frame[] = [
  {
    clientState: 'CLOSED', serverState: 'LISTEN', phase: 'handshake',
    annotation: '3-Way Handshake'
  },
  {
    packet: {
      dir: 'c2s', flags: ['SYN'], seq: C, ack: 0, label: 'SYN',
      note: 'Client picks a random ISN and sets SYN. No data yet — just synchronizing sequence numbers.'
    },
    clientState: 'SYN_SENT', serverState: 'LISTEN', phase: 'handshake'
  },
  {
    packet: {
      dir: 's2c', flags: ['SYN', 'ACK'], seq: S, ack: C + 1, label: 'SYN-ACK',
      note: 'Server picks its own ISN and acknowledges the client\'s SYN. ack = client_seq + 1 (SYN consumes one sequence number).'
    },
    clientState: 'SYN_SENT', serverState: 'SYN_RCVD', phase: 'handshake'
  },
  {
    packet: {
      dir: 'c2s', flags: ['ACK'], seq: C + 1, ack: S + 1, label: 'ACK',
      note: 'Client acknowledges the server\'s SYN. Both sides now agree on ISNs — connection is ESTABLISHED.'
    },
    clientState: 'ESTABLISHED', serverState: 'ESTABLISHED', phase: 'handshake'
  },
  {
    clientState: 'ESTABLISHED', serverState: 'ESTABLISHED', phase: 'data',
    annotation: 'Data Transfer'
  },
  {
    packet: {
      dir: 'c2s', flags: ['PSH', 'ACK'], seq: C + 1, ack: S + 1, label: 'PSH+ACK',
      payload: 'GET / HTTP/1.1\r\nHost: example.com',
      note: 'PSH tells the receiver to push this data to the application immediately, without buffering.'
    },
    clientState: 'ESTABLISHED', serverState: 'ESTABLISHED', phase: 'data'
  },
  {
    packet: {
      dir: 's2c', flags: ['ACK'], seq: S + 1, ack: C + 39, label: 'ACK',
      note: 'Server acknowledges all bytes up to seq 1040. The ack number is the next byte the server expects.'
    },
    clientState: 'ESTABLISHED', serverState: 'ESTABLISHED', phase: 'data'
  },
  {
    packet: {
      dir: 's2c', flags: ['PSH', 'ACK'], seq: S + 1, ack: C + 39, label: 'PSH+ACK',
      payload: 'HTTP/1.1 200 OK\r\nContent-Length: 1234',
      note: 'Server sends the HTTP response. In a real transfer, large responses are segmented into MSS-sized chunks.'
    },
    clientState: 'ESTABLISHED', serverState: 'ESTABLISHED', phase: 'data'
  },
  {
    packet: {
      dir: 'c2s', flags: ['ACK'], seq: C + 39, ack: S + 41, label: 'ACK',
      note: 'Client acknowledges the response. Window size in the header controls how much more the server can send.'
    },
    clientState: 'ESTABLISHED', serverState: 'ESTABLISHED', phase: 'data'
  },
  {
    clientState: 'ESTABLISHED', serverState: 'ESTABLISHED', phase: 'teardown',
    annotation: '4-Way Teardown'
  },
  {
    packet: {
      dir: 'c2s', flags: ['FIN', 'ACK'], seq: C + 39, ack: S + 41, label: 'FIN',
      note: 'Client initiates a half-close: it won\'t send more data, but can still receive. FIN consumes one seq number.'
    },
    clientState: 'FIN_WAIT_1', serverState: 'ESTABLISHED', phase: 'teardown'
  },
  {
    packet: {
      dir: 's2c', flags: ['ACK'], seq: S + 41, ack: C + 40, label: 'ACK',
      note: 'Server acknowledges the FIN. The server may still send remaining data before closing its own side.'
    },
    clientState: 'FIN_WAIT_2', serverState: 'CLOSE_WAIT', phase: 'teardown'
  },
  {
    packet: {
      dir: 's2c', flags: ['FIN', 'ACK'], seq: S + 41, ack: C + 40, label: 'FIN',
      note: 'Server finishes and sends its own FIN. TCP teardown is asymmetric — each direction closes independently.'
    },
    clientState: 'FIN_WAIT_2', serverState: 'LAST_ACK', phase: 'teardown'
  },
  {
    packet: {
      dir: 'c2s', flags: ['ACK'], seq: C + 40, ack: S + 42, label: 'ACK',
      note: 'Client sends final ACK and enters TIME_WAIT for 2×MSL (~120s) to ensure the server received it.'
    },
    clientState: 'TIME_WAIT', serverState: 'CLOSED', phase: 'teardown'
  },
  {
    clientState: 'CLOSED', serverState: 'CLOSED', phase: 'teardown',
    annotation: 'Connection closed (after 2×MSL)'
  },
]

const PHASE_LABEL: Record<Phase, string> = {
  handshake: 'Handshake',
  data: 'Data Transfer',
  teardown: 'Teardown',
}

const FLAG_CLS: Record<string, string> = {
  SYN: 'tcp-flag-syn',
  ACK: 'tcp-flag-ack',
  FIN: 'tcp-flag-fin',
  PSH: 'tcp-flag-psh',
  RST: 'tcp-flag-rst',
  URG: 'tcp-flag-urg',
}

function StateBadge({ state }: { state: string }) {
  const cls =
    state === 'ESTABLISHED' ? 'tcp-st-est' :
    state === 'LISTEN' ? 'tcp-st-listen' :
    (state === 'FIN_WAIT_1' || state === 'FIN_WAIT_2' || state === 'TIME_WAIT' ||
     state === 'CLOSE_WAIT' || state === 'LAST_ACK') ? 'tcp-st-closing' :
    state === 'CLOSED' ? 'tcp-st-closed' :
    'tcp-st-neutral'
  return <span className={`tcp-state-badge ${cls}`}>{state}</span>
}

export default function TcpExplorer() {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1.0)
  const [animKey, setAnimKey] = useState(0)
  const seqRef = useRef<HTMLDivElement>(null)

  const frame = FRAMES[step]
  const isLast = step >= FRAMES.length - 1

  useEffect(() => {
    if (!playing) return
    if (isLast) { setPlaying(false); return }
    const delay = frame.packet ? Math.round(1000 / speed) : Math.round(500 / speed)
    const t = setTimeout(() => {
      setStep(s => s + 1)
      setAnimKey(k => k + 1)
    }, delay)
    return () => clearTimeout(t)
  }, [playing, step, isLast, speed, frame])

  useEffect(() => {
    if (seqRef.current) {
      seqRef.current.scrollTop = seqRef.current.scrollHeight
    }
  }, [step])

  function reset() {
    setPlaying(false)
    setStep(0)
    setAnimKey(k => k + 1)
  }

  function stepFwd() {
    if (!isLast) { setStep(s => s + 1); setAnimKey(k => k + 1) }
  }

  function handlePlay() {
    if (isLast) { reset(); setTimeout(() => setPlaying(true), 50); return }
    setPlaying(p => !p)
  }

  const travelMs = Math.round(750 / speed)

  // Collect packets to display (all revealed frames that have packets)
  const shownPackets: Array<{ frame: Frame; idx: number; isLive: boolean }> = []
  for (let i = 1; i <= step; i++) {
    if (FRAMES[i].packet) {
      shownPackets.push({ frame: FRAMES[i], idx: i, isLive: false })
    }
  }
  if (shownPackets.length > 0 && frame.packet) {
    shownPackets[shownPackets.length - 1].isLive = true
  }

  return (
    <div className="tcp-root">

      {/* Phase indicator */}
      <div className="tcp-phases">
        {(['handshake', 'data', 'teardown'] as Phase[]).map(p => (
          <span key={p} className={`tcp-phase-pill${frame.phase === p ? ' active' : ''}`}>
            {PHASE_LABEL[p]}
          </span>
        ))}
      </div>

      {/* Sequence diagram */}
      <div className="tcp-diagram">

        {/* Entity headers - sticky above scroll */}
        <div className="tcp-entity-row">
          <div className="tcp-entity">
            <span className="tcp-entity-name">CLIENT</span>
            <StateBadge state={frame.clientState} />
          </div>
          <div className="tcp-entity tcp-entity-r">
            <span className="tcp-entity-name">SERVER</span>
            <StateBadge state={frame.serverState} />
          </div>
        </div>

        {/* Scrollable sequence body */}
        <div className="tcp-seq-body" ref={seqRef}>
          <div className="tcp-lifeline tcp-lifeline-l" />
          <div className="tcp-lifeline tcp-lifeline-r" />

          {shownPackets.map(({ frame: f, idx, isLive }) => {
            const pkt = f.packet!
            return (
              <div key={idx} className={`tcp-pkt-row${isLive ? ' live' : ' past'}`}>
                <div
                  className={`tcp-arrow ${pkt.dir}${isLive ? ' animating' : ''}`}
                  style={{ '--travel': `${travelMs}ms` } as React.CSSProperties}
                  key={isLive ? `live-${animKey}` : idx}
                >
                  <div className="tcp-arrow-line" />
                  <div className="tcp-arrow-head" />
                  <div className="tcp-arrow-label">
                    <span className="tcp-pkt-name">{pkt.label}</span>
                    <span className="tcp-pkt-meta">seq={pkt.seq} · ack={pkt.ack}</span>
                  </div>
                  {isLive && <div className="tcp-arrow-dot" />}
                </div>
              </div>
            )
          })}

          {/* Annotation frames (no packet) */}
          {frame.annotation && (
            <div className="tcp-annotation">{frame.annotation}</div>
          )}

          <div className="tcp-seq-pad" />
        </div>
      </div>

      {/* Controls */}
      <div className="tcp-controls">
        <button className="btn-secondary" onClick={reset}>Reset</button>
        <button className="btn-primary" onClick={handlePlay}>
          {playing ? 'Pause' : isLast ? 'Replay' : step === 0 ? 'Play' : 'Resume'}
        </button>
        <button className="btn-secondary" onClick={stepFwd} disabled={playing || isLast}>
          Step →
        </button>
        <label className="tcp-speed-wrap">
          <span className="tcp-speed-lbl">Speed</span>
          <input
            type="range" min="0.4" max="3" step="0.2"
            value={speed}
            onChange={e => setSpeed(Number(e.target.value))}
          />
          <span className="tcp-speed-val">{speed.toFixed(1)}×</span>
        </label>
      </div>

      {/* Progress bar */}
      <div className="tcp-progress">
        <div
          className="tcp-progress-fill"
          style={{ width: `${(step / (FRAMES.length - 1)) * 100}%` }}
        />
      </div>

      {/* Packet detail panel */}
      {frame.packet ? (
        <div className="tcp-detail">
          <div className="tcp-detail-top">
            <div className="tcp-detail-flags">
              {frame.packet.flags.map(f => (
                <span key={f} className={`tcp-flag ${FLAG_CLS[f] ?? ''}`}>{f}</span>
              ))}
            </div>
            <div className="tcp-detail-fields">
              <div className="tcp-df">
                <span className="k">seq</span>
                <span className="v">{frame.packet.seq}</span>
              </div>
              <div className="tcp-df">
                <span className="k">ack</span>
                <span className="v">{frame.packet.ack}</span>
              </div>
              <div className="tcp-df">
                <span className="k">dir</span>
                <span className="v">{frame.packet.dir === 'c2s' ? 'Client → Server' : 'Server → Client'}</span>
              </div>
            </div>
          </div>
          {frame.packet.payload && (
            <div className="tcp-detail-payload">
              <span className="tcp-detail-payload-label">data</span>
              <code className="tcp-detail-payload-val">{frame.packet.payload}</code>
            </div>
          )}
          <p className="tcp-detail-note">{frame.packet.note}</p>
        </div>
      ) : (
        <div className="tcp-detail tcp-detail-ann">
          <span>{frame.annotation ?? ''}</span>
          <span className="tcp-step-counter">{step + 1} / {FRAMES.length}</span>
        </div>
      )}
    </div>
  )
}
