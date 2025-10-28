'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getLatestRunbook,
  getAllRunbookVersions,
  updateRunbook,
  checkIsAdmin,
  type RunbookDoc,
} from '@/lib/runbook/api';
import { RunbookViewer } from '@/components/admin/runbook/RunbookViewer';
import { RunbookEditor } from '@/components/admin/runbook/RunbookEditor';

export default function RunbookPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [currentRunbook, setCurrentRunbook] = useState<RunbookDoc | null>(null);
  const [allVersions, setAllVersions] = useState<RunbookDoc[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function init() {
      const adminStatus = await checkIsAdmin();

      if (!adminStatus) {
        router.push('/');
        return;
      }

      setIsAdmin(true);
      await loadRunbook();
      setLoading(false);
    }

    init();
  }, [router]);

  async function loadRunbook() {
    const latest = await getLatestRunbook();
    const versions = await getAllRunbookVersions();

    setCurrentRunbook(latest);
    setAllVersions(versions);
    setSelectedVersion(latest?.version || null);
  }

  async function handleSave(title: string, body_md: string) {
    setSaving(true);

    const { data, error } = await updateRunbook(
      { title, body_md },
      '' // User ID will be set by auth context
    );

    if (error) {
      alert(`Error saving runbook: ${error}`);
    } else {
      await loadRunbook();
      setEditMode(false);
    }

    setSaving(false);
  }

  function handleVersionChange(version: number) {
    const doc = allVersions.find((v) => v.version === version);
    if (doc) {
      setCurrentRunbook(doc);
      setSelectedVersion(version);
      setEditMode(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading runbook...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Operations Runbook
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Admin-only operational procedures and runbooks
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Version selector */}
                <select
                  value={selectedVersion || ''}
                  onChange={(e) => handleVersionChange(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  disabled={editMode}
                >
                  {allVersions.map((v) => (
                    <option key={v.version} value={v.version}>
                      v{v.version} - {new Date(v.created_at).toLocaleDateString()}
                    </option>
                  ))}
                </select>

                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                  >
                    Edit Runbook
                  </button>
                ) : (
                  <button
                    onClick={() => setEditMode(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {editMode && currentRunbook ? (
              <RunbookEditor
                initialTitle={currentRunbook.title}
                initialBody={currentRunbook.body_md}
                onSave={handleSave}
                saving={saving}
              />
            ) : currentRunbook ? (
              <RunbookViewer runbook={currentRunbook} />
            ) : (
              <div className="text-center text-gray-600 py-12">
                No runbook found. Click &quot;Edit Runbook&quot; to create one.
              </div>
            )}
          </div>
        </div>

        {/* Version history */}
        {!editMode && allVersions.length > 1 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Version History
            </h2>
            <div className="space-y-2">
              {allVersions.map((v) => (
                <div
                  key={v.version}
                  className={`flex items-center justify-between p-3 rounded-md ${
                    v.version === selectedVersion
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-medium text-gray-900">
                      v{v.version}
                    </span>
                    <span className="text-sm text-gray-600">{v.title}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {new Date(v.created_at).toLocaleString()}
                    </span>
                    {v.version !== selectedVersion && (
                      <button
                        onClick={() => handleVersionChange(v.version)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
