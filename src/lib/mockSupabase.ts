import { Profile, Unit, Period, ExpenseCategory, Expense, ExpenseHistory } from '@/types/database';

const STORAGE_KEY = 'saint_martin_compta_mock_db_v2';

interface MockDB {
  units: Unit[];
  categories: ExpenseCategory[];
  periods: Period[];
  profiles: Profile[];
  expenses: Expense[];
  history: ExpenseHistory[];
  currentUser: Profile | null;
}

const DEFAULT_UNITS: Unit[] = [
  { id: 'u1', name: 'Meute 1', is_active: true, created_at: '2026-09-01T00:00:00Z' },
  { id: 'u2', name: 'Meute 3', is_active: true, created_at: '2026-09-01T00:00:00Z' },
  { id: 'u3', name: 'Troupe 1', is_active: true, created_at: '2026-09-01T00:00:00Z' },
  { id: 'u4', name: 'Compagnie 2', is_active: true, created_at: '2026-09-01T00:00:00Z' },
  { id: 'u5', name: 'Clairière 2', is_active: true, created_at: '2026-09-01T00:00:00Z' },
  { id: 'u6', name: 'Clairière 4', is_active: true, created_at: '2026-09-01T00:00:00Z' },
];

const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  { id: 'c1', name: 'Nourriture', is_active: true, created_at: '2026-09-01T00:00:00Z' },
  { id: 'c2', name: 'Transport', is_active: true, created_at: '2026-09-01T00:00:00Z' },
  { id: 'c3', name: 'Matériel', is_active: true, created_at: '2026-09-01T00:00:00Z' },
  { id: 'c4', name: 'Hébergement', is_active: true, created_at: '2026-09-01T00:00:00Z' },
  { id: 'c5', name: 'Pharmacie', is_active: true, created_at: '2026-09-01T00:00:00Z' },
  { id: 'c6', name: 'Autre', is_active: true, created_at: '2026-09-01T00:00:00Z' },
];

const DEFAULT_PERIODS: Period[] = [
  { id: 'p1', name: 'Année 2026-2027', type: 'year', status: 'open', start_date: '2026-09-01', created_at: '2026-09-01T00:00:00Z' },
];

const DEFAULT_PROFILES: Profile[] = [
  {
    id: 'user-admin-1',
    email: 'benoit.dupont@exemple.fr',
    first_name: 'Benoît',
    last_name: 'Dupont',
    role: 'admin',
    status: 'active',
    primary_unit_id: 'u1',
    secondary_unit_id: null,
    iban: 'FR76 3000 6000 0112 3456 7890 189',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  },
  {
    id: 'user-admin-2',
    email: 'marie.vasseur@exemple.fr',
    first_name: 'Marie',
    last_name: 'Vasseur',
    role: 'admin',
    status: 'active',
    primary_unit_id: 'u3',
    secondary_unit_id: null,
    iban: 'FR14 2004 1010 0505 0001 3M02 606',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  },
  {
    id: 'user-chef-1',
    email: 'guillaume.martin@exemple.fr',
    first_name: 'Guillaume',
    last_name: 'Martin',
    role: 'chef',
    status: 'active',
    primary_unit_id: 'u1',
    secondary_unit_id: 'u2',
    iban: 'FR76 3000 6000 0112 3456 7890 189',
    created_at: '2026-09-05T00:00:00Z',
    updated_at: '2026-09-05T00:00:00Z',
  },
  {
    id: 'user-chef-2',
    email: 'thomas.bernard@exemple.fr',
    first_name: 'Thomas',
    last_name: 'Bernard',
    role: 'chef',
    status: 'active',
    primary_unit_id: 'u3',
    secondary_unit_id: null,
    iban: 'FR14 2004 1010 0505 0001 3M02 606',
    created_at: '2026-09-10T00:00:00Z',
    updated_at: '2026-09-10T00:00:00Z',
  },
  {
    id: 'user-chef-3',
    email: 'sophie.legrand@exemple.fr',
    first_name: 'Sophie',
    last_name: 'Legrand',
    role: 'chef',
    status: 'active',
    primary_unit_id: 'u5',
    secondary_unit_id: null,
    iban: 'FR76 3000 6000 0112 3456 7890 189',
    created_at: '2026-09-12T00:00:00Z',
    updated_at: '2026-09-12T00:00:00Z',
  },
  {
    id: 'user-chef-pending-1',
    email: 'claire.lemoine@exemple.fr',
    first_name: 'Claire',
    last_name: 'Lemoine',
    role: 'chef',
    status: 'pending',
    primary_unit_id: 'u4',
    secondary_unit_id: null,
    iban: 'FR14 2004 1010 0505 0001 3M02 606',
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
  },
  {
    id: 'user-chef-pending-2',
    email: 'alexandre.petit@exemple.fr',
    first_name: 'Alexandre',
    last_name: 'Petit',
    role: 'chef',
    status: 'pending',
    primary_unit_id: 'u6',
    secondary_unit_id: null,
    iban: 'FR76 3000 6000 0112 3456 7890 189',
    created_at: '2026-11-05T00:00:00Z',
    updated_at: '2026-11-05T00:00:00Z',
  },
  {
    id: 'user-chef-deactivated',
    email: 'julien.moreau@exemple.fr',
    first_name: 'Julien',
    last_name: 'Moreau',
    role: 'chef',
    status: 'deactivated',
    primary_unit_id: 'u2',
    secondary_unit_id: null,
    iban: null,
    created_at: '2026-08-20T00:00:00Z',
    updated_at: '2026-10-15T00:00:00Z',
  },
];

