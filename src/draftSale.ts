// Автосохранение черновика текущей продажи

export interface DraftSale {
  cart: any[];
  selectedClient: any | null;
  paymentMethod: string;
  globalDiscount: number;
  savedAt: string;
}

const DRAFT_KEY = 'sh_draft_sale';
const DRAFT_TTL_HOURS = 24; // хранить 24 часа

export function saveDraft(draft: Omit<DraftSale, 'savedAt'>): void {
  try {
    const data: DraftSale = { ...draft, savedAt: new Date().toISOString() };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch {
    // Ignore
  }
}

export function loadDraft(): DraftSale | null {
  try {
    const stored = localStorage.getItem(DRAFT_KEY);
    if (!stored) return null;

    const draft: DraftSale = JSON.parse(stored);

    // Проверяем срок годности (24 часа)
    const savedAt = new Date(draft.savedAt);
    const now = new Date();
    const ageHours = (now.getTime() - savedAt.getTime()) / (1000 * 60 * 60);
    if (ageHours > DRAFT_TTL_HOURS) {
      clearDraft();
      return null;
    }

    return draft;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Ignore
  }
}
