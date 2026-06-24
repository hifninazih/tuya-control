"use client";
import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Read saved preference from localStorage
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
      setIsDark(false);
      document.documentElement.classList.add("light");
    }
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.remove("light");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.add("light");
      localStorage.setItem("theme", "light");
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        color: "var(--muted-foreground)",
        transition: "all 0.2s ease",
      }}
      className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80 active:scale-90"
    >
      {isDark ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}