const DEFAULT_EXPENSES: Expense[] = [
  {
    id: 'exp-1',
    type: 'dépense',
    date: '2026-10-12',
    amount: 48.65,
    category_id: 'c1',
    custom_category: null,
    payment_method: 'unit_money',
    proof_path: 'ticket-super-u-nourriture.jpg',
    comment: 'Intendance week-end de rentrée (baguettes, nutella, pâtes, chocolat)',
    reimbursement_status: 'not_applicable',
    unit_id: 'u1',
    created_by: 'user-chef-1',
    period_id: 'p1',
    created_at: '2026-10-12T17:00:00Z',
    updated_at: '2026-10-12T17:00:00Z',
  },
  {
    id: 'exp-2',
    type: 'dépense',
    date: '2026-10-18',
    amount: 89.90,
    category_id: 'c3',
    custom_category: null,
    payment_method: 'unit_money',
    proof_path: 'facture-leroy-materiel.jpg',
    comment: 'Ficelle sisal 400m, bâche étanche et vis à bois pour les constructions',
    reimbursement_status: 'not_applicable',
    unit_id: 'u3',
    created_by: 'user-chef-2',
    period_id: 'p1',
    created_at: '2026-10-18T12:00:00Z',
    updated_at: '2026-10-18T12:00:00Z',
  },
  {
    id: 'exp-3',
    type: 'dépense',
    date: '2026-10-24',
    amount: 72.88,
    category_id: 'c2',
    custom_category: null,
    payment_method: 'personal_money',
    proof_path: 'ticket-station-total-carburant.jpg',
    comment: 'Plein gazole camionnette pour transport des malles de camp',
    reimbursement_status: 'pending',
    unit_id: 'u5',
    created_by: 'user-chef-3',
    period_id: 'p1',
    created_at: '2026-10-24T09:00:00Z',
    updated_at: '2026-10-24T09:00:00Z',
  },
  {
    id: 'exp-4',
    type: 'dépense',
    date: '2026-11-02',
    amount: 31.40,
    category_id: 'c5',
    custom_category: null,
    payment_method: 'personal_money',
    proof_path: 'ticket-pharmacie-secours.jpg',
    comment: 'Recharge trousse de secours (compresses, biseptine, pansements)',
    reimbursement_status: 'reimbursed',
    unit_id: 'u1',
    created_by: 'user-chef-1',
    period_id: 'p1',
    created_at: '2026-11-02T15:00:00Z',
    updated_at: '2026-11-04T10:00:00Z',
  },
  {
    id: 'exp-5',
    type: 'dépense',
    date: '2026-11-05',
    amount: 165.00,
    category_id: 'c4',
    custom_category: null,
    payment_method: 'unit_money',
    proof_path: 'facture-camping-hebergement.jpg',
    comment: 'Réservation emplacement camp de Toussaint Meute 1',
    reimbursement_status: 'not_applicable',
    unit_id: 'u1',
    created_by: 'user-admin-1',
    period_id: 'p1',
    created_at: '2026-11-05T11:00:00Z',
    updated_at: '2026-11-05T11:00:00Z',
  },
];

