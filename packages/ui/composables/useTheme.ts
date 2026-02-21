const STORAGE_KEY = 'vdf-theme'
type Theme = 'light' | 'dark'

const theme = ref<Theme>('dark')

function applyTheme(t: Theme) {
  if (import.meta.server) return
  document.documentElement.setAttribute('data-theme', t)
  localStorage.setItem(STORAGE_KEY, t)
}

function getInitialTheme(): Theme {
  if (import.meta.server) return 'dark'
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function useTheme() {
  const initialized = useState('theme-initialized', () => false)

  if (!initialized.value) {
    initialized.value = true
    onMounted(() => {
      theme.value = getInitialTheme()
      applyTheme(theme.value)
    })
  }

  function toggle() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    applyTheme(theme.value)
  }

  return { theme: readonly(theme), toggle }
}
