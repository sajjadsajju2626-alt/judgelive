import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCriterionTotal,
  calculateGrade,
  distributeTotalToCriteria,
  normalizeItemCategory,
  tabulateItemLeaderboard,
  validateItemInput,
  validateParticipantInput,
  validateScoreInput,
} from './scoring';
import { CompetitionItem, JudgeScore, Participant } from '../types';

test('calculateCriterionTotal sums 4 criteria and clamps to 0..25 each', () => {
  assert.equal(calculateCriterionTotal(24, 23, 22, 21), 90);
  assert.equal(calculateCriterionTotal(30, -5, 25, 20), 70); // 25 + 0 + 25 + 20
});

test('distributeTotalToCriteria distributes total accurately across 4 criteria', () => {
  const d91 = distributeTotalToCriteria(91);
  assert.equal(d91.total, 91);
  assert.equal(d91.rhythm + d91.expression + d91.perfection + d91.overall, 91);
  assert.equal(d91.rhythm, 23);
  assert.equal(d91.expression, 23);
  assert.equal(d91.perfection, 23);
  assert.equal(d91.overall, 22);
});

test('calculateGrade returns correct Kerala Kalolsavam grades and points', () => {
  assert.deepEqual(calculateGrade(88.5), { grade: 'A', gradePoints: 5 });
  assert.deepEqual(calculateGrade(80), { grade: 'A', gradePoints: 5 });
  assert.deepEqual(calculateGrade(74.2), { grade: 'B', gradePoints: 3 });
  assert.deepEqual(calculateGrade(62), { grade: 'C', gradePoints: 1 });
  assert.deepEqual(calculateGrade(55), { grade: 'No Grade', gradePoints: 0 });
  assert.deepEqual(calculateGrade(null), { grade: 'No Grade', gradePoints: 0 });
});

test('tabulateItemLeaderboard calculates multi-judge averages, grades, and tie-aware ranks', () => {
  const participants: Participant[] = [
    {
      id: 'p1',
      itemId: 'item1',
      chestNo: '101',
      name: 'Meenakshi Nair',
      school: 'GHSS Kozhikode',
      authorId: 'u1',
      createdAt: '2026-11-12T00:00:00Z',
    },
    {
      id: 'p2',
      itemId: 'item1',
      chestNo: '102',
      name: 'Devika Menon',
      school: 'St. Teresa HSS Thrissur',
      authorId: 'u1',
      createdAt: '2026-11-12T00:00:00Z',
    },
    {
      id: 'p3',
      itemId: 'item1',
      chestNo: '103',
      name: 'Lakshmi Priya',
      school: 'Model Boys HSS Trivandrum',
      authorId: 'u1',
      createdAt: '2026-11-12T00:00:00Z',
    },
  ];

  const scores: JudgeScore[] = [
    {
      id: 'item1_p1_J1',
      itemId: 'item1',
      participantId: 'p1',
      chestNo: '101',
      judgeSlot: 'J1',
      judgeName: 'Judge 1',
      rhythm: 24,
      expression: 24,
      perfection: 23,
      overall: 23,
      total: 94,
      remarks: '',
      authorId: 'u1',
      createdAt: '2026-11-12T00:00:00Z',
      updatedAt: '2026-11-12T00:00:00Z',
    },
    {
      id: 'item1_p1_J2',
      itemId: 'item1',
      participantId: 'p1',
      chestNo: '101',
      judgeSlot: 'J2',
      judgeName: 'Judge 2',
      rhythm: 23,
      expression: 23,
      perfection: 23,
      overall: 23,
      total: 92,
      remarks: '',
      authorId: 'u1',
      createdAt: '2026-11-12T00:00:00Z',
      updatedAt: '2026-11-12T00:00:00Z',
    },
    {
      id: 'item1_p2_J1',
      itemId: 'item1',
      participantId: 'p2',
      chestNo: '102',
      judgeSlot: 'J1',
      judgeName: 'Judge 1',
      rhythm: 24,
      expression: 24,
      perfection: 24,
      overall: 24,
      total: 96,
      remarks: '',
      authorId: 'u1',
      createdAt: '2026-11-12T00:00:00Z',
      updatedAt: '2026-11-12T00:00:00Z',
    },
  ];

  const rows = tabulateItemLeaderboard('item1', participants, scores);
  assert.equal(rows.length, 3);

  // p2 has 96.0 -> 1st
  assert.equal(rows[0].participant.chestNo, '102');
  assert.equal(rows[0].averageScore, 96);
  assert.equal(rows[0].rank, 1);
  assert.equal(rows[0].rankLabel, '1st');
  assert.equal(rows[0].grade, 'A');

  // p1 has (94 + 92) / 2 = 93.0 -> 2nd
  assert.equal(rows[1].participant.chestNo, '101');
  assert.equal(rows[1].averageScore, 93);
  assert.equal(rows[1].rank, 2);
  assert.equal(rows[1].rankLabel, '2nd');

  // p3 has no scores -> Pending
  assert.equal(rows[2].participant.chestNo, '103');
  assert.equal(rows[2].averageScore, null);
  assert.equal(rows[2].rank, null);
  assert.equal(rows[2].rankLabel, 'Pending');
});

