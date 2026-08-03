'use client';

import Dexie, { type Table } from 'dexie';

// ─── Local DB Row Types (snake_case to match Supabase for easy sync) ─────────

export interface LocalPerson {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  created_at: string;
  _syncStatus: 'synced' | 'pending' | 'deleted';
  _lastModified: number;
}

export interface LocalTransaction {
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
  _syncStatus: 'synced' | 'pending' | 'deleted';
  _lastModified: number;
}

export interface LocalPayment {
  id: string;
  user_id: string;
  transaction_id: string;
  amount: number;
  date: string;
  note: string | null;
  created_at: string;
  _syncStatus: 'synced' | 'pending' | 'deleted';
  _lastModified: number;
}

// ─── Dexie Database ──────────────────────────────────────────────────────────

export class LendTrackerDB extends Dexie {
  persons!: Table<LocalPerson, string>;
  transactions!: Table<LocalTransaction, string>;
  payments!: Table<LocalPayment, string>;

  constructor() {
    super('LendTrackerDB');
    this.version(1).stores({
      persons: 'id, user_id, name, _syncStatus',
      transactions: 'id, user_id, person_id, type, status, _syncStatus, created_at',
      payments: 'id, user_id, transaction_id, _syncStatus',
    });
  }
}

export const localDb = new LendTrackerDB();
