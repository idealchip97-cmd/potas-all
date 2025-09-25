const { generateToken, verifyToken } = require('../utils/jwt');

describe('JWT Utility Tests', () => {
  test('should generate token without JWT_SECRET in environment', () => {
    // Temporarily remove JWT_SECRET
    const originalSecret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;

    // This should not throw an error
    const payload = { userId: 1, email: 'test@example.com' };
    const token = generateToken(payload);
    
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);

    // Restore original secret
    if (originalSecret) {
      process.env.JWT_SECRET = originalSecret;
    }
  });

  test('should generate and verify token successfully', () => {
    const payload = { userId: 1, email: 'test@example.com' };
    const token = generateToken(payload);
    
    expect(token).toBeDefined();
    
    const decoded = verifyToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
  });

  test('should use provided JWT_SECRET when available', () => {
    const originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes-only';

    const payload = { userId: 1, email: 'test@example.com' };
    const token = generateToken(payload);
    
    expect(token).toBeDefined();
    
    const decoded = verifyToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);

    // Restore original secret
    if (originalSecret) {
      process.env.JWT_SECRET = originalSecret;
    }
  });
});
