import { Link } from 'react-router'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export function NotFoundPage() {
  useDocumentTitle('Page not found')
  return (
    <section>
      <h1>Page not found</h1>
      <Link to="/">Back to home</Link>
    </section>
  )
}
