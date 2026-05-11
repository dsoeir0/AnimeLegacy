import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
global.fetch = fetchMock;

beforeEach(() => {
  vi.resetModules();
  fetchMock.mockReset();
});

const ok = (translated) =>
  Promise.resolve({
    ok: true,
    json: async () => ({ responseData: { translatedText: translated } }),
  });

describe('translateText', () => {
  it('dedupes concurrent calls for the same text and language', async () => {
    fetchMock.mockImplementation(() => ok('olá'));
    const { translateText } = await import('../lib/services/mymemory.js');
    const [a, b, c] = await Promise.all([
      translateText('hello', 'pt'),
      translateText('hello', 'pt'),
      translateText('hello', 'pt'),
    ]);
    expect(a).toBe('olá');
    expect(b).toBe('olá');
    expect(c).toBe('olá');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not dedupe across different languages', async () => {
    fetchMock.mockImplementation((url) => ok(url.includes('pt-PT') ? 'olá' : 'hola'));
    const { translateText } = await import('../lib/services/mymemory.js');
    const [pt, es] = await Promise.all([
      translateText('hello', 'pt'),
      translateText('hello', 'es'),
    ]);
    expect(pt).toBe('olá');
    expect(es).toBe('hola');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects unsupported languages without calling fetch', async () => {
    const { translateText } = await import('../lib/services/mymemory.js');
    await expect(translateText('hello', 'jp')).rejects.toThrow(/Unsupported language/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('clears the inflight entry after settle so a subsequent call refetches', async () => {
    fetchMock.mockImplementation(() => ok('olá'));
    const { translateText } = await import('../lib/services/mymemory.js');
    await translateText('hello', 'pt');
    await translateText('hello', 'pt');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
