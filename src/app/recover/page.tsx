'use client';

import { useState } from 'react';
import { Card, Button } from '@heroui/react';
import { ArrowLeft, Database, Download, Upload, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { dataLayer } from '@/lib/db';
import { useToast } from '@/components/Toast';

interface OldPerson {
  id: string;
  name: string;
  phone?: string;
  createdAt?: string | Date;
}

interface OldTransaction {
  id: string;
  personId: string;
  type: 'lend' | 'borrow';
  amount: number;
  date: string | Date;
  dueDate?: string | Date;
  note?: string;
  status: 'pending' | 'partial' | 'settled';
  createdAt?: string | Date;
}

interface OldPayment {
  id: string;
  transactionId: string;
  amount: number;
  date: string | Date;
  note?: string;
  createdAt?: string | Date;
}

// Try common Dexie DB names
const DB_NAMES = ['LendTrackerDB', 'lend-tracker', 'lendtracker', 'LendTracker'];

async function findAndReadIndexedDB(): Promise<{
  persons: OldPerson[];
  transactions: OldTransaction[];
  payments: OldPayment[];
  dbName: string;
} | null> {
  // First try to list all databases
  if ('databases' in indexedDB) {
    const dbs = await indexedDB.databases();
    const allNames = dbs.map((d) => d.name).filter(Boolean) as string[];
    // Try all found databases
    for (const name of allNames) {
      const result = await tryReadDB(name);
      if (result) return { ...result, dbName: name };
    }
    return null;
  }

  // Fallback: try known names
  for (const name of DB_NAMES) {
    const result = await tryReadDB(name);
    if (result) return { ...result, dbName: name };
  }
  return null;
}

function tryReadDB(
  dbName: string
): Promise<{
  persons: OldPerson[];
  transactions: OldTransaction[];
  payments: OldPayment[];
} | null> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(dbName);

      request.onerror = () => resolve(null);

      request.onsuccess = () => {
        const db = request.result;
        const storeNames = Array.from(db.objectStoreNames);

        // Look for persons, transactions, payments stores
        const personStore = storeNames.find(
          (n) => n.toLowerCase().includes('person') || n === 'persons'
        );
        const txnStore = storeNames.find(
          (n) => n.toLowerCase().includes('transaction') || n === 'transactions'
        );
        const paymentStore = storeNames.find(
          (n) => n.toLowerCase().includes('payment') || n === 'payments'
        );

        if (!personStore && !txnStore) {
          db.close();
          resolve(null);
          return;
        }

        const storesToRead = [personStore, txnStore, paymentStore].filter(
          Boolean
        ) as string[];

        const results: Record<string, unknown[]> = {};
        let completed = 0;

        const tx = db.transaction(storesToRead, 'readonly');

        for (const storeName of storesToRead) {
          const store = tx.objectStore(storeName);
          const req = store.getAll();
          req.onsuccess = () => {
            results[storeName] = req.result || [];
            completed++;
            if (completed === storesToRead.length) {
              db.close();
              resolve({
                persons: (results[personStore || ''] || []) as OldPerson[],
                transactions: (results[txnStore || ''] || []) as OldTransaction[],
                payments: (results[paymentStore || ''] || []) as OldPayment[],
              });
            }
          };
          req.onerror = () => {
            completed++;
            if (completed === storesToRead.length) {
              db.close();
              resolve({
                persons: (results[personStore || ''] || []) as OldPerson[],
                transactions: (results[txnStore || ''] || []) as OldTransaction[],
                payments: (results[paymentStore || ''] || []) as OldPayment[],
              });
            }
          };
        }
      };
    } catch {
      resolve(null);
    }
  });
}

