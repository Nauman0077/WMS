"use client"

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react"

type ThemeMode = "light" | "dark"

interface ThemeContextValue {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const THEME_STORAGE_KEY = "wms.theme.mode"

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return "light"
    }
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return stored === "dark" ? "dark" : "light"
  })

  useEffect(() => {
    document.body.dataset.theme = mode
    window.localStorage.setItem(THEME_STORAGE_KEY, mode)
  }, [mode])

  const value = useMemo(
    () => ({
      mode,
      setMode,
      toggle: () => setMode((current) => (current === "light" ? "dark" : "light")),
    }),
    [mode],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useThemeMode(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useThemeMode must be used inside ThemeProvider")
  }
  return context
}
