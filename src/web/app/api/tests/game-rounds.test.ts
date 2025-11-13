import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '../game/rounds/route';
import * as roundManager from '@/services/flashcard/roundManager';

// Mock dependencies
vi.mock('@/services/flashcard/roundManager', () => ({
  createRound: vi.fn(),
  getUserRounds: vi.fn(),
}));

vi.mock('@/lib/api/responseHelpers', () => ({
  success: vi.fn((data) => new Response(JSON.stringify(data), { status: 200 })),
}));

vi.mock('../../_shared/middleware/errorHandler', () => ({
  withErrorHandling: (handler: any) => handler,
  withMethodValidation: (methods: string[]) => (handler: any) => handler,
  composeMiddleware: (...middlewares: any[]) => (handler: any) => handler,
}));

describe('API: /api/game/rounds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('should create a new round successfully', async () => {
      const mockRound = {
        id: 'round-123',
        name: 'Test Round',
        dataset_name: 'test-dataset',
        user_id: 'user-123',
        created_at: new Date().toISOString(),
      };

      vi.mocked(roundManager.createRound).mockResolvedValue(mockRound);

      const request = new NextRequest('http://localhost/api/game/rounds', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Round',
          datasetName: 'test-dataset',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockRound);
      expect(roundManager.createRound).toHaveBeenCalledWith(request);
    });

    it('should handle missing parameters', async () => {
      vi.mocked(roundManager.createRound).mockRejectedValue(
        new Error('Missing required parameter: datasetName')
      );

      const request = new NextRequest('http://localhost/api/game/rounds', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      // Error should be handled by middleware
      await expect(POST(request)).rejects.toThrow();
    });

    it('should handle database errors', async () => {
      vi.mocked(roundManager.createRound).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest('http://localhost/api/game/rounds', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Round',
          datasetName: 'test-dataset',
        }),
      });

      await expect(POST(request)).rejects.toThrow('Database connection failed');
    });
  });

  describe('GET', () => {
    it('should retrieve user rounds successfully', async () => {
      const mockRounds = [
        {
          id: 'round-1',
          name: 'Round 1',
          dataset_name: 'dataset-1',
          created_at: new Date().toISOString(),
        },
        {
          id: 'round-2',
          name: 'Round 2',
          dataset_name: 'dataset-2',
          created_at: new Date().toISOString(),
        },
      ];

      vi.mocked(roundManager.getUserRounds).mockResolvedValue(mockRounds);

      const request = new NextRequest('http://localhost/api/game/rounds', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockRounds);
      expect(roundManager.getUserRounds).toHaveBeenCalledWith({ req: request });
    });

    it('should return empty array when no rounds exist', async () => {
      vi.mocked(roundManager.getUserRounds).mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/game/rounds', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
    });

    it('should handle authentication errors', async () => {
      vi.mocked(roundManager.getUserRounds).mockRejectedValue(
        new Error('Unauthorized: User not authenticated')
      );

      const request = new NextRequest('http://localhost/api/game/rounds', {
        method: 'GET',
      });

      await expect(GET(request)).rejects.toThrow('Unauthorized');
    });
  });
});

