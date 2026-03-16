interface PageShellProps {
  title: string
  description: string
  children: React.ReactNode
}

export function PageShell({ title, description, children }: PageShellProps) {
  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{title}</h1>
        <p className="page-desc">{description}</p>
      </div>
      <div className="page-body">{children}</div>
    </div>
  )
}
