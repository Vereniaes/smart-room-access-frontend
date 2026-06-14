/**
 * smart-room-access-frontend/src/app/page.tsx
 *
 * -> main dashboard page for smart room access live monitoring
 * -> menangani otentikasi login, polling data log, statistik taps, dan integrasi view
 * -> menggunakan tema minimalist putih hijau (emerald green)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  ShieldCheck, 
  ShieldX, 
  LogOut, 
  Lock, 
  User as UserIcon, 
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import LastAccessPreview from '@/components/LastAccessPreview';
import LogTable from '@/components/LogTable';
import TrendCharts from '@/components/TrendCharts';
import AccessCardManager from '@/components/AccessCardManager';
import RegistrationForm from '@/components/RegistrationForm';
import UserCredentialsManager from '@/components/UserCredentialsManager';
import MlFaceRegistrationForm from '@/components/MlFaceRegistrationForm';
import SettingsManager from '@/components/SettingsManager';

interface AccessLog {
  id: number;
  user_id: number | null;
  uid: string;
  access_time: string;
  status: 'allowed' | 'denied';
  room: string;
  message: string | null;
  photo_url: string | null;
  user_name?: string;
  user_role?: string;
}

export default function Home() {
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'cards' | 'settings' | 'register' | 'credentials' | 'ml-register'>('dashboard');
  const [registrationSourceTab, setRegistrationSourceTab] = useState<'cards' | 'credentials'>('cards');
  const [registrationMode, setRegistrationMode] = useState<'create_user' | 'register_face'>('create_user');
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<AccessLog | null>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [registerRfid, setRegisterRfid] = useState('');
  const [selectedUserForMl, setSelectedUserForMl] = useState<any | null>(null);
  
  // Auth state
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // UI state
  const [isApiOnline, setIsApiOnline] = useState<boolean | null>(null); // null = loading, true = online, false = offline
  const [isPolling, setIsPolling] = useState(true);
  const [pollingInterval, setPollingInterval] = useState(2500);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://smart-room-access-backend-196827089960.asia-southeast2.run.app';

  // load token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('access_token');
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  // Poll for logs and users if token is available
  useEffect(() => {
    if (!token) return;

    // fetch logs and users immediately
    fetchLogs();
    fetchUsers();

    // set up polling interval
    const interval = setInterval(() => {
      if (isPolling) {
        fetchLogs();
        fetchUsers();
      }
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [token, isPolling, pollingInterval]);

  // helper --------------------------------------------------------------------------

  // function untuk login admin dashboard
  // input param: e -> form event
  // output: void (menyimpan token ke local storage)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setAuthError('');

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success) {
        const receivedToken = data.data.accessToken;
        localStorage.setItem('access_token', receivedToken);
        setToken(receivedToken);
      } else {
        setAuthError(data.message || 'Login gagal, silakan periksa kembali username & password.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setAuthError('Gagal terhubung ke server backend. Pastikan server aktif.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // function untuk logout admin dashboard
  // output: void (menghapus token dari local storage)
  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
    setLogs([]);
    setSelectedLog(null);
  };

  // function untuk memanggil endpoint access logs
  // output: void (mengupdate state logs & status api)
  const fetchLogs = async () => {
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/v1/logs`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // handle expired or invalid token
      if (res.status === 401 || res.status === 403) {
        handleLogout();
        setAuthError('Sesi Anda telah berakhir, silakan login kembali.');
        return;
      }

      const data = await res.json();

      if (data.success) {
        const fetchedLogs = data.data.logs || [];
        setLogs(fetchedLogs);
        setIsApiOnline(true);
        setLastUpdated(new Date());

        // automatically select the newest log if none is selected
        if (fetchedLogs.length > 0 && !selectedLog) {
          setSelectedLog(fetchedLogs[0]);
        }
      } else {
        setIsApiOnline(false);
      }
    } catch (err) {
      console.error('Fetch logs error:', err);
      setIsApiOnline(false);
    }
  };

  // function untuk memanggil endpoint list user
  // output: void (mengupdate state usersList)
  const fetchUsers = async () => {
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/v1/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.status === 401 || res.status === 403) {
        handleLogout();
        setAuthError('Sesi Anda telah berakhir, silakan login kembali.');
        return;
      }

      const data = await res.json();

      if (data.success) {
        setUsersList(data.data.users || []);
      }
    } catch (err) {
      console.error('Fetch users error:', err);
    }
  };

  // end of helper ------------------------------------------------------------------



  // Calculate quick stats
  const totalTaps = logs.length;
  const allowedTaps = logs.filter(l => l.status === 'allowed').length;
  const deniedTaps = logs.filter(l => l.status === 'denied').length;
  const successRate = totalTaps > 0 ? Math.round((allowedTaps / totalTaps) * 100) : 0;

  // Render Login view if not authenticated
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 p-8 shadow-xl shadow-slate-100/40">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-2xl mb-4">
              <Activity size={32} />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight text-center">Smart Door Access</h2>
            <p className="text-slate-400 text-sm mt-1.5 text-center">Masuk ke Dashboard Live Monitoring</p>
          </div>

          {authError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 text-xs font-semibold rounded-2xl flex items-center gap-2.5">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <UserIcon size={16} />
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-10 pr-4 py-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-10 pr-4 py-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white py-3.5 rounded-2xl font-bold text-sm tracking-wide shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/25 transition-all duration-150 flex justify-center items-center gap-2"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Sedang Masuk...</span>
                </>
              ) : (
                <span>Masuk Dashboard</span>
              )}
            </button>
          </form>

          {/* Quick Helper info */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <span className="text-slate-400 text-xs font-medium">Akun Demo Default:</span>
            <div className="mt-2 inline-flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-500 font-mono">user: <b>admin</b></span>
              <span className="text-slate-300">|</span>
              <span className="text-[10px] text-slate-500 font-mono">pw: <b>admin123</b></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Main Dashboard Layout
  return (
    <div className="flex bg-slate-50/60 min-h-screen text-slate-600 font-sans">
      {/* Left Sidebar */}
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Navbar Header */}
        <header className="bg-white border-b border-slate-100 h-16 sticky top-0 z-10 px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-800 text-lg tracking-tight">
              {currentTab === 'dashboard' ? 'Live Access Monitoring' : currentTab === 'cards' ? 'Manajemen Kartu Akses' : 'Pengaturan'}
            </span>
            
            {/* Connection Indicator badge */}
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
              isApiOnline === null
                ? 'bg-amber-50 text-amber-700'
                : isApiOnline
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
            }`}>
              <span className={`relative flex h-1.5 w-1.5`}>
                {isApiOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                  isApiOnline === null
                    ? 'bg-amber-500'
                    : isApiOnline
                      ? 'bg-emerald-500'
                      : 'bg-red-500'
                }`}></span>
              </span>
              <span>{isApiOnline === null ? 'Connecting' : isApiOnline ? 'Connected' : 'Offline'}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
              <Clock size={12} />
              <span>Update: {lastUpdated.toLocaleTimeString()}</span>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-100 transition-colors"
            >
              <LogOut size={14} />
              <span>Log Out</span>
            </button>
          </div>
        </header>

        {/* Content Pane */}
        <main className="p-8 flex-1 overflow-y-auto space-y-8 max-w-7xl mx-auto w-full">
          {currentTab === 'dashboard' && (
            <>
              {/* Real-time Last Access Log (Always Horizontal & Absolute Top) */}
              <div className="w-full">
                <LastAccessPreview log={logs.length > 0 ? logs[0] : null} layout="horizontal" />
              </div>

              {/* Stat Cards Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Stat 1: Total Taps */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 text-xs font-semibold tracking-wide uppercase block">Total Taps</span>
                    <span className="text-3xl font-extrabold text-slate-800 tracking-tight block mt-1">{totalTaps}</span>
                  </div>
                  <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center">
                    <Activity size={20} />
                  </div>
                </div>

                {/* Stat 2: Allowed */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 text-xs font-semibold tracking-wide uppercase block">Diterima</span>
                    <span className="text-3xl font-extrabold text-emerald-700 tracking-tight block mt-1">{allowedTaps}</span>
                  </div>
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                    <ShieldCheck size={20} />
                  </div>
                </div>

                {/* Stat 3: Denied */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 text-xs font-semibold tracking-wide uppercase block">Ditolak</span>
                    <span className="text-3xl font-extrabold text-red-700 tracking-tight block mt-1">{deniedTaps}</span>
                  </div>
                  <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
                    <ShieldX size={20} />
                  </div>
                </div>

                {/* Stat 4: Success Rate */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 text-xs font-semibold tracking-wide uppercase block">Success Rate</span>
                    <span className="text-3xl font-extrabold text-slate-800 tracking-tight block mt-1">{successRate}%</span>
                  </div>
                  <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center">
                    <CheckCircle size={20} />
                  </div>
                </div>

              </div>

              {/* Main Content Layout Stack */}
              <div className="space-y-8">

                {/* Row 1: Tren Grafik Daily, Weekly, Monthly */}
                <TrendCharts logs={logs} />
                
                {/* Row 2: Detailed Preview & Log Table Side-by-Side */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                  
                  {/* Left: Detailed Preview Card (Vertical Shape) */}
                  <div className="lg:col-span-1 h-full">
                    <LastAccessPreview log={selectedLog} layout="vertical" />
                  </div>

                  {/* Right: Logs Table and Filters */}
                  <div className="lg:col-span-2 h-full">
                    <LogTable
                      logs={logs}
                      selectedLogId={selectedLog?.id || null}
                      onSelectLog={(log) => setSelectedLog(log)}
                    />
                  </div>

                </div>

              </div>
            </>
          )}

          {currentTab === 'cards' && (
            <AccessCardManager
              users={usersList}
              logs={logs}
              token={token}
              onRegister={(uid) => {
                setRegisterRfid(uid);
                setRegistrationSourceTab('cards');
                setRegistrationMode('create_user');
                setCurrentTab('register');
              }}
              onAddCredential={() => {
                setRegisterRfid('');
                setRegistrationSourceTab('cards');
                setRegistrationMode('create_user');
                setCurrentTab('register');
              }}
              onRegisterFace={(uid) => {
                setRegisterRfid(uid);
                setRegistrationSourceTab('cards');
                setRegistrationMode('register_face');
                setCurrentTab('register');
              }}
              onRefresh={() => {
                fetchUsers();
                fetchLogs();
              }}
            />
          )}

          {currentTab === 'register' && (
            <RegistrationForm
              initialRfidUid={registerRfid}
              token={token}
              isCardOnly={registrationMode === 'create_user'}
              users={usersList}
              logs={logs}
              onBack={() => setCurrentTab(registrationSourceTab)}
              onSuccess={() => {
                setCurrentTab(registrationSourceTab);
                fetchUsers();
                fetchLogs();
              }}
            />
          )}

          {currentTab === 'credentials' && (
            <UserCredentialsManager
              users={usersList}
              token={token || ''}
              onRegisterMl={(user) => {
                setSelectedUserForMl(user);
                setCurrentTab('ml-register');
              }}
              onRegisterMlByCard={() => {
                setRegisterRfid('');
                setRegistrationSourceTab('credentials');
                setRegistrationMode('register_face');
                setCurrentTab('register');
              }}
              onRefresh={() => {
                fetchUsers();
              }}
              onAddCredential={() => {
                setRegisterRfid('');
                setRegistrationSourceTab('credentials');
                setRegistrationMode('create_user');
                setCurrentTab('register');
              }}
            />
          )}

          {currentTab === 'ml-register' && selectedUserForMl && (
            <MlFaceRegistrationForm
              user={selectedUserForMl}
              token={token || ''}
              onBack={() => setCurrentTab('credentials')}
              onSuccess={() => {
                fetchUsers();
                setCurrentTab('credentials');
              }}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsManager 
              token={token} 
              currentPollingInterval={pollingInterval}
              onUpdatePollingInterval={(interval) => setPollingInterval(interval)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
