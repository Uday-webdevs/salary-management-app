import type { Request, RequestHandler } from 'express';
import { env } from '../config/env.js';

export interface AccessSession {
  authenticated: true;
  mode: 'development' | 'oidc';
  user: { subject: string; name: string; email: string | null };
  permissions: { readEmployeeData: boolean; editCompensation: boolean; viewSalaryHistory: boolean };
}

export interface SalaryHistoryActor {
  subject: string;
  tenantId: string | null;
  objectId: string | null;
  displayName: string;
}

function roleValues(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.filter((role): role is string => typeof role === 'string');
  return [];
}

export function getAccessSession(request: Request): AccessSession | null {
  if (env.AUTH_MODE === 'development') {
    return {
      authenticated: true,
      mode: 'development',
      user: { subject: 'local-development-user', name: 'Local developer', email: null },
      permissions: { readEmployeeData: true, editCompensation: true, viewSalaryHistory: true }
    };
  }

  if (!request.oidc?.isAuthenticated()) return null;

  const claims = request.oidc.user ?? {};
  const roles = roleValues(claims[env.AUTH_ROLE_CLAIM]);
  const editCompensation = roles.includes(env.AUTH_EDIT_ROLE);
  const viewSalaryHistory = roles.includes(env.AUTH_AUDIT_ROLE);
  const readEmployeeData = editCompensation || viewSalaryHistory || roles.includes(env.AUTH_READ_ROLE);
  const subject = typeof claims.sub === 'string' ? claims.sub.trim() : '';
  if (!subject) return null;

  return {
    authenticated: true,
    mode: 'oidc',
    user: {
      subject,
      name: typeof claims.name === 'string' ? claims.name : 'Signed-in user',
      email: typeof claims.email === 'string' ? claims.email : null
    },
    permissions: { readEmployeeData, editCompensation, viewSalaryHistory }
  };
}

const ENTRA_ID = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;

export function getSalaryHistoryActor(request: Request): SalaryHistoryActor | null {
  const session = getAccessSession(request);
  if (!session) return null;
  if (session.mode === 'development') {
    return {
      subject: session.user.subject,
      tenantId: null,
      objectId: null,
      displayName: session.user.name
    };
  }

  const claims = request.oidc?.user ?? {};
  const tenantId = typeof claims.tid === 'string' ? claims.tid.trim().toLowerCase() : '';
  const objectId = typeof claims.oid === 'string' ? claims.oid.trim().toLowerCase() : '';
  if (!ENTRA_ID.test(tenantId) || !ENTRA_ID.test(objectId)) return null;

  return {
    subject: session.user.subject,
    tenantId,
    objectId,
    displayName: session.user.name.slice(0, 120)
  };
}

export const requireAuthenticated: RequestHandler = (request, response, next) => {
  if (getAccessSession(request)) {
    next();
    return;
  }

  response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Sign in to access this resource' } });
};

export function requirePermission(permission: keyof AccessSession['permissions']): RequestHandler {
  return (request, response, next) => {
    const session = getAccessSession(request);
    if (!session) {
      response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Sign in to access this resource' } });
      return;
    }
    if (!session.permissions[permission]) {
      response.status(403).json({ error: { code: 'FORBIDDEN', message: 'Your account is not permitted to perform this action' } });
      return;
    }
    next();
  };
}
