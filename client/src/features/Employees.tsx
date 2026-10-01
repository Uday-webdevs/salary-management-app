import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown, BriefcaseBusiness, Mail, MapPin, CalendarDays, Pencil, RefreshCw, X } from 'lucide-react';
import { z } from 'zod';
import { api, formatMoney, minorToMajor, type EmployeeParams } from '../services/api';
import type { Country, Department, Employee, SalaryHistory } from '../types/api';

const emptyPage = { page: 1, pageSize: 25, total: 0, totalPages: 0 };
const moneyInputSchema = z.string().trim().regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount with up to 2 decimal places.').refine((value) => Number.isFinite(Number(value)), 'Enter a valid amount.');
function toMinor(value: string, currency: string): number {
  if (currency === 'JPY') return Number(BigInt(value));
  const [whole = '0', fraction = ''] = value.split('.');
  return Number(BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0')));
}
function inputAmount(minor: number, currency: string) { return String(minorToMajor(minor, currency)); }
const dateInput = (date: string) => new Date(date).toISOString().slice(0, 10);
const fullDate = (date: string) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(date));

interface Props { onEmployeeChanged?: () => void; canEditCompensation?: boolean }

export default function Employees({ onEmployeeChanged, canEditCompensation = false }: Props) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [currency, setCurrency] = useState('');
  const [minSalary, setMinSalary] = useState('');
  const [maxSalary, setMaxSalary] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [rows, setRows] = useState<Employee[]>([]);
  const [pagination, setPagination] = useState(emptyPage);
  const [countries, setCountries] = useState<Country[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [salaryError, setSalaryError] = useState('');
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => { void Promise.all([api.countries(), api.departments()]).then(([countryRows, departmentRows]) => { setCountries(countryRows); setDepartments(departmentRows); }).catch(() => undefined); }, []);
  useEffect(() => { const timer = window.setTimeout(() => { setSearch(searchDraft.trim()); setPage(1); }, 300); return () => window.clearTimeout(timer); }, [searchDraft]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const minResult = minSalary ? moneyInputSchema.safeParse(minSalary) : undefined;
    const maxResult = maxSalary ? moneyInputSchema.safeParse(maxSalary) : undefined;
    if (currency && ((minSalary && !minResult?.success) || (maxSalary && !maxResult?.success))) {
      setSalaryError('Enter salary bounds using up to 2 decimal places.');
      setRows([]);
      setLoading(false);
      return;
    }
    if (currency && minResult?.success && maxResult?.success && toMinor(minResult.data, currency) > toMinor(maxResult.data, currency)) {
      setSalaryError('Minimum salary must be less than or equal to maximum salary.');
      setRows([]);
      setLoading(false);
      return;
    }
    setSalaryError('');
    try {
      const params: EmployeeParams = { page, pageSize, sortBy, sortOrder, ...(search ? { search } : {}), ...(country ? { country } : {}), ...(department ? { department } : {}), ...(status ? { status } : {}), ...(currency ? { currency } : {}), ...(currency && minResult?.success ? { minSalary: toMinor(minResult.data, currency) } : {}), ...(currency && maxResult?.success ? { maxSalary: toMinor(maxResult.data, currency) } : {}) };
      const result = await api.employees(params); setRows(result.data); setPagination(result.pagination);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load employees.'); }
    finally { setLoading(false); }
  }, [page, pageSize, sortBy, sortOrder, search, country, department, status, currency, minSalary, maxSalary]);
  useEffect(() => { void load(); }, [load]);

  const toggleSort = (key: string) => { if (sortBy === key) setSortOrder((current) => current === 'asc' ? 'desc' : 'asc'); else { setSortBy(key); setSortOrder('asc'); } setPage(1); };
  const clearFilters = () => { setCountry(''); setDepartment(''); setStatus(''); setCurrency(''); setMinSalary(''); setMaxSalary(''); setSearchDraft(''); setPage(1); };
  const hasFilters = !!(search || country || department || status || currency || minSalary || maxSalary);
  const handleChanged = () => { void load(); onEmployeeChanged?.(); };

  return <div className="page-content employees-page">
    {selected !== null ? <EmployeeDetail id={selected} onBack={() => setSelected(null)} onSaved={handleChanged} canEditCompensation={canEditCompensation}/> : <>
      <div className="page-heading"><div><p className="eyebrow">PEOPLE DIRECTORY</p><h1>Employees</h1><p className="subtitle">Search, review, and manage compensation across your organization.</p></div><div className="directory-count"><strong>{pagination.total.toLocaleString()}</strong><span>employee records</span></div></div>
      <section className="panel directory-panel">
        <div className="toolbar"><div className="search-box"><Search size={17}/><input aria-label="Search employees" placeholder="Search name, ID, or email…" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)}/>{searchDraft && <button className="icon-button" aria-label="Clear search" onClick={() => setSearchDraft('')}><X size={14}/></button>}</div>
          <div className="filter-bar"><label className="filter-control"><span>Country</span><select aria-label="Filter by country" value={country} onChange={(event) => { setCountry(event.target.value); setPage(1); }}><option value="">All countries</option>{countries.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label>
            <label className="filter-control"><span>Department</span><select aria-label="Filter by department" value={department} onChange={(event) => { setDepartment(event.target.value); setPage(1); }}><option value="">All departments</option>{departments.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
            <label className="filter-control"><span>Status</span><select aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="ON_LEAVE">On leave</option><option value="TERMINATED">Terminated</option></select></label>
            <label className="filter-control"><span>Currency</span><select aria-label="Filter by currency" value={currency} onChange={(event) => { setCurrency(event.target.value); setPage(1); }}><option value="">All currencies</option>{Array.from(new Set(countries.map((item) => item.currency))).map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
        </div>
        <div className="advanced-filters"><div className="advanced-label"><SlidersHorizontal size={14}/> Salary bounds {currency ? `· ${currency}` : '· select currency to compare'}</div><input aria-label="Minimum salary" inputMode="decimal" placeholder="Minimum" value={minSalary} onChange={(event) => { setMinSalary(event.target.value); setPage(1); }}/><span>to</span><input aria-label="Maximum salary" inputMode="decimal" placeholder="Maximum" value={maxSalary} onChange={(event) => { setMaxSalary(event.target.value); setPage(1); }}/>{hasFilters && <button className="clear-filters" onClick={clearFilters}>Clear filters</button>}{salaryError && <span className="filter-error" role="alert">{salaryError}</span>}</div>
        {error ? <div className="state-card inline-state"><h2>Could not load employees</h2><p>{error}</p><button className="button button-secondary" onClick={() => void load()}><RefreshCw size={15}/>Retry</button></div> : loading ? <div className="table-loading" role="status"><span className="spinner"/> Loading employee records…</div> : rows.length === 0 ? <div className="state-card inline-state"><div className="empty-icon"><Search size={22}/></div><h2>{hasFilters ? 'No matching employees' : 'No employees yet'}</h2><p>{hasFilters ? 'Try changing your search or filters.' : 'Employee records will appear here after the database is seeded.'}</p>{hasFilters && <button className="button button-secondary" onClick={clearFilters}>Clear filters</button>}</div> : <>
          <div className="table-scroll"><table className="employee-table"><thead><tr>{[['name','Employee'],['country','Country'],['department','Department'],['status','Status'],['baseSalary','Base salary'],['baseSalary','Bonus'],['baseSalary','Total compensation']].map(([key, title], index) => <th key={`${title}-${index}`}><button className="sort-button" onClick={() => toggleSort(key!)}>{title}{sortBy === key ? sortOrder === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/> : <ArrowUpDown size={12}/>}</button></th>)}</tr></thead><tbody>{rows.map((employee) => <tr key={employee.id}><td><button className="employee-cell" onClick={() => setSelected(employee.id)}><span className="avatar">{employee.firstName[0]}{employee.lastName[0]}</span><span><strong>{employee.firstName} {employee.lastName}</strong><small>{employee.employeeCode} · {employee.jobTitle}</small></span></button></td><td><div className="country-cell"><span className="country-flag">{employee.countryCode}</span>{employee.country.name}</div></td><td>{employee.department.name}</td><td><span className={`status-badge ${employee.employmentStatus.toLowerCase()}`}>{employee.employmentStatus === 'ON_LEAVE' ? 'On leave' : employee.employmentStatus[0] + employee.employmentStatus.slice(1).toLowerCase()}</span></td><td className="money-cell">{formatMoney(employee.baseSalaryMinor, employee.currency)}</td><td className="money-cell secondary-money">{formatMoney(employee.bonusMinor, employee.currency)}</td><td className="money-cell total-money">{formatMoney(employee.totalCompensationMinor, employee.currency)}</td></tr>)}</tbody></table></div>
          <div className="table-footer"><span>Showing <strong>{((page - 1) * pageSize + 1).toLocaleString()}–{Math.min(page * pageSize, pagination.total).toLocaleString()}</strong> of {pagination.total.toLocaleString()}</span><div className="pagination-controls"><label>Rows per page<select aria-label="Rows per page" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option>10</option><option>25</option><option>50</option><option>100</option></select></label><button aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((v) => v - 1)}><ChevronLeft size={17}/></button><span>Page <strong>{page}</strong> of {pagination.totalPages}</span><button aria-label="Next page" disabled={page >= pagination.totalPages} onClick={() => setPage((v) => v + 1)}><ChevronRight size={17}/></button></div></div>
        </>}
      </section>
      <p className="directory-note">Compensation is shown in each employee’s local currency. Salary bounds are compared only after a currency is selected.</p>
    </>}
  </div>;
}

