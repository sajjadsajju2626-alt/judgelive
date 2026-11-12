export const SINGLE_FILE_HTML_SOURCE = `<!DOCTYPE html>
<html lang="ml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Kalolsavam Live — കലോത്സവം ഡിജിറ്റൽ ജഡ്ജിങ് ആപ്പ്</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Manrope:wght@400;500;600;700&family=Noto+Sans+Malayalam:wght@400;500;600;700&family=Outfit:wght@500;600;700&display=swap" rel="stylesheet" />
  <style>
    body { font-family: 'Manrope', 'Noto Sans Malayalam', sans-serif; background-color: #FAF8F5; color: #1C1917; }
    h1, h2, h3, .font-display { font-family: 'Outfit', 'Noto Sans Malayalam', sans-serif; }
    .tabular-nums { font-family: 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }
  </style>
</head>
<body class="min-h-screen flex flex-col">
  <!-- Non-Intrusive Toast Notification -->
  <div id="sync-toast" role="status" aria-live="polite" class="hidden fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-stone-900 text-white shadow-lg border border-stone-700 text-sm font-semibold transition-opacity">
    <span class="text-emerald-400">✓</span>
    <span id="sync-toast-text">Marks Synced to Cloud!</span>
  </div>

  <!-- Top Bar (Judge Portal only by default; full nav when ?admin=true) -->
  <header class="flex items-center justify-between gap-4 md:gap-8 px-4 sm:px-8 py-4 bg-white border-b border-stone-200 sticky top-0 z-30">
    <a href="#" onclick="switchView('judge'); return false;" class="text-base sm:text-lg font-bold tracking-tight text-stone-900 whitespace-nowrap shrink-0 font-display">
      Kalolsavam Live · കലോത്സവം
    </a>
    <nav class="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm font-medium text-stone-600">
      <button onclick="switchView('judge')" id="nav-judge" class="hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 border-b-2 border-amber-700 text-stone-900 font-semibold pb-0.5">Judge Portal</button>
      <button onclick="switchView('tabulation')" id="nav-tabulation" class="hidden hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 pb-0.5">Live Tabulation</button>
      <button onclick="switchView('admin')" id="nav-admin" class="hidden hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 pb-0.5">Admin Panel</button>
    </nav>
    <div class="hidden sm:flex items-center gap-3 shrink-0">
      <span id="header-badge" class="text-xs font-medium text-stone-500">Judge Scoring Terminal</span>
    </div>
  </header>

  <main class="max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 flex-1 space-y-8">
    <!-- Status Strip -->
    <div class="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-stone-200 text-xs text-stone-600">
      <div>
        <span class="font-semibold text-stone-900">കലോത്സവം ഡിജിറ്റൽ ജഡ്ജിങ് ആപ്പ്</span>
        <span class="mx-2">·</span>
        <span id="persistence-status">IndexedDB Offline Persistence Active</span>
      </div>
      <div class="tabular-nums" id="sync-status">Project: judgelive-7a621 · Real-Time Firestore Sync</div>
    </div>

    <!-- ADMIN PIN GATE (Shown when ?admin=true and accessing Tabulation or Admin Panel before unlocking) -->
    <section id="view-pin-gate" class="hidden max-w-md mx-auto my-8 bg-white border border-stone-200 rounded-xl p-6 sm:p-8 space-y-5">
      <div>
        <div class="text-xs font-semibold text-amber-800">Restricted Festival Access</div>
        <h1 class="text-2xl font-bold text-stone-900 mt-1 font-display">Enter Admin PIN</h1>
        <p class="text-sm text-stone-600 mt-1">Enter the 4-digit Admin PIN (default: <code class="tabular-nums font-semibold">2026</code>) to unlock Live Tabulation and Admin controls.</p>
      </div>
      <form onsubmit="handlePinVerify(event)" class="space-y-4">
        <div>
          <label for="admin-pin-input" class="block text-xs font-semibold text-stone-700 mb-1.5">Admin Security PIN</label>
          <input id="admin-pin-input" type="password" inputmode="numeric" required placeholder="Enter PIN (2026)" class="w-full px-3.5 py-2.5 text-base tabular-nums tracking-widest border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600" />
        </div>
        <div id="pin-error" class="hidden p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-900">
          Invalid Admin PIN. Please try again.
        </div>
        <div class="flex items-center justify-between gap-3 pt-2">
          <button type="button" onclick="switchView('judge')" class="px-4 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50">Back to Judge Portal</button>
          <button type="submit" class="px-5 py-2.5 text-xs font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800">Unlock Access</button>
        </div>
      </form>
    </section>

    <!-- VIEW 1: JUDGE PORTAL (Default View) -->
    <section id="view-judge" class="space-y-6">
      <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-stone-900 font-display">Judge Scoring Portal (ജഡ്ജിങ് പോർട്ടൽ)</h1>
          <p class="text-sm text-stone-600 mt-1">Select your event and chest number to submit criterion-wise or total marks with offline persistence.</p>
        </div>

        <!-- Persistent Judge Identity Banner & Editor -->
        <div>
          <div id="judge-session-locked" class="hidden items-center gap-3 px-4 py-2 bg-white border border-stone-200 rounded-lg text-xs">
            <span class="text-stone-500">Active Judge:</span>
            <span id="judge-session-display" class="font-bold text-stone-900">J1 — Kalamandalam Jury</span>
            <button type="button" onclick="toggleJudgeEditor(true)" class="ml-2 px-2.5 py-1 font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-md">Change Judge</button>
          </div>

          <div id="judge-session-editor" class="flex flex-wrap items-center gap-2 p-2 bg-white border border-stone-200 rounded-lg">
            <select id="judge-slot" onchange="handleJudgeIdentityChange()" class="px-2.5 py-1.5 text-xs font-semibold bg-stone-50 border border-stone-300 rounded-md">
              <option value="J1">J1 — Judge 1</option>
              <option value="J2">J2 — Judge 2</option>
              <option value="J3">J3 — Judge 3</option>
            </select>
            <input id="judge-name" type="text" required placeholder="Enter Judge Name" value="Kalamandalam Hymavathy" class="px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-md" />
            <button type="button" onclick="saveAndLockJudgeSession()" class="px-3 py-1.5 text-xs font-semibold text-white bg-stone-900 rounded-md hover:bg-stone-800">Save Judge</button>
          </div>
        </div>
      </div>

      <form onsubmit="handleScoreSubmit(event)" class="bg-white border border-stone-200 rounded-xl p-6 space-y-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="judge-item" class="block text-xs font-semibold text-stone-700 mb-1.5">1. Competition Item</label>
            <select id="judge-item" onchange="populateJudgeParticipants()" class="w-full px-3 py-2.5 text-sm bg-white border border-stone-300 rounded-lg"></select>
          </div>
          <div>
            <label for="judge-participant" class="block text-xs font-semibold text-stone-700 mb-1.5">2. Chest Number</label>
            <select id="judge-participant" onchange="loadExistingJudgeScore()" class="w-full px-3 py-2.5 text-sm bg-white border border-stone-300 rounded-lg"></select>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 border-t border-stone-200">
          <div>
            <label for="crit-rhythm" class="block text-xs font-semibold text-stone-700 mb-1">Rhythm / താളം (0–25)</label>
            <input id="crit-rhythm" type="number" min="0" max="25" step="0.5" value="0" oninput="updateLiveTotal()" class="w-full px-3 py-2 text-sm tabular-nums bg-white border border-stone-300 rounded-lg" />
          </div>
          <div>
            <label for="crit-expression" class="block text-xs font-semibold text-stone-700 mb-1">Expression / ഭാവം (0–25)</label>
            <input id="crit-expression" type="number" min="0" max="25" step="0.5" value="0" oninput="updateLiveTotal()" class="w-full px-3 py-2 text-sm tabular-nums bg-white border border-stone-300 rounded-lg" />
          </div>
          <div>
            <label for="crit-perfection" class="block text-xs font-semibold text-stone-700 mb-1">Perfection / പൂർണ്ണത (0–25)</label>
            <input id="crit-perfection" type="number" min="0" max="25" step="0.5" value="0" oninput="updateLiveTotal()" class="w-full px-3 py-2 text-sm tabular-nums bg-white border border-stone-300 rounded-lg" />
          </div>
          <div>
            <label for="crit-overall" class="block text-xs font-semibold text-stone-700 mb-1">Presentation / അവതരണം (0–25)</label>
            <input id="crit-overall" type="number" min="0" max="25" step="0.5" value="0" oninput="updateLiveTotal()" class="w-full px-3 py-2 text-sm tabular-nums bg-white border border-stone-300 rounded-lg" />
          </div>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-stone-200">
          <div class="flex items-baseline gap-3">
            <span class="text-sm font-medium text-stone-600">Calculated Total Score:</span>
            <span id="judge-total-preview" class="text-2xl font-bold text-stone-900 tabular-nums">0 / 100</span>
          </div>
          <div class="flex items-center gap-3">
            <button type="button" onclick="resetScoreInputs()" class="px-4 py-2.5 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50">Reset Fields</button>
            <button type="submit" class="px-5 py-2.5 text-sm font-semibold text-white bg-amber-700 rounded-lg hover:bg-amber-800 transition-colors">
              Submit & Sync Marks
            </button>
          </div>
        </div>
      </form>
    </section>

    <!-- VIEW 2: LIVE TABULATION (Requires ?admin=true & PIN 2026) -->
    <section id="view-tabulation" class="hidden space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-stone-900 font-display">Live Tabulation & Leaderboard</h1>
          <p class="text-sm text-stone-600 mt-1">Real-time average scores, grades (A / B / C), and ordinal ranks (1st, 2nd, 3rd).</p>
        </div>
        <div class="flex items-center gap-3">
          <label for="tab-item-select" class="text-xs font-medium text-stone-600">Event:</label>
          <select id="tab-item-select" onchange="renderTabulation()" class="px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"></select>
        </div>
      </div>

      <div class="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-stone-200 bg-stone-50 text-xs font-semibold text-stone-600">
                <th class="py-3 px-4">Rank</th>
                <th class="py-3 px-4">Chest No</th>
                <th class="py-3 px-4">Participant & School</th>
                <th class="py-3 px-4 text-right">Judge 1</th>
                <th class="py-3 px-4 text-right">Judge 2</th>
                <th class="py-3 px-4 text-right">Judge 3</th>
                <th class="py-3 px-4 text-right">Average</th>
                <th class="py-3 px-4 text-right">Grade</th>
              </tr>
            </thead>
            <tbody id="leaderboard-body" class="divide-y divide-stone-200 text-sm"></tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- VIEW 3: ADMIN PANEL (Requires ?admin=true & PIN 2026) -->
    <section id="view-admin" class="hidden space-y-8">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold text-stone-900 font-display">Festival Admin Console</h1>
        <p class="text-sm text-stone-600 mt-1">Add competition items and register participant chest numbers.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <form onsubmit="handleAddItem(event)" class="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
          <h2 class="text-lg font-bold text-stone-900">1. Add Competition Item</h2>
          <div>
            <label class="block text-xs font-semibold text-stone-700 mb-1">Item Name (English)</label>
            <input id="admin-item-name" type="text" required placeholder="e.g. Kuchipudi" class="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-stone-700 mb-1">Malayalam Name</label>
            <input id="admin-item-ml" type="text" placeholder="e.g. കുച്ചിപ്പുടി" class="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-stone-700 mb-1">Category</label>
              <select id="admin-item-cat" class="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg">
                <option value="High School">High School</option>
                <option value="Higher Secondary">Higher Secondary</option>
                <option value="General">General</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-stone-700 mb-1">Stage</label>
              <input id="admin-item-stage" type="text" required value="Stage 1 — Nila" class="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg" />
            </div>
          </div>
          <button type="submit" class="px-4 py-2 text-sm font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800">Add Competition Item</button>
        </form>

        <form onsubmit="handleAddParticipant(event)" class="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
          <h2 class="text-lg font-bold text-stone-900">2. Register Participant Chest No</h2>
          <div>
            <label class="block text-xs font-semibold text-stone-700 mb-1">Select Item</label>
            <select id="admin-part-item" class="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"></select>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-semibold text-stone-700 mb-1">Chest No</label>
              <input id="admin-part-chest" type="text" required placeholder="105" class="w-full px-3 py-2 text-sm tabular-nums border border-stone-300 rounded-lg" />
            </div>
            <div class="col-span-2">
              <label class="block text-xs font-semibold text-stone-700 mb-1">Participant Name</label>
              <input id="admin-part-name" type="text" required placeholder="Full Name" class="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-stone-700 mb-1">School / Institution</label>
            <input id="admin-part-school" type="text" required placeholder="GHSS Kozhikode" class="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg" />
          </div>
          <button type="submit" class="px-4 py-2 text-sm font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800">Register Participant</button>
        </form>
      </div>
    </section>
  </main>

  <script type="module">
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
    import {
      getFirestore,
      collection,
      doc,
      setDoc,
      onSnapshot,
      enableIndexedDbPersistence,
      serverTimestamp
    } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

    // Exact Embedded Firebase Configuration
    const firebaseConfig = {
      apiKey: "AIzaSyCkJuoYBM0JpCygr7ippauAr1vta_EHHOs",
      authDomain: "judgelive-7a621.firebaseapp.com",
      projectId: "judgelive-7a621",
      storageBucket: "judgelive-7a621.firebasestorage.app",
      messagingSenderId: "33980204166",
      appId: "1:33980204166:web:5fd31578977729d5337d07",
      measurementId: "G-4FGPKBC4EM"
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    enableIndexedDbPersistence(db).then(() => {
      document.getElementById("persistence-status").textContent = "Offline Persistence Enabled (IndexedDB)";
    }).catch((err) => {
      document.getElementById("persistence-status").textContent = "Persistence Mode: " + (err.code || "Local");
    });

    const DEFAULT_ADMIN_PIN = "2026";
    const JUDGE_SESSION_KEY = "kalolsavam_judge_session_v1";
    const isAdminUrl = new URLSearchParams(window.location.search).get("admin") === "true";
    let isAdminUnlocked = sessionStorage.getItem("kalolsavam_admin_unlocked") === "true";
    let pendingProtectedView = "tabulation";

    // Show Admin & Tabulation nav links ONLY when ?admin=true is present in URL
    if (isAdminUrl) {
      document.getElementById("nav-tabulation").classList.remove("hidden");
      document.getElementById("nav-admin").classList.remove("hidden");
      document.getElementById("header-badge").textContent = "Admin & Tabulation Mode";
    }

    // Load Persistent Judge Session from localStorage
    function initJudgeSession() {
      try {
        const saved = JSON.parse(localStorage.getItem(JUDGE_SESSION_KEY) || "null");
        if (saved && saved.judgeSlot && saved.judgeName) {
          document.getElementById("judge-slot").value = saved.judgeSlot;
          document.getElementById("judge-name").value = saved.judgeName;
          updateJudgeLockedBanner(saved.judgeSlot, saved.judgeName, true);
        }
      } catch {}
    }

    function updateJudgeLockedBanner(slot, name, locked) {
      document.getElementById("judge-session-display").textContent = \`\${slot} — \${name}\`;
      document.getElementById("judge-session-locked").classList.toggle("hidden", !locked);
      document.getElementById("judge-session-locked").classList.toggle("flex", locked);
      document.getElementById("judge-session-editor").classList.toggle("hidden", locked);
    }

    window.toggleJudgeEditor = (openEditor) => {
      const slot = document.getElementById("judge-slot").value;
      const name = document.getElementById("judge-name").value.trim() || "Judge";
      updateJudgeLockedBanner(slot, name, !openEditor);
    };

    window.saveAndLockJudgeSession = () => {
      const judgeSlot = document.getElementById("judge-slot").value;
      const judgeName = document.getElementById("judge-name").value.trim() || "Kalamandalam Jury";
      document.getElementById("judge-name").value = judgeName;
      localStorage.setItem(JUDGE_SESSION_KEY, JSON.stringify({ judgeSlot, judgeName }));
      updateJudgeLockedBanner(judgeSlot, judgeName, true);
      window.populateJudgeParticipants();
    };

    window.handleJudgeIdentityChange = () => {
      window.populateJudgeParticipants();
    };

    window.showToast = (message) => {
      const toast = document.getElementById("sync-toast");
      document.getElementById("sync-toast-text").textContent = message;
      toast.classList.remove("hidden");
      setTimeout(() => toast.classList.add("hidden"), 3500);
    };

    window.state = {
      items: [
        { id: "item_1", name: "Bharatanatyam", malayalamName: "ഭരതനാട്യം", category: "High School", stage: "Stage 1 — Nila" },
        { id: "item_2", name: "Mohiniyattam", malayalamName: "മോഹിനിയാട്ടം", category: "Higher Secondary", stage: "Stage 2 — Periyar" }
      ],
      participants: [
        { id: "p_101", itemId: "item_1", chestNo: "101", name: "Meenakshi S. Nair", school: "Providence Girls HSS, Kozhikode" },
        { id: "p_102", itemId: "item_1", chestNo: "102", name: "Devika R. Menon", school: "Sacred Heart CGHSS, Thrissur" },
        { id: "p_104", itemId: "item_1", chestNo: "104", name: "Gouri Nandana V.", school: "BSS Gurukulam HSS, Alathur" }
      ],
      scores: [
        { id: "item_1_p_101_J1", itemId: "item_1", participantId: "p_101", chestNo: "101", judgeSlot: "J1", judgeName: "Kalamandalam Hymavathy", rhythm: 24, expression: 23, perfection: 23, overall: 24, total: 94 },
        { id: "item_1_p_102_J1", itemId: "item_1", participantId: "p_102", chestNo: "102", judgeSlot: "J1", judgeName: "Kalamandalam Hymavathy", rhythm: 22, expression: 22, perfection: 21, overall: 22, total: 87 }
      ]
    };

    onSnapshot(collection(db, "items"), (snap) => {
      if (!snap.empty) {
        window.state.items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        window.refreshAllSelects();
      }
    }, () => {});

    onSnapshot(collection(db, "participants"), (snap) => {
      if (!snap.empty) {
        window.state.participants = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        window.populateJudgeParticipants();
        window.renderTabulation();
      }
    }, () => {});

    onSnapshot(collection(db, "scores"), (snap) => {
      if (!snap.empty) {
        window.state.scores = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        window.populateJudgeParticipants();
        window.renderTabulation();
      }
    }, () => {});

    window.switchView = (view) => {
      if (!isAdminUrl && view !== "judge") return;
      if (isAdminUrl && !isAdminUnlocked && (view === "tabulation" || view === "admin")) {
        pendingProtectedView = view;
        document.getElementById("view-judge").classList.add("hidden");
        document.getElementById("view-tabulation").classList.add("hidden");
        document.getElementById("view-admin").classList.add("hidden");
        document.getElementById("view-pin-gate").classList.remove("hidden");
        return;
      }
      document.getElementById("view-pin-gate").classList.add("hidden");
      ["judge", "tabulation", "admin"].forEach(v => {
        document.getElementById("view-" + v).classList.toggle("hidden", v !== view);
        const navBtn = document.getElementById("nav-" + v);
        if (navBtn) {
          navBtn.classList.toggle("border-b-2", v === view);
          navBtn.classList.toggle("border-amber-700", v === view);
          navBtn.classList.toggle("text-stone-900", v === view);
          navBtn.classList.toggle("font-semibold", v === view);
        }
      });
    };

    window.handlePinVerify = (e) => {
      e.preventDefault();
      const entered = document.getElementById("admin-pin-input").value.trim();
      if (entered === DEFAULT_ADMIN_PIN) {
        isAdminUnlocked = true;
        sessionStorage.setItem("kalolsavam_admin_unlocked", "true");
        document.getElementById("pin-error").classList.add("hidden");
        window.switchView(pendingProtectedView);
      } else {
        document.getElementById("pin-error").classList.remove("hidden");
      }
    };

    window.refreshAllSelects = () => {
      const opts = window.state.items.map(it => \`<option value="\${it.id}">\${it.name} (\${it.category})</option>\`).join("");
      document.getElementById("tab-item-select").innerHTML = opts;
      document.getElementById("judge-item").innerHTML = opts;
      document.getElementById("admin-part-item").innerHTML = opts;
      window.populateJudgeParticipants();
      window.renderTabulation();
    };

    window.populateJudgeParticipants = () => {
      const itemId = document.getElementById("judge-item").value;
      const slot = document.getElementById("judge-slot").value;
      const currentSelected = document.getElementById("judge-participant").value;
      const parts = window.state.participants.filter(p => p.itemId === itemId);
      document.getElementById("judge-participant").innerHTML = parts.map(p => {
        const isScored = window.state.scores.some(s => s.itemId === itemId && s.participantId === p.id && s.judgeSlot === slot);
        const statusSuffix = isScored ? " (Scored ✓)" : "";
        return \`<option value="\${p.id}">Chest \${p.chestNo} — \${p.name}\${statusSuffix}</option>\`;
      }).join("");
      if (parts.some(p => p.id === currentSelected)) {
        document.getElementById("judge-participant").value = currentSelected;
      }
      window.loadExistingJudgeScore();
    };

    window.resetScoreInputs = () => {
      document.getElementById("crit-rhythm").value = 0;
      document.getElementById("crit-expression").value = 0;
      document.getElementById("crit-perfection").value = 0;
      document.getElementById("crit-overall").value = 0;
      window.updateLiveTotal();
    };

    window.updateLiveTotal = () => {
      const r = Number(document.getElementById("crit-rhythm").value || 0);
      const e = Number(document.getElementById("crit-expression").value || 0);
      const p = Number(document.getElementById("crit-perfection").value || 0);
      const o = Number(document.getElementById("crit-overall").value || 0);
      document.getElementById("judge-total-preview").textContent = (r + e + p + o) + " / 100";
    };

    window.loadExistingJudgeScore = () => {
      const itemId = document.getElementById("judge-item").value;
      const partId = document.getElementById("judge-participant").value;
      const slot = document.getElementById("judge-slot").value;
      const found = window.state.scores.find(s => s.itemId === itemId && s.participantId === partId && s.judgeSlot === slot);
      if (found) {
        document.getElementById("crit-rhythm").value = found.rhythm;
        document.getElementById("crit-expression").value = found.expression;
        document.getElementById("crit-perfection").value = found.perfection;
        document.getElementById("crit-overall").value = found.overall;
        window.updateLiveTotal();
      } else {
        window.resetScoreInputs();
      }
    };

    window.renderTabulation = () => {
      const itemId = document.getElementById("tab-item-select").value;
      const parts = window.state.participants.filter(p => p.itemId === itemId);
      const rows = parts.map(p => {
        const sc = window.state.scores.filter(s => s.itemId === itemId && s.participantId === p.id);
        const j1 = sc.find(s => s.judgeSlot === "J1")?.total ?? null;
        const j2 = sc.find(s => s.judgeSlot === "J2")?.total ?? null;
        const j3 = sc.find(s => s.judgeSlot === "J3")?.total ?? null;
        const vals = [j1, j2, j3].filter(v => v !== null);
        const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : null;
        const grade = avg === null ? "Pending" : avg >= 80 ? "A Grade" : avg >= 70 ? "B Grade" : avg >= 60 ? "C Grade" : "No Grade";
        return { p, j1, j2, j3, avg, grade };
      }).sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));

      const labels = ["1st", "2nd", "3rd"];
      document.getElementById("leaderboard-body").innerHTML = rows.map((r, i) => \`
        <tr class="hover:bg-stone-50">
          <td class="py-3 px-4 font-bold tabular-nums">\${r.avg !== null ? (labels[i] || (i + 1) + "th") : "Pending"}</td>
          <td class="py-3 px-4 font-semibold tabular-nums">#\${r.p.chestNo}</td>
          <td class="py-3 px-4"><div class="font-semibold text-stone-900">\${r.p.name}</div><div class="text-xs text-stone-500">\${r.p.school}</div></td>
          <td class="py-3 px-4 text-right tabular-nums">\${r.j1 ?? "—"}</td>
          <td class="py-3 px-4 text-right tabular-nums">\${r.j2 ?? "—"}</td>
          <td class="py-3 px-4 text-right tabular-nums">\${r.j3 ?? "—"}</td>
          <td class="py-3 px-4 text-right font-bold tabular-nums">\${r.avg !== null ? r.avg.toFixed(2) : "—"}</td>
          <td class="py-3 px-4 text-right text-xs font-medium text-stone-700">\${r.grade}</td>
        </tr>
      \`).join("");
    };

    window.handleScoreSubmit = async (e) => {
      e.preventDefault();
      window.saveAndLockJudgeSession();
      const itemId = document.getElementById("judge-item").value;
      const participantId = document.getElementById("judge-participant").value;
      const judgeSlot = document.getElementById("judge-slot").value;
      const judgeName = document.getElementById("judge-name").value;
      const rhythm = Number(document.getElementById("crit-rhythm").value);
      const expression = Number(document.getElementById("crit-expression").value);
      const perfection = Number(document.getElementById("crit-perfection").value);
      const overall = Number(document.getElementById("crit-overall").value);
      const total = rhythm + expression + perfection + overall;
      const part = window.state.participants.find(p => p.id === participantId);
      const id = \`\${itemId}_\${participantId}_\${judgeSlot}\`;
      const docData = { id, itemId, participantId, chestNo: part?.chestNo || "101", judgeSlot, judgeName, rhythm, expression, perfection, overall, total, updatedAt: new Date().toISOString() };
      window.state.scores = [...window.state.scores.filter(s => s.id !== id), docData];
      window.showToast("Marks Synced to Cloud!");
      window.populateJudgeParticipants();
      window.renderTabulation();

      // Advance to next unscored participant and reset score inputs
      const parts = window.state.participants.filter(p => p.itemId === itemId);
      const nextUnscored = parts.find(p => p.id !== participantId && !window.state.scores.some(s => s.itemId === itemId && s.participantId === p.id && s.judgeSlot === judgeSlot));
      if (nextUnscored) {
        document.getElementById("judge-participant").value = nextUnscored.id;
      }
      window.resetScoreInputs();
      try { await setDoc(doc(db, "scores", id), { ...docData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }); } catch {}
    };

    window.handleAddItem = async (e) => {
      e.preventDefault();
      const id = "item_" + Date.now();
      const item = {
        id,
        name: document.getElementById("admin-item-name").value,
        malayalamName: document.getElementById("admin-item-ml").value,
        category: document.getElementById("admin-item-cat").value,
        stage: document.getElementById("admin-item-stage").value
      };
      window.state.items.push(item);
      window.refreshAllSelects();
      e.target.reset();
      try { await setDoc(doc(db, "items", id), { ...item, maxMarks: 100, createdAt: serverTimestamp() }); } catch {}
    };

    window.handleAddParticipant = async (e) => {
      e.preventDefault();
      const id = "part_" + Date.now();
      const part = {
        id,
        itemId: document.getElementById("admin-part-item").value,
        chestNo: document.getElementById("admin-part-chest").value,
        name: document.getElementById("admin-part-name").value,
        school: document.getElementById("admin-part-school").value
      };
      window.state.participants.push(part);
      window.populateJudgeParticipants();
      window.renderTabulation();
      e.target.reset();
      try { await setDoc(doc(db, "participants", id), { ...part, createdAt: serverTimestamp() }); } catch {}
    };

    initJudgeSession();
    window.refreshAllSelects();
  </script>
</body>
</html>`;
