/**
 * JSON Schema validation utilities for MCP parameter validation
 */

import { JSONSchema7 } from 'json-schema';
import { MCPError, MCPErrorCode } from '../types/mcp';

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[] | undefined;
}

/**
 * Simple JSON Schema validator implementation
 * This is a basic implementation for common validation needs
 */
export class SchemaValidator {
  /**
   * Validate data against a JSON Schema
   */
  static validate(data: any, schema: JSONSchema7): ValidationResult {
    const errors: string[] = [];

    try {
      this.validateValue(data, schema, '', errors);
    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate a value against schema recursively
   */
  private static validateValue(value: any, schema: JSONSchema7, path: string, errors: string[]): void {
    // Type validation
    if (schema.type) {
      const actualType = this.getType(value);
      const expectedTypes = Array.isArray(schema.type) ? schema.type : [schema.type];
      
      // Special case: integer is a subset of number
      if (schema.type === 'integer' && typeof value === 'number') {
        // Don't fail type check for integers, handle it in number validation section
      } else if (!expectedTypes.includes(actualType as any)) {
        errors.push(`${path || 'root'}: Expected type ${expectedTypes.join(' or ')}, got ${actualType}`);
        return;
      }
    }

    // Required properties validation for objects
    if (schema.type === 'object' && schema.required && typeof value === 'object' && value !== null) {
      for (const requiredProp of schema.required) {
        if (!(requiredProp in value)) {
          errors.push(`${path || 'root'}: Missing required property '${requiredProp}'`);
        }
      }
    }

    // Properties validation for objects
    if (schema.type === 'object' && schema.properties && typeof value === 'object' && value !== null) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        if (propName in value) {
          const propPath = path ? `${path}.${propName}` : propName;
          this.validateValue(value[propName], propSchema as JSONSchema7, propPath, errors);
        }
      }
    }

    // Array validation
    if (schema.type === 'array' && Array.isArray(value)) {
      if (schema.items && typeof schema.items === 'object' && !Array.isArray(schema.items)) {
        value.forEach((item, index) => {
          const itemPath = `${path || 'root'}[${index}]`;
          this.validateValue(item, schema.items as JSONSchema7, itemPath, errors);
        });
      }

      // Min/max items validation
      if (schema.minItems !== undefined && value.length < schema.minItems) {
        errors.push(`${path || 'root'}: Array must have at least ${schema.minItems} items`);
      }
      if (schema.maxItems !== undefined && value.length > schema.maxItems) {
        errors.push(`${path || 'root'}: Array must have at most ${schema.maxItems} items`);
      }
    }

    // String validation
    if (schema.type === 'string' && typeof value === 'string') {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        errors.push(`${path || 'root'}: String must be at least ${schema.minLength} characters long`);
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        errors.push(`${path || 'root'}: String must be at most ${schema.maxLength} characters long`);
      }
      if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
        errors.push(`${path || 'root'}: String does not match pattern ${schema.pattern}`);
      }
    }

    // Number validation
    if ((schema.type === 'number' || schema.type === 'integer') && typeof value === 'number') {
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push(`${path || 'root'}: Number must be at least ${schema.minimum}`);
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push(`${path || 'root'}: Number must be at most ${schema.maximum}`);
      }
      if (schema.type === 'integer' && !Number.isInteger(value)) {
        errors.push(`${path || 'root'}: Value must be an integer`);
      }
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`${path || 'root'}: Value must be one of: ${schema.enum.join(', ')}`);
    }
  }

  /**
   * Get the JSON Schema type of a value
   */
  private static getType(value: any): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }
}

/**
 * Validate MCP tool parameters against schema
 */
export function validateToolParams(params: any, schema: JSONSchema7): void {
  const result = SchemaValidator.validate(params, schema);
  
  if (!result.valid) {
    const error: MCPError = {
      code: MCPErrorCode.INVALID_PARAMS,
      message: 'Invalid parameters',
      data: {
        validationErrors: result.errors
      }
    };
    throw error;
  }
}

/**
 * Create a validation error for MCP responses
 */
export function createValidationError(message: string, details?: any): MCPError {
  return {
    code: MCPErrorCode.INVALID_PARAMS,
    message,
    data: details
  };
}