import React from 'react';

export function Badge({ children, variant = 'default', className = '' }: { children: React.ReactNode, variant?: 'default' | 'secondary' | 'outline' | 'destructive', className?: string }) {
  const base = "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary";
  const variants = {
    default: "bg-primary text-primary-foreground",
    secondary: "bg-muted text-muted-foreground",
    outline: "text-foreground border border-border",
    destructive: "bg-red-500 text-white"
  };

  return (
    <div className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
}
