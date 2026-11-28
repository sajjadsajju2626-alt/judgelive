import "dotenv/config";
import express from "express";
import path from "node:path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const PORT = 3000;
const GEMINI_MODEL = "gemini-4-hydrogen";

interface CriteriaRequestItem {
  key: string;
  itemName: string;
  malayalamName?: string;
  category?: string;
  itemType?: string;
}

const criteriaCache = new Map<string, string[]>();
let cachedAi: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  const apiKey = String(process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) return null;
  if (!cachedAi) {
    cachedAi = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return cachedAi;
}

function buildCacheKey(itemName: string, malayalamName = "", category = "", itemType = ""): string {
  return `${itemName.trim().toLowerCase()}__${malayalamName.trim().toLowerCase()}__${category.trim().toLowerCase()}__${itemType.trim().toLowerCase()}`;
}

function formatBilingualCriterion(raw: unknown): string {
  let text = String(raw || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  text = text.replace(/\(\s*0\s*[-–]\s*25\s*\)\s*$/i, "").trim();
  if (text.length > 72) {
    text = text.slice(0, 72).trim();
  }
  return `${text} (0-25)`.slice(0, 80);
}

function extractFourCriteria(rawList: unknown): string[] | null {
  if (!Array.isArray(rawList)) return null;
  const cleaned = rawList
    .map(formatBilingualCriterion)
    .filter((entry) => entry.length > 6)
    .slice(0, 4);
  return cleaned.length === 4 ? cleaned : null;
}

function getApiErrorDetails(err: unknown): { status: number; message: string } {
  const rawMsg = err instanceof Error ? err.message : String(err || "Failed to generate judging criteria.");
  const lower = rawMsg.toLowerCase();
  if (lower.includes("api_key_invalid") || lower.includes("permission_denied") || lower.includes("403")) {
    return {
      status: 403,
      message: "Gemini API key is invalid or unauthorized. Please check Settings > Secrets.",
    };
  }
  if (lower.includes("resource_exhausted") || lower.includes("429")) {
    return {
      status: 429,
      message: "Gemini API rate limit reached. Please try again in a moment.",
    };
  }
  return {
    status: 502,
    message: rawMsg || "Gemini AI criteria generation failed.",
  };
}

const SINGLE_SYSTEM_INSTRUCTION = [
  "You are an expert Kerala School Kalolsavam and Campus Arts Festival judging coordinator.",
  "Given an arts festival competition item (English name, optional Malayalam name, and competition category), generate EXACTLY 4 distinct judging criteria worth 25 marks each (100 total).",
  'Every criterion MUST strictly follow the bilingual format: "English Title / മലയാളം പേര് (0-25)".',
  "Use authentic, concise Malayalam judging terminology alongside clear English titles, keeping each string under 75 characters.",
  "Tailor the criteria specifically to the art form (e.g., for Duffmuttu: Baith/singing, Daph rhythm/beats, synchronization, traditional attire; for Oppana: rhythmic clapping/chuvadu, song/ishal, bridal coordination, expression; for Calligraphy: script accuracy & proportions, stroke control, layout & balance, neatness & aesthetics; for Mimicry/Mono Act: voice/character variation, timing & spontaneity, script/theme, stage presence).",
  "Never include bullet numbers or extra commentary. Return valid JSON matching the schema.",
].join(" ");

const BATCH_SYSTEM_INSTRUCTION = [
  "You are an expert Kerala School Kalolsavam and Campus Arts Festival judging coordinator.",
  "For each competition item in the input array, generate EXACTLY 4 distinct judging criteria worth 25 marks each (100 total).",
  'Every criterion MUST strictly follow the bilingual format: "English Title / മലയാളം പേര് (0-25)".',
  "Use authentic, concise Malayalam judging terminology alongside clear English titles, keeping each string under 75 characters.",
  "Preserve each item's exact `key` in the output array. Return valid JSON matching the schema.",
].join(" ");

async function generateCriteriaForSingleItem(
  ai: GoogleGenAI,
  itemName: string,
  malayalamName = "",
  category = "",
  itemType = ""
): Promise<string[]> {
  const promptLines = [
    `Item Name (English): ${itemName}`,
    malayalamName ? `Malayalam Name: ${malayalamName}` : "",
    category ? `Category: ${category}` : "",
    itemType ? `Item Type: ${itemType}${itemType.toLowerCase() === "group" ? " (emphasize team coordination, synchronization, formations, and collective stage presentation)" : ""}` : "",
  ].filter(Boolean);

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: `Generate 4 tailored judging criteria for:\n${promptLines.join("\n")}`,
    config: {
      systemInstruction: SINGLE_SYSTEM_INSTRUCTION,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          criteria: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Exactly 4 judging criteria formatted as "English Title / മലയാളം പേര് (0-25)".',
          },
        },
        required: ["criteria"],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? "{}").trim()) as { criteria?: unknown };
  const criteria = extractFourCriteria(parsed.criteria);
  if (!criteria) {
    throw new Error("Gemini AI did not return 4 valid criteria labels.");
  }
  return criteria;
}

