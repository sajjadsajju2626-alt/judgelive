import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Deterministic Security Rule & Validation Blueprint Evaluator
 * Mirrors the exact boolean predicates in firestore.rules for campus_registry
 * and cross-device events/{festivalCode} workspace access.
 */

function isValidId(id: unknown): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && /^[a-zA-Z0-9_\-]+$/.test(id);
}

function isValidEventCode(code: unknown): boolean {
  return typeof code === 'string' && code.length >= 2 && code.length <= 32 && /^[A-Z0-9_\-]+$/.test(code);
}

function hasExactKeys(obj: Record<string, unknown>, required: string[], allowed: string[]): boolean {
  const keys = Object.keys(obj);
  const hasAll = required.every((k) => keys.includes(k));
  const hasOnly = keys.every((k) => allowed.includes(k));
  return hasAll && hasOnly;
}

function evaluateCampusRegistryWrite(
  festivalCode: string,
  incoming: Record<string, unknown>
): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!isValidEventCode(festivalCode)) return 'PERMISSION_DENIED';
  const reqKeys = ['festivalCode', 'title', 'adminPin', 'isActive', 'expiresAt'];
  const allowedKeys = [
    ...reqKeys,
    'subtitle',
    'activeItemId',
    'judgesCount',
    'stageLiveItems',
    'chartType',
    'gradeA',
    'gradeB',
    'gradeC',
    'createdAt',
    'updatedAt'
  ];
  if (!hasExactKeys(incoming, reqKeys, allowedKeys)) return 'PERMISSION_DENIED';
  if (typeof incoming.festivalCode !== 'string' || incoming.festivalCode.length < 2 || incoming.festivalCode.length > 32) {
    return 'PERMISSION_DENIED';
  }
  if (incoming.festivalCode !== festivalCode) return 'PERMISSION_DENIED';
  if (typeof incoming.title !== 'string' || incoming.title.length < 1 || incoming.title.length > 120) {
    return 'PERMISSION_DENIED';
  }
  if ('subtitle' in incoming && (typeof incoming.subtitle !== 'string' || incoming.subtitle.length > 160)) {
    return 'PERMISSION_DENIED';
  }
  if (
    typeof incoming.adminPin !== 'string' ||
    incoming.adminPin.length < 4 ||
    incoming.adminPin.length > 16 ||
    !/^[a-zA-Z0-9_\-]+$/.test(incoming.adminPin)
  ) {
    return 'PERMISSION_DENIED';
  }
  if ('activeItemId' in incoming && (typeof incoming.activeItemId !== 'string' || incoming.activeItemId.length > 64)) {
    return 'PERMISSION_DENIED';
  }
  if ('judgesCount' in incoming && (typeof incoming.judgesCount !== 'number' || (incoming.judgesCount !== 2 && incoming.judgesCount !== 3))) {
    return 'PERMISSION_DENIED';
  }
  if ('stageLiveItems' in incoming) {
    const map = incoming.stageLiveItems;
    if (!map || typeof map !== 'object' || Array.isArray(map)) {
      return 'PERMISSION_DENIED';
    }
    const mapKeys = Object.keys(map as Record<string, unknown>);
    if (!mapKeys.every((k) => ['Stage 1', 'Stage 2', 'Stage 3'].includes(k))) {
      return 'PERMISSION_DENIED';
    }
    for (const k of mapKeys) {
      const v = (map as Record<string, unknown>)[k];
      if (typeof v !== 'string' || v.length > 64) {
        return 'PERMISSION_DENIED';
      }
    }
  }
  if (typeof incoming.isActive !== 'boolean') return 'PERMISSION_DENIED';
  if (
    typeof incoming.expiresAt !== 'string' ||
    incoming.expiresAt.length !== 10 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(incoming.expiresAt)
  ) {
    return 'PERMISSION_DENIED';
  }
  if ('chartType' in incoming && !['bar', 'horizontal', 'doughnut'].includes(String(incoming.chartType))) {
    return 'PERMISSION_DENIED';
  }
  if ('gradeA' in incoming && (typeof incoming.gradeA !== 'number' || incoming.gradeA < 1 || incoming.gradeA > 100)) {
    return 'PERMISSION_DENIED';
  }
  if ('gradeB' in incoming && (typeof incoming.gradeB !== 'number' || incoming.gradeB < 1 || incoming.gradeB > 100)) {
    return 'PERMISSION_DENIED';
  }
  if ('gradeC' in incoming && (typeof incoming.gradeC !== 'number' || incoming.gradeC < 0 || incoming.gradeC > 100)) {
    return 'PERMISSION_DENIED';
  }
  if ('gradeA' in incoming && 'gradeB' in incoming && Number(incoming.gradeA) <= Number(incoming.gradeB)) {
    return 'PERMISSION_DENIED';
  }
  if ('gradeB' in incoming && 'gradeC' in incoming && Number(incoming.gradeB) <= Number(incoming.gradeC)) {
    return 'PERMISSION_DENIED';
  }
  if ('gradeA' in incoming && 'gradeC' in incoming && Number(incoming.gradeA) <= Number(incoming.gradeC)) {
    return 'PERMISSION_DENIED';
  }
  return 'ALLOW';
}

function evaluateEventScopeAccess(festivalCode: string): 'ALLOW' | 'PERMISSION_DENIED' {
  return isValidEventCode(festivalCode) ? 'ALLOW' : 'PERMISSION_DENIED';
}

