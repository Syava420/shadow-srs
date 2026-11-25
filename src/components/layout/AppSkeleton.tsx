import React from 'react';

export const AppSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-300">
      {/* Minimal Header Placeholder */}
      <header className="h-14 border-b border-white/[0.08] bg-[#09090b] px-4 sm:px-6 flex items-center justify-between">
        <div className="w-40 h-5 bg-zinc-900 rounded-lg animate-pulse" />
        <div className="flex items-center gap-2">
          <div className="w-28 h-7 rounded-lg bg-zinc-900 animate-pulse" />
          <div className="w-20 h-7 rounded-lg bg-zinc-900 animate-pulse hidden sm:block" />
          <div className="w-7 h-7 rounded-lg bg-zinc-900 animate-pulse" />
        </div>
      </header>

      {/* Focused Single-Column Main Placeholder */}
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
        <div className="p-5 sm:p-6 rounded-2xl bg-[#111216] border border-white/[0.08] space-y-4">
          <div className="flex justify-between items-center">
            <div className="w-48 h-5 bg-zinc-900 rounded-lg animate-pulse" />
            <div className="w-24 h-7 bg-zinc-900 rounded-lg animate-pulse" />
          </div>
          <div className="w-full h-11 rounded-xl bg-zinc-900 animate-pulse" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-8 rounded-xl bg-zinc-900/70 animate-pulse" />
            <div className="h-8 rounded-xl bg-zinc-900/70 animate-pulse" />
          </div>
        </div>

        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-14 rounded-xl bg-[#111216] border border-white/[0.06] animate-pulse"
            />
          ))}
        </div>
      </main>
    </div>
  );
};
