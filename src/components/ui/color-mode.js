"use client"

import { ThemeProvider, useTheme } from "next-themes"
import { IconButton, Skeleton } from "@chakra-ui/react"
import { LuMoon, LuSun } from "react-icons/lu"

export function ColorModeProvider({ children }) {
  return (
    <ThemeProvider attribute="class" storageKey="theme" defaultTheme="light">
      {children}
    </ThemeProvider>
  )
}

export function useColorMode() {
  const { theme: colorMode, setTheme: setColorMode, resolvedTheme } = useTheme()
  const mounted = typeof window !== "undefined"

  const toggleColorMode = () => {
    setColorMode(resolvedTheme === "light" ? "dark" : "light")
  }

  return {
    colorMode: resolvedTheme,
    toggleColorMode,
    setColorMode,
    mounted,
  }
}

export function useColorModeValue(lightValue, darkValue) {
  const { colorMode } = useColorMode()
  return colorMode === "light" ? lightValue : darkValue
}

export function ColorModeButton() {
  const { toggleColorMode, colorMode, mounted } = useColorMode()

  if (!mounted) {
    return <Skeleton boxSize="8" />
  }

  return (
    <IconButton
      onClick={toggleColorMode}
      variant="ghost"
      size="sm"
      aria-label="Toggle color mode"
    >
      {colorMode === "light" ? <LuMoon /> : <LuSun />}
    </IconButton>
  )
}

export function LightMode({ children }) {
  return <div className="light">{children}</div>
}

export function DarkMode({ children }) {
  return <div className="dark">{children}</div>
} 