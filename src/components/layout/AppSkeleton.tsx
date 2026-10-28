import React from 'react';

export const AppSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-300 select-none">
      {/* Top Navigation Skeleton */}
      <header className="h-14 border-b border-zinc-800/80 bg-[#121215]/80 backdrop-blur-md px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-zinc-850 animate-pulse" />
          <div className="space-y-1.5">
            <div className="w-24 h-3.5 bg-zinc-800 rounded animate-pulse" />
            <div className="w-16 h-2 bg-zinc-850 rounded animate-pulse" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-24 h-7 rounded-xl bg-zinc-850 animate-pulse hidden sm:block" />
          <div className="w-28 h-7 rounded-xl bg-zinc-800 animate-pulse" />
          <div className="w-8 h-7 rounded-xl bg-zinc-850 animate-pulse" />
        </div>
      </header>

      {/* Main Content Skeleton */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Skeleton */}
        <aside className="w-64 border-r border-zinc-800/80 bg-[#121215]/40 p-4 space-y-4 hidden md:block shrink-0">
          <div className="flex justify-between items-center pb-2 border-b border-zinc-850">
            <div className="w-20 h-3 bg-zinc-800 rounded animate-pulse" />
            <div className="w-12 h-3 bg-zinc-850 rounded animate-pulse" />
          </div>
          <div className="space-y-2 pt-1">
            <div className="w-full h-8 rounded-xl bg-zinc-850/80 animate-pulse" />
            <div className="w-full h-8 rounded-xl bg-zinc-800/60 animate-pulse" />
            <div className="w-full h-8 rounded-xl bg-zinc-850/40 animate-pulse" />
          </div>
        </aside>

        {/* Right Main Deck View Skeleton */}
        <main className="flex-1 p-4 md:p-6 space-y-5 overflow-y-auto">
          {/* Deck Header Card Skeleton */}
          <div className="p-5 md:p-6 rounded-2xl bg-[#121215] border border-zinc-800/80 space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="w-48 h-5 bg-zinc-800 rounded-lg animate-pulse" />
                <div className="w-64 h-3 bg-zinc-850 rounded animate-pulse" />
              </div>
              <div className="w-20 h-7 rounded-xl bg-zinc-850 animate-pulse" />
            </div>

            {/* Big Study Button Skeleton */}
            <div className="w-full h-11 rounded-2xl bg-zinc-800/80 animate-pulse mt-3" />

            {/* Metrics Skeleton */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="h-8 rounded-xl bg-zinc-850/60 animate-pulse" />
              <div className="h-8 rounded-xl bg-zinc-850/60 animate-pulse" />
            </div>
          </div>

          {/* Cards List Skeleton */}
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <div className="w-32 h-4 bg-zinc-800 rounded animate-pulse" />
              <div className="w-48 h-7 bg-zinc-850 rounded-xl animate-pulse" />
            </div>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-14 rounded-2xl bg-[#121215]/80 border border-zinc-850/80 p-3 flex items-center justify-between animate-pulse"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg bg-zinc-850" />
                    <div className="space-y-1.5">
                      <div className="w-28 h-3.5 bg-zinc-800 rounded" />
                      <div className="w-20 h-2.5 bg-zinc-850 rounded" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-5 rounded-lg bg-zinc-850" />
                    <div className="w-6 h-6 rounded-lg bg-zinc-850" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
