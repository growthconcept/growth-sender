import { describe, it, expect } from 'vitest';
import { isAdmin, isSupervisor, isPrivilegedViewer } from '../middleware/permissions.js';

describe('isAdmin', () => {
  it('retorna true para role admin', () => {
    expect(isAdmin({ role: 'admin' })).toBe(true);
  });

  it('retorna false para role user', () => {
    expect(isAdmin({ role: 'user' })).toBe(false);
  });

  it('retorna false para usuário nulo', () => {
    expect(isAdmin(null)).toBeFalsy();
  });
});

describe('isSupervisor', () => {
  it('retorna true para role supervisor', () => {
    expect(isSupervisor({ role: 'supervisor' })).toBe(true);
  });

  it('retorna false para role admin', () => {
    expect(isSupervisor({ role: 'admin' })).toBe(false);
  });

  it('retorna false para usuário nulo', () => {
    expect(isSupervisor(null)).toBeFalsy();
  });
});

describe('isPrivilegedViewer', () => {
  it('retorna true para admin', () => {
    expect(isPrivilegedViewer({ role: 'admin' })).toBe(true);
  });

  it('retorna true para supervisor', () => {
    expect(isPrivilegedViewer({ role: 'supervisor' })).toBe(true);
  });

  it('retorna false para user comum', () => {
    expect(isPrivilegedViewer({ role: 'user' })).toBe(false);
  });

  it('retorna false para usuário nulo', () => {
    expect(isPrivilegedViewer(null)).toBeFalsy();
  });
});
