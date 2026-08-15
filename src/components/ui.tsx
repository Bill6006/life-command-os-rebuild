import type { ReactNode } from 'react'
import './ui.css'

export function Screen({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow?: string
  title: string
  lede?: string
  children?: ReactNode
}) {
  return (
    <div className="screen">
      <header className="screen__header">
        {eyebrow ? <span className="screen__eyebrow">{eyebrow}</span> : null}
        <h1 className="screen__title">{title}</h1>
        {lede ? <p className="screen__lede">{lede}</p> : null}
      </header>
      {children}
    </div>
  )
}

export function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="panel">
      {title ? <h2 className="panel__title">{title}</h2> : null}
      <div className="panel__body">{children}</div>
    </section>
  )
}

export function PrimarySurface({
  eyebrow,
  headline,
  children,
}: {
  eyebrow: string
  headline: string
  children?: ReactNode
}) {
  return (
    <section className="primary-surface">
      <span className="primary-surface__eyebrow">{eyebrow}</span>
      <h2 className="primary-surface__headline">{headline}</h2>
      {children ? <div className="primary-surface__body">{children}</div> : null}
    </section>
  )
}

export function Rows({ children }: { children: ReactNode }) {
  return <dl className="rows">{children}</dl>
}

export function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rows__row">
      <dt className="rows__key">{label}</dt>
      <dd className={mono ? 'rows__value rows__value--mono' : 'rows__value'}>{value}</dd>
    </div>
  )
}

export function List({ items }: { items: string[] }) {
  return (
    <ul className="list">
      {items.map((item) => (
        <li key={item} className="list__item">
          {item}
        </li>
      ))}
    </ul>
  )
}
