import { calculateOrder } from '@/lib/stripe/calculateOrder';

describe('calculateOrder', () => {
  it('calculates correct total from a single item', () => {
    const result = calculateOrder([{ menu_item_id: 'a', quantity: 1, unit_price_gbp: 2.50 }]);
    expect(result.total_gbp).toBe(2.50);
  });

  it('calculates correct total from multiple items', () => {
    const result = calculateOrder([
      { menu_item_id: 'a', quantity: 2, unit_price_gbp: 2.50 },
      { menu_item_id: 'b', quantity: 1, unit_price_gbp: 1.80 },
    ]);
    expect(result.total_gbp).toBe(6.80);
  });

  it('calculates commission as 12% of total (to 2dp)', () => {
    const result = calculateOrder([{ menu_item_id: 'a', quantity: 1, unit_price_gbp: 10.00 }]);
    expect(result.commission_gbp).toBe(1.20);
  });

  it('calculates van_payout as total minus commission', () => {
    const result = calculateOrder([{ menu_item_id: 'a', quantity: 1, unit_price_gbp: 10.00 }]);
    expect(result.van_payout_gbp).toBe(8.80);
  });

  it('rounds commission to 2 decimal places', () => {
    const result = calculateOrder([{ menu_item_id: 'a', quantity: 1, unit_price_gbp: 2.50 }]);
    expect(result.commission_gbp).toBe(0.30);
    expect(result.van_payout_gbp).toBe(2.20);
  });

  it('handles multiple items with correct per-item total', () => {
    const result = calculateOrder([
      { menu_item_id: 'a', quantity: 3, unit_price_gbp: 2.20 },
      { menu_item_id: 'b', quantity: 2, unit_price_gbp: 1.80 },
    ]);
    expect(result.total_gbp).toBe(10.20);
    expect(result.commission_gbp).toBe(1.22);
    expect(result.van_payout_gbp).toBe(8.98);
  });

  it('throws if items array is empty', () => {
    expect(() => calculateOrder([])).toThrow('at least one item');
  });

  it('throws if quantity is zero', () => {
    expect(() =>
      calculateOrder([{ menu_item_id: 'a', quantity: 0, unit_price_gbp: 2.50 }]),
    ).toThrow('quantity');
  });

  it('throws if price is zero', () => {
    expect(() =>
      calculateOrder([{ menu_item_id: 'a', quantity: 1, unit_price_gbp: 0 }]),
    ).toThrow('price');
  });

  it('throws if price is negative', () => {
    expect(() =>
      calculateOrder([{ menu_item_id: 'a', quantity: 1, unit_price_gbp: -1 }]),
    ).toThrow('price');
  });
});
