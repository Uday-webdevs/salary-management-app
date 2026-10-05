// API integration tests use the local test identity even when server/.env is configured for OIDC.
process.env.NODE_ENV = 'test';
process.env.AUTH_MODE = 'development';
