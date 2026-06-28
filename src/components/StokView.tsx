import React, { useState } from 'react';
import { AppData, Item, Forecast, Transaction } from '../types';
import { calculateCurrentStock, generateId, formatLocalDate } from '../utils/calculations';
import { Search, Plus, Truck, Share2, ShieldCheck, AlertCircle, TrendingUp, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

interface StokViewProps {
  appData: AppData;
  onAddTransactions: (newTxs: Transaction[]) => void;
  onCopyWA: (text: string) => void;
}

export default function StokView({ 
  appData, 
  onAddTransactions,
  onCopyWA
}: StokViewProps) {
  const { customers, items, forecasts, transactions } = appData;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  
  // State for in-place delivery entry
  const [deliveryItemId, setDeliveryItemId] = useState<string | null>(null);
  const [deliveryQty, setDeliveryQty] = useState<number>(0);
  const [deliveryCatatan, setDeliveryCatatan] = useState<string>('');

  // Filter items based on criteria
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

  // Calculate current stock levels and alerts
  const getStockStatus = (item: Item) => {
    const stock = calculateCurrentStock(item, transactions);
    
    // Find active forecast demands for this item
    const itemForecasts = forecasts.filter(f => f.item_id === item.id && f.status === 'ACTIVE');
    const totalDemand = itemForecasts.reduce((sum, f) => sum + f.qty, 0);

    return {
      stock,
      totalDemand,
      needsProduction: stock < totalDemand,
      deficit: Math.max(0, totalDemand - stock)
    };
  };

  // Quick delivery submission handler
  const handleQuickDelivery = (e: React.FormEvent, itemId: string) => {
    e.preventDefault();
    if (deliveryQty <= 0) return;

    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const stock = calculateCurrentStock(item, transactions);
    if (deliveryQty > stock) {
      alert(`Stok tidak cukup! Tersedia hanya ${stock} pcs.`);
      return;
    }

    const timestamp = new Date().toISOString();
    const newTx: Transaction = {
      id: generateId('t'),
      item_id: itemId,
      proses: 'DELIVERY',
      aksi: 'KELUAR',
      qty: deliveryQty,
      qty_ng: 0,
      catatan: deliveryCatatan || 'Quick Delivery dari Dashboard Stok',
      timestamp
    };

    onAddTransactions([newTx]);
    
    // Reset inputs
    setDeliveryItemId(null);
    setDeliveryQty(0);
    setDeliveryCatatan('');
  };

  // WhatsApp Stock Summary report generator
  const handleShareStockReport = () => {
    let reportText = `*LAPORAN STOK GUDANG GENTENG/BOX IKEA*\n`;
    reportText += `Tanggal: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}\n`;
    reportText += `=========================\n\n`;

    filteredItems.forEach(item => {
      const stockInfo = getStockStatus(item);
      const customer = customers.find(c => c.id === item.customer_id);
      
      reportText += `*${customer?.nama || 'CUSTOMER'}*\n`;
      reportText += `📦 *${item.model}* (${item.part_number})\n`;
      reportText += `   ↳ 🛒 Stok Aktual: *${stockInfo.stock} pcs*\n`;
      
      if (stockInfo.totalDemand > 0) {
        reportText += `   ↳ 📊 Rencana Kirim: *${stockInfo.totalDemand} pcs*\n`;
        if (stockInfo.needsProduction) {
          reportText += `   ↳ ⚠️ KURANG STOK: *-${stockInfo.deficit} pcs* ➔ Perlu Produksi!\n`;
        } else {
          reportText += `   ↳ ✅ Stok Aman\n`;
        }
      }
      reportText += `\n`;
    });

    reportText += `=========================\n`;
    reportText += `_Laporan dikirim instan dari Aplikasi IKEA_`;

    onCopyWA(reportText);
  };

  return (
    <div id="stok-view" className="space-y-6 pb-20">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Aktualisasi Stok & Forecast</h1>
          <p className="text-xs text-slate-500">Pantau ketersediaan barang jadi di gudang terhadap rencana kirim</p>
        </div>
        <button
          id="stok-share-wa"
          onClick={handleShareStockReport}
          className="flex items-center gap-1.5 rounded-xl bg-[#ffd100] border border-yellow-300 text-slate-900 px-3 py-2 text-xs font-black hover:bg-yellow-400 transition-all active:scale-95 shadow-xs"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span>Salin WA</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="ikea-card p-5 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <input
            id="stok-search-input"
            type="text"
            placeholder="Cari model, part number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border-2 border-ikea-blue-light bg-slate-50 pl-10 pr-3 py-3 text-sm text-slate-800 focus:border-ikea-blue focus:bg-white focus:outline-none"
          />
        </div>

        <select
          id="stok-customer-filter"
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

      {/* Item Stock List */}
      <div className="space-y-4">
        {filteredItems.map(item => {
          const customer = customers.find(c => c.id === item.customer_id);
          const { stock, totalDemand, needsProduction, deficit } = getStockStatus(item);
          const isSelected = deliveryItemId === item.id;

          return (
            <div 
              key={item.id} 
              className={`ikea-card p-5 transition-all ${
                needsProduction ? 'border-2 border-rose-400 bg-rose-50/10 hover:border-rose-500' : 'border-2 border-ikea-blue-light'
              }`}
            >
              {/* Card Header Info */}
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {customer?.nama || 'Pelanggan'}
                  </span>
                  <h3 className="font-extrabold text-slate-900 text-sm leading-tight mt-0.5">
                    {item.model}
                  </h3>
                  <p className="text-xs font-mono text-slate-500">{item.part_number}</p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 block">Stok Gudang</span>
                  <span className="text-lg font-black text-[#0058ab] font-mono">{stock} pcs</span>
                </div>
              </div>

              {/* Demand status / warnings */}
              <div className="mt-3 flex items-center justify-between text-xs border-t border-slate-50 pt-3">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>Forecast aktif: <strong className="font-bold text-slate-700">{totalDemand} pcs</strong></span>
                </div>

                {totalDemand > 0 && (
                  <div>
                    {needsProduction ? (
                      <div className="flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-0.5 rounded font-bold">
                        <AlertCircle className="h-3 w-3" />
                        <span>Kurang {deficit} pcs</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                        <ShieldCheck className="h-3 w-3" />
                        <span>Aman</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Delivery log button */}
              <div className="mt-3.5 pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setDeliveryItemId(null);
                    } else {
                      setDeliveryItemId(item.id);
                      setDeliveryQty(0);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                    isSelected 
                      ? 'bg-slate-100 text-slate-600' 
                      : 'bg-[#0058ab] text-white shadow-xs hover:bg-[#004280]'
                  }`}
                >
                  <Truck className="h-3.5 w-3.5" />
                  <span>{isSelected ? 'Batal Kirim' : 'Kirim / Delivery'}</span>
                  {isSelected ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              </div>

              {/* Mini in-place Delivery Form */}
              {isSelected && (
                <form 
                  onSubmit={(e) => handleQuickDelivery(e, item.id)} 
                  className="mt-4 border-t border-dashed border-slate-100 pt-4 space-y-3"
                >
                  <p className="text-xs font-semibold text-slate-700 bg-[#cceeff]/30 p-2.5 rounded-lg">
                    ⚙️ Melakukan pengiriman barang jadi ke pelanggan. Stok berjalan akan terpotong secara real-time.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Jumlah Dikirim (Pcs)
                      </label>
                      <input
                        type="number"
                        placeholder="Qty pcs"
                        value={deliveryQty || ''}
                        onChange={(e) => setDeliveryQty(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-bold focus:bg-white focus:outline-none focus:border-[#0058ab] focus:ring-1 focus:ring-[#0058ab]"
                        required
                        max={stock}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Catatan Pengiriman
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Surat Jalan #123"
                        value={deliveryCatatan}
                        onChange={(e) => setDeliveryCatatan(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs focus:bg-white focus:outline-none focus:border-[#0058ab] focus:ring-1 focus:ring-[#0058ab]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-[#0058ab] p-2.5 text-xs text-white font-bold hover:bg-[#004280] transition-all active:scale-95 shadow-sm"
                  >
                    Konfirmasi Pengiriman ({deliveryQty} pcs)
                  </button>
                </form>
              )}

            </div>
          );
        })}
      </div>

      {/* Forecast Schedules List Card */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-50 pb-2.5">
          <TrendingUp className="h-4 w-4 text-[#0058ab]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Rencana Pengiriman / Forecast Aktif</h2>
        </div>

        <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
          {forecasts
            .filter(f => f.status === 'ACTIVE')
            .map(f => {
              const item = items.find(i => i.id === f.item_id);
              const customerName = item ? (customers.find(c => c.id === item.customer_id)?.nama || 'Pelanggan') : 'Unknown';
              return (
                <div key={f.id} className="py-2.5 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-800 block leading-tight">{item?.model} ({item?.part_number})</span>
                    <span className="text-[10px] text-slate-400 block font-semibold">{customerName}</span>
                    <span className="text-[10px] text-slate-500 font-mono block mt-0.5">🗓️ Tgl Kirim: {formatLocalDate(f.tgl_delivery)}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-amber-600 block">Kirim: {f.qty} pcs</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-1 py-0.5 rounded">Outstanding</span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

    </div>
  );
}
