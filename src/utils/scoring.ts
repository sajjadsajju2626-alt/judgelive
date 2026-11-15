import {
  CategoryType,
  CompetitionItem,
  JudgeScore,
  JudgeSlot,
  KalolsavamGrade,
  Participant,
  TabulatedParticipant,
} from '../types';

export const ALLOWED_CATEGORIES: CategoryType[] = [
  'High School',
  'Higher Secondary',
  'Junior',
  'Senior',
  'Sub-Junior',
  'HS',
  'HSS',
  'General',
];

export function normalizeItemCategory(raw: string | undefined | null): string {
  const cleaned = String(raw ?? '').trim().replace(/\s+/g, ' ');
  if (!cleaned) return 'General';
  const val = cleaned.toLowerCase();
  if (val === 'junior') return 'Junior';
  if (val === 'senior') return 'Senior';
  if (val === 'sub-junior' || val === 'sub junior' || val === 'subjunior' || val === 'sj') {
    return 'Sub-Junior';
  }
  if (val === 'hs') return 'HS';
  if (val === 'hss') return 'HSS';
  if (val === 'high school') return 'High School';
  if (val === 'higher secondary') return 'Higher Secondary';
  if (val === 'general') return 'General';
  return cleaned
    .toLowerCase()
    .replace(/(^|[\s\-_/(&.])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase())
    .slice(0, 60);
}

export const ALLOWED_JUDGE_SLOTS: JudgeSlot[] = ['J1', 'J2', 'J3'];

const ID_REGEX = /^[a-zA-Z0-9_\-]+$/;
const CHEST_NO_REGEX = /^[A-Z0-9\-]+$/;

export function clampCriterion(val: number): number {
  if (Number.isNaN(val) || !Number.isFinite(val)) return 0;
  return Math.max(0, Math.min(25, Math.round(val * 10) / 10));
}

export function calculateCriterionTotal(
  rhythm: number,
  expression: number,
  perfection: number,
  overall: number
): number {
  const r = clampCriterion(rhythm);
  const e = clampCriterion(expression);
  const p = clampCriterion(perfection);
  const o = clampCriterion(overall);
  return Math.round((r + e + p + o) * 10) / 10;
}

/**
 * Distributes a total score (0..100) into 4 integer/half-point criteria (0..25 each)
 * such that rhythm + expression + perfection + overall === clampedTotal.
 */
export function distributeTotalToCriteria(totalInput: number): {
  rhythm: number;
  expression: number;
  perfection: number;
  overall: number;
  total: number;
} {
  const clamped = Math.max(0, Math.min(100, Math.round(Number(totalInput) || 0)));
  const base = Math.floor(clamped / 4);
  const remainder = clamped - base * 4;
  return {
    rhythm: base + (remainder >= 1 ? 1 : 0),
    expression: base + (remainder >= 2 ? 1 : 0),
    perfection: base + (remainder >= 3 ? 1 : 0),
    overall: base,
    total: clamped,
  };
}

/**
 * Computes Kerala Kalolsavam Grade and Grade Points from an average score (out of 100).
 * A Grade: >= 80% (5 pts)
 * B Grade: 70% - 79.99% (3 pts)
 * C Grade: 60% - 69.99% (1 pt)
 * Below 60%: No Grade (0 pts)
 */
export function calculateGrade(averageScore: number | null): {
  grade: KalolsavamGrade;
  gradePoints: number;
} {
  if (averageScore === null || Number.isNaN(averageScore)) {
    return { grade: 'No Grade', gradePoints: 0 };
  }
  if (averageScore >= 80) {
    return { grade: 'A', gradePoints: 5 };
  }
  if (averageScore >= 70) {
    return { grade: 'B', gradePoints: 3 };
  }
  if (averageScore >= 60) {
    return { grade: 'C', gradePoints: 1 };
  }
  return { grade: 'No Grade', gradePoints: 0 };
}

export function formatOrdinalRank(rank: number | null): string {
  if (rank === null) return 'Pending';
  if (rank === 1) return '1st';
  if (rank === 2) return '2nd';
  if (rank === 3) return '3rd';
  return `${rank}th`;
}

/**
 * Tabulates all participants for a specific competition item, calculating average scores
 * across J1, J2, J3 and assigning standard competition ranks (1st, 2nd, 3rd) with tie handling.
 */
export function tabulateItemLeaderboard(
  itemId: string,
  participants: Participant[],
  scores: JudgeScore[]
): TabulatedParticipant[] {
  const itemParticipants = participants.filter((p) => p.itemId === itemId);
  const itemScores = scores.filter((s) => s.itemId === itemId);

  const rawRows: TabulatedParticipant[] = itemParticipants.map((participant) => {
    const pScores = itemScores.filter((s) => s.participantId === participant.id);
    const scoresByJudge: TabulatedParticipant['scoresByJudge'] = {};
    for (const s of pScores) {
      if (s.judgeSlot === 'J1' || s.judgeSlot === 'J2' || s.judgeSlot === 'J3') {
        scoresByJudge[s.judgeSlot] = s;
      }
    }

    const activeScores = Object.values(scoresByJudge).filter(
      (s): s is JudgeScore => Boolean(s)
    );
    const judgesCount = activeScores.length;

    let averageScore: number | null = null;
    let criterionAverages: TabulatedParticipant['criterionAverages'] = {
      rhythm: null,
      expression: null,
      perfection: null,
      overall: null,
    };

    if (judgesCount > 0) {
      const sumTotal = activeScores.reduce((acc, s) => acc + s.total, 0);
      averageScore = Math.round((sumTotal / judgesCount) * 100) / 100;

      criterionAverages = {
        rhythm:
          Math.round(
            (activeScores.reduce((acc, s) => acc + s.rhythm, 0) / judgesCount) * 10
          ) / 10,
        expression:
          Math.round(
            (activeScores.reduce((acc, s) => acc + s.expression, 0) / judgesCount) * 10
          ) / 10,
        perfection:
          Math.round(
            (activeScores.reduce((acc, s) => acc + s.perfection, 0) / judgesCount) * 10
          ) / 10,
        overall:
          Math.round(
            (activeScores.reduce((acc, s) => acc + s.overall, 0) / judgesCount) * 10
          ) / 10,
      };
    }

    const { grade, gradePoints } = calculateGrade(averageScore);

    return {
      participant,
      scoresByJudge,
      judgesCount,
      averageScore,
      criterionAverages,
      grade,
      gradePoints,
      rank: null,
      rankLabel: 'Pending',
    };
  });

  // Sort scored participants descending by averageScore, then by chestNo ascending
  const scoredRows = rawRows
    .filter((r) => r.averageScore !== null)
    .sort((a, b) => {
      const diff = (b.averageScore ?? 0) - (a.averageScore ?? 0);
      if (Math.abs(diff) > 0.001) return diff;
      return a.participant.chestNo.localeCompare(b.participant.chestNo, undefined, {
        numeric: true,
      });
    });

  const unscoredRows = rawRows
    .filter((r) => r.averageScore === null)
    .sort((a, b) =>
      a.participant.chestNo.localeCompare(b.participant.chestNo, undefined, {
        numeric: true,
      })
    );

  // Standard competition ranking ("1224" ranking for ties)
  let currentRank = 1;
  for (let i = 0; i < scoredRows.length; i++) {
    if (
      i > 0 &&
      Math.abs((scoredRows[i].averageScore ?? 0) - (scoredRows[i - 1].averageScore ?? 0)) >
        0.001
    ) {
      currentRank = i + 1;
    }
    scoredRows[i].rank = currentRank;
    scoredRows[i].rankLabel = formatOrdinalRank(currentRank);
  }

  return [...scoredRows, ...unscoredRows];
}

export function validateItemInput(input: {
  name: string;
  malayalamName?: string;
  category: string;
  stage: string;
}): { valid: true } | { valid: false; error: string } {
  const name = input.name.trim();
  const malayalamName = (input.malayalamName ?? '').trim();
  const stage = input.stage.trim();

  if (name.length < 1 || name.length > 120) {
    return { valid: false, error: 'Item name is required and must be under 120 characters.' };
  }
  if (malayalamName.length > 120) {
    return { valid: false, error: 'Malayalam name must be under 120 characters.' };
  }
  const normalizedCat = normalizeItemCategory(input.category);
  if (normalizedCat.length < 1 || normalizedCat.length > 60) {
    return { valid: false, error: 'Please select a valid competition category.' };
  }
  if (stage.length < 1 || stage.length > 60) {
    return { valid: false, error: 'Stage name is required and must be under 60 characters.' };
  }
  return { valid: true };
}

export function validateParticipantInput(
  input: {
    itemId: string;
    chestNo: string;
    name: string;
    school: string;
  },
  existingParticipants: Participant[],
  items: CompetitionItem[]
): { valid: true; normalizedChestNo: string } | { valid: false; error: string } {
  const itemId = input.itemId.trim();
  const normalizedChestNo = input.chestNo.trim().toUpperCase();
  const name = input.name.trim();
  const school = input.school.trim();

  if (!ID_REGEX.test(itemId) || !items.some((it) => it.id === itemId)) {
    return { valid: false, error: 'Please select a valid competition item.' };
  }
  if (
    normalizedChestNo.length < 1 ||
    normalizedChestNo.length > 20 ||
    !CHEST_NO_REGEX.test(normalizedChestNo)
  ) {
    return {
      valid: false,
      error: 'Chest number must contain only letters, digits, or hyphens (e.g. 101 or HS-104).',
    };
  }
  if (
    existingParticipants.some(
      (p) => p.itemId === itemId && p.chestNo.toUpperCase() === normalizedChestNo
    )
  ) {
    return {
      valid: false,
      error: `Chest number ${normalizedChestNo} is already registered for this item.`,
    };
  }
  if (name.length < 1 || name.length > 120) {
    return {
      valid: false,
      error: 'Participant name is required and must be under 120 characters.',
    };
  }
  if (school.length > 160) {
    return {
      valid: false,
      error: 'School / Institution name must be under 160 characters.',
    };
  }
  return { valid: true, normalizedChestNo };
}

export function validateScoreInput(input: {
  itemId: string;
  participantId: string;
  judgeSlot: string;
  judgeName: string;
  rhythm: number;
  expression: number;
  perfection: number;
  overall: number;
  remarks?: string;
}): { valid: true; total: number } | { valid: false; error: string } {
  if (!ID_REGEX.test(input.itemId) || !ID_REGEX.test(input.participantId)) {
    return { valid: false, error: 'Please select a valid competition item and chest number.' };
  }
  if (!ALLOWED_JUDGE_SLOTS.includes(input.judgeSlot as JudgeSlot)) {
    return { valid: false, error: 'Please select a valid judge slot (J1, J2, or J3).' };
  }
  const judgeName = input.judgeName.trim();
  if (judgeName.length < 1 || judgeName.length > 100) {
    return { valid: false, error: 'Judge name is required (1–100 characters).' };
  }
  const criteria = [
    { label: 'Rhythm (താളം)', val: input.rhythm },
    { label: 'Expression (ഭാവം)', val: input.expression },
    { label: 'Perfection (പൂർണ്ണത)', val: input.perfection },
    { label: 'Overall Presentation (അവതരണം)', val: input.overall },
  ];
  for (const c of criteria) {
    if (!Number.isFinite(c.val) || c.val < 0 || c.val > 25) {
      return {
        valid: false,
        error: `${c.label} must be between 0 and 25 marks.`,
      };
    }
  }
  const total = calculateCriterionTotal(
    input.rhythm,
    input.expression,
    input.perfection,
    input.overall
  );
  if (total < 0 || total > 100) {
    return { valid: false, error: 'Total score must be between 0 and 100.' };
  }
  if ((input.remarks ?? '').trim().length > 300) {
    return { valid: false, error: 'Remarks must not exceed 300 characters.' };
  }
  return { valid: true, total };
}

export const DEFAULT_ADMIN_PIN = '2026';

export function isAdminUrlMode(searchString: string): boolean {
  try {
    const params = new URLSearchParams(searchString);
    return params.get('admin') === 'true';
  } catch {
    return false;
  }
}

export function verifyAdminPin(
  inputPin: string,
  expectedPin: string = DEFAULT_ADMIN_PIN
): boolean {
  return inputPin.trim() === expectedPin;
}

export function formatChestDropdownLabel(
  participant: Pick<Participant, 'chestNo' | 'name'>,
  isScored: boolean
): string {
  return isScored
    ? `Chest ${participant.chestNo} — ${participant.name} (Scored ✓)`
    : `Chest ${participant.chestNo} — ${participant.name}`;
}

