import { createContext, useContext, useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import IndexPage from './pages/IndexPage'
import ToolPage from './pages/ToolPage'
import IpCheck from './components/IpCheck'
import DnsSection from './components/DnsSection'
import EpochCalc from './components/EpochCalc'
import CidrCalc from './components/CidrCalc'
import BgpLookup from './components/BgpLookup'
import TlsChecker from './components/TlsChecker'

type Theme = 'light' | 'dark'

interface ThemeCtx { theme: Theme; toggle: () => void }
export const ThemeContext = createContext<ThemeCtx>({ theme: 'light', toggle: () => {} })
export const useTheme = () => useContext(ThemeContext)

export default function App() {
  const [theme, setTheme] = useState<Theme>(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggle = () => setTheme(t => t === 'light' ? 'dark' : 'light')

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<IndexPage />} />
          <Route path="/ip" element={
            <ToolPage title="IP Checker" subtitle="Your public IP address and network information.">
              <IpCheck />
            </ToolPage>
          } />
          <Route path="/cidr" element={
            <ToolPage title="CIDR" subtitle="Break down a subnet into network range, host count, and masks.">
              <CidrCalc />
            </ToolPage>
          } />
          <Route path="/bgp" element={
            <ToolPage title="BGP" subtitle="Look up the ASN, prefix, registry, and allocation for any IP.">
              <BgpLookup />
            </ToolPage>
          } />
          <Route path="/tls" element={
            <ToolPage title="TLS" subtitle="Inspect TLS certificates, cipher suites, and trust chains.">
              <TlsChecker />
            </ToolPage>
          } />
          <Route path="/dns" element={
            <ToolPage title="DNS" subtitle="Query DNS records and check propagation across global resolvers.">
              <DnsSection />
            </ToolPage>
          } />
          <Route path="/epoch" element={
            <ToolPage title="Epoch" subtitle="Convert Unix timestamps to human-readable dates and back.">
              <EpochCalc />
            </ToolPage>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeContext.Provider>
  )
}
