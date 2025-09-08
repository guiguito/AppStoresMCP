/**
 * Tests for validation utilities
 */

import { SchemaValidator, validateToolParams, createValidationError } from '../../src/utils/validation';
import { MCPErrorCode } from '../../src/types/mcp';
import { JSONSchema7 } from 'json-schema';

describe('SchemaValidator', () => {
  describe('validate', () => {
    it('should validate simple string type', () => {
      const schema: JSONSchema7 = { type: 'string' };
      
      const validResult = SchemaValidator.validate('test', schema);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toBeUndefined();

      const invalidResult = SchemaValidator.validate(123, schema);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toContain('root: Expected type string, got number');
    });

    it('should validate object with required properties', () => {
      const schema: JSONSchema7 = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        },
        required: ['name']
      };

      const validResult = SchemaValidator.validate({ name: 'John', age: 30 }, schema);
      expect(validResult.valid).toBe(true);

      const validWithoutOptional = SchemaValidator.validate({ name: 'John' }, schema);
      expect(validWithoutOptional.valid).toBe(true);

      const invalidResult = SchemaValidator.validate({ age: 30 }, schema);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toContain("root: Missing required property 'name'");
    });

    it('should validate nested object properties', () => {
      const schema: JSONSchema7 = {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string' }
            },
            required: ['name']
          }
        },
        required: ['user']
      };

      const validResult = SchemaValidator.validate({
        user: { name: 'John', email: 'john@example.com' }
      }, schema);
      expect(validResult.valid).toBe(true);

      const invalidResult = SchemaValidator.validate({
        user: { email: 'john@example.com' }
      }, schema);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toContain("user: Missing required property 'name'");
    });

    it('should validate arrays', () => {
      const schema: JSONSchema7 = {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
        maxItems: 3
      };

      const validResult = SchemaValidator.validate(['a', 'b'], schema);
      expect(validResult.valid).toBe(true);

      const invalidTypeResult = SchemaValidator.validate([1, 2], schema);
      expect(invalidTypeResult.valid).toBe(false);
      expect(invalidTypeResult.errors).toContain('root[0]: Expected type string, got number');

      const tooFewResult = SchemaValidator.validate([], schema);
      expect(tooFewResult.valid).toBe(false);
      expect(tooFewResult.errors).toContain('root: Array must have at least 1 items');

      const tooManyResult = SchemaValidator.validate(['a', 'b', 'c', 'd'], schema);
      expect(tooManyResult.valid).toBe(false);
      expect(tooManyResult.errors).toContain('root: Array must have at most 3 items');
    });

    it('should validate string constraints', () => {
      const schema: JSONSchema7 = {
        type: 'string',
        minLength: 3,
        maxLength: 10,
        pattern: '^[a-zA-Z]+$'
      };

      const validResult = SchemaValidator.validate('hello', schema);
      expect(validResult.valid).toBe(true);

      const tooShortResult = SchemaValidator.validate('hi', schema);
      expect(tooShortResult.valid).toBe(false);
      expect(tooShortResult.errors).toContain('root: String must be at least 3 characters long');

      const tooLongResult = SchemaValidator.validate('verylongstring', schema);
      expect(tooLongResult.valid).toBe(false);
      expect(tooLongResult.errors).toContain('root: String must be at most 10 characters long');

      const patternResult = SchemaValidator.validate('hello123', schema);
      expect(patternResult.valid).toBe(false);
      expect(patternResult.errors).toContain('root: String does not match pattern ^[a-zA-Z]+$');
    });

    it('should validate number constraints', () => {
      const schema: JSONSchema7 = {
        type: 'number',
        minimum: 0,
        maximum: 100
      };

      const validResult = SchemaValidator.validate(50, schema);
      expect(validResult.valid).toBe(true);

      const tooSmallResult = SchemaValidator.validate(-1, schema);
      expect(tooSmallResult.valid).toBe(false);
      expect(tooSmallResult.errors).toContain('root: Number must be at least 0');

      const tooLargeResult = SchemaValidator.validate(101, schema);
      expect(tooLargeResult.valid).toBe(false);
      expect(tooLargeResult.errors).toContain('root: Number must be at most 100');
    });

    it('should validate integer type', () => {
      const schema: JSONSchema7 = { type: 'integer' };

      const validResult = SchemaValidator.validate(42, schema);
      expect(validResult.valid).toBe(true);

      const invalidResult = SchemaValidator.validate(42.5, schema);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toContain('root: Value must be an integer');
    });

    it('should validate enum values', () => {
      const schema: JSONSchema7 = {
        type: 'string',
        enum: ['red', 'green', 'blue']
      };

      const validResult = SchemaValidator.validate('red', schema);
      expect(validResult.valid).toBe(true);

      const invalidResult = SchemaValidator.validate('yellow', schema);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toContain('root: Value must be one of: red, green, blue');
    });
  });
});

describe('validateToolParams', () => {
  it('should not throw for valid parameters', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        appId: { type: 'string' }
      },
      required: ['appId']
    };

    expect(() => {
      validateToolParams({ appId: 'com.example.app' }, schema);
    }).not.toThrow();
  });

  it('should throw MCPError for invalid parameters', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        appId: { type: 'string' }
      },
      required: ['appId']
    };

    expect(() => {
      validateToolParams({}, schema);
    }).toThrow();

    try {
      validateToolParams({}, schema);
    } catch (error: any) {
      expect(error.code).toBe(MCPErrorCode.INVALID_PARAMS);
      expect(error.message).toBe('Invalid parameters');
      expect(error.data.validationErrors).toContain("root: Missing required property 'appId'");
    }
  });
});

describe('createValidationError', () => {
  it('should create proper validation error', () => {
    const error = createValidationError('Test error', { field: 'value' });

    expect(error.code).toBe(MCPErrorCode.INVALID_PARAMS);
    expect(error.message).toBe('Test error');
    expect(error.data).toEqual({ field: 'value' });
  });

  it('should work without details', () => {
    const error = createValidationError('Simple error');

    expect(error.code).toBe(MCPErrorCode.INVALID_PARAMS);
    expect(error.message).toBe('Simple error');
    expect(error.data).toBeUndefined();
  });
});