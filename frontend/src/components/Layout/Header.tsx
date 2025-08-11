import React from 'react';

interface HeaderProps {
  currentPage?: { id: string; name: string; description?: string };
  setSidebarOpen?: (open: boolean) => void;
}

export default function Header({ currentPage }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/70 backdrop-blur border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        <h1 className="text-2xl font-semibold text-slate-800">{currentPage?.name || 'Dashboard'}</h1>
        {currentPage?.description && (
          <p className="text-slate-500 text-sm mt-1">{currentPage.description}</p>
        )}
      </div>
    </header>
  );
}