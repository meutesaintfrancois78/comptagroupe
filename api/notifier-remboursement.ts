/**
 * Fonction serveur Vercel : envoie au chef l'email « ta dépense a été remboursée ».
 *
 * Appelée par l'appli (POST /api/notifier-remboursement, corps { expenseId }) juste après qu'un
 * admin a coché « Remboursée ». Le jeton Supabase de l'admin est transmis dans Authorization :
 * la fonction lit la base avec ses droits (RLS) et vérifie qu'il est bien admin actif.
 *
 * Variables d'environnement Vercel (voir docs/EMAILS.md) :
 *   SMTP_USER, SMTP_PASSWORD           adresse qui envoie et son mot de passe d'application
 *   SMTP_HOST, SMTP_PORT (facultatifs)  défaut smtp.gmail.com et 465
 *   MAIL_FROM_NAME (facultatif)         nom affiché de l'expéditeur
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY  déjà présentes pour l'appli
 */
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const SUBJECT_PREFIX = '[Comptabilité groupe]';
const APP_URL = 'https://comptagroupe.vercel.app';

type Req = { method?: string; headers: Record<string, string | string[] | undefined>; body?: any };
type Res = { status: (code: number) => Res; json: (body: unknown) => void };

const euros = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);

const dateFr = (iso: string) => {
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso;
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return res.status(405).json({ sent: false, reason: 'method' });

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  if (!supabaseUrl || !supabaseKey || !smtpUser || !smtpPassword) {
    return res.status(503).json({ sent: false, reason: 'not_configured' });
  }

  const auth = String(req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const expenseId = String(body.expenseId || '');
  if (!token || !expenseId) return res.status(400).json({ sent: false, reason: 'bad_request' });

  // Client Supabase avec les droits de l'admin qui appelle (aucune clé service_role ici)
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return res.status(401).json({ sent: false, reason: 'unauthenticated' });

  const { data: me } = await supabase.from('profiles').select('role, status').eq('id', userData.user.id).single();
  if (!me || me.role !== 'admin' || me.status !== 'active') {
    return res.status(403).json({ sent: false, reason: 'forbidden' });
  }

  const { data: exp } = await supabase
    .from('expenses')
    .select('id, date, amount, custom_category, payment_method, reimbursement_status, unit:units(name), category:expense_categories(name), creator:profiles(first_name, email)')
    .eq('id', expenseId)
    .single();
  if (!exp) return res.status(404).json({ sent: false, reason: 'not_found' });
  if (exp.payment_method !== 'personal_money' || exp.reimbursement_status !== 'reimbursed') {
    return res.status(409).json({ sent: false, reason: 'not_reimbursed' });
  }

  const creator = (Array.isArray(exp.creator) ? exp.creator[0] : exp.creator) as { first_name?: string; email?: string } | null;
  const unit = (Array.isArray(exp.unit) ? exp.unit[0] : exp.unit) as { name?: string } | null;
  const category = (Array.isArray(exp.category) ? exp.category[0] : exp.category) as { name?: string } | null;
  const to = creator?.email;
  if (!to) return res.status(422).json({ sent: false, reason: 'no_email' });

  const firstName = creator?.first_name || '';
  const motif = exp.custom_category || category?.name || 'Dépense';
  const amount = euros(exp.amount);
  const lines = [
    `Bonjour ${firstName},`,
    '',
    `Ta dépense de ${amount} du ${dateFr(exp.date)} (${motif}${unit?.name ? `, ${unit.name}` : ''}) a été remboursée.`,
    '',
    `Tu peux la retrouver dans l'appli : ${APP_URL}`,
    '',
    'Merci pour ton engagement !',
    'La trésorerie du groupe Saint-Martin',
    '',
    '— Email automatique, merci de ne pas y répondre.',
  ];
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#1f2937">
<p>Bonjour ${escapeHtml(firstName)},</p>
<p>Ta dépense de <strong>${escapeHtml(amount)}</strong> du ${escapeHtml(dateFr(exp.date))}
(${escapeHtml(motif)}${unit?.name ? `, ${escapeHtml(unit.name)}` : ''}) <strong>a été remboursée</strong>.</p>
<p><a href="${APP_URL}">Ouvrir l'appli Compta Groupe</a></p>
<p>Merci pour ton engagement !<br>La trésorerie du groupe Saint-Martin</p>
<p style="color:#6b7280;font-size:13px">Email automatique, merci de ne pas y répondre.</p>
</div>`;

  const port = Number(process.env.SMTP_PORT || 465);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: { user: smtpUser, pass: smtpPassword },
  });

  try {
    await transporter.sendMail({
      from: { name: process.env.MAIL_FROM_NAME || 'Compta Groupe Saint-Martin', address: smtpUser },
      to,
      subject: `${SUBJECT_PREFIX} Ta dépense de ${amount} a été remboursée`,
      text: lines.join('\n'),
      html,
    });
  } catch (err) {
    console.error('Envoi SMTP impossible', err);
    return res.status(502).json({ sent: false, reason: 'smtp_error' });
  }

  return res.status(200).json({ sent: true, to });
}
