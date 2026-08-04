'use client';

import { localDb } from './localDb';
import { ensureUserId, getCachedUserId, notifyLocalChange } from './syncEngine';
import { createClient } from '@/lib/supabase/client';

// ─── Data Models (unchanged public API) ──────────────────────────────────────

export interface Person {
  id: string;
  name: string;
  phone?: string;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  personId: string;
  type: 'lend' | 'borrow';
  amount: number;
  date: Date;
  dueDate?: Date;
  note?: string;
  status: 'pending' | 'partial' | 'settled';
  createdAt: Date;
}

export interface Payment {
  id: string;
  transactionId: string;
  amount: number;
  date: Date;
  note?: string;
  createdAt: Date;
}

// ─── Row → Model mappers ─────────────────────────────────────────────────────

function mapPerson(row: { id: string; name: string; phone?: string | null; created_at: string }): Person {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || undefined,
    createdAt: new Date(row.created_at),
  };
}

function mapTransaction(row: {
  id: string; person_id: string; type: 'lend' | 'borrow';
  amount: number; date: string; due_date?: string | null;
  note?: string | null; status: 'pending' | 'partial' | 'settled'; created_at: string;
}): Transaction {
  return {
    id: row.id,
    personId: row.person_id,
    type: row.type,
    amount: Number(row.amount),
    date: new Date(row.date),
    dueDate: row.due_date ? new Date(row.due_date) : undefined,
    note: row.note || undefined,
    status: row.status,
    createdAt: new Date(row.created_at),
  };
}

function mapPayment(row: {
  id: string; transaction_id: string; amount: number;
  date: string; note?: string | null; created_at: string;
}): Payment {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    amount: Number(row.amount),
    date: new Date(row.date),
    note: row.note || undefined,
    createdAt: new Date(row.created_at),
  };
}

// ─── Helper: get user ID (cached, no network needed) ─────────────────────────

async function getUserId(): Promise<string> {
  return await ensureUserId();
}

function getUserIdSync(): string {
  const id = getCachedUserId();
  if (!id) throw new Error('No cached user ID');
  return id;
}

// ─── Data Access Layer (IndexedDB — fully offline) ───────────────────────────

