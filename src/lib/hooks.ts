'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { localDb } from './localDb';
import { dataLayer, type Person, type Transaction, type Payment, type Subscription } from './db';

// ─── Reactive hook: subscribes to IndexedDB changes via Dexie's hook ─────────

// Use a simple event system to notify hooks when data changes
let changeCounter = 0;
const changeListeners = new Set<() => void>();

export function notifyDataChange() {
  changeCounter++;
  changeListeners.forEach(cb => cb());
}

function useDataRefresh() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const cb = () => setTick(c => c + 1);
    changeListeners.add(cb);
    return () => { changeListeners.delete(cb); };
  }, []);
}

// ─── Generic local data hook ─────────────────────────────────────────────────

function useLocalData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Subscribe to data changes
  useDataRefresh();

  const refetch = useCallback(async () => {
    try {
      const result = await fetcher();
      if (mountedRef.current) {
        setData(result);
        setLoading(false);
        setError(null);
      }
    } catch (e) {
      console.error('useLocalData error:', e);
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : 'Unknown error');
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    refetch();
    return () => { mountedRef.current = false; };
  }, [refetch]);

  return { data, loading, error, refetch };
}

// ─── Generic async data hook (for online-only features) ──────────────────────

function useAsyncData<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

// ─── Dashboard Summary ──────────────────────────────────────────────────────

export function useSummary() {
  return useLocalData(async () => {
    const activeTxns = (await localDb.transactions.toArray())
      .filter(t => t._syncStatus !== 'deleted');
    const paymentRows = (await localDb.payments.toArray())
      .filter(p => p._syncStatus !== 'deleted');

    const paymentsByTxn = new Map<string, number>();
    for (const p of paymentRows) {
      paymentsByTxn.set(p.transaction_id, (paymentsByTxn.get(p.transaction_id) || 0) + p.amount);
    }

    let totalLent = 0, totalBorrowed = 0,
      totalLentOutstanding = 0, totalBorrowedOutstanding = 0,
      activeLendCount = 0, activeBorrowCount = 0, totalProfit = 0;

    for (const txn of activeTxns) {
      const paid = paymentsByTxn.get(txn.id) || 0;
      const outstanding = Math.max(0, txn.amount - paid);
      const profit = Math.max(0, paid - txn.amount);
      totalProfit += profit;

      if (txn.type === 'lend') {
        totalLent += txn.amount;
        totalLentOutstanding += outstanding;
        if (txn.status !== 'settled') activeLendCount++;
      } else {
        totalBorrowed += txn.amount;
        totalBorrowedOutstanding += outstanding;
        if (txn.status !== 'settled') activeBorrowCount++;
      }
    }

    return {
      totalLent, totalBorrowed,
      totalLentOutstanding, totalBorrowedOutstanding,
      netBalance: totalLentOutstanding - totalBorrowedOutstanding,
      activeLendCount, activeBorrowCount, totalProfit,
    };
  });
}

// ─── Persons ─────────────────────────────────────────────────────────────────

export function usePersons() {
  return useLocalData(async () => {
    return await dataLayer.getPersons();
  });
}

export function usePerson(id: string) {
  return useLocalData(async () => {
    return (await dataLayer.getPerson(id)) || null;
  }, [id]);
}

export function usePersonSummary(personId: string) {
  return useLocalData(async () => {
    return await dataLayer.getPersonSummary(personId);
  }, [personId]);
}

// ─── Transactions ────────────────────────────────────────────────────────────

export function useTransactions(filters?: {
  type?: 'lend' | 'borrow';
  personId?: string;
  status?: 'pending' | 'partial' | 'settled';
}) {
  return useLocalData(async () => {
    return await dataLayer.getTransactions(filters);
  }, [filters?.type, filters?.personId, filters?.status]);
}

export function useRecentTransactions(limit: number = 10) {
  return useLocalData(async () => {
    return await dataLayer.getRecentTransactions(limit);
  }, [limit]);
}

// ─── Payments ────────────────────────────────────────────────────────────────

export function usePayments(transactionId: string) {
  return useLocalData(async () => {
    return await dataLayer.getPayments(transactionId);
  }, [transactionId]);
}

// ─── Persons with summaries (for list views) ─────────────────────────────────

export interface PersonWithSummary extends Person {
  totalLent: number;
  totalBorrowed: number;
  lentOutstanding: number;
  borrowedOutstanding: number;
  netBalance: number;
  transactionCount: number;
}

export function usePersonsWithSummaries(type?: 'lend' | 'borrow') {
  return useLocalData(async () => {
    const persons = await dataLayer.getPersons();
    const results: PersonWithSummary[] = [];

    for (const person of persons) {
      const txns = await dataLayer.getTransactions({ personId: person.id });
      const relevantTxns = type ? txns.filter(t => t.type === type) : txns;
      if (relevantTxns.length === 0 && type) continue;

      const summary = await dataLayer.getPersonSummary(person.id);
      results.push({
        ...person,
        ...summary,
        transactionCount: relevantTxns.length,
      });
    }

    return results.sort((a, b) => {
      const aOutstanding = type === 'borrow' ? b.borrowedOutstanding : b.lentOutstanding;
      const bOutstanding = type === 'borrow' ? a.borrowedOutstanding : a.lentOutstanding;
      return aOutstanding - bOutstanding;
    });
  }, [type]);
}

// ─── Transaction with details ────────────────────────────────────────────────

export interface TransactionWithDetails extends Transaction {
  personName: string;
  totalPaid: number;
  outstanding: number;
  progress: number;
  payments: Payment[];
}

export function useTransactionWithDetails(txnId: string) {
  return useLocalData(async () => {
    const txn = await dataLayer.getTransaction(txnId);
    if (!txn) return null;

    const person = await dataLayer.getPerson(txn.personId);
    const payments = await dataLayer.getPayments(txnId);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = Math.max(0, txn.amount - totalPaid);
    const progress = txn.amount > 0 ? Math.min(100, (totalPaid / txn.amount) * 100) : 100;

    return {
      ...txn,
      personName: person?.name || 'Unknown',
      totalPaid,
      outstanding,
      progress,
      payments,
    } as TransactionWithDetails;
  }, [txnId]);
}

// ─── Subscription Hook (online-only) ─────────────────────────────────────────

export function useSubscription() {
  return useAsyncData<Subscription>(
    () => dataLayer.getOrCreateSubscription(),
    []
  );
}
