import { describe, it, expect, vi, beforeEach } from 'vitest';

const onAuthStateChangedMock = vi.fn();
const getFirebaseClientMock = vi.fn();

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args) => onAuthStateChangedMock(...args),
}));

vi.mock('../lib/firebase/client', () => ({
  getFirebaseClient: () => getFirebaseClientMock(),
}));

describe('authStateStore', () => {
  beforeEach(async () => {
    vi.resetModules();
    onAuthStateChangedMock.mockReset();
    getFirebaseClientMock.mockReset();
  });

  it('starts the listener once on first subscribe and fires the initial cached state', async () => {
    const unsub = vi.fn();
    onAuthStateChangedMock.mockImplementation(() => unsub);
    getFirebaseClientMock.mockReturnValue({ auth: {} });

    const { subscribeToAuthState } = await import('../lib/firebase/authStateStore.js');
    const cb = vi.fn();
    subscribeToAuthState(cb);
    expect(onAuthStateChangedMock).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith({ user: null, loading: true });
  });

  it('fans out auth changes to every subscriber', async () => {
    let trigger;
    onAuthStateChangedMock.mockImplementation((_auth, listener) => {
      trigger = listener;
      return () => {};
    });
    getFirebaseClientMock.mockReturnValue({ auth: {} });

    const { subscribeToAuthState } = await import('../lib/firebase/authStateStore.js');
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    subscribeToAuthState(cb1);
    subscribeToAuthState(cb2);
    trigger({ uid: 'u1' });
    expect(cb1).toHaveBeenCalledWith({ user: { uid: 'u1' }, loading: false });
    expect(cb2).toHaveBeenCalledWith({ user: { uid: 'u1' }, loading: false });
  });

  it('only opens one underlying listener for multiple subscribers', async () => {
    onAuthStateChangedMock.mockImplementation(() => () => {});
    getFirebaseClientMock.mockReturnValue({ auth: {} });

    const { subscribeToAuthState } = await import('../lib/firebase/authStateStore.js');
    subscribeToAuthState(vi.fn());
    subscribeToAuthState(vi.fn());
    subscribeToAuthState(vi.fn());
    expect(onAuthStateChangedMock).toHaveBeenCalledTimes(1);
  });

  it('tears down the listener once the last subscriber leaves', async () => {
    const unsub = vi.fn();
    onAuthStateChangedMock.mockImplementation(() => unsub);
    getFirebaseClientMock.mockReturnValue({ auth: {} });

    const { subscribeToAuthState } = await import('../lib/firebase/authStateStore.js');
    const u1 = subscribeToAuthState(vi.fn());
    const u2 = subscribeToAuthState(vi.fn());
    u1();
    expect(unsub).not.toHaveBeenCalled();
    u2();
    expect(unsub).toHaveBeenCalledTimes(1);
  });

  it('treats missing auth as loading=false and null user', async () => {
    getFirebaseClientMock.mockReturnValue({ auth: null });

    const { peekAuthState, subscribeToAuthState } = await import('../lib/firebase/authStateStore.js');
    const cb = vi.fn();
    subscribeToAuthState(cb);
    expect(cb).toHaveBeenCalledWith({ user: null, loading: false });
    expect(peekAuthState()).toEqual({ user: null, loading: false });
    expect(onAuthStateChangedMock).not.toHaveBeenCalled();
  });
});
