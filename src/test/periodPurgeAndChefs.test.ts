import { describe, it, expect } from 'bun:test';
import { canPurgePeriod } from '@/lib/permissions';
import { getChefsFilterList } from '@/lib/utils';
import { Period, Expense, Profile } from '@/types/database';

describe('Period Purge & Chef Filters TDD', () => {
  describe('canPurgePeriod', () => {
    it('should forbid purging an active or open period', () => {
      const openPeriod: Period = {
        id: 'p-open',
        name: 'Année 2026-2027',
        type: 'year',
        status: 'open',
        start_date: '2026-09-01',
        end_date: null,
      };

      expect(canPurgePeriod(openPeriod)).toBe(false);
    });

    it('should allow purging a closed period', () => {
      const closedPeriod: Period = {
        id: 'p-closed',
        name: 'Camp 2025',
        type: 'camp',
        status: 'closed',
        start_date: '2025-07-01',
        end_date: '2025-07-31',
      };

      expect(canPurgePeriod(closedPeriod)).toBe(true);
    });
  });

  describe('getChefsFilterList', () => {
    it('should return unique sorted chefs from profiles and expenses', () => {
      const profiles: Profile[] = [
        {
          id: 'prof-1',
          first_name: 'Benoît',
          last_name: 'Dupont',
          email: 'ben@groupe.fr',
          role: 'admin',
          status: 'active',
          primary_unit_id: null,
          secondary_unit_id: null,
          created_at: '',
          updated_at: '',
        },
        {
          id: 'prof-2',
          first_name: 'Alexandre',
          last_name: 'Martin',
          email: 'alex@groupe.fr',
          role: 'chef',
          status: 'active',
          primary_unit_id: 'u1',
          secondary_unit_id: null,
          created_at: '',
          updated_at: '',
        },
      ];

      const expenses: Partial<Expense>[] = [
        {
          id: 'exp-1',
          created_by: 'prof-2',
          creator: {
            id: 'prof-2',
            first_name: 'Alexandre',
            last_name: 'Martin',
            role: 'chef',
          },
        },
        {
          id: 'exp-2',
          created_by: 'prof-3',
          creator: {
            id: 'prof-3',
            first_name: 'Claire',
            last_name: 'Vasseur',
            role: 'chef',
          },
        },
      ];

      const list = getChefsFilterList(expenses as Expense[], profiles);

      expect(list.length).toBe(3);
      expect(list[0].name).toBe('Alexandre Martin');
      expect(list[1].name).toBe('Benoît Dupont');
      expect(list[2].name).toBe('Claire Vasseur');
    });

    it('should fallback to email if profile has no first/last name', () => {
      const profiles: Profile[] = [
        {
          id: 'prof-empty',
          first_name: '',
          last_name: '',
          email: 'chef.sansnom@scout.fr',
          role: 'chef',
          status: 'active',
          primary_unit_id: 'u1',
          secondary_unit_id: null,
          created_at: '',
          updated_at: '',
        },
      ];

      const list = getChefsFilterList([], profiles);
      expect(list.length).toBe(1);
      expect(list[0].name).toBe('chef.sansnom@scout.fr');
    });
  });
});
