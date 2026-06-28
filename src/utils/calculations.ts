import { Item, Transaction, Forecast, ItemWIPStatus } from '../types';

/**
 * Calculates the current WIP (Work In Progress) for each process of a given item.
 * Formula: WIP = Sum(MASUK) - Sum(KELUAR) - Sum(KELUAR qty_ng)
 */
export function calculateItemWIP(item: Item, transactions: Transaction[]): Record<string, number> {
  const wip: Record<string, number> = {};
  
  // Initialize all processes in the sequence to 0
  item.alur_proses.forEach(proses => {
    wip[proses] = 0;
  });

  // Filter transactions for this item
  const itemTx = transactions.filter(tx => tx.item_id === item.id);

  // Sort by timestamp or just apply in sequence
  itemTx.forEach(tx => {
    const proses = tx.proses;
    // Only track if the process belongs to the item's process flow
    if (proses in wip) {
      if (tx.aksi === 'MASUK') {
        wip[proses] += tx.qty;
      } else if (tx.aksi === 'KELUAR') {
        wip[proses] -= tx.qty;
        if (tx.qty_ng) {
          wip[proses] -= tx.qty_ng;
        }
      }
    }
  });

  // Ensure no negative values are displayed for WIP (physical impossibility, but handles log sequence adjustments)
  Object.keys(wip).forEach(key => {
    wip[key] = Math.max(0, wip[key]);
  });

  return wip;
}

/**
 * Calculates current stock ready (Stok Ready Aktual)
 * Formula: stok_ready (baseline) + Sum(Last Process KELUAR) - Sum(DELIVERY transactions)
 */
export function calculateCurrentStock(item: Item, transactions: Transaction[]): number {
  const lastProcess = item.alur_proses[item.alur_proses.length - 1];
  
  const itemTx = transactions.filter(tx => tx.item_id === item.id);
  
  // Sum of output from the last process (PACKING or equivalent)
  const totalProduced = itemTx
    .filter(tx => tx.proses === lastProcess && tx.aksi === 'KELUAR')
    .reduce((sum, tx) => sum + tx.qty, 0);

  // Sum of deliveries shipped out
  const totalDelivered = itemTx
    .filter(tx => tx.proses === 'DELIVERY' && tx.aksi === 'KELUAR')
    .reduce((sum, tx) => sum + tx.qty, 0);

  // Current stock
  const currentStock = item.stok_ready + totalProduced - totalDelivered;
  return Math.max(0, currentStock);
}

/**
 * Formats date to local standard YYYY-MM-DD
 */
export function formatLocalDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return dateString;
  }
}

/**
 * Generate a unique ID with high reliability
 */
export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
