import { describe, it, expect } from 'bun:test';
import {
  MAX_ACTIVE_CUSTOM_CATEGORIES,
  isSystemCategory,
  getActiveCustomCategoriesCount,
  canActivateCategory,
  getCategoryIcon,
  AVAILABLE_CATEGORY_ICONS,
} from '@/lib/categoryIcons';
import { ShoppingCart, Bus, Tent, Package, HeartPulse, Ellipsis, Receipt, Flame } from 'lucide-react';

describe('Category Icons & Quota Rules TDD', () => {
  const baseCategories = [
    { id: '1', name: 'Nourriture', icon: 'ShoppingCart', is_active: true },
    { id: '2', name: 'Transport', icon: 'Bus', is_active: true },
    { id: '3', name: 'Matériel', icon: 'Package', is_active: true },
    { id: '4', name: 'Hébergement', icon: 'Tent', is_active: true },
    { id: '5', name: 'Pharmacie', icon: 'HeartPulse', is_active: true },
    { id: '6', name: 'Autre', icon: 'Ellipsis', is_active: true },
  ];

  describe('isSystemCategory', () => {
    it('should identify Autre as system category regardless of case or spaces', () => {
      expect(isSystemCategory('Autre')).toBe(true);
      expect(isSystemCategory('autre')).toBe(true);
      expect(isSystemCategory(' AUTRE ')).toBe(true);
      expect(isSystemCategory({ name: 'Autre' })).toBe(true);
    });

    it('should not mark custom categories as system', () => {
      expect(isSystemCategory('Nourriture')).toBe(false);
      expect(isSystemCategory('Assurance')).toBe(false);
      expect(isSystemCategory(null)).toBe(false);
    });
  });

  describe('getActiveCustomCategoriesCount', () => {
    it('should count only active custom categories excluding Autre', () => {
      // 5 active custom + 1 active Autre => count should be 5
      expect(getActiveCustomCategoriesCount(baseCategories)).toBe(5);
    });

    it('should not count inactive categories', () => {
      const withInactive = baseCategories.map(c => c.name === 'Transport' ? { ...c, is_active: false } : c);
      expect(getActiveCustomCategoriesCount(withInactive)).toBe(4);
    });
  });

  describe('canActivateCategory quota rules (5 + Autre)', () => {
    it('should forbid activating a 6th custom category when 5 are already active', () => {
      const withSixthInactive = [
        ...baseCategories,
        { id: '7', name: 'Assurance', icon: 'ShieldAlert', is_active: false },
      ];

      const check = canActivateCategory(withSixthInactive, '7');
      expect(check.canActivate).toBe(false);
      expect(check.reason).toContain('Limite de 5 motifs actifs');
    });

    it('should allow activating when less than 5 are active', () => {
      const withFourActive = baseCategories.map(c => c.name === 'Transport' ? { ...c, is_active: false } : c);
      const list = [
        ...withFourActive,
        { id: '7', name: 'Assurance', icon: 'ShieldAlert', is_active: false },
      ];

      const check = canActivateCategory(list, '7');
      expect(check.canActivate).toBe(true);
    });

    it('should always allow Autre to be active', () => {
      const check = canActivateCategory(baseCategories, '6');
      expect(check.canActivate).toBe(true);
    });
  });

  describe('getCategoryIcon', () => {
    it('should resolve icon by explicit icon name first', () => {
      expect(getCategoryIcon('Flame', 'Nourriture')).toBe(Flame);
      expect(getCategoryIcon('ShoppingCart', 'Divers')).toBe(ShoppingCart);
    });

    it('should fallback to category name semantic analysis when iconName is absent', () => {
      expect(getCategoryIcon(null, 'Courses de camp')).toBe(ShoppingCart);
      expect(getCategoryIcon('', 'Location de bus')).toBe(Bus);
      expect(getCategoryIcon(undefined, 'Tente patrouille')).toBe(Tent);
      expect(getCategoryIcon(undefined, 'Autre')).toBe(Ellipsis);
    });

    it('should fallback to Receipt when icon and name are unrecognized', () => {
      expect(getCategoryIcon(null, 'Fournisseur inconnu')).toBe(Receipt);
    });

    it('should contain at least 20 available icons in the palette', () => {
      expect(AVAILABLE_CATEGORY_ICONS.length).toBeGreaterThanOrEqual(20);
    });
  });
});
