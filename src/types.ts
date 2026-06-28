/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Customer {
  id: string;
  nama: string;
  status: boolean;
}

export interface Item {
  id: string;
  customer_id: string;
  model: string;
  part_number: string;
  alur_proses: string[];
  stok_ready: number; // Baseline stock from JSON backup
}

export interface Forecast {
  id: string;
  item_id: string;
  tgl_delivery: string;
  qty: number;
  stok_awal: number;
  remain: number;
  status: 'ACTIVE' | 'CLOSED' | 'ARCHIVED' | string;
}

export interface Transaction {
  id: string;
  item_id: string;
  proses: string;
  aksi: 'MASUK' | 'KELUAR';
  qty: number;
  qty_ng?: number;
  catatan?: string;
  timestamp: string;
}

export interface AppData {
  version: string;
  timestamp: string;
  customers: Customer[];
  items: Item[];
  forecasts: Forecast[];
  transactions: Transaction[];
  available_proses: string[];
}

export interface ItemWIPStatus {
  item_id: string;
  wip: Record<string, number>; // Maps process name -> current WIP quantity
}
