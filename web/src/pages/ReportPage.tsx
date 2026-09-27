import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api, query, type CategoryReport } from '../api';
import { BarList, ErrorBox, Loading, Money, PageHeader, PeriodPicker } from '../components';
import { currentMonth, periodRange, type Period } from '../period';

const percent = new Intl.NumberFormat('it-IT', { style: 'percent', maximumFractionDigits: 1 });

export function ReportPage() {
  const [period, setPeriod] = useState<Period>(currentMonth());
  const q = query(periodRange(period));
  const { data, error, isPending } = useQuery({
    queryKey: ['report-categories', q],
    queryFn: () => api.get<CategoryReport>(`/reports/categories${q}`),
  });

  return (
    <>
      <PageHeader title="Report" />
      <div className="filters">
        <PeriodPicker value={period} onChange={setPeriod} allowAll />
      </div>
      {isPending && <Loading />}
      <ErrorBox error={error} />
      {data && (
        <>
          <section className="stats">
            <div>
              <span className="muted">Donazioni</span>
              <Money cents={data.donationsCents} sign="in" />
            </div>
            <div>
              <span className="muted">Spese</span>
              <Money cents={data.expensesCents} sign="out" />
            </div>
            <div>
              <span className="muted">Differenza</span>
              <Money cents={Math.abs(data.netCents)} sign={data.netCents < 0 ? 'out' : 'in'} />
            </div>
          </section>

          <h2>Spese per categoria</h2>
          {data.byCategory.length === 0 ? (
            <p className="muted">Nessuna spesa nel periodo.</p>
          ) : (
            <>
              <BarList
                rows={data.byCategory.map((r) => ({
                  key: r.categoryId,
                  label: r.name,
                  cents: r.totalCents,
                  hint: `${r.count} spese`,
                }))}
              />
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      <th className="num">Spese</th>
                      <th className="num">Totale</th>
                      <th className="num">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byCategory.map((r) => (
                      <tr key={r.categoryId}>
                        <td>
                          {r.name}
                          {r.archivedAt && <span className="muted"> (archiviata)</span>}
                        </td>
                        <td className="num">{r.count}</td>
                        <td className="num"><Money cents={r.totalCents} /></td>
                        <td className="num">{percent.format(r.totalCents / data.expensesCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>Totale</td>
                      <td className="num">{data.byCategory.reduce((s, r) => s + r.count, 0)}</td>
                      <td className="num"><Money cents={data.expensesCents} /></td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
