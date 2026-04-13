import React from 'react';
import { cn } from '@/lib/utils.js';

const PageShell = ({ eyebrow, title, description, children, className, maxWidth = 'max-w-4xl' }) => {
  return (
    <main className={cn('flex-1 bg-[hsl(var(--muted-bg))]', className)}>
      <section className="border-b border-[hsl(var(--border))] bg-white">
        <div className={cn('mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14', maxWidth)}>
          {eyebrow && (
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#0000FF]">
              {eyebrow}
            </p>
          )}
          <h1 className="font-['Playfair_Display'] text-3xl md:text-5xl font-bold text-[hsl(var(--foreground))]">
            {title}
          </h1>
          {description && (
            <p className="mt-4 max-w-3xl text-base md:text-lg leading-7 text-[hsl(var(--secondary-text))]">
              {description}
            </p>
          )}
        </div>
      </section>

      <section className={cn('mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12', maxWidth)}>
        {children}
      </section>
    </main>
  );
};

const ContentPanel = ({ children, className }) => {
  return (
    <div className={cn('rounded-[8px] border border-[hsl(var(--border))] bg-white p-6 md:p-10 shadow-card', className)}>
      {children}
    </div>
  );
};

const ProseBlock = ({ children, className }) => {
  return (
    <div className={cn('space-y-6 text-sm md:text-base leading-7 text-[hsl(var(--foreground))]', className)}>
      {children}
    </div>
  );
};

export { PageShell, ContentPanel, ProseBlock };
