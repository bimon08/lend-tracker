import { createClient } from '@/lib/supabase/client';

// ─── Data Models ─────────────────────────────────────────────────────────────

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

// ─── Row type mappers (snake_case DB → camelCase app) ────────────────────────

interface PersonRow {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  created_at: string;
}

interface TransactionRow {
  id: string;
  user_id: string;
  person_id: string;
  type: 'lend' | 'borrow';
  amount: number;
  date: string;
  due_date: string | null;
  note: string | null;
  status: 'pending' | 'partial' | 'settled';
  created_at: string;
}

interface PaymentRow {
  id: string;
  user_id: string;
  transaction_id: string;
  amount: number;
  date: string;
  note: string | null;
  created_at: string;
}

function mapPerson(row: PersonRow): Person {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || undefined,
    createdAt: new Date(row.created_at),
  };
}

function mapTransaction(row: TransactionRow): Transaction {
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

function mapPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    amount: Number(row.amount),
    date: new Date(row.date),
    note: row.note || undefined,
    createdAt: new Date(row.created_at),
  };
}

// ─── Helper: get current user ID ─────────────────────────────────────────────

async function getUserId(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

// ─── Data Access Layer (Supabase) ────────────────────────────────────────────

export const dataLayer = {
  // ── Persons ──────────────────────────────────────────────────────────────

  async getPersons(): Promise<Person[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('persons')
      .select('*')
      .order('name');
    if (error) throw error;
    return (data || []).map(mapPerson);
  },

  async getPerson(id: string): Promise<Person | undefined> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('persons')
      .select('*')
      .eq('id', id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data ? mapPerson(data) : undefined;
  },

  async getPersonByName(name: string): Promise<Person | undefined> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('persons')
      .select('*')
      .ilike('name', name)
      .limit(1)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data ? mapPerson(data) : undefined;
  },

  async addPerson(person: Person): Promise<void> {
    const userId = await getUserId();
    const supabase = createClient();
    const { error } = await supabase.from('persons').insert({
      id: person.id,
      user_id: userId,
      name: person.name,
      phone: person.phone || null,
      created_at: person.createdAt.toISOString(),
    });
    if (error) throw error;
  },

  async updatePerson(id: string, updates: Partial<Person>): Promise<void> {
    const supabase = createClient();
    const row: Record<string, unknown> = {};
    if (updates.name !== undefined) row.name = updates.name;
    if (updates.phone !== undefined) row.phone = updates.phone || null;
    const { error } = await supabase
      .from('persons')
      .update(row)
      .eq('id', id);
    if (error) throw error;
  },

  async deletePerson(id: string): Promise<void> {
    const supabase = createClient();
    // Also remove from active people (frees up a slot on free plan)
    await supabase.from('user_active_people').delete().eq('person_id', id);
    // Cascade delete handles transactions and payments via FK
    const { error } = await supabase.from('persons').delete().eq('id', id);
    if (error) throw error;
  },

  // ── Transactions ─────────────────────────────────────────────────────────

  async getTransactions(filters?: {
    type?: 'lend' | 'borrow';
    personId?: string;
    status?: 'pending' | 'partial' | 'settled';
  }): Promise<Transaction[]> {
    const supabase = createClient();
    let query = supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.personId) {
      query = query.eq('person_id', filters.personId);
    }
    if (filters?.type) {
      query = query.eq('type', filters.type);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapTransaction);
  },

  async getTransaction(id: string): Promise<Transaction | undefined> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data ? mapTransaction(data) : undefined;
  },

  async addTransaction(txn: Transaction): Promise<void> {
    const userId = await getUserId();
    const supabase = createClient();
    const { error } = await supabase.from('transactions').insert({
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
    });
    if (error) throw error;
  },

  async updateTransaction(
    id: string,
    updates: Partial<Transaction>
  ): Promise<void> {
    const supabase = createClient();
    const row: Record<string, unknown> = {};
    if (updates.status !== undefined) row.status = updates.status;
    if (updates.note !== undefined) row.note = updates.note;
    if (updates.dueDate !== undefined)
      row.due_date = updates.dueDate
        ? updates.dueDate.toISOString()
        : null;
    if (updates.amount !== undefined) row.amount = updates.amount;
    const { error } = await supabase
      .from('transactions')
      .update(row)
      .eq('id', id);
    if (error) throw error;
  },

  async deleteTransaction(id: string): Promise<void> {
    const supabase = createClient();
    // Delete associated payments first (cascade should handle it, but explicit is safer)
    await supabase.from('payments').delete().eq('transaction_id', id);
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getRecentTransactions(limit: number = 10): Promise<Transaction[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).map(mapTransaction);
  },

  // ── Payments ─────────────────────────────────────────────────────────────

  async getPayments(transactionId: string): Promise<Payment[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('transaction_id', transactionId)
      .order('date');
    if (error) throw error;
    return (data || []).map(mapPayment);
  },

  async addPayment(payment: Payment): Promise<void> {
    const userId = await getUserId();
    const supabase = createClient();
    const { error } = await supabase.from('payments').insert({
      id: payment.id,
      user_id: userId,
      transaction_id: payment.transactionId,
      amount: payment.amount,
      date: payment.date.toISOString(),
      note: payment.note || null,
      created_at: payment.createdAt.toISOString(),
    });
    if (error) throw error;
    // Auto-update transaction status
    await this.recalculateTransactionStatus(payment.transactionId);
  },

  async deletePayment(id: string, transactionId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from('payments').delete().eq('id', id);
    if (error) throw error;
    await this.recalculateTransactionStatus(transactionId);
  },

  async recalculateTransactionStatus(transactionId: string): Promise<void> {
    const supabase = createClient();
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

    const { error } = await supabase
      .from('transactions')
      .update({ status })
      .eq('id', transactionId);
    if (error) throw error;
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
      const totalPaid = allPaymentArrays[i].reduce(
        (sum, p) => sum + p.amount,
        0
      );
      paymentsByTxn.set(txn.id, totalPaid);
    });

    let totalLent = 0,
      totalBorrowed = 0,
      totalLentOutstanding = 0,
      totalBorrowedOutstanding = 0,
      activeLendCount = 0,
      activeBorrowCount = 0;

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
      totalLent,
      totalBorrowed,
      totalLentOutstanding,
      totalBorrowedOutstanding,
      netBalance: totalLentOutstanding - totalBorrowedOutstanding,
      activeLendCount,
      activeBorrowCount,
    };
  },

  async getPersonSummary(
    personId: string
  ): Promise<{
    totalLent: number;
    totalBorrowed: number;
    lentOutstanding: number;
    borrowedOutstanding: number;
    netBalance: number;
  }> {
    const txns = await this.getTransactions({ personId });
    const paymentPromises = txns.map((txn) => this.getPayments(txn.id));
    const paymentArrays = await Promise.all(paymentPromises);

    const paymentsByTxn = new Map<string, number>();
    txns.forEach((txn, i) => {
      const totalPaid = paymentArrays[i].reduce(
        (sum, p) => sum + p.amount,
        0
      );
      paymentsByTxn.set(txn.id, totalPaid);
    });

    let totalLent = 0,
      totalBorrowed = 0,
      lentOutstanding = 0,
      borrowedOutstanding = 0;

    for (const txn of txns) {
      const paid = paymentsByTxn.get(txn.id) || 0;
      const outstanding = Math.max(0, txn.amount - paid);

      if (txn.type === 'lend') {
        totalLent += txn.amount;
        lentOutstanding += outstanding;
      } else {
        totalBorrowed += txn.amount;
        borrowedOutstanding += outstanding;
      }
    }

    return {
      totalLent,
      totalBorrowed,
      lentOutstanding,
      borrowedOutstanding,
      netBalance: lentOutstanding - borrowedOutstanding,
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
      null,
      2
    );
  },

  async importData(
    jsonString: string
  ): Promise<{
    personsCount: number;
    transactionsCount: number;
    paymentsCount: number;
  }> {
    const userId = await getUserId();
    const supabase = createClient();
    const data = JSON.parse(jsonString);

    const persons = (data.persons || []).map((p: Person & { id: string }) => ({
      id: p.id,
      user_id: userId,
      name: p.name,
      created_at: new Date(p.createdAt).toISOString(),
    }));

    const transactions = (data.transactions || []).map(
      (t: Transaction & { id: string }) => ({
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
      })
    );

    const payments = (data.payments || []).map(
      (p: Payment & { id: string }) => ({
        id: p.id,
        user_id: userId,
        transaction_id: p.transactionId,
        amount: p.amount,
        date: new Date(p.date).toISOString(),
        note: p.note || null,
        created_at: new Date(p.createdAt).toISOString(),
      })
    );

    if (persons.length > 0) {
      const { error } = await supabase.from('persons').upsert(persons);
      if (error) throw error;
    }
    if (transactions.length > 0) {
      const { error } = await supabase
        .from('transactions')
        .upsert(transactions);
      if (error) throw error;
    }
    if (payments.length > 0) {
      const { error } = await supabase.from('payments').upsert(payments);
      if (error) throw error;
    }

    return {
      personsCount: persons.length,
      transactionsCount: transactions.length,
      paymentsCount: payments.length,
    };
  },

  async clearAllData(): Promise<void> {
    const supabase = createClient();
    // Delete in order: payments → transactions → persons (FK constraints)
    const { error: e1 } = await supabase
      .from('payments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all rows
    if (e1) throw e1;
    const { error: e2 } = await supabase
      .from('transactions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (e2) throw e2;
    const { error: e3 } = await supabase
      .from('persons')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (e3) throw e3;
  },

  // ─── Subscription Methods ──────────────────────────────────────────────────

  async getOrCreateSubscription(): Promise<Subscription> {
    const supabase = createClient();
    const userId = await getUserId();

    // Admin is always permanently pro
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email && ADMIN_EMAILS.includes(user.email)) {
      return {
        id: 'admin',
        plan: 'pro',
        status: 'active',
        trialStart: null,
        trialEnd: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        createdAt: new Date(),
      };
    }

    // Try to get existing subscription
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (data && !error) {
      return mapSubscription(data as SubscriptionRow);
    }

    // Create a new trial subscription (2 months free)
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setMonth(trialEnd.getMonth() + 2);

    const newSub = {
      user_id: userId,
      plan: 'pro' as const,
      status: 'trialing' as const,
      trial_start: now.toISOString(),
      trial_end: trialEnd.toISOString(),
      current_period_start: now.toISOString(),
      current_period_end: trialEnd.toISOString(),
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('user_subscriptions')
      .insert(newSub)
      .select()
      .single();

    if (insertErr) throw insertErr;
    return mapSubscription(inserted as SubscriptionRow);
  },

  async getSubscription(): Promise<Subscription | null> {
    const supabase = createClient();
    const userId = await getUserId();

    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;
    return mapSubscription(data as SubscriptionRow);
  },

  // ─── Active People (Free Tier) ─────────────────────────────────────────────

  async getActivePeople(): Promise<string[]> {
    const supabase = createClient();
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('user_active_people')
      .select('person_id')
      .eq('user_id', userId);
    if (error) throw error;
    return (data || []).map((r: { person_id: string }) => r.person_id);
  },

  async setActivePeople(personIds: string[]): Promise<void> {
    if (personIds.length > 5) throw new Error('Maximum 5 active people allowed on free plan');
    const supabase = createClient();
    const userId = await getUserId();

    // Delete existing
    await supabase.from('user_active_people').delete().eq('user_id', userId);

    // Insert new
    if (personIds.length > 0) {
      const rows = personIds.map((pid) => ({ user_id: userId, person_id: pid }));
      const { error } = await supabase.from('user_active_people').insert(rows);
      if (error) throw error;
    }
  },

  async isPersonActive(personId: string): Promise<boolean> {
    const supabase = createClient();
    const userId = await getUserId();
    const { data } = await supabase
      .from('user_active_people')
      .select('id')
      .eq('user_id', userId)
      .eq('person_id', personId)
      .single();
    return !!data;
  },

  // ─── Employee Keys ─────────────────────────────────────────────────────────

  async generateEmployeeKey(label?: string): Promise<{ keyCode: string; id: string }> {
    const supabase = createClient();
    const userId = await getUserId();
    const keyCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data, error } = await supabase
      .from('employee_keys')
      .insert({ owner_id: userId, key_code: keyCode, label: label || null })
      .select()
      .single();
    if (error) throw error;
    return { keyCode: data.key_code, id: data.id };
  },

  async getEmployeeKeys(): Promise<EmployeeKey[]> {
    const supabase = createClient();
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('employee_keys')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapEmployeeKey);
  },

  async toggleEmployeeKey(keyId: string, isActive: boolean): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('employee_keys')
      .update({ is_active: isActive })
      .eq('id', keyId);
    if (error) throw error;
  },

  async deleteEmployeeKey(keyId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from('employee_keys').delete().eq('id', keyId);
    if (error) throw error;
  },

  // ─── Person Visibility ─────────────────────────────────────────────────────

  async togglePersonVisibility(personId: string, visible: boolean): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('persons')
      .update({ visible_to_employees: visible })
      .eq('id', personId);
    if (error) throw error;
  },

  // ─── Pending Changes ──────────────────────────────────────────────────────

  async getPendingChanges(): Promise<PendingChange[]> {
    const supabase = createClient();
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('pending_changes')
      .select('*, employee_keys(label, key_code)')
      .eq('owner_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapPendingChange);
  },

  async getPendingChangeCount(): Promise<number> {
    try {
      const supabase = createClient();
      const userId = await getUserId();
      const { count, error } = await supabase
        .from('pending_changes')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', userId)
        .eq('status', 'pending');
      if (error) return 0;
      return count || 0;
    } catch {
      return 0;
    }
  },

  async reviewPendingChange(changeId: string, approved: boolean): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('pending_changes')
      .update({
        status: approved ? 'approved' : 'rejected',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', changeId);
    if (error) throw error;

    if (approved) {
      // Apply the change
      const { data } = await supabase
        .from('pending_changes')
        .select('*')
        .eq('id', changeId)
        .single();
      if (data) {
        await this.applyPendingChange(data);
      }
    }
  },

  async applyPendingChange(change: { change_type: string; payload: Record<string, unknown>; owner_id: string }): Promise<void> {
    const supabase = createClient();
    const payload = change.payload;

    switch (change.change_type) {
      case 'add_person': {
        await supabase.from('persons').insert({
          id: payload.id,
          user_id: change.owner_id,
          name: payload.name,
          created_at: payload.created_at || new Date().toISOString(),
        });
        break;
      }
      case 'add_transaction': {
        await supabase.from('transactions').insert({
          id: payload.id,
          user_id: change.owner_id,
          person_id: payload.person_id,
          type: payload.type,
          amount: payload.amount,
          date: payload.date,
          due_date: payload.due_date || null,
          note: payload.note || null,
          status: payload.status || 'pending',
          created_at: payload.created_at || new Date().toISOString(),
        });
        break;
      }
      case 'add_payment': {
        await supabase.from('payments').insert({
          id: payload.id,
          user_id: change.owner_id,
          transaction_id: payload.transaction_id,
          amount: payload.amount,
          date: payload.date,
          note: payload.note || null,
          created_at: payload.created_at || new Date().toISOString(),
        });
        break;
      }
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
  id: string;
  owner_id: string;
  key_code: string;
  label: string | null;
  is_active: boolean;
  created_at: string;
}

function mapEmployeeKey(row: EmployeeKeyRow): EmployeeKey {
  return {
    id: row.id,
    keyCode: row.key_code,
    label: row.label,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
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
    id: row.id,
    changeType: row.change_type,
    payload: row.payload,
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
  id: string;
  user_id: string;
  plan: 'free' | 'pro';
  status: 'trialing' | 'active' | 'expired' | 'cancelled';
  trial_start: string | null;
  trial_end: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
}

function mapSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    plan: row.plan,
    status: row.status,
    trialStart: row.trial_start ? new Date(row.trial_start) : null,
    trialEnd: row.trial_end ? new Date(row.trial_end) : null,
    currentPeriodStart: row.current_period_start ? new Date(row.current_period_start) : null,
    currentPeriodEnd: row.current_period_end ? new Date(row.current_period_end) : null,
    createdAt: new Date(row.created_at),
  };
}

// ─── Subscription Helpers ─────────────────────────────────────────────────────

// ─── Admin Config ─────────────────────────────────────────────────────────────

const ADMIN_EMAILS = ['bimonlangnongsiej@gmail.com'];

export async function isAdmin(): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return !!user?.email && ADMIN_EMAILS.includes(user.email);
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

