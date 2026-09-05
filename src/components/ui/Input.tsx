'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  leftIcon,
  rightElement,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full space-y-1 font-mono text-xs">
      {label && (
        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 text-zinc-500 pointer-events-none flex items-center">
            {leftIcon}
          </div>
        )}
        <input
          className={`w-full bg-zinc-900/80 border text-zinc-100 rounded-xl px-3 py-2 text-xs font-mono placeholder:text-zinc-600 focus:outline-none transition-all duration-200 ${
            leftIcon ? 'pl-9' : ''
          } ${rightElement ? 'pr-12' : ''} ${
            error
              ? 'border-rose-500 focus:border-rose-400 focus:ring-1 focus:ring-rose-500/30'
              : 'border-zinc-800 hover:border-zinc-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30'
          } ${className}`}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-2.5 flex items-center">{rightElement}</div>
        )}
      </div>
      {error && <span className="text-[10px] text-rose-400 block">{error}</span>}
    </div>
  );
};

export default Input;
