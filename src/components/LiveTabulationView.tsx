import React, { useMemo, useState } from 'react';
import { Download, Search, SlidersHorizontal, Trophy } from 'lucide-react';
import {
  CategoryType,
  CompetitionItem,
  JudgeScore,
  Participant,
} from '../types';
import { ALLOWED_CATEGORIES, tabulateItemLeaderboard } from '../utils/scoring';

interface LiveTabulationViewProps {
  items: CompetitionItem[];
  participants: Participant[];
  scores: JudgeScore[];
  selectedItemId: string;
  onSelectItem: (itemId: string) => void;
  onJumpToJudgeScore: (itemId: string, participantId: string) => void;
  onJumpToAdmin: () => void;
}

export const LiveTabulationView: React.FC<LiveTabulationViewProps> = ({
  items,
  participants,
  scores,
  selectedItemId,
  onSelectItem,
  onJumpToJudgeScore,
  onJumpToAdmin,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'All' | CategoryType>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    if (categoryFilter === 'All') return items;
    return items.filter((it) => it.category === categoryFilter);
  }, [items, categoryFilter]);

  const activeItem = useMemo(() => {
    return (
      filteredItems.find((it) => it.id === selectedItemId) ??
      filteredItems[0] ??
      items[0] ??
      null
    );
  }, [filteredItems, items, selectedItemId]);

  const leaderboardRows = useMemo(() => {
    if (!activeItem) return [];
    return tabulateItemLeaderboard(activeItem.id, participants, scores);
  }, [activeItem, participants, scores]);

  const visibleRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return leaderboardRows;
    return leaderboardRows.filter(
      (r) =>
        r.participant.chestNo.toLowerCase().includes(q) ||
        r.participant.name.toLowerCase().includes(q) ||
        r.participant.school.toLowerCase().includes(q)
    );
  }, [leaderboardRows, searchQuery]);

  const podiumWinners = useMemo(() => {
    return leaderboardRows.filter(
      (r) => r.rank !== null && r.rank <= 3 && r.averageScore !== null
    );
  }, [leaderboardRows]);

  const handleDownloadCsv = () => {
    if (!activeItem) return;
    const headers = [
      'Rank',
      'Chest No',
      'Participant Name',
      'School',
      'Judge 1 (J1)',
      'Judge 2 (J2)',
      'Judge 3 (J3)',
      'Average Score',
      'Grade',
      'Grade Points',
    ];
    const lines = leaderboardRows.map((r) => [
      r.rankLabel,
      r.participant.chestNo,
      `"${r.participant.name.replace(/"/g, '""')}"`,
      `"${r.participant.school.replace(/"/g, '""')}"`,
      r.scoresByJudge.J1?.total ?? '',
      r.scoresByJudge.J2?.total ?? '',
      r.scoresByJudge.J3?.total ?? '',
      r.averageScore !== null ? r.averageScore.toFixed(2) : '',
      r.grade,
      r.gradePoints,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...lines.map((l) => l.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `${activeItem.name.toLowerCase().replace(/\s+/g, '-')}-tabulation.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!activeItem) {
    return (
      <section className="bg-white border border-stone-200 rounded-xl p-10 text-center space-y-4">
        <h2 className="text-xl font-bold text-stone-900">No Competition Items Configured</h2>
        <p className="text-sm text-stone-600 max-w-md mx-auto">
          Add your first competition item and participant chest numbers in the Admin Panel to begin real-time tabulation.
        </p>
        <button
          type="button"
          onClick={onJumpToAdmin}
          className="px-4 py-2 text-sm font-semibold text-white bg-amber-700 rounded-lg hover:bg-amber-800 transition-colors"
        >
          Open Admin Panel
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header & Filter Controls */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-stone-200">
        <div className="space-y-2">
          <div className="text-xs font-medium text-stone-500">
            <span>കേരള സ്കൂൾ കലോത്സവം</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>Real-Time Firestore Tabulation</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>{activeItem.stage}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-stone-900 font-display">
            {activeItem.name}{' '}
            {activeItem.malayalamName && (
              <span className="text-stone-600 font-normal">({activeItem.malayalamName})</span>
            )}
          </h1>
          <div className="text-sm text-stone-600">
            <span>Category: {activeItem.category}</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>Max Marks: {activeItem.maxMarks}</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>{leaderboardRows.length} Registered Chest Numbers</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Interactive Category Filter Buttons */}
          <div
            role="group"
            aria-label="Filter by competition category"
            className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg border border-stone-200"
          >
            {(['All', ...ALLOWED_CATEGORIES] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setCategoryFilter(cat);
                  const matching =
                    cat === 'All' ? items : items.filter((i) => i.category === cat);
                  if (matching.length > 0 && !matching.some((i) => i.id === activeItem.id)) {
                    onSelectItem(matching[0].id);
                  }
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  categoryFilter === cat
                    ? 'bg-white text-stone-900 shadow-xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-stone-800 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Download CSV
          </button>
        </div>
      </section>

      {/* Competition Item Switcher Bar */}
      <section aria-label="Select Competition Event" className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs font-semibold text-stone-600">
            Select Competition Event ({filteredItems.length})
          </span>
          <div className="relative w-full max-w-xs">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              aria-label="Search by chest number, participant, or school"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chest no, name, school..."
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {filteredItems.map((item) => {
            const isSelected = item.id === activeItem.id;
            const itemCount = participants.filter((p) => p.itemId === item.id).length;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectItem(item.id)}
                className={`px-4 py-2.5 rounded-lg border text-left transition-colors whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'bg-white text-stone-800 border-stone-200 hover:bg-stone-50'
                }`}
              >
                <div className="text-sm font-semibold">
                  {item.name} {item.malayalamName ? `· ${item.malayalamName}` : ''}
                </div>
                <div
                  className={`text-xs mt-0.5 ${
                    isSelected ? 'text-stone-300' : 'text-stone-500'
                  }`}
                >
                  {item.category} · {itemCount} contestants
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Top 3 Leaderboard Podium Strip */}
      {podiumWinners.length > 0 && (
        <section aria-label="Leading Podium" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {podiumWinners.slice(0, 3).map((row) => (
            <div
              key={row.participant.id}
              className="bg-white border border-stone-200 rounded-xl p-5 flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>{row.rankLabel} Place</span>
                    <span aria-hidden="true">·</span>
                    <span>Grade {row.grade}</span>
                    <span aria-hidden="true">·</span>
                    <span>{row.gradePoints} pts</span>
                  </div>
                  <h2 className="text-lg font-bold text-stone-900 mt-1">
                    {row.participant.name}
                  </h2>
                  <p className="text-xs text-stone-600 mt-0.5">{row.participant.school}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-stone-500">Chest No</div>
                  <div className="text-lg font-bold text-stone-900 font-mono tabular-nums">
                    #{row.participant.chestNo}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-baseline justify-between">
                <div className="text-xs text-stone-500 font-mono tabular-nums">
                  J1: {row.scoresByJudge.J1?.total ?? '—'} · J2:{' '}
                  {row.scoresByJudge.J2?.total ?? '—'} · J3:{' '}
                  {row.scoresByJudge.J3?.total ?? '—'}
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-stone-900 font-mono tabular-nums">
                    {row.averageScore?.toFixed(2)}
                  </span>
                  <span className="text-xs text-stone-500 ml-1">/ 100</span>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Main Real-Time Tabulation Table */}
      <section className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-stone-900">
              Official Tabulation Sheet — {activeItem.name}
            </h2>
            <p className="text-xs text-stone-500">
              Updates automatically via Firestore onSnapshot as judges submit or revise scores.
            </p>
          </div>
          <div className="text-xs text-stone-600 font-mono tabular-nums">
            Showing {visibleRows.length} of {leaderboardRows.length} participants
          </div>
        </div>

        {visibleRows.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm font-medium text-stone-700">
              No participants match your current filter.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="px-3.5 py-1.5 text-xs font-semibold text-stone-800 border border-stone-300 rounded-lg hover:bg-stone-50"
            >
              Reset Search
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-xs font-semibold text-stone-600">
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Chest No</th>
                  <th className="py-3 px-4">Participant & Institution</th>
                  <th className="py-3 px-4">Criterion Avg (25×4)</th>
                  <th className="py-3 px-4 text-right">Judge 1</th>
                  <th className="py-3 px-4 text-right">Judge 2</th>
                  <th className="py-3 px-4 text-right">Judge 3</th>
                  <th className="py-3 px-4 text-right">Average</th>
                  <th className="py-3 px-4 text-right">Grade</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-sm">
                {visibleRows.map((row) => {
                  const ca = row.criterionAverages;
                  return (
                    <tr
                      key={row.participant.id}
                      className="hover:bg-stone-50/80 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono tabular-nums font-bold text-stone-900 whitespace-nowrap">
                        {row.rankLabel}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums font-semibold text-stone-900 whitespace-nowrap">
                        #{row.participant.chestNo}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-stone-900">
                          {row.participant.name}
                        </div>
                        <div className="text-xs text-stone-500">{row.participant.school}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-stone-600 font-mono tabular-nums whitespace-nowrap">
                        {row.judgesCount > 0 ? (
                          <span>
                            R:{ca.rhythm} · E:{ca.expression} · P:{ca.perfection} · O:{ca.overall}
                          </span>
                        ) : (
                          <span className="text-stone-400">Awaiting judges</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-stone-700 whitespace-nowrap">
                        {row.scoresByJudge.J1 ? `${row.scoresByJudge.J1.total}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-stone-700 whitespace-nowrap">
                        {row.scoresByJudge.J2 ? `${row.scoresByJudge.J2.total}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-stone-700 whitespace-nowrap">
                        {row.scoresByJudge.J3 ? `${row.scoresByJudge.J3.total}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-stone-900 whitespace-nowrap">
                        {row.averageScore !== null ? row.averageScore.toFixed(2) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right text-xs font-medium text-stone-700 whitespace-nowrap">
                        {row.averageScore !== null
                          ? `${row.grade} · ${row.gradePoints} pts`
                          : 'Pending'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() =>
                            onJumpToJudgeScore(activeItem.id, row.participant.id)
                          }
                          aria-label={`Enter or edit score for Chest ${row.participant.chestNo} ${row.participant.name}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors"
                        >
                          <SlidersHorizontal className="w-3 h-3" />
                          Score
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
