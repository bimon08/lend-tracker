import Dexie, { type EntityTable } from 'dexie';

// ─── Data Models ─────────────────────────────────────────────────────────────

export interface Person {
  id: string;
  name: string;
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

// ─── Database ────────────────────────────────────────────────────────────────

class LendTrackerDB extends Dexie {
  persons!: EntityTable<Person, 'id'>;
  transactions!: EntityTable<Transaction, 'id'>;
  payments!: EntityTable<Payment, 'id'>;

  constructor() {
    super('LendTrackerDB');
    this.version(1).stores({
      persons: 'id, name, createdAt',
      transactions: 'id, personId, type, status, date, createdAt',
      payments: 'id, transactionId, date, createdAt',
    });
  }
}

export const db = new LendTrackerDB();

// ─── Data Access Layer (abstracted for future cloud sync) ────────────────────

export const dataLayer = {
  // ── Persons ──────────────────────────────────────────────────────────────

  async getPersons(): Promise<Person[]> {
    return db.persons.orderBy('name').toArray();
  },

  async getPerson(id: string): Promise<Person | undefined> {
    return db.persons.get(id);
  },

  async getPersonByName(name: string): Promise<Person | undefined> {
    return db.persons.where('name').equalsIgnoreCase(name).first();
  },

  async addPerson(person: Person): Promise<void> {
    await db.persons.add(person);
  },

  async updatePerson(id: string, updates: Partial<Person>): Promise<void> {
    await db.persons.update(id, updates);
  },

  async deletePerson(id: string): Promise<void> {
    // Delete all associated payments and transactions
    const txns = await db.transactions.where('personId').equals(id).toArray();
    const txnIds = txns.map((t) => t.id);
    await db.payments.where('transactionId').anyOf(txnIds).delete();
    await db.transactions.where('personId').equals(id).delete();
    await db.persons.delete(id);
  },

  // ── Transactions ─────────────────────────────────────────────────────────

  async getTransactions(filters?: {
    type?: 'lend' | 'borrow';
    personId?: string;
    status?: 'pending' | 'partial' | 'settled';
  }): Promise<Transaction[]> {
    let collection = db.transactions.orderBy('createdAt');

    if (filters?.personId) {
      const txns = await db.transactions
        .where('personId')
        .equals(filters.personId)
        .toArray();
      const filtered = txns.filter((t) => {
        if (filters.type && t.type !== filters.type) return false;
        if (filters.status && t.status !== filters.status) return false;
        return true;
      });
      return filtered.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
    }

    let result = await collection.reverse().toArray();
    if (filters?.type) result = result.filter((t) => t.type === filters.type);
    if (filters?.status)
      result = result.filter((t) => t.status === filters.status);
    return result;
  },

  async getTransaction(id: string): Promise<Transaction | undefined> {
    return db.transactions.get(id);
  },

  async addTransaction(txn: Transaction): Promise<void> {
    await db.transactions.add(txn);
  },

  async updateTransaction(
    id: string,
    updates: Partial<Transaction>
  ): Promise<void> {
    await db.transactions.update(id, updates);
  },

  async deleteTransaction(id: string): Promise<void> {
    await db.payments.where('transactionId').equals(id).delete();
    await db.transactions.delete(id);
  },

  async getRecentTransactions(limit: number = 10): Promise<Transaction[]> {
    return db.transactions.orderBy('createdAt').reverse().limit(limit).toArray();
  },

  // ── Payments ─────────────────────────────────────────────────────────────

  async getPayments(transactionId: string): Promise<Payment[]> {
    return db.payments
      .where('transactionId')
      .equals(transactionId)
      .sortBy('date');
  },

  async addPayment(payment: Payment): Promise<void> {
    await db.payments.add(payment);
    // Auto-update transaction status
    await this.recalculateTransactionStatus(payment.transactionId);
  },

  async deletePayment(id: string, transactionId: string): Promise<void> {
    await db.payments.delete(id);
    await this.recalculateTransactionStatus(transactionId);
  },

  async recalculateTransactionStatus(transactionId: string): Promise<void> {
    const txn = await db.transactions.get(transactionId);
    if (!txn) return;

    const payments = await db.payments
      .where('transactionId')
      .equals(transactionId)
      .toArray();
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    let status: 'pending' | 'partial' | 'settled';
    if (totalPaid >= txn.amount) {
      status = 'settled';
    } else if (totalPaid > 0) {
      status = 'partial';
    } else {
      status = 'pending';
    }

    await db.transactions.update(transactionId, { status });
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
    const allTxns = await db.transactions.toArray();
    const allPayments = await db.payments.toArray();

    const paymentsByTxn = new Map<string, number>();
    for (const p of allPayments) {
      paymentsByTxn.set(
        p.transactionId,
        (paymentsByTxn.get(p.transactionId) || 0) + p.amount
      );
    }

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
    const txns = await db.transactions
      .where('personId')
      .equals(personId)
      .toArray();
    const txnIds = txns.map((t) => t.id);
    const payments = await db.payments
      .where('transactionId')
      .anyOf(txnIds)
      .toArray();

    const paymentsByTxn = new Map<string, number>();
    for (const p of payments) {
      paymentsByTxn.set(
        p.transactionId,
        (paymentsByTxn.get(p.transactionId) || 0) + p.amount
      );
    }

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

  // ── Export / Import (for future cloud sync migration) ─────────────────────

  async exportAllData(): Promise<string> {
    const persons = await db.persons.toArray();
    const transactions = await db.transactions.toArray();
    const payments = await db.payments.toArray();
    return JSON.stringify({ persons, transactions, payments, exportedAt: new Date().toISOString() }, null, 2);
  },

  async importData(jsonString: string): Promise<{ personsCount: number; transactionsCount: number; paymentsCount: number }> {
    const data = JSON.parse(jsonString);
    const persons = (data.persons || []).map((p: Person) => ({
      ...p,
      createdAt: new Date(p.createdAt),
    }));
    const transactions = (data.transactions || []).map((t: Transaction) => ({
      ...t,
      date: new Date(t.date),
      dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
      createdAt: new Date(t.createdAt),
    }));
    const payments = (data.payments || []).map((p: Payment) => ({
      ...p,
      date: new Date(p.date),
      createdAt: new Date(p.createdAt),
    }));

    await db.transaction('rw', db.persons, db.transactions, db.payments, async () => {
      await db.persons.bulkPut(persons);
      await db.transactions.bulkPut(transactions);
      await db.payments.bulkPut(payments);
    });

    return {
      personsCount: persons.length,
      transactionsCount: transactions.length,
      paymentsCount: payments.length,
    };
  },

  async clearAllData(): Promise<void> {
    await db.transaction('rw', db.persons, db.transactions, db.payments, async () => {
      await db.persons.clear();
      await db.transactions.clear();
      await db.payments.clear();
    });
  },
};
