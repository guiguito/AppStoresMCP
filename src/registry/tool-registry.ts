/**
 * Tool Registry for managing MCP tool registration and discovery
 */

import { MCPTool, ToolsListResponse } from '../types/mcp';

/**
 * Tool Registry class manages registration and discovery of MCP tools
 */
export class ToolRegistry {
  private tools: Map<string, MCPTool> = new Map();

  /**
   * Register a new MCP tool
   */
  registerTool(tool: MCPTool): void {
    if (!tool.name || typeof tool.name !== 'string') {
      throw new Error('Tool name is required and must be a string');
    }

    if (!tool.description || typeof tool.description !== 'string') {
      throw new Error('Tool description is required and must be a string');
    }

    if (!tool.inputSchema || typeof tool.inputSchema !== 'object') {
      throw new Error('Tool inputSchema is required and must be an object');
    }

    if (!tool.execute || typeof tool.execute !== 'function') {
      throw new Error('Tool execute method is required and must be a function');
    }

    if (this.tools.has(tool.name)) {
      throw new Error(`Tool with name '${tool.name}' is already registered`);
    }

    this.tools.set(tool.name, tool);
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool exists
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all registered tools for discovery
   */
  getToolsList(): ToolsListResponse {
    const tools = Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }));

    return { tools };
  }

  /**
   * Get all tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Remove a tool by name
   */
  unregisterTool(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Clear all registered tools
   */
  clear(): void {
    this.tools.clear();
  }

  /**
   * Get the number of registered tools
   */
  size(): number {
    return this.tools.size;
  }
}