export default function RecoverPage() {
  const router = useRouter();
  const { showToast, ToastElement } = useToast();
  const [scanning, setScanning] = useState(false);
  const [data, setData] = useState<{
    persons: OldPerson[];
    transactions: OldTransaction[];
    payments: OldPayment[];
    dbName: string;
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [allDbNames, setAllDbNames] = useState<string[]>([]);

  const handleScan = async () => {
    setScanning(true);
    try {
      // List all DBs for debug info
      if ('databases' in indexedDB) {
        const dbs = await indexedDB.databases();
        setAllDbNames(dbs.map((d) => d.name || '').filter(Boolean));
      }

      const result = await findAndReadIndexedDB();
      setData(result);
      if (result) {
        showToast(`Found data in "${result.dbName}"!`);
      } else {
        showToast('No old data found in IndexedDB');
      }
    } catch (e) {
      console.error(e);
      showToast('Error scanning IndexedDB');
    } finally {
      setScanning(false);
    }
  };

  const handleDownloadJSON = () => {
    if (!data) return;
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lendtracker-recovered-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSON downloaded!');
  };

  const handleImportToSupabase = async () => {
    if (!data) return;
    setImporting(true);
    try {
      // Import persons first
      for (const person of data.persons) {
        try {
          await dataLayer.addPerson({
            id: person.id,
            name: person.name,
            phone: person.phone,
            createdAt: person.createdAt ? new Date(person.createdAt) : new Date(),
          });
        } catch (e) {
          console.warn('Person already exists or error:', person.name, e);
        }
      }

      // Import transactions
      for (const txn of data.transactions) {
        try {
          await dataLayer.addTransaction({
            id: txn.id,
            personId: txn.personId,
            type: txn.type,
            amount: txn.amount,
            date: new Date(txn.date),
            dueDate: txn.dueDate ? new Date(txn.dueDate) : undefined,
            note: txn.note,
            status: txn.status,
            createdAt: txn.createdAt ? new Date(txn.createdAt) : new Date(),
          });
        } catch (e) {
          console.warn('Transaction error:', txn.id, e);
        }
      }

      // Import payments
      for (const payment of data.payments) {
        try {
          await dataLayer.addPayment({
            id: payment.id,
            transactionId: payment.transactionId,
            amount: payment.amount,
            date: new Date(payment.date),
            note: payment.note,
            createdAt: payment.createdAt ? new Date(payment.createdAt) : new Date(),
          });
        } catch (e) {
          console.warn('Payment error:', payment.id, e);
        }
      }

      setImported(true);
      showToast('Data imported to Supabase!');
    } catch (e) {
      console.error(e);
      showToast('Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 pt-2 pb-24">
      {ToastElement}

      <button
        className="mb-4 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
        onClick={() => router.back()}
      >
        <ArrowLeft size={18} /> Back
      </button>

      <div className="mb-6 py-1">
        <h1 className="text-2xl font-bold tracking-tight">Data Recovery</h1>
        <p className="mt-0.5 text-sm text-slate-400">
          Recover data from the old offline version (IndexedDB)
        </p>
      </div>

      {/* Step 1: Scan */}
      <Card className="mb-4 border border-white/5 bg-slate-800/40 p-5">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Database size={16} className="text-violet-400" />
          Step 1: Scan Browser Storage
        </h3>
        <p className="mb-4 text-xs text-slate-400">
          This scans your browser&apos;s IndexedDB for old LendTracker data. You must do this on the
          <strong className="text-slate-300"> same browser</strong> where you used the old app.
        </p>
        <Button
          className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 py-2.5 text-sm font-semibold text-white"
          onPress={handleScan}
          isDisabled={scanning}
        >
          {scanning ? 'Scanning...' : 'Scan for Old Data'}
        </Button>

        {allDbNames.length > 0 && (
          <div className="mt-3 rounded-lg bg-slate-900/50 p-2.5 text-xs text-slate-500">
            <p className="mb-1 font-semibold text-slate-400">Databases found in browser:</p>
            {allDbNames.map((name) => (
              <p key={name} className="font-mono">{name}</p>
            ))}
          </div>
        )}
      </Card>

      {/* Results */}
      {data && (
        <>
          <Card className="mb-4 border border-emerald-500/20 bg-slate-800/40 p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-400">
              <Check size={16} /> Data Found!
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Database</span>
                <span className="font-mono text-xs text-slate-300">{data.dbName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">People</span>
                <span className="font-bold text-slate-200">{data.persons.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Transactions</span>
                <span className="font-bold text-slate-200">{data.transactions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payments</span>
                <span className="font-bold text-slate-200">{data.payments.length}</span>
              </div>
            </div>

            {/* Preview first few people */}
            {data.persons.length > 0 && (
              <div className="mt-3 rounded-lg bg-slate-900/50 p-2.5 text-xs text-slate-400">
                <p className="mb-1 font-semibold">People preview:</p>
                {data.persons.slice(0, 5).map((p) => (
                  <p key={p.id}>{p.name}</p>
                ))}
                {data.persons.length > 5 && (
                  <p className="text-slate-600">...and {data.persons.length - 5} more</p>
                )}
              </div>
            )}
          </Card>

          {/* Step 2: Actions */}
          <Card className="mb-4 border border-white/5 bg-slate-800/40 p-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-200">
              Step 2: Choose Action
            </h3>
            <div className="flex flex-col gap-2.5">
              <Button
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25"
                onPress={handleImportToSupabase}
                isDisabled={importing || imported}
              >
                {imported ? (
                  <><Check size={16} /> Imported Successfully!</>
                ) : importing ? (
                  'Importing...'
                ) : (
                  <><Upload size={16} /> Import to Cloud (Supabase)</>
                )}
              </Button>
              <Button
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-800 py-3 text-sm font-semibold text-slate-300"
                onPress={handleDownloadJSON}
              >
                <Download size={16} /> Download as JSON Backup
              </Button>
            </div>
          </Card>
        </>
      )}

      {data === null && !scanning && allDbNames.length > 0 && (
        <Card className="border border-amber-500/15 bg-slate-800/40 p-5 text-center">
          <p className="text-sm text-amber-300">No LendTracker data found</p>
          <p className="mt-1 text-xs text-slate-400">
            The old data may have been cleared, or you&apos;re on a different browser.
          </p>
        </Card>
      )}
    </div>
  );
}