export const dataLayer = {
  // ── Persons ──────────────────────────────────────────────────────────────

  async getPersons(): Promise<Person[]> {
    const rows = await localDb.persons
      .where('_syncStatus').notEqual('deleted')
      .sortBy('name');
    return rows.map(mapPerson);
  },

  async getPerson(id: string): Promise<Person | undefined> {
    const row = await localDb.persons.get(id);
    if (!row || row._syncStatus === 'deleted') return undefined;
    return mapPerson(row);
  },

  async getPersonByName(name: string): Promise<Person | undefined> {
    const all = await localDb.persons
      .where('_syncStatus').notEqual('deleted')
      .toArray();
    const row = all.find(p => p.name.toLowerCase() === name.toLowerCase());
    return row ? mapPerson(row) : undefined;
  },

  async addPerson(person: Person): Promise<void> {
    let userId: string;
    try {
      userId = getUserIdSync();
    } catch {
      userId = await getUserId();
    }
    await localDb.persons.put({
      id: person.id,
      user_id: userId,
      name: person.name,
      phone: person.phone || null,
      created_at: person.createdAt.toISOString(),
      _syncStatus: 'pending',
      _lastModified: Date.now(),
    });
    notifyLocalChange();
  },

  async updatePerson(id: string, updates: Partial<Person>): Promise<void> {
    const row: Record<string, unknown> = {
      _syncStatus: 'pending',
      _lastModified: Date.now(),
    };
    if (updates.name !== undefined) row.name = updates.name;
    if (updates.phone !== undefined) row.phone = updates.phone || null;
    await localDb.persons.update(id, row);
    notifyLocalChange();
  },

  async deletePerson(id: string): Promise<void> {
    // Mark person as deleted
    await localDb.persons.update(id, {
      _syncStatus: 'deleted',
      _lastModified: Date.now(),
    });
    // Mark all their transactions and payments as deleted
    const txns = await localDb.transactions
      .where('person_id').equals(id)
      .toArray();
    for (const txn of txns) {
      await localDb.payments
        .where('transaction_id').equals(txn.id)
        .modify({ _syncStatus: 'deleted', _lastModified: Date.now() });
      await localDb.transactions.update(txn.id, {
        _syncStatus: 'deleted',
        _lastModified: Date.now(),
      });
    }
    notifyLocalChange();
  },

  // ── Transactions ─────────────────────────────────────────────────────────

  async getTransactions(filters?: {
    type?: 'lend' | 'borrow';
    personId?: string;
    status?: 'pending' | 'partial' | 'settled';
  }): Promise<Transaction[]> {
    let collection = localDb.transactions
      .where('_syncStatus').notEqual('deleted');

    let rows = await collection.toArray();

    if (filters?.personId) {
      rows = rows.filter(r => r.person_id === filters.personId);
    }
    if (filters?.type) {
      rows = rows.filter(r => r.type === filters.type);
    }
    if (filters?.status) {
      rows = rows.filter(r => r.status === filters.status);
    }

    // Sort by created_at descending
    rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return rows.map(mapTransaction);
  },

  async getTransaction(id: string): Promise<Transaction | undefined> {
    const row = await localDb.transactions.get(id);
    if (!row || row._syncStatus === 'deleted') return undefined;
    return mapTransaction(row);
  },

  async addTransaction(txn: Transaction): Promise<void> {
    let userId: string;
    try {
      userId = getUserIdSync();
    } catch {
      userId = await getUserId();
    }
    await localDb.transactions.put({
      id: txn.id,
      user_id: userId,
      person_id: txn.personId,
      type: txn.type,
      amount: txn.amount,
      date: txn.date.toISOString(),
      due_date: txn.dueDate ? txn.dueDate.toISOString() : null,
      note: txn.note || null,
      status: txn.status,
      created_at: txn.createdAt.toISOString(),
      _syncStatus: 'pending',
      _lastModified: Date.now(),
    });
    notifyLocalChange();
  },

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<void> {
    const row: Record<string, unknown> = {
      _syncStatus: 'pending',
      _lastModified: Date.now(),
    };
    if (updates.status !== undefined) row.status = updates.status;
    if (updates.note !== undefined) row.note = updates.note;
    if (updates.dueDate !== undefined) row.due_date = updates.dueDate ? updates.dueDate.toISOString() : null;
    if (updates.amount !== undefined) row.amount = updates.amount;
    await localDb.transactions.update(id, row);
    notifyLocalChange();
  },

  async deleteTransaction(id: string): Promise<void> {
    // Mark payments for this transaction as deleted
    await localDb.payments
      .where('transaction_id').equals(id)
      .modify({ _syncStatus: 'deleted', _lastModified: Date.now() });
    // Mark transaction as deleted
    await localDb.transactions.update(id, {
      _syncStatus: 'deleted',
      _lastModified: Date.now(),
    });
    notifyLocalChange();
  },

  async getRecentTransactions(limit: number = 10): Promise<Transaction[]> {
    const rows = await localDb.transactions
      .where('_syncStatus').notEqual('deleted')
      .toArray();

    rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return rows.slice(0, limit).map(mapTransaction);
  },

  // ── Payments ─────────────────────────────────────────────────────────────

  async getPayments(transactionId: string): Promise<Payment[]> {
    const rows = await localDb.payments
      .where('transaction_id').equals(transactionId)
      .toArray();
    return rows
      .filter(r => r._syncStatus !== 'deleted')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(mapPayment);
  },

  async addPayment(payment: Payment): Promise<void> {
    let userId: string;
    try {
      userId = getUserIdSync();
    } catch {
      userId = await getUserId();
    }
    await localDb.payments.put({
      id: payment.id,
      user_id: userId,
      transaction_id: payment.transactionId,
      amount: payment.amount,
      date: payment.date.toISOString(),
      note: payment.note || null,
      created_at: payment.createdAt.toISOString(),
      _syncStatus: 'pending',
      _lastModified: Date.now(),
    });
    // Auto-update transaction status
    await this.recalculateTransactionStatus(payment.transactionId);
    notifyLocalChange();
  },

  async deletePayment(id: string, transactionId: string): Promise<void> {
    await localDb.payments.update(id, {
      _syncStatus: 'deleted',
      _lastModified: Date.now(),
    });
    await this.recalculateTransactionStatus(transactionId);
    notifyLocalChange();
  },

  async recalculateTransactionStatus(transactionId: string): Promise<void> {
    const txn = await this.getTransaction(transactionId);
    if (!txn) return;

    const payments = await this.getPayments(transactionId);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    let status: 'pending' | 'partial' | 'settled';
    if (totalPaid >= txn.amount) {
      status = 'settled';
    } else if (totalPaid > 0) {
      status = 'partial';
    } else {
      status = 'pending';
    }

    await localDb.transactions.update(transactionId, {
      status,
      _syncStatus: 'pending',
      _lastModified: Date.now(),
    });
  },

  // ── Aggregations ─────────────────────────────────────────────────────────

  async getSummary(): Promise<{
    totalLent: number;
    totalBorrowed: number;
    totalLentOutstanding: number;
    totalBorrowedOutstanding: number;
    netBalance: number;
    activeLendCount: number;
    activeBorrowCount: number;
  }> {
    const allTxns = await this.getTransactions();
    const allPaymentPromises = allTxns.map((txn) => this.getPayments(txn.id));
    const allPaymentArrays = await Promise.all(allPaymentPromises);

    const paymentsByTxn = new Map<string, number>();
    allTxns.forEach((txn, i) => {
      const totalPaid = allPaymentArrays[i].reduce((sum, p) => sum + p.amount, 0);
      paymentsByTxn.set(txn.id, totalPaid);
    });

    let totalLent = 0, totalBorrowed = 0,
      totalLentOutstanding = 0, totalBorrowedOutstanding = 0,
      activeLendCount = 0, activeBorrowCount = 0;

    for (const txn of allTxns) {
      const paid = paymentsByTxn.get(txn.id) || 0;
      const outstanding = Math.max(0, txn.amount - paid);

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
      activeLendCount, activeBorrowCount,
    };
  },

  async getPersonSummary(personId: string): Promise<{
    totalLent: number;
    totalBorrowed: number;
    lentOutstanding: number;
    borrowedOutstanding: number;
    netBalance: number;
    totalProfit: number;
  }> {
    const txns = await this.getTransactions({ personId });
    const paymentPromises = txns.map((txn) => this.getPayments(txn.id));
    const paymentArrays = await Promise.all(paymentPromises);

    const paymentsByTxn = new Map<string, number>();
    txns.forEach((txn, i) => {
      const totalPaid = paymentArrays[i].reduce((sum, p) => sum + p.amount, 0);
      paymentsByTxn.set(txn.id, totalPaid);
    });

    let totalLent = 0, totalBorrowed = 0,
      lentOutstanding = 0, borrowedOutstanding = 0, totalProfit = 0;

    for (const txn of txns) {
      const paid = paymentsByTxn.get(txn.id) || 0;
      const outstanding = Math.max(0, txn.amount - paid);
      const profit = Math.max(0, paid - txn.amount);
      totalProfit += profit;

      if (txn.type === 'lend') {
        totalLent += txn.amount;
        lentOutstanding += outstanding;
      } else {
        totalBorrowed += txn.amount;
        borrowedOutstanding += outstanding;
      }
    }

    return {
      totalLent, totalBorrowed,
      lentOutstanding, borrowedOutstanding,
      netBalance: lentOutstanding - borrowedOutstanding,
      totalProfit,
    };
  },

  // ── Export / Import ─────────────────────────────────────────────────────────

  async exportAllData(): Promise<string> {
    const persons = await this.getPersons();
    const transactions = await this.getTransactions();
    const payments: Payment[] = [];
    for (const txn of transactions) {
      const txnPayments = await this.getPayments(txn.id);
      payments.push(...txnPayments);
    }
    return JSON.stringify(
      { persons, transactions, payments, exportedAt: new Date().toISOString() },
      null, 2
    );
  },

  async importData(jsonString: string): Promise<{
    personsCount: number;
    transactionsCount: number;
    paymentsCount: number;
  }> {
    let userId: string;
    try {
      userId = getUserIdSync();
    } catch {
      userId = await getUserId();
    }
    const data = JSON.parse(jsonString);
    const now = Date.now();

    const persons = (data.persons || []).map((p: Person & { id: string }) => ({
      id: p.id,
      user_id: userId,
      name: p.name,
      phone: null,
      created_at: new Date(p.createdAt).toISOString(),
      _syncStatus: 'pending' as const,
      _lastModified: now,
    }));

    const transactions = (data.transactions || []).map((t: Transaction & { id: string }) => ({
      id: t.id,
      user_id: userId,
      person_id: t.personId,
      type: t.type,
      amount: t.amount,
      date: new Date(t.date).toISOString(),
      due_date: t.dueDate ? new Date(t.dueDate).toISOString() : null,
      note: t.note || null,
      status: t.status,
      created_at: new Date(t.createdAt).toISOString(),
      _syncStatus: 'pending' as const,
      _lastModified: now,
    }));

    const payments = (data.payments || []).map((p: Payment & { id: string }) => ({
      id: p.id,
      user_id: userId,
      transaction_id: p.transactionId,
      amount: p.amount,
      date: new Date(p.date).toISOString(),
      note: p.note || null,
      created_at: new Date(p.createdAt).toISOString(),
      _syncStatus: 'pending' as const,
      _lastModified: now,
    }));

    if (persons.length > 0) await localDb.persons.bulkPut(persons);
    if (transactions.length > 0) await localDb.transactions.bulkPut(transactions);
    if (payments.length > 0) await localDb.payments.bulkPut(payments);

    notifyLocalChange();

    return {
      personsCount: persons.length,
      transactionsCount: transactions.length,
      paymentsCount: payments.length,
    };
  },

  async clearAllData(): Promise<void> {
    // Mark everything as deleted so sync engine removes from Supabase too
    await localDb.persons.toCollection().modify({
      _syncStatus: 'deleted',
      _lastModified: Date.now(),
    });
    await localDb.transactions.toCollection().modify({
      _syncStatus: 'deleted',
      _lastModified: Date.now(),
    });
    await localDb.payments.toCollection().modify({
      _syncStatus: 'deleted',
      _lastModified: Date.now(),
    });
    notifyLocalChange();
  },

  // ─── Subscription Methods (online-only, graceful fallback) ─────────────────

  async getOrCreateSubscription(): Promise<Subscription> {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user?.email && ADMIN_EMAILS.includes(user.email)) {
        return {
          id: 'admin', plan: 'pro', status: 'active',
          trialStart: null, trialEnd: null,
          currentPeriodStart: null, currentPeriodEnd: null,
          createdAt: new Date(),
        };
      }

      const userId = user?.id || getCachedUserId();
      if (!userId) return DEFAULT_SUBSCRIPTION;

      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (data && !error) return mapSubscription(data as SubscriptionRow);

      // Create trial
      const now = new Date();
      const trialEnd = new Date(now);
      trialEnd.setMonth(trialEnd.getMonth() + 2);
      const newSub = {
        user_id: userId,
        plan: 'pro' as const, status: 'trialing' as const,
        trial_start: now.toISOString(), trial_end: trialEnd.toISOString(),
        current_period_start: now.toISOString(), current_period_end: trialEnd.toISOString(),
      };
      const { data: inserted, error: insertErr } = await supabase
        .from('user_subscriptions').insert(newSub).select().single();
      if (insertErr) return DEFAULT_SUBSCRIPTION;
      return mapSubscription(inserted as SubscriptionRow);
    } catch {
      return DEFAULT_SUBSCRIPTION;
    }
  },

  async getSubscription(): Promise<Subscription | null> {
    try {
      const supabase = createClient();
      const userId = getCachedUserId();
      if (!userId) return null;
      const { data, error } = await supabase
        .from('user_subscriptions').select('*').eq('user_id', userId).single();
      if (error || !data) return null;
      return mapSubscription(data as SubscriptionRow);
    } catch {
      return null;
    }
  },

  // ─── Active People (online-only) ───────────────────────────────────────────

  async getActivePeople(): Promise<string[]> {
    try {
      const supabase = createClient();
      const userId = getCachedUserId() || await getUserId();
      const { data, error } = await supabase
        .from('user_active_people').select('person_id').eq('user_id', userId);
      if (error) return [];
      return (data || []).map((r: { person_id: string }) => r.person_id);
    } catch { return []; }
  },

  async setActivePeople(personIds: string[]): Promise<void> {
    if (personIds.length > 5) throw new Error('Maximum 5 active people allowed on free plan');
    try {
      const supabase = createClient();
      const userId = getCachedUserId() || await getUserId();
      await supabase.from('user_active_people').delete().eq('user_id', userId);
      if (personIds.length > 0) {
        const rows = personIds.map((pid) => ({ user_id: userId, person_id: pid }));
        await supabase.from('user_active_people').insert(rows);
      }
    } catch { /* offline, skip */ }
  },

  async isPersonActive(personId: string): Promise<boolean> {
    try {
      const supabase = createClient();
      const userId = getCachedUserId() || await getUserId();
      const { data } = await supabase
        .from('user_active_people').select('id')
        .eq('user_id', userId).eq('person_id', personId).single();
      return !!data;
    } catch { return false; }
  },

  // ─── Employee Keys (online-only) ───────────────────────────────────────────

  async generateEmployeeKey(label?: string): Promise<{ keyCode: string; id: string }> {
    const supabase = createClient();
    const userId = getCachedUserId() || await getUserId();
    const keyCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data, error } = await supabase
      .from('employee_keys')
      .insert({ owner_id: userId, key_code: keyCode, label: label || null })
      .select().single();
    if (error) throw error;
    return { keyCode: data.key_code, id: data.id };
  },

  async getEmployeeKeys(): Promise<EmployeeKey[]> {
    try {
      const supabase = createClient();
      const userId = getCachedUserId() || await getUserId();
      const { data, error } = await supabase
        .from('employee_keys').select('*')
        .eq('owner_id', userId).order('created_at', { ascending: false });
      if (error) return [];
      return (data || []).map(mapEmployeeKey);
    } catch { return []; }
  },

  async toggleEmployeeKey(keyId: string, isActive: boolean): Promise<void> {
    const supabase = createClient();
    await supabase.from('employee_keys').update({ is_active: isActive }).eq('id', keyId);
  },

  async deleteEmployeeKey(keyId: string): Promise<void> {
    const supabase = createClient();
    await supabase.from('employee_keys').delete().eq('id', keyId);
  },

  // ─── Person Visibility (online-only) ───────────────────────────────────────

  async togglePersonVisibility(personId: string, visible: boolean): Promise<void> {
    try {
      const supabase = createClient();
      await supabase.from('persons').update({ visible_to_employees: visible }).eq('id', personId);
    } catch { /* offline */ }
  },

  // ─── Pending Changes (online-only) ─────────────────────────────────────────

  async getPendingChanges(): Promise<PendingChange[]> {
    try {
      const supabase = createClient();
      const userId = getCachedUserId() || await getUserId();
      const { data, error } = await supabase
        .from('pending_changes')
        .select('*, employee_keys(label, key_code)')
        .eq('owner_id', userId).eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) return [];
      return (data || []).map(mapPendingChange);
    } catch { return []; }
  },

  async getPendingChangeCount(): Promise<number> {
    try {
      const supabase = createClient();
      const userId = getCachedUserId() || await getUserId();
      const { count, error } = await supabase
        .from('pending_changes').select('*', { count: 'exact', head: true })
        .eq('owner_id', userId).eq('status', 'pending');
      if (error) return 0;
      return count || 0;
    } catch { return 0; }
  },

  async reviewPendingChange(changeId: string, approved: boolean): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('pending_changes')
      .update({ status: approved ? 'approved' : 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', changeId);
    if (error) throw error;

    if (approved) {
      const { data } = await supabase.from('pending_changes').select('*').eq('id', changeId).single();
      if (data) await this.applyPendingChange(data);
    }
  },

  async applyPendingChange(change: { change_type: string; payload: Record<string, unknown>; owner_id: string }): Promise<void> {
    const supabase = createClient();
    const payload = change.payload;
    switch (change.change_type) {
      case 'add_person':
        await supabase.from('persons').insert({
          id: payload.id, user_id: change.owner_id,
          name: payload.name, created_at: payload.created_at || new Date().toISOString(),
        });
        break;
      case 'add_transaction':
        await supabase.from('transactions').insert({
          id: payload.id, user_id: change.owner_id,
          person_id: payload.person_id, type: payload.type,
          amount: payload.amount, date: payload.date,
          due_date: payload.due_date || null, note: payload.note || null,
          status: payload.status || 'pending',
          created_at: payload.created_at || new Date().toISOString(),
        });
        break;
      case 'add_payment':
        await supabase.from('payments').insert({
          id: payload.id, user_id: change.owner_id,
          transaction_id: payload.transaction_id, amount: payload.amount,
          date: payload.date, note: payload.note || null,
          created_at: payload.created_at || new Date().toISOString(),
        });
        break;
    }
  },
};

