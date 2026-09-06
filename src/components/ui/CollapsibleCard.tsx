'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Maximize2, Minimize2, X } from 'lucide-react';
import Badge, { BadgeVariant } from './Badge';

export interface CollapsibleCardProps {
  id?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  badgeVariant?: BadgeVariant;
  headerActions?: React.ReactNode;
  defaultCollapsed?: boolean;
  allowMaximize?: boolean;
  allowCollapse?: boolean;
  storageKey?: string;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

export const CollapsibleCard: React.FC<CollapsibleCardProps> = ({
  id,
  title,
  subtitle,
  icon,
  badge,
  badgeVariant = 'zinc',
  headerActions,
  defaultCollapsed = false,
  allowMaximize = true,
  allowCollapse = true,
  storageKey,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  children
}) => {
  // Collapse state with optional localStorage memory
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && storageKey) {
      try {
        const saved = localStorage.getItem(`COLLAPSE_${storageKey}`);
        if (saved !== null) return saved === 'true';
      } catch {}
    }
    return defaultCollapsed;
  });

  // Maximize / Fullscreen state
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  const toggleCollapse = useCallback(() => {
    if (!allowCollapse) return;
    setIsCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined' && storageKey) {
        try {
          localStorage.setItem(`COLLAPSE_${storageKey}`, String(next));
        } catch {}
      }
      return next;
    });
  }, [allowCollapse, storageKey]);

  const toggleMaximize = useCallback(() => {
    if (!allowMaximize) return;
    setIsMaximized((prev) => {
      const next = !prev;
      if (next && isCollapsed) {
        setIsCollapsed(false); // automatically uncollapse if maximizing
      }
      return next;
    });
  }, [allowMaximize, isCollapsed]);

  // Handle ESC key to exit maximized mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMaximized) {
        setIsMaximized(false);
      }
    };

    if (isMaximized) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isMaximized]);

  const renderBadge = () => {
    if (!badge) return null;
    if (typeof badge === 'string' || typeof badge === 'number') {
      return (
        <Badge variant={badgeVariant} size="xs">
          {badge}
        </Badge>
      );
    }
    return badge;
  };

  // Maximize Modal Overlay (Fullscreen view)
  if (isMaximized) {
    return (
      <div className="fixed inset-0 z-50 p-2 sm:p-4 md:p-6 bg-black/90 backdrop-blur-xl flex flex-col font-mono animate-in fade-in duration-200">
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex-1 flex flex-col overflow-hidden max-w-[1920px] w-full mx-auto">
          {/* Maximize Mode Header */}
          <div className="p-3.5 sm:px-5 border-b border-zinc-800/80 bg-zinc-900/80 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 overflow-hidden">
              {icon && (
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
                  {icon}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 truncate">
                  <span className="font-black text-sm sm:text-base tracking-wider text-zinc-100 uppercase truncate">
                    {title}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-bold shrink-0 hidden sm:inline">
                    EXPANDED VIEW
                  </span>
                  {renderBadge()}
                </div>
                {subtitle && (
                  <span className="text-[10px] text-zinc-500 font-mono truncate">
                    {subtitle}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {headerActions}

              {/* Minimize button */}
              <button
                type="button"
                onClick={toggleMaximize}
                className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 border border-zinc-700/80 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                title="Kembalikan ke ukuran normal (Esc)"
                aria-label="Minimize panel"
              >
                <Minimize2 className="w-4 h-4 text-cyan-400" />
                <span className="hidden md:inline text-[11px]">Normal (Esc)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsMaximized(false)}
                className="p-1.5 rounded-xl bg-zinc-900 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 border border-zinc-700/80 hover:border-rose-500/40 transition-all cursor-pointer"
                title="Tutup mode layar penuh"
                aria-label="Close fullscreen"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Fullscreen Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin scrollbar-thumb-zinc-800">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // Normal Inline Card View
  return (
    <div
      id={id}
      className={`bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 rounded-2xl shadow-xl font-mono overflow-hidden transition-all duration-300 flex flex-col ${className}`}
    >
      {/* Panel Header */}
      <div
        className={`p-3.5 sm:px-4 border-b border-zinc-800/80 flex items-center justify-between gap-3 bg-zinc-950/40 select-none ${headerClassName}`}
      >
        <div
          onClick={allowCollapse ? toggleCollapse : undefined}
          className={`flex items-center gap-2.5 flex-1 overflow-hidden ${
            allowCollapse ? 'cursor-pointer group' : ''
          }`}
        >
          {icon && (
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0 group-hover:scale-105 transition-transform">
              {icon}
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 truncate">
              <span className="font-black text-xs tracking-wider text-zinc-100 uppercase truncate group-hover:text-emerald-300 transition-colors">
                {title}
              </span>
              {renderBadge()}
            </div>
            {subtitle && (
              <span className="text-[10px] text-zinc-500 font-mono truncate">
                {subtitle}
              </span>
            )}
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {headerActions}

          {/* Maximize Button */}
          {allowMaximize && (
            <button
              type="button"
              onClick={toggleMaximize}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-cyan-300 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer"
              title="Perbesar Layar Penuh (Fullscreen)"
              aria-label="Perbesar Layar Penuh"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Collapse / Expand Toggle Arrow */}
          {allowCollapse && (
            <button
              type="button"
              onClick={toggleCollapse}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer"
              title={isCollapsed ? 'Buka panel' : 'Tutup panel'}
              aria-expanded={!isCollapsed}
              aria-label={isCollapsed ? 'Buka panel' : 'Tutup panel'}
            >
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-300 ${
                  isCollapsed ? '-rotate-90' : 'rotate-0'
                }`}
              />
            </button>
          )}
        </div>
      </div>

      {/* Panel Body (Collapsible) */}
      {!isCollapsed && (
        <div
          className={`p-3.5 sm:p-4 flex-1 animate-in fade-in slide-in-from-top-1 duration-200 ${bodyClassName}`}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default CollapsibleCard;
