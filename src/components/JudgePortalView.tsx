import React, { useEffect, useMemo, useState } from 'react';
import { Check, CheckCircle2, Minus, Plus, UserCheck } from 'lucide-react';
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
  formatChestDropdownLabel,
} from '../utils/scoring';

interface JudgePortalViewProps {
  items: CompetitionItem[];
  participants: Participant[];
  scores: JudgeScore[];
  selectedItemId: string;
  selectedParticipantId: string;
  isAdminMode: boolean;
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

const JUDGE_SESSION_STORAGE_KEY = 'kalolsavam_judge_session_v1';

const DEFAULT_JUDGE_NAMES: Record<JudgeSlot, string> = {
  J1: 'Kalamandalam Hymavathy',
  J2: 'Dr. Methil Devika',
  J3: 'Prof. V. P. Dhananjayan',
};

interface StoredJudgeSession {
  judgeSlot: JudgeSlot;
  judgeName: string;
  locked: boolean;
}

function loadJudgeSession(): StoredJudgeSession {
  try {
    const raw = localStorage.getItem(JUDGE_SESSION_STORAGE_KEY);
    if (!raw) {
      return {
        judgeSlot: 'J1',
        judgeName: DEFAULT_JUDGE_NAMES.J1,
        locked: true,
      };
    }
    const parsed = JSON.parse(raw) as Partial<StoredJudgeSession>;
    const slot: JudgeSlot =
      parsed.judgeSlot === 'J1' ||
      parsed.judgeSlot === 'J2' ||
      parsed.judgeSlot === 'J3'
        ? parsed.judgeSlot
        : 'J1';
    const name =
      typeof parsed.judgeName === 'string' && parsed.judgeName.trim().length > 0
        ? parsed.judgeName.trim()
        : DEFAULT_JUDGE_NAMES[slot];
    return {
      judgeSlot: slot,
      judgeName: name,
      locked: parsed.locked ?? true,
    };
  } catch {
    return {
      judgeSlot: 'J1',
      judgeName: DEFAULT_JUDGE_NAMES.J1,
      locked: true,
    };
  }
}

function saveJudgeSession(session: StoredJudgeSession): void {
  try {
    localStorage.setItem(JUDGE_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage quota errors
  }
}

export const JudgePortalView: React.FC<JudgePortalViewProps> = ({
  items,
  participants,
  scores,
  selectedItemId,
  selectedParticipantId,
  isAdminMode,
  onSelectItem,
  onSelectParticipant,
  onSubmitScore,
  onViewLeaderboard,
}) => {
  const initialSession = useMemo(() => loadJudgeSession(), []);
  const [judgeSlot, setJudgeSlot] = useState<JudgeSlot>(initialSession.judgeSlot);
  const [judgeName, setJudgeName] = useState<string>(initialSession.judgeName);
  const [isEditingJudge, setIsEditingJudge] = useState<boolean>(
    !initialSession.locked
  );

  const [entryMode, setEntryMode] = useState<'criteria' | 'total'>('criteria');

  const [rhythm, setRhythm] = useState<number>(0);
  const [expression, setExpression] = useState<number>(0);
  const [perfection, setPerfection] = useState<number>(0);
  const [overall, setOverall] = useState<number>(0);
  const [directTotal, setDirectTotal] = useState<number>(0);
  const [remarks, setRemarks] = useState<string>('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Persist judge session to localStorage whenever slot, name, or editing state changes
  useEffect(() => {
    if (judgeName.trim().length > 0) {
      saveJudgeSession({
        judgeSlot,
        judgeName: judgeName.trim(),
        locked: !isEditingJudge,
      });
    }
  }, [judgeSlot, judgeName, isEditingJudge]);

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

  // Load existing score if participant was already scored by this judge, or reset to 0 for unscored participant
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
    } else {
      setRhythm(0);
      setExpression(0);
      setPerfection(0);
      setOverall(0);
      setDirectTotal(0);
      setRemarks('');
    }
    setErrorMessage(null);
  }, [activeItem?.id, activeParticipant?.id, judgeSlot, scores]);

  const computedTotal = useMemo(() => {
    return calculateCriterionTotal(rhythm, expression, perfection, overall);
  }, [rhythm, expression, perfection, overall]);

  const computedGradeInfo = useMemo(() => {
    return calculateGrade(computedTotal);
  }, [computedTotal]);

  const handleJudgeSlotChange = (slot: JudgeSlot) => {
    setJudgeSlot(slot);
    if (
      !judgeName.trim() ||
      Object.values(DEFAULT_JUDGE_NAMES).includes(judgeName.trim())
    ) {
      setJudgeName(DEFAULT_JUDGE_NAMES[slot]);
    }
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

  const resetScoreFields = () => {
    setRhythm(0);
    setExpression(0);
    setPerfection(0);
    setOverall(0);
    setDirectTotal(0);
    setRemarks('');
  };

  const showSyncToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  };

