import type { Request, RequestHandler } from 'express';
import { env } from '../config/env.js';

export interface AccessSession {
  authenticated: true;
  mode: 'development' | 'oidc';
  user: { subject: string; name: string; email: string | null };
  permissions: { readEmployeeData: boolean; editCompensation: boolean };
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
      permissions: { readEmployeeData: true, editCompensation: true }
    };
  }

  if (!request.oidc?.isAuthenticated()) return null;

  const claims = request.oidc.user ?? {};
  const roles = roleValues(claims[env.AUTH_ROLE_CLAIM]);
  const editCompensation = roles.includes(env.AUTH_EDIT_ROLE);
  const readEmployeeData = editCompensation || roles.includes(env.AUTH_READ_ROLE);
  const subject = typeof claims.sub === 'string' ? claims.sub : 'unknown-user';

  return {
    authenticated: true,
    mode: 'oidc',
    user: {
      subject,
      name: typeof claims.name === 'string' ? claims.name : 'Signed-in user',
      email: typeof claims.email === 'string' ? claims.email : null
    },
    permissions: { readEmployeeData, editCompensation }
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
