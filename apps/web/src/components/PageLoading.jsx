export default function PageLoading({ message = 'INITIALIZING...' }) {
  return (
    <div className="flex items-center gap-4 mt-12 animate-in">
      <div className="spinner" style={{ width: 24, height: 24 }} />
      <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{message}</span>
    </div>
  )
}
