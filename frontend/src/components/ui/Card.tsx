import React from 'react';

export function Card({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-xl border border-border bg-card text-foreground shadow-sm ${className}`} {...props}>
      {children}
    </div>
  );
}
