import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { DEFAULT_ADMIN_PIN, verifyAdminPin } from '../utils/scoring';

interface AdminPinGateProps {
  targetLabel: string;
  onUnlock: () => void;
  onBackToJudgePortal: () => void;
}

export const AdminPinGate: React.FC<AdminPinGateProps> = ({
  targetLabel,
  onUnlock,
  onBackToJudgePortal,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPin(pin, DEFAULT_ADMIN_PIN)) {
      setError(null);
      onUnlock();
    } else {
      setError('Invalid Admin PIN. Please enter the 4-digit festival PIN.');
    }
  };

  return (
    <section className="max-w-md mx-auto my-8 bg-white border border-stone-200 rounded-xl p-6 sm:p-8 space-y-6">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-800">
          <Lock className="w-3.5 h-3.5" />
          <span>Restricted Festival Access</span>
        </div>
        <h1 className="text-2xl font-bold text-stone-900 font-display">
          Enter Admin PIN
        </h1>
        <p className="text-sm text-stone-600">
          Authentication is required to view <strong>{targetLabel}</strong>. Enter the festival Admin PIN to continue.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="admin-pin-input"
            className="block text-xs font-semibold text-stone-700 mb-1.5"
          >
            Admin Security PIN
          </label>
          <input
            id="admin-pin-input"
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Enter 4-digit PIN (e.g. 2026)"
            className="w-full px-3.5 py-2.5 text-base font-mono tabular-nums tracking-widest bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-900"
          >
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={onBackToJudgePortal}
            className="px-4 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
          >
            Back to Judge Portal
          </button>

          <button
            type="submit"
            className="px-5 py-2.5 text-xs font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors"
          >
            Unlock Access
          </button>
        </div>
      </form>
    </section>
  );
};
