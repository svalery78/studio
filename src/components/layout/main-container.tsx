import type { ReactNode } from 'react';

interface MainContainerProps {
  children: ReactNode;
}

export function MainContainer({ children }: MainContainerProps) {
  return (
    <main className="flex-1 container mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {children}
    </main>
  );
}
