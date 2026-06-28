import React, { useState } from 'react';
import { AppData, Item } from '../types';
import { calculateItemWIP } from '../utils/calculations';
import { Search, ArrowRight, Share2, CornerDownRight, CheckSquare, ChevronRight, HelpCircle } from 'lucide-react';

interface LaporanWipViewProps {
  appData: AppData;
  onNavigateToCatat: (itemId: string, proses: string) => void;
  onCopyWA: (text: string) => void;
}

export default function LaporanWipView({ 
  appData, 
  onNavigateToCatat,
  onCopyWA
}: LaporanWipViewProps) {
  const { customers, items, transactions } = appData;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

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
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Stasiun Kerja & Sisa WIP</span>
                  
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
                            {/* Quantity label */}
                            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                              qty > 0 ? 'bg-amber-100 text-amber-900 font-extrabold' : 'bg-slate-100 text-slate-400'
                            }`}>
                              {qty} pcs
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

    </div>
  );
}
