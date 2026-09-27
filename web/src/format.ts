const euro = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
const longDate = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });

export const formatEuro = (cents: number) => euro.format(cents / 100);

export const formatDate = (iso: string) => longDate.format(new Date(`${iso.slice(0, 10)}T12:00:00`));

// Accepts "12", "12,5", "12,50", "1.234,56" and "12.50". Returns null if invalid.
export function parseEuro(input: string): number | null {
  let s = input.trim().replace(/[€\s]/g, '');
  if (!s) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}

// Value for an amount <input>, e.g. 1250 -> "12,50".
export const centsToInput = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
