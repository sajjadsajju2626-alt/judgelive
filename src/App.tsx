/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ActiveTab, TopBar } from './components/TopBar';
import { LiveTabulationView } from './components/LiveTabulationView';
import { JudgePortalView } from './components/JudgePortalView';
import { AdminPanelView } from './components/AdminPanelView';
import { SingleFileModal } from './components/SingleFileModal';
import { useFestivalStore } from './services/useFestivalStore';

export default function App() {
  const {
    user,
    persistenceStatus,
    isOnline,
    syncMode,
    items,
    participants,
    scores,
    signInWithGoogle,
    signOutUser,
    addItem,
    deleteItem,
    registerParticipant,
    deleteParticipant,
    submitJudgeScore,
    resetToSeedData,
  } = useFestivalStore();

  const [activeTab, setActiveTab] = useState<ActiveTab>('tabulation');
  const [selectedItemId, setSelectedItemId] = useState<string>(
    items[0]?.id ?? 'item_bharatanatyam_hs'
  );
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>(
    participants[0]?.id ?? 'part_101'
  );

  const handleSwitchTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleSelectItem = (itemId: string) => {
    setSelectedItemId(itemId);
    const firstPart = participants.find((p) => p.itemId === itemId);
    if (firstPart) {
      setSelectedParticipantId(firstPart.id);
    }
  };

  const handleJumpToJudgeScore = (itemId: string, participantId: string) => {
    setSelectedItemId(itemId);
    setSelectedParticipantId(participantId);
    handleSwitchTab('judge');
  };

  const persistenceLabel =
    persistenceStatus === 'enabled'
      ? 'IndexedDB Offline Persistence Active'
      : persistenceStatus === 'multi-tab'
      ? 'Multi-Tab Sync Active'
      : 'Local Persistence Ready';

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-stone-900">
      <TopBar activeTab={activeTab} onSelectTab={handleSwitchTab} />

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 flex-1 space-y-8">
        {/* Quiet Contextual Metadata Bar (Unboxed Typography per Zero-Pill Discipline) */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-stone-200 text-xs text-stone-600">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-stone-900">
              കലോത്സവം ഡിജിറ്റൽ ജഡ്ജിങ് ആപ്പ്
            </span>
            <span aria-hidden="true">·</span>
            <span>{persistenceLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{isOnline ? 'Network Online' : 'Offline Mode (Auto-Queuing)'}</span>
          </div>

          <div className="flex items-center gap-2 font-mono tabular-nums text-stone-500">
            <span>Project: judgelive-7a621</span>
            <span aria-hidden="true">·</span>
            <span>
              {syncMode === 'firestore-live'
                ? 'Firestore Live Cloud Sync'
                : 'Real-Time Local + IndexedDB Sync'}
            </span>
          </div>
        </div>

        {activeTab === 'tabulation' && (
          <LiveTabulationView
            items={items}
            participants={participants}
            scores={scores}
            selectedItemId={selectedItemId}
            onSelectItem={handleSelectItem}
            onJumpToJudgeScore={handleJumpToJudgeScore}
            onJumpToAdmin={() => setActiveTab('admin')}
          />
        )}

        {activeTab === 'judge' && (
          <JudgePortalView
            items={items}
            participants={participants}
            scores={scores}
            selectedItemId={selectedItemId}
            selectedParticipantId={selectedParticipantId}
            onSelectItem={handleSelectItem}
            onSelectParticipant={setSelectedParticipantId}
            onSubmitScore={submitJudgeScore}
            onViewLeaderboard={() => setActiveTab('tabulation')}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPanelView
            user={user}
            items={items}
            participants={participants}
            onAddItem={addItem}
            onDeleteItem={deleteItem}
            onRegisterParticipant={registerParticipant}
            onDeleteParticipant={deleteParticipant}
            onResetSeedData={resetToSeedData}
            onSignIn={signInWithGoogle}
            onSignOut={signOutUser}
          />
        )}

        {activeTab === 'singlefile' && <SingleFileModal />}
      </main>

      <footer className="border-t border-stone-200 bg-white mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div>
            Kalolsavam Live — Kerala Arts Festival Digital Judging & Tabulation System
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('tabulation')}
              className="hover:text-stone-900 transition-colors"
            >
              Leaderboard
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('judge')}
              className="hover:text-stone-900 transition-colors"
            >
              Judge Portal
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className="hover:text-stone-900 transition-colors"
            >
              Admin Panel
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('singlefile')}
              className="hover:text-stone-900 transition-colors"
            >
              Single-File HTML
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
