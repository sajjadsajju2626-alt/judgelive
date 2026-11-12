import React from 'react';

export type ActiveTab = 'judge' | 'tabulation' | 'admin' | 'singlefile';

interface TopBarProps {
  activeTab: ActiveTab;
  isAdminMode: boolean;
  onSelectTab: (tab: ActiveTab) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  isAdminMode,
  onSelectTab,
}) => {
  return (
    <header className="flex items-center justify-between gap-2 md:gap-8 px-3 sm:px-8 py-3.5 bg-white border-b border-stone-200 sticky top-0 z-30">
      {/* Zone 1: Single text element wordmark */}
      <a
        href={isAdminMode ? '?admin=true' : '#judge'}
        onClick={(e) => {
          e.preventDefault();
          onSelectTab('judge');
        }}
        className="text-sm sm:text-lg font-bold tracking-tight text-stone-900 whitespace-nowrap shrink-0 font-display"
      >
        Kalolsavam Live
      </a>

      {/* Zone 2: Navigation links (Judge-only by default; full navigation when ?admin=true) */}
      <nav
        aria-label="Primary Navigation"
        className="flex items-center gap-2.5 sm:gap-7 text-xs sm:text-sm font-medium text-stone-600"
      >
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

        {isAdminMode && (
          <>
            <button
              type="button"
              onClick={() => onSelectTab('tabulation')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                activeTab === 'tabulation'
                  ? 'border-amber-700 text-stone-900 font-semibold'
                  : 'border-transparent hover:text-stone-900'
              }`}
            >
              Live Tabulation
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
              Admin Panel
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
          </>
        )}
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="hidden md:flex items-center gap-3 shrink-0">
        {isAdminMode ? (
          activeTab === 'judge' ? (
            <button
              type="button"
              onClick={() => onSelectTab('tabulation')}
              className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors whitespace-nowrap shrink-0"
            >
              View Live Tabulation
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSelectTab('judge')}
              className="px-4 py-2 text-xs font-semibold text-white bg-amber-700 rounded-lg hover:bg-amber-800 transition-colors whitespace-nowrap shrink-0"
            >
              Judge Scoring Portal
            </button>
          )
        ) : (
          <span className="text-xs font-medium text-stone-500 whitespace-nowrap shrink-0">
            Judge Scoring Terminal
          </span>
        )}
      </div>
    </header>
  );
};
