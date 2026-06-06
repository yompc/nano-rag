'use client';

import { NavBar } from '@/components/nav-bar';

interface AppShellProps {
  children: React.ReactNode;
  variant?: 'default' | 'landing';
  /** Additional elements in the NavBar center area (desktop only) */
  navChildren?: React.ReactNode;
  /** Hide mobile hamburger menu in NavBar (use when page has its own mobile menu) */
  hideMobileMenu?: boolean;
}

export function AppShell({ children, variant = 'default', navChildren, hideMobileMenu = false }: AppShellProps) {
  const isLanding = variant === 'landing';
  
  return (
    <div className={`${isLanding ? 'min-h-screen' : 'h-screen overflow-hidden'} flex flex-col bg-[var(--canvas)]`}>
      <NavBar variant={variant} hideMobileMenu={hideMobileMenu}>{navChildren}</NavBar>
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