const baseValidRegistry = {
  festivalCode: 'AS143',
  title: 'Al-Shifa Arts Festival',
  subtitle: 'Main Auditorium',
  adminPin: '4589',
  chartType: 'bar',
  gradeA: 80,
  gradeB: 70,
  gradeC: 60,
  isActive: true,
  expiresAt: '2026-12-31',
};

test('CampusRegistry allows valid cross-device registration, PIN assignment, and license sync without auth barrier', () => {
  assert.equal(evaluateCampusRegistryWrite('AS143', baseValidRegistry), 'ALLOW');
  assert.equal(
    evaluateCampusRegistryWrite('DEMOFEST', {
      ...baseValidRegistry,
      festivalCode: 'DEMOFEST',
      title: 'Kalolsavam Showcase (Demo)',
      adminPin: '1234',
    }),
    'ALLOW'
  );
});

test('CampusRegistry validates optional activeItemId, judgesCount, and stageLiveItems bounds', () => {
  assert.equal(evaluateCampusRegistryWrite('AS143', { ...baseValidRegistry, activeItemId: 'item_1' }), 'ALLOW');
  assert.equal(evaluateCampusRegistryWrite('AS143', { ...baseValidRegistry, activeItemId: '' }), 'ALLOW');
  assert.equal(evaluateCampusRegistryWrite('AS143', { ...baseValidRegistry, activeItemId: 'x'.repeat(65) }), 'PERMISSION_DENIED');
  assert.equal(evaluateCampusRegistryWrite('AS143', { ...baseValidRegistry, activeItemId: 123 }), 'PERMISSION_DENIED');

  assert.equal(evaluateCampusRegistryWrite('AS143', { ...baseValidRegistry, judgesCount: 2 }), 'ALLOW');
  assert.equal(evaluateCampusRegistryWrite('AS143', { ...baseValidRegistry, judgesCount: 3 }), 'ALLOW');
  assert.equal(evaluateCampusRegistryWrite('AS143', { ...baseValidRegistry, judgesCount: 4 }), 'PERMISSION_DENIED');
  assert.equal(evaluateCampusRegistryWrite('AS143', { ...baseValidRegistry, judgesCount: '2' }), 'PERMISSION_DENIED');

  assert.equal(
    evaluateCampusRegistryWrite('AS143', {
      ...baseValidRegistry,
      stageLiveItems: { 'Stage 1': 'item_1', 'Stage 2': 'item_2', 'Stage 3': '' },
    }),
    'ALLOW'
  );
  assert.equal(
    evaluateCampusRegistryWrite('AS143', {
      ...baseValidRegistry,
      stageLiveItems: { 'Stage 4': 'item_4' },
    }),
    'PERMISSION_DENIED'
  );
  assert.equal(
    evaluateCampusRegistryWrite('AS143', {
      ...baseValidRegistry,
      stageLiveItems: { 'Stage 1': 'x'.repeat(65) },
    }),
    'PERMISSION_DENIED'
  );
});

test('CampusRegistry rejects lowercase codes, mismatched festivalCode, shadow fields, and short PINs', () => {
  assert.equal(evaluateCampusRegistryWrite('as143', { ...baseValidRegistry, festivalCode: 'as143' }), 'PERMISSION_DENIED');
  assert.equal(evaluateCampusRegistryWrite('AS143', { ...baseValidRegistry, festivalCode: 'OTHER' }), 'PERMISSION_DENIED');
  assert.equal(evaluateCampusRegistryWrite('AS143', { ...baseValidRegistry, adminPin: '12' }), 'PERMISSION_DENIED');
  assert.equal(evaluateCampusRegistryWrite('AS143', { ...baseValidRegistry, isSuperAdmin: true }), 'PERMISSION_DENIED');
  assert.equal(evaluateCampusRegistryWrite('AS143', { ...baseValidRegistry, expiresAt: '31-12-2026' }), 'PERMISSION_DENIED');
});

test('CampusRegistry enforces strict descending grade thresholds when present', () => {
  assert.equal(
    evaluateCampusRegistryWrite('AS143', { ...baseValidRegistry, gradeA: 70, gradeB: 75, gradeC: 60 }),
    'PERMISSION_DENIED'
  );
  assert.equal(
    evaluateCampusRegistryWrite('AS143', { ...baseValidRegistry, gradeA: 85, gradeB: 60, gradeC: 60 }),
    'PERMISSION_DENIED'
  );
  assert.equal(
    evaluateCampusRegistryWrite('AS143', { ...baseValidRegistry, gradeA: 85, gradeB: 75, gradeC: 65 }),
    'ALLOW'
  );
});

test('Event workspace wildcard scope validates festivalCode without auth or timestamp expiry blocks', () => {
  assert.equal(evaluateEventScopeAccess('AS143'), 'ALLOW');
  assert.equal(evaluateEventScopeAccess('DEMOFEST'), 'ALLOW');
  assert.equal(evaluateEventScopeAccess('FEST-2026_A'), 'ALLOW');
  assert.equal(evaluateEventScopeAccess('a'), 'PERMISSION_DENIED');
  assert.equal(evaluateEventScopeAccess('lowercase'), 'PERMISSION_DENIED');
  assert.equal(evaluateEventScopeAccess('FEST/2026'), 'PERMISSION_DENIED');
  assert.equal(isValidId('item_1'), true);
  assert.equal(isValidId('bad$id'), false);
});
