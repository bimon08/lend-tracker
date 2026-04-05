// ─── Currency Formatting ──────────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ─── Date Formatting ─────────────────────────────────────────────────────────

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(date));
}

export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

export function formatInputDate(date: Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ─── ID Generation ───────────────────────────────────────────────────────────

export function generateId(): string {
  return crypto.randomUUID();
}

// ─── Status Helpers ──────────────────────────────────────────────────────────

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'settled':
      return 'Settled';
    case 'partial':
      return 'Partial';
    case 'pending':
      return 'Pending';
    default:
      return status;
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'settled':
      return 'var(--color-success)';
    case 'partial':
      return 'var(--color-warning)';
    case 'pending':
      return 'var(--color-danger)';
    default:
      return 'var(--color-text-secondary)';
  }
}

// ─── Name Helpers ────────────────────────────────────────────────────────────

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getAvatarColor(name: string): string {
  const colors = [
    'var(--gradient-lend)',
    'var(--gradient-borrow)',
    'linear-gradient(135deg, #667eea, #764ba2)',
    'linear-gradient(135deg, #f093fb, #f5576c)',
    'linear-gradient(135deg, #4facfe, #00f2fe)',
    'linear-gradient(135deg, #43e97b, #38f9d7)',
    'linear-gradient(135deg, #fa709a, #fee140)',
    'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// ─── Calculation Helpers ─────────────────────────────────────────────────────

export function calculateOutstanding(amount: number, paid: number): number {
  return Math.max(0, amount - paid);
}

export function calculateProgress(amount: number, paid: number): number {
  if (amount === 0) return 100;
  return Math.min(100, (paid / amount) * 100);
}

// ─── Due Date Helpers ────────────────────────────────────────────────────────

export function isOverdue(dueDate?: Date): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

export function getDaysUntilDue(dueDate: Date): number {
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
