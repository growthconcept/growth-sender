import { describe, it, expect, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';

const SECRET = 'test-secret-for-unit-tests';

describe('JWT', () => {
  it('gera e verifica token com sucesso', () => {
    const payload = { id: '123', email: 'test@test.com', role: 'user' };
    const token = jwt.sign(payload, SECRET, { expiresIn: '1h' });

    const decoded = jwt.verify(token, SECRET);
    expect(decoded.id).toBe('123');
    expect(decoded.email).toBe('test@test.com');
    expect(decoded.role).toBe('user');
  });

  it('lança JsonWebTokenError para token inválido', () => {
    expect(() => jwt.verify('token-invalido', SECRET)).toThrow('jwt malformed');
  });

  it('lança TokenExpiredError para token expirado', () => {
    const token = jwt.sign({ id: '1' }, SECRET, { expiresIn: '0s' });
    expect(() => jwt.verify(token, SECRET)).toThrow('jwt expired');
  });

  it('lança erro para secret errado', () => {
    const token = jwt.sign({ id: '1' }, SECRET);
    expect(() => jwt.verify(token, 'secret-errado')).toThrow();
  });
});
