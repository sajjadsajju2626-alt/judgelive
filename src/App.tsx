/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { ActiveTab, TopBar } from './components/TopBar';
import { LiveTabulationView } from './components/LiveTabulationView';
import { JudgePortalView } from './components/JudgePortalView';
import { AdminPanelView } from './components/AdminPanelView';
import { SingleFileModal } from './components/SingleFileModal';
import { AdminPinGate } from './components/AdminPinGate';
import { useFestivalStore } from './services/useFestivalStore';
import { isAdminUrlMode } from './utils/scoring';

const ADMIN_UNLOCKED_SESSION_KEY = 'kalolsavam_admin_pin_unlocked_v1';

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

  const [isAdminMode, setIsAdminMode] = useState<boolean>(() =>
    typeof window !== 'undefined' ? isAdminUrlMode(window.location.search) : false
  );

  const [isPinUnlocked, setIsPinUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(ADMIN_UNLOCKED_SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Default view is always Judge Scoring Portal; if ?admin=true is in URL, still allow Judge Portal or PIN-gated Admin/Tabulation
  const [activeTab, setActiveTab] = useState<ActiveTab>('judge');

  const [selectedItemId, setSelectedItemId] = useState<string>(
    items[0]?.id ?? 'item_bharatanatyam_hs'
  );
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>(
    participants[0]?.id ?? 'part_101'
  );

  useEffect(() => {
    const handlePopState = () => {
      const adminActive = isAdminUrlMode(window.location.search);
      setIsAdminMode(adminActive);
      if (!adminActive) {
        setActiveTab('judge');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSwitchTab = (tab: ActiveTab) => {
    if (!isAdminMode && tab !== 'judge') {
      return;
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleUnlockPin = () => {
    setIsPinUnlocked(true);
    try {
      sessionStorage.setItem(ADMIN_UNLOCKED_SESSION_KEY, 'true');
    } catch {
      // Ignore storage error
    }
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

  const effectiveTab: ActiveTab = isAdminMode ? activeTab : 'judge';

  const requiresPinGate =
    isAdminMode &&
    !isPinUnlocked &&
    (effectiveTab === 'admin' || effectiveTab === 'tabulation');

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-stone-900">
      <TopBar
        activeTab={effectiveTab}
        isAdminMode={isAdminMode}
        onSelectTab={handleSwitchTab}
      />

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

        {requiresPinGate ? (
          <AdminPinGate
            targetLabel={
              effectiveTab === 'admin' ? 'Admin Panel' : 'Live Tabulation'
            }
            onUnlock={handleUnlockPin}
            onBackToJudgePortal={() => handleSwitchTab('judge')}
          />
        ) : (
          <>
            {effectiveTab === 'judge' && (
              <JudgePortalView
                items={items}
                participants={participants}
                scores={scores}
                selectedItemId={selectedItemId}
                selectedParticipantId={selectedParticipantId}
                isAdminMode={isAdminMode}
                onSelectItem={handleSelectItem}
                onSelectParticipant={setSelectedParticipantId}
                onSubmitScore={submitJudgeScore}
                onViewLeaderboard={() => handleSwitchTab('tabulation')}
              />
            )}

            {isAdminMode && effectiveTab === 'tabulation' && (
              <LiveTabulationView
                items={items}
                participants={participants}
                scores={scores}
                selectedItemId={selectedItemId}
                onSelectItem={handleSelectItem}
                onJumpToJudgeScore={handleJumpToJudgeScore}
                onJumpToAdmin={() => handleSwitchTab('admin')}
              />
            )}

            {isAdminMode && effectiveTab === 'admin' && (
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

            {isAdminMode && effectiveTab === 'singlefile' && <SingleFileModal />}
          </>
        )}
      </main>

      <footer className="border-t border-stone-200 bg-white mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div>
            Kalolsavam Live — Kerala Arts Festival Digital Judging & Tabulation System
          </div>
          {isAdminMode && (
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => handleSwitchTab('judge')}
                className="hover:text-stone-900 transition-colors"
              >
                Judge Portal
              </button>
              <button
                type="button"
                onClick={() => handleSwitchTab('tabulation')}
                className="hover:text-stone-900 transition-colors"
              >
                Live Tabulation
              </button>
              <button
                type="button"
                onClick={() => handleSwitchTab('admin')}
                className="hover:text-stone-900 transition-colors"
              >
                Admin Panel
              </button>
              <button
                type="button"
                onClick={() => handleSwitchTab('singlefile')}
                className="hover:text-stone-900 transition-colors"
              >
                Single-File HTML
              </button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
