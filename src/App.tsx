/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppData, Transaction, Item } from './types';
import { initialData } from './data/initialData';
import BottomNav from './components/BottomNav';
import DashboardView from './components/DashboardView';
import CatatView from './components/CatatView';
import LaporanWipView from './components/LaporanWipView';
import StokView from './components/StokView';
import MasterDataView from './components/MasterDataView';
import { Check } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'ikea_production_data';

export default function App() {
  const [appData, setAppData] = useState<AppData>(initialData);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  // WIP transition pre-fills
  const [selectedItemIdFromWIP, setSelectedItemIdFromWIP] = useState<string>('');
  const [selectedProsesFromWIP, setSelectedProsesFromWIP] = useState<string>('');

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initialize and load from LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Basic schema validation
        if (parsed.items && parsed.transactions && parsed.customers) {
          setAppData(parsed);
        } else {
          // If corrupted, fallback to initialData
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialData));
          setAppData(initialData);
        }
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialData));
        setAppData(initialData);
      }
    } catch (err) {
      console.error('Error loading data from localStorage:', err);
      setAppData(initialData);
    }
  }, []);

  // Save changes helper
  const saveToStorage = (updated: AppData) => {
    setAppData(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save to localStorage:', err);
    }
  };

  // --- MASTER STATE HELPERS ---

  // Add new Customer
  const handleAddCustomer = (nama: string) => {
    const newCust = {
      id: `c-${Date.now()}`,
      nama,
      status: true
    };
    const updated: AppData = {
      ...appData,
      customers: [...appData.customers, newCust]
    };
    saveToStorage(updated);
  };

  // Toggle Customer status
  const handleToggleCustomer = (id: string) => {
    const updated: AppData = {
      ...appData,
      customers: appData.customers.map(c => c.id === id ? { ...c, status: !c.status } : c)
    };
    saveToStorage(updated);
  };

  // Add Process
  const handleAddProcess = (name: string) => {
    const updated: AppData = {
      ...appData,
      available_proses: [...appData.available_proses, name]
    };
    saveToStorage(updated);
  };

  // Delete Process
  const handleDeleteProcess = (name: string) => {
    const updated: AppData = {
      ...appData,
      available_proses: appData.available_proses.filter(p => p !== name)
    };
    saveToStorage(updated);
  };

  // Add Item / Model
  const handleAddItem = (newItem: Item) => {
    const updated: AppData = {
      ...appData,
      items: [...appData.items, newItem]
    };
    saveToStorage(updated);
  };

  // Update existing Item / Model
  const handleUpdateItem = (updatedItem: Item) => {
    const updated: AppData = {
      ...appData,
      items: appData.items.map(item => item.id === updatedItem.id ? updatedItem : item)
    };
    saveToStorage(updated);
  };

  // Delete Item
  const handleDeleteItem = (id: string) => {
    const updated: AppData = {
      ...appData,
      items: appData.items.filter(i => i.id !== id)
    };
    saveToStorage(updated);
  };

  // 1. ADD NEW TRANSACTIONS (e.g., input or automated transition pairs)
  const handleAddTransactions = (newTxs: Transaction[]) => {
    const updated: AppData = {
      ...appData,
      timestamp: new Date().toISOString(),
      transactions: [...appData.transactions, ...newTxs]
    };
    saveToStorage(updated);
    
    // If coming from pre-fill flow, clear them out
    setSelectedItemIdFromWIP('');
    setSelectedProsesFromWIP('');
  };

  // 2. DELETE TRANSACTION (Hapus)
  const handleDeleteTransaction = (id: string) => {
    const updated: AppData = {
      ...appData,
      timestamp: new Date().toISOString(),
      transactions: appData.transactions.filter(tx => tx.id !== id)
    };
    saveToStorage(updated);
    showToast('Transaksi berhasil dihapus!');
  };

  // 3. EDIT/UPDATE TRANSACTION (Ubah/Edit)
  const handleUpdateTransaction = (updatedTx: Transaction) => {
    const updated: AppData = {
      ...appData,
      timestamp: new Date().toISOString(),
      transactions: appData.transactions.map(tx => tx.id === updatedTx.id ? updatedTx : tx)
    };
    saveToStorage(updated);
    showToast('Transaksi berhasil diperbarui!');
  };

  // 4. RESET TO ORIGINAL BACKUP JSON
  const handleResetToBackup = () => {
    saveToStorage(initialData);
    showToast('Database berhasil diset ulang ke data backup!');
  };

  // 5. IMPORT RAW JSON STRING
  const handleImportJSON = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      // Validate structural integrity
      if (
        Array.isArray(parsed.customers) &&
        Array.isArray(parsed.items) &&
        Array.isArray(parsed.transactions) &&
        Array.isArray(parsed.forecasts)
      ) {
        const restored: AppData = {
          version: parsed.version || '1.0',
          timestamp: new Date().toISOString(),
          customers: parsed.customers,
          items: parsed.items,
          forecasts: parsed.forecasts,
          transactions: parsed.transactions,
          available_proses: parsed.available_proses || appData.available_proses
        };
        saveToStorage(restored);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Bulletproof copy-to-clipboard for WhatsApp sharing inside Sandbox iFrame
  const handleCopyWA = (text: string) => {
    let success = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
        success = true;
      }
    } catch (err) {
      console.warn('Navigator clipboard API failed, using fallback:', err);
    }

    if (!success) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed'; // Avoid scrolling view
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        success = document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch (err) {
        console.error('Fallback copy method failed:', err);
      }
    }

    if (success) {
      showToast('Laporan disalin! Silakan tempel (paste) di WhatsApp.');
    } else {
      showToast('Gagal menyalin otomatis. Silakan coba lagi.');
    }
  };

  // Trigger temporary toast notifications
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Quick transition router from WIP dashboard
  const handleQuickWIPTransfer = (itemId: string, proses: string) => {
    setSelectedItemIdFromWIP(itemId);
    setSelectedProsesFromWIP(proses);
    setActiveTab('catat'); // Switch directly to rapid entry tab
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-24 antialiased gradient-bg">
      
      {/* Top Brand Banner */}
      <header className="sticky top-0 gradient-ikea-blue py-3 px-4 z-10 shadow-lg border-b-2 border-ikea-yellow max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="/ikea_wip_logo.jpg"
            alt="IKEA WIP Logo"
            className="h-11 w-11 rounded-xl object-cover border-2 border-ikea-yellow shadow-md"
            referrerPolicy="no-referrer"
          />
          <div>
            <h1 className="text-base font-black text-white tracking-wider uppercase">IKEA PRODUCTION</h1>
            <span className="text-[10px] font-bold text-blue-200 tracking-widest uppercase block -mt-0.5">Real-time PWA Monitoring</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-900 bg-[#ffd100] border border-yellow-300 rounded-full px-3 py-1.5 shadow-sm active:scale-95 transition-all">
          <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse"></span>
          <span>Online PWA</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-md mx-auto px-4 pt-5">
        
        {/* Dynamic App Tab Routing Views */}
        {activeTab === 'dashboard' && (
          <DashboardView 
            appData={appData}
            onDeleteTransaction={handleDeleteTransaction}
            onUpdateTransaction={handleUpdateTransaction}
            onResetToBackup={handleResetToBackup}
          />
        )}

        {activeTab === 'catat' && (
          <CatatView 
            appData={appData}
            onAddTransactions={handleAddTransactions}
            selectedItemIdFromWIP={selectedItemIdFromWIP}
            selectedProsesFromWIP={selectedProsesFromWIP}
          />
        )}

        {activeTab === 'wip' && (
          <LaporanWipView 
            appData={appData}
            onNavigateToCatat={handleQuickWIPTransfer}
            onCopyWA={handleCopyWA}
          />
        )}

        {activeTab === 'stok' && (
          <StokView 
            appData={appData}
            onAddTransactions={handleAddTransactions}
            onCopyWA={handleCopyWA}
          />
        )}

        {activeTab === 'master' && (
          <MasterDataView 
            appData={appData}
            onAddCustomer={handleAddCustomer}
            onToggleCustomer={handleToggleCustomer}
            onAddProcess={handleAddProcess}
            onDeleteProcess={handleDeleteProcess}
            onAddItem={handleAddItem}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onImportJSON={handleImportJSON}
            onResetToBackup={handleResetToBackup}
            onCopyWA={handleCopyWA}
          />
        )}

      </main>

      {/* Floating Bottom Nav Rail */}
      <BottomNav 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        onClearWIPSelection={() => {
          setSelectedItemIdFromWIP('');
          setSelectedProsesFromWIP('');
        }}
      />

      {/* Global Auto-Dismissing Toast Message */}
      {toastMessage && (
        <div className="fixed bottom-20 left-4 right-4 bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-xl flex items-center gap-2.5 shadow-xl border border-slate-800 z-40 max-w-sm mx-auto animate-bounce">
          <Check className="h-4 w-4 text-[#ffd100] shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
