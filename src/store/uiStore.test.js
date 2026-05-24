import { describe, it, expect, beforeEach, vi } from 'vitest';
import useUIStore from './uiStore.js';

beforeEach(() => {
  useUIStore.setState({ toasts: [], confirmState: null, promptState: null });
});

describe('toasts', () => {
  it('adds and dismisses toasts', () => {
    vi.useFakeTimers();
    const id = useUIStore.getState().showToast('Saved', { type: 'success' });
    expect(useUIStore.getState().toasts).toHaveLength(1);
    expect(useUIStore.getState().toasts[0]).toMatchObject({ message: 'Saved', type: 'success' });

    useUIStore.getState().dismissToast(id);
    expect(useUIStore.getState().toasts).toHaveLength(0);
    vi.useRealTimers();
  });

  it('auto-dismisses after the duration', () => {
    vi.useFakeTimers();
    useUIStore.getState().showToast('Bye', { duration: 1000 });
    expect(useUIStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(1000);
    expect(useUIStore.getState().toasts).toHaveLength(0);
    vi.useRealTimers();
  });
});

describe('confirm', () => {
  it('resolves true/false and clears state', async () => {
    const p = useUIStore.getState().confirm({ title: 'Delete?' });
    expect(useUIStore.getState().confirmState).toBeTruthy();
    useUIStore.getState().resolveConfirm(true);
    await expect(p).resolves.toBe(true);
    expect(useUIStore.getState().confirmState).toBeNull();
  });
});

describe('prompt', () => {
  it('resolves the entered value, null on cancel', async () => {
    const p = useUIStore.getState().prompt({ title: 'Note' });
    useUIStore.getState().resolvePrompt('hello');
    await expect(p).resolves.toBe('hello');

    const p2 = useUIStore.getState().prompt({ title: 'Note' });
    useUIStore.getState().resolvePrompt(null);
    await expect(p2).resolves.toBeNull();
  });
});
