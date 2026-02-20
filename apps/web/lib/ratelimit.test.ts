import { afterEach, describe, expect, it, vi } from 'vitest';

const originalTrustedProxyIps = process.env.TRUSTED_PROXY_IPS;

afterEach(() => {
  process.env.TRUSTED_PROXY_IPS = originalTrustedProxyIps;
  vi.resetModules();
});

describe('getClientIp', () => {
  it('ignores untrusted x-real-ip header', async () => {
    process.env.TRUSTED_PROXY_IPS = '';
    const { getClientIp } = await import('./ratelimit');

    const request = new Request('http://localhost/api/test', {
      headers: {
        'x-real-ip': '203.0.113.10',
      },
    });

    expect(getClientIp(request)).toBe('127.0.0.1');
  });

  it('uses x-forwarded-for when connection comes from trusted proxy', async () => {
    process.env.TRUSTED_PROXY_IPS = '10.0.0.1';
    const { getClientIp } = await import('./ratelimit');

    const request = new Request('http://localhost/api/test', {
      headers: {
        'x-forwarded-for': '198.51.100.2, 10.0.0.1',
      },
    });

    expect(getClientIp(request, '10.0.0.1')).toBe('198.51.100.2');
  });

  it('uses runtime connection header extraction for supported hosts', async () => {
    process.env.TRUSTED_PROXY_IPS = '';
    const { getClientIp, getConnectionIpFromRequest } = await import('./ratelimit');

    const request = new Request('http://localhost/api/test', {
      headers: {
        'cf-connecting-ip': '192.0.2.44',
        'x-real-ip': '203.0.113.10',
      },
    });

    const connectionIp = getConnectionIpFromRequest(request);
    expect(connectionIp).toBe('192.0.2.44');
    expect(getClientIp(request, connectionIp)).toBe('192.0.2.44');
  });
});
