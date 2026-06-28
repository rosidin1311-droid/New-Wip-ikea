import React from 'react';
import { LayoutGrid, PlusCircle, Database, Layers, FileSpreadsheet } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onClearWIPSelection: () => void;
}

export default function BottomNav({ 
  activeTab, 
  setActiveTab,
  onClearWIPSelection
}: BottomNavProps) {
  
  // Revised navigation items to perfectly match the requested design
  const leftItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutGrid },
    { id: 'stok', label: 'Gudang FG', icon: FileSpreadsheet },
  ];

  const rightItems = [
    { id: 'wip', label: 'Status WIP', icon: Layers },
    { id: 'master', label: 'Master', icon: Database },
  ];

  const handleTabClick = (tabId: string) => {
    if (tabId !== 'catat') {
      onClearWIPSelection();
    }
    setActiveTab(tabId);
  };

  return (
    <div className="fixed bottom-5 left-4 right-4 z-30 max-w-md mx-auto">
      {/* Container holding the custom navbar */}
      <div className="relative bg-slate-900 border-2 border-slate-800 rounded-full h-16 shadow-[0_10px_30px_rgba(0,0,0,0.35)] flex items-center justify-between px-3">
        
        {/* LEFT NAV ITEMS */}
        <div className="flex flex-1 justify-around items-center">
          {leftItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className="flex flex-col items-center justify-center focus:outline-none flex-1 active:scale-90 transition-all cursor-pointer"
              >
                <div className={`p-1.5 rounded-xl transition-all ${
                  isActive 
                    ? 'text-ikea-yellow scale-110' 
                    : 'text-slate-400 hover:text-slate-300'
                }`}>
                  <Icon className="h-5 w-5 stroke-[2.5]" />
                </div>
                <span className={`text-[9px] font-black uppercase tracking-wider transition-colors -mt-0.5 ${
                  isActive ? 'text-white' : 'text-slate-500'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* CENTER FLOATING "CATAT" BUTTON IN THE SPECIFIED POSITION */}
        <div className="relative -mt-6 flex justify-center items-center w-16">
          <button
            onClick={() => handleTabClick('catat')}
            className={`w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-[0_6px_20px_rgba(255,209,0,0.4)] transition-all cursor-pointer active:scale-95 hover:scale-105 ${
              activeTab === 'catat'
                ? 'bg-ikea-yellow text-slate-950 border-4 border-slate-900 scale-110'
                : 'bg-ikea-yellow text-slate-900 border-2 border-slate-900'
            }`}
          >
            <PlusCircle className="h-6 w-6 stroke-[3]" />
            <span className="text-[8px] font-black uppercase tracking-wider -mt-0.5">CATAT</span>
          </button>
        </div>

        {/* RIGHT NAV ITEMS */}
        <div className="flex flex-1 justify-around items-center">
          {rightItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className="flex flex-col items-center justify-center focus:outline-none flex-1 active:scale-90 transition-all cursor-pointer"
              >
                <div className={`p-1.5 rounded-xl transition-all ${
                  isActive 
                    ? 'text-ikea-yellow scale-110' 
                    : 'text-slate-400 hover:text-slate-300'
                }`}>
                  <Icon className="h-5 w-5 stroke-[2.5]" />
                </div>
                <span className={`text-[9px] font-black uppercase tracking-wider transition-colors -mt-0.5 ${
                  isActive ? 'text-white' : 'text-slate-500'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
}
