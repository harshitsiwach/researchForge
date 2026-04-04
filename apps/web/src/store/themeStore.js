import { create } from 'zustand'

const STORAGE_KEY = 'researchforge-theme'

function getSystemTheme() {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

function getInitialTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {}
  return 'dark'
}

function applyTheme(theme) {
  const effective = theme === 'system' ? getSystemTheme() : theme
  document.documentElement.setAttribute('data-theme', effective)
}

export const useThemeStore = create((set, get) => ({
  theme: getInitialTheme(),

  setTheme: (theme) => {
    try { localStorage.setItem(STORAGE_KEY, theme) } catch {}
    applyTheme(theme)
    set({ theme })
  },

  toggleTheme: () => {
    const current = get().theme
    const next = current === 'dark' ? 'light' : 'dark'
    get().setTheme(next)
  },

  getEffectiveTheme: () => {
    const t = get().theme
    return t === 'system' ? getSystemTheme() : t
  },
}))

// Apply theme immediately on module load
applyTheme(getInitialTheme())

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const store = get()
    if (store.theme === 'system') {
      applyTheme('system')
    }
  })
}
