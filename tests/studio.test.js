import { describe, expect, it } from 'vitest';
import {
  classifyProducerRole,
  pickStudioName,
  studioInitial,
  studioInitials,
} from '../lib/utils/studio';

describe('pickStudioName', () => {
  it('prefers the Default-typed title', () => {
    const producer = {
      titles: [
        { type: 'Synonym', title: 'MHS' },
        { type: 'Default', title: 'Madhouse' },
        { type: 'Japanese', title: 'マッドハウス' },
      ],
    };
    expect(pickStudioName(producer)).toBe('Madhouse');
  });

  it('falls back to the first title when no Default', () => {
    const producer = { titles: [{ type: 'Japanese', title: 'マッドハウス' }] };
    expect(pickStudioName(producer)).toBe('マッドハウス');
  });

  it('falls back to producer.name when titles is missing', () => {
    expect(pickStudioName({ name: 'Bones' })).toBe('Bones');
  });

  it('returns "Unknown" for unusable input', () => {
    expect(pickStudioName(null)).toBe('Unknown');
    expect(pickStudioName({})).toBe('Unknown');
    expect(pickStudioName({ titles: [] })).toBe('Unknown');
  });
});

describe('studioInitial', () => {
  it('takes the uppercased first letter', () => {
    expect(studioInitial('Madhouse')).toBe('M');
    expect(studioInitial('ufotable')).toBe('U');
  });

  it('handles empty/missing name', () => {
    expect(studioInitial('')).toBe('?');
    expect(studioInitial(null)).toBe('?');
    expect(studioInitial(undefined)).toBe('?');
  });

  it('trims leading whitespace', () => {
    expect(studioInitial('  Trigger')).toBe('T');
  });
});

describe('studioInitials', () => {
  it('returns the first letter of the first two words', () => {
    expect(studioInitials('Studio Pierrot')).toBe('SP');
    expect(studioInitials('Production I.G')).toBe('PI');
    expect(studioInitials('A-1 Pictures')).toBe('AP');
  });

  it('returns a single letter for one-word names', () => {
    expect(studioInitials('Madhouse')).toBe('M');
    expect(studioInitials('MAPPA')).toBe('M');
  });

  it('collapses runs of whitespace', () => {
    expect(studioInitials('  Wit    Studio  ')).toBe('WS');
  });

  it('returns empty for unusable input', () => {
    expect(studioInitials('')).toBe('');
    expect(studioInitials(null)).toBe('');
    expect(studioInitials(undefined)).toBe('');
  });
});

describe('classifyProducerRole', () => {
  const bonesId = 4;
  const aniplexId = 17;

  // Real-ish MAL payload shape — the FMA: Brotherhood regression that
  // prompted this helper. Bones is in anime.studios, Aniplex is in
  // anime.producers, both can match the same anime.
  const fmaBrotherhood = {
    mal_id: 5114,
    title: 'Fullmetal Alchemist: Brotherhood',
    studios: [{ mal_id: bonesId, name: 'Bones' }],
    producers: [
      { mal_id: aniplexId, name: 'Aniplex' },
      { mal_id: 88, name: 'Square Enix' },
    ],
  };
  const onePunchMan = {
    mal_id: 30276,
    title: 'One Punch Man',
    studios: [{ mal_id: 11, name: 'Madhouse' }],
    producers: [{ mal_id: aniplexId, name: 'Aniplex' }],
  };
  const noragami = {
    mal_id: 20507,
    title: 'Noragami',
    studios: [{ mal_id: bonesId, name: 'Bones' }],
    producers: [],
  };

  it('classifies as studio when the producer is in anime.studios', () => {
    const result = classifyProducerRole([fmaBrotherhood, noragami], bonesId);
    expect(result.role).toBe('studio');
    expect(result.matches.map((a) => a.mal_id)).toEqual([5114, 20507]);
  });

  it('classifies as producer when the entity is only in anime.producers', () => {
    const result = classifyProducerRole(
      [fmaBrotherhood, onePunchMan, noragami],
      aniplexId,
    );
    expect(result.role).toBe('producer');
    // Only anime where Aniplex is in producers, preserving input order
    expect(result.matches.map((a) => a.mal_id)).toEqual([5114, 30276]);
  });

  it('ignores anime where the entity is in neither role', () => {
    const result = classifyProducerRole([noragami], aniplexId);
    expect(result.role).toBe('producer');
    expect(result.matches).toEqual([]);
  });

  it('returns safe defaults for bad input', () => {
    expect(classifyProducerRole(null, bonesId).matches).toEqual([]);
    expect(classifyProducerRole([fmaBrotherhood], null).matches).toEqual([]);
    expect(classifyProducerRole([fmaBrotherhood], 0).matches).toEqual([]);
    expect(classifyProducerRole(undefined, bonesId).role).toBe('producer');
  });

  it('tolerates anime missing studios or producers arrays', () => {
    const shaped = { mal_id: 1, title: 'x' };
    expect(classifyProducerRole([shaped], bonesId).matches).toEqual([]);
  });
});
