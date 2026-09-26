export type EmploymentStatus = 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';
export interface Country { code: string; name: string; currency: string }
export interface Department { id: number; name: string }
export interface Employee {
  id: number; employeeCode: string; firstName: string; lastName: string; email: string; countryCode: string;
  departmentId: number; jobTitle: string; employmentStatus: EmploymentStatus; hireDate: string; currency: string;
  baseSalaryMinor: number; bonusMinor: number; totalCompensationMinor: number; salaryEffectiveDate: string; updatedAt: string; version: number;
  country: Country; department: Department;
}
export interface SalaryHistory {
  id: number; employeeId: number; previousBaseSalaryMinor: number; newBaseSalaryMinor: number;
  previousBonusMinor: number; newBonusMinor: number; previousCurrency: string | null; currency: string; effectiveDate: string; changedAt: string; changedBy: string | null;
}
export interface PageResult<T> { data: T[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }
export interface DashboardSummary {
  totalEmployees: number; activeEmployees: number;
  annualBasePayrollByCurrency: { currency: string; amountMinor: number }[];
  salaryStatisticsByCurrency: { currency: string; averageMinor: number; medianMinor: number; minimumMinor: number; maximumMinor: number }[];
}
export interface CountryAnalytics { countryCode: string; country: string; currency: string; headcount: number; annualBasePayrollMinor: number }
export interface DepartmentAnalytics { department: string; currency: string; headcount: number; annualBasePayrollMinor: number; averageSalaryMinor: number }
export interface SalaryDistribution { currency: string; salaryBand: string; headcount: number }
