'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'danger' | 'outline' | 'ghost' | 'secondary';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  glow?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  glow = false,
  className = '',
  disabled,
  ...props
}) => {
  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black shadow-lg shadow-emerald-500/20 border border-emerald-400/40',
    danger:
      'bg-rose-600/90 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-600/20 border border-rose-500/50',
    outline:
      'bg-zinc-900/60 hover:bg-zinc-800/80 text-zinc-300 hover:text-white border border-zinc-700/60 font-semibold',
    secondary:
      'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700/80 font-semibold',
    ghost:
      'bg-transparent hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 border border-transparent font-semibold'
  };

  const sizeStyles: Record<ButtonSize, string> = {
    xs: 'text-[10px] px-2 py-1 rounded-md gap-1',
    sm: 'text-xs px-2.5 py-1.5 rounded-lg gap-1.5',
    md: 'text-xs px-3.5 py-2 rounded-xl gap-2 font-bold',
    lg: 'text-sm px-4 py-2.5 rounded-xl gap-2.5 font-bold'
  };

  const glowStyle = glow
    ? variant === 'primary'
      ? 'shadow-[0_0_15px_rgba(16,185,129,0.35)]'
      : variant === 'danger'
      ? 'shadow-[0_0_15px_rgba(244,63,94,0.35)]'
      : ''
    : '';

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-mono transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98] ${variantStyles[variant]} ${sizeStyles[size]} ${glowStyle} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};

export default Button;
