/**
 * Integration tests for response filtering functionality
 */

import { filterAppData } from '../../src/utils/response-filter';

describe('Response Filtering Integration', () => {
  const mockAppData = [
    {
      id: 'com.example.app',
      appId: 'com.example.app',
      title: 'Example App',
      url: 'https://example.com',
      price: 0,
      rating: 4.5,
      ratingsCount: 1000,
      category: 'PRODUCTIVITY',
      developer: 'Example Developer',
      developerId: 'example-dev',
      icon: 'https://example.com/icon.png',
      free: true,
      // Fields that should be filtered out
      description: 'This is a very long description that consumes many tokens and should be filtered out in non-detailed responses to reduce token usage and improve performance.',
      summary: 'Short summary that also consumes tokens',
      descriptionHTML: '<p>HTML description with formatting</p>',
      releaseNotes: 'Latest release notes with new features',
      screenshots: ['screenshot1.png', 'screenshot2.png', 'screenshot3.png'],
      permissions: ['CAMERA', 'LOCATION', 'STORAGE'],
      reviews: [
        { text: 'Great app!', rating: 5 },
        { text: 'Could be better', rating: 3 }
      ],
      genre: 'Productivity',
      score: 4.5,
      installs: '1,000,000+',
      size: '25MB',
      version: '2.1.0',
      updated: '2023-12-01'
    }
  ];

  describe('Token Usage Reduction', () => {
    it('should significantly reduce response size when filtering is applied', () => {
      const originalData = mockAppData[0];
      const filteredData = filterAppData([originalData], false)[0];

      // Count fields in original vs filtered
      const originalFieldCount = Object.keys(originalData || {}).length;
      const filteredFieldCount = Object.keys(filteredData || {}).length;

      // Should remove at least 50% of fields
      expect(filteredFieldCount).toBeLessThan(originalFieldCount * 0.5);
      
      // Should keep essential fields
      expect(filteredData.title).toBe('Example App');
      expect(filteredData.developer).toBe('Example Developer');
      expect(filteredData.price).toBe(0);
      expect(filteredData.free).toBe(true);
      expect(filteredData.icon).toBe('https://example.com/icon.png');

      // Should remove verbose fields
      expect(filteredData.description).toBeUndefined();
      expect(filteredData.summary).toBeUndefined();
      expect(filteredData.screenshots).toBeUndefined();
      expect(filteredData.permissions).toBeUndefined();
      expect(filteredData.reviews).toBeUndefined();
      expect(filteredData.releaseNotes).toBeUndefined();
    });

    it('should preserve all data when fullDetail is true', () => {
      const originalData = mockAppData[0];
      const fullDetailData = filterAppData([originalData], true)[0];

      // Should be identical to original
      expect(fullDetailData).toEqual(originalData);
      expect(fullDetailData.description).toBeDefined();
      expect(fullDetailData.screenshots).toBeDefined();
      expect(fullDetailData.permissions).toBeDefined();
    });

    it('should handle mixed data types correctly', () => {
      const mixedData = [
        mockAppData[0],
        { ...mockAppData[0], id: 'app2', title: 'App 2' },
        null,
        undefined,
        'invalid-data'
      ];

      const result = filterAppData(mixedData, false);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(5);
      
      // Valid apps should be filtered
      expect(result[0].description).toBeUndefined();
      expect(result[1].description).toBeUndefined();
      expect(result[0].title).toBe('Example App');
      expect(result[1].title).toBe('App 2');
      
      // Invalid data should pass through unchanged
      expect(result[2]).toBeNull();
      expect(result[3]).toBeUndefined();
      expect(result[4]).toBe('invalid-data');
    });
  });

  describe('Performance Impact', () => {
    it('should demonstrate token usage reduction with realistic data', () => {
      // Simulate a typical search result with verbose descriptions
      const verboseApp = {
        ...mockAppData[0],
        description: 'A'.repeat(1000), // 1000 character description
        summary: 'B'.repeat(200),      // 200 character summary
        releaseNotes: 'C'.repeat(500), // 500 character release notes
        reviews: Array(50).fill({ text: 'Review text here', rating: 4 }) // 50 reviews
      };

      const originalSize = JSON.stringify([verboseApp]).length;
      const filteredSize = JSON.stringify(filterAppData([verboseApp], false)).length;
      
      // Should reduce size by at least 70%
      const reductionPercentage = ((originalSize - filteredSize) / originalSize) * 100;
      expect(reductionPercentage).toBeGreaterThan(70);
      
      console.log(`Token usage reduction: ${reductionPercentage.toFixed(1)}% (${originalSize} -> ${filteredSize} chars)`);
    });
  });
});