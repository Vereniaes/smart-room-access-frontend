/**
 * smart-room-access-frontend/src/components/SettingsManager.tsx
 * 
 * -> komponen manajemen pengaturan sistem untuk Smart Room Access
 *      -> sub-tab Informasi Sistem (status health backend, ml-service, uptime, daftar device IoT terhubung)
 *      -> sub-tab Preferensi Dashboard (polling rate & toggle streaming)
 * -> disini melakukan pemanggilan API /system/info untuk mendapatkan data sistem & list device
 */

import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Cpu, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  RefreshCw,
  Activity,
  Sliders,
  User
} from 'lucide-react';

interface SettingsManagerProps {
  token: string | null;
  onUpdatePollingInterval?: (interval: number) => void;
  currentPollingInterval?: number;
}

interface DeviceInfo {
  room: string;
  lastSeen: string;
  totalTaps: number;
  status: 'Aktif' | 'Standby';
}

interface SystemInfo {
  health: {
    mlService: 'Online' | 'Offline';
    backend: 'Online';
  };
  metrics: {
    uptime: number;
    memoryUsage: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
    };
    nodeVersion: string;
    platform: string;
  };
  devices: DeviceInfo[];
  adminProfile?: {
    id: number;
    username: string;
    role: string;
    name: string;
  };
}

