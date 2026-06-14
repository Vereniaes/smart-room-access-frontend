/**
 * smart-room-access-frontend/src/components/UserCredentialsManager.tsx
 *
 * -> component untuk manajemen kredensial user & status registrasi ml (face recognition)
 * -> menampilkan list user, rfid_uid, jabatan, dan status wajah di sistem ml
 * -> menyediakan tombol "daftar wajah" untuk mengarahkan ke form capture kamera
 * -> menggunakan tema minimalist putih hijau (emerald green)
 */

import React, { useState, useEffect } from 'react';
import { Search, ShieldCheck, ShieldAlert, User, ScanFace, ArrowRight, RefreshCw, Plus, X, Clock, Calendar } from 'lucide-react';

interface UserData {
  id: number;
  name: string;
  username?: string;
  rfid_uid: string;
  role: 'admin' | 'staff' | 'student' | 'guest';
  schedule_start: string;
  schedule_end: string;
  valid_until: string | null;
  face_photos_count?: number;
  is_ml_registered?: boolean;
}

interface UserCredentialsManagerProps {
  users: UserData[];
  token: string;
  onRegisterMl: (user: UserData) => void;
  onRefresh: () => void;
  onAddCredential: () => void;
  onRegisterMlByCard?: () => void;
}

export default function UserCredentialsManager({ users, token, onRegisterMl, onRefresh, onAddCredential, onRegisterMlByCard }: UserCredentialsManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [mlFilter, setMlFilter] = useState<'all' | 'registered' | 'unregistered'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [userPhotos, setUserPhotos] = useState<string[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://smart-room-access-backend-196827089960.asia-southeast2.run.app';

  useEffect(() => {
    if (selectedUser) {
      setLoadingPhotos(true);
      fetch(`${API_URL}/api/v1/face/photos/${selectedUser.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(resData => {
        if (resData.success && resData.data && resData.data.photos && resData.data.photos.length > 0) {
          setUserPhotos(resData.data.photos);
        } else {
          const stored = localStorage.getItem(`user_photos_${selectedUser.id}`);
          if (stored) {
            setUserPhotos(JSON.parse(stored));
          } else {
            setUserPhotos(['/face_demo_one.png', '/face_demo_two.png', '/face_demo_three.png']);
          }
        }
      })
      .catch(() => {
        const stored = localStorage.getItem(`user_photos_${selectedUser.id}`);
        if (stored) {
          setUserPhotos(JSON.parse(stored));
        } else {
          setUserPhotos(['/face_demo_one.png', '/face_demo_two.png', '/face_demo_three.png']);
        }
      })
      .finally(() => {
        setLoadingPhotos(false);
      });
    } else {
      setUserPhotos([]);
    }
  }, [selectedUser, token]);

  // helper --------------------------------------------------------------------------

  // function untuk me-refresh data user dari server
  // input param : none
  // output      : void
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (e) {
      console.error('Failed to refresh users list:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // end of helper ------------------------------------------------------------------

  // Filter list user berdasarkan query pencarian, status ML, dan filter role
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase());

    const isMlReg = user.is_ml_registered || (user.face_photos_count && user.face_photos_count > 0);
    const matchesMl =
      mlFilter === 'all' ||
      (mlFilter === 'registered' && isMlReg) ||
      (mlFilter === 'unregistered' && !isMlReg);

    const matchesRole =
      roleFilter === 'all' ||
      user.role.toLowerCase() === roleFilter.toLowerCase();

    return matchesSearch && matchesMl && matchesRole;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Table Header Filter & Search */}
      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm flex flex-col">
        <div className="px-6 py-5 border-b border-slate-50 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 tracking-tight text-base flex items-center gap-2">
                <ScanFace size={18} className="text-emerald-600" />
                <span>Kredensial User & Registrasi ML Wajah</span>
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">Daftar pengguna terdaftar beserta status pengenalan wajah machine learning</p>
            </div>
            
            <div className="flex items-center gap-3">
              {onRegisterMlByCard && (
                <button
                  onClick={onRegisterMlByCard}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <ScanFace size={14} className="text-slate-400" />
                  <span>Registrasi Wajah (Pilih Kartu)</span>
                </button>
              )}

              <button
                onClick={onAddCredential}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-emerald-600/10 cursor-pointer"
              >
                <Plus size={14} />
                <span>Tambah Kredensial User</span>
              </button>

              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`p-2 hover:bg-slate-50 text-slate-400 hover:text-emerald-600 rounded-xl transition-all ${
                  isRefreshing ? 'animate-spin text-emerald-600' : ''
                }`}
                title="Refresh Data"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between pt-1">
            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Cari nama, jabatan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all"
              />
            </div>

            {/* Filter Group */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
              {/* ML Status Filter Tabs */}
              <div className="flex bg-slate-50 p-0.5 rounded-xl border border-slate-100">
                {(['all', 'registered', 'unregistered'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setMlFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wide capitalize transition-all ${
                      mlFilter === filter
                        ? 'bg-white text-emerald-700 shadow-sm border-slate-200/50'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {filter === 'all' ? 'Semua' : filter === 'registered' ? 'Terdaftar ML' : 'Belum Terdaftar'}
                  </button>
                ))}
              </div>

              {/* Role Filter Select */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-500 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
              >
                <option value="all">Semua Jabatan</option>
                <option value="student">Mahasiswa</option>
                <option value="staff">Staff</option>
                <option value="guest">Guest</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50">
                <th className="py-3.5 px-6">Nama User</th>
                <th className="py-3.5 px-6">Jabatan / Role</th>
                <th className="py-3.5 px-6">Jumlah Foto ML</th>
                <th className="py-3.5 px-6 text-center">Status Machine Learning</th>
                <th className="py-3.5 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400 text-sm">
                    Tidak ada pengguna yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isMlReg = user.is_ml_registered || (user.face_photos_count && user.face_photos_count > 0);
                  const photosCount = user.face_photos_count || 0;

                  const isSelected = selectedUser?.id === user.id;
                  return (
                    <tr 
                      key={user.id} 
                      onClick={() => setSelectedUser(user)}
                      className={`group cursor-pointer transition-colors duration-150 text-sm ${
                        isSelected ? 'bg-emerald-50/20' : 'hover:bg-slate-50/30'
                      }`}
                    >
                      {/* Name & Initial */}
                      <td className="py-4 px-6 font-semibold text-slate-700">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            isMlReg ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{user.name}</span>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-4 px-6">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                          {user.role.toUpperCase()}
                        </span>
                      </td>

                      {/* Face Photos Count */}
                      <td className="py-4 px-6 text-slate-500 font-medium text-xs">
                        {isMlReg ? (
                          <span className="bg-emerald-50/50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-100/50">
                            {photosCount} / 3 Foto
                          </span>
                        ) : (
                          <span className="bg-slate-50 text-slate-400 px-2.5 py-1 rounded-lg border border-slate-100">
                            0 / 3 Foto
                          </span>
                        )}
                      </td>

                      {/* ML Status Badge */}
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                          isMlReg
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {isMlReg ? (
                            <>
                              <ShieldCheck size={13} />
                              <span>Terdaftar di ML</span>
                            </>
                          ) : (
                            <>
                              <ShieldAlert size={13} />
                              <span>Belum Terdaftar</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        {isMlReg ? (
                          <button
                            onClick={() => onRegisterMl(user)}
                            className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-emerald-700 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                          >
                            Daftar Ulang Wajah
                          </button>
                        ) : (
                          <button
                            onClick={() => onRegisterMl(user)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-emerald-600/10 cursor-pointer"
                          >
                            <span>Daftar Wajah</span>
                            <ArrowRight size={12} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer Overlay Backdrop */}
      {selectedUser && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-xs z-40 transition-opacity duration-300"
          onClick={() => setSelectedUser(null)}
        />
      )}

      {/* Right Slide-in Detail Sidebar (Drawer Popup) */}
      {selectedUser && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-4/5 md:w-3/5 bg-white shadow-2xl border-l border-slate-100 p-8 flex flex-col h-full z-50 animate-in slide-in-from-right duration-300">
          
          {/* Header Row with Close Button */}
          <div className="flex items-center gap-4 border-b border-slate-50 pb-5 mb-6">
            <button
              onClick={() => setSelectedUser(null)}
              className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-700 rounded-xl transition-colors flex-shrink-0"
              title="Tutup Detail"
            >
              <X size={18} />
            </button>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none">Detail Kredensial User</span>
              <h4 className="font-bold text-slate-800 text-base mt-1 flex items-center gap-2">
                <User size={16} className="text-slate-400" />
                <span>{selectedUser.name}</span>
              </h4>
            </div>
          </div>

          {/* Drawer Body - Split Layout */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-8 overflow-y-auto pr-2">
            
            {/* Left Section: Meta details (3/5 width) */}
            <div className="md:col-span-3 space-y-6">
              
              {/* Status Info */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 block tracking-wide uppercase leading-none mb-2">Status Machine Learning</span>
                {selectedUser.is_ml_registered || (selectedUser.face_photos_count && selectedUser.face_photos_count > 0) ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <ShieldCheck size={13} />
                    <span>Terdaftar di ML</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
                    <ShieldAlert size={13} />
                    <span>Belum Terdaftar</span>
                  </div>
                )}
              </div>

              {/* User Account Details */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-slate-400 block tracking-wide uppercase leading-none">Informasi Akun</span>
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-50 space-y-3.5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] font-semibold text-slate-400 block uppercase leading-none">Jabatan / Role</span>
                      <span className="font-bold text-slate-700 mt-1 block uppercase text-xs">{selectedUser.role}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-semibold text-slate-400 block uppercase leading-none">ID Kredensial</span>
                      <span className="font-mono text-slate-700 mt-1 block text-xs">#{selectedUser.id}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] font-semibold text-slate-400 block uppercase leading-none">Username</span>
                    <span className="font-semibold text-slate-700 mt-1 block text-xs">{selectedUser.username || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Access Schedule Info */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-slate-400 block tracking-wide uppercase leading-none">Hak & Masa Akses</span>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 text-xs text-slate-600">
                    <Clock size={14} className="text-slate-400 flex-shrink-0" />
                    <div>
                      <span className="text-[9px] font-semibold text-slate-400 block uppercase leading-none">Jadwal Harian</span>
                      <span className="font-bold text-slate-700 mt-0.5 block">{selectedUser.schedule_start} - {selectedUser.schedule_end} WIB</span>
                    </div>
                  </div>

                  {selectedUser.valid_until && (
                    <div className="flex items-center gap-2.5 text-xs text-slate-600">
                      <Calendar size={14} className="text-slate-400 flex-shrink-0" />
                      <div>
                        <span className="text-[9px] font-semibold text-slate-400 block uppercase leading-none">Berlaku Hingga</span>
                        <span className="font-bold text-slate-700 mt-0.5 block">
                          {new Date(selectedUser.valid_until).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Right Section: Face Photos & Action Button (2/5 width) */}
            <div className="md:col-span-2 space-y-6 border-t md:border-t-0 md:border-l border-slate-100 md:pl-8 pt-6 md:pt-0 flex flex-col justify-between h-full">
              <div className="space-y-4 flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 block tracking-wide uppercase leading-none mb-1">Foto Wajah Terdaftar (InsightFace)</span>
                {loadingPhotos ? (
                  <div className="flex flex-col items-center justify-center py-20 text-emerald-600 gap-2">
                    <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-xs font-semibold text-slate-400">Memuat foto wajah...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 max-w-[240px]">
                    {userPhotos.map((photoUrl, idx) => (
                      <div key={idx} className="aspect-square bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden relative flex items-center justify-center group shadow-xs">
                        <img
                          src={photoUrl}
                          alt={`Face ${idx + 1}`}
                          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/face_demo_one.png';
                          }}
                        />
                        <div className="absolute bottom-2 left-2 bg-slate-900/60 backdrop-blur-xs text-white px-2 py-0.5 rounded-lg text-[9px] font-bold">
                          Foto {idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Shutter / Camera action button at bottom of photo stack */}
              <div className="pt-6 border-t border-slate-100 mt-auto">
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    onRegisterMl(selectedUser);
                  }}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs tracking-wider shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/25 transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ScanFace size={16} />
                  <span>{selectedUser.is_ml_registered || (selectedUser.face_photos_count && selectedUser.face_photos_count > 0) ? 'Daftar Ulang Wajah' : 'Daftar Wajah Baru'}</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
