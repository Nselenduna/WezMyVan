import { PLATFORM_COMMISSION } from '@/constants/config';

export interface BasketItem {
  menu_item_id: string;
  quantity: number;
  unit_price_gbp: number;
}

export interface OrderTotals {
  total_gbp: number;
  commission_gbp: number;
  van_payout_gbp: number;
}

export function calculateOrder(items: BasketItem[]): OrderTotals {
  if (!items.length) throw new Error('Order must contain at least one item');

  for (const item of items) {
    if (item.quantity <= 0) throw new Error('Item quantity must be greater than zero');
    if (item.unit_price_gbp <= 0) throw new Error('Item price must be greater than zero');
  }

  const total_gbp = roundGbp(
    items.reduce((sum, item) => sum + item.unit_price_gbp * item.quantity, 0),
  );

  const commission_gbp = roundGbp(total_gbp * PLATFORM_COMMISSION);
  const van_payout_gbp = roundGbp(total_gbp - commission_gbp);

  return { total_gbp, commission_gbp, van_payout_gbp };
}

function roundGbp(value: number): number {
  return Math.round(value * 100) / 100;
}
