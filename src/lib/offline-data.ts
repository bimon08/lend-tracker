import { dataLayer, type Person, type Transaction, type Payment } from '@/lib/db';
import { addToQueue, isOnline } from '@/lib/offline-queue';

// Wraps dataLayer with offline support for write operations.
// Reads always go to Supabase (only work online).
// Writes queue in localStorage when offline and sync when back online.

export const offlineDataLayer = {
  // ── Reads (pass-through) ──
  getPersons: () => dataLayer.getPersons(),
  getPerson: (id: string) => dataLayer.getPerson(id),
  getPersonByName: (name: string) => dataLayer.getPersonByName(name),
  getTransactions: (filters?: Parameters<typeof dataLayer.getTransactions>[0]) =>
    dataLayer.getTransactions(filters),
  getTransaction: (id: string) => dataLayer.getTransaction(id),
  getPayments: (txnId: string) => dataLayer.getPayments(txnId),

  // ── Writes (offline-aware) ──

  async addPerson(person: Person): Promise<void> {
    if (isOnline()) {
      return dataLayer.addPerson(person);
    }
    addToQueue('addPerson', [person]);
  },

  async addTransaction(txn: Transaction): Promise<void> {
    if (isOnline()) {
      return dataLayer.addTransaction(txn);
    }
    addToQueue('addTransaction', [txn]);
  },

  async addPayment(payment: Payment): Promise<void> {
    if (isOnline()) {
      return dataLayer.addPayment(payment);
    }
    addToQueue('addPayment', [payment]);
  },

  async updatePerson(id: string, updates: Partial<Person>): Promise<void> {
    if (isOnline()) {
      return dataLayer.updatePerson(id, updates);
    }
    addToQueue('updatePerson', [id, updates]);
  },

  async deletePerson(id: string): Promise<void> {
    if (isOnline()) {
      return dataLayer.deletePerson(id);
    }
    addToQueue('deletePerson', [id]);
  },

  async deleteTransaction(id: string): Promise<void> {
    if (isOnline()) {
      return dataLayer.deleteTransaction(id);
    }
    addToQueue('deleteTransaction', [id]);
  },

  async deletePayment(id: string, transactionId: string): Promise<void> {
    if (isOnline()) {
      return dataLayer.deletePayment(id, transactionId);
    }
    addToQueue('deletePayment', [id, transactionId]);
  },
};
