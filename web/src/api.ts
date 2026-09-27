// Types mirror the JSON returned by the server (server/src/routes).

export interface User {
  id: number;
  email: string;
  name: string;
  isAdmin: boolean;
  enabled: boolean;
}

export interface Category {
  id: number;
  name: string;
  archivedAt: string | null;
}

export interface Cat {
  id: number;
  name: string;
  notes: string | null;
  archivedAt: string | null;
}

export const paymentMethods = {
  cash: 'Contanti',
  bank_transfer: 'Bonifico',
  paypal: 'PayPal',
  other: 'Altro',
} as const;
export type PaymentMethod = keyof typeof paymentMethods;

export interface DonationInput {
  date: string;
  amountCents: number;
  donor: string | null;
  paymentMethod: PaymentMethod;
  notes: string | null;
}

export interface Donation extends DonationInput {
  id: number;
  deletedAt: string | null;
}

export interface ExpenseInput {
  date: string;
  amountCents: number;
  categoryId: number;
  description: string;
  catId: number | null;
  supplier: string | null;
  notes: string | null;
}

export interface Expense extends ExpenseInput {
  id: number;
  deletedAt: string | null;
  categoryName: string;
  catName: string | null;
}

export interface Settings {
  openingBalanceCents: number | null;
  openingBalanceDate: string | null;
}

export interface Balance extends Settings {
  donationsCents: number;
  expensesCents: number;
  balanceCents: number;
}

export interface CategoryReport {
  byCategory: { categoryId: number; name: string; archivedAt: string | null; count: number; totalCents: number }[];
  donationsCents: number;
  expensesCents: number;
  netCents: number;
}

export interface CatReport {
  cat: Cat;
  expenses: Pick<Expense, 'id' | 'date' | 'amountCents' | 'description' | 'supplier' | 'categoryId' | 'categoryName'>[];
  byCategory: { categoryId: number; name: string; totalCents: number }[];
  totalCents: number;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Errore ${res.status}`);
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
};

export const query = (params: Record<string, string | number | boolean | undefined>) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : '';
};
