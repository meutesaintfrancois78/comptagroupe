import {
  ShoppingCart,
  Utensils,
  Coffee,
  Apple,
  Bus,
  Car,
  Fuel,
  Train,
  Package,
  Boxes,
  Wrench,
  Hammer,
  Tent,
  Building,
  Flame,
  Compass,
  HeartPulse,
  Cross,
  ShieldAlert,
  Ticket,
  Sparkles,
  Shirt,
  Receipt,
  Ellipsis,
  type LucideIcon,
} from 'lucide-react';

/** Définition d'une icône sélectionnable pour les catégories */
export interface CategoryIconDefinition {
  name: string;
  label: string;
  icon: LucideIcon;
}

/** Nombre maximum de motifs de dépense actifs personnalisés (hors motif système « Autre ») */
export const MAX_ACTIVE_CUSTOM_CATEGORIES = 5;

/**
 * Catalogue d'icônes scoutes et de trésorerie sélectionnées pour les motifs de paiement.
 */
export const AVAILABLE_CATEGORY_ICONS: CategoryIconDefinition[] = [
  // Alimentation / Intendance
  { name: 'ShoppingCart', label: 'Courses / Intendance', icon: ShoppingCart },
  { name: 'Utensils', label: 'Repas / Cuisine', icon: Utensils },
  { name: 'Coffee', label: 'Goûters / Boissons', icon: Coffee },
  { name: 'Apple', label: 'Produits frais', icon: Apple },

  // Transport
  { name: 'Bus', label: 'Bus / Car', icon: Bus },
  { name: 'Car', label: 'Voiture / Péage', icon: Car },
  { name: 'Fuel', label: 'Carburant / Essence', icon: Fuel },
  { name: 'Train', label: 'Train / Métro', icon: Train },

  // Matériel & Bricolage
  { name: 'Package', label: 'Matériel / Fournitures', icon: Package },
  { name: 'Boxes', label: 'Malles de camp', icon: Boxes },
  { name: 'Wrench', label: 'Outils / Réparation', icon: Wrench },
  { name: 'Hammer', label: 'Constructions / Froissartage', icon: Hammer },

  // Camp & Hébergement
  { name: 'Tent', label: 'Camp / Tentes', icon: Tent },
  { name: 'Building', label: 'Local / Hébergement', icon: Building },
  { name: 'Flame', label: 'Feu / Veillée', icon: Flame },
  { name: 'Compass', label: 'Raid / Orientation', icon: Compass },

  // Santé & Sécurité
  { name: 'HeartPulse', label: 'Pharmacie / Soins', icon: HeartPulse },
  { name: 'Cross', label: 'Premiers secours', icon: Cross },
  { name: 'ShieldAlert', label: 'Assurance / Sécurité', icon: ShieldAlert },

  // Animation & Vie scoute
  { name: 'Ticket', label: 'Sorties / Visites', icon: Ticket },
  { name: 'Sparkles', label: 'Grand jeu / Fête', icon: Sparkles },
  { name: 'Shirt', label: 'Uniformes / Foulards', icon: Shirt },

  // Général & Système
  { name: 'Receipt', label: 'Facture / Ticket', icon: Receipt },
  { name: 'Ellipsis', label: 'Autre (système)', icon: Ellipsis },
];

const ICONS_MAP: Record<string, LucideIcon> = AVAILABLE_CATEGORY_ICONS.reduce(
  (acc, def) => {
    acc[def.name] = def.icon;
    return acc;
  },
  {} as Record<string, LucideIcon>
);

/**
 * Vérifie si une catégorie est la catégorie système réservée « Autre ».
 */
export function isSystemCategory(catOrName?: { name?: string | null } | string | null): boolean {
  if (!catOrName) return false;
  const name = typeof catOrName === 'string' ? catOrName : catOrName.name || '';
  return name.trim().toLowerCase() === 'autre';
}

/**
 * Calcule le nombre de catégories actives personnalisées (hors « Autre »).
 */
export function getActiveCustomCategoriesCount(
  categories: { name: string; is_active: boolean }[]
): number {
  return categories.filter((c) => c.is_active && !isSystemCategory(c)).length;
}

/**
 * Détermine si une catégorie inactive peut être activée sans dépasser le quota de 5 motifs (+ Autre).
 */
export function canActivateCategory(
  categories: { id: string; name: string; is_active: boolean }[],
  targetId: string
): { canActivate: boolean; reason?: string } {
  const target = categories.find((c) => c.id === targetId);
  if (!target) return { canActivate: false, reason: 'Catégorie introuvable.' };

  // « Autre » peut toujours être actif
  if (isSystemCategory(target)) {
    return { canActivate: true };
  }

  // Si elle est déjà active, on peut la laisser active
  if (target.is_active) {
    return { canActivate: true };
  }

  const currentActive = getActiveCustomCategoriesCount(categories);
  if (currentActive >= MAX_ACTIVE_CUSTOM_CATEGORIES) {
    return {
      canActivate: false,
      reason: `Limite de ${MAX_ACTIVE_CUSTOM_CATEGORIES} motifs actifs atteinte (+ Autre). Désactive d'abord un autre motif pour activer celui-ci.`,
    };
  }

  return { canActivate: true };
}

/**
 * Résout le composant LucideIcon pour une catégorie donnée :
 * 1. Priorité au champ `icon` explicite de la base s'il est reconnu
 * 2. Fallback historique par analyse sémantique du nom
 * 3. Défaut `Receipt`
 */
export function getCategoryIcon(
  iconName?: string | null,
  categoryName?: string | null
): LucideIcon {
  if (iconName && ICONS_MAP[iconName]) {
    return ICONS_MAP[iconName];
  }

  const n = (categoryName || '').toLowerCase();
  if (/autre/.test(n)) return Ellipsis;
  if (/intendance|nourri|aliment|repas|course|cuisine/.test(n)) return ShoppingCart;
  if (/transport|train|bus|voiture|essence|carbur|p[ée]age/.test(n)) return Bus;
  if (/mat[ée]riel|[ée]quipement|outil|fourniture/.test(n)) return Package;
  if (/h[ée]berg|logement|camp|tente|location/.test(n)) return Tent;
  if (/pharma|soin|sant[ée]|m[ée]dic/.test(n)) return HeartPulse;
  if (/activit|sortie|loisir|billet|entr[ée]e/.test(n)) return Ticket;

  return Receipt;
}
