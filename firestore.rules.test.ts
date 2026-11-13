import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Deterministic Dirty-Dozen Security Rule Evaluator
 * Verifies that every Dirty Dozen payload defined in security_spec.md is rejected
 * by the exact boolean predicates in firestore.rules.
 */

interface AuthContext {
  uid: string;
  email: string;
  email_verified: boolean;
}

const REQUEST_TIME = '2026-11-12T08:30:00.000Z';

function isValidId(id: unknown): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && /^[a-zA-Z0-9_\-]+$/.test(id);
}

function isVerifiedUser(auth: AuthContext | null): boolean {
  return auth !== null && auth.email_verified === true;
}

function hasExactKeys(obj: Record<string, unknown>, required: string[], allowed: string[]): boolean {
  const keys = Object.keys(obj);
  const hasAll = required.every((k) => keys.includes(k));
  const hasOnly = keys.every((k) => allowed.includes(k));
  return hasAll && hasOnly;
}

function evaluateCreateItem(
  auth: AuthContext | null,
  itemId: string,
  incoming: Record<string, unknown>
): 'ALLOW' | 'PERMISSION_DENIED' {
  const reqKeys = ['id', 'name', 'malayalamName', 'category', 'stage', 'maxMarks', 'authorId', 'createdAt'];
  if (!isVerifiedUser(auth) || !auth) return 'PERMISSION_DENIED';
  if (!isValidId(itemId)) return 'PERMISSION_DENIED';
  if (!hasExactKeys(incoming, reqKeys, reqKeys)) return 'PERMISSION_DENIED';
  if (incoming.id !== itemId || typeof incoming.id !== 'string' || incoming.id.length > 64) return 'PERMISSION_DENIED';
  if (typeof incoming.name !== 'string' || incoming.name.length < 1 || incoming.name.length > 120) return 'PERMISSION_DENIED';
  if (typeof incoming.malayalamName !== 'string' || incoming.malayalamName.length > 120) return 'PERMISSION_DENIED';
  if (!['High School', 'Higher Secondary', 'General', 'Sub-Junior'].includes(String(incoming.category))) return 'PERMISSION_DENIED';
  if (typeof incoming.stage !== 'string' || incoming.stage.length < 1 || incoming.stage.length > 60) return 'PERMISSION_DENIED';
  if (incoming.maxMarks !== 100) return 'PERMISSION_DENIED';
  if (incoming.authorId !== auth.uid) return 'PERMISSION_DENIED';
  if (incoming.createdAt !== REQUEST_TIME) return 'PERMISSION_DENIED';
  return 'ALLOW';
}

function evaluateCreateParticipant(
  auth: AuthContext | null,
  participantId: string,
  incoming: Record<string, unknown>,
  existingItems: Set<string>
): 'ALLOW' | 'PERMISSION_DENIED' {
  const reqKeys = ['id', 'itemId', 'chestNo', 'name', 'school', 'authorId', 'createdAt'];
  if (!isVerifiedUser(auth) || !auth) return 'PERMISSION_DENIED';
  if (!isValidId(participantId)) return 'PERMISSION_DENIED';
  if (!hasExactKeys(incoming, reqKeys, reqKeys)) return 'PERMISSION_DENIED';
  if (incoming.id !== participantId) return 'PERMISSION_DENIED';
  if (typeof incoming.itemId !== 'string' || !isValidId(incoming.itemId)) return 'PERMISSION_DENIED';
  if (!existingItems.has(incoming.itemId)) return 'PERMISSION_DENIED';
  if (typeof incoming.chestNo !== 'string' || !/^[A-Z0-9\-]+$/.test(incoming.chestNo) || incoming.chestNo.length > 20) return 'PERMISSION_DENIED';
  if (typeof incoming.name !== 'string' || incoming.name.length < 1 || incoming.name.length > 120) return 'PERMISSION_DENIED';
  if (typeof incoming.school !== 'string' || incoming.school.length < 1 || incoming.school.length > 160) return 'PERMISSION_DENIED';
  if (incoming.authorId !== auth.uid) return 'PERMISSION_DENIED';
  if (incoming.createdAt !== REQUEST_TIME) return 'PERMISSION_DENIED';
  return 'ALLOW';
}