async function generateCriteriaForBatch(
  ai: GoogleGenAI,
  items: CriteriaRequestItem[]
): Promise<Record<string, string[]>> {
  const payloadText = JSON.stringify(
    items.map((it) => ({
      key: it.key,
      itemName: it.itemName,
      malayalamName: it.malayalamName || "",
      category: it.category || "General",
      itemType: it.itemType || "Individual",
    }))
  );

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: `Generate 4 tailored bilingual judging criteria for each item below:\n${payloadText}`,
    config: {
      systemInstruction: BATCH_SYSTEM_INSTRUCTION,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          results: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                key: { type: Type.STRING },
                criteria: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ["key", "criteria"],
            },
          },
        },
        required: ["results"],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? "{}").trim()) as {
    results?: Array<{ key?: unknown; criteria?: unknown }>;
  };

  const out: Record<string, string[]> = {};
  if (Array.isArray(parsed.results)) {
    for (const row of parsed.results) {
      const k = String(row?.key || "").trim();
      const criteria = extractFourCriteria(row?.criteria);
      if (k && criteria) {
        out[k] = criteria;
      }
    }
  }

  const missing = items.filter((it) => !out[it.key]);
  if (missing.length > 0) {
    await Promise.all(
      missing.slice(0, 10).map(async (it) => {
        try {
          const single = await generateCriteriaForSingleItem(ai, it.itemName, it.malayalamName, it.category, it.itemType);
          out[it.key] = single;
        } catch {
          // Leave missing if individual generation fails so client uses local fallback
        }
      })
    );
  }
  return out;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      aiAvailable: Boolean(String(process.env.GEMINI_API_KEY || "").trim()),
    });
  });

  app.post("/api/ai/criteria", async (req, res) => {
    const itemName = String(req.body?.itemName || "").trim().slice(0, 120);
    const malayalamName = String(req.body?.malayalamName || "").trim().slice(0, 120);
    const category = String(req.body?.category || "").trim().slice(0, 60);
    const rawItemType = String(req.body?.itemType || "").trim();
    const itemType = rawItemType.toLowerCase() === "group" ? "Group" : rawItemType ? "Individual" : "";

    if (!itemName) {
      res.status(400).json({ error: "Item Name is required to generate criteria." });
      return;
    }

    const cacheKey = buildCacheKey(itemName, malayalamName, category, itemType);
    const cached = criteriaCache.get(cacheKey);
    if (cached) {
      res.json({ criteria: cached, model: GEMINI_MODEL, cached: true });
      return;
    }

    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({ error: "GEMINI_API_KEY is not configured on the server." });
      return;
    }

    try {
      const criteria = await generateCriteriaForSingleItem(ai, itemName, malayalamName, category, itemType);
      criteriaCache.set(cacheKey, criteria);
      res.json({ criteria, model: GEMINI_MODEL, cached: false });
    } catch (err) {
      const { status, message } = getApiErrorDetails(err);
      res.status(status).json({ error: message });
    }
  });

  app.post("/api/ai/criteria/batch", async (req, res) => {
    const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
    const normalizedItems: CriteriaRequestItem[] = rawItems
      .slice(0, 25)
      .map((entry: Record<string, unknown>) => ({
        key: String(entry?.key || "").trim().slice(0, 160),
        itemName: String(entry?.itemName || "").trim().slice(0, 120),
        malayalamName: String(entry?.malayalamName || "").trim().slice(0, 120),
        category: String(entry?.category || "").trim().slice(0, 60),
        itemType: String(entry?.itemType || "").trim().toLowerCase() === "group" ? "Group" : "Individual",
      }))
      .filter((entry: CriteriaRequestItem) => Boolean(entry.key && entry.itemName));

    if (normalizedItems.length === 0) {
      res.json({ results: {}, model: GEMINI_MODEL });
      return;
    }

    const results: Record<string, string[]> = {};
    const uncached: CriteriaRequestItem[] = [];

    for (const item of normalizedItems) {
      const cacheKey = buildCacheKey(item.itemName, item.malayalamName, item.category, item.itemType);
      const cached = criteriaCache.get(cacheKey);
      if (cached) {
        results[item.key] = cached;
      } else {
        uncached.push(item);
      }
    }

    if (uncached.length === 0) {
      res.json({ results, model: GEMINI_MODEL, cached: true });
      return;
    }

    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({ error: "GEMINI_API_KEY is not configured on the server." });
      return;
    }

    try {
      const generated = await generateCriteriaForBatch(ai, uncached);
      for (const item of uncached) {
        const crit = generated[item.key];
        if (crit) {
          results[item.key] = crit;
          criteriaCache.set(buildCacheKey(item.itemName, item.malayalamName, item.category, item.itemType), crit);
        }
      }
      res.json({ results, model: GEMINI_MODEL, cached: false });
    } catch (err) {
      const { status, message } = getApiErrorDetails(err);
      res.status(status).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(process.cwd(), "dist");
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
