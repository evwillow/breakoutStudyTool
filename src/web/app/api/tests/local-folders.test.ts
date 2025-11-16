import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../files/local-folders/route';
import * as flashcardService from '@/services/flashcard/flashcardService';

// Mock dependencies
vi.mock('@/services/flashcard/flashcardService', () => ({
  fetchLocalFolders: vi.fn(),
}));

vi.mock('@/lib/api/responseHelpers', () => ({
  success: vi.fn((data) => new Response(JSON.stringify(data), { status: 200 })),
  error: vi.fn((message, status) => new Response(JSON.stringify({ error: message }), { status })),
}));

describe('API: /api/files/local-folders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return folders and totalFiles successfully', async () => {
      const mockData = {
        folders: [
          {
            id: 'folder-1',
            name: 'folder1',
            files: [
              { id: 'file-1', name: 'D.json', fileName: 'D.json', mimeType: 'application/json', size: 1024, createdTime: '2024-01-01', modifiedTime: '2024-01-01' },
              { id: 'file-2', name: 'M.json', fileName: 'M.json', mimeType: 'application/json', size: 2048, createdTime: '2024-01-01', modifiedTime: '2024-01-01' },
            ],
          },
          {
            id: 'folder-2',
            name: 'folder2',
            files: [
              { id: 'file-3', name: 'D.json', fileName: 'D.json', mimeType: 'application/json', size: 512, createdTime: '2024-01-01', modifiedTime: '2024-01-01' },
            ],
          },
        ],
        totalFiles: 3,
      };

      vi.mocked(flashcardService.fetchLocalFolders).mockResolvedValue(mockData);

      const request = new NextRequest('http://localhost/api/files/local-folders', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.folders).toHaveLength(2);
      expect(data.data.totalFiles).toBe(3);
      expect(flashcardService.fetchLocalFolders).toHaveBeenCalled();
    });

    it('should return empty folders array when no folders exist', async () => {
      const mockData = {
        folders: [],
        totalFiles: 0,
      };

      vi.mocked(flashcardService.fetchLocalFolders).mockResolvedValue(mockData);

      const request = new NextRequest('http://localhost/api/files/local-folders', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.folders).toEqual([]);
      expect(data.data.totalFiles).toBe(0);
    });

    it('should handle filesystem errors', async () => {
      vi.mocked(flashcardService.fetchLocalFolders).mockRejectedValue(
        new Error('Failed to read directory')
      );

      const request = new NextRequest('http://localhost/api/files/local-folders', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to read directory');
    });

    it('should handle permission errors', async () => {
      const permissionError = new Error('Permission denied');
      permissionError.name = 'EACCES';
      vi.mocked(flashcardService.fetchLocalFolders).mockRejectedValue(permissionError);

      const request = new NextRequest('http://localhost/api/files/local-folders', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('Permission denied');
    });

    it('should handle missing data directory', async () => {
      vi.mocked(flashcardService.fetchLocalFolders).mockRejectedValue(
        new Error('ENOENT: no such file or directory')
      );

      const request = new NextRequest('http://localhost/api/files/local-folders', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('ENOENT');
    });

    it('should handle unknown errors gracefully', async () => {
      vi.mocked(flashcardService.fetchLocalFolders).mockRejectedValue('Unknown error string');

      const request = new NextRequest('http://localhost/api/files/local-folders', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });
});

