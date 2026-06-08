import { useState } from 'react'
import DnsLookup from './DnsLookup'
import Propagation from './Propagation'

type Sub = 'lookup' | 'propagation'

export default function DnsSection() {
  const [sub, setSub] = useState<Sub>('lookup')
  return (
    <div>
      <div className="kp-subtabs">
        <button className={`kp-subtab${sub === 'lookup'      ? ' active' : ''}`} onClick={() => setSub('lookup')}>Lookup</button>
        <button className={`kp-subtab${sub === 'propagation' ? ' active' : ''}`} onClick={() => setSub('propagation')}>Propagation</button>
      </div>
      {sub === 'lookup'      && <DnsLookup />}
      {sub === 'propagation' && <Propagation />}
    </div>
  )
}
