import { generateInviteCode } from '../cryptoUtils';

describe('clubUtils - generateInviteCode', () => {
  it('should generate a 6-character code', () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(6);
  });

  it('should generate only uppercase alphanumeric characters', () => {
    const code = generateInviteCode();
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it('should generate different codes on subsequent calls', () => {
    const code1 = generateInviteCode();
    const code2 = generateInviteCode();
    expect(code1).not.toBe(code2);
  });
});
