import React, { useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { SINGLE_FILE_HTML_SOURCE } from '../utils/singleFileGenerator';

export const SingleFileModal: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SINGLE_FILE_HTML_SOURCE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback copy
    }
  };

  const handleDownload = () => {
    const blob = new Blob([SINGLE_FILE_HTML_SOURCE], {
      type: 'text/html;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kalolsavam-digital-judging-app.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-stone-200">
        <div>
          <div className="text-xs font-medium text-stone-500">
            <span>Standalone Deployment Artifact</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>HTML + Tailwind CSS + Firebase Firestore</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 mt-1 font-display text-balance">
            Single-File HTML Code · കലോത്സവം
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Complete single-file HTML code with your exact embedded Firebase configuration (`judgelive-7a621`), `enableIndexedDbPersistence`, and `onSnapshot` listeners.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-stone-800 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-700" />
                Copied to Clipboard
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Single-File Code
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-700 rounded-lg hover:bg-amber-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download .html File
          </button>
        </div>
      </section>

      <section className="bg-stone-900 text-stone-100 rounded-xl border border-stone-800 overflow-hidden">
        <div className="px-4 py-2.5 bg-stone-950 border-b border-stone-800 flex items-center justify-between text-xs font-mono text-stone-400">
          <span>kalolsavam-digital-judging-app.html</span>
          <span>projectId: judgelive-7a621 · onSnapshot · enableIndexedDbPersistence</span>
        </div>
        <pre className="p-4 text-xs font-mono overflow-x-auto max-h-[560px] leading-relaxed">
          <code>{SINGLE_FILE_HTML_SOURCE}</code>
        </pre>
      </section>
    </div>
  );
};
