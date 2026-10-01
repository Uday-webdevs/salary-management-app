import type { AuthSession, Country, CountryAnalytics, DashboardSummary, Department, DepartmentAnalytics, Employee, PageResult, SalaryDistribution, SalaryHistory } from '../types/api';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code: string) { super(message); }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await fetch(url, { credentials: 'same-origin', ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } }); }
  catch { throw new ApiError('Unable to reach the server. Check your connection and try again.', 0, 'NETWORK_ERROR'); }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = typeof payload === 'object' && payload !== null && 'error' in payload ? payload.error : null;
    const message = typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string' ? error.message : 'The request could not be completed.';
    const code = typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string' ? error.code : 'REQUEST_ERROR';
    throw new ApiError(message, response.status, code);
  }
  return payload as T;
}

export interface EmployeeParams {
  page: number; pageSize: number; search?: string; country?: string; currency?: string; department?: string;
  status?: string; minSalary?: number; maxSalary?: number; sortBy?: string; sortOrder?: string;
}

export const api = {
  authSession: async () => (await request<{ data: AuthSession }>('/api/auth/me')).data,
  employees: async (params: EmployeeParams) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, String(value)); });
    return request<PageResult<Employee>>(`/api/employees?${query}`);
  },
  employee: async (id: number) => (await request<{ data: Employee }>(`/api/employees/${id}`)).data,
  salaryHistory: async (id: number) => (await request<{ data: SalaryHistory[] }>(`/api/employees/${id}/salary-history`)).data,
  updateSalary: async (id: number, body: { baseSalaryMinor: number; bonusMinor: number; currency: string; effectiveDate: string; expectedVersion: number }) =>
    (await request<{ data: Employee }>(`/api/employees/${id}/salary`, { method: 'PATCH', body: JSON.stringify(body) })).data,
  countries: async () => (await request<{ data: Country[] }>('/api/employees/countries')).data,
  departments: async () => (await request<{ data: Department[] }>('/api/employees/departments')).data,
  dashboard: async () => {
    const [summary, countries, departments, distribution] = await Promise.all([
      request<{ data: DashboardSummary }>('/api/dashboard/summary'), request<{ data: CountryAnalytics[] }>('/api/dashboard/by-country'),
      request<{ data: DepartmentAnalytics[] }>('/api/dashboard/by-department'), request<{ data: SalaryDistribution[] }>('/api/dashboard/salary-distribution')
    ]);
    return { summary: summary.data, countries: countries.data, departments: departments.data, distribution: distribution.data };
  }
};

export function minorToMajor(value: number, currency: string): number { return value / (currency === 'JPY' ? 1 : 100); }
export function formatMoney(minor: number, currency: string, compact = false): string {
  return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: currency === 'JPY' ? 0 : 2, notation: compact ? 'compact' : 'standard' }).format(minorToMajor(minor, currency));
}
