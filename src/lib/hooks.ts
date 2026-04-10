'use client';

import { useState, useEffect, useCallback } from 'react';
import { dataLayer, type Person, type Transaction, type Payment, type Subscription } from './db';
import { setCache, getCache } from './offline-cache';

// ─── Generic async data hook with offline cache ──────────────────────────────

function useAsyncData<T>(fetcher: () => Promise<T>, deps: unknown[] = [], cacheKey?: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
      // Cache for offline use
      if (cacheKey) setCache(cacheKey, result);
    } catch (e) {
      // If offline, try to load from cache
      if (cacheKey) {
        const cached = getCache<T>(cacheKey);
        if (cached) {
          setData(cached);
          setLoading(false);
          return;
        }
      }
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
  return useAsyncData(() => dataLayer.getSummary(), [], 'summary');
}

// ─── Persons ─────────────────────────────────────────────────────────────────

export function usePersons() {
  return useAsyncData(() => dataLayer.getPersons(), [], 'persons');
}

export function usePerson(id: string) {
  return useAsyncData(() => dataLayer.getPerson(id), [id], `person_${id}`);
}

export function usePersonSummary(personId: string) {
  return useAsyncData(() => dataLayer.getPersonSummary(personId), [personId], `person_summary_${personId}`);
}

// ─── Transactions ────────────────────────────────────────────────────────────

export function useTransactions(filters?: {
  type?: 'lend' | 'borrow';
  personId?: string;
  status?: 'pending' | 'partial' | 'settled';
}) {
  return useAsyncData(
    () => dataLayer.getTransactions(filters),
    [filters?.type, filters?.personId, filters?.status],
    `txns_${filters?.type || 'all'}_${filters?.personId || 'all'}`
  );
}

export function useRecentTransactions(limit: number = 10) {
  return useAsyncData(() => dataLayer.getRecentTransactions(limit), [limit], `recent_txns_${limit}`);
}

// ─── Payments ────────────────────────────────────────────────────────────────

export function usePayments(transactionId: string) {
  return useAsyncData(
    () => dataLayer.getPayments(transactionId),
    [transactionId],
    `payments_${transactionId}`
  );
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
  return useAsyncData(async () => {
    const persons = await dataLayer.getPersons();
    const results: PersonWithSummary[] = [];

    for (const person of persons) {
      const txns = await dataLayer.getTransactions({ personId: person.id });
      
      // Filter by type if specified
      const relevantTxns = type ? txns.filter(t => t.type === type) : txns;
      if (relevantTxns.length === 0 && type) continue;

      const summary = await dataLayer.getPersonSummary(person.id);
      results.push({
        ...person,
        ...summary,
        transactionCount: relevantTxns.length,
      });
    }

    // Sort by outstanding balance (highest first)
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
  return useAsyncData(async () => {
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

// ─── Subscription Hook ───────────────────────────────────────────────────────

export function useSubscription() {
  return useAsyncData<Subscription>(
    () => dataLayer.getOrCreateSubscription(),
    []
  );
}