function EmployeeDetail({ id, onBack, onSaved, canEditCompensation }: { id: number; onBack: () => void; onSaved: () => void; canEditCompensation: boolean }) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [history, setHistory] = useState<SalaryHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const load = useCallback(async () => { setLoading(true); setError(''); try { const [record, records] = await Promise.all([api.employee(id), api.salaryHistory(id)]); setEmployee(record); setHistory(records); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load employee.'); } finally { setLoading(false); } }, [id]);
  useEffect(() => { void load(); }, [load]);
  if (loading) return <div className="page-loading" role="status">Loading employee details…</div>;
  if (error || !employee) return <div className="state-card error-state"><h2>Employee unavailable</h2><p>{error || 'Employee record not found.'}</p><button className="button button-secondary" onClick={onBack}>Back to employees</button></div>;

  return <div className="detail-page"><button className="back-link" onClick={onBack}><ChevronLeft size={16}/> Back to employees</button><div className="detail-title"><div className="detail-avatar">{employee.firstName[0]}{employee.lastName[0]}</div><div><p className="eyebrow">EMPLOYEE PROFILE · {employee.employeeCode}</p><h1>{employee.firstName} {employee.lastName}</h1><p className="subtitle">{employee.jobTitle} <span>·</span> {employee.department.name}</p></div><span className={`status-badge ${employee.employmentStatus.toLowerCase()}`}>{employee.employmentStatus === 'ON_LEAVE' ? 'On leave' : employee.employmentStatus[0] + employee.employmentStatus.slice(1).toLowerCase()}</span></div>
      <div className="detail-grid"><div className="detail-main"><section className="panel detail-panel"><div className="panel-heading"><div><h2>Compensation</h2><p>Current salary and bonus information</p></div>{canEditCompensation && <button className="button button-secondary edit-button" onClick={() => setEditing(true)}><Pencil size={14}/> Edit salary</button>}</div><div className="compensation-hero"><span>Annual base salary</span><strong>{formatMoney(employee.baseSalaryMinor, employee.currency)}</strong><small>Effective {fullDate(employee.salaryEffectiveDate)}</small></div><div className="compensation-stats"><div><span>Annual bonus</span><strong>{formatMoney(employee.bonusMinor, employee.currency)}</strong></div><div><span>Total compensation</span><strong>{formatMoney(employee.totalCompensationMinor, employee.currency)}</strong></div><div><span>Currency</span><strong>{employee.currency}</strong></div></div></section>
      <section className="panel detail-panel history-panel"><div className="panel-heading"><div><h2>Salary history</h2><p>Recorded compensation changes</p></div><span className="history-count">{history.length} {history.length === 1 ? 'change' : 'changes'}</span></div>{history.length ? <div className="history-list">{history.map((item) => <SalaryHistoryEntry key={item.id} item={item}/>)}</div> : <div className="history-empty">No salary changes have been recorded yet.</div>}</section></div>
      <aside className="detail-aside"><section className="panel info-panel"><h2>Personal information</h2><InfoRow icon={Mail} label="Email" value={employee.email}/><InfoRow icon={MapPin} label="Country" value={`${employee.country.name} (${employee.country.code})`}/><InfoRow icon={BriefcaseBusiness} label="Employee code" value={employee.employeeCode}/></section><section className="panel info-panel"><h2>Employment</h2><InfoRow icon={BriefcaseBusiness} label="Department" value={employee.department.name}/><InfoRow icon={BriefcaseBusiness} label="Job title" value={employee.jobTitle}/><InfoRow icon={CalendarDays} label="Hire date" value={fullDate(employee.hireDate)}/><InfoRow icon={CalendarDays} label="Status" value={employee.employmentStatus === 'ON_LEAVE' ? 'On leave' : employee.employmentStatus[0] + employee.employmentStatus.slice(1).toLowerCase()}/></section><div className="profile-note">Employee information is maintained by HR. Salary values are recorded in the employee’s local currency.</div></aside></div>
    {editing && <SalaryEditor employee={employee} onClose={() => setEditing(false)} onSuccess={async () => { setEditing(false); await load(); onSaved(); }}/>}</div>;
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) { return <div className="info-row"><span className="info-icon"><Icon size={15}/></span><span><small>{label}</small><strong>{value}</strong></span></div>; }

function SalaryHistoryEntry({ item }: { item: SalaryHistory }) {
  const previousCurrency = item.previousCurrency;
  const sameCurrency = previousCurrency === item.currency;
  const delta = item.newBaseSalaryMinor - item.previousBaseSalaryMinor;
  const previousSalary = previousCurrency ? formatMoney(item.previousBaseSalaryMinor, previousCurrency) : `${item.previousBaseSalaryMinor} minor units · currency unrecorded`;
  const previousBonus = previousCurrency ? formatMoney(item.previousBonusMinor, previousCurrency) : `${item.previousBonusMinor} minor units · currency unrecorded`;
  return <div className="history-row"><div className="history-dot"/><div className="history-info"><strong>Base salary {previousSalary} → {formatMoney(item.newBaseSalaryMinor, item.currency)}</strong><span>Effective {fullDate(item.effectiveDate)} · Updated {fullDate(item.changedAt)}</span><small>Bonus {previousBonus} → {formatMoney(item.newBonusMinor, item.currency)}{item.changedBy ? ` · by ${item.changedBy}` : ' · user attribution unavailable'}</small></div>{sameCurrency && <span className="history-delta">{delta >= 0 ? '+' : ''}{formatMoney(delta, item.currency)}</span>}</div>;
}

function SalaryEditor({ employee, onClose, onSuccess }: { employee: Employee; onClose: () => void; onSuccess: () => Promise<void> }) {
  const [base, setBase] = useState(inputAmount(employee.baseSalaryMinor, employee.currency));
  const [bonus, setBonus] = useState(inputAmount(employee.bonusMinor, employee.currency));
  const [currency, setCurrency] = useState(employee.currency);
  const [effectiveDate, setEffectiveDate] = useState(dateInput(employee.salaryEffectiveDate));
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, saving]);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setFieldError(''); setError('');
    const baseResult = moneyInputSchema.safeParse(base); const bonusResult = moneyInputSchema.safeParse(bonus);
    if (!baseResult.success || !bonusResult.success) { setFieldError(baseResult.error?.issues[0]?.message ?? bonusResult.error?.issues[0]?.message ?? 'Enter valid salary amounts.'); return; }
    if (!effectiveDate || Number.isNaN(Date.parse(`${effectiveDate}T00:00:00Z`))) { setFieldError('Choose a valid effective date.'); return; }
    const amountExponent = currency === 'JPY' ? 0 : 2;
    if (amountExponent === 0 && (base.includes('.') || bonus.includes('.'))) { setFieldError('JPY amounts must be whole numbers.'); return; }
    setSaving(true);
    try {
      if (toMinor(base, currency) > 2_000_000_000 || toMinor(bonus, currency) > 2_000_000_000) { setFieldError('Amount exceeds the supported limit.'); return; }
      await api.updateSalary(employee.id, { baseSalaryMinor: toMinor(base, currency), bonusMinor: toMinor(bonus, currency), currency, effectiveDate, expectedVersion: employee.version });
      await onSuccess();
    }
    catch (e) { setError(e instanceof Error ? e.message : 'Salary update failed.'); }
    finally { setSaving(false); }
  };

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}><section className="salary-modal" role="dialog" aria-modal="true" aria-labelledby="salary-modal-title"><div className="modal-heading"><div><p className="eyebrow">COMPENSATION UPDATE</p><h2 id="salary-modal-title">Edit salary</h2><p>{employee.firstName} {employee.lastName} · {employee.employeeCode}</p></div><button className="icon-button close-button" aria-label="Close salary editor" onClick={onClose}><X size={19}/></button></div><form onSubmit={(event) => void submit(event)}><div className="form-grid"><label className="form-field"><span>Base salary <em>*</em></span><div className="amount-input"><span>{currency}</span><input autoFocus aria-label="Base salary" inputMode="decimal" required value={base} onChange={(event) => setBase(event.target.value)}/></div></label><label className="form-field"><span>Annual bonus <em>*</em></span><div className="amount-input"><span>{currency}</span><input aria-label="Annual bonus" inputMode="decimal" required value={bonus} onChange={(event) => setBonus(event.target.value)}/></div></label><label className="form-field"><span>Currency <em>*</em></span><select aria-label="Salary currency" value={currency} onChange={(event) => setCurrency(event.target.value)}>{['USD','EUR','GBP','CAD','AUD','INR','SGD','JPY'].map((item) => <option key={item}>{item}</option>)}</select></label><label className="form-field"><span>Effective date <em>*</em></span><input aria-label="Effective date" type="date" required value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)}/></label></div><p className="form-help">Amounts are entered in {currency}. Edit version {employee.version} is checked to detect conflicting changes.</p>{fieldError && <p className="form-error" role="alert">{fieldError}</p>}{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button className="button button-secondary" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save compensation'}</button></div></form></section></div>;
}
