import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Employees from './Employees';
import { api } from '../services/api';
import type { Employee } from '../types/api';

const fixture: Employee = {
  id: 71, employeeCode: 'EMP-00071', firstName: 'Avery', lastName: 'Morgan', email: 'avery.morgan@example.com', countryCode: 'US',
  departmentId: 1, jobTitle: 'People Partner', employmentStatus: 'ACTIVE', hireDate: '2021-02-03T00:00:00.000Z', currency: 'USD',
  baseSalaryMinor: 8500000, bonusMinor: 300000, totalCompensationMinor: 8800000, salaryEffectiveDate: '2024-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z', version: 2, country: { code: 'US', name: 'United States', currency: 'USD' }, department: { id: 1, name: 'People' }
};

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('employee directory', () => {
  it('renders server results and passes search and filter values to the API', async () => {
    const employeeSpy = vi.spyOn(api, 'employees').mockResolvedValue({ data: [fixture], pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 } });
    vi.spyOn(api, 'countries').mockResolvedValue([fixture.country]);
    vi.spyOn(api, 'departments').mockResolvedValue([fixture.department]);
    const user = userEvent.setup();
    render(<Employees/>);
    expect(await screen.findByText('Avery Morgan')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Filter by country'), 'US');
    await waitFor(() => expect(employeeSpy).toHaveBeenLastCalledWith(expect.objectContaining({ country: 'US' })));
    await user.type(screen.getByRole('textbox', { name: 'Search employees' }), 'avery');
    await waitFor(() => expect(employeeSpy).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'avery', country: 'US' })), { timeout: 1500 });
  });

  it('shows API errors and supports retry', async () => {
    const employeeSpy = vi.spyOn(api, 'employees').mockRejectedValueOnce(new Error('Server unavailable')).mockResolvedValue({ data: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 } });
    vi.spyOn(api, 'countries').mockResolvedValue([]);
    vi.spyOn(api, 'departments').mockResolvedValue([]);
    const user = userEvent.setup();
    render(<Employees/>);
    expect(await screen.findByText('Server unavailable')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('No employees yet')).toBeInTheDocument();
    expect(employeeSpy).toHaveBeenCalledTimes(2);
  });

  it('requests the next page from the server', async () => {
    const employeeSpy = vi.spyOn(api, 'employees').mockImplementation(async (params) => ({
      data: [fixture], pagination: { page: params.page, pageSize: params.pageSize, total: 51, totalPages: 3 }
    }));
    vi.spyOn(api, 'countries').mockResolvedValue([]);
    vi.spyOn(api, 'departments').mockResolvedValue([]);
    const user = userEvent.setup();
    render(<Employees/>);
    expect(await screen.findByRole('button', { name: 'Next page' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(employeeSpy).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
  });

  it('validates salary edits and submits the optimistic version on success', async () => {
    vi.spyOn(api, 'employees').mockResolvedValue({ data: [fixture], pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 } });
    vi.spyOn(api, 'countries').mockResolvedValue([fixture.country]);
    vi.spyOn(api, 'departments').mockResolvedValue([fixture.department]);
    vi.spyOn(api, 'employee').mockResolvedValue(fixture);
    vi.spyOn(api, 'salaryHistory').mockResolvedValue([]);
    const updateSpy = vi.spyOn(api, 'updateSalary').mockResolvedValue({ ...fixture, baseSalaryMinor: 9000000, totalCompensationMinor: 9300000, version: 3 });
    const user = userEvent.setup();
    render(<Employees canEditCompensation/>);
    await user.click(await screen.findByRole('button', { name: /Avery Morgan/ }));
    await screen.findByText('Personal information');
    await user.click(screen.getByRole('button', { name: 'Edit salary' }));
    await user.clear(screen.getByRole('textbox', { name: 'Base salary' }));
    await user.type(screen.getByRole('textbox', { name: 'Base salary' }), '-1');
    await user.click(screen.getByRole('button', { name: 'Save compensation' }));
    expect(await screen.findByText(/valid amount/i)).toBeInTheDocument();
    expect(updateSpy).not.toHaveBeenCalled();
    await user.clear(screen.getByRole('textbox', { name: 'Base salary' }));
    await user.type(screen.getByRole('textbox', { name: 'Base salary' }), '90000');
    await user.click(screen.getByRole('button', { name: 'Save compensation' }));
    await waitFor(() => expect(updateSpy).toHaveBeenCalledWith(71, expect.objectContaining({ baseSalaryMinor: 9000000, expectedVersion: 2 })));
  });
});
