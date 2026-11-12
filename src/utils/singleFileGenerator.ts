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
  <!-- Top Bar -->
  <header class="flex items-center justify-between gap-8 px-6 py-4 bg-white border-b border-stone-200 sticky top-0 z-30">
    <a href="#tabulation" onclick="switchView('tabulation'); return false;" class="text-lg font-bold tracking-tight text-stone-900 whitespace-nowrap shrink-0 font-display">
      കലോത്സവം Digital Judging
    </a>
    <nav class="flex items-center gap-6 text-sm font-medium text-stone-600">
      <button onclick="switchView('tabulation')" id="nav-tabulation" class="hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 border-b-2 border-amber-700 text-stone-900 pb-0.5">Live Tabulation</button>
      <button onclick="switchView('judge')" id="nav-judge" class="hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 pb-0.5">Judge Portal</button>
      <button onclick="switchView('admin')" id="nav-admin" class="hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 pb-0.5">Admin Panel</button>
    </nav>
    <div class="flex items-center gap-3 shrink-0">
      <button onclick="switchView('judge')" class="px-4 py-2 text-xs font-semibold text-white bg-amber-700 rounded-lg hover:bg-amber-800 transition-colors whitespace-nowrap shrink-0">
        Enter Judge Marks
      </button>
    </div>
  </header>

  <main class="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex-1 space-y-8">
    <!-- Status Strip -->
    <div class="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-stone-200 text-xs text-stone-600">
      <div>
        <span class="font-semibold text-stone-900">Kerala State Arts Festival Tabulation</span>
        <span class="mx-2">·</span>
        <span id="persistence-status">IndexedDB Offline Persistence Active</span>
      </div>
      <div class="tabular-nums" id="sync-status">Real-Time Firestore Listener Ready</div>
    </div>

    <!-- VIEW 1: LIVE TABULATION -->
    <section id="view-tabulation" class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-stone-900">Live Tabulation & Leaderboard</h1>
          <p class="text-sm text-stone-600 mt-1">Real-time average scores, grades (A / B / C), and ordinal ranks (1st, 2nd, 3rd).</p>
        </div>
        <div class="flex items-center gap-3">
          <label for="tab-item-select" class="text-xs font-medium text-stone-600">Event:</label>
          <select id="tab-item-select" onchange="renderTabulation()" class="px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"></select>
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

    <!-- VIEW 2: JUDGE PORTAL -->
    <section id="view-judge" class="hidden space-y-6">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold text-stone-900">Judge Scoring Portal (ജഡ്ജിങ് പോർട്ടൽ)</h1>
        <p class="text-sm text-stone-600 mt-1">Select event and chest number to submit criterion-wise marks with offline persistence.</p>
      </div>

      <form onsubmit="handleScoreSubmit(event)" class="bg-white border border-stone-200 rounded-xl p-6 space-y-6">
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label class="block text-xs font-semibold text-stone-700 mb-1.5">Competition Item</label>
            <select id="judge-item" onchange="populateJudgeParticipants()" class="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"></select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-stone-700 mb-1.5">Chest Number</label>
            <select id="judge-participant" onchange="loadExistingJudgeScore()" class="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg"></select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-stone-700 mb-1.5">Judge Panel Slot</label>
            <select id="judge-slot" onchange="loadExistingJudgeScore()" class="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg">
              <option value="J1">J1 — Judge 1</option>
              <option value="J2">J2 — Judge 2</option>
              <option value="J3">J3 — Judge 3</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-stone-700 mb-1.5">Judge Name</label>
            <input id="judge-name" type="text" required value="Kalamandalam Jury" class="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg" />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 border-t border-stone-200">
          <div>
            <label class="block text-xs font-semibold text-stone-700 mb-1">Rhythm / താളം (0–25)</label>
            <input id="crit-rhythm" type="number" min="0" max="25" step="0.5" value="23" oninput="updateLiveTotal()" class="w-full px-3 py-2 text-sm tabular-nums bg-white border border-stone-300 rounded-lg" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-stone-700 mb-1">Expression / ഭാവം (0–25)</label>
            <input id="crit-expression" type="number" min="0" max="25" step="0.5" value="23" oninput="updateLiveTotal()" class="w-full px-3 py-2 text-sm tabular-nums bg-white border border-stone-300 rounded-lg" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-stone-700 mb-1">Perfection / പൂർണ്ണത (0–25)</label>
            <input id="crit-perfection" type="number" min="0" max="25" step="0.5" value="22" oninput="updateLiveTotal()" class="w-full px-3 py-2 text-sm tabular-nums bg-white border border-stone-300 rounded-lg" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-stone-700 mb-1">Presentation / അവതരണം (0–25)</label>
            <input id="crit-overall" type="number" min="0" max="25" step="0.5" value="22" oninput="updateLiveTotal()" class="w-full px-3 py-2 text-sm tabular-nums bg-white border border-stone-300 rounded-lg" />
          </div>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-stone-200">
          <div class="flex items-baseline gap-3">
            <span class="text-sm font-medium text-stone-600">Calculated Total Score:</span>
            <span id="judge-total-preview" class="text-2xl font-bold text-stone-900 tabular-nums">90 / 100</span>
          </div>
          <button type="submit" class="px-5 py-2.5 text-sm font-semibold text-white bg-amber-700 rounded-lg hover:bg-amber-800 transition-colors">
            Submit & Sync Marks
          </button>
        </div>
      </form>
    </section>

    <!-- VIEW 3: ADMIN PANEL -->
    <section id="view-admin" class="hidden space-y-8">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold text-stone-900">Festival Admin Console</h1>
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

    // Local fallback state synchronized with Firestore onSnapshot
    window.state = {
      items: [
        { id: "item_1", name: "Bharatanatyam", malayalamName: "ഭരതനാട്യം", category: "High School", stage: "Stage 1 — Nila" },
        { id: "item_2", name: "Mohiniyattam", malayalamName: "മോഹിനിയാട്ടം", category: "Higher Secondary", stage: "Stage 2 — Periyar" }
      ],
      participants: [
        { id: "p_101", itemId: "item_1", chestNo: "101", name: "Meenakshi S. Nair", school: "Providence Girls HSS, Kozhikode" },
        { id: "p_102", itemId: "item_1", chestNo: "102", name: "Devika R. Menon", school: "Sacred Heart CGHSS, Thrissur" }
      ],
      scores: [
        { id: "item_1_p_101_J1", itemId: "item_1", participantId: "p_101", chestNo: "101", judgeSlot: "J1", judgeName: "Kalamandalam Hymavathy", rhythm: 24, expression: 23, perfection: 23, overall: 24, total: 94 },
        { id: "item_1_p_102_J1", itemId: "item_1", participantId: "p_102", chestNo: "102", judgeSlot: "J1", judgeName: "Kalamandalam Hymavathy", rhythm: 22, expression: 22, perfection: 21, overall: 22, total: 87 }
      ]
    };

    // Real-time listeners (onSnapshot)
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
        window.renderTabulation();
      }
    }, () => {});

    window.switchView = (view) => {
      ["tabulation", "judge", "admin"].forEach(v => {
        document.getElementById("view-" + v).classList.toggle("hidden", v !== view);
        document.getElementById("nav-" + v).classList.toggle("border-b-2", v === view);
        document.getElementById("nav-" + v).classList.toggle("border-amber-700", v === view);
      });
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
      const parts = window.state.participants.filter(p => p.itemId === itemId);
      document.getElementById("judge-participant").innerHTML = parts.map(p => \`<option value="\${p.id}">Chest #\${p.chestNo} — \${p.name}</option>\`).join("");
      window.loadExistingJudgeScore();
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
      window.renderTabulation();
      window.switchView("tabulation");
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

    window.refreshAllSelects();
  </script>
</body>
</html>`;
