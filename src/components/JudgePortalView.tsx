import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight, Minus, Plus } from 'lucide-react';
import {
  CompetitionItem,
  JudgeScore,
  JudgeSlot,
  Participant,
} from '../types';
import {
  ALLOWED_JUDGE_SLOTS,
  calculateCriterionTotal,
  calculateGrade,
  clampCriterion,
  distributeTotalToCriteria,
} from '../utils/scoring';

interface JudgePortalViewProps {
  items: CompetitionItem[];
  participants: Participant[];
  scores: JudgeScore[];
  selectedItemId: string;
  selectedParticipantId: string;
  onSelectItem: (itemId: string) => void;
  onSelectParticipant: (participantId: string) => void;
  onSubmitScore: (input: {
    itemId: string;
    participantId: string;
    chestNo: string;
    judgeSlot: JudgeSlot;
    judgeName: string;
    rhythm: number;
    expression: number;
    perfection: number;
    overall: number;
    remarks: string;
  }) => Promise<{ ok: true; score: JudgeScore } | { ok: false; error: string }>;
  onViewLeaderboard: () => void;
}

const DEFAULT_JUDGE_NAMES: Record<JudgeSlot, string> = {
  J1: 'Kalamandalam Hymavathy',
  J2: 'Dr. Methil Devika',
  J3: 'Prof. V. P. Dhananjayan',
};

