export interface User {
  uid: string;
  name: string;
  email: string;
  avatar: string;
  clubs: string[];
}

export interface Club {
  clubId: string;
  name: string;
  adminUid: string;
  inviteCode: string;
  members: string[];
}

export interface MealEntry {
  uid: string;
  clubId: string;
  date: string; // ISO format (YYYY-MM-DD)
  meals: {
    breakfast: boolean | null;
    lunch: boolean | null;
    dinner: boolean | null;
  };
}

export interface BillSplit {
  uid: string;
  userName: string;
  mealCount: number;
  amount: number;
}

export interface Bill {
  clubId: string;
  month: string; // YYYY-MM format
  totalAmount: number;
  splits: BillSplit[];
  status: 'pending' | 'settled';
}
