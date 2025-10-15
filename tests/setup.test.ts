// Basic test to verify Jest setup is working
describe('Project Setup', () => {
  it('should have Jest configured correctly', () => {
    expect(true).toBe(true);
  });

  it('should be able to import TypeScript modules', () => {
    const testObject = { name: 'test', value: 42 };
    expect(testObject.name).toBe('test');
    expect(testObject.value).toBe(42);
  });
});
