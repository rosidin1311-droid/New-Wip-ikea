import React, { useState } from 'react';
import { AppData, Transaction, Item } from '../types';
import { calculateItemWIP, calculateCurrentStock, formatLocalDate } from '../utils/calculations';
import { Search, ListFilter, ArrowUpDown, Trash2, Edit2, Calendar, ShieldCheck, AlertCircle, ShoppingCart, RefreshCw, X, Check } from 'lucide-react';

interface DashboardViewProps {
  appData: AppData;
  onDeleteTransaction: (id: string) => void;
  onUpdateTransaction: (updated: Transaction) => void;
  onResetToBackup: () => void;
}

export default function DashboardView({ 
  appData, 
  onDeleteTransaction,
  onUpdateTransaction,
  onResetToBackup
}: DashboardViewProps) {
  const { customers, items, forecasts, transactions } = appData;
  const [globalSearch, setGlobalSearch] = useState('');
  
  // State for transaction editing modal/inline form
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<number>(0);
  const [editQtyNg, setEditQtyNg] = useState<number>(0);
  const [editCatatan, setEditCatatan] = useState<string>('');

  // Calculate stats
  const totalWip = () => {
    let sum = 0;
    items.forEach(item => {
      const wip = calculateItemWIP(item, transactions);
      Object.values(wip).forEach(v => sum += v);
    });
    return sum;
  };

  const totalStock = () => {
    let sum = 0;
    items.forEach(item => {
      sum += calculateCurrentStock(item, transactions);
    });
    return sum;
  };

  const totalDemand = forecasts
    .filter(f => f.status === 'ACTIVE')
    .reduce((sum, f) => sum + f.qty, 0);

  // Rejects today
  const totalNgToday = () => {
    const today = new Date().toISOString().split('T')[0];
    return transactions
      .filter(tx => tx.qty_ng && tx.qty_ng > 0 && tx.timestamp.startsWith(today))
      .reduce((sum, tx) => sum + (tx.qty_ng || 0), 0);
  };

  // Find products matching the query
  const matchingItems = globalSearch ? items.filter(item => {
    const customer = customers.find(c => c.id === item.customer_id)?.nama || '';
    return item.part_number.toLowerCase().includes(globalSearch.toLowerCase()) ||
           item.model.toLowerCase().includes(globalSearch.toLowerCase()) ||
           customer.toLowerCase().includes(globalSearch.toLowerCase());
  }).slice(0, 5) : [];

  // Recent 10 transactions
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  const startEdit = (tx: Transaction) => {
    setEditingTxId(tx.id);
    setEditQty(tx.qty);
    setEditQtyNg(tx.qty_ng || 0);
    setEditCatatan(tx.catatan || '');
  };

  const saveEdit = (tx: Transaction) => {
    onUpdateTransaction({
      ...tx,
      qty: editQty,
      qty_ng: editQtyNg,
      catatan: editCatatan
    });
    setEditingTxId(null);
  };

  return (
    <div id="dashboard-view" className="space-y-6 pb-20">
      
      {/* Quick Dashboard Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <span className="text-[10px] font-black text-[#0058ab] uppercase tracking-widest bg-[#cceeff] px-2 py-0.5 rounded-full">Project IKEA</span>
          <h1 className="text-xl font-bold text-slate-950 tracking-tight mt-1">Dashboard Produksi</h1>
        </div>
        <button
          onClick={() => {
            if (confirm('Apakah Anda yakin ingin menyetel ulang data kembali ke backup semula? Semua perubahan hari ini akan diganti.')) {
              onResetToBackup();
            }
          }}
          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-500 hover:bg-slate-50 transition-all active:scale-95"
        >
          <RefreshCw className="h-3 w-3 text-[#0058ab]" />
          <span>Reset Backup</span>
        </button>
      </div>

      {/* Global Search Hub */}
      <div className="relative rounded-3xl bg-gradient-to-br from-[#0058ab] to-[#003c75] p-5 text-white shadow-lg">
        <h2 className="text-xs font-bold uppercase tracking-widest text-yellow-300">Pencarian Cepat Produk</h2>
        <div className="mt-2.5 relative">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-blue-200" />
          <input
            id="dash-global-search"
            type="text"
            placeholder="Ketik model / part number / customer..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="w-full rounded-2xl bg-[#004a8f]/50 border border-blue-400/30 pl-10 pr-4 py-3 text-sm text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-[#ffd100] focus:border-[#ffd100]"
          />
          {globalSearch && (
            <button 
              onClick={() => setGlobalSearch('')}
              className="absolute right-3 top-4 text-blue-200 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Global Search Results dropdown */}
        {globalSearch && (
          <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 divide-y divide-slate-50 z-20 text-slate-800 max-h-60 overflow-y-auto">
            {matchingItems.length === 0 ? (
              <p className="p-4 text-center text-xs text-slate-400">Tidak ada produk ditemukan</p>
            ) : (
              matchingItems.map(item => {
                const customer = customers.find(c => c.id === item.customer_id)?.nama || '';
                const wip = calculateItemWIP(item, transactions);
                const totalItemWIP = Object.values(wip).reduce((a, b) => a + b, 0);
                const stock = calculateCurrentStock(item, transactions);
                
                return (
                  <div key={item.id} className="p-3 text-xs">
                    <div className="flex justify-between font-bold text-slate-900 mb-1">
                      <span>{item.model}</span>
                      <span className="text-[#0058ab] font-mono font-extrabold">Stok: {stock} pcs</span>
                    </div>
                    <div className="flex justify-between text-slate-500 font-mono text-[10px]">
                      <span>{item.part_number} • {customer}</span>
                      <span className="text-amber-600 font-bold">WIP: {totalItemWIP} pcs</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* KPI Metrics Dashboard Grid */}
      <div className="grid grid-cols-2 gap-3.5">
        {/* WIP Card */}
        <div className="ikea-card-yellow p-4 flex flex-col justify-between min-h-24">
          <span className="text-[10px] font-bold text-amber-950 uppercase tracking-wider block">Total Sisa WIP</span>
          <span className="text-2xl font-black text-ikea-blue mt-1 font-mono block">{totalWip()} pcs</span>
          <span className="text-[9px] text-amber-900 font-extrabold mt-1 bg-white/70 px-2.5 py-1 rounded-full w-max border border-amber-200">Sedang diproduksi</span>
        </div>

        {/* Stock Card */}
        <div className="ikea-card p-4 flex flex-col justify-between min-h-24">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Total Stok Gudang</span>
          <span className="text-2xl font-black text-ikea-blue mt-1 font-mono block">{totalStock()} pcs</span>
          <span className="text-[9px] text-ikea-blue font-extrabold mt-1 bg-ikea-blue-light/50 px-2.5 py-1 rounded-full w-max border border-ikea-blue-light">Siap kirim (FG)</span>
        </div>

        {/* Demand Forecasts Card */}
        <div className="ikea-card p-4 flex flex-col justify-between min-h-24">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Outstanding Order</span>
          <span className="text-2xl font-black text-emerald-800 mt-1 font-mono block">{totalDemand} pcs</span>
          <span className="text-[9px] text-emerald-900 font-extrabold mt-1 bg-emerald-50 px-2.5 py-1 rounded-full w-max border border-emerald-200">Forecast aktif</span>
        </div>

        {/* Defects Today Card */}
        <div className="ikea-card p-4 flex flex-col justify-between min-h-24">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Qty NG (Hari Ini)</span>
          <span className={`text-2xl font-black mt-1 font-mono block ${totalNgToday() > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{totalNgToday()} pcs</span>
          <span className="text-[9px] text-rose-900 font-extrabold mt-1 bg-rose-50 px-2.5 py-1 rounded-full w-max border border-rose-200">Reject / Buangan</span>
        </div>
      </div>

      {/* Recent Ledger Logs (EDIT & DELETE CONTROL) */}
      <div className="ikea-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-50 pb-2.5">
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="h-4 w-4 text-[#0058ab]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">10 Catatan Transaksi Terakhir</h2>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Total logs: {transactions.length}</span>
        </div>

        {/* Transactions list container */}
        <div className="space-y-3.5 divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
          {recentTransactions.map((tx, index) => {
            const item = items.find(i => i.id === tx.item_id);
            const customerName = item ? (customers.find(c => c.id === item.customer_id)?.nama || 'Pelanggan') : 'Unknown';
            const isEditing = editingTxId === tx.id;
            const isDelivery = tx.proses === 'DELIVERY';

            return (
              <div key={tx.id} className={`pt-3.5 ${index === 0 ? 'pt-0 border-t-0' : ''} text-xs`}>
                {isEditing ? (
                  /* Inline Edit Form */
                  <div className="space-y-3 bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <p className="font-bold text-slate-800">Ubah Transaksi</p>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Qty Bagus (OK)</label>
                        <input
                          type="number"
                          value={editQty}
                          onChange={(e) => setEditQty(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold font-mono text-xs"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Qty NG (Defect)</label>
                        <input
                          type="number"
                          value={editQtyNg}
                          disabled={isDelivery}
                          onChange={(e) => setEditQtyNg(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold font-mono text-xs disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Catatan</label>
                      <input
                        type="text"
                        value={editCatatan}
                        onChange={(e) => setEditCatatan(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-xs"
                      />
                    </div>

                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingTxId(null)}
                        className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-100 flex items-center gap-1"
                      >
                        <X className="h-3 w-3" />
                        <span>Batal</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => saveEdit(tx)}
                        className="px-2 py-1 text-xs bg-[#0058ab] text-white rounded hover:bg-[#004280] flex items-center gap-1 font-bold"
                      >
                        <Check className="h-3 w-3" />
                        <span>Simpan</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Normal View with Edit/Delete Controls */
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-extrabold text-slate-800 block leading-tight">
                          {item?.model || 'Produk'} ({item?.part_number})
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold block">{customerName}</span>
                        
                        {/* Transaction path tags */}
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className={`px-1.5 py-0.5 rounded font-black text-[9px] uppercase font-mono ${
                            tx.aksi === 'MASUK' 
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                              : 'bg-rose-50 text-rose-800 border border-rose-100'
                          }`}>
                            {tx.aksi}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded text-[9px]">
                            {tx.proses}
                          </span>
                          {tx.catatan && (
                            <span className="text-[10px] text-slate-500 italic block">
                              "{tx.catatan}"
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-slate-800 text-sm block">
                          {tx.qty} pcs
                        </span>
                        {tx.qty_ng ? (
                          <span className="text-[10px] font-bold text-rose-600 block">
                            NG: {tx.qty_ng} pcs
                          </span>
                        ) : null}
                        <span className="text-[9px] text-slate-400 block font-mono mt-1">
                          {new Date(tx.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Quick Ledger Action buttons */}
                    <div className="flex items-center justify-end gap-3 mt-2 border-t border-dashed border-slate-50 pt-2 text-slate-400">
                      <button
                        type="button"
                        onClick={() => startEdit(tx)}
                        className="flex items-center gap-1 hover:text-[#0058ab] transition-colors text-[10px] font-bold"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>Ubah</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Hapus transaksi ini? Tindakan ini akan mengembalikan jumlah WIP & stok ke kondisi sebelumnya secara instan.')) {
                            onDeleteTransaction(tx.id);
                          }
                        }}
                        className="flex items-center gap-1 hover:text-rose-600 transition-colors text-[10px] font-bold"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
