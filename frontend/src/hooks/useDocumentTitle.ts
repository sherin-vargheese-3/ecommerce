import { useEffect } from 'react'

/** Sets the browser tab title, so tabs, history and screen readers announce the current page. */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · Shop` : 'Shop'
  }, [title])
}