// ─── Employee & Pending Change Types ─────────────────────────────────────────

export interface EmployeeKey {
  id: string;
  keyCode: string;
  label: string | null;
  isActive: boolean;
  createdAt: Date;
}

interface EmployeeKeyRow {
  id: string; owner_id: string; key_code: string;
  label: string | null; is_active: boolean; created_at: string;
}

function mapEmployeeKey(row: EmployeeKeyRow): EmployeeKey {
  return {
    id: row.id, keyCode: row.key_code, label: row.label,
    isActive: row.is_active, createdAt: new Date(row.created_at),
  };
}

export interface PendingChange {
  id: string;
  changeType: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected';
  employeeLabel: string | null;
  employeeKeyCode: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPendingChange(row: any): PendingChange {
  return {
    id: row.id, changeType: row.change_type, payload: row.payload,
    status: row.status,
    employeeLabel: row.employee_keys?.label || null,
    employeeKeyCode: row.employee_keys?.key_code || null,
    createdAt: new Date(row.created_at),
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : null,
  };
}

// ─── Subscription Types ──────────────────────────────────────────────────────

export interface Subscription {
  id: string;
  plan: 'free' | 'pro';
  status: 'trialing' | 'active' | 'expired' | 'cancelled';
  trialStart: Date | null;
  trialEnd: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  createdAt: Date;
}

interface SubscriptionRow {
  id: string; user_id: string; plan: 'free' | 'pro';
  status: 'trialing' | 'active' | 'expired' | 'cancelled';
  trial_start: string | null; trial_end: string | null;
  current_period_start: string | null; current_period_end: string | null;
  created_at: string;
}

function mapSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id, plan: row.plan, status: row.status,
    trialStart: row.trial_start ? new Date(row.trial_start) : null,
    trialEnd: row.trial_end ? new Date(row.trial_end) : null,
    currentPeriodStart: row.current_period_start ? new Date(row.current_period_start) : null,
    currentPeriodEnd: row.current_period_end ? new Date(row.current_period_end) : null,
    createdAt: new Date(row.created_at),
  };
}

const DEFAULT_SUBSCRIPTION: Subscription = {
  id: 'offline', plan: 'pro', status: 'active',
  trialStart: null, trialEnd: null,
  currentPeriodStart: null, currentPeriodEnd: null,
  createdAt: new Date(),
};

// ─── Admin Config ─────────────────────────────────────────────────────────────

const ADMIN_EMAILS = ['bimonlangnongsiej@gmail.com'];

export async function isAdmin(): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return !!user?.email && ADMIN_EMAILS.includes(user.email);
  } catch { return false; }
}

// Everything is free — always returns true
export function isProUser(_sub?: Subscription | null, _email?: string | null): boolean {
  return true;
}

export function getTrialDaysLeft(_sub: Subscription | null): number {
  return 0;
}

export function isTrialExpired(_sub: Subscription | null): boolean {
  return false;
}

// ─── No Limits — Everything is Free ───────────────────────────────────────────

export const FREE_LIMITS = {
  maxPeople: Infinity,
  maxTransactions: Infinity,
  canExport: true,
  canImport: true,
};

export const PRO_FEATURES = {
  maxPeople: Infinity,
  maxTransactions: Infinity,
  canExport: true,
  canImport: true,
};
