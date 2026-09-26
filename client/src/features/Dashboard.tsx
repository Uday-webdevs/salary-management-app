import { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Users, Wallet, BadgeDollarSign, CircleDollarSign } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, formatMoney } from '../services/api';
import type { CountryAnalytics, DashboardSummary, DepartmentAnalytics, SalaryDistribution } from '../types/api';

interface DashboardData { summary: DashboardSummary; countries: CountryAnalytics[]; departments: DepartmentAnalytics[]; distribution: SalaryDistribution[] }
const colors = ['#6667e8', '#82a7f8', '#54b8a7', '#f5b955', '#e58c88', '#9c84d9', '#68b7cf', '#bbc65e'];

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [currency, setCurrency] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.dashboard().then((result) => { setData(result); setCurrency(result.summary.salaryStatisticsByCurrency[0]?.currency ?? ''); }).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Unable to load dashboard')).finally(() => setLoading(false)); }, []);

  const stats = useMemo(() => data?.summary.salaryStatisticsByCurrency.find((s) => s.currency === currency), [data, currency]);
  const payroll = useMemo(() => data?.summary.annualBasePayrollByCurrency.find((s) => s.currency === currency), [data, currency]);
  const countries = useMemo(() => data?.countries.filter((row) => row.currency === currency) ?? [], [data, currency]);
  const departments = useMemo(() => data?.departments.filter((row) => row.currency === currency) ?? [], [data, currency]);
  const distribution = useMemo(() => data?.distribution.filter((row) => row.currency === currency) ?? [], [data, currency]);

  if (loading) return <div className="page-loading" role="status">Loading workforce insights…</div>;
  if (error) return <div className="state-card error-state"><h2>Dashboard unavailable</h2><p>{error}</p><button className="button button-primary" onClick={() => window.location.reload()}>Try again</button></div>;
  if (!data) return null;

  const cards = [
    { label: 'Total employees', value: data.summary.totalEmployees.toLocaleString(), icon: Users, note: 'All employment statuses', tint: 'violet' },
    { label: 'Active employees', value: data.summary.activeEmployees.toLocaleString(), icon: Wallet, note: 'Included in payroll metrics', tint: 'green' },
    { label: `Annual base payroll · ${currency}`, value: payroll ? formatMoney(payroll.amountMinor, currency, true) : '—', icon: BadgeDollarSign, note: 'Active employees · base salary only', tint: 'blue' },
    { label: `Average base salary · ${currency}`, value: stats ? formatMoney(stats.averageMinor, currency, true) : '—', icon: CircleDollarSign, note: `Median ${stats ? formatMoney(stats.medianMinor, currency, true) : '—'}`, tint: 'amber' }
  ];

  return <div className="page-content dashboard-page">
    <div className="page-heading"><div><p className="eyebrow">WORKFORCE OVERVIEW</p><h1>Compensation dashboard</h1><p className="subtitle">Compensation insights across your organization.</p></div><label className="currency-select">Reporting currency<select aria-label="Reporting currency" value={currency} onChange={(event) => setCurrency(event.target.value)}>{data.summary.salaryStatisticsByCurrency.map((item) => <option key={item.currency}>{item.currency}</option>)}</select></label></div>
    <div className="metric-grid">{cards.map(({ label, value, icon: Icon, note, tint }, index) => <article className="metric-card" key={label}><div className={`metric-icon ${tint}`}><Icon size={19}/></div><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-note">{index === 0 ? <><ArrowUpRight size={13}/> {note}</> : index === 1 ? <><ArrowDownRight size={13}/> {note}</> : note}</div></article>)}</div>
    <section className="section-heading"><div><h2>Compensation overview</h2><p>Active employee base salaries, shown in {currency}.</p></div><span className="updated-chip">Live data</span></section>
    <div className="chart-grid"><article className="panel chart-panel"><div className="panel-heading"><div><h3>Headcount by country</h3><p>Active employees in {currency}</p></div><span className="chart-legend-dot"/></div>{countries.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={countries} layout="vertical" margin={{ left: 10, right: 24, top: 4, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#8b95a8', fontSize: 11 }}/><YAxis type="category" dataKey="country" width={105} axisLine={false} tickLine={false} tick={{ fill: '#59667a', fontSize: 12 }}/><Tooltip/><Bar dataKey="headcount" fill="#6869e9" radius={[0, 5, 5, 0]} barSize={14}/></BarChart></ResponsiveContainer></div> : <div className="chart-empty">No data for this currency yet.</div>}</article>
      <article className="panel chart-panel"><div className="panel-heading"><div><h3>Salary distribution</h3><p>Annual base salary bands</p></div><span className="subtle-tag">{currency}</span></div>{distribution.length ? <div className="distribution-layout"><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={distribution} dataKey="headcount" nameKey="salaryBand" innerRadius="68%" outerRadius="90%" paddingAngle={3}>{distribution.map((entry, index) => <Cell key={entry.salaryBand} fill={colors[index % colors.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer><div className="donut-center"><strong>{distribution.reduce((sum, row) => sum + row.headcount, 0).toLocaleString()}</strong><span>employees</span></div></div><div className="distribution-legend">{distribution.map((row, index) => <div className="legend-row" key={row.salaryBand}><span className="legend-swatch" style={{ background: colors[index % colors.length] }}/><span>{row.salaryBand}</span><strong>{row.headcount.toLocaleString()}</strong></div>)}</div></div> : <div className="chart-empty">No salary data available.</div>}</article></div>
    <div className="chart-grid lower-charts"><article className="panel chart-panel"><div className="panel-heading"><div><h3>Average salary by department</h3><p>Annual base salary in {currency}</p></div></div>{departments.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={departments} margin={{ left: 0, right: 12, top: 8, bottom: 24 }}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="department" axisLine={false} tickLine={false} tick={{ fill: '#737f92', fontSize: 10 }} angle={-17} textAnchor="end" interval={0}/><YAxis axisLine={false} tickLine={false} tick={{ fill: '#8b95a8', fontSize: 11 }} tickFormatter={(value: number) => formatMoney(value, currency, true)}/><Tooltip formatter={(value) => formatMoney(Number(value), currency)}/><Bar dataKey="averageSalaryMinor" fill="#50b7a5" radius={[5, 5, 0, 0]} barSize={28}/></BarChart></ResponsiveContainer></div> : <div className="chart-empty">No department data for this currency.</div>}</article>
      <article className="panel range-panel"><div className="panel-heading"><div><h3>Salary range</h3><p>Active employees · {currency}</p></div></div><div className="range-list">{stats && <><div className="range-item"><span>Minimum</span><strong>{formatMoney(stats.minimumMinor, currency)}</strong></div><div className="range-item"><span>Median</span><strong>{formatMoney(stats.medianMinor, currency)}</strong></div><div className="range-item"><span>Average</span><strong>{formatMoney(stats.averageMinor, currency)}</strong></div><div className="range-item"><span>Maximum</span><strong>{formatMoney(stats.maximumMinor, currency)}</strong></div></>}</div><div className="range-footnote">Base salary only · grouped by native currency. No exchange-rate conversion is applied.</div></article></div>
  </div>;
}
