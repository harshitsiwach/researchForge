export default function PageLoading({ message = 'INITIALIZING...' }) {
  return (
    <div className="flex items-center gap-4 mt-12 animate-in">
      <div className="spinner" style={{ width: 24, height: 24 }} />
      <span style={{ color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.1em' }}>{message}</span>
    </div>
  )
}
