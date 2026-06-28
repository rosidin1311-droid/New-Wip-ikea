import React, { useState, useEffect } from 'react';
import { Customer, Item, Transaction, AppData } from '../types';
import { calculateItemWIP, calculateCurrentStock, generateId } from '../utils/calculations';
import { ArrowRight, CheckCircle2, AlertTriangle, Play, HelpCircle, Truck, RefreshCw } from 'lucide-react';

interface CatatViewProps {
  appData: AppData;
  onAddTransactions: (newTxs: Transaction[]) => void;
  selectedItemIdFromWIP?: string;
  selectedProsesFromWIP?: string;
}

export default function CatatView({ 
  appData, 
  onAddTransactions,
  selectedItemIdFromWIP,
  selectedProsesFromWIP
}: CatatViewProps) {
  const { customers, items, transactions } = appData;

  // Form states
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [actionType, setActionType] = useState<'MASUK_FIRST' | 'TRANSFER' | 'KELUAR_LAST' | 'DELIVERY'>('TRANSFER');
  const [fromProcess, setFromProcess] = useState<string>('');
  const [qty, setQty] = useState<number>(0);
  const [qtyNg, setQtyNg] = useState<number>(0);
  const [catatan, setCatatan] = useState<string>('');
  const [searchItemQuery, setSearchItemQuery] = useState<string>('');
  
  // Alert message state
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Pre-fill if coming from WIP quick-action
  useEffect(() => {
    if (selectedItemIdFromWIP) {
      const item = items.find(i => i.id === selectedItemIdFromWIP);
      if (item) {
        setSelectedCustomerId(item.customer_id);
        setSelectedModel(item.model);
        setSelectedItemId(item.id);
        
        if (selectedProsesFromWIP) {
          setActionType('TRANSFER');
          setFromProcess(selectedProsesFromWIP);
        }
      }
    }
  }, [selectedItemIdFromWIP, selectedProsesFromWIP, items]);

  // Derived states for sequential selection: Customer -> Model -> Item
  const activeCustomers = customers.filter(c => c.status);
  
  const customerItems = items.filter(item => item.customer_id === selectedCustomerId);
  
  const availableModels = Array.from(
    new Set(customerItems.map(item => item.model))
  ).sort();

  const availableItems = customerItems.filter(item => {
    const matchesModel = !selectedModel || item.model === selectedModel;
    const matchesSearch = !searchItemQuery || 
      item.part_number.toLowerCase().includes(searchItemQuery.toLowerCase()) ||
      item.model.toLowerCase().includes(searchItemQuery.toLowerCase());
    return matchesModel && matchesSearch;
  });

  const selectedItem = items.find(i => i.id === selectedItemId);
  const selectedItemWIP = selectedItem ? calculateItemWIP(selectedItem, transactions) : {};
  const selectedItemStock = selectedItem ? calculateCurrentStock(selectedItem, transactions) : 0;

  // Determine processes based on action type
  const processFlow = selectedItem ? selectedItem.alur_proses : [];
  const firstProcess = processFlow.length > 0 ? processFlow[0] : '';
  const lastProcess = processFlow.length > 0 ? processFlow[processFlow.length - 1] : '';

  // Get next process in flow
  const getNextProcess = (current: string): string => {
    if (!selectedItem) return '';
    const idx = selectedItem.alur_proses.indexOf(current);
    if (idx !== -1 && idx < selectedItem.alur_proses.length - 1) {
      return selectedItem.alur_proses[idx + 1];
    }
    return '';
  };

  const nextProcess = fromProcess ? getNextProcess(fromProcess) : '';

  // Handle saving transaction
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!selectedItemId) {
      setMessage({ type: 'error', text: 'Silakan pilih barang terlebih dahulu.' });
      return;
    }
    if (qty <= 0) {
      setMessage({ type: 'error', text: 'Jumlah (Quantity) harus lebih besar dari 0.' });
      return;
    }

    const timestamp = new Date().toISOString();
    const newTxs: Transaction[] = [];

    if (actionType === 'MASUK_FIRST') {
      // 1. Input baru ke proses pertama
      newTxs.push({
        id: generateId('t'),
        item_id: selectedItemId,
        proses: firstProcess,
        aksi: 'MASUK',
        qty: qty,
        qty_ng: 0,
        catatan: catatan || 'Input awal produksi',
        timestamp
      });
    } 
    else if (actionType === 'TRANSFER') {
      // 2. Transfer WIP ke proses selanjutnya
      if (!fromProcess) {
        setMessage({ type: 'error', text: 'Silakan pilih proses asal transfer.' });
        return;
      }
      const availableWip = selectedItemWIP[fromProcess] || 0;
      const totalRequested = qty + qtyNg;
      
      if (totalRequested > availableWip) {
        setMessage({
          type: 'error',
          text: `WIP tidak cukup! Tersedia di ${fromProcess} hanya ${availableWip} pcs. Anda meminta ${totalRequested} pcs (Qty: ${qty} + Qty NG: ${qtyNg}).`
        });
        return;
      }

      const nextProcName = getNextProcess(fromProcess);
      if (!nextProcName) {
        setMessage({ type: 'error', text: 'Tidak ada proses selanjutnya untuk ditransfer. Gunakan aksi "Selesai ke Gudang".' });
        return;
      }

      // Log KELUAR from current process
      newTxs.push({
        id: `${generateId('t')}-auto-prev`,
        item_id: selectedItemId,
        proses: fromProcess,
        aksi: 'KELUAR',
        qty: qty,
        qty_ng: qtyNg,
        catatan: catatan || `Selesai dipindahkan otomatis ke proses ${nextProcName}`,
        timestamp
      });

      // Log MASUK to next process
      newTxs.push({
        id: generateId('t'),
        item_id: selectedItemId,
        proses: nextProcName,
        aksi: 'MASUK',
        qty: qty,
        qty_ng: 0,
        timestamp
      });
    } 
    else if (actionType === 'KELUAR_LAST') {
      // 3. Selesai (Packing / proses terakhir)
      const availableWip = selectedItemWIP[lastProcess] || 0;
      const totalRequested = qty + qtyNg;

      if (totalRequested > availableWip) {
        setMessage({
          type: 'error',
          text: `WIP tidak cukup! Tersedia di ${lastProcess} hanya ${availableWip} pcs. Anda meminta ${totalRequested} pcs (Qty: ${qty} + Qty NG: ${qtyNg}).`
        });
        return;
      }

      // Log KELUAR from last process
      newTxs.push({
        id: generateId('t'),
        item_id: selectedItemId,
        proses: lastProcess,
        aksi: 'KELUAR',
        qty: qty,
        qty_ng: qtyNg,
        catatan: catatan || 'Selesai produksi, masuk gudang stok siap kirim',
        timestamp
      });
    } 
    else if (actionType === 'DELIVERY') {
      // 4. Pengiriman (Delivery) - subtracts from stok_ready
      if (qty > selectedItemStock) {
        setMessage({
          type: 'error',
          text: `Stok tidak mencukupi! Tersedia di gudang hanya ${selectedItemStock} pcs. Anda ingin mengirim ${qty} pcs.`
        });
        return;
      }

      newTxs.push({
        id: generateId('t'),
        item_id: selectedItemId,
        proses: 'DELIVERY',
        aksi: 'KELUAR',
        qty: qty,
        qty_ng: 0,
        catatan: catatan || 'Pengiriman produk ke pelanggan',
        timestamp
      });
    }

    onAddTransactions(newTxs);
    setMessage({
      type: 'success',
      text: `Berhasil mencatat ${newTxs.length} transaksi pergerakan barang!`
    });

    // Reset some fields
    setQty(0);
    setQtyNg(0);
    setCatatan('');
    
    // Auto clear alert after 3 secs
    setTimeout(() => {
      setMessage(null);
    }, 4000);
  };

  const currentCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <div id="catat-view" className="space-y-6 pb-20">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Catat Pergerakan Produksi</h1>
          <p className="text-xs text-slate-500">Form cepat untuk mencatat WIP masuk, transfer, selesai, dan delivery</p>
        </div>
        <div className="rounded-full bg-[#cceeff] p-2 text-[#0058ab]">
          <RefreshCw className="h-5 w-5 animate-spin" style={{ animationDuration: '6s' }} />
        </div>
      </div>

      {/* Success / Error Notification */}
      {message && (
        <div 
          id="catat-notification"
          className={`flex items-start gap-3 rounded-xl p-4 text-sm transition-all duration-300 ${
            message.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
              : 'bg-rose-50 text-rose-800 border border-rose-100'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Step 1: Pilih Pelanggan (Customer) */}
        <div className="ikea-card p-5 space-y-3">
          <label className="block text-xs font-black uppercase tracking-wider text-[#0058ab]">
            1. PILIH PELANGGAN (CUSTOMER)
          </label>
          <select
            id="catat-customer-select"
            value={selectedCustomerId}
            onChange={(e) => {
              setSelectedCustomerId(e.target.value);
              setSelectedModel('');
              setSelectedItemId('');
            }}
            className="w-full rounded-xl border-2 border-ikea-blue bg-slate-50 p-3 text-sm font-sans font-black uppercase text-slate-900 focus:border-ikea-blue focus:bg-white focus:outline-none tracking-wider"
          >
            <option value="" className="font-normal uppercase">-- PILIH PELANGGAN --</option>
            {activeCustomers.map(c => (
              <option key={c.id} value={c.id} className="font-black uppercase tracking-wider">{c.nama}</option>
            ))}
          </select>
        </div>

        {/* Step 2: Pilih Model */}
        <div className={`ikea-card p-5 space-y-3 transition-opacity duration-300 ${!selectedCustomerId ? 'opacity-50 pointer-events-none' : ''}`}>
          <label className="block text-xs font-black uppercase tracking-wider text-[#0058ab]">
            2. PILIH MODEL PRODUK
          </label>
          <select
            value={selectedModel}
            onChange={(e) => {
              setSelectedModel(e.target.value);
              setSelectedItemId('');
            }}
            disabled={!selectedCustomerId}
            className="w-full rounded-xl border-2 border-ikea-blue bg-slate-50 p-3 text-sm font-extrabold text-slate-800 focus:border-ikea-blue focus:bg-white focus:outline-none"
          >
            <option value="">-- {selectedCustomerId ? 'PILIH MODEL' : 'PILIH PELANGGAN TERLEBIH DAHULU'} --</option>
            {availableModels.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
        </div>

        {/* Step 3: Pilih Item / Part Number */}
        <div className={`ikea-card p-5 space-y-3 transition-opacity duration-300 ${!selectedModel ? 'opacity-50 pointer-events-none' : ''}`}>
          <label className="block text-xs font-black uppercase tracking-wider text-[#0058ab]">
            3. PILIH DETAIL ITEM & SIZE (PART NUMBER)
          </label>
          
          <select
            value={selectedItemId}
            onChange={(e) => {
              const itemId = e.target.value;
              setSelectedItemId(itemId);
              const item = items.find(i => i.id === itemId);
              if (item && item.alur_proses.length > 0) {
                setFromProcess(item.alur_proses[0]);
              }
            }}
            disabled={!selectedModel}
            className="w-full rounded-xl border-2 border-ikea-blue bg-slate-50 p-3 text-sm font-bold text-slate-800 focus:border-ikea-blue focus:bg-white focus:outline-none"
          >
            <option value="">-- {selectedModel ? 'PILIH DETAIL UKURAN (PART NUMBER)' : 'PILIH MODEL TERLEBIH DAHULU'} --</option>
            {availableItems.map(item => (
              <option key={item.id} value={item.id}>{item.part_number} ({item.model})</option>
            ))}
          </select>

          {selectedModel && availableItems.length === 0 && (
            <p className="text-xs text-rose-500 font-semibold italic">Tidak ada item terdaftar untuk model ini.</p>
          )}
        </div>

        {/* Selected Item Info Sheet */}
        {selectedItem && (
          <div className="ikea-card-yellow p-5 space-y-3 text-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-amber-950 uppercase tracking-wider block">Status Saat Ini</span>
                <h4 className="font-black text-slate-900 text-sm mt-0.5">{selectedItem.model}</h4>
                <span className="text-xs font-mono text-slate-600 font-bold block">{selectedItem.part_number}</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-amber-950 block tracking-wider uppercase">Stok Siap Kirim</span>
                <span className="font-mono font-black text-ikea-blue text-lg block mt-0.5">{selectedItemStock} pcs</span>
              </div>
            </div>

            {/* Step-by-step process visualization */}
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">Alur & Sisa WIP:</span>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {selectedItem.alur_proses.map((proc, index) => {
                  const val = selectedItemWIP[proc] || 0;
                  return (
                    <React.Fragment key={proc}>
                      {index > 0 && <ArrowRight className="h-3 w-3 text-slate-400" />}
                      <div className={`rounded-lg px-2 py-1 flex items-center gap-1.5 ${
                        val > 0 ? 'bg-ikea-yellow-light border-2 border-ikea-yellow text-slate-900 font-black shadow-sm' : 'bg-white border border-slate-200 text-slate-400'
                      }`}>
                        <span className="text-xs font-bold">{proc}</span>
                        <span className="text-xs font-mono font-extrabold px-1 rounded bg-white shadow-xs text-slate-700">{val}</span>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Pilih Jenis Aksi */}
        {selectedItem && (
          <div className="ikea-card p-5 space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              3. Tentukan Aksi Pencatatan
            </label>

            {/* 4 Action types button selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActionType('MASUK_FIRST')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between h-20 transition-all ${
                  actionType === 'MASUK_FIRST'
                    ? 'border-[#0058ab] bg-[#cceeff]/30 text-[#0058ab] ring-4 ring-[#0058ab]/10 font-bold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="text-xs font-bold block uppercase text-slate-400">Proses Pertama</span>
                <span className="text-xs font-bold flex items-center gap-1">
                  <Play className="h-3 w-3 text-[#0058ab] fill-[#0058ab]" />
                  Mulai Produksi ({firstProcess})
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActionType('TRANSFER');
                  // Set fromProcess to first process with WIP if possible, else first in list
                  const processWithWip = processFlow.find(p => (selectedItemWIP[p] || 0) > 0);
                  setFromProcess(processWithWip || firstProcess);
                }}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between h-20 transition-all ${
                  actionType === 'TRANSFER'
                    ? 'border-[#0058ab] bg-[#cceeff]/30 text-[#0058ab] ring-4 ring-[#0058ab]/10 font-bold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="text-xs font-bold block uppercase text-slate-400">Antar Proses</span>
                <span className="text-xs font-bold flex items-center gap-1">
                  <ArrowRight className="h-4 w-4 text-amber-500" />
                  Transfer WIP Selanjutnya
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActionType('KELUAR_LAST')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between h-20 transition-all ${
                  actionType === 'KELUAR_LAST'
                    ? 'border-[#0058ab] bg-[#cceeff]/30 text-[#0058ab] ring-4 ring-[#0058ab]/10 font-bold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="text-xs font-bold block uppercase text-slate-400">Proses Akhir</span>
                <span className="text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Selesai ke Gudang ({lastProcess})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActionType('DELIVERY')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between h-20 transition-all ${
                  actionType === 'DELIVERY'
                    ? 'border-[#0058ab] bg-[#cceeff]/30 text-[#0058ab] ring-4 ring-[#0058ab]/10 font-bold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="text-xs font-bold block uppercase text-slate-400">Distribusi</span>
                <span className="text-xs font-bold flex items-center gap-1">
                  <Truck className="h-4 w-4 text-blue-500" />
                  Kirim / Delivery
                </span>
              </button>
            </div>

            {/* Sub-form fields based on selected action type */}
            {actionType === 'MASUK_FIRST' && (
              <div className="bg-[#cceeff]/20 border border-blue-100 rounded-xl p-3 text-xs text-blue-900">
                <p className="font-semibold text-slate-700">Akan dicatat:</p>
                <p className="font-mono mt-1 text-[#0058ab] font-bold">MASUK ke proses pertama ➔ <span className="font-extrabold">{firstProcess}</span></p>
                <p className="text-slate-500 mt-1">Menginput jumlah material yang baru mulai dikerjakan hari ini.</p>
              </div>
            )}

            {actionType === 'TRANSFER' && (
              <div className="space-y-3">
                <div className="bg-amber-50/40 border border-amber-100 rounded-xl p-3 text-xs text-amber-900 space-y-2">
                  <p className="font-semibold text-slate-700">Akan memindahkan WIP:</p>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1">Dari Proses</label>
                      <select
                        value={fromProcess}
                        onChange={(e) => setFromProcess(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-bold text-slate-800"
                      >
                        {processFlow.slice(0, -1).map(proc => (
                          <option key={proc} value={proc}>{proc} (Ada: {selectedItemWIP[proc] || 0} pcs)</option>
                        ))}
                      </select>
                    </div>
                    
                    <ArrowRight className="h-4 w-4 text-slate-400 shrink-0 mt-3" />
                    
                    <div className="flex-1">
                      <label className="block text-slate-400 text-[10px] font-bold uppercase mb-1">Ke Proses</label>
                      <div className="w-full rounded-lg border border-slate-100 bg-slate-100 p-2 text-xs font-bold text-slate-600">
                        {nextProcess || '(Pilih proses asal)'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {actionType === 'KELUAR_LAST' && (
              <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-900">
                <p className="font-semibold text-slate-700">Akan dicatat:</p>
                <p className="font-mono mt-1 text-emerald-700">KELUAR dari proses terakhir ➔ <span className="font-extrabold">{lastProcess}</span></p>
                <p className="text-slate-500 mt-1">Mengeluarkan barang dari WIP Packing terakhir untuk langsung ditambahkan ke Stok Gudang.</p>
              </div>
            )}

            {actionType === 'DELIVERY' && (
              <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-3 text-xs text-blue-900">
                <p className="font-semibold text-slate-700">Akan dicatat:</p>
                <p className="font-mono mt-1 text-blue-700">DELIVERY ➔ Pengiriman barang keluar dari gudang.</p>
                <p className="text-slate-500 mt-1">Mengurangi jumlah Stok Gudang (saat ini tersedia: <span className="font-bold">{selectedItemStock} pcs</span>).</p>
              </div>
            )}

            {/* Inputs: Qty, Qty NG, Catatan */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Qty OK (Bagus)
                </label>
                <input
                  id="catat-qty-input"
                  type="number"
                  placeholder="Jumlah pcs"
                  value={qty || ''}
                  onChange={(e) => setQty(Math.max(0, parseInt(e.target.value) || 0))}
                  className="ikea-input text-sm font-bold text-slate-800"
                  required
                />
              </div>

              {actionType === 'TRANSFER' || actionType === 'KELUAR_LAST' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center justify-between">
                    <span>Qty NG (Reject)</span>
                    {qtyNg > 0 && <span className="text-[10px] font-extrabold text-rose-600 bg-rose-50 px-1 rounded">NG Terdeteksi</span>}
                  </label>
                  <input
                    id="catat-qty-ng-input"
                    type="number"
                    placeholder="Reject pcs"
                    value={qtyNg || ''}
                    onChange={(e) => setQtyNg(Math.max(0, parseInt(e.target.value) || 0))}
                    className={`ikea-input text-sm font-bold focus:outline-none ${
                      qtyNg > 0 
                        ? 'border-rose-500 bg-rose-50/30 text-rose-800 focus:border-rose-600 focus:ring-1 focus:ring-rose-500' 
                        : 'text-slate-800'
                    }`}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Qty NG (Tidak berlaku)
                  </label>
                  <div className="w-full rounded-xl border border-slate-100 bg-slate-100 p-3 text-sm text-slate-400 font-mono">
                    0 pcs
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Catatan / Keterangan (Opsional)
              </label>
              <input
                id="catat-catatan-input"
                type="text"
                placeholder="Contoh: Shift 1, Operator Agus, dll..."
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="ikea-input text-sm text-slate-800"
              />
            </div>

            <button
              id="catat-submit-button"
              type="submit"
              className="btn-ikea-primary w-full text-center text-sm active:scale-95 transition-all mt-2 cursor-pointer"
            >
              Simpan Transaksi Produksi
            </button>

          </div>
        )}

      </form>
    </div>
  );
}
