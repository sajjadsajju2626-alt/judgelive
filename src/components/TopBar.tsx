import React from 'react';

export type ActiveTab = 'tabulation' | 'judge' | 'admin' | 'singlefile';

interface TopBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
}

export const TopBar: React.FC<TopBarProps> = ({ activeTab, onSelectTab }) => {
  return (
    <header className="flex items-center justify-between gap-2 md:gap-8 px-3 sm:px-8 py-3.5 bg-white border-b border-stone-200 sticky top-0 z-30">
      {/* Zone 1: Single text element wordmark */}
      <a
        href="#tabulation"
        onClick={(e) => {
          e.preventDefault();
          onSelectTab('tabulation');
        }}
        className="text-sm sm:text-lg font-bold tracking-tight text-stone-900 whitespace-nowrap shrink-0 font-display"
      >
        Kalolsavam Live
      </a>

      {/* Zone 2: 4 concise single-line text navigation links */}
      <nav
        aria-label="Primary Navigation"
        className="flex items-center gap-2.5 sm:gap-7 text-xs sm:text-sm font-medium text-stone-600"
      >
        <button
          type="button"
          onClick={() => onSelectTab('tabulation')}
          className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
            activeTab === 'tabulation'
              ? 'border-amber-700 text-stone-900 font-semibold'
              : 'border-transparent hover:text-stone-900'
          }`}
        >
          Tabulation
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('judge')}
          className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
            activeTab === 'judge'
              ? 'border-amber-700 text-stone-900 font-semibold'
              : 'border-transparent hover:text-stone-900'
          }`}
        >
          Judge Portal
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('admin')}
          className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
            activeTab === 'admin'
              ? 'border-amber-700 text-stone-900 font-semibold'
              : 'border-transparent hover:text-stone-900'
          }`}
        >
          Admin
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('singlefile')}
          className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
            activeTab === 'singlefile'
              ? 'border-amber-700 text-stone-900 font-semibold'
              : 'border-transparent hover:text-stone-900'
          }`}
        >
          HTML
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="hidden md:flex items-center gap-3 shrink-0">
        {activeTab === 'judge' ? (
          <button
            type="button"
            onClick={() => onSelectTab('tabulation')}
            className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors whitespace-nowrap shrink-0"
          >
            View Leaderboard
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSelectTab('judge')}
            className="px-4 py-2 text-xs font-semibold text-white bg-amber-700 rounded-lg hover:bg-amber-800 transition-colors whitespace-nowrap shrink-0"
          >
            Enter Judge Marks
          </button>
        )}
      </div>
    </header>
  );
};
