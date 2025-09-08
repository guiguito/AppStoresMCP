/**
 * Unit tests for ToolRegistry
 */

import { ToolRegistry } from '../../src/registry/tool-registry';
import { MCPTool } from '../../src/types/mcp';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;
  let mockTool: MCPTool;

  beforeEach(() => {
    registry = new ToolRegistry();
    mockTool = {
      name: 'test-tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {
          param1: { type: 'string' }
        },
        required: ['param1']
      },
      execute: jest.fn().mockResolvedValue('test result')
    };
  });

  describe('registerTool', () => {
    it('should register a valid tool', () => {
      expect(() => registry.registerTool(mockTool)).not.toThrow();
      expect(registry.hasTool('test-tool')).toBe(true);
      expect(registry.size()).toBe(1);
    });

    it('should throw error for tool without name', () => {
      const invalidTool = { ...mockTool, name: '' };
      expect(() => registry.registerTool(invalidTool)).toThrow('Tool name is required and must be a string');
    });

    it('should throw error for tool with non-string name', () => {
      const invalidTool = { ...mockTool, name: 123 as any };
      expect(() => registry.registerTool(invalidTool)).toThrow('Tool name is required and must be a string');
    });

    it('should throw error for tool without description', () => {
      const invalidTool = { ...mockTool, description: '' };
      expect(() => registry.registerTool(invalidTool)).toThrow('Tool description is required and must be a string');
    });

    it('should throw error for tool with non-string description', () => {
      const invalidTool = { ...mockTool, description: 123 as any };
      expect(() => registry.registerTool(invalidTool)).toThrow('Tool description is required and must be a string');
    });

    it('should throw error for tool without inputSchema', () => {
      const invalidTool = { ...mockTool, inputSchema: null as any };
      expect(() => registry.registerTool(invalidTool)).toThrow('Tool inputSchema is required and must be an object');
    });

    it('should throw error for tool without execute method', () => {
      const invalidTool = { ...mockTool, execute: null as any };
      expect(() => registry.registerTool(invalidTool)).toThrow('Tool execute method is required and must be a function');
    });

    it('should throw error for duplicate tool names', () => {
      registry.registerTool(mockTool);
      const duplicateTool = { ...mockTool };
      expect(() => registry.registerTool(duplicateTool)).toThrow("Tool with name 'test-tool' is already registered");
    });
  });

  describe('getTool', () => {
    it('should return registered tool', () => {
      registry.registerTool(mockTool);
      const retrievedTool = registry.getTool('test-tool');
      expect(retrievedTool).toBe(mockTool);
    });

    it('should return undefined for non-existent tool', () => {
      const retrievedTool = registry.getTool('non-existent');
      expect(retrievedTool).toBeUndefined();
    });
  });

  describe('hasTool', () => {
    it('should return true for registered tool', () => {
      registry.registerTool(mockTool);
      expect(registry.hasTool('test-tool')).toBe(true);
    });

    it('should return false for non-existent tool', () => {
      expect(registry.hasTool('non-existent')).toBe(false);
    });
  });

  describe('getToolsList', () => {
    it('should return empty list when no tools registered', () => {
      const toolsList = registry.getToolsList();
      expect(toolsList.tools).toEqual([]);
    });

    it('should return list of registered tools', () => {
      const tool2: MCPTool = {
        name: 'tool-2',
        description: 'Second tool',
        inputSchema: { type: 'object' },
        execute: jest.fn()
      };

      registry.registerTool(mockTool);
      registry.registerTool(tool2);

      const toolsList = registry.getToolsList();
      expect(toolsList.tools).toHaveLength(2);
      expect(toolsList.tools).toEqual([
        {
          name: 'test-tool',
          description: 'A test tool',
          inputSchema: mockTool.inputSchema
        },
        {
          name: 'tool-2',
          description: 'Second tool',
          inputSchema: tool2.inputSchema
        }
      ]);
    });

    it('should not include execute method in tools list', () => {
      registry.registerTool(mockTool);
      const toolsList = registry.getToolsList();
      expect(toolsList.tools[0]).not.toHaveProperty('execute');
    });
  });

  describe('getToolNames', () => {
    it('should return empty array when no tools registered', () => {
      expect(registry.getToolNames()).toEqual([]);
    });

    it('should return array of tool names', () => {
      const tool2: MCPTool = {
        name: 'tool-2',
        description: 'Second tool',
        inputSchema: { type: 'object' },
        execute: jest.fn()
      };

      registry.registerTool(mockTool);
      registry.registerTool(tool2);

      const names = registry.getToolNames();
      expect(names).toEqual(['test-tool', 'tool-2']);
    });
  });

  describe('unregisterTool', () => {
    it('should remove registered tool', () => {
      registry.registerTool(mockTool);
      expect(registry.hasTool('test-tool')).toBe(true);
      
      const removed = registry.unregisterTool('test-tool');
      expect(removed).toBe(true);
      expect(registry.hasTool('test-tool')).toBe(false);
      expect(registry.size()).toBe(0);
    });

    it('should return false for non-existent tool', () => {
      const removed = registry.unregisterTool('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all registered tools', () => {
      const tool2: MCPTool = {
        name: 'tool-2',
        description: 'Second tool',
        inputSchema: { type: 'object' },
        execute: jest.fn()
      };

      registry.registerTool(mockTool);
      registry.registerTool(tool2);
      expect(registry.size()).toBe(2);

      registry.clear();
      expect(registry.size()).toBe(0);
      expect(registry.hasTool('test-tool')).toBe(false);
      expect(registry.hasTool('tool-2')).toBe(false);
    });
  });

  describe('size', () => {
    it('should return 0 for empty registry', () => {
      expect(registry.size()).toBe(0);
    });

    it('should return correct count of registered tools', () => {
      expect(registry.size()).toBe(0);
      
      registry.registerTool(mockTool);
      expect(registry.size()).toBe(1);
      
      const tool2: MCPTool = {
        name: 'tool-2',
        description: 'Second tool',
        inputSchema: { type: 'object' },
        execute: jest.fn()
      };
      registry.registerTool(tool2);
      expect(registry.size()).toBe(2);
    });
  });
});