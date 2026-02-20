import { setBusinessId, getBusinessId, clearBusinessId } from './session';

describe('session', () => {
  afterEach(() => {
    clearBusinessId();
  });

  describe('getBusinessId', () => {
    it('throws when business ID is not set', () => {
      expect(() => getBusinessId()).toThrow('Business ID not initialized');
    });

    it('returns the business ID after it is set', () => {
      setBusinessId('biz-123');
      expect(getBusinessId()).toBe('biz-123');
    });
  });

  describe('setBusinessId', () => {
    it('overwrites a previously set business ID', () => {
      setBusinessId('biz-1');
      setBusinessId('biz-2');
      expect(getBusinessId()).toBe('biz-2');
    });
  });

  describe('clearBusinessId', () => {
    it('clears the business ID so getBusinessId throws again', () => {
      setBusinessId('biz-123');
      clearBusinessId();
      expect(() => getBusinessId()).toThrow();
    });
  });
});
