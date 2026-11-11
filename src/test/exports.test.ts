import { describe, it, expect } from 'bun:test';
import { generateCsvContent, normalizeReceiptFileName } from '../lib/exportCsv';
import { Expense } from '../types/database';

describe('Exports TDD (CSV & ZIP)', () => {
  const sampleExpenses: Expense[] = [
    {
      id: 'e1',
      type: 'dépense',
      date: '2026-10-14',
      amount: 42.5,
      category_id: 'c1',
      custom_category: null,
      payment_method: 'unit_money',
      proof_path: 'u1/ticket.jpg',
      comment: 'Pain et goûter "bio"',
      reimbursement_status: 'not_applicable',
      unit_id: 'u1',
      created_by: 'p1',
      period_id: 'per1',
      created_at: '',
      updated_at: '',
      unit: { id: 'u1', name: 'Meute 1', is_active: true, created_at: '' },
      category: { id: 'c1', name: 'Nourriture', is_active: true, created_at: '' },
      creator: { id: 'p1', first_name: 'Benoît', last_name: 'Dupont', role: 'admin', status: 'active', primary_unit_id: 'u1', secondary_unit_id: null, created_at: '', updated_at: '' },
    },
  ];

  it('should generate valid French Excel CSV with semicolon delimiter and UTF-8 BOM', () => {
    const csv = generateCsvContent(sampleExpenses, [
      'date',
      'unit',
      'creator',
      'amount',
      'category',
      'comment',
    ]);

    // Check UTF-8 BOM
    expect(csv.startsWith('\uFEFF')).toBe(true);

    // Check header
    expect(csv).toContain('Date;Unité;Chef;Montant;Catégorie;Commentaire');

    // Check row data
    expect(csv).toContain('14/10/2026;Meute 1;Benoît Dupont;42,50;Nourriture;"Pain et goûter ""bio"""');
  });

  it('should normalize receipt filename correctly for ZIP archive', () => {
    const name = normalizeReceiptFileName(sampleExpenses[0], 'jpg');
    expect(name).toBe('2026-10-14_Meute-1_42.50EUR.jpg');
  });

  it('should neutralize Excel formula injection characters in CSV fields', () => {
    const maliciousExpenses: Expense[] = [
      {
        ...sampleExpenses[0],
        comment: '=1+1 TEST audit Claude - a supprimer',
      },
      {
        ...sampleExpenses[0],
        id: 'e2',
        comment: '+cmd|"/C calc"!A0',
      },
      {
        ...sampleExpenses[0],
        id: 'e3',
        comment: '@SUM(1+1)',
      },
    ];

    const csv = generateCsvContent(maliciousExpenses, ['comment']);
    // Les caractères qui lancent une formule (=, +, -, @) sont retirés en tête de champ
    const lines = csv.replace('\uFEFF', '').split('\r\n');
    expect(lines[1]).toBe('1+1 TEST audit Claude - a supprimer');
    expect(lines[2]).toBe('"cmd|""/C calc""!A0"');
    expect(lines[3]).toBe('SUM(1+1)');
    expect(csv).not.toContain("'=");
    expect(csv).not.toContain("'+");
    expect(csv).not.toContain("'@");
  });

  it('should strip repeated or mixed leading formula characters', () => {
    const csv = generateCsvContent(
      [
        { ...sampleExpenses[0], comment: '\t=-+@HYPERLINK("x")' },
        { ...sampleExpenses[0], id: 'e5', comment: '-12,50 rendu' },
      ],
      ['comment']
    );
    const lines = csv.replace('\uFEFF', '').split('\r\n');
    expect(lines[1]).toBe('"HYPERLINK(""x"")"');
    expect(lines[2]).toBe('12,50 rendu');
  });

  it('should export all default columns when no column list is passed (Chef export)', () => {
    const csv = generateCsvContent(sampleExpenses);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Date;Unité;Chef;Montant;Catégorie;Mode de paiement;Statut remboursement;Commentaire');
    expect(csv).toContain('14/10/2026;Meute 1;Benoît Dupont;42,50;Nourriture;Argent de l\'unité;Sans objet;"Pain et goûter ""bio"""');
  });
});