export default function SettingsManager({ 
  token, 
  onUpdatePollingInterval,
  currentPollingInterval = 2500 
}: SettingsManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState<'info' | 'preferences'>('info');
  const [sysInfo, setSysInfo] = useState<SystemInfo | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [infoError, setInfoError] = useState('');

  // Preference states (saved locally in browser)
  const [isCameraSimulated, setIsCameraSimulated] = useState(true);
  const [pollingRate, setPollingRate] = useState(currentPollingInterval);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://smart-room-access-backend-196827089960.asia-southeast2.run.app';

  // load local preferences
  useEffect(() => {
    const savedSim = localStorage.getItem('pref_camera_simulated');
    if (savedSim !== null) {
      setIsCameraSimulated(savedSim === 'true');
    }
  }, []);

  // load system info on mount
  useEffect(() => {
    if (token) {
      fetchSystemInfo();
    }
  }, [token]);

  // helper --------------------------------------------------------------------------

  // function untuk mengambil informasi status sistem dari backend API
  // output      : void (mengupdate state sysInfo & error)
  const fetchSystemInfo = async () => {
    if (!token) return;
    setIsLoadingInfo(true);
    setInfoError('');
    try {
      const res = await fetch(`${API_URL}/api/v1/system/info`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setSysInfo(data.data);
      } else {
        setInfoError(data.message || 'Gagal mengambil informasi sistem.');
      }
    } catch (err) {
      console.error(err);
      setInfoError('Gagal terhubung ke backend server.');
    } finally {
      setIsLoadingInfo(false);
    }
  };

  // function untuk memformat detik uptime menjadi format yang mudah dipahami
  // input param : seconds (jumlah detik uptime)
  // output      : string (format uptime)
  const formatUptime = (seconds: number): string => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    const parts = [];
    if (d > 0) parts.push(`${d} hari`);
    if (h > 0) parts.push(`${h} jam`);
    if (m > 0) parts.push(`${m} menit`);
    parts.push(`${s} detik`);
    
    return parts.join(', ');
  };

  // function untuk memformat string ISO timestamp menjadi format tanggal Indonesia
  // input param : isoString (string ISO timestamp)
  // output      : string (format waktu Indonesia, misal: 14 Jun 2026, 23:25)
  const formatDateTime = (isoString: string): string => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jakarta'
    }) + ' WIB';
  };

  // function untuk memperbarui status simulasi kamera live
  // input param : value (boolean simulasi kamera)
  // output      : void (menyimpan ke local storage & update state)
  const handleToggleCameraSim = (value: boolean) => {
    setIsCameraSimulated(value);
    localStorage.setItem('pref_camera_simulated', String(value));
    // refresh page agar state simulasi terpicu (atau reload preview)
    window.dispatchEvent(new Event('storage'));
  };

  // function untuk memperbarui rate refresh interval polling dashboard
  // input param : rate (jumlah milidetik polling)
  // output      : void (memanggil callback props & update state)
  const handleUpdatePollingRate = (rate: number) => {
    setPollingRate(rate);
    if (onUpdatePollingInterval) {
      onUpdatePollingInterval(rate);
    }
  };

  // end of helper ------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Pengaturan Sistem</h2>
          <p className="text-slate-400 text-xs mt-1">Konfigurasi endpoint, monitoring device IoT, dan preferensi polling data</p>
        </div>
        
        {/* Tombol Refresh System Info */}
        <button 
          onClick={fetchSystemInfo}
          disabled={isLoadingInfo}
          className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold px-4 py-2 rounded-xl text-xs border border-slate-100 transition duration-200"
        >
          <RefreshCw size={14} className={isLoadingInfo ? 'animate-spin' : ''} />
          Refresh Status
        </button>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="bg-slate-100/60 p-1.5 rounded-2xl flex gap-1 w-full md:w-max">
        <button
          onClick={() => setActiveSubTab('info')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
            activeSubTab === 'info' 
              ? 'bg-white text-emerald-700 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
          }`}
        >
          <Server size={14} />
          Informasi Sistem
        </button>
        <button
          onClick={() => setActiveSubTab('preferences')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
            activeSubTab === 'preferences' 
              ? 'bg-white text-emerald-700 shadow-sm' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
          }`}
        >
          <Sliders size={14} />
          Preferensi UI
        </button>
      </div>

      {/* Konten Aktif Sub-Tab */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8">
        
        {/* SUB TAB 1: INFORMASI SISTEM */}
        {activeSubTab === 'info' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Profil Admin Aktif */}
            <div className="border border-slate-100 rounded-2xl p-5 bg-slate-50/35 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm border border-emerald-100/50">
                <User size={26} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-800 text-base leading-none">
                    {sysInfo?.adminProfile?.name || 'Administrator'}
                  </h3>
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    {sysInfo?.adminProfile?.role || 'admin'}
                  </span>
                </div>
                <p className="text-slate-400 text-xs mt-2 font-medium">
                  Username: <span className="text-slate-600 font-semibold font-mono">{sysInfo?.adminProfile?.username || 'admin'}</span>
                </p>
              </div>
            </div>

            {/* Status Online Services */}
            <div>
              <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Activity size={16} className="text-emerald-500" />
                Status Konektivitas Layanan
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Backend Service */}
                <div className="border border-slate-100 bg-slate-50/50 rounded-2xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Server size={22} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Status Server</h4>
                      <span className="text-[10px] text-slate-400 block font-medium">Node.js Express Server</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Aktif
                  </div>
                </div>

                {/* ML Microservice Python */}
                <div className="border border-slate-100 bg-slate-50/50 rounded-2xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                      <Cpu size={22} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">InsightFace ML</h4>
                      <span className="text-[10px] text-slate-400 block font-medium">FastAPI Python Microservice</span>
                    </div>
                  </div>
                  {sysInfo?.health.mlService === 'Online' ? (
                    <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Aktif
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                      Offline
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* System Performance Metrics */}
            <div>
              <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Clock size={16} className="text-purple-500" />
                Uptime Server
              </h3>
              
              <div className="border border-slate-100 rounded-2xl p-5 bg-slate-50/20 max-w-md">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block">Waktu Aktif Server (Uptime)</span>
                <span className="text-base font-bold text-slate-800 mt-2 block">
                  {sysInfo?.metrics.uptime ? formatUptime(sysInfo.metrics.uptime) : 'Loading...'}
                </span>
              </div>
            </div>

            {/* Daftar Device IoT Terhubung */}
            <div className="pt-4 border-t border-slate-50">
              <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Cpu size={16} className="text-emerald-500" />
                Daftar Device IoT Terhubung (Pintu / Ruangan)
              </h3>
              
              {!sysInfo?.devices || sysInfo.devices.length === 0 ? (
                <div className="text-slate-400 text-xs py-6 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  Belum ada device IoT yang terhubung (mengirimkan log akses).
                </div>
              ) : (
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                        <th className="p-4">Nama Device / Ruangan</th>
                        <th className="p-4">Terakhir Kali Terhubung</th>
                        <th className="p-4">Total Log Tap</th>
                        <th className="p-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {sysInfo.devices.map((device, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition">
                          <td className="p-4 font-bold text-slate-800 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0"></span>
                            {device.room}
                          </td>
                          <td className="p-4 font-semibold text-slate-600">
                            {formatDateTime(device.lastSeen)}
                          </td>
                          <td className="p-4 font-mono font-bold text-slate-500">
                            {device.totalTaps} kali tap
                          </td>
                          <td className="p-4 text-center">
                            {device.status === 'Aktif' ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wide">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Aktif
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wide">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                Standby
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* SUB TAB 2: PREFERENSI DASHBOARD */}
        {activeSubTab === 'preferences' && (
          <div className="space-y-8 animate-fadeIn max-w-2xl">
            {/* Polling interval settings */}
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Interval Polling Data Live Monitoring</h3>
                <p className="text-slate-400 text-xs mt-1">Sesuaikan seberapa sering dashboard melakukan refresh HTTP request log akses terbaru secara background.</p>
              </div>

              <div className="flex flex-wrap gap-3">
                {[
                  { label: 'Cepat (2.5 Detik)', val: 2500 },
                  { label: 'Sedang (5 Detik)', val: 5000 },
                  { label: 'Lambat (10 Detik)', val: 10000 },
                  { label: 'Manual Polling', val: 999999 }
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => handleUpdatePollingRate(item.val)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition duration-200 ${
                      pollingRate === item.val
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-100/30'
                        : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    {item.val === 999999 ? 'Manual (Gak Auto)' : item.label}
                  </button>
                ))}
              </div>
              <p className="text-slate-400 text-[10px]">
                * Pengaturan ini akan langsung memengaruhi frekuensi request database neon untuk mencegah beban query berlebih.
              </p>
            </div>

            {/* Dashboard simulator customization toggles */}
            <div className="space-y-4 pt-4 border-t border-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-800">Pengaturan Tampilan & Simulasi</h3>
                <p className="text-slate-400 text-xs mt-1">Ubah estetika grafis dashboard gatekeeper.</p>
              </div>

              <div className="space-y-4">
                {/* Toggle Camera Simulation */}
                <div className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Simulasikan Kamera Aktif (Live Camera Mock)</h4>
                    <p className="text-slate-400 text-[10px] mt-0.5">Menampilkan status streaming kamera simulasi jika ESP32 offline.</p>
                  </div>
                  <button
                    onClick={() => handleToggleCameraSim(!isCameraSimulated)}
                    className={`w-12 h-6 rounded-full p-1 transition duration-200 ${isCameraSimulated ? 'bg-emerald-600' : 'bg-slate-200'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition duration-200 ${isCameraSimulated ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}
