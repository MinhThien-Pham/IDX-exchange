import { parseEnvironment } from '../src/platform/config/env.js';

describe('environment configuration', () => {
  const databaseUrl = 'postgresql://demo:private-password@localhost:5432/idx_exchange';

  it('parses explicit frontend origins and sensible local defaults', () => {
    const env = parseEnvironment({
      DATABASE_URL: databaseUrl,
      FRONTEND_ORIGINS: 'http://localhost:5173, https://demo.example',
    });
    expect(env.PORT).toBe(5000);
    expect(env.FRONTEND_ORIGINS).toEqual(['http://localhost:5173', 'https://demo.example']);
  });

  it.each(['*', 'https://demo.example/', 'https://demo.example/path', 'file:///tmp'])(
    'rejects ambiguous or invalid CORS origin %s',
    (origin) => {
      expect(() =>
        parseEnvironment({ DATABASE_URL: databaseUrl, FRONTEND_ORIGINS: origin }),
      ).toThrow('FRONTEND_ORIGINS');
    },
  );

  it('fails fast on missing database configuration without printing secrets', () => {
    expect(() => parseEnvironment({})).toThrow('DATABASE_URL');
    expect(() => parseEnvironment({ DATABASE_URL: 'private-password', PORT: '0' })).toThrow(
      'Invalid environment configuration',
    );
    try {
      parseEnvironment({ DATABASE_URL: 'private-password', PORT: '0' });
    } catch (error) {
      expect(String(error)).not.toContain('private-password');
    }
  });
});
