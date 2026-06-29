import React, { useState } from 'react';
import { AppData, Item, Transaction } from '../types';
import { calculateItemWIP, generateId } from '../utils/calculations';
import { Search, ArrowRight, Share2, CornerDownRight, CheckSquare, ChevronRight, HelpCircle, X, Plus, Minus, Save, Edit3 } from 'lucide-react';

interface LaporanWipViewProps {
  appData: AppData;
  onNavigateToCatat: (itemId: string, proses: string) => void;
  onAddTransactions: (newTxs: Transaction[]) => void;
  onCopyWA: (text: string) => void;
}

export default function LaporanWipView({ 
  appData, 
  onNavigateToCatat,
  onAddTransactions,
  onCopyWA
}: LaporanWipViewProps) {
  const { customers, items, transactions } = appData;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  // States for Quick WIP editing dialog
  const [editingWip, setEditingWip] = useState<{
    item: Item;
    proses: string;
    currentQty: number;
  } | null>(null);
  const [newWipQty, setNewWipQty] = useState<string>('');

  const handleSaveQuickWip = () => {
    if (!editingWip) return;
    
    const targetQty = parseInt(newWipQty);
    if (isNaN(targetQty) || targetQty < 0) {
      alert('Jumlah WIP harus berupa angka positif atau nol!');
      return;
    }

    const diff = targetQty - editingWip.currentQty;
    if (diff !== 0) {
      const newTx: Transaction = {
        id: generateId('tx'),
        item_id: editingWip.item.id,
        proses: editingWip.proses,
        aksi: diff > 0 ? 'MASUK' : 'KELUAR',
        qty: Math.abs(diff),
        timestamp: new Date().toISOString(),
        catatan: `Penyesuaian WIP Cepat (${editingWip.currentQty} ➔ ${targetQty})`
      };
      onAddTransactions([newTx]);
    }

    setEditingWip(null);
  };

  const handleAdjustPreset = (amount: number) => {
    const currentVal = parseInt(newWipQty) || 0;
    const newVal = Math.max(0, currentVal + amount);
    setNewWipQty(newVal.toString());
  };

  // Filter items based on search and customer dropdown
  const filteredItems = items.filter(item => {
    const customer = customers.find(c => c.id === item.customer_id);
    const customerName = customer ? customer.nama : '';
    const matchesCustomer = !selectedCustomerId || item.customer_id === selectedCustomerId;
    const matchesSearch = !searchQuery || 
      item.part_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCustomer && matchesSearch;
  });

  // Calculate total active WIP pieces across all items
  const calculateTotalWipPcs = () => {
    let grandTotal = 0;
    items.forEach(item => {
      const wip = calculateItemWIP(item, transactions);
      Object.values(wip).forEach(val => grandTotal += val);
    });
    return grandTotal;
  };

  // Prepares the text for WA sharing of current WIP state
  const handleShareWipReport = () => {
    let reportText = `*LAPORAN AKTUAL WIP PRODUKSI*\n`;
    reportText += `Tanggal: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}\n`;
    reportText += `=========================\n\n`;

    filteredItems.forEach(item => {
      const wip = calculateItemWIP(item, transactions);
      const hasActiveWip = Object.values(wip).some(v => v > 0);
      
      if (hasActiveWip) {
        const customer = customers.find(c => c.id === item.customer_id);
        reportText += `*${customer?.nama || 'CUSTOMER'}*\n`;
        reportText += `📦 *${item.model}* (${item.part_number})\n`;
        
        item.alur_proses.forEach(proc => {
          const qty = wip[proc] || 0;
          if (qty > 0) {
            reportText += `   ↳ ⚙️ ${proc}: *${qty} pcs*\n`;
          }
        });
        reportText += `\n`;
      }
    });

    reportText += `=========================\n`;
    reportText += `_Dikirim otomatis via PWA Aplikasi IKEA_`;

    onCopyWA(reportText);
  };

  return (
    <div id="laporan-wip-view" className="space-y-6 pb-20">
      
      {/* Header and Summary stats */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Laporan WIP Aktif</h1>
          <p className="text-xs text-slate-500">Pantau sisa barang di setiap stasiun kerja secara real-time</p>
        </div>
        <button
          id="wip-share-wa"
          onClick={handleShareWipReport}
          className="flex items-center gap-1.5 rounded-xl bg-[#ffd100] border border-yellow-300 text-slate-900 px-3 py-2 text-xs font-black hover:bg-yellow-400 transition-all active:scale-95 shadow-xs"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span>Salin WA</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3.5">
        <div className="ikea-card p-4 flex flex-col justify-between">
          <span className="text-gray-600 text-[10px] font-bold uppercase block tracking-wider">Total WIP Berjalan</span>
          <span className="text-2xl font-black text-[#0058ab] font-mono block mt-1">{calculateTotalWipPcs()} pcs</span>
        </div>
        <div className="ikea-card-yellow p-4 flex flex-col justify-between">
          <span className="text-gray-600 text-[10px] font-bold uppercase block tracking-wider">Produk Dipantau</span>
          <span className="text-2xl font-black text-gray-800 font-mono block mt-1">{filteredItems.length} model</span>
        </div>
      </div>

      {/* Search & Customer Selector */}
      <div className="ikea-card p-5 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <input
            id="wip-search-input"
            type="text"
            placeholder="Cari model, part number, atau pelanggan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border-2 border-ikea-blue-light bg-slate-50 pl-10 pr-3 py-3 text-sm text-slate-800 focus:border-ikea-blue focus:bg-white focus:outline-none"
          />
        </div>

        <select
          id="wip-customer-filter"
          value={selectedCustomerId}
          onChange={(e) => setSelectedCustomerId(e.target.value)}
          className="w-full rounded-xl border-2 border-ikea-blue-light bg-slate-50 p-3 text-sm text-slate-800 focus:border-ikea-blue focus:bg-white focus:outline-none"
        >
          <option value="">-- Semua Pelanggan --</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.nama}</option>
          ))}
        </select>
      </div>

      {/* Interactive Products WIP Flow List */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-10 rounded-2xl border-2 border-dashed border-slate-100">
            <HelpCircle className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500 font-medium">Tidak ada produk yang cocok</p>
          </div>
        ) : (
          filteredItems.map(item => {
            const customer = customers.find(c => c.id === item.customer_id);
            const wipStatus = calculateItemWIP(item, transactions);
            const totalWipOnItem = Object.values(wipStatus).reduce((a, b) => a + b, 0);

            return (
              <div 
                key={item.id} 
                className={`ikea-card p-5 transition-all ${
                  totalWipOnItem > 0 ? 'border-2 border-ikea-blue bg-[#f0f6ff]/20' : 'border-slate-100 opacity-85'
                }`}
              >
                {/* Product Header */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {customer?.nama || 'Pelanggan'}
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-sm leading-tight mt-0.5">
                      {item.model}
                    </h3>
                    <p className="text-xs font-mono text-slate-500">{item.part_number}</p>
                  </div>
                  {totalWipOnItem > 0 ? (
                    <span className="text-[11px] font-black text-[#0058ab] bg-[#cceeff] border border-blue-200 px-2 py-0.5 rounded-full font-mono">
                      WIP: {totalWipOnItem} pcs
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">
                      Selesai / Kosong
                    </span>
                  )}
                </div>

                {/* Step sequences container */}
                <div className="mt-3 bg-slate-50/50 rounded-xl p-3 border border-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Stasiun Kerja & Sisa WIP</span>
                    <span className="text-[9px] font-black text-[#0058ab] bg-[#cceeff] px-1.5 py-0.5 rounded-md animate-pulse">⚡ Tap angka untuk input cepat</span>
                  </div>
                  
                  <div className="grid grid-cols-1 divide-y divide-slate-100">
                    {item.alur_proses.map((proses, idx) => {
                      const qty = wipStatus[proses] || 0;
                      const isLast = idx === item.alur_proses.length - 1;
                      
                      return (
                        <div key={proses} className="py-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-extrabold text-slate-300">0{idx + 1}</span>
                            <span className="text-xs font-bold text-slate-700">{proses}</span>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Quantity label with interactive tap trigger */}
                            <span 
                              onClick={() => {
                                setEditingWip({
                                  item,
                                  proses,
                                  currentQty: qty
                                });
                                setNewWipQty(qty.toString());
                              }}
                              title="Tap untuk input cepat WIP"
                              className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg cursor-pointer transition-all duration-200 flex items-center gap-1 shadow-sm ${
                                qty > 0 
                                  ? 'bg-amber-100 text-amber-900 font-black ring-2 ring-amber-200/50 hover:bg-amber-200 hover:scale-105 active:scale-95' 
                                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 hover:scale-105 active:scale-95'
                              }`}
                            >
                              <span>{qty} pcs</span>
                              <Edit3 className="h-2.5 w-2.5 opacity-60" />
                            </span>

                            {/* Mobile action button to transfer to next step */}
                            {qty > 0 && !isLast && (
                              <button
                                type="button"
                                onClick={() => onNavigateToCatat(item.id, proses)}
                                className="flex items-center gap-1 rounded-lg bg-[#0058ab] text-white px-2.5 py-1 text-[11px] font-extrabold hover:bg-[#004280] transition-all active:scale-95 shadow-sm"
                              >
                                <span>Lanjut</span>
                                <ChevronRight className="h-3 w-3" />
                              </button>
                            )}
                            
                            {qty > 0 && isLast && (
                              <button
                                type="button"
                                onClick={() => onNavigateToCatat(item.id, proses)}
                                className="flex items-center gap-1 rounded-lg bg-emerald-600 text-white px-2.5 py-1 text-[11px] font-extrabold hover:bg-emerald-700 transition-all active:scale-95 shadow-sm"
                              >
                                <span>Kemas</span>
                                <CheckSquare className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* QUICK WIP INPUT OVERLAY DIALOG */}
      {editingWip && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in">
          {/* Backdrop closer */}
          <div className="absolute inset-0" onClick={() => setEditingWip(null)}></div>
          
          {/* Modal Container */}
          <div className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden transform transition-all duration-300 animate-in slide-in-from-bottom">
            {/* Modal Header */}
            <div className="bg-slate-900 p-5 text-white flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest block">
                  {customers.find(c => c.id === editingWip.item.customer_id)?.nama || 'PELANGGAN'}
                </span>
                <h4 className="font-extrabold text-base leading-tight mt-0.5">{editingWip.item.model}</h4>
                <p className="text-xs font-mono text-slate-300 mt-1">{editingWip.item.part_number}</p>
              </div>
              <button 
                onClick={() => setEditingWip(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Process indicator */}
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">STASIUN KERJA</span>
                <span className="text-xs font-black text-[#0058ab] bg-white border border-blue-200 px-3 py-1 rounded-full uppercase tracking-wider">
                  ⚙️ {editingWip.proses}
                </span>
              </div>

              {/* Input Area */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                  MASUKKAN JUMLAH SISA WIP TERBARU (PCS)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    value={newWipQty}
                    onChange={(e) => setNewWipQty(e.target.value)}
                    className="w-full text-center text-3xl font-black text-slate-900 bg-slate-50 border-2 border-ikea-blue rounded-2xl py-3 px-4 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100"
                    placeholder="0"
                    autoFocus
                    onFocus={(e) => e.target.select()}
                  />
                  <span className="absolute right-4 text-sm font-black text-slate-400 uppercase tracking-wider font-mono">pcs</span>
                </div>
              </div>

              {/* QUICK PRESETS & CONTROL BUTTONS */}
              <div className="space-y-2">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tombol Pintas Pembantu</span>
                
                {/* Plus / Minus Presets */}
                <div className="grid grid-cols-6 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAdjustPreset(-100)}
                    className="py-2 text-[11px] font-black bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg border border-rose-200 cursor-pointer active:scale-95 transition-all"
                  >
                    -100
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustPreset(-50)}
                    className="py-2 text-[11px] font-black bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg border border-rose-200 cursor-pointer active:scale-95 transition-all"
                  >
                    -50
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustPreset(-10)}
                    className="py-2 text-[11px] font-black bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg border border-rose-200 cursor-pointer active:scale-95 transition-all"
                  >
                    -10
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustPreset(10)}
                    className="py-2 text-[11px] font-black bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-200 cursor-pointer active:scale-95 transition-all"
                  >
                    +10
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustPreset(50)}
                    className="py-2 text-[11px] font-black bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-200 cursor-pointer active:scale-95 transition-all"
                  >
                    +50
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustPreset(100)}
                    className="py-2 text-[11px] font-black bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-200 cursor-pointer active:scale-95 transition-all"
                  >
                    +100
                  </button>
                </div>

                {/* Direct Setters */}
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setNewWipQty('0')}
                    className="py-2.5 text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl cursor-pointer active:scale-95 transition-all"
                  >
                    Set Selesai (0 pcs)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewWipQty(editingWip.currentQty.toString())}
                    className="py-2.5 text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl cursor-pointer active:scale-95 transition-all"
                  >
                    Reset Semula ({editingWip.currentQty} pcs)
                  </button>
                </div>
              </div>

              {/* Explanatory system note */}
              <p className="text-[10px] text-slate-400 leading-relaxed text-center italic">
                {parseInt(newWipQty) - editingWip.currentQty === 0 ? (
                  <span>Tidak ada perubahan nilai WIP.</span>
                ) : (
                  <span>
                    Sistem akan mencatat transaksi penyesuaian{' '}
                    <strong className="text-slate-600 font-bold">
                      {(parseInt(newWipQty) || 0) - editingWip.currentQty > 0 ? 'MASUK' : 'KELUAR'}{' '}
                      {Math.abs((parseInt(newWipQty) || 0) - editingWip.currentQty)} pcs
                    </strong>{' '}
                    untuk menyesuaikan sisa WIP.
                  </span>
                )}
              </p>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex gap-2">
              <button
                type="button"
                onClick={() => setEditingWip(null)}
                className="w-1/3 py-3 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-all cursor-pointer text-center"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveQuickWip}
                className="w-2/3 py-3 text-xs font-black text-white bg-[#0058ab] hover:bg-[#004280] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-blue-200"
              >
                <Save className="h-4 w-4" />
                <span>Simpan Penyesuaian</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
