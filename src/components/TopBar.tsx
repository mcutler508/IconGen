import { Moon, Sun, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'

interface TopBarProps {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  onReset: () => void
  hasImage: boolean
}

export function TopBar({ theme, onToggleTheme, onReset, hasImage }: TopBarProps) {
  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <h1 className="text-lg font-bold tracking-tight">IconMaker</h1>
      <div className="flex items-center gap-2">
        {hasImage && (
          <Button variant="outline" size="sm" onClick={onReset} data-testid="reset-button">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          data-testid="theme-toggle"
        >
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </Button>
      </div>
    </header>
  )
}
