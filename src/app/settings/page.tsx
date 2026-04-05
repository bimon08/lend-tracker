'use client';

import { useState, useRef } from 'react';
import {
  Download,
  Upload,
  Trash2,
  ChevronRight,
  Database,
  Info,
} from 'lucide-react';
import { dataLayer } from '@/lib/db';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';

export default function SettingsPage() {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast, ToastElement } = useToast();

  const handleExport = async () => {
    try {
      const jsonData = await dataLayer.exportAllData();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lendtracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Data exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      showToast('Export failed', 'error');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const result = await dataLayer.importData(text);
      showToast(
        `Imported ${result.personsCount} people, ${result.transactionsCount} transactions, ${result.paymentsCount} payments`
      );
    } catch (error) {
      console.error('Import failed:', error);
      showToast('Import failed — invalid file', 'error');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearAll = async () => {
    try {
      await dataLayer.clearAllData();
      setShowClearConfirm(false);
      showToast('All data cleared');
    } catch (error) {
      console.error('Clear failed:', error);
      showToast('Failed to clear data', 'error');
    }
  };

  return (
    <div className="page-container">
      {ToastElement}

      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your data</p>
        </div>
      </div>

      {/* Data Management */}
      <div className="settings-group">
        <div className="settings-group-title">Data Management</div>

        <div className="settings-item" onClick={handleExport} id="export-data">
          <div className="settings-item-icon">
            <Download size={18} />
          </div>
          <div className="settings-item-info">
            <div className="settings-item-title">Export Data</div>
            <div className="settings-item-subtitle">
              Download all data as JSON backup
            </div>
          </div>
          <ChevronRight size={16} className="settings-item-chevron" />
        </div>

        <div
          className="settings-item"
          onClick={() => fileInputRef.current?.click()}
          id="import-data"
        >
          <div className="settings-item-icon">
            <Upload size={18} />
          </div>
          <div className="settings-item-info">
            <div className="settings-item-title">
              {importing ? 'Importing...' : 'Import Data'}
            </div>
            <div className="settings-item-subtitle">
              Restore from a JSON backup file
            </div>
          </div>
          <ChevronRight size={16} className="settings-item-chevron" />
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* About */}
      <div className="settings-group">
        <div className="settings-group-title">About</div>

        <div className="settings-item" style={{ cursor: 'default' }}>
          <div className="settings-item-icon">
            <Database size={18} />
          </div>
          <div className="settings-item-info">
            <div className="settings-item-title">Storage</div>
            <div className="settings-item-subtitle">
              Data stored locally on this device (IndexedDB)
            </div>
          </div>
        </div>

        <div className="settings-item" style={{ cursor: 'default' }}>
          <div className="settings-item-icon">
            <Info size={18} />
          </div>
          <div className="settings-item-info">
            <div className="settings-item-title">LendTracker</div>
            <div className="settings-item-subtitle">
              v1.0.0 · Made with ❤️
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="settings-group">
        <div className="settings-group-title" style={{ color: 'var(--color-danger)' }}>
          Danger Zone
        </div>

        <div
          className="settings-item danger"
          onClick={() => setShowClearConfirm(true)}
          id="clear-all-data"
        >
          <div className="settings-item-icon">
            <Trash2 size={18} />
          </div>
          <div className="settings-item-info">
            <div className="settings-item-title">Clear All Data</div>
            <div className="settings-item-subtitle">
              Permanently delete everything. Cannot be undone.
            </div>
          </div>
          <ChevronRight size={16} className="settings-item-chevron" />
        </div>
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Clear All Data?"
        message="This will permanently delete ALL your people, transactions, and payments. Export your data first if you want to keep it. This action cannot be undone."
        confirmLabel="Delete Everything"
        onConfirm={handleClearAll}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}