export const JudgePortalView: React.FC<JudgePortalViewProps> = ({
  items,
  participants,
  scores,
  selectedItemId,
  selectedParticipantId,
  onSelectItem,
  onSelectParticipant,
  onSubmitScore,
  onViewLeaderboard,
}) => {
  const [judgeSlot, setJudgeSlot] = useState<JudgeSlot>('J1');
  const [judgeName, setJudgeName] = useState<string>(DEFAULT_JUDGE_NAMES.J1);
  const [entryMode, setEntryMode] = useState<'criteria' | 'total'>('criteria');

  const [rhythm, setRhythm] = useState<number>(23);
  const [expression, setExpression] = useState<number>(23);
  const [perfection, setPerfection] = useState<number>(22);
  const [overall, setOverall] = useState<number>(22);
  const [directTotal, setDirectTotal] = useState<number>(90);
  const [remarks, setRemarks] = useState<string>('');

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const activeItem = useMemo(() => {
    return items.find((i) => i.id === selectedItemId) ?? items[0] ?? null;
  }, [items, selectedItemId]);

  const itemParticipants = useMemo(() => {
    if (!activeItem) return [];
    return participants
      .filter((p) => p.itemId === activeItem.id)
      .sort((a, b) =>
        a.chestNo.localeCompare(b.chestNo, undefined, { numeric: true })
      );
  }, [activeItem, participants]);

  const activeParticipant = useMemo(() => {
    return (
      itemParticipants.find((p) => p.id === selectedParticipantId) ??
      itemParticipants[0] ??
      null
    );
  }, [itemParticipants, selectedParticipantId]);

  // Load existing score when item, participant, or judgeSlot changes
  useEffect(() => {
    if (!activeItem || !activeParticipant) return;
    const existing = scores.find(
      (s) =>
        s.itemId === activeItem.id &&
        s.participantId === activeParticipant.id &&
        s.judgeSlot === judgeSlot
    );
    if (existing) {
      setRhythm(existing.rhythm);
      setExpression(existing.expression);
      setPerfection(existing.perfection);
      setOverall(existing.overall);
      setDirectTotal(existing.total);
      setRemarks(existing.remarks);
      if (existing.judgeName) {
        setJudgeName(existing.judgeName);
      }
    } else {
      setRhythm(23);
      setExpression(23);
      setPerfection(22);
      setOverall(22);
      setDirectTotal(90);
      setRemarks('');
    }
    setFeedback(null);
  }, [activeItem?.id, activeParticipant?.id, judgeSlot, scores]);

  const computedTotal = useMemo(() => {
    return calculateCriterionTotal(rhythm, expression, perfection, overall);
  }, [rhythm, expression, perfection, overall]);

  const computedGradeInfo = useMemo(() => {
    return calculateGrade(computedTotal);
  }, [computedTotal]);

  const handleJudgeSlotChange = (slot: JudgeSlot) => {
    setJudgeSlot(slot);
    setJudgeName(DEFAULT_JUDGE_NAMES[slot]);
  };

  const handleDirectTotalChange = (val: number) => {
    const distributed = distributeTotalToCriteria(val);
    setDirectTotal(distributed.total);
    setRhythm(distributed.rhythm);
    setExpression(distributed.expression);
    setPerfection(distributed.perfection);
    setOverall(distributed.overall);
  };

  const handleCriterionChange = (
    setter: React.Dispatch<React.SetStateAction<number>>,
    newVal: number
  ) => {
    const clamped = clampCriterion(newVal);
    setter(clamped);
  };

  const handleSaveScore = async (advanceToNext: boolean) => {
    if (!activeItem || !activeParticipant) return;
    setFeedback(null);

    const result = await onSubmitScore({
      itemId: activeItem.id,
      participantId: activeParticipant.id,
      chestNo: activeParticipant.chestNo,
      judgeSlot,
      judgeName,
      rhythm,
      expression,
      perfection,
      overall,
      remarks,
    });

    if (!result.ok) {
      setFeedback({ type: 'error', message: result.error });
      return;
    }

    setFeedback({
      type: 'success',
      message: `Saved ${result.score.total}/100 for Chest #${activeParticipant.chestNo} (${judgeSlot}). Tabulation updated in real time.`,
    });

    if (advanceToNext && itemParticipants.length > 1) {
      const idx = itemParticipants.findIndex((p) => p.id === activeParticipant.id);
      const nextParticipant = itemParticipants[(idx + 1) % itemParticipants.length];
      if (nextParticipant) {
        onSelectParticipant(nextParticipant.id);
      }
    }
  };

  if (!activeItem) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-8 text-center">
        <p className="text-sm text-stone-600">
          No competition items available. Please add an item in the Admin Panel first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header & Judge Identity Bar */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-stone-200">
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-stone-500">
            <span>കലോത്സവം ഡിജിറ്റൽ ജഡ്ജിങ് പോർട്ടൽ</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>Offline-Ready Auto-Sync</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 font-display">
            Judge Evaluation Sheet
          </h1>
          <p className="text-sm text-stone-600">
            Select your judge seat, pick a chest number, and input criterion-wise or total marks.
          </p>
        </div>

        {/* Judge Seat Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label="Select Judge Panel Slot"
            className="flex items-center gap-1 p-1 bg-stone-100 border border-stone-200 rounded-lg"
          >
            {ALLOWED_JUDGE_SLOTS.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => handleJudgeSlotChange(slot)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  judgeSlot === slot
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-700 hover:text-stone-900'
                }`}
              >
                {slot} — Judge {slot.slice(1)}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onViewLeaderboard}
            className="px-3.5 py-2 text-xs font-semibold text-stone-800 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors whitespace-nowrap shrink-0"
          >
            View Live Leaderboard
          </button>
        </div>
      </section>

      {/* Main 2-Column Judging Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Event & Chest Number Roster (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-stone-200 rounded-xl p-5 space-y-5">
          <div>
            <label
              htmlFor="judge-event-select"
              className="block text-xs font-semibold text-stone-700 mb-1.5"
            >
              1. Competition Event
            </label>
            <select
              id="judge-event-select"
              value={activeItem.id}
              onChange={(e) => onSelectItem(e.target.value)}
              className="w-full px-3 py-2.5 text-sm font-medium bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
            >
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.name} ({it.category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="judge-name-input"
              className="block text-xs font-semibold text-stone-700 mb-1.5"
            >
              2. Adjudicator / Judge Name ({judgeSlot})
            </label>
            <input
              id="judge-name-input"
              type="text"
              value={judgeName}
              onChange={(e) => setJudgeName(e.target.value)}
              placeholder="Enter Judge Name"
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
          </div>

          <div className="pt-4 border-t border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-700">
                3. Select Contestant Chest No
              </span>
              <span className="text-xs text-stone-500 font-mono tabular-nums">
                {itemParticipants.length} registered
              </span>
            </div>

            {itemParticipants.length === 0 ? (
              <p className="text-xs text-stone-500 py-4">
                No participants registered for this item yet.
              </p>
            ) : (
              <div className="divide-y divide-stone-200 -mx-5 border-t border-b border-stone-200">
                {itemParticipants.map((part) => {
                  const isCurrent = activeParticipant?.id === part.id;
                  const existingScore = scores.find(
                    (s) =>
                      s.itemId === activeItem.id &&
                      s.participantId === part.id &&
                      s.judgeSlot === judgeSlot
                  );

                  return (
                    <button
                      key={part.id}
                      type="button"
                      onClick={() => onSelectParticipant(part.id)}
                      className={`w-full px-5 py-3 text-left transition-colors flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-amber-50/90 text-stone-900'
                          : 'bg-white hover:bg-stone-50 text-stone-800'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono tabular-nums font-bold text-sm text-stone-900">
                            #{part.chestNo}
                          </span>
                          <span className="text-sm font-semibold truncate">
                            {part.name}
                          </span>
                        </div>
                        <div className="text-xs text-stone-500 truncate mt-0.5">
                          {part.school}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {existingScore ? (
                          <div className="font-mono tabular-nums text-xs font-bold text-emerald-700">
                            {existingScore.total}/100
                          </div>
                        ) : (
                          <div className="text-xs text-stone-400">Pending</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Criterion-wise & Total Score Sheet (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-stone-200 rounded-xl p-6 space-y-6">
          {!activeParticipant ? (
            <div className="py-12 text-center text-sm text-stone-500">
              Select or register a participant chest number to enter marks.
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSaveScore(false);
              }}
              className="space-y-6"
            >
              {/* Active Contestant Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-stone-200">
                <div>
                  <div className="text-xs text-stone-500">
                    <span>{activeItem.name}</span>
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    <span>{activeItem.category}</span>
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    <span>Judging as {judgeSlot}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-stone-900 mt-1 font-display">
                    Chest #{activeParticipant.chestNo} — {activeParticipant.name}
                  </h2>
                  <p className="text-xs text-stone-600 mt-0.5">
                    {activeParticipant.school}
                  </p>
                </div>

                {/* Mode Switcher: Criteria vs Quick Total */}
                <div
                  role="group"
                  aria-label="Scoring Mode"
                  className="flex items-center gap-1 p-1 bg-stone-100 border border-stone-200 rounded-lg self-start"
                >
                  <button
                    type="button"
                    onClick={() => setEntryMode('criteria')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      entryMode === 'criteria'
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Criterion-Wise (4×25)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDirectTotal(computedTotal);
                      setEntryMode('total');
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      entryMode === 'total'
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Direct Total (0–100)
                  </button>
                </div>
              </div>

              {entryMode === 'total' && (
                <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <label
                        htmlFor="direct-total-input"
                        className="block text-sm font-bold text-stone-900"
                      >
                        Direct Total Marks (Out of 100)
                      </label>
                      <p className="text-xs text-stone-500">
                        Automatically distributes marks proportionally across the 4 official Kalolsavam criteria.
                      </p>
                    </div>
                    <input
                      id="direct-total-input"
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={directTotal}
                      onChange={(e) => handleDirectTotalChange(Number(e.target.value))}
                      className="w-28 px-3 py-2 text-lg font-bold font-mono tabular-nums text-right bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                    />
                  </div>
                </div>
              )}

              {/* 4 Criterion Scoring Rows */}
              <div className="space-y-5">
                {[
                  {
                    id: 'rhythm',
                    label: '1. Rhythm & Tempo (താളം / ലയം)',
                    desc: 'Precision in beat alignment, tempo consistency, and rhythmic control.',
                    value: rhythm,
                    setter: setRhythm,
                  },
                  {
                    id: 'expression',
                    label: '2. Expression & Bhavam (ഭാവം / അഭിനയം)',
                    desc: 'Emotional depth, facial mudras, lyrical clarity, and expressive nuance.',
                    value: expression,
                    setter: setExpression,
                  },
                  {
                    id: 'perfection',
                    label: '3. Technique & Perfection (പൂർണ്ണത / ശുദ്ധി)',
                    desc: 'Classical form fidelity, posture, pitch accuracy, and structural discipline.',
                    value: perfection,
                    setter: setPerfection,
                  },
                  {
                    id: 'overall',
                    label: '4. Overall Presentation (സമഗ്ര അവതരണം)',
                    desc: 'Stage presence, attire authenticity, confidence, and overall artistic impact.',
                    value: overall,
                    setter: setOverall,
                  },
                ].map((criterion) => (
                  <div
                    key={criterion.id}
                    className="pb-4 border-b border-stone-100 last:border-b-0 space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <label
                          htmlFor={`input-${criterion.id}`}
                          className="text-sm font-semibold text-stone-900"
                        >
                          {criterion.label}
                        </label>
                        <p className="text-xs text-stone-500">{criterion.desc}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          aria-label={`Decrease ${criterion.label} by 1`}
                          onClick={() =>
                            handleCriterionChange(criterion.setter, criterion.value - 1)
                          }
                          className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-stone-300 bg-white hover:bg-stone-50 text-stone-700"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          id={`input-${criterion.id}`}
                          type="number"
                          min={0}
                          max={25}
                          step={0.5}
                          value={criterion.value}
                          onChange={(e) =>
                            handleCriterionChange(
                              criterion.setter,
                              Number(e.target.value)
                            )
                          }
                          className="w-20 px-2.5 py-1.5 text-center text-sm font-bold font-mono tabular-nums bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-600"
                        />
                        <button
                          type="button"
                          aria-label={`Increase ${criterion.label} by 1`}
                          onClick={() =>
                            handleCriterionChange(criterion.setter, criterion.value + 1)
                          }
                          className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-stone-300 bg-white hover:bg-stone-50 text-stone-700"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs text-stone-500 font-mono tabular-nums w-8">
                          / 25
                        </span>
                      </div>
                    </div>

                    <input
                      type="range"
                      aria-label={`${criterion.label} slider`}
                      min={0}
                      max={25}
                      step={0.5}
                      value={criterion.value}
                      onChange={(e) =>
                        handleCriterionChange(criterion.setter, Number(e.target.value))
                      }
                      className="w-full accent-amber-700 cursor-pointer"
                    />
                  </div>
                ))}
              </div>

              {/* Judge Remarks */}
              <div className="pt-2">
                <label
                  htmlFor="judge-remarks-input"
                  className="block text-xs font-semibold text-stone-700 mb-1.5"
                >
                  Judge Evaluation Remarks (Optional)
                </label>
                <input
                  id="judge-remarks-input"
                  type="text"
                  maxLength={300}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Crisp adavus, expressive abhinaya, and steady thalam."
                  className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>

              {/* Live Total & Action Bar */}
              <div className="pt-5 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-stone-500">
                    Calculated Total Score ({judgeSlot})
                  </div>
                  <div className="flex items-baseline gap-3 mt-0.5">
                    <span
                      data-testid="judge-computed-total"
                      className="text-3xl font-bold text-stone-900 font-mono tabular-nums"
                    >
                      {computedTotal}
                    </span>
                    <span className="text-sm text-stone-500 font-mono tabular-nums">
                      / 100
                    </span>
                    <span className="text-xs font-semibold text-amber-800">
                      · Grade {computedGradeInfo.grade} ({computedGradeInfo.gradePoints} pts)
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void handleSaveScore(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-stone-800 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors whitespace-nowrap shrink-0"
                  >
                    Save & Next Chest No
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-amber-700 rounded-lg hover:bg-amber-800 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Check className="w-4 h-4" />
                    Submit & Sync Marks
                  </button>
                </div>
              </div>

              {feedback && (
                <div
                  role="status"
                  className={`p-3.5 rounded-lg border text-xs font-medium ${
                    feedback.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}
                >
                  {feedback.message}
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
