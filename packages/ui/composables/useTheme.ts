const STORAGE_KEY = 'vdf-theme'
type Theme = 'light' | 'dark'

const theme = ref<Theme>('dark')

function applyTheme(t: Theme) {
  if (import.meta.server) return
  // Force dark mode only
  document.documentElement.setAttribute('data-theme', 'dark')
  localStorage.setItem(STORAGE_KEY, 'dark')
}

function getInitialTheme(): Theme {
  // Always return dark
  return 'dark'
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
    // No-op - theme toggle is disabled, always stay dark
    theme.value = 'dark'
    applyTheme(theme.value)
  }

  return { theme: readonly(theme), toggle }
}