export class MockSupabaseClient {
  private db: MockDB;
  private authListeners: ((event: string, session: any) => void)[] = [];

  constructor() {
    this.db = this.loadDB();
  }

  private loadDB(): MockDB {
    if (typeof window !== 'undefined' && import.meta.env.PROD) {
      // In production, never write or seed mock data to localStorage
      return {
        units: [],
        categories: [],
        periods: [],
        profiles: [],
        expenses: [],
        history: [],
        currentUser: null,
      };
    }
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {}
    const initial: MockDB = {
      units: DEFAULT_UNITS,
      categories: DEFAULT_CATEGORIES,
      periods: DEFAULT_PERIODS,
      profiles: DEFAULT_PROFILES,
      expenses: DEFAULT_EXPENSES,
      history: [],
      currentUser: DEFAULT_PROFILES[0], // Connecté par défaut en admin
    };
    this.saveDB(initial);
    return initial;
  }

  public saveDB(customDB?: MockDB) {
    if (typeof window !== 'undefined' && import.meta.env.PROD) return;
    const toSave = customDB || this.db;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {}
  }

  public resetDB() {
    localStorage.removeItem(STORAGE_KEY);
    this.db = this.loadDB();
    this.notifyAuth('SIGNED_IN');
  }

  private notifyAuth(event: string) {
    const session = this.db.currentUser ? { user: { id: this.db.currentUser.id } } : null;
    this.authListeners.forEach((cb) => cb(event, session));
  }

