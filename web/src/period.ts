import { today } from './format';

export type Period =
  | { kind: 'all' }
  | { kind: 'month'; month: string } // 'YYYY-MM'
  | { kind: 'year'; year: number }
  | { kind: 'custom'; from: string; to: string };

export const currentMonth = (): Period => ({ kind: 'month', month: today().slice(0, 7) });

const lastDayOfMonth = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
};

export function periodRange(p: Period): { from?: string; to?: string } {
  switch (p.kind) {
    case 'all':
      return {};
    case 'month':
      return { from: `${p.month}-01`, to: lastDayOfMonth(p.month) };
    case 'year':
      return { from: `${p.year}-01-01`, to: `${p.year}-12-31` };
    case 'custom':
      return { from: p.from || undefined, to: p.to || undefined };
  }
}
