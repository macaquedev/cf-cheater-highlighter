"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { ThemeProvider } from "next-themes"
import { Button, IconButton, Skeleton } from "@chakra-ui/react"
import { LuMoon, LuSun } from "react-icons/lu"

const ColorModeContext = createContext({})

export function ColorModeProvider({ children, ...props }) {
  return (
    <ThemeProvider {...props}>
      <ColorModeContext.Provider value={{}}>
        {children}
      </ColorModeContext.Provider>
    </ThemeProvider>
  )
}

export function useColorMode() {
  const context = useContext(ColorModeContext)
  if (!context) {
    throw new Error("useColorMode must be used within a ColorModeProvider")
  }
  
  const [mounted, setMounted] = useState(false)
  const [colorMode, setColorMode] = useState("light")

  useEffect(() => {
    setMounted(true)
    const savedMode = localStorage.getItem("theme") || "light"
    setColorMode(savedMode)
  }, [])

  const toggleColorMode = () => {
    const newMode = colorMode === "light" ? "dark" : "light"
    setColorMode(newMode)
    localStorage.setItem("theme", newMode)
    document.documentElement.classList.toggle("dark", newMode === "dark")
  }

  const setColorModeValue = (mode) => {
    setColorMode(mode)
    localStorage.setItem("theme", mode)
    document.documentElement.classList.toggle("dark", mode === "dark")
  }

  return {
    colorMode,
    toggleColorMode,
    setColorMode: setColorModeValue,
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