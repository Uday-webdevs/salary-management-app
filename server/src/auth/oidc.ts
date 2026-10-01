import { auth } from 'express-openid-connect';
import { env } from '../config/env.js';

function normalizeIssuerBaseUrl(value: string): string {
  const issuerUrl = new URL(value);
  const discoverySuffix = '/.well-known/openid-configuration';

  if (issuerUrl.pathname.endsWith(discoverySuffix)) {
    issuerUrl.pathname = issuerUrl.pathname.slice(0, -discoverySuffix.length);
  }

  issuerUrl.pathname = issuerUrl.pathname.replace(/\/+$/, '');
  return issuerUrl.toString().replace(/\/$/, '');
}

export const oidcMiddleware = env.AUTH_MODE === 'oidc'
  ? auth({
      issuerBaseURL: normalizeIssuerBaseUrl(env.AUTH_ISSUER_URL!),
      baseURL: new URL(env.CLIENT_ORIGIN).origin,
      clientID: env.AUTH_CLIENT_ID!,
      clientSecret: env.AUTH_CLIENT_SECRET!,
      secret: env.AUTH_SESSION_SECRET!,
      authRequired: false,
      enableTelemetry: false,
      authorizationParams: { response_type: 'code', scope: 'openid profile email', prompt: 'consent' },
      routes: {
        login: '/api/auth/login',
        callback: '/api/auth/callback',
        logout: '/api/auth/logout',
        postLogoutRedirect: '/'
      },
      session: {
        name: 'peopleos_session',
        rolling: true,
        rollingDuration: 30 * 60,
        absoluteDuration: 8 * 60 * 60,
        cookie: {
          httpOnly: true,
          secure: env.NODE_ENV === 'production',
          sameSite: 'Lax'
        }
      }
    })
  : undefined;
