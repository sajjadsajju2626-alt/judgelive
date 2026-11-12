import React, { useState } from 'react';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import { User } from 'firebase/auth';
import {
  CategoryType,
  CompetitionItem,
  Participant,
} from '../types';
import { ALLOWED_CATEGORIES } from '../utils/scoring';

interface AdminPanelViewProps {
  user: User | null;
  items: CompetitionItem[];
  participants: Participant[];
  onAddItem: (input: {
    name: string;
    malayalamName: string;
    category: CategoryType;
    stage: string;
  }) => Promise<{ ok: true; item: CompetitionItem } | { ok: false; error: string }>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onRegisterParticipant: (input: {
    itemId: string;
    chestNo: string;
    name: string;
    school: string;
  }) => Promise<{ ok: true; participant: Participant } | { ok: false; error: string }>;
  onDeleteParticipant: (participantId: string) => Promise<void>;
  onResetSeedData: () => void;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  user,
  items,
  participants,
  onAddItem,
  onDeleteItem,
  onRegisterParticipant,
  onDeleteParticipant,
  onResetSeedData,
  onSignIn,
  onSignOut,
}) => {
  const [itemName, setItemName] = useState('');
  const [malayalamName, setMalayalamName] = useState('');
  const [category, setCategory] = useState<CategoryType>('High School');
  const [stage, setStage] = useState('Stage 1 — Nila');
  const [itemMessage, setItemMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [selectedItemId, setSelectedItemId] = useState<string>(
    items[0]?.id ?? ''
  );
  const [chestNo, setChestNo] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [school, setSchool] = useState('');
  const [partMessage, setPartMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const activeItemId = items.some((i) => i.id === selectedItemId)
    ? selectedItemId
    : items[0]?.id ?? '';

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setItemMessage(null);
    const res = await onAddItem({
      name: itemName,
      malayalamName,
      category,
      stage,
    });
    if (!res.ok) {
      setItemMessage({ type: 'error', text: res.error });
      return;
    }
    setItemName('');
    setMalayalamName('');
    setSelectedItemId(res.item.id);
    setItemMessage({
      type: 'success',
      text: `Added competition item "${res.item.name}" (${res.item.category}).`,
    });
  };

  const handleCreateParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    setPartMessage(null);
    const res = await onRegisterParticipant({
      itemId: activeItemId,
      chestNo,
      name: participantName,
      school,
    });
    if (!res.ok) {
      setPartMessage({ type: 'error', text: res.error });
      return;
    }
    setChestNo('');
    setParticipantName('');
    setSchool('');
    setPartMessage({
      type: 'success',
      text: `Registered Chest #${res.participant.chestNo} (${res.participant.name}).`,
    });
  };

  return (
    <div className="space-y-8">
      {/* Header & Cloud Auth / Reset Controls */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-stone-200">
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-stone-500">
            <span>ഫെസ്റ്റിവൽ അഡ്മിൻ പാനൽ</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>Event & Chest Number Registry</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 font-display">
            Festival Administration Console
          </h1>
          <p className="text-sm text-stone-600">
            Configure competition items, assign participant chest numbers, and manage live Firestore records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3 text-xs text-stone-600">
              <span>Signed in as {user.email}</span>
              <button
                type="button"
                onClick={() => void onSignOut()}
                className="px-3 py-1.5 font-semibold text-stone-800 bg-white border border-stone-300 rounded-lg hover:bg-stone-50"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void onSignIn()}
              className="px-3.5 py-2 text-xs font-semibold text-stone-800 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
            >
              Sign In with Google for Cloud Write Sync
            </button>
          )}

          <button
            type="button"
            onClick={onResetSeedData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Demo Data
          </button>
        </div>
      </section>

      {/* Two-Column Creation Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Form 1: Add Competition Item */}
        <form
          onSubmit={(e) => void handleCreateItem(e)}
          className="bg-white border border-stone-200 rounded-xl p-6 space-y-4"
        >
          <div className="pb-3 border-b border-stone-100">
            <h2 className="text-lg font-bold text-stone-900">
              1. Add Competition Item
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Define a new festival event with category and stage assignment.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="admin-item-name"
                className="block text-xs font-semibold text-stone-700 mb-1"
              >
                Item Name (English) *
              </label>
              <input
                id="admin-item-name"
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g. Kuchipudi"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
            </div>

            <div>
              <label
                htmlFor="admin-item-ml"
                className="block text-xs font-semibold text-stone-700 mb-1"
              >
                Malayalam Name (മലയാളം പേര്)
              </label>
              <input
                id="admin-item-ml"
                type="text"
                value={malayalamName}
                onChange={(e) => setMalayalamName(e.target.value)}
                placeholder="e.g. കുച്ചിപ്പുടി"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="admin-item-category"
                className="block text-xs font-semibold text-stone-700 mb-1"
              >
                Competition Category *
              </label>
              <select
                id="admin-item-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as CategoryType)}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
              >
                {ALLOWED_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="admin-item-stage"
                className="block text-xs font-semibold text-stone-700 mb-1"
              >
                Venue / Stage *
              </label>
              <input
                id="admin-item-stage"
                type="text"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                placeholder="e.g. Stage 1 — Nila"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between gap-4">
            <span className="text-xs text-stone-500">Maximum Marks: 100 (4 × 25)</span>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Competition Item
            </button>
          </div>

          {itemMessage && (
            <div
              role="status"
              className={`p-3 rounded-lg border text-xs font-medium ${
                itemMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              {itemMessage.text}
            </div>
          )}
        </form>

        {/* Form 2: Register Participant Chest Number */}
        <form
          onSubmit={(e) => void handleCreateParticipant(e)}
          className="bg-white border border-stone-200 rounded-xl p-6 space-y-4"
        >
          <div className="pb-3 border-b border-stone-100">
            <h2 className="text-lg font-bold text-stone-900">
              2. Register Participant Chest Number
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Assign a unique chest number and contestant name to an active event.
            </p>
          </div>

          <div>
            <label
              htmlFor="admin-part-item"
              className="block text-xs font-semibold text-stone-700 mb-1"
            >
              Target Competition Item *
            </label>
            <select
              id="admin-part-item"
              value={activeItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
            >
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.name} ({it.category})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="admin-part-chest"
                className="block text-xs font-semibold text-stone-700 mb-1"
              >
                Chest Number *
              </label>
              <input
                id="admin-part-chest"
                type="text"
                value={chestNo}
                onChange={(e) => setChestNo(e.target.value)}
                placeholder="e.g. 105"
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="admin-part-name"
                className="block text-xs font-semibold text-stone-700 mb-1"
              >
                Contestant Full Name *
              </label>
              <input
                id="admin-part-name"
                type="text"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder="e.g. Bhavana Radhakrishnan"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="admin-part-school"
              className="block text-xs font-semibold text-stone-700 mb-1"
            >
              School / Team / District *
            </label>
            <input
              id="admin-part-school"
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="e.g. Silver Hills HSS, Kozhikode"
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
          </div>

          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-700 rounded-lg hover:bg-amber-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Register Participant
            </button>
          </div>

          {partMessage && (
            <div
              role="status"
              className={`p-3 rounded-lg border text-xs font-medium ${
                partMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              {partMessage.text}
            </div>
          )}
        </form>
      </div>

      {/* Registered Competition Items & Contestant Roster */}
      <section className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-stone-900">
              Registered Events & Contestants ({participants.length} total)
            </h2>
            <p className="text-xs text-stone-500">
              Manage competition items and participant chest numbers across all stages.
            </p>
          </div>
        </div>

        <div className="divide-y divide-stone-200">
          {items.map((item) => {
            const itemParts = participants.filter((p) => p.itemId === item.id);
            return (
              <div key={item.id} className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-stone-900">
                      {item.name}{' '}
                      {item.malayalamName && (
                        <span className="font-normal text-stone-600">
                          ({item.malayalamName})
                        </span>
                      )}
                    </h3>
                    <div className="text-xs text-stone-500 mt-0.5">
                      <span>{item.category}</span>
                      <span className="mx-1.5" aria-hidden="true">·</span>
                      <span>{item.stage}</span>
                      <span className="mx-1.5" aria-hidden="true">·</span>
                      <span>{itemParts.length} registered participants</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void onDeleteItem(item.id)}
                    aria-label={`Delete item ${item.name}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 rounded-md transition-colors self-start"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Event
                  </button>
                </div>

                {itemParts.length > 0 && (
                  <div className="overflow-x-auto border border-stone-200 rounded-lg">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-stone-50 border-b border-stone-200 text-xs font-semibold text-stone-600">
                          <th className="py-2 px-3">Chest No</th>
                          <th className="py-2 px-3">Participant Name</th>
                          <th className="py-2 px-3">School / Institution</th>
                          <th className="py-2 px-3 text-right">Remove</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200">
                        {itemParts.map((p) => (
                          <tr key={p.id} className="hover:bg-stone-50/70">
                            <td className="py-2 px-3 font-mono tabular-nums font-bold text-stone-900">
                              #{p.chestNo}
                            </td>
                            <td className="py-2 px-3 font-medium text-stone-900">
                              {p.name}
                            </td>
                            <td className="py-2 px-3 text-xs text-stone-600">
                              {p.school}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => void onDeleteParticipant(p.id)}
                                aria-label={`Remove Chest ${p.chestNo} ${p.name}`}
                                className="p-1 text-stone-400 hover:text-red-700 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
