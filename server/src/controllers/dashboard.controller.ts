import type { Request, Response } from 'express';
import * as service from '../services/dashboard.service.js';

export async function summary(_req: Request, res: Response) { res.json({ data: await service.getDashboardSummary() }); }
export async function byCountry(_req: Request, res: Response) { res.json({ data: await service.getCountryAnalytics() }); }
export async function byDepartment(_req: Request, res: Response) { res.json({ data: await service.getDepartmentAnalytics() }); }
export async function salaryDistribution(_req: Request, res: Response) { res.json({ data: await service.getSalaryDistribution() }); }
