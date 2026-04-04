export default function PageLoading({ message = 'Loading...' }) {
  return (
    <div className="flex items-center gap-4 mt-12 animate-in">
      <div className="spinner" style={{ width: 24, height: 24 }} />
      <span style={{ color: 'var(--on-surface-variant)', fontFamily: 'var(--font-body)', fontSize: '14px' }}>{message}</span>
    </div>
  )
}