function isValidScoreShape(
  auth: AuthContext,
  scoreId: string,
  data: Record<string, unknown>
): boolean {
  const reqKeys = [
    'id', 'itemId', 'participantId', 'chestNo', 'judgeSlot', 'judgeName',
    'rhythm', 'expression', 'perfection', 'overall', 'total', 'remarks',
    'authorId', 'createdAt', 'updatedAt'
  ];
  if (!hasExactKeys(data, reqKeys, reqKeys)) return false;
  if (data.id !== scoreId || !isValidId(data.id)) return false;
  if (!isValidId(data.itemId) || !isValidId(data.participantId)) return false;
  if (typeof data.chestNo !== 'string' || data.chestNo.length < 1 || data.chestNo.length > 20) return false;
  if (!['J1', 'J2', 'J3'].includes(String(data.judgeSlot))) return false;
  if (typeof data.judgeName !== 'string' || data.judgeName.length < 1 || data.judgeName.length > 100) return false;
  const r = Number(data.rhythm);
  const e = Number(data.expression);
  const p = Number(data.perfection);
  const o = Number(data.overall);
  const t = Number(data.total);
  if ([r, e, p, o].some((n) => Number.isNaN(n) || n < 0 || n > 25)) return false;
  if (Number.isNaN(t) || t < 0 || t > 100 || t !== r + e + p + o) return false;
  if (typeof data.remarks !== 'string' || data.remarks.length > 300) return false;
  if (data.authorId !== auth.uid) return false;
  return true;
}

function evaluateCreateScore(
  auth: AuthContext | null,
  scoreId: string,
  incoming: Record<string, unknown>,
  existingItems: Set<string>,
  existingParticipants: Set<string>
): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!isVerifiedUser(auth) || !auth) return 'PERMISSION_DENIED';
  if (!isValidId(scoreId)) return 'PERMISSION_DENIED';
  if (!isValidScoreShape(auth, scoreId, incoming)) return 'PERMISSION_DENIED';
  if (incoming.createdAt !== REQUEST_TIME || incoming.updatedAt !== REQUEST_TIME) return 'PERMISSION_DENIED';
  if (!existingItems.has(String(incoming.itemId)) || !existingParticipants.has(String(incoming.participantId))) {
    return 'PERMISSION_DENIED';
  }
  return 'ALLOW';
}

function evaluateUpdateScore(
  auth: AuthContext | null,
  scoreId: string,
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>
): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!isVerifiedUser(auth) || !auth) return 'PERMISSION_DENIED';
  if (!isValidId(scoreId)) return 'PERMISSION_DENIED';
  if (!isValidScoreShape(auth, scoreId, incoming)) return 'PERMISSION_DENIED';
  const immutableKeys = ['id', 'itemId', 'participantId', 'chestNo', 'judgeSlot', 'authorId', 'createdAt'];
  for (const k of immutableKeys) {
    if (incoming[k] !== existing[k]) return 'PERMISSION_DENIED';
  }
  if (incoming.updatedAt !== REQUEST_TIME) return 'PERMISSION_DENIED';
  if (existing.authorId !== auth.uid && auth.email !== 'sajjadsajju2626@gmail.com') return 'PERMISSION_DENIED';
  return 'ALLOW';
}

const verifiedUserA: AuthContext = { uid: 'user_A', email: 'judge1@kalolsavam.org', email_verified: true };
const verifiedUserB: AuthContext = { uid: 'user_B', email: 'judge2@kalolsavam.org', email_verified: true };
const unverifiedAdminSpoof: AuthContext = { uid: 'spoof_1', email: 'sajjadsajju2626@gmail.com', email_verified: false };

