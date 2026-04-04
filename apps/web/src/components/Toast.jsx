import { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'

const toasts = []
let listeners = []

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export function toast(message, type = 'info') {
  const id = generateId()
  const t = { id, message, type }
  toasts.push(t)
  listeners.forEach(fn => fn([...toasts]))
  setTimeout(() => dismiss(id), 4000)
  return id
}

toast.success = (message) => toast(message, 'success')
toast.error = (message) => toast(message, 'error')
toast.warning = (message) => toast(message, 'warning')
toast.info = (message) => toast(message, 'info')

export function dismiss(id) {
  const idx = toasts.findIndex(t => t.id === id)
  if (idx !== -1) toasts.splice(idx, 1)
  listeners.forEach(fn => fn([...toasts]))
}

export function useToasts() {
  const [items, setItems] = useState([...toasts])
  useEffect(() => {
    listeners.push(setItems)
    return () => { listeners = listeners.filter(l => l !== setItems) }
  }, [])
  return items
}

function ToastContainer() {
  const items = useToasts()
  if (items.length === 0) return null
  return (
    <div className="toast-container">
      {items.map(t => (
        <div key={t.id} className={`toast toast-${t.type} animate-in`} role="alert" aria-live="polite">
          <span className="toast-message">{t.message}</span>
          <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">×</button>
        </div>
      ))}
    </div>
  )
}

let toastRoot = null
export function initToastContainer() {
  if (toastRoot) return
  const el = document.createElement('div')
  el.id = 'toast-root'
  document.body.appendChild(el)
  toastRoot = createRoot(el)
  toastRoot.render(<ToastContainer />)
}
