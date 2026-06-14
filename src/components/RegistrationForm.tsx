/**
 * smart-room-access-frontend/src/components/RegistrationForm.tsx
 *
 * -> form component untuk registrasi user baru dan pendaftaran wajah (face recognition)
 * -> mengirimkan data user ke endpoint /api/v1/users dan 3 foto ke /api/v1/face/register
 * -> menggunakan tema minimalist putih hijau (emerald green)
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, CreditCard, Clock, Calendar, Upload, AlertCircle, CheckCircle, RefreshCw, Search, ChevronDown } from 'lucide-react';
import MlFaceRegistrationForm from './MlFaceRegistrationForm';

interface UserData {
  id: number;
  name: string;
  rfid_uid: string;
  role: 'admin' | 'staff' | 'student' | 'guest';
  schedule_start: string;
  schedule_end: string;
  valid_until: string | null;
  face_photos_count?: number;
  is_ml_registered?: boolean;
}

interface RegistrationFormProps {
  initialRfidUid?: string;
  token: string;
  onBack: () => void;
  onSuccess: () => void;
  isCardOnly?: boolean;
  users?: UserData[];
  logs?: any[];
}

export default function RegistrationForm({ initialRfidUid = '', token, onBack, onSuccess, isCardOnly = false, users = [], logs = [] }: RegistrationFormProps) {
  const [name, setName] = useState('');
  const [rfidUid, setRfidUid] = useState(initialRfidUid);
  const [role, setRole] = useState<'admin' | 'staff' | 'student' | 'guest'>('guest');
  const [scheduleStart, setScheduleStart] = useState('08:00');
  const [scheduleEnd, setScheduleEnd] = useState('17:00');
  const [validUntil, setValidUntil] = useState('');
  
  // Dashboard credentials (optional, only for admin/staff if they want dashboard access)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Photo states removed - using MlFaceRegistrationForm directly

  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 2-step flow states
  const [step, setStep] = useState<1 | 2>(1);
  const [createdUserId, setCreatedUserId] = useState<number | null>(null);
  const [createdName, setCreatedName] = useState('');

  // Search states for selecting existing user
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Cards list for dropdown select
  const [cardsList, setCardsList] = useState<any[]>([]);

  // Search states for selecting registered cards (ML registration)
  const [cardSearchQuery, setCardSearchQuery] = useState('');
  const [selectedCardForMl, setSelectedCardForMl] = useState<any | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/v1/cards`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setCardsList(data.data.cards || []);
      }
    })
    .catch(err => console.error('Failed to load cards inside RegistrationForm', err));
  }, [token]);

  const availableCards = cardsList.filter(c => !c.user_id || c.card_no.toUpperCase() === initialRfidUid.toUpperCase());

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered users for select dropdown
  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  // Filtered cards that have a linked user for ML registration select dropdown
  const cardsLinkedToUsers = cardsList.filter(c => c.user_id !== null);
  const filteredCardsForMl = cardsLinkedToUsers.filter((c) =>
    c.card_no.toLowerCase().includes(cardSearchQuery.toLowerCase()) ||
    (c.user_name && c.user_name.toLowerCase().includes(cardSearchQuery.toLowerCase()))
  );

  const handleSelectUser = (u: UserData) => {
    setSelectedUser(u);
    setUserSearchQuery(u.name);
    setName(u.name);
    
    // Look up raw RFID UID from logs if exists, otherwise fallback to hash
    const plaintextLog = logs.find(log => log.user_id === u.id);
    const displayUid = plaintextLog 
      ? plaintextLog.uid.trim().toUpperCase() 
      : (u.rfid_uid.length > 20 
          ? u.rfid_uid.substring(0, 12).toUpperCase() + '...' 
          : u.rfid_uid.toUpperCase());
          
    setRfidUid(displayUid);
    setRole(u.role);
    setScheduleStart(u.schedule_start);
    setScheduleEnd(u.schedule_end);
    setValidUntil(u.valid_until ? u.valid_until.split('T')[0] : '');
  };

  // function untuk menangani pemilihan kartu pada alur registrasi wajah ML
  // input param : card -> object kartu terdaftar
  // output      : void
  const handleSelectCardForMl = (card: any) => {
    setSelectedCardForMl(card);
    setCardSearchQuery(card.card_no);
    
    const linkedUser = users.find(u => u.id === card.user_id);
    if (linkedUser) {
      setSelectedUser(linkedUser);
      setName(linkedUser.name);
      setRfidUid(card.card_no);
      setRole(linkedUser.role);
      setScheduleStart(linkedUser.schedule_start);
      setScheduleEnd(linkedUser.schedule_end);
      setValidUntil(linkedUser.valid_until ? linkedUser.valid_until.split('T')[0] : '');
    }
  };

  // Auto-select card if initialRfidUid is provided on mount or cardsList/users loaded
  useEffect(() => {
    if (!isCardOnly && initialRfidUid && cardsList.length > 0 && users.length > 0) {
      const matchedCard = cardsList.find(c => c.card_no.toUpperCase() === initialRfidUid.toUpperCase());
      if (matchedCard && matchedCard.user_id) {
        handleSelectCardForMl(matchedCard);
      }
    }
  }, [initialRfidUid, cardsList, users, isCardOnly]);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://smart-room-access-backend-196827089960.asia-southeast2.run.app';

  // helper --------------------------------------------------------------------------

  // handlePhotoChange removed

  // function untuk mendaftarkan kredensial user baru ke database
  // input param : goToStep2 -> boolean
  // output      : void
  const handleSaveUser = async (goToStep2: boolean) => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!isCardOnly) {
      if (!selectedUser) {
        return setErrorMsg('Pilih user terlebih dahulu dari menu pencarian');
      }
      if (goToStep2) {
        setCreatedUserId(selectedUser.id);
        setCreatedName(selectedUser.name);
        setStep(2);
      } else {
        onSuccess();
      }
      return;
    }

    if (!name.trim()) return setErrorMsg('Nama lengkap wajib diisi');
    if (!rfidUid.trim()) return setErrorMsg('RFID UID wajib diisi');

    setIsLoading(true);

    try {
      // POST request to create user
      const userPayload: any = {
        name,
        rfid_uid: rfidUid,
        role,
        schedule_start: scheduleStart,
        schedule_end: scheduleEnd,
        valid_until: validUntil || null
      };

      // Add dashboard credentials if staff or admin
      if ((role === 'admin' || role === 'staff') && username && password) {
        userPayload.username = username;
        userPayload.password = password;
      }

      const userRes = await fetch(`${API_URL}/api/v1/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userPayload)
      });

      const userData = await userRes.json();

      if (!userData.success) {
        throw new Error(userData.message || 'Gagal mendaftarkan user ke database');
      }

      const newUserId = userData.data.id;

      if (goToStep2) {
        setCreatedUserId(newUserId);
        setCreatedName(name);
        setStep(2);
      } else {
        setSuccessMsg('Kredensial User berhasil didaftarkan!');
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (err: any) {
      console.error('User registration error:', err);
      setErrorMsg(err.message || 'Terjadi kesalahan sistem saat mendaftarkan user.');
    } finally {
      setIsLoading(false);
    }
  };

  // handleSaveFace removed

  // end of helper ------------------------------------------------------------------

  if (step === 2) {
    return (
      <MlFaceRegistrationForm
        user={{ id: createdUserId!, name: createdName, role }}
        token={token}
        onBack={onSuccess}
        onSuccess={onSuccess}
      />
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8 border-b border-slate-50 pb-5">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            {isCardOnly ? 'Registrasi Kredensial User' : 'Registrasi Wajah ML (InsightFace)'}
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">
            {isCardOnly 
              ? 'Daftarkan data diri user beserta jadwal hak akses dan hubungkan dengan kartu RFID yang terdaftar' 
              : 'Pilih kartu RFID terdaftar untuk merekam 3 sudut foto wajah bagi pemegang kartu tersebut'}
          </p>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-100 text-amber-800 text-xs font-semibold rounded-2xl flex items-start gap-2.5">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2.5">
          <CheckCircle size={16} className="flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); handleSaveUser(true); }} className="space-y-8">
        
        {/* SELEKSI KARTU RFID (UNTUK REGISTRASI ML WAJAH) */}
        {!isCardOnly && (
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Pilih Kartu RFID Terdaftar</label>
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <Search size={16} />
                  </span>
                  <input
                    type="text"
                    placeholder="Cari nomor kartu RFID atau nama user..."
                    value={cardSearchQuery}
                    onChange={(e) => {
                      setCardSearchQuery(e.target.value);
                      setIsDropdownOpen(true);
                      if (selectedCardForMl && e.target.value !== selectedCardForMl.card_no) {
                        setSelectedCardForMl(null);
                        setSelectedUser(null);
                        setName('');
                        setRfidUid('');
                        setRole('guest');
                        setScheduleStart('08:00');
                        setScheduleEnd('17:00');
                        setValidUntil('');
                      }
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-10 py-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 pointer-events-none">
                    <ChevronDown size={16} />
                  </span>
                </div>

                {isDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-50">
                    {filteredCardsForMl.length > 0 ? (
                      filteredCardsForMl.map((c) => {
                        const linkedUser = users.find(u => u.id === c.user_id);
                        const hasPhoto = linkedUser?.is_ml_registered || (linkedUser?.face_photos_count && linkedUser.face_photos_count > 0);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              handleSelectCardForMl(c);
                              setIsDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between text-sm font-semibold text-slate-700 transition-colors"
                          >
                            <div className="flex flex-col">
                              <span className="font-mono text-xs font-bold text-slate-800">{c.card_no}</span>
                              <span className="text-xs text-slate-500 font-semibold mt-0.5">User: {c.user_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                {(c.user_role || 'guest').toUpperCase()}
                              </span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                                hasPhoto ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                              }`}>
                                {hasPhoto ? 'Wajah Terdaftar' : 'Belum Ada Wajah'}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-4 py-3 text-xs font-semibold text-slate-400 text-center">
                        Tidak ada kartu RFID terhubung pengguna ditemukan
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Section 1: User Profile */}
          <div className="space-y-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Informasi Pengguna</h3>
            
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Nama Lengkap</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  required
                  disabled={!isCardOnly}
                  placeholder="Contoh: Budi Santoso"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-10 pr-4 py-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">RFID UID Kartu</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none z-10">
                  <CreditCard size={16} />
                </span>
                {isCardOnly ? (
                  <select
                    required
                    value={rfidUid}
                    onChange={(e) => setRfidUid(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-10 pr-10 py-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all appearance-none cursor-pointer"
                  >
                    <option value="">-- Pilih Kartu RFID Terdaftar --</option>
                    {availableCards.map(c => (
                      <option key={c.id} value={c.card_no}>
                        {c.card_no}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    disabled
                    value={rfidUid}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-10 pr-4 py-3 text-sm font-semibold text-slate-400 focus:outline-none cursor-not-allowed"
                  />
                )}
                {isCardOnly && (
                  <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                    <ChevronDown size={16} />
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Jabatan / Role</label>
              <select
                value={role}
                disabled={!isCardOnly}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all cursor-pointer disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100 disabled:cursor-not-allowed"
              >
                <option value="student">Mahasiswa (Student)</option>
                <option value="staff">Staff / Karyawan</option>
                <option value="guest">Tamu (Guest)</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </div>

          {/* Section 2: Access Schedule */}
          <div className="space-y-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Jadwal & Hak Akses</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Jam Mulai</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <Clock size={16} />
                  </span>
                  <input
                    type="text"
                    required
                    disabled={!isCardOnly}
                    placeholder="08:00"
                    value={scheduleStart}
                    onChange={(e) => setScheduleStart(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-10 pr-4 py-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Jam Selesai</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <Clock size={16} />
                  </span>
                  <input
                    type="text"
                    required
                    disabled={!isCardOnly}
                    placeholder="17:00"
                    value={scheduleEnd}
                    onChange={(e) => setScheduleEnd(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-10 pr-4 py-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Masa Berlaku Kartu (Optional)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Calendar size={16} />
                </span>
                <input
                  type="date"
                  disabled={!isCardOnly}
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-10 pr-4 py-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all cursor-pointer disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Dashboard credentials for admins/staffs (Only during card registration mode) */}
            {isCardOnly && (role === 'admin' || role === 'staff') && (
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kredensial Login Dashboard</span>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons Step 1 */}
        <div className="pt-4 flex justify-end gap-3 border-t border-slate-50">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs transition-colors cursor-pointer"
          >
            Batal
          </button>
          
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleSaveUser(false)}
            className={
              isCardOnly
                ? "px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors shadow-sm shadow-emerald-600/10 cursor-pointer"
                : "px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            }
          >
            {isLoading ? 'Menyimpan...' : 'Simpan'}
          </button>

          {!isCardOnly && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleSaveUser(true)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm shadow-emerald-600/10 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Lanjut ke Registrasi Wajah</span>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