  const handleSaveScore = async () => {
    if (!activeItem || !activeParticipant) return;
    setErrorMessage(null);

    const result = await onSubmitScore({
      itemId: activeItem.id,
      participantId: activeParticipant.id,
      chestNo: activeParticipant.chestNo,
      judgeSlot,
      judgeName: judgeName.trim() || DEFAULT_JUDGE_NAMES[judgeSlot],
      rhythm,
      expression,
      perfection,
      overall,
      remarks,
    });

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    // Lock judge session in localStorage upon score submission
    setIsEditingJudge(false);
    saveJudgeSession({
      judgeSlot,
      judgeName: judgeName.trim() || DEFAULT_JUDGE_NAMES[judgeSlot],
      locked: true,
    });

    // Show non-intrusive toast notification
    showSyncToast('Marks Synced to Cloud!');

    // Reset score input fields and advance to the next unscored participant (or next in list)
    resetScoreFields();

    if (itemParticipants.length > 1) {
      const currentIdx = itemParticipants.findIndex(
        (p) => p.id === activeParticipant.id
      );
      const nextUnscored =
        itemParticipants.find(
          (p, idx) =>
            idx > currentIdx &&
            !scores.some(
              (s) =>
                s.itemId === activeItem.id &&
                s.participantId === p.id &&
                s.judgeSlot === judgeSlot
            )
        ) ??
        itemParticipants.find(
          (p) =>
            p.id !== activeParticipant.id &&
            !scores.some(
              (s) =>
                s.itemId === activeItem.id &&
                s.participantId === p.id &&
                s.judgeSlot === judgeSlot
            )
        ) ??
        itemParticipants[(currentIdx + 1) % itemParticipants.length];

      if (nextUnscored && nextUnscored.id !== activeParticipant.id) {
        onSelectParticipant(nextUnscored.id);
      }
    }
  };

  if (!activeItem) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-8 text-center">
        <p className="text-sm text-stone-600">
          No competition items available.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative">
      {/* Non-Intrusive Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          data-testid="sync-toast"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-stone-900 text-white shadow-lg border border-stone-700 text-sm font-semibold"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Persistent Judge Identity Bar */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-stone-200">
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-stone-500">
            <span>കലോത്സവം ഡിജിറ്റൽ ജഡ്ജിങ് പോർട്ടൽ</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>Offline-Ready Auto-Sync</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 font-display">
            Judge Scoring Portal
          </h1>
          <p className="text-sm text-stone-600">
            Select your competition event and chest number to submit criterion-wise or total marks.
          </p>
        </div>

        {/* Persistent Judge Session Card / Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {!isEditingJudge ? (
            <div className="flex items-center gap-3 px-4 py-2 bg-white border border-stone-200 rounded-lg">
              <UserCheck className="w-4 h-4 text-amber-700 shrink-0" />
              <div className="text-xs">
                <span className="text-stone-500">Active Judge: </span>
                <span className="font-bold text-stone-900">
                  {judgeSlot} — {judgeName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingJudge(true)}
                className="ml-2 px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors whitespace-nowrap shrink-0"
              >
                Change Judge
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 p-2 bg-white border border-stone-200 rounded-lg">
              <label htmlFor="judge-slot-select" className="sr-only">
                Judge Panel Slot
              </label>
              <select
                id="judge-slot-select"
                aria-label="Judge Panel Slot"
                value={judgeSlot}
                onChange={(e) => handleJudgeSlotChange(e.target.value as JudgeSlot)}
                className="px-2.5 py-1.5 text-xs font-semibold bg-stone-50 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-600"
              >
                {ALLOWED_JUDGE_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot} — Judge {slot.slice(1)}
                  </option>
                ))}
              </select>

              <label htmlFor="judge-name-input" className="sr-only">
                Judge Name
              </label>
              <input
                id="judge-name-input"
                type="text"
                aria-label="Judge Name"
                value={judgeName}
                onChange={(e) => setJudgeName(e.target.value)}
                placeholder="Enter Judge Name"
                className="px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-600"
              />

              <button
                type="button"
                onClick={() => {
                  if (!judgeName.trim()) {
                    setJudgeName(DEFAULT_JUDGE_NAMES[judgeSlot]);
                  }
                  setIsEditingJudge(false);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-stone-900 rounded-md hover:bg-stone-800 transition-colors whitespace-nowrap shrink-0"
              >
                Save Judge
              </button>
            </div>
          )}

          {isAdminMode && (
            <button
              type="button"
              onClick={onViewLeaderboard}
              className="px-3.5 py-2 text-xs font-semibold text-stone-800 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors whitespace-nowrap shrink-0"
            >
              View Live Tabulation
            </button>
          )}
        </div>
      </section>

      {/* Main 2-Column Judging Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Event & Chest Number Dropdown + Roster (4 cols) */}
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
              htmlFor="judge-chest-select"
              className="block text-xs font-semibold text-stone-700 mb-1.5"
            >
              2. Chest Number Dropdown ({judgeSlot} Status)
            </label>
            <select
              id="judge-chest-select"
              value={activeParticipant?.id ?? ''}
              onChange={(e) => onSelectParticipant(e.target.value)}
              className="w-full px-3 py-2.5 text-sm font-medium bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
            >
              {itemParticipants.map((part) => {
                const isScored = scores.some(
                  (s) =>
                    s.itemId === activeItem.id &&
                    s.participantId === part.id &&
                    s.judgeSlot === judgeSlot
                );
                return (
                  <option key={part.id} value={part.id}>
                    {formatChestDropdownLabel(part, isScored)}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="pt-4 border-t border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-700">
                Contestant Queue
              </span>
              <span className="text-xs text-stone-500 font-mono tabular-nums">
                {
                  itemParticipants.filter((p) =>
                    scores.some(
                      (s) =>
                        s.itemId === activeItem.id &&
                        s.participantId === p.id &&
                        s.judgeSlot === judgeSlot
                    )
                  ).length
                }{' '}
                / {itemParticipants.length} scored
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
                            Chest {part.chestNo}
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
                            Scored ✓ ({existingScore.total})
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
              Select a participant chest number to enter marks.
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSaveScore();
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
                    <span>
                      {judgeSlot} ({judgeName})
                    </span>
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
                    onClick={resetScoreFields}
                    className="px-4 py-2.5 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors whitespace-nowrap shrink-0"
                  >
                    Reset Fields
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

              {errorMessage && (
                <div
                  role="alert"
                  className="p-3.5 rounded-lg border bg-red-50 border-red-200 text-xs font-medium text-red-900"
                >
                  {errorMessage}
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
