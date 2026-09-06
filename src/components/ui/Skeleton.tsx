'use client';

import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...props }) => {
  return (
    <div
      className={`animate-pulse rounded-xl bg-zinc-800/60 border border-zinc-700/30 ${className}`}
      {...props}
    />
  );
};

export const SkeletonText: React.FC<{ className?: string; lines?: number }> = ({ 
  className = 'h-3.5 w-24', 
  lines = 1 
}) => {
  if (lines === 1) {
    return <Skeleton className={className} />;
  }

  return (
    <div className="space-y-1.5 w-full">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={`h-3 ${i === lines - 1 ? 'w-3/4' : 'w-full'} ${className}`} 
        />
      ))}
    </div>
  );
};

export const DeskFeedSkeletonItem: React.FC = () => {
  return (
    <div className="p-3 rounded-xl border border-zinc-800/60 bg-zinc-950/40 space-y-2.5 animate-pulse font-mono">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="w-6 h-6 rounded-lg bg-zinc-800" />
          <Skeleton className="w-16 h-4 bg-zinc-800" />
          <Skeleton className="w-12 h-3.5 bg-zinc-800/80 rounded" />
        </div>
        <Skeleton className="w-16 h-4 bg-zinc-800/80 rounded-full" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="w-24 h-3 bg-zinc-800/60" />
        <Skeleton className="w-20 h-3 bg-zinc-800/60" />
        <Skeleton className="w-16 h-3 bg-zinc-800/60" />
      </div>
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="w-32 h-4 bg-zinc-800/50 rounded-lg" />
        <Skeleton className="w-20 h-4 bg-zinc-800/50 rounded-lg" />
      </div>
    </div>
  );
};

export const MetricCardSkeleton: React.FC = () => {
  return (
    <div className="p-3.5 rounded-2xl border border-zinc-800/70 bg-zinc-900/40 space-y-2 animate-pulse font-mono">
      <div className="flex items-center justify-between">
        <Skeleton className="w-20 h-3 bg-zinc-800" />
        <Skeleton className="w-6 h-6 rounded-lg bg-zinc-800/80" />
      </div>
      <Skeleton className="w-28 h-6 bg-zinc-700/80" />
      <Skeleton className="w-36 h-3 bg-zinc-800/60" />
    </div>
  );
};

export default Skeleton;
