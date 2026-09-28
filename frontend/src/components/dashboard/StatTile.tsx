import type { ReactNode } from 'react'
import { Link } from 'react-router'

interface Props {
  label: string
  value: string
  /** Supporting context under the value. */
  detail?: ReactNode
  href?: string
  hero?: boolean
  title?: string
}

export function StatTile({ label, value, detail, href, hero, title }: Props) {
  const body = (
    <>
      <span className="stat-label">{label}</span>
      <span className={hero ? 'stat-value hero' : 'stat-value'} title={title}>{value}</span>
      {detail && <span className="stat-detail">{detail}</span>}
    </>
  )
  return href ? (
    <Link to={href} className="card stat-tile">{body}</Link>
  ) : (
    <div className="card stat-tile">{body}</div>
  )
}