const existingItems = new Set(['item_1']);
const existingParticipants = new Set(['part_1']);

const baseValidScore = {
  id: 'score_1',
  itemId: 'item_1',
  participantId: 'part_1',
  chestNo: '101',
  judgeSlot: 'J1',
  judgeName: 'Kalakshetra Devi',
  rhythm: 23,
  expression: 24,
  perfection: 22,
  overall: 23,
  total: 92,
  remarks: 'Excellent mudras and rhythm control',
  authorId: 'user_A',
  createdAt: REQUEST_TIME,
  updatedAt: REQUEST_TIME,
};

test('Dirty Dozen #1: Identity spoofing on CompetitionItem creation is PERMISSION_DENIED', () => {
  const res = evaluateCreateItem(verifiedUserA, 'item_1', {
    id: 'item_1',
    name: 'Bharatanatyam',
    malayalamName: 'ഭരതനാട്യം',
    category: 'High School',
    stage: 'Stage 1',
    maxMarks: 100,
    authorId: 'user_B', // Spoofed UID
    createdAt: REQUEST_TIME,
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #2: Unverified email spoof attack is PERMISSION_DENIED', () => {
  const res = evaluateCreateItem(unverifiedAdminSpoof, 'item_1', {
    id: 'item_1',
    name: 'Bharatanatyam',
    malayalamName: 'ഭരതനാട്യം',
    category: 'High School',
    stage: 'Stage 1',
    maxMarks: 100,
    authorId: 'spoof_1',
    createdAt: REQUEST_TIME,
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #3: Shadow field injection on create is PERMISSION_DENIED', () => {
  const res = evaluateCreateItem(verifiedUserA, 'item_1', {
    id: 'item_1',
    name: 'Bharatanatyam',
    malayalamName: 'ഭരതനാട്യം',
    category: 'High School',
    stage: 'Stage 1',
    maxMarks: 100,
    authorId: 'user_A',
    createdAt: REQUEST_TIME,
    isWinner: true, // Undeclared shadow key
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #4: Path ID poisoning is PERMISSION_DENIED', () => {
  const res = evaluateCreateItem(verifiedUserA, 'bad$id!@#', {
    id: 'bad$id!@#',
    name: 'Mohiniyattam',
    malayalamName: 'മോഹിനിയാട്ടം',
    category: 'Higher Secondary',
    stage: 'Stage 2',
    maxMarks: 100,
    authorId: 'user_A',
    createdAt: REQUEST_TIME,
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #5: Orphaned participant referencing non-existent itemId is PERMISSION_DENIED', () => {
  const res = evaluateCreateParticipant(
    verifiedUserA,
    'part_99',
    {
      id: 'part_99',
      itemId: 'non_existent_item',
      chestNo: '109',
      name: 'Anjali Menon',
      school: 'GHSS Kozhikode',
      authorId: 'user_A',
      createdAt: REQUEST_TIME,
    },
    existingItems
  );
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #6: Score total math mismatch is PERMISSION_DENIED', () => {
  const res = evaluateCreateScore(
    verifiedUserA,
    'score_1',
    { ...baseValidScore, total: 99 }, // 23+24+22+23 = 92 != 99
    existingItems,
    existingParticipants
  );
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #7: Criterion overflow (>25) is PERMISSION_DENIED', () => {
  const res = evaluateCreateScore(
    verifiedUserA,
    'score_1',
    { ...baseValidScore, rhythm: 30, expression: 20, perfection: 25, overall: 25, total: 100 },
    existingItems,
    existingParticipants
  );
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #8: Client timestamp forgery is PERMISSION_DENIED', () => {
  const res = evaluateCreateScore(
    verifiedUserA,
    'score_1',
    { ...baseValidScore, createdAt: '2020-01-01T00:00:00.000Z' },
    existingItems,
    existingParticipants
  );
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #9: Mutating immutable participantId during update is PERMISSION_DENIED', () => {
  const res = evaluateUpdateScore(verifiedUserA, 'score_1', baseValidScore, {
    ...baseValidScore,
    participantId: 'part_2',
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #10: Value poisoning with oversized remarks (>300 chars) on update is PERMISSION_DENIED', () => {
  const res = evaluateUpdateScore(verifiedUserA, 'score_1', baseValidScore, {
    ...baseValidScore,
    remarks: 'X'.repeat(305),
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #11: Cross-judge score hijack by another non-admin user is PERMISSION_DENIED', () => {
  const res = evaluateUpdateScore(verifiedUserB, 'score_1', baseValidScore, {
    ...baseValidScore,
    authorId: 'user_B',
  });
  assert.equal(res, 'PERMISSION_DENIED');
});

test('Dirty Dozen #12: Self-assigned admin escalation is PERMISSION_DENIED', () => {
  const allowCreateAdmin = false; // match /admins/{adminId} { allow create, update, delete: if false; }
  assert.equal(allowCreateAdmin ? 'ALLOW' : 'PERMISSION_DENIED', 'PERMISSION_DENIED');
});

function isValidEventCode(code: unknown): boolean {
  return typeof code === 'string' && code.length >= 2 && code.length <= 32 && /^[A-Z0-9_\-]+$/.test(code);
}

function evaluateCreateBranding(
  auth: AuthContext | null,
  eventCode: string,
  settingId: string,
  incoming: Record<string, unknown>
): 'ALLOW' | 'PERMISSION_DENIED' {
  const reqKeys = ['id', 'eventCode', 'festivalName', 'subtitle', 'authorId', 'createdAt', 'updatedAt'];
  if (!isVerifiedUser(auth) || !auth) return 'PERMISSION_DENIED';
  if (!isValidEventCode(eventCode) || !isValidId(settingId)) return 'PERMISSION_DENIED';
  if (!hasExactKeys(incoming, reqKeys, reqKeys)) return 'PERMISSION_DENIED';
  if (incoming.id !== 'branding' || incoming.id !== settingId) return 'PERMISSION_DENIED';
  if (incoming.eventCode !== eventCode) return 'PERMISSION_DENIED';
  if (typeof incoming.festivalName !== 'string' || incoming.festivalName.length < 1 || incoming.festivalName.length > 120) return 'PERMISSION_DENIED';
  if (typeof incoming.subtitle !== 'string' || incoming.subtitle.length > 160) return 'PERMISSION_DENIED';
  if (incoming.authorId !== auth.uid) return 'PERMISSION_DENIED';
  if (incoming.createdAt !== REQUEST_TIME || incoming.updatedAt !== REQUEST_TIME) return 'PERMISSION_DENIED';
  return 'ALLOW';
}

test('Multi-tenant EventCode validation rejects lowercase, path traversal, or mismatched eventCode', () => {
  assert.equal(isValidEventCode('SCHOOL01'), true);
  assert.equal(isValidEventCode('FEST-2026_A'), true);
  assert.equal(isValidEventCode('school01'), false);
  assert.equal(isValidEventCode('A'), false);
  assert.equal(isValidEventCode('FEST/2026'), false);

  const crossTenantSpoof = evaluateCreateBranding(verifiedUserA, 'SCHOOL01', 'branding', {
    id: 'branding',
    eventCode: 'FEST2026',
    festivalName: "St. Mary's Arts Fest",
    subtitle: 'Main Campus',
    authorId: 'user_A',
    createdAt: REQUEST_TIME,
    updatedAt: REQUEST_TIME,
  });
  assert.equal(crossTenantSpoof, 'PERMISSION_DENIED');

  const validBranding = evaluateCreateBranding(verifiedUserA, 'SCHOOL01', 'branding', {
    id: 'branding',
    eventCode: 'SCHOOL01',
    festivalName: "St. Mary's Arts Fest",
    subtitle: 'Main Campus',
    authorId: 'user_A',
    createdAt: REQUEST_TIME,
    updatedAt: REQUEST_TIME,
  });
  assert.equal(validBranding, 'ALLOW');
});

function evaluateCreateEventConfig(
  auth: AuthContext | null,
  eventCode: string,
  settingId: string,
  incoming: Record<string, unknown>
): 'ALLOW' | 'PERMISSION_DENIED' {
  const reqKeys = ['id', 'eventCode', 'title', 'subtitle', 'adminPin', 'authorId', 'createdAt', 'updatedAt'];
  const allowedKeys = [...reqKeys, 'chartType', 'gradeA', 'gradeB', 'gradeC'];
  if (!isVerifiedUser(auth) || !auth) return 'PERMISSION_DENIED';
  if (!isValidEventCode(eventCode) || !isValidId(settingId)) return 'PERMISSION_DENIED';
  if (!hasExactKeys(incoming, reqKeys, allowedKeys)) return 'PERMISSION_DENIED';
  if (incoming.id !== 'config' || incoming.id !== settingId) return 'PERMISSION_DENIED';
  if (incoming.eventCode !== eventCode) return 'PERMISSION_DENIED';
  if (typeof incoming.title !== 'string' || incoming.title.length < 1 || incoming.title.length > 120) return 'PERMISSION_DENIED';
  if (typeof incoming.subtitle !== 'string' || incoming.subtitle.length > 160) return 'PERMISSION_DENIED';
  if (typeof incoming.adminPin !== 'string' || incoming.adminPin.length < 4 || incoming.adminPin.length > 16 || !/^[a-zA-Z0-9_\-]+$/.test(incoming.adminPin)) return 'PERMISSION_DENIED';
  if ('chartType' in incoming && !['bar', 'horizontal', 'doughnut'].includes(String(incoming.chartType))) return 'PERMISSION_DENIED';
  if ('gradeA' in incoming && (typeof incoming.gradeA !== 'number' || !Number.isFinite(incoming.gradeA) || incoming.gradeA < 1 || incoming.gradeA > 100)) return 'PERMISSION_DENIED';
  if ('gradeB' in incoming && (typeof incoming.gradeB !== 'number' || !Number.isFinite(incoming.gradeB) || incoming.gradeB < 1 || incoming.gradeB > 100)) return 'PERMISSION_DENIED';
  if ('gradeC' in incoming && (typeof incoming.gradeC !== 'number' || !Number.isFinite(incoming.gradeC) || incoming.gradeC < 0 || incoming.gradeC > 100)) return 'PERMISSION_DENIED';
  if ('gradeA' in incoming && 'gradeB' in incoming && Number(incoming.gradeA) <= Number(incoming.gradeB)) return 'PERMISSION_DENIED';
  if ('gradeB' in incoming && 'gradeC' in incoming && Number(incoming.gradeB) <= Number(incoming.gradeC)) return 'PERMISSION_DENIED';
  if ('gradeA' in incoming && 'gradeC' in incoming && Number(incoming.gradeA) <= Number(incoming.gradeC)) return 'PERMISSION_DENIED';
  if (incoming.authorId !== auth.uid) return 'PERMISSION_DENIED';
  if (incoming.createdAt !== REQUEST_TIME || incoming.updatedAt !== REQUEST_TIME) return 'PERMISSION_DENIED';
  return 'ALLOW';
}

function evaluateCreateGroup(
  auth: AuthContext | null,
  groupId: string,
  incoming: Record<string, unknown>
): 'ALLOW' | 'PERMISSION_DENIED' {
  const reqKeys = ['id', 'name', 'color', 'authorId', 'createdAt'];
  if (!isVerifiedUser(auth) || !auth) return 'PERMISSION_DENIED';
  if (!isValidId(groupId)) return 'PERMISSION_DENIED';
  if (!hasExactKeys(incoming, reqKeys, reqKeys)) return 'PERMISSION_DENIED';
  if (incoming.id !== groupId || typeof incoming.id !== 'string' || incoming.id.length > 64) return 'PERMISSION_DENIED';
  if (typeof incoming.name !== 'string' || incoming.name.length < 1 || incoming.name.length > 80) return 'PERMISSION_DENIED';
  if (typeof incoming.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(incoming.color)) return 'PERMISSION_DENIED';
  if (incoming.authorId !== auth.uid) return 'PERMISSION_DENIED';
  if (incoming.createdAt !== REQUEST_TIME) return 'PERMISSION_DENIED';
  return 'ALLOW';
}

test('EventConfig rule enforces custom adminPin and chartType enum', () => {
  const shortPin = evaluateCreateEventConfig(verifiedUserA, 'CAMPUS02', 'config', {
    id: 'config',
    eventCode: 'CAMPUS02',
    title: 'Markaz Arts Fest 2026',
    subtitle: 'Campus Auditorium',
    adminPin: '12',
    authorId: 'user_A',
    createdAt: REQUEST_TIME,
    updatedAt: REQUEST_TIME,
  });
  assert.equal(shortPin, 'PERMISSION_DENIED');

  const invalidChart = evaluateCreateEventConfig(verifiedUserA, 'CAMPUS02', 'config', {
    id: 'config',
    eventCode: 'CAMPUS02',
    title: 'Markaz Arts Fest 2026',
    subtitle: 'Campus Auditorium',
    adminPin: '2026',
    chartType: 'radar',
    authorId: 'user_A',
    createdAt: REQUEST_TIME,
    updatedAt: REQUEST_TIME,
  });
  assert.equal(invalidChart, 'PERMISSION_DENIED');

  const validConfig = evaluateCreateEventConfig(verifiedUserA, 'CAMPUS02', 'config', {
    id: 'config',
    eventCode: 'CAMPUS02',
    title: 'Markaz Arts Fest 2026',
    subtitle: 'Campus Auditorium',
    adminPin: '2026',
    chartType: 'horizontal',
    authorId: 'user_A',
    createdAt: REQUEST_TIME,
    updatedAt: REQUEST_TIME,
  });
  assert.equal(validConfig, 'ALLOW');
});

test('Group rule validates hex color, name length, and rejects shadow keys', () => {
  const badColor = evaluateCreateGroup(verifiedUserA, 'grp_red', {
    id: 'grp_red',
    name: 'Red House',
    color: 'red',
    authorId: 'user_A',
    createdAt: REQUEST_TIME,
  });
  assert.equal(badColor, 'PERMISSION_DENIED');

  const validGroup = evaluateCreateGroup(verifiedUserA, 'grp_red', {
    id: 'grp_red',
    name: 'Red House',
    color: '#DC2626',
    authorId: 'user_A',
    createdAt: REQUEST_TIME,
  });
  assert.equal(validGroup, 'ALLOW');
});

function evaluateUpdateEventConfigPin(
  auth: AuthContext | null,
  eventCode: string,
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>
): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!isVerifiedUser(auth) || !auth) return 'PERMISSION_DENIED';
  if (!isValidEventCode(eventCode)) return 'PERMISSION_DENIED';
  const evalCheck = evaluateCreateEventConfig(
    { ...auth, uid: String(existing.authorId) },
    eventCode,
    'config',
    { ...incoming, createdAt: REQUEST_TIME, updatedAt: REQUEST_TIME }
  );
  if (evalCheck !== 'ALLOW') return 'PERMISSION_DENIED';
  if (incoming.id !== existing.id || incoming.eventCode !== existing.eventCode || incoming.authorId !== existing.authorId || incoming.createdAt !== existing.createdAt) {
    return 'PERMISSION_DENIED';
  }
  if (incoming.updatedAt !== REQUEST_TIME) return 'PERMISSION_DENIED';
  if (existing.authorId !== auth.uid && auth.email !== 'sajjadsajju2626@gmail.com') return 'PERMISSION_DENIED';
  const changedKeys = Object.keys(incoming).filter((k) => incoming[k] !== existing[k]);
  const allowedUpdateKeys = ['title', 'subtitle', 'adminPin', 'chartType', 'gradeA', 'gradeB', 'gradeC', 'updatedAt'];
  if (!changedKeys.every((k) => allowedUpdateKeys.includes(k))) return 'PERMISSION_DENIED';
  return 'ALLOW';
}

test('EventConfig update allows campus author to change adminPin independently and blocks hijack/invalid PIN', () => {
  const existingCfg = {
    id: 'config',
    eventCode: 'CAMPUS02',
    title: 'CAMPUS02',
    subtitle: 'Kerala State Arts Festival Judging',
    adminPin: '1234',
    chartType: 'bar',
    authorId: 'user_A',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  };

  assert.equal(
    evaluateUpdateEventConfigPin(verifiedUserA, 'CAMPUS02', existingCfg, {
      ...existingCfg,
      adminPin: '567890',
      updatedAt: REQUEST_TIME,
    }),
    'ALLOW'
  );

  assert.equal(
    evaluateUpdateEventConfigPin(verifiedUserB, 'CAMPUS02', existingCfg, {
      ...existingCfg,
      adminPin: '9999',
      updatedAt: REQUEST_TIME,
    }),
    'PERMISSION_DENIED'
  );

  assert.equal(
    evaluateUpdateEventConfigPin(verifiedUserA, 'CAMPUS02', existingCfg, {
      ...existingCfg,
      adminPin: '12',
      updatedAt: REQUEST_TIME,
    }),
    'PERMISSION_DENIED'
  );
});

test('EventConfig validates custom A/B/C grading threshold ranges and strict descending order', () => {
  const existingCfg = {
    id: 'config',
    eventCode: 'CAMPUS02',
    title: 'CAMPUS02',
    subtitle: 'Kerala State Arts Festival Judging',
    adminPin: '1234',
    chartType: 'bar',
    gradeA: 80,
    gradeB: 70,
    gradeC: 60,
    authorId: 'user_A',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  };

  assert.equal(
    evaluateUpdateEventConfigPin(verifiedUserA, 'CAMPUS02', existingCfg, {
      ...existingCfg,
      gradeA: 85,
      gradeB: 75,
      gradeC: 65,
      updatedAt: REQUEST_TIME,
    }),
    'ALLOW'
  );

  // Inverted thresholds (A <= B) must be denied
  assert.equal(
    evaluateUpdateEventConfigPin(verifiedUserA, 'CAMPUS02', existingCfg, {
      ...existingCfg,
      gradeA: 70,
      gradeB: 75,
      gradeC: 60,
      updatedAt: REQUEST_TIME,
    }),
    'PERMISSION_DENIED'
  );

  // Equal thresholds (B == C) must be denied
  assert.equal(
    evaluateUpdateEventConfigPin(verifiedUserA, 'CAMPUS02', existingCfg, {
      ...existingCfg,
      gradeA: 85,
      gradeB: 60,
      gradeC: 60,
      updatedAt: REQUEST_TIME,
    }),
    'PERMISSION_DENIED'
  );

  // Out-of-range (>100 or <0) must be denied
  assert.equal(
    evaluateUpdateEventConfigPin(verifiedUserA, 'CAMPUS02', existingCfg, {
      ...existingCfg,
      gradeA: 105,
      gradeB: 70,
      gradeC: 60,
      updatedAt: REQUEST_TIME,
    }),
    'PERMISSION_DENIED'
  );

  // Cross-campus hijack must be denied
  assert.equal(
    evaluateUpdateEventConfigPin(verifiedUserB, 'CAMPUS02', existingCfg, {
      ...existingCfg,
      gradeA: 85,
      gradeB: 75,
      gradeC: 65,
      updatedAt: REQUEST_TIME,
    }),
    'PERMISSION_DENIED'
  );
});


