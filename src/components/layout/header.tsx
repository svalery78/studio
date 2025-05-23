import { Logo } from '@/components/icons/logo';
import { ModeToggle } from '@/components/mode-toggle';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-8 text-accent" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">VirtualDate</h1>
        </div>
        <ModeToggle />
      </div>
    </header>
  );
}
