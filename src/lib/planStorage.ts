const PLAN_STORAGE_KEY = 'selected_plan_data';

export interface StoredPlanData {
  tier: string;
  planId: string;
  billing: 'monthly' | 'yearly';
  timestamp: number;
}

export const storePlanSelection = (data: Omit<StoredPlanData, 'timestamp'>) => {
  const planData: StoredPlanData = {
    ...data,
    timestamp: Date.now()
  };
  localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(planData));
};

export const getStoredPlanSelection = (): StoredPlanData | null => {
  const stored = localStorage.getItem(PLAN_STORAGE_KEY);
  if (!stored) return null;
  
  try {
    const data = JSON.parse(stored) as StoredPlanData;
    // Expire after 1 hour
    if (Date.now() - data.timestamp > 3600000) {
      clearStoredPlanSelection();
      return null;
    }
    return data;
  } catch {
    return null;
  }
};

export const clearStoredPlanSelection = () => {
  localStorage.removeItem(PLAN_STORAGE_KEY);
};
