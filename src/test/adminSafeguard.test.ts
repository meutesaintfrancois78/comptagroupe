import { describe, it, expect } from 'bun:test';
import { Profile } from '../types/database';

function canDemoteAdmin(adminId: string, profiles: Profile[]): { allowed: boolean; error?: string } {
  const target = profiles.find((p) => p.id === adminId);
  if (!target || target.role !== 'admin') {
    return { allowed: false, error: 'Profil introuvable ou déjà non-admin' };
  }
  const remainingAdmins = profiles.filter(
    (p) => p.role === 'admin' && p.status === 'active' && p.id !== adminId
  );
  if (remainingAdmins.length === 0) {
    return {
      allowed: false,
      error: 'Action impossible : le système doit conserver au moins un administrateur actif.',
    };
  }
  return { allowed: true };
}

describe('Last Admin Safeguard TDD', () => {
  const singleAdminList: Profile[] = [
    {
      id: 'admin-1',
      first_name: 'Unique',
      last_name: 'Admin',
      role: 'admin',
      status: 'active',
      primary_unit_id: 'u1',
      secondary_unit_id: null,
      created_at: '',
      updated_at: '',
    },
    {
      id: 'chef-1',
      first_name: 'Jean',
      last_name: 'Chef',
      role: 'chef',
      status: 'active',
      primary_unit_id: 'u1',
      secondary_unit_id: null,
      created_at: '',
      updated_at: '',
    },
  ];

  it('should prevent demoting the sole active admin', () => {
    const res = canDemoteAdmin('admin-1', singleAdminList);
    expect(res.allowed).toBe(false);
    expect(res.error).toContain('au moins un administrateur');
  });

  it('should allow demoting an admin if another active admin exists', () => {
    const twoAdminsList: Profile[] = [
      ...singleAdminList,
      {
        id: 'admin-2',
        first_name: 'Second',
        last_name: 'Admin',
        role: 'admin',
        status: 'active',
        primary_unit_id: 'u2',
        secondary_unit_id: null,
        created_at: '',
        updated_at: '',
      },
    ];
    const res = canDemoteAdmin('admin-1', twoAdminsList);
    expect(res.allowed).toBe(true);
  });
});
