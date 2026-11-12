export type CategoryType = 'High School' | 'Higher Secondary' | 'General' | 'Sub-Junior';

export type JudgeSlot = 'J1' | 'J2' | 'J3';

export interface CompetitionItem {
  id: string;
  name: string;
  malayalamName: string;
  category: CategoryType;
  stage: string;
  maxMarks: number;
  authorId: string;
  createdAt: string;
}

export interface Participant {
  id: string;
  itemId: string;
  chestNo: string;
  name: string;
  school: string;
  authorId: string;
  createdAt: string;
}

export interface JudgeScore {
  id: string;
  itemId: string;
  participantId: string;
  chestNo: string;
  judgeSlot: JudgeSlot;
  judgeName: string;
  rhythm: number;      // 0 - 25 (താളം / Rhythm)
  expression: number;  // 0 - 25 (ഭാവം / Expression)
  perfection: number;  // 0 - 25 (പൂർണ്ണത / Perfection & Technique)
  overall: number;     // 0 - 25 (അവതരണം / Overall Presentation)
  total: number;       // 0 - 100
  remarks: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export type KalolsavamGrade = 'A' | 'B' | 'C' | 'No Grade';

export interface TabulatedParticipant {
  participant: Participant;
  scoresByJudge: {
    J1?: JudgeScore;
    J2?: JudgeScore;
    J3?: JudgeScore;
  };
  judgesCount: number;
  averageScore: number | null;
  criterionAverages: {
    rhythm: number | null;
    expression: number | null;
    perfection: number | null;
    overall: number | null;
  };
  grade: KalolsavamGrade;
  gradePoints: number;
  rank: number | null;
  rankLabel: string;
}
