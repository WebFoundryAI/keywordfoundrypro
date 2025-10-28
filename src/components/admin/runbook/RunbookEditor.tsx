'use client';

import { useState } from 'react';

interface RunbookEditorProps {
  initialTitle: string;
  initialBody: string;
  onSave: (title: string, body: string) => Promise<void>;
  saving: boolean;
}

export function RunbookEditor({
  initialTitle,
  initialBody,
  onSave,
  saving,
}: RunbookEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);

  async function handleSave() {
    if (!title.trim() || !body.trim()) {
      alert('Title and body are required');
      return;
    }

    await onSave(title, body);
  }

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="runbook-title"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Runbook Title
        </label>
        <input
          id="runbook-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., Operations Runbook v2"
          disabled={saving}
        />
      </div>

      <div>
        <label
          htmlFor="runbook-body"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Runbook Content (Markdown)
        </label>
        <textarea
          id="runbook-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full h-[600px] px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          placeholder="# Section 1

## Procedure

1. Step one
2. Step two"
          disabled={saving}
        />
        <p className="mt-2 text-sm text-gray-500">
          Supports Markdown formatting: headings, lists, code blocks, links, bold/italic
        </p>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          Saving creates a new version. Previous versions remain accessible.
        </p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
        >
          {saving ? 'Saving...' : 'Save New Version'}
        </button>
      </div>
    </div>
  );
}
