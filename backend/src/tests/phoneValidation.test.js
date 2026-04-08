import { describe, it, expect } from 'vitest';

const VALID_PHONE_RE = /^\d{10,13}$/;

const isValidPhone = (phone) => VALID_PHONE_RE.test(phone.replace(/\D/g, ''));

describe('Validação de telefone', () => {
  it('aceita número com 11 dígitos (celular BR com DDD)', () => {
    expect(isValidPhone('11987654321')).toBe(true);
  });

  it('aceita número com 13 dígitos (com DDI 55)', () => {
    expect(isValidPhone('5511987654321')).toBe(true);
  });

  it('aceita número com formatação (remove não-dígitos)', () => {
    expect(isValidPhone('(11) 98765-4321')).toBe(true);
  });

  it('rejeita número curto demais', () => {
    expect(isValidPhone('98765')).toBe(false);
  });

  it('rejeita número com letras', () => {
    expect(isValidPhone('abc')).toBe(false);
  });

  it('rejeita string vazia', () => {
    expect(isValidPhone('')).toBe(false);
  });
});
