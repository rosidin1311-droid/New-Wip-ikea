import React, { useState, useEffect } from 'react';
import { AppData, Customer, Item } from '../types';
import { generateId, calculateItemWIP, calculateCurrentStock } from '../utils/calculations';
import * as XLSX from 'xlsx';
import { 
  Users, 
  Cpu, 
  Layers, 
  Plus, 
  Trash2, 
  Edit2,
  ToggleLeft, 
  ToggleRight, 
  FolderPlus, 
  Database,
  Check,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Copy,
  ArrowRight,
  RefreshCw,
  Share2
} from 'lucide-react';

interface MasterDataViewProps {
  appData: AppData;
  onAddCustomer: (nama: string) => void;
  onToggleCustomer: (id: string) => void;
  onAddProcess: (name: string) => void;
  onDeleteProcess: (name: string) => void;
  onAddItem: (item: Item) => void;
  onUpdateItem: (item: Item) => void;
  onDeleteItem: (id: string) => void;
  onImportJSON: (jsonString: string) => boolean;
  onResetToBackup: () => void;
  onCopyWA: (text: string) => void;
}

type SubTab = 'customers' | 'processes' | 'items' | 'backup';

export default function MasterDataView({
  appData,
  onAddCustomer,
  onToggleCustomer,
  onAddProcess,
  onDeleteProcess,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onImportJSON,
  onResetToBackup,
  onCopyWA
}: MasterDataViewProps) {
  const { customers, items, forecasts, transactions, available_proses } = appData;
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('customers');

  // Customer states
  const [newCustomerName, setNewCustomerName] = useState('');
  const [customerSuccess, setCustomerSuccess] = useState(false);

  // Process states
  const [newProcessName, setNewProcessName] = useState('');
  const [processSuccess, setProcessSuccess] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);

  // Item/Model states
  const [itemModel, setItemModel] = useState('');
  const [itemPartNumber, setItemPartNumber] = useState('');
  const [itemCustomerId, setItemCustomerId] = useState('');
  const [itemStokReady, setItemStokReady] = useState<number>(0);
  const [itemAlurProses, setItemAlurProses] = useState<string[]>([]);
  const [itemSuccess, setItemSuccess] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);

  // Edit & Duplicate states
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [modelSelectionMode, setModelSelectionMode] = useState<'select' | 'input'>('select');

  // Compute existing models for selected customer
  const existingModelsForCustomer = itemCustomerId
    ? Array.from(new Set(items.filter(i => i.customer_id === itemCustomerId).map(i => i.model))).sort()
    : [];

  // Update selection mode dynamically when customer changes
  useEffect(() => {
    if (existingModelsForCustomer.length > 0) {
      // If we are starting an edit, we can stay in input mode
      if (!editingItem) {
        setModelSelectionMode('select');
      }
    } else {
      setModelSelectionMode('input');
    }
  }, [itemCustomerId, existingModelsForCustomer.length, editingItem]);

  // Backup restore states
  const [jsonInput, setJsonInput] = useState('');
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter & Search inside Master lists
  const [customerSearch, setCustomerSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');

  // 1. Submit Customer
  const handleCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;
    onAddCustomer(newCustomerName.trim().toUpperCase());
    setNewCustomerName('');
    setCustomerSuccess(true);
    setTimeout(() => setCustomerSuccess(false), 3000);
  };

  // 2. Submit Process
  const handleProcessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newProcessName.trim().toUpperCase();
    if (!name) return;
    if (available_proses.includes(name)) {
      setProcessError('Nama tahapan proses sudah terdaftar!');
      setTimeout(() => setProcessError(null), 3000);
      return;
    }
    onAddProcess(name);
    setNewProcessName('');
    setProcessSuccess(true);
    setTimeout(() => setProcessSuccess(false), 3000);
  };

  // 3. Submit Item / Model
  const handleItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemModel.trim() || !itemPartNumber.trim() || !itemCustomerId) {
      setItemError('Harap lengkapi semua field!');
      setTimeout(() => setItemError(null), 3000);
      return;
    }
    if (itemAlurProses.length === 0) {
      setItemError('Harap tentukan minimal satu alur proses!');
      setTimeout(() => setItemError(null), 3000);
      return;
    }

    if (editingItem) {
      const updatedItem: Item = {
        id: editingItem.id,
        customer_id: itemCustomerId,
        model: itemModel.trim().toUpperCase(),
        part_number: itemPartNumber.trim().toUpperCase(),
        alur_proses: itemAlurProses,
        stok_ready: itemStokReady
      };
      onUpdateItem(updatedItem);
      setEditingItem(null);
      setItemSuccess(true);
      setTimeout(() => setItemSuccess(false), 3000);
    } else {
      const newItem: Item = {
        id: generateId('i'),
        customer_id: itemCustomerId,
        model: itemModel.trim().toUpperCase(),
        part_number: itemPartNumber.trim().toUpperCase(),
        alur_proses: itemAlurProses,
        stok_ready: itemStokReady
      };
      onAddItem(newItem);
      setItemSuccess(true);
      setTimeout(() => setItemSuccess(false), 3000);
    }
    
    // Reset states
    setItemModel('');
    setItemPartNumber('');
    setItemStokReady(0);
    setItemAlurProses([]);
  };

  // Helper: start editing an item
  const handleStartEdit = (item: Item) => {
    setEditingItem(item);
    setItemCustomerId(item.customer_id);
    setItemModel(item.model);
    setItemPartNumber(item.part_number);
    setItemStokReady(item.stok_ready);
    setItemAlurProses(item.alur_proses);
    setModelSelectionMode('input'); // Default to manual input for editing so they can refine it directly

    // Scroll smoothly to form
    const container = document.getElementById('add-item-form-container');
    if (container) {
      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Helper: duplicate an item
  const handleDuplicateItem = (item: Item) => {
    setEditingItem(null); // Clear editing when duplicating
    setItemCustomerId(item.customer_id);
    setItemModel(item.model);
    setItemPartNumber(`${item.part_number}-COPY`);
    setItemStokReady(item.stok_ready);
    setItemAlurProses(item.alur_proses);
    setModelSelectionMode('input'); // Default to manual input for copying so they can customize

    alert(`Model "${item.model}" disalin ke form pendaftaran di atas. Silakan ubah Part Number dan simpan sebagai produk baru.`);

    // Scroll smoothly to form
    const container = document.getElementById('add-item-form-container');
    if (container) {
      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Helper: cancel editing
  const handleCancelEdit = () => {
    setEditingItem(null);
    setItemCustomerId('');
    setItemModel('');
    setItemPartNumber('');
    setItemStokReady(0);
    setItemAlurProses([]);
  };

  // Toggle process in item building selection
  const handleToggleProcessInFlow = (proc: string) => {
    if (itemAlurProses.includes(proc)) {
      setItemAlurProses(itemAlurProses.filter(p => p !== proc));
    } else {
      setItemAlurProses([...itemAlurProses, proc]);
    }
  };

  // 4. Submit JSON restore
  const handleJsonRestoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setImportStatus(null);
    if (!jsonInput.trim()) return;

    const success = onImportJSON(jsonInput);
    if (success) {
      setImportStatus({ type: 'success', text: 'Database JSON berhasil dipulihkan!' });
      setJsonInput('');
    } else {
      setImportStatus({ type: 'error', text: 'Gagal! Format JSON salah atau tidak sesuai skema.' });
    }
  };

  // Filter lists
  const filteredCustomers = customers.filter(c => 
    c.nama.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const filteredItems = items.filter(item => {
    const custName = customers.find(c => c.id === item.customer_id)?.nama || '';
    return item.model.toLowerCase().includes(itemSearch.toLowerCase()) || 
           item.part_number.toLowerCase().includes(itemSearch.toLowerCase()) ||
           custName.toLowerCase().includes(itemSearch.toLowerCase());
  });

  return (
    <div className="space-y-6">
      
      {/* Title Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-ikea-yellow text-slate-900 p-3 shadow-md font-black flex items-center justify-center border-2 border-ikea-blue">
          <Database className="h-6 w-6 text-ikea-blue" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight">CONTROL CENTER MASTER DATA</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Kelola Entitas & Alur Produksi</p>
        </div>
      </div>

      {/* Modern Horizontal Segmented Tabs inside Master View */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100/80 rounded-2xl border border-slate-200">
        <button
          onClick={() => setActiveSubTab('customers')}
          className={`flex flex-col items-center justify-center py-2.5 rounded-xl text-[10px] font-extrabold uppercase transition-all ${
            activeSubTab === 'customers'
              ? 'bg-ikea-blue text-white shadow-md'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="h-4 w-4 mb-1" />
          <span>Customer</span>
        </button>

        <button
          onClick={() => setActiveSubTab('processes')}
          className={`flex flex-col items-center justify-center py-2.5 rounded-xl text-[10px] font-extrabold uppercase transition-all ${
            activeSubTab === 'processes'
              ? 'bg-ikea-blue text-white shadow-md'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Cpu className="h-4 w-4 mb-1" />
          <span>Proses</span>
        </button>

        <button
          onClick={() => setActiveSubTab('items')}
          className={`flex flex-col items-center justify-center py-2.5 rounded-xl text-[10px] font-extrabold uppercase transition-all ${
            activeSubTab === 'items'
              ? 'bg-ikea-blue text-white shadow-md'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="h-4 w-4 mb-1" />
          <span>Barang</span>
        </button>

        <button
          onClick={() => setActiveSubTab('backup')}
          className={`flex flex-col items-center justify-center py-2.5 rounded-xl text-[10px] font-extrabold uppercase transition-all ${
            activeSubTab === 'backup'
              ? 'bg-ikea-blue text-white shadow-md'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FolderPlus className="h-4 w-4 mb-1" />
          <span>Backup</span>
        </button>
      </div>

      {/* Subtab Contents */}
      
      {/* 1. CUSTOMERS SUBTAB */}
      {activeSubTab === 'customers' && (
        <div className="space-y-5">
          {/* Add Customer Form */}
          <div className="ikea-card p-5 space-y-4">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-50 pb-2 flex items-center gap-2">
              <Plus className="h-4 w-4 text-ikea-blue" />
              <span>TAMBAH PELANGGAN BARU (CUSTOMER)</span>
            </h3>

            <form onSubmit={handleCustomerSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Nama Perusahaan / Client</label>
                <input
                  type="text"
                  placeholder="Contoh: PT IKEA INDONESIA"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="ikea-input"
                  required
                />
              </div>

              {customerSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  <span>Customer baru berhasil ditambahkan!</span>
                </div>
              )}

              <button type="submit" className="btn-ikea-primary w-full text-xs">
                <Plus className="h-4 w-4" />
                <span>Simpan Pelanggan</span>
              </button>
            </form>
          </div>

          {/* List of Customers */}
          <div className="ikea-card p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-50 pb-2.5">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Daftar Pelanggan Aktif</h3>
              <span className="badge-ikea-blue text-[10px] px-2.5 py-1 rounded-full">{customers.length} Total</span>
            </div>

            <input
              type="text"
              placeholder="Cari pelanggan..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="ikea-input text-xs"
            />

            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto pr-1">
              {filteredCustomers.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-400">Tidak ada pelanggan ditemukan.</p>
              ) : (
                filteredCustomers.map(cust => (
                  <div key={cust.id} className="py-3 flex items-center justify-between">
                    <div>
                      {/* BOLD CLEAR MODERN CUSTOMER FONT AS REQUESTED */}
                      <span className="font-sans font-black uppercase text-sm text-slate-900 tracking-wider block">
                        {cust.nama}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 font-bold block mt-0.5">{cust.id}</span>
                    </div>
                    <button
                      onClick={() => onToggleCustomer(cust.id)}
                      className="p-1 hover:bg-slate-50 rounded-lg transition-colors"
                      title={cust.status ? "Nonaktifkan" : "Aktifkan"}
                    >
                      {cust.status ? (
                        <div className="flex items-center gap-1 text-emerald-600">
                          <span className="text-[10px] font-bold">Aktif</span>
                          <ToggleRight className="h-6 w-6" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-400">
                          <span className="text-[10px] font-bold">Nonaktif</span>
                          <ToggleLeft className="h-6 w-6" />
                        </div>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. PROCESSES SUBTAB */}
      {activeSubTab === 'processes' && (
        <div className="space-y-5">
          {/* Add Process Form */}
          <div className="ikea-card p-5 space-y-4">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-50 pb-2 flex items-center gap-2">
              <Plus className="h-4 w-4 text-ikea-blue" />
              <span>TAMBAH TAHAPAN PROSES BARU</span>
            </h3>

            <form onSubmit={handleProcessSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Nama Singkat Proses</label>
                <input
                  type="text"
                  placeholder="Contoh: DIECUT, LEM, HEAVY BANDING"
                  value={newProcessName}
                  onChange={(e) => setNewProcessName(e.target.value)}
                  className="ikea-input"
                  required
                />
                <p className="text-[10px] text-slate-400 font-semibold mt-1.5">Proses ini akan tersedia untuk diatur pada alur proses barang.</p>
              </div>

              {processSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  <span>Tahapan proses baru ditambahkan!</span>
                </div>
              )}

              {processError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{processError}</span>
                </div>
              )}

              <button type="submit" className="btn-ikea-primary w-full text-xs">
                <Plus className="h-4 w-4" />
                <span>Simpan Proses</span>
              </button>
            </form>
          </div>

          {/* List of Processes */}
          <div className="ikea-card p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-50 pb-2.5">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Daftar Tahapan Proses Tersedia</h3>
              <span className="badge-ikea-blue text-[10px] px-2.5 py-1 rounded-full">{available_proses.length} Proses</span>
            </div>

            <p className="text-[11px] text-slate-500 leading-normal font-medium">Klik tombol hapus untuk membuang proses. Catatan: proses bawaan database tidak disarankan untuk dihapus jika sedang aktif digunakan produk.</p>

            <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {available_proses.map(proc => (
                <div key={proc} className="p-3 rounded-xl border-2 border-ikea-blue-light bg-slate-50/50 flex justify-between items-center">
                  <span className="text-xs font-extrabold text-slate-800">{proc}</span>
                  <button
                    onClick={() => {
                      if (confirm(`Apakah Anda yakin ingin menghapus proses "${proc}"?`)) {
                        onDeleteProcess(proc);
                      }
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. ITEMS SUBTAB */}
      {activeSubTab === 'items' && (
        <div className="space-y-5">
          {/* Add Item Form */}
          <div id="add-item-form-container" className="ikea-card p-5 space-y-4">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-50 pb-2 flex items-center gap-2">
              {editingItem ? (
                <>
                  <Edit2 className="h-4 w-4 text-amber-600" />
                  <span className="text-amber-600">EDIT MODEL / ITEM: {editingItem.model}</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 text-ikea-blue" />
                  <span>TAMBAH MODEL / ITEM BARANG BARU</span>
                </>
              )}
            </h3>

            <form onSubmit={handleItemSubmit} className="space-y-4">
              
              {/* Select Customer */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Pilih Customer</label>
                <select
                  value={itemCustomerId}
                  onChange={(e) => {
                    setItemCustomerId(e.target.value);
                    if (!editingItem) {
                      setItemModel('');
                    }
                  }}
                  className="w-full rounded-xl border-2 border-ikea-blue-light bg-slate-50 p-3 text-sm text-slate-800 focus:border-ikea-blue focus:bg-white focus:outline-none"
                  required
                >
                  <option value="">-- Pilih Customer Pemilik --</option>
                  {customers.filter(c => c.status).map(c => (
                    <option key={c.id} value={c.id}>{c.nama}</option>
                  ))}
                </select>
              </div>

              {/* Model Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Model / Nama</label>
                    {existingModelsForCustomer.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setModelSelectionMode(modelSelectionMode === 'select' ? 'input' : 'select')}
                        className="text-[10px] font-black text-ikea-blue uppercase tracking-wider hover:underline"
                      >
                        {modelSelectionMode === 'select' ? '✍️ Tulis Manual' : '📋 Pilih Dropdown'}
                      </button>
                    )}
                  </div>

                  {modelSelectionMode === 'select' && existingModelsForCustomer.length > 0 ? (
                    <select
                      value={itemModel}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__NEW__') {
                          setModelSelectionMode('input');
                          setItemModel('');
                        } else {
                          setItemModel(val);
                        }
                      }}
                      className="w-full rounded-xl border-2 border-ikea-blue-light bg-slate-50 p-3 text-sm text-slate-800 focus:border-ikea-blue focus:bg-white focus:outline-none"
                      required
                    >
                      <option value="">-- Pilih Model --</option>
                      {existingModelsForCustomer.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                      <option value="__NEW__" className="text-ikea-blue font-black">[+] TULIS MODEL BARU (MANUAL)</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Contoh: CONS BOX, C/T"
                      value={itemModel}
                      onChange={(e) => setItemModel(e.target.value)}
                      className="ikea-input"
                      required
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Part Number / Size</label>
                  <input
                    type="text"
                    placeholder="Contoh: 1200*800*45"
                    value={itemPartNumber}
                    onChange={(e) => setItemPartNumber(e.target.value)}
                    className="ikea-input"
                    required
                  />
                </div>
              </div>

              {/* Baseline Stock */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Baseline Stok Gudang (Pcs)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={itemStokReady || ''}
                  onChange={(e) => setItemStokReady(Math.max(0, parseInt(e.target.value) || 0))}
                  className="ikea-input"
                />
                <p className="text-[10px] text-slate-400 font-medium mt-1">Stok awal barang siap kirim saat pendaftaran database.</p>
              </div>

              {/* Alur Proses Builder */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Tentukan Alur Proses Sequence (Klik Berurutan):
                </label>
                
                {/* Available Badges */}
                <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 border border-slate-100 rounded-xl mb-2.5">
                  {available_proses.map(proc => {
                    const idx = itemAlurProses.indexOf(proc);
                    const isSelected = idx !== -1;
                    return (
                      <button
                        key={proc}
                        type="button"
                        onClick={() => handleToggleProcessInFlow(proc)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-bold border transition-all ${
                          isSelected
                            ? 'bg-ikea-blue text-white border-ikea-blue-dark scale-95 shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {proc} {isSelected && <span className="ml-1 bg-white text-ikea-blue rounded-full px-1.5 text-[10px] font-black">{idx + 1}</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Current Selected Flow Visual */}
                <div className="p-3 bg-ikea-blue-light/20 border border-ikea-blue-light rounded-xl space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Visual Alur Sequence:</span>
                  {itemAlurProses.length === 0 ? (
                    <span className="text-xs text-slate-400 italic block">Belum ada alur dipilih</span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {itemAlurProses.map((proc, index) => (
                        <React.Fragment key={proc}>
                          {index > 0 && <ArrowRight className="h-3 w-3 text-slate-400" />}
                          <span className="text-xs font-black text-ikea-blue bg-white border border-ikea-blue/10 px-2 py-0.5 rounded shadow-2xs">
                            {proc}
                          </span>
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {itemSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  <span>Model/Item baru berhasil disimpan!</span>
                </div>
              )}

              {itemError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{itemError}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button type="submit" className={`flex-grow flex items-center justify-center gap-2 p-3 text-xs font-black text-white rounded-xl cursor-pointer transition-all ${editingItem ? 'bg-amber-600 hover:bg-amber-700' : 'bg-ikea-blue hover:bg-ikea-blue-dark'}`}>
                  {editingItem ? <Edit2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  <span>{editingItem ? 'Simpan Perubahan' : 'Simpan Model Barang'}</span>
                </button>
                {editingItem && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-black rounded-xl transition-all"
                  >
                    Batal
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* List of Items */}
          <div className="ikea-card p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-50 pb-2.5">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Daftar Produk Terdaftar</h3>
              <span className="badge-ikea-blue text-[10px] px-2.5 py-1 rounded-full">{items.length} Total</span>
            </div>

            <input
              type="text"
              placeholder="Cari model, part number, pelanggan..."
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              className="ikea-input text-xs"
            />

            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
              {filteredItems.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-400">Tidak ada produk ditemukan.</p>
              ) : (
                filteredItems.map(item => {
                  const cust = customers.find(c => c.id === item.customer_id);
                  return (
                    <div key={item.id} className="py-3.5 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          {/* BOLD CLEAR CUSTOMER TYPOGRAPHY */}
                          <span className="font-sans font-black uppercase text-xs text-slate-900 tracking-wider block">
                            {cust?.nama || 'CUSTOMER ASING'}
                          </span>
                          <h4 className="font-extrabold text-sm text-ikea-blue mt-0.5">{item.model}</h4>
                          <span className="text-xs font-mono text-slate-500 font-bold block">{item.part_number}</span>
                        </div>
                        
                        <div className="flex items-center gap-0.5">
                          {/* DUPLICATE BUTTON */}
                          <button
                            onClick={() => handleDuplicateItem(item)}
                            className="p-1.5 text-slate-400 hover:text-ikea-blue hover:bg-slate-100 rounded-lg transition-colors"
                            title="Duplikat Model Barang"
                          >
                            <Copy className="h-4 w-4" />
                          </button>

                          {/* EDIT BUTTON */}
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Model Barang"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          {/* DELETE BUTTON */}
                          <button
                            onClick={() => {
                              if (confirm(`Apakah Anda yakin ingin menghapus barang "${item.model} (${item.part_number})"? Semua data transaksi terkait tidak akan hilang tapi tidak terindeks.`)) {
                                onDeleteItem(item.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus Barang"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Display process sequence as visual capsules */}
                      <div className="flex flex-wrap items-center gap-1">
                        {item.alur_proses.map((p, idx) => (
                          <React.Fragment key={p}>
                            {idx > 0 && <span className="text-[10px] text-slate-300 font-bold">→</span>}
                            <span className="text-[10px] font-bold bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-slate-600">
                              {p}
                            </span>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. BACKUP & EXCEL SUBTAB */}
      {activeSubTab === 'backup' && (
        <div className="space-y-5">
          {/* Quick Excel Download Info */}
          <div className="ikea-card-yellow p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-ikea-blue p-2.5 text-white shrink-0 shadow-sm">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-950 text-sm">Download Excel Laporan Lengkap</h3>
                <p className="text-xs text-slate-700 mt-0.5 font-medium">
                  Menghasilkan dokumen Excel (.xlsx) rapi dengan 3 sheet terpisah: Status WIP, Gudang, dan Transaksi.
                </p>
              </div>
            </div>

            <button
              id="btn-download-excel"
              onClick={() => {
                try {
                  const wb = XLSX.utils.book_new();

                  // --- SHEET 1: LAPORAN WIP AKTUAL ---
                  const wipRows = items.map(item => {
                    const customer = customers.find(c => c.id === item.customer_id)?.nama || 'Pelanggan';
                    const wip = calculateItemWIP(item, transactions);
                    const totalWip = Object.values(wip).reduce((a, b) => a + b, 0);

                    // Build columns
                    const row: any = {
                      'Nama Pelanggan': customer,
                      'Model Produk': item.model,
                      'Part Number': item.part_number,
                      'Total WIP (pcs)': totalWip
                    };

                    // Add each process station to columns
                    available_proses.forEach(proc => {
                      row[proc] = wip[proc] || 0;
                    });

                    return row;
                  });
                  const wsWIP = XLSX.utils.json_to_sheet(wipRows);
                  XLSX.utils.book_append_sheet(wb, wsWIP, 'Laporan WIP Aktual');

                  // --- SHEET 2: STOK GUDANG & FORECAST ---
                  const stockRows = items.map(item => {
                    const customer = customers.find(c => c.id === item.customer_id)?.nama || 'Pelanggan';
                    const stock = calculateCurrentStock(item, transactions);
                    const activeForecasts = forecasts.filter(f => f.item_id === item.id && f.status === 'ACTIVE');
                    const totalDemand = activeForecasts.reduce((sum, f) => sum + f.qty, 0);
                    const isDeficit = stock < totalDemand;
                    const deficitQty = isDeficit ? totalDemand - stock : 0;

                    return {
                      'Nama Pelanggan': customer,
                      'Model Produk': item.model,
                      'Part Number': item.part_number,
                      'Stok Siap Kirim (FG)': stock,
                      'Forecast Aktif': totalDemand,
                      'Kurang Produksi (Defisit)': deficitQty,
                      'Status': isDeficit ? 'KURANG PRODUKSI' : 'STOK AMAN'
                    };
                  });
                  const wsStock = XLSX.utils.json_to_sheet(stockRows);
                  XLSX.utils.book_append_sheet(wb, wsStock, 'Stok & Forecast');

                  // --- SHEET 3: LEDGER HISTORI TRANSAKSI ---
                  const sortedTxs = [...transactions].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                  const txRows = sortedTxs.map(tx => {
                    const item = items.find(i => i.id === tx.item_id);
                    const customer = item ? (customers.find(c => c.id === item.customer_id)?.nama || 'Pelanggan') : 'Unknown';
                    
                    return {
                      'ID Transaksi': tx.id,
                      'Waktu Input': new Date(tx.timestamp).toLocaleString('id-ID'),
                      'Nama Pelanggan': customer,
                      'Model': item?.model || 'Unknown',
                      'Part Number': item?.part_number || 'Unknown',
                      'Stasiun Proses': tx.proses,
                      'Jenis Aksi': tx.aksi,
                      'Quantity Bagus (OK)': tx.qty,
                      'Quantity Reject (NG)': tx.qty_ng || 0,
                      'Keterangan / Catatan': tx.catatan || '-'
                    };
                  });
                  const wsTxs = XLSX.utils.json_to_sheet(txRows);
                  XLSX.utils.book_append_sheet(wb, wsTxs, 'Log Transaksi Lengkap');

                  // Download file to client browser
                  XLSX.writeFile(wb, `Laporan_Produksi_IKEA_${new Date().toISOString().split('T')[0]}.xlsx`);
                } catch (err: any) {
                  alert(`Gagal membuat Excel: ${err.message}`);
                }
              }}
              className="btn-ikea-primary w-full text-xs cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Unduh Excel (.xlsx) Sekarang</span>
            </button>
          </div>

          {/* WhatsApp Quick Templates */}
          <div className="ikea-card p-5 space-y-3">
            <div className="flex items-center gap-1.5 border-b border-slate-50 pb-2.5">
              <Share2 className="h-4 w-4 text-ikea-blue" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Format WA Cepat Hari Ini</h2>
            </div>

            <p className="text-[11px] text-slate-500 leading-normal font-medium">
              Berikut template laporan ringkas yang bisa disalin dan langsung dipaste di WhatsApp group koordinasi:
            </p>

            <div className="grid grid-cols-1 gap-2.5 pt-1">
              <button
                onClick={() => {
                  let text = `*LOG AKTIVITAS PRODUKSI HARI INI*\n`;
                  text += `Tanggal: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}\n`;
                  text += `=========================\n\n`;
                  
                  // Filter today's transactions
                  const todayStr = new Date().toISOString().split('T')[0];
                  const todayTxs = appData.transactions.filter(tx => tx.timestamp.startsWith(todayStr));
                  
                  if (todayTxs.length === 0) {
                    text += `Belum ada aktivitas produksi dicatat hari ini.`;
                  } else {
                    todayTxs.forEach((tx, idx) => {
                      const item = appData.items.find(i => i.id === tx.item_id);
                      const cust = appData.customers.find(c => c.id === item?.customer_id);
                      text += `${idx + 1}. *[${cust?.nama || 'CLIENT'}]* ${item?.model || 'ITEM'}\n`;
                      text += `   ↳ ${tx.proses} [${tx.aksi}] - Qty: ${tx.qty} pcs`;
                      if (tx.qty_ng && tx.qty_ng > 0) text += ` (NG: ${tx.qty_ng} pcs)`;
                      if (tx.catatan) text += `\n   Note: "${tx.catatan}"`;
                      text += `\n\n`;
                    });
                  }
                  onCopyWA(text);
                }}
                className="flex items-center justify-between p-3 rounded-xl border-2 border-ikea-blue-light text-left bg-slate-50/50 hover:bg-slate-50 transition-colors text-xs cursor-pointer"
              >
                <div>
                  <span className="font-bold text-slate-800 block">Log Aktivitas Hari Ini</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Summary transaksi MASUK/KELUAR hari ini</span>
                </div>
                <Copy className="h-4 w-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* DB JSON Backup and Restore */}
          <div className="ikea-card p-5 space-y-4">
            <div className="flex items-center gap-1.5 border-b border-slate-50 pb-2.5">
              <Database className="h-4 w-4 text-ikea-blue" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Backup & Pemulihan Database (JSON)</h2>
            </div>

            <p className="text-[11px] text-slate-500 leading-normal font-medium">
              Aplikasi PWA ini menyimpan data di browser Anda. Untuk mengamankan data Anda agar tidak hilang, disarankan menyalin data mentah JSON ini secara berkala.
            </p>

            <div className="flex gap-2.5">
              <button
                onClick={() => {
                  onCopyWA(JSON.stringify(appData, null, 2));
                }}
                className="flex-1 rounded-xl border-2 border-ikea-blue-light bg-slate-50 p-3 text-center text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy className="h-4 w-4 text-slate-400" />
                <span>Salin Seluruh Data</span>
              </button>

              <button
                onClick={() => {
                  if (confirm('Apakah Anda yakin ingin menyetel ulang seluruh database ke data demo awal? Semua transaksi saat ini akan hilang!')) {
                    onResetToBackup();
                  }
                }}
                className="flex-1 rounded-xl border-2 border-red-200 bg-red-50 p-3 text-center text-xs font-bold text-red-700 hover:bg-red-100 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Database className="h-4 w-4 text-red-500" />
                <span>Setel Ulang Awal</span>
              </button>
            </div>

            {/* Input Form for Restoring Backup JSON */}
            <form onSubmit={handleJsonRestoreSubmit} className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                Tempel & Pulihkan Data dari JSON:
              </label>
              
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='Tempel (paste) kode backup data Anda di sini, lalu klik Puluhkan Data...'
                rows={4}
                className="ikea-input text-xs font-mono text-slate-700"
              />

              {importStatus && (
                <div className={`p-3 text-xs rounded-xl flex items-center gap-2 ${
                  importStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {importStatus.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  <span>{importStatus.text}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn-ikea-primary w-full text-xs"
              >
                Puluhkan Database Sekarang
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