test('validateParticipantInput prevents duplicate chest numbers and empty fields', () => {
  const items: CompetitionItem[] = [
    {
      id: 'item1',
      name: 'Bharatanatyam',
      malayalamName: 'ഭരതനാട്യം',
      category: 'High School',
      stage: 'Stage 1',
      maxMarks: 100,
      authorId: 'u1',
      createdAt: '2026-11-12T00:00:00Z',
    },
  ];
  const existing: Participant[] = [
    {
      id: 'p1',
      itemId: 'item1',
      chestNo: '101',
      name: 'Meenakshi Nair',
      school: 'GHSS Kozhikode',
      authorId: 'u1',
      createdAt: '2026-11-12T00:00:00Z',
    },
  ];

  const dup = validateParticipantInput(
    { itemId: 'item1', chestNo: '101', name: 'Another Student', school: 'Another School' },
    existing,
    items
  );
  assert.equal(dup.valid, false);

  const ok = validateParticipantInput(
    { itemId: 'item1', chestNo: '102', name: 'Devika Menon', school: 'St. Teresa HSS' },
    existing,
    items
  );
  assert.equal(ok.valid, true);
});

test('validateItemInput and validateScoreInput enforce boundaries', () => {
  assert.equal(
    validateItemInput({ name: '', category: 'High School', stage: 'Stage 1' }).valid,
    false
  );
  assert.equal(
    validateScoreInput({
      itemId: 'item1',
      participantId: 'p1',
      judgeSlot: 'J1',
      judgeName: 'Smt. Kalamandalam Saraswathi',
      rhythm: 26,
      expression: 20,
      perfection: 20,
      overall: 20,
    }).valid,
    false
  );
});

test('URL access control and Admin PIN verification work accurately', async () => {
  const { isAdminUrlMode, verifyAdminPin, formatChestDropdownLabel } = await import(
    './scoring'
  );
  assert.equal(isAdminUrlMode(''), false);
  assert.equal(isAdminUrlMode('?admin=false'), false);
  assert.equal(isAdminUrlMode('?admin=true'), true);
  assert.equal(isAdminUrlMode('?foo=1&admin=true'), true);

  assert.equal(verifyAdminPin('2026'), true);
  assert.equal(verifyAdminPin(' 2026 '), true);
  assert.equal(verifyAdminPin('0000'), false);

  assert.equal(
    formatChestDropdownLabel({ chestNo: '105', name: 'Meenakshi' }, true),
    'Chest 105 — Meenakshi (Scored ✓)'
  );
  assert.equal(
    formatChestDropdownLabel({ chestNo: '105', name: 'Meenakshi' }, false),
    'Chest 105 — Meenakshi'
  );
});

test('normalizeItemCategory preserves junior, senior, sub-junior, hs, hss, and custom categories', () => {
  assert.equal(normalizeItemCategory('junior'), 'Junior');
  assert.equal(normalizeItemCategory('  SENIOR  '), 'Senior');
  assert.equal(normalizeItemCategory('sub-junior'), 'Sub-Junior');
  assert.equal(normalizeItemCategory('subjunior'), 'Sub-Junior');
  assert.equal(normalizeItemCategory('hs'), 'HS');
  assert.equal(normalizeItemCategory('HSS'), 'HSS');
  assert.equal(normalizeItemCategory('high school'), 'High School');
  assert.equal(normalizeItemCategory('higher secondary'), 'Higher Secondary');
  assert.equal(normalizeItemCategory('general'), 'General');
  assert.equal(normalizeItemCategory('   '), 'General');
  assert.equal(normalizeItemCategory(''), 'General');
  assert.equal(normalizeItemCategory('upper primary'), 'Upper Primary');
  assert.equal(normalizeItemCategory('SUPER-SENIOR boys'), 'Super-Senior Boys');

  const noSchoolOk = validateParticipantInput(
    { itemId: 'item1', chestNo: '103', name: 'Muhammed Falah', school: '' },
    [],
    [
      {
        id: 'item1',
        name: 'Arabic Song',
        malayalamName: '',
        category: 'Junior',
        stage: 'Stage 1',
        maxMarks: 100,
        authorId: 'u1',
        createdAt: '2026-11-12T00:00:00Z',
      },
    ]
  );
  assert.equal(noSchoolOk.valid, true);
});