  // Auth mock
  get auth() {
    return {
      getSession: async () => {
        return {
          data: {
            session: this.db.currentUser ? { user: { id: this.db.currentUser.id, email: `${this.db.currentUser.first_name.toLowerCase()}@saint-martin.local` } } : null,
          },
          error: null,
        };
      },
      getUser: async () => {
        return {
          data: {
            user: this.db.currentUser ? { id: this.db.currentUser.id, email: `${this.db.currentUser.first_name.toLowerCase()}@saint-martin.local` } : null,
          },
          error: null,
        };
      },
      signInWithPassword: async ({ email }: { email: string; password?: string }) => {
        // Seulement la partie avant @ : le domaine « saint-martin » contient « martin » (Guillaume Martin)
        // Sans accents : « benoit@… » doit trouver « Benoît »
        const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
        const local = plain(email.split('@')[0]);
        const found = this.db.profiles.find((p) =>
          local.includes(plain(p.first_name)) ||
          local.includes(plain(p.last_name)) ||
          (p.role === 'admin' && local.includes('admin'))
        );
        if (found) {
          this.db.currentUser = found;
          this.saveDB();
          this.notifyAuth('SIGNED_IN');
          return { data: { user: { id: found.id, email } }, error: null };
        }
        // Email inconnu : même réponse que Supabase, pour tester le message d'erreur en démo
        return { data: { user: null, session: null }, error: { message: 'Invalid login credentials', status: 400 } };
      },
      signUp: async ({ email, options }: any) => {
        const id = 'user-' + Date.now();
        const newProfile: Profile = {
          id,
          first_name: options?.data?.first_name || 'Nouveau',
          last_name: options?.data?.last_name || 'Chef',
          role: 'chef',
          status: 'pending',
          primary_unit_id: options?.data?.primary_unit_id || this.db.units[0].id,
          secondary_unit_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        this.db.profiles.push(newProfile);
        this.db.currentUser = newProfile;
        this.saveDB();
        this.notifyAuth('SIGNED_IN');
        return { data: { user: { id, email } }, error: null };
      },
      signOut: async () => {
        this.db.currentUser = null;
        this.saveDB();
        this.notifyAuth('SIGNED_OUT');
        return { error: null };
      },
      onAuthStateChange: (callback: (event: string, session: any) => void) => {
        this.authListeners.push(callback);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                this.authListeners = this.authListeners.filter((cb) => cb !== callback);
              },
            },
          },
        };
      },
      resetPasswordForEmail: async (_email: string) => {
        return { data: {}, error: null };
      },
    };
  }

  // Storage mock
  get storage() {
    return {
      from: (_bucket: string) => ({
        upload: async (path: string, _file: any) => {
          return { data: { path }, error: null };
        },
        createSignedUrl: async (path: string, _expiresIn: number) => {
          const filename = path.split('/').pop() || path;
          return { data: { signedUrl: `/mock-receipts/${filename}` }, error: null };
        },
        createSignedUrls: async (paths: string[], _expiresIn: number) => {
          return {
            data: paths.map((path) => ({
              path,
              signedUrl: `/mock-receipts/${path.split('/').pop() || path}`,
              error: null,
            })),
            error: null,
          };
        },
        remove: async (_paths: string[]) => {
          return { data: [], error: null };
        },
      }),
    };
  }

  // DB queries mock
  from(tableName: string) {
    const self = this;
    let filteredData: any[] = [];
    if (tableName === 'units') filteredData = [...this.db.units];
    else if (tableName === 'expense_categories') filteredData = [...this.db.categories];
    else if (tableName === 'periods') filteredData = [...this.db.periods];
    else if (tableName === 'profiles') filteredData = [...this.db.profiles];
    else if (tableName === 'expenses') filteredData = [...this.db.expenses];
    else if (tableName === 'expense_history') filteredData = [...this.db.history];

    const queryBuilder = {
      select: (columns: string = '*') => {
        return queryBuilder;
      },
      eq: (col: string, val: any) => {
        filteredData = filteredData.filter((item) => item[col] === val);
        return queryBuilder;
      },
      neq: (col: string, val: any) => {
        filteredData = filteredData.filter((item) => item[col] !== val);
        return queryBuilder;
      },
      in: (col: string, vals: any[]) => {
        filteredData = filteredData.filter((item) => vals.includes(item[col]));
        return queryBuilder;
      },
      order: (col: string, options?: { ascending?: boolean }) => {
        const asc = options?.ascending !== false;
        filteredData.sort((a, b) => {
          if (a[col] < b[col]) return asc ? -1 : 1;
          if (a[col] > b[col]) return asc ? 1 : -1;
          return 0;
        });
        return queryBuilder;
      },
      single: async () => {
        const item = filteredData[0] || null;
        return { data: item, error: item ? null : { message: 'Not found' } };
      },
      insert: async (rowOrRows: any) => {
        const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
        const inserted = rows.map((r) => ({
          ...r,
          id: r.id || 'gen-' + Date.now() + Math.random().toString(36).substring(2, 6),
          created_at: r.created_at || new Date().toISOString(),
          updated_at: r.updated_at || new Date().toISOString(),
        }));

        if (tableName === 'expenses') {
          self.db.expenses.push(...inserted);
        } else if (tableName === 'profiles') {
          self.db.profiles.push(...inserted);
        } else if (tableName === 'periods') {
          self.db.periods.push(...inserted);
        } else if (tableName === 'units') {
          self.db.units.push(...inserted);
        } else if (tableName === 'expense_categories') {
          self.db.categories.push(...inserted);
        } else if (tableName === 'expense_history') {
          self.db.history.push(...inserted);
        }
        self.saveDB();
        return { data: Array.isArray(rowOrRows) ? inserted : inserted[0], error: null };
      },
      update: (updates: any) => {
        return {
          eq: async (col: string, val: any) => {
            let updatedItem: any = null;
            if (tableName === 'expenses') {
              self.db.expenses = self.db.expenses.map((item) => {
                if (item[col as keyof Expense] === val) {
                  // Track history
                  Object.keys(updates).forEach((k) => {
                    if (item[k as keyof Expense] !== updates[k]) {
                      self.db.history.push({
                        id: 'hist-' + Date.now() + '-' + k,
                        expense_id: item.id,
                        changed_by: self.db.currentUser?.id || null,
                        changed_at: new Date().toISOString(),
                        field_name: k,
                        old_value: String(item[k as keyof Expense]),
                        new_value: String(updates[k]),
                      });
                    }
                  });
                  updatedItem = { ...item, ...updates, updated_at: new Date().toISOString() };
                  return updatedItem;
                }
                return item;
              });
            } else if (tableName === 'profiles') {
              // Safeguard last admin
              if (updates.role && updates.role !== 'admin') {
                const target = self.db.profiles.find((p) => p[col as keyof Profile] === val);
                if (target?.role === 'admin') {
                  const activeAdmins = self.db.profiles.filter((p) => p.role === 'admin' && p.status === 'active' && p.id !== target.id);
                  if (activeAdmins.length === 0) {
                    return { data: null, error: { message: 'Action impossible : le système doit conserver au moins un administrateur actif.' } };
                  }
                }
              }
              self.db.profiles = self.db.profiles.map((p) => {
                if (p[col as keyof Profile] === val) {
                  updatedItem = { ...p, ...updates, updated_at: new Date().toISOString() };
                  return updatedItem;
                }
                return p;
              });
            } else if (tableName === 'units' || tableName === 'expense_categories') {
              const key = tableName === 'units' ? 'units' : 'categories';
              (self.db as any)[key] = (self.db as any)[key].map((u: any) => {
                if (u[col] === val) {
                  updatedItem = { ...u, ...updates };
                  return updatedItem;
                }
                return u;
              });
            } else if (tableName === 'periods') {
              self.db.periods = self.db.periods.map((p) => {
                if (p[col as keyof Period] === val) {
                  updatedItem = { ...p, ...updates };
                  return updatedItem;
                }
                return p;
              });
            }
            self.saveDB();
            return { data: updatedItem, error: null };
          },
        };
      },
      delete: () => {
        return {
          eq: async (col: string, val: any) => {
            if (tableName === 'expenses') {
              self.db.expenses = self.db.expenses.filter((item) => item[col as keyof Expense] !== val);
            } else if (tableName === 'periods') {
              self.db.periods = self.db.periods.filter((item) => item[col as keyof Period] !== val);
            }
            self.saveDB();
            return { data: null, error: null };
          },
        };
      },
      then<TResult1 = any, TResult2 = never>(
        onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
      ): Promise<TResult1 | TResult2> {
        // Handle Joins for expenses
        let result = [...filteredData];
        if (tableName === 'expenses') {
          result = result.map((exp) => {
            const filename = exp.proof_path.split('/').pop() || exp.proof_path;
            return {
              ...exp,
              unit: self.db.units.find((u) => u.id === exp.unit_id),
              category: self.db.categories.find((c) => c.id === exp.category_id),
              creator: self.db.profiles.find((p) => p.id === exp.created_by),
              period: self.db.periods.find((p) => p.id === exp.period_id),
              signed_proof_url: `/mock-receipts/${filename}`,
            };
          });
        } else if (tableName === 'profiles') {
          result = result.map((prof) => ({
            ...prof,
            primary_unit: self.db.units.find((u) => u.id === prof.primary_unit_id),
            secondary_unit: self.db.units.find((u) => u.id === prof.secondary_unit_id),
          }));
        }
        return Promise.resolve({ data: result, error: null }).then(onfulfilled, onrejected);
      },
    };

    return queryBuilder;
  }
}

export const mockClientInstance = new MockSupabaseClient();
