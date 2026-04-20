import IpCheck from './components/IpCheck'
import DnsLookup from './components/DnsLookup'

export default function App() {
  return (
    <div className="min-h-screen p-6 md:p-12 max-w-3xl mx-auto">
      <header className="mb-10">
        <h1 className="text-2xl font-bold text-sky-400 tracking-tight">plumber</h1>
        <p className="text-slate-500 text-sm mt-1">network toolbox</p>
      </header>

      <div className="space-y-6">
        <IpCheck />
        <DnsLookup />
      </div>

      <footer className="mt-16 text-slate-600 text-xs">
        <code>curl plumber.kevinprk.com</code> — returns your IP as plain text
      </footer>
    </div>
  )
}
