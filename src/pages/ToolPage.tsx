interface Props {
  title: string
  subtitle: string
  children: React.ReactNode
}

export default function ToolPage({ title, subtitle, children }: Props) {
  return (
    <div className="kp-tool-content">
      <main className="kp-main">
        <h1>{title}</h1>
        <p className="subtitle">{subtitle}</p>
        {children}
      </main>
      <footer className="kp-footer">
        <code style={{ fontFamily: 'var(--kp-font-mono)' }}>curl plumber.kevinprk.com — returns your IP as plain text</code>
        <span className="pi">π</span>
      </footer>
    </div>
  )
}
