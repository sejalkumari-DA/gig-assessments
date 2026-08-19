import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
};

export function Button({ className = '', variant = 'default', size = 'default', ...props }: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50';
  
  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border border-border bg-transparent hover:bg-muted hover:text-foreground',
    destructive: 'bg-red-500 text-white hover:bg-red-500/90',
    secondary: 'bg-muted text-foreground hover:bg-muted/80',
    ghost: 'hover:bg-muted hover:text-foreground',
  };

  const sizes = {
    default: 'h-9 px-4 py-2',
    sm: 'h-8 px-3 text-xs',
    lg: 'h-10 px-8',
    icon: 'h-9 w-9',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}
