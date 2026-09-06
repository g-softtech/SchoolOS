import { renderHook, act } from '@testing-library/react';
import { useOptimisticSave } from '../useOptimisticSave';

// Mock fetch globally
global.fetch = jest.fn();

describe('useOptimisticSave Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('tracks dirty state and backups to localStorage on block update', () => {
    const { result } = renderHook(() => useOptimisticSave({ 
      pageId: 'page-1', 
      initialVersion: 1, 
      initialBlocks: [] 
    }));

    act(() => {
      result.current.updateBlocks([{ id: 'b1', type: 'text', html: 'Hello' }]);
    });

    expect(result.current.isDirty).toBe(true);
    expect(result.current.blocks).toHaveLength(1);
    
    // Verify localStorage backup
    const saved = localStorage.getItem('cms_draft_page-1');
    expect(saved).toBeTruthy();
    expect(JSON.parse(saved!).savedBlocks).toHaveLength(1);
  });

  it('preserves non-destructive 409 Conflict state without overwriting local blocks', async () => {
    // Mock fetch to return a 409 Conflict
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      status: 409,
      json: async () => ({ currentVersion: 3 }),
    });

    const { result } = renderHook(() => useOptimisticSave({ 
      pageId: 'page-2', 
      initialVersion: 1, 
      initialBlocks: [] 
    }));

    act(() => {
      result.current.updateBlocks([{ id: 'b2', type: 'hero', heading: 'Conflict Test' }]);
    });

    await act(async () => {
      await result.current.saveToServer(false);
    });

    // 409 should be trapped, isDirty remains true, blocks remain unchanged, hasConflict is true
    expect(result.current.hasConflict).toBe(true);
    expect(result.current.isDirty).toBe(true);
    expect((result.current.blocks[0] as any).heading).toBe('Conflict Test');
  });
});
