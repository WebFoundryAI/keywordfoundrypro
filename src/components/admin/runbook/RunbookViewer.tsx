import { renderMarkdown } from '@/lib/docs/markdown';
import type { RunbookDoc } from '@/lib/runbook/api';

interface RunbookViewerProps {
  runbook: RunbookDoc;
}

export function RunbookViewer({ runbook }: RunbookViewerProps) {
  // renderMarkdown now returns sanitized HTML (XSS-safe)
  const html = renderMarkdown(runbook.body_md);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {runbook.title}
        </h2>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>Version {runbook.version}</span>
          <span>•</span>
          <span>Updated {new Date(runbook.created_at).toLocaleString()}</span>
        </div>
      </div>

      <div
        className="prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
