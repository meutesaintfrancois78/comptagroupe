import { Profile, Unit, Period, ExpenseCategory, Expense, ExpenseHistory } from '@/types/database';

const STORAGE_KEY = 'enf_compta_mock_db_v1';

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
    first_name: 'Benoît',
    last_name: 'Dupont',
    role: 'admin',
    status: 'active',
    primary_unit_id: 'u1',
    secondary_unit_id: null,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  },
  {
    id: 'user-chef-1',
    first_name: 'Guillaume',
    last_name: 'Martin',
    role: 'chef',
    status: 'active',
    primary_unit_id: 'u1',
    secondary_unit_id: 'u2',
    created_at: '2026-09-05T00:00:00Z',
    updated_at: '2026-09-05T00:00:00Z',
  },
  {
    id: 'user-chef-pending',
    first_name: 'Claire',
    last_name: 'Lemoine',
    role: 'chef',
    status: 'pending',
    primary_unit_id: 'u4',
    secondary_unit_id: null,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
  },
];

const DEFAULT_EXPENSES: Expense[] = [
  {
    id: 'exp-1',
    type: 'dépense',
    date: '2026-10-14',
    amount: 38.60,
    category_id: 'c1',
    custom_category: null,
    payment_method: 'unit_money',
    proof_path: 'mock/receipt-1.jpg',
    comment: 'Goûter et pain pour le week-end de rentrée',
    reimbursement_status: 'not_applicable',
    unit_id: 'u1',
    created_by: 'user-chef-1',
    period_id: 'p1',
    created_at: '2026-10-14T15:20:00Z',
    updated_at: '2026-10-14T15:20:00Z',
  },
  {
    id: 'exp-2',
    type: 'dépense',
    date: '2026-10-20',
    amount: 15.20,
    category_id: 'c5',
    custom_category: null,
    payment_method: 'personal_money',
    proof_path: 'mock/receipt-2.jpg',
    comment: 'Pansements et compresses pour la trousse de secours',
    reimbursement_status: 'pending',
    unit_id: 'u1',
    created_by: 'user-chef-1',
    period_id: 'p1',
    created_at: '2026-10-20T11:00:00Z',
    updated_at: '2026-10-20T11:00:00Z',
  },
  {
    id: 'exp-3',
    type: 'dépense',
    date: '2026-10-28',
    amount: 84.50,
    category_id: 'c3',
    custom_category: null,
    payment_method: 'personal_money',
    proof_path: 'mock/receipt-3.jpg',
    comment: 'Ficelle sisal et cordes pour le grand jeu',
    reimbursement_status: 'reimbursed',
    unit_id: 'u1',
    created_by: 'user-chef-1',
    period_id: 'p1',
    created_at: '2026-10-28T18:40:00Z',
    updated_at: '2026-10-30T10:00:00Z',
  },
];

export class MockSupabaseClient {
  private db: MockDB;
  private authListeners: ((event: string, session: any) => void)[] = [];

  constructor() {
    this.db = this.loadDB();
  }

  private loadDB(): MockDB {
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
            session: this.db.currentUser ? { user: { id: this.db.currentUser.id, email: `${this.db.currentUser.first_name.toLowerCase()}@enf.local` } } : null,
          },
          error: null,
        };
      },
      getUser: async () => {
        return {
          data: {
            user: this.db.currentUser ? { id: this.db.currentUser.id, email: `${this.db.currentUser.first_name.toLowerCase()}@enf.local` } : null,
          },
          error: null,
        };
      },
      signInWithPassword: async ({ email }: { email: string; password?: string }) => {
        const found = this.db.profiles.find((p) =>
          email.toLowerCase().includes(p.first_name.toLowerCase()) ||
          email.toLowerCase().includes(p.last_name.toLowerCase()) ||
          (p.role === 'admin' && email.includes('admin'))
        );
        if (found) {
          this.db.currentUser = found;
          this.saveDB();
          this.notifyAuth('SIGNED_IN');
          return { data: { user: { id: found.id, email } }, error: null };
        }
        // Fallback user
        this.db.currentUser = this.db.profiles[0];
        this.saveDB();
        this.notifyAuth('SIGNED_IN');
        return { data: { user: { id: this.db.currentUser.id, email } }, error: null };
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
          return { data: { signedUrl: `/mock-receipts/${path}` }, error: null };
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
                        id: 'hist-' + Date.now(),
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
          result = result.map((exp) => ({
            ...exp,
            unit: self.db.units.find((u) => u.id === exp.unit_id),
            category: self.db.categories.find((c) => c.id === exp.category_id),
            creator: self.db.profiles.find((p) => p.id === exp.created_by),
            period: self.db.periods.find((p) => p.id === exp.period_id),
            signed_proof_url: `/mock-receipts/${exp.proof_path}`,
          }));
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
