/**
 * smart-room-access-frontend/src/components/Sidebar.tsx
 *
 * -> sidebar component for navigation
 *      -> navigasi ke halaman dashboard, rfid card management, dan settings
 * -> menggunakan tema minimalist putih hijau (emerald green)
 */

import React from 'react';
import { LayoutDashboard, CreditCard, Settings, Activity, ShieldCheck, ScanFace } from 'lucide-react';

interface SidebarProps {
  currentTab: 'dashboard' | 'cards' | 'settings' | 'register' | 'credentials' | 'ml-register';
  setCurrentTab: (tab: 'dashboard' | 'cards' | 'settings' | 'register' | 'credentials' | 'ml-register') => void;
}

export default function Sidebar({ currentTab, setCurrentTab }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Live Monitoring', icon: LayoutDashboard },
    { id: 'cards', label: 'Kartu Akses', icon: CreditCard },
    { id: 'credentials', label: 'Kredensial User', icon: ScanFace },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <aside className="w-64 bg-white border-r border-slate-100 flex flex-col h-screen sticky top-0 justify-between">
      <div className="flex flex-col">
        {/* Logo/Header */}
        <div className="p-6 flex items-center gap-3 border-b border-slate-50">
          <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 tracking-tight leading-none text-lg">SmartRoom</h1>
            <span className="text-xs text-slate-400 font-medium tracking-wide uppercase">Gatekeeper</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id || 
              (item.id === 'cards' && currentTab === 'register') ||
              (item.id === 'credentials' && currentTab === 'ml-register');
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100/50'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <Icon
                  size={18}
                  className={`transition-colors duration-200 ${
                    isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* System Status / Footer */}
      <div className="p-4 border-t border-slate-50">
        <div className="bg-slate-50 rounded-2xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-slate-600">System Online</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">Smart Door Access v1.0.0</p>
        </div>
      </div>
    </aside>
  );
}
