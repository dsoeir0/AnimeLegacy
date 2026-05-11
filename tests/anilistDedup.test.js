import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
global.fetch = fetchMock;

beforeEach(() => {
  vi.resetModules();
  fetchMock.mockReset();
});

const respond = (mediaList) =>
  Promise.resolve({
    ok: true,
    json: async () => {
      const data = {};
      mediaList.forEach((m, i) => {
        data[`media${i}`] = m;
      });
      return { data };
    },
  });

describe('fetchAniListMediaByMalIds', () => {
  it('returns cached entries without hitting the network', async () => {
    const { fetchAniListMediaByMalIds } = await import('../lib/services/anilist.js');
    fetchMock.mockImplementationOnce(() =>
      respond([{ idMal: 1, coverImage: { large: 'a.jpg' }, bannerImage: 'b.jpg' }]),
    );
    await fetchAniListMediaByMalIds([1]);
    const result = await fetchAniListMediaByMalIds([1]);
    expect(result[1].bannerImage).toBe('b.jpg');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('dedupes inflight fetches so a shared ID is only fetched once', async () => {
    const { fetchAniListMediaByMalIds } = await import('../lib/services/anilist.js');
    fetchMock.mockImplementation((_url, opts) => {
      const body = JSON.parse(opts.body);
      const requested = [...body.query.matchAll(/idMal:\s*(\d+)/g)].map((m) => Number(m[1]));
      return respond(
        requested.map((id) => ({
          idMal: id,
          coverImage: { large: `cover-${id}.jpg` },
          bannerImage: null,
        })),
      );
    });
    const [a, b] = await Promise.all([
      fetchAniListMediaByMalIds([10, 11]),
      fetchAniListMediaByMalIds([11, 12]),
    ]);
    expect(a[11].coverImage.large).toBe('cover-11.jpg');
    expect(b[11].coverImage.large).toBe('cover-11.jpg');
    const idsRequested = fetchMock.mock.calls.flatMap(([_, opts]) =>
      [...JSON.parse(opts.body).query.matchAll(/idMal:\s*(\d+)/g)].map((m) => Number(m[1])),
    );
    const count11 = idsRequested.filter((id) => id === 11).length;
    expect(count11).toBe(1);
  });

  it('returns empty for empty input without calling fetch', async () => {
    const { fetchAniListMediaByMalIds } = await import('../lib/services/anilist.js');
    const result = await fetchAniListMediaByMalIds([]);
    expect(result).toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns empty for input of only falsy IDs', async () => {
    const { fetchAniListMediaByMalIds } = await import('../lib/services/anilist.js');
    const result = await fetchAniListMediaByMalIds([null, 0, undefined]);
    expect(result).toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
