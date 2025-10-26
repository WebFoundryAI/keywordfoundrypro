'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkIsAdmin } from '@/lib/runbook/api';
import {
  listBackupManifests,
  getBackupManifest,
} from '@/lib/backup/runner';
import {
  getRetentionStats,
  previewRetentionCleanup,
  cleanupOldBackups,
  type RetentionResult,
} from '@/lib/backup/retention';
import {
  restoreSoftDeletedRecord,
  listSoftDeletedRecords,
} from '@/lib/backup/restore';

export default function BackupsPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [manifests, setManifests] = useState<any[]>([]);
  const [retentionStats, setRetentionStats] = useState<any>(null);
  const [cleanupPreview, setCleanupPreview] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'manifests' | 'soft-delete'>(
    'manifests'
  );

  // Soft-delete state
  const [softDeleteTable, setSoftDeleteTable] = useState('projects');
  const [softDeleteRecords, setSoftDeleteRecords] = useState<any[]>([]);

  useEffect(() => {
    async function init() {
      const adminStatus = await checkIsAdmin();

      if (!adminStatus) {
        router.push('/');
        return;
      }

      setIsAdmin(true);
      await loadData();
      setLoading(false);
    }

    init();
  }, [router]);

  async function loadData() {
    const [manifestsData, stats, preview] = await Promise.all([
      listBackupManifests(30),
      getRetentionStats(),
      previewRetentionCleanup(),
    ]);

    setManifests(manifestsData);
    setRetentionStats(stats);
    setCleanupPreview(preview);
  }

  async function loadSoftDeleteRecords() {
    const records = await listSoftDeletedRecords(softDeleteTable, 100);
    setSoftDeleteRecords(records);
  }

  async function handleRestore(recordId: string) {
    if (!confirm('Are you sure you want to restore this record?')) return;

    const result = await restoreSoftDeletedRecord(softDeleteTable, recordId);

    if (result.success) {
      alert('Record restored successfully');
      await loadSoftDeleteRecords();
    } else {
      alert(`Error restoring record: ${result.error}`);
    }
  }

  async function handleCleanup() {
    if (
      !confirm(
        `This will permanently delete ${cleanupPreview?.manifests_to_delete || 0} backup manifests and ${cleanupPreview?.files_to_delete || 0} files. Continue?`
      )
    ) {
      return;
    }

    const result = await cleanupOldBackups();
    alert(
      `Cleanup complete. Deleted ${result.deleted_backups} manifests and ${result.deleted_files} files.`
    );

    if (result.errors.length > 0) {
      console.error('Cleanup errors:', result.errors);
    }

    await loadData();
  }

  useEffect(() => {
    if (activeTab === 'soft-delete') {
      loadSoftDeleteRecords();
    }
  }, [activeTab, softDeleteTable]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading backups...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Header */}
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Backups & Restore
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Admin backup management (DEV/STAGING only)
            </p>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('manifests')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'manifests'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                Backup Manifests
              </button>
              <button
                onClick={() => setActiveTab('soft-delete')}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'soft-delete'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                Soft-Delete Restore
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'manifests' ? (
              <>
                {/* Retention Stats */}
                {retentionStats && (
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-900">
                        {retentionStats.total_backups}
                      </div>
                      <div className="text-sm text-blue-700">Total Backups</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-900">
                        {retentionStats.backups_within_retention}
                      </div>
                      <div className="text-sm text-green-700">Active (30d)</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-orange-900">
                        {retentionStats.backups_expired}
                      </div>
                      <div className="text-sm text-orange-700">Expired</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <button
                        onClick={handleCleanup}
                        disabled={!cleanupPreview?.manifests_to_delete}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 text-sm font-medium"
                      >
                        Cleanup Old Backups
                      </button>
                    </div>
                  </div>
                )}

                {/* Manifests List */}
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Recent Backups
                  </h2>
                  {manifests.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">
                      No backup manifests found
                    </p>
                  ) : (
                    manifests.map((manifest) => (
                      <div
                        key={manifest.id}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-3">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded ${
                                  manifest.status === 'success'
                                    ? 'bg-green-100 text-green-800'
                                    : manifest.status === 'partial'
                                      ? 'bg-orange-100 text-orange-800'
                                      : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {manifest.status}
                              </span>
                              <span className="text-sm text-gray-600">
                                {new Date(manifest.run_at).toLocaleString()}
                              </span>
                              <span className="text-sm text-gray-500">
                                {manifest.duration_ms}ms
                              </span>
                            </div>
                            {manifest.notes && (
                              <p className="text-sm text-gray-600 mt-2">
                                {manifest.notes}
                              </p>
                            )}
                            <div className="mt-2 text-xs text-gray-500">
                              {Object.keys(manifest.tables || {}).length} tables backed
                              up
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Soft-Delete Restore */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">
                      Table:
                    </label>
                    <select
                      value={softDeleteTable}
                      onChange={(e) => setSoftDeleteTable(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="projects">Projects</option>
                      <option value="project_snapshots">Project Snapshots</option>
                      <option value="cached_results">Cached Results</option>
                      <option value="exports">Exports</option>
                      <option value="clusters">Clusters</option>
                      <option value="cluster_members">Cluster Members</option>
                      <option value="serp_snapshots">SERP Snapshots</option>
                    </select>
                    <button
                      onClick={loadSoftDeleteRecords}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                    >
                      Refresh
                    </button>
                  </div>

                  {softDeleteRecords.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">
                      No soft-deleted records found in {softDeleteTable}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {softDeleteRecords.map((record) => (
                        <div
                          key={record.id}
                          className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
                        >
                          <div className="flex-1 font-mono text-sm text-gray-800">
                            <div>ID: {record.id}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Deleted:{' '}
                              {new Date(record.deleted_at).toLocaleString()}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRestore(record.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                          >
                            Restore
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
