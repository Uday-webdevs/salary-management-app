import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().default('file:./dev.db'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  AUTH_MODE: z.enum(['development', 'oidc']).default(
    process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' ? 'development' : 'oidc'
  ),
  AUTH_ISSUER_URL: z.string().url().optional(),
  AUTH_CLIENT_ID: z.string().min(1).optional(),
  AUTH_CLIENT_SECRET: z.string().min(1).optional(),
  AUTH_SESSION_SECRET: z.string().min(32).optional(),
  AUTH_ROLE_CLAIM: z.string().min(1).default('roles'),
  AUTH_READ_ROLE: z.string().min(1).default('salary:read'),
  AUTH_EDIT_ROLE: z.string().min(1).default('salary:edit')
}).superRefine((config, context) => {
  if (config.AUTH_MODE === 'development' && !['development', 'test'].includes(process.env.NODE_ENV ?? '')) {
    context.addIssue({ code: 'custom', path: ['AUTH_MODE'], message: 'Development authentication requires NODE_ENV=development or NODE_ENV=test' });
  }

  if (config.AUTH_MODE === 'oidc') {
    for (const key of ['AUTH_ISSUER_URL', 'AUTH_CLIENT_ID', 'AUTH_CLIENT_SECRET', 'AUTH_SESSION_SECRET'] as const) {
      if (!config[key]) context.addIssue({ code: 'custom', path: [key], message: `${key} is required when AUTH_MODE=oidc` });
    }
    if (config.AUTH_SESSION_SECRET && config.AUTH_SESSION_SECRET.length < 32) {
      context.addIssue({ code: 'custom', path: ['AUTH_SESSION_SECRET'], message: 'AUTH_SESSION_SECRET must contain at least 32 characters' });
    }
  }

  if (config.AUTH_READ_ROLE === config.AUTH_EDIT_ROLE) {
    context.addIssue({ code: 'custom', path: ['AUTH_EDIT_ROLE'], message: 'Read and edit role values must be different' });
  }

  if (config.NODE_ENV === 'production' && new URL(config.CLIENT_ORIGIN).protocol !== 'https:') {
    context.addIssue({ code: 'custom', path: ['CLIENT_ORIGIN'], message: 'CLIENT_ORIGIN must use HTTPS in production' });
  }

  if (config.AUTH_MODE === 'oidc' && config.NODE_ENV === 'production' && config.AUTH_ISSUER_URL && new URL(config.AUTH_ISSUER_URL).protocol !== 'https:') {
    context.addIssue({ code: 'custom', path: ['AUTH_ISSUER_URL'], message: 'AUTH_ISSUER_URL must use HTTPS in production' });
  }
});

export const env = envSchema.parse(process.env);
