/**
 * smart-room-access-frontend/src/components/AccessCardManager.tsx
 *
 * -> component untuk manajemen kartu akses rfid
 * -> menampilkan tabel kartu terdaftar (users) dan kartu belum terdaftar (dari logs)
 * -> menyediakan drawer sidebar kanan detail info kartu, 3 foto wajah, & tombol link registrasi
 * -> menggunakan tema minimalist putih hijau (emerald green)
 */

import React, { useState, useEffect } from 'react';
import { Search, ShieldCheck, ShieldAlert, CreditCard, User, Clock, Calendar, ArrowRight, X, Image as ImageIcon, Edit2, Key, Filter, ChevronDown, Plus, UserPlus, AlertCircle, ScanFace, RefreshCw, Trash2 } from 'lucide-react';

interface UserData {
  id: number;
  name: string;
  rfid_uid: string;
  role: 'admin' | 'staff' | 'student' | 'guest';
  schedule_start: string;
  schedule_end: string;
  valid_until: string | null;
}

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

interface AccessCardManagerProps {
  users: UserData[];
  logs: AccessLog[];
  token: string;
  onRegister: (uid: string) => void;
  onRefresh: () => void;
  onAddCredential?: () => void;
  onRegisterFace?: (uid: string) => void;
}

interface CardItem {
  id?: number | null;
  uid: string;
  name: string;
  role: string;
  status: 'registered' | 'unregistered';
  userId: number | null;
  scheduleStart?: string;
  scheduleEnd?: string;
  validUntil?: string | null;
}

export default function AccessCardManager({ users, logs, token, onRegister, onRefresh, onAddCredential, onRegisterFace }: AccessCardManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'registered' | 'unregistered'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedCard, setSelectedCard] = useState<CardItem | null>(null);
  const [cardPhotos, setCardPhotos] = useState<string[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  // Decoupled cards list state
  const [apiCards, setApiCards] = useState<CardItem[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);

  // Tambah Kartu Modal state
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [newCardUid, setNewCardUid] = useState('');
  const [newCardValidUntil, setNewCardValidUntil] = useState('');
  const [newCardUserId, setNewCardUserId] = useState<number | ''>('');
  const [addCardError, setAddCardError] = useState('');
  const [isAddingCard, setIsAddingCard] = useState(false);

  // function untuk memanggil endpoint list kartu
  const fetchCards = async () => {
    if (!token) return;
    setLoadingCards(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/cards`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        const mapped: CardItem[] = data.data.cards.map((c: any) => {
          const isBlocked = c.user_valid_until === '1970-01-01' || c.valid_until === '1970-01-01';
          return {
            id: c.id,
            uid: c.card_no, // Use card_no (plaintext) as uid
            name: c.user_name || 'Tidak Dikenal',
            role: c.user_role || 'TAMU',
            status: c.user_id ? 'registered' : 'unregistered',
            userId: c.user_id,
            scheduleStart: c.user_schedule_start,
            scheduleEnd: c.user_schedule_end,
            validUntil: isBlocked ? '1970-01-01' : (c.user_valid_until || c.valid_until)
          };
        });
        setApiCards(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch cards:', err);
    } finally {
      setLoadingCards(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, [token, users]);

  // function untuk memproses pemblokiran kartu via API
  const handleBlockCard = async (cardId: number, block: boolean) => {
    setIsSaving(true);
    setEditError('');
    try {
      const payload = {
        valid_until: block ? '1970-01-01' : null
      };

      const res = await fetch(`${API_URL}/api/v1/cards/${cardId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        if (selectedCard) {
          setSelectedCard({
            ...selectedCard,
            validUntil: block ? '1970-01-01' : null
          });
        }
        await fetchCards();
        onRefresh();
      } else {
        setEditError(data.message || 'Gagal mengubah status blokir');
      }
    } catch (err) {
      console.error('Failed to change block status:', err);
      setEditError('Gagal menghubungi server');
    } finally {
      setIsSaving(false);
    }
  };

  // function untuk memproses registrasi kartu baru (RFID UID saja)
  const handleCreateCard = async () => {
    if (!newCardUid.trim()) return setAddCardError('RFID UID wajib diisi');
    setIsAddingCard(true);
    setAddCardError('');

    try {
      const payload = {
        rfid_uid: newCardUid.trim(),
        valid_until: newCardValidUntil || null
      };

      const res = await fetch(`${API_URL}/api/v1/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        if (newCardUserId !== '') {
          await fetch(`${API_URL}/api/v1/users/${newCardUserId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ rfid_uid: newCardUid.trim() })
          });
        }
        setIsAddCardOpen(false);
        setNewCardUid('');
        setNewCardValidUntil('');
        setNewCardUserId('');
        await fetchCards();
        onRefresh();
      } else {
        setAddCardError(data.message || 'Gagal mendaftarkan kartu');
      }
    } catch (err) {
      console.error('Add card error:', err);
      setAddCardError('Gagal terhubung ke server');
    } finally {
      setIsAddingCard(false);
    }
  };

  // function untuk menghapus kartu fisik dari database
  const handleDeleteCard = async (cardId: number, cardName: string) => {
    if (!window.confirm(`Hapus kartu fisik milik ${cardName}? Akun user tidak akan terhapus.`)) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/cards/${cardId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        if (selectedCard?.id === cardId) setSelectedCard(null);
        await fetchCards();
        onRefresh();
      } else {
        alert(data.message || 'Gagal menghapus kartu');
      }
    } catch (err) {
      console.error('Failed to delete card:', err);
      alert('Gagal menghubungi server');
    }
  };

  // Filter log akses untuk kartu yang sedang terpilih
  const cardLogs = selectedCard
    ? logs.filter((log) => log.uid.trim().toUpperCase() === selectedCard.uid.trim().toUpperCase())
    : [];

  const [isEditingAccess, setIsEditingAccess] = useState(false);
  const [isEditingCredential, setIsEditingCredential] = useState(false);
  const [editCredentialUserId, setEditCredentialUserId] = useState<number | ''>('');

  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'staff' | 'student' | 'guest'>('guest');
  const [editScheduleStart, setEditScheduleStart] = useState('08:00');
  const [editScheduleEnd, setEditScheduleEnd] = useState('17:00');
  const [editValidUntil, setEditValidUntil] = useState('');
  const [editRfidUid, setEditRfidUid] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Reset status edit saat kartu terpilih berubah
  React.useEffect(() => {
    setIsEditingAccess(false);
    setIsEditingCredential(false);
    setEditError('');
  }, [selectedCard]);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://smart-room-access-backend-196827089960.asia-southeast2.run.app';

  // function untuk mengedit hak akses user
  // output: void
  const handleSaveAccess = async () => {
    if (!selectedCard || !selectedCard.userId) return;
    setIsSaving(true);
    setEditError('');

    try {
      const payload = {
        role: editRole,
        schedule_start: editScheduleStart,
        schedule_end: editScheduleEnd,
        valid_until: editValidUntil || null
      };

      const res = await fetch(`${API_URL}/api/v1/users/${selectedCard.userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        setSelectedCard({
          ...selectedCard,
          role: editRole,
          scheduleStart: editScheduleStart,
          scheduleEnd: editScheduleEnd,
          validUntil: editValidUntil || null
        });
        setIsEditingAccess(false);
        onRefresh();
        fetchCards();
      } else {
        setEditError(data.message || 'Gagal menyimpan perubahan');
      }
    } catch (err: any) {
      console.error('Save access error:', err);
      setEditError('Gagal menghubungi server');
    } finally {
      setIsSaving(false);
    }
  };

  // function untuk mengedit kredensial kartu user
  // output: void
  const handleSaveCredential = async () => {
    if (!selectedCard) return;

    setIsSaving(true);
    setEditError('');

    try {
      if (editCredentialUserId !== '') {
        const res = await fetch(`${API_URL}/api/v1/users/${editCredentialUserId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ rfid_uid: selectedCard.uid })
        });
        const data = await res.json();
        if (!data.success) {
          setEditError(data.message || 'Gagal memindahkan kartu');
          return;
        }
      } else if (selectedCard.userId) {
        const res = await fetch(`${API_URL}/api/v1/users/${selectedCard.userId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ rfid_uid: null })
        });
        const data = await res.json();
        if (!data.success) {
          setEditError(data.message || 'Gagal melepas kartu');
          return;
        }
      }

      const targetUser = users.find(u => u.id === editCredentialUserId);
      setSelectedCard({
        ...selectedCard,
        name: targetUser ? targetUser.name : 'Tidak Dikenal',
        role: targetUser ? targetUser.role : 'TAMU',
        status: editCredentialUserId !== '' ? 'registered' : 'unregistered',
        userId: editCredentialUserId !== '' ? editCredentialUserId : null
      });
      setIsEditingCredential(false);
      onRefresh();
      await fetchCards();
    } catch (err: any) {
      console.error('Save credential error:', err);
      setEditError('Gagal menghubungi server');
    } finally {
      setIsSaving(false);
    }
  };

  const startEditAccess = () => {
    if (!selectedCard) return;
    setEditRole(selectedCard.role as any);
    setEditScheduleStart(selectedCard.scheduleStart || '08:00');
    setEditScheduleEnd(selectedCard.scheduleEnd || '17:00');
    setEditValidUntil(selectedCard.validUntil ? selectedCard.validUntil.split('T')[0] : '');
    setEditError('');
    setIsEditingAccess(true);
    setIsEditingCredential(false);
  };

  const startEditCredential = () => {
    if (!selectedCard) return;
    setEditCredentialUserId(selectedCard.userId || '');
    setEditError('');
    setIsEditingCredential(true);
    setIsEditingAccess(false);
  };

  React.useEffect(() => {
    if (selectedCard && selectedCard.status === 'registered' && selectedCard.userId) {
      setLoadingPhotos(true);
      fetch(`${API_URL}/api/v1/face/photos/${selectedCard.userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new TypeError("Response was not JSON!");
        }
        return res.json();
      })
      .then(resData => {
        if (resData.success && resData.data && resData.data.photos && resData.data.photos.length > 0) {
          setCardPhotos(resData.data.photos);
        } else {
          // Fallback ke localStorage atau demo photos
          const stored = localStorage.getItem(`user_photos_${selectedCard.userId}`);
          if (stored) {
            setCardPhotos(JSON.parse(stored));
          } else {
            setCardPhotos(['/face_demo_one.png', '/face_demo_two.png', '/face_demo_three.png']);
          }
        }
      })
      .catch(err => {
        console.warn('Fallback to local storage/demo images because API fetch failed:', err.message);
        // Fallback
        const stored = localStorage.getItem(`user_photos_${selectedCard.userId}`);
        if (stored) {
          setCardPhotos(JSON.parse(stored));
        } else {
          setCardPhotos(['/face_demo_one.png', '/face_demo_two.png', '/face_demo_three.png']);
        }
      })
      .finally(() => {
        setLoadingPhotos(false);
      });
    } else {
      setCardPhotos([]);
    }
  }, [selectedCard, token]);

  // helper --------------------------------------------------------------------------

  // function untuk menggabungkan kartu dari database (apiCards) dan logs (unregistered yang baru tap)
  // output : array of CardItem
  const getCombinedCards = (): CardItem[] => {
    const cardsMap = new Map<string, CardItem>();

    // 1. Tambahkan semua kartu dari database
    apiCards.forEach(card => {
      cardsMap.set(card.uid.toUpperCase(), card);
    });

    // 2. Tambahkan kartu dari logs yang belum terdaftar di database
    logs.forEach(log => {
      const normLogUid = log.uid.trim().toUpperCase();
      if (!normLogUid) return;

      // Jika kartu tidak ada di cardsMap dan log.user_id adalah null
      if (!log.user_id && !cardsMap.has(normLogUid)) {
        cardsMap.set(normLogUid, {
          uid: normLogUid,
          name: 'Tidak Dikenal',
          role: 'TAMU',
          status: 'unregistered',
          userId: null
        });
      }
    });

    return Array.from(cardsMap.values());
  };

  // function untuk mengambil foto wajah pengguna dari localStorage
  // input param : userId -> number atau null
  // output      : array of strings (URL/Base64 foto)
  const getUserPhotos = (userId: number | null): string[] => {
    if (!userId) return [];
    try {
      const stored = localStorage.getItem(`user_photos_${userId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse stored user photos', e);
    }
    // Fallback ke demo photos jika data tidak ditemukan (misal user dari seeder DB)
    return ['/face_demo_one.png', '/face_demo_two.png', '/face_demo_three.png'];
  };

  // function untuk memformat waktu tap RFID ke format lokal
  // input param : dateString -> ISO string
  // output      : string format HH.MM.SS
  const formatLogTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${hours}.${minutes}.${seconds}`;
    } catch (e) {
      return dateString;
    }
  };

  // function untuk memformat tanggal ke format lokal singkat
  // input param : dateString -> ISO string
  // output      : string format DD/MM/YYYY
  const formatLogDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      return '';
    }
  };

  // end of helper ------------------------------------------------------------------

  const cardsList = getCombinedCards();

  // Filter list kartu berdasarkan query pencarian, tab filter, dan filter role
  const filteredCards = cardsList.filter((card) => {
    const matchesSearch =
      card.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.uid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.role.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'registered' && card.status === 'registered') ||
      (statusFilter === 'unregistered' && card.status === 'unregistered');

    const matchesRole =
      roleFilter === 'all' ||
      card.role.toLowerCase() === roleFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesRole;
  });

  // Urutkan list kartu secara alfabetis berdasarkan nama (asc/desc)
  const sortedCards = [...filteredCards].sort((a, b) => {
    const nameA = a.name.toLowerCase();
    const nameB = b.name.toLowerCase();
    if (nameA < nameB) return sortOrder === 'asc' ? -1 : 1;
    if (nameA > nameB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="relative flex min-h-[500px] gap-8 items-stretch">
      {/* Left: Main Cards Table Container */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm flex flex-col justify-between">
        
        {/* Table Header Filter & Search */}
        <div className="px-6 py-5 border-b border-slate-50 flex flex-col gap-4 bg-white">
          {/* button aksi cepat - tambah kartu dan tambah kredensial user */}
          <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
            <button
              onClick={() => setIsAddCardOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-emerald-600/10 cursor-pointer"
            >
              <Plus size={14} />
              <span>Tambah Kartu</span>
            </button>
            <button
              onClick={onAddCredential}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <UserPlus size={14} className="text-slate-400" />
              <span>Tambah Kredensial User</span>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 tracking-tight text-base">Manajemen Kartu Akses</h3>
              <p className="text-slate-400 text-xs mt-0.5">Daftar kartu RFID terdaftar beserta status registrasi pengguna</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  fetchCards();
                  onRefresh();
                }}
                disabled={loadingCards}
                className={`p-2 hover:bg-slate-50 text-slate-400 hover:text-emerald-600 rounded-xl transition-all ${
                  loadingCards ? 'animate-spin text-emerald-600' : ''
                }`}
                title="Refresh Data Kartu"
              >
                <RefreshCw size={16} />
              </button>
              <div className="text-slate-400 p-2">
                <CreditCard size={16} />
              </div>
            </div>
          </div>

          {/* Filters and Search Bar Row */}
          <div className="flex flex-col gap-4 pt-1">
            {/* Row 1: Search & Status Tabs */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              {/* Search Input */}
              <div className="relative w-full sm:w-80">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  placeholder="Cari nama, RFID, jabatan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all"
                />
              </div>

              {/* Status Tabs */}
              <div className="flex bg-slate-50 p-0.5 rounded-xl border border-slate-100 w-full sm:w-auto justify-center">
                {(['all', 'registered', 'unregistered'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-[10px] font-bold tracking-wide capitalize transition-all ${
                      statusFilter === filter
                        ? 'bg-white text-emerald-700 shadow-sm border-slate-200/50'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {filter === 'all' ? 'Semua' : filter === 'registered' ? 'Terdaftar' : 'Belum Terdaftar'}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 2: Role & Sorting Selects, with Stats Counters */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-t border-slate-50 pt-3">
              {/* Filter and Sorting Group on the Left */}
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-1">
                  <Filter size={12} className="text-slate-400" />
                  <span>Filter:</span>
                </span>

                {/* Role Filter Selector */}
                <div className="relative">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="appearance-none bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-600 rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
                  >
                    <option value="all">Semua Jabatan</option>
                    <option value="student">Mahasiswa</option>
                    <option value="staff">Staff</option>
                    <option value="guest">Guest</option>
                    <option value="admin">Admin</option>
                    <option value="TAMU">Tamu (Belum Terdaftar)</option>
                  </select>
                  <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
                    <ChevronDown size={12} />
                  </span>
                </div>

                {/* Sort Selector */}
                <div className="relative">
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                    className="appearance-none bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-600 rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
                  >
                    <option value="asc">Urutan: A-Z (Asc)</option>
                    <option value="desc">Urutan: Z-A (Desc)</option>
                  </select>
                  <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
                    <ChevronDown size={12} />
                  </span>
                </div>
              </div>

              {/* Stats Summary on the Right */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1.5">Ringkasan:</span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold bg-slate-50 text-slate-500 border border-slate-100">
                    Total: {filteredCards.length}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                    Terdaftar: {filteredCards.filter(c => c.status === 'registered').length}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                    Belum Terdaftar: {filteredCards.filter(c => c.status === 'unregistered').length}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold bg-red-50 text-red-700 border border-red-100">
                    Diblokir: {filteredCards.filter(c => c.status === 'registered' && c.validUntil === '1970-01-01').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cards Table List */}
        <div className="overflow-x-auto flex-grow">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50">
                <th className="py-3.5 px-6">Nama Pengguna</th>
                <th className="py-3.5 px-6">RFID UID Kredensial</th>
                <th className="py-3.5 px-6">Jabatan / Role</th>
                <th className="py-3.5 px-6">Jadwal Akses</th>
                <th className="py-3.5 px-6 text-center">Status</th>
                <th className="py-3.5 px-6 text-center">Hapus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedCards.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400 text-sm">
                    Tidak ada kartu RFID yang ditemukan.
                  </td>
                </tr>
              ) : (
                sortedCards.map((card) => {
                  const isReg = card.status === 'registered';
                  const isSelected = selectedCard?.uid === card.uid;

                  return (
                    <tr
                      key={card.uid}
                      onClick={() => setSelectedCard(card)}
                      className={`group cursor-pointer transition-colors duration-150 text-sm ${
                        isSelected ? 'bg-emerald-50/20' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      {/* Name */}
                      <td className="py-4 px-6 font-semibold text-slate-700">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            isReg ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {card.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{card.name}</span>
                        </div>
                      </td>

                      {/* RFID UID Button */}
                      <td className="py-4 px-6">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCard(card);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 font-mono text-xs font-semibold border border-slate-100 transition-colors"
                        >
                          {card.uid}
                        </button>
                      </td>

                      {/* Role */}
                      <td className="py-4 px-6">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                          {card.role.toUpperCase()}
                        </span>
                      </td>

                      {/* Schedule */}
                      <td className="py-4 px-6 text-slate-500 font-medium text-xs">
                        {isReg && card.scheduleStart && card.scheduleEnd ? (
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} className="text-slate-400" />
                            <span>{card.scheduleStart} - {card.scheduleEnd} WIB</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Status clickable badge */}
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCard(card);
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:scale-102 ${
                            isReg
                              ? card.validUntil === '1970-01-01'
                                ? 'bg-red-50 text-red-700 border border-red-100'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}
                        >
                          {isReg ? (
                            card.validUntil === '1970-01-01' ? (
                              <>
                                <X size={13} className="text-red-600" />
                                <span>Diblokir</span>
                              </>
                            ) : (
                              <>
                                <ShieldCheck size={13} />
                                <span>Terdaftar</span>
                              </>
                            )
                          ) : (
                            <>
                              <ShieldAlert size={13} />
                              <span>Belum Terdaftar</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {isReg && card.id ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCard(card.id!, card.name);
                            }}
                            className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all hover:scale-105 cursor-pointer inline-flex items-center justify-center"
                            title="Hapus Kartu Fisik"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : (
                          <span className="text-slate-300 font-bold">-</span>
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
      {selectedCard && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-xs z-40 transition-opacity duration-300"
          onClick={() => setSelectedCard(null)}
        />
      )}

      {/* Right Slide-in Detail Sidebar (Drawer Popup) */}
      {selectedCard && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-4/5 md:w-3/5 bg-white shadow-2xl border-l border-slate-100 p-8 flex flex-col h-full z-50 animate-in slide-in-from-right duration-300">
          
          {/* Header Row with Close Button on Top Left */}
          <div className="flex items-center gap-4 border-b border-slate-50 pb-5 mb-6">
            <button
              onClick={() => setSelectedCard(null)}
              className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-700 rounded-xl transition-colors flex-shrink-0"
              title="Tutup Detail"
            >
              <X size={18} />
            </button>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none">Detail Kredensial Kartu</span>
              <h4 className="font-mono font-bold text-slate-800 text-base mt-1 flex items-center gap-2">
                <CreditCard size={16} className="text-slate-400" />
                <span>{selectedCard.uid}</span>
              </h4>
            </div>
          </div>

          {/* Drawer Body - Split Layout */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-8 overflow-y-auto pr-2">
            
             {/* Left Section: Meta details (3/5 width) */}
             <div className="md:col-span-3 space-y-6">
               {/* Edit Buttons Row */}
               {selectedCard.status === 'registered' && !isEditingAccess && !isEditingCredential && (
                  <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-4 mb-4">
                    {selectedCard.userId && (
                      <>
                         <button
                          onClick={startEditAccess}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 border border-emerald-100/60 rounded-xl text-[10px] font-bold hover:scale-102 transition-all cursor-pointer"
                        >
                          <Edit2 size={11} />
                          <span>Edit Akses</span>
                        </button>
                        <button
                          onClick={startEditCredential}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 border border-emerald-100/60 rounded-xl text-[10px] font-bold hover:scale-102 transition-all cursor-pointer"
                        >
                          <Key size={11} />
                          <span>Edit Kredensial</span>
                        </button>
                        {onRegisterFace && (
                          <button
                            onClick={() => onRegisterFace(selectedCard.uid)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 border border-emerald-100/60 rounded-xl text-[10px] font-bold hover:scale-102 transition-all cursor-pointer"
                          >
                            <ScanFace size={11} />
                            <span>Registrasi Wajah</span>
                          </button>
                        )}
                      </>
                    )}
                    {selectedCard.id && (
                      <button
                        onClick={() => handleBlockCard(selectedCard.id!, selectedCard.validUntil !== '1970-01-01')}
                        disabled={isSaving}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold hover:scale-102 transition-all cursor-pointer ${
                          selectedCard.validUntil === '1970-01-01'
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100/60'
                            : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-100/60'
                        }`}
                      >
                        {selectedCard.validUntil === '1970-01-01' ? <ShieldCheck size={11} /> : <X size={11} />}
                        <span>{selectedCard.validUntil === '1970-01-01' ? 'Buka Blokir' : 'Blokir Kartu'}</span>
                      </button>
                    )}
                  </div>
               )}
              {isEditingCredential ? (
                <div className="space-y-4 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 block tracking-wide uppercase leading-none mb-1">Edit Kredensial Kartu</span>
                  
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Pilih Pemegang Kartu (Swap User)</label>
                      <select
                        value={editCredentialUserId}
                        onChange={(e) => setEditCredentialUserId(e.target.value ? Number(e.target.value) : '')}
                        className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                      >
                        <option value="">-- Tanpa Pemilik (Lepas Kartu) --</option>
                        {selectedCard.userId && (
                          <option value={selectedCard.userId}>
                            {selectedCard.name} (Pemilik Saat Ini)
                          </option>
                        )}
                        {users.filter(u => !u.rfid_uid && u.id !== selectedCard.userId).map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.role.toUpperCase()})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">RFID UID Kredensial (Fixed)</label>
                      <input
                        type="text"
                        value={selectedCard.uid}
                        disabled
                        className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 font-mono text-xs font-semibold text-slate-500 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {editError && <p className="text-[10px] font-bold text-red-500 mt-1">{editError}</p>}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleSaveCredential}
                      disabled={isSaving}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex-1 cursor-pointer"
                    >
                      {isSaving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                    <button
                      onClick={() => setIsEditingCredential(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all flex-1 cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : isEditingAccess ? (
                <div className="space-y-4 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 block tracking-wide uppercase leading-none mb-1">Edit Hak & Masa Akses</span>
                  
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Jabatan / Role</label>
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as any)}
                        className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                      >
                        <option value="student">Mahasiswa</option>
                        <option value="staff">Staff</option>
                        <option value="guest">Guest</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Jam Mulai</label>
                        <input
                          type="text"
                          value={editScheduleStart}
                          onChange={(e) => setEditScheduleStart(e.target.value)}
                          className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          placeholder="08:00"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Jam Selesai</label>
                        <input
                          type="text"
                          value={editScheduleEnd}
                          onChange={(e) => setEditScheduleEnd(e.target.value)}
                          className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          placeholder="17:00"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Berlaku Hingga</label>
                      <input
                        type="date"
                        value={editValidUntil}
                        onChange={(e) => setEditValidUntil(e.target.value)}
                        className="w-full bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                      />
                    </div>
                  </div>

                  {editError && <p className="text-[10px] font-bold text-red-500 mt-1">{editError}</p>}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleSaveAccess}
                      disabled={isSaving}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex-1 cursor-pointer"
                    >
                      {isSaving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                    <button
                      onClick={() => setIsEditingAccess(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all flex-1 cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Status Info */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block tracking-wide uppercase leading-none mb-2">Status Registrasi</span>
                    {selectedCard.status === 'registered' && selectedCard.validUntil === '1970-01-01' ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-100">
                        <X size={13} />
                        <span>KARTU DIBLOKIR</span>
                      </div>
                    ) : (
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                        selectedCard.status === 'registered'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {selectedCard.status === 'registered' ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
                        <span>{selectedCard.status === 'registered' ? 'Terdaftar ke User' : 'Belum Terdaftar'}</span>
                      </div>
                    )}
                  </div>

                  {/* Profile Info */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block tracking-wide uppercase leading-none mb-2">Pemegang Kartu</span>
                    <div className="flex items-center gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-50">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                        selectedCard.status === 'registered' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-400'
                      }`}>
                        <User size={18} />
                      </div>
                      <div>
                        <span className="font-bold text-slate-700 block text-sm leading-tight">{selectedCard.name}</span>
                        <span className="text-[9px] font-bold text-slate-400 block uppercase mt-0.5 tracking-wider leading-none">
                          {selectedCard.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Access Schedule Info */}
                  {selectedCard.status === 'registered' && selectedCard.scheduleStart && (
                    <div className="space-y-4">
                      <span className="text-[10px] font-bold text-slate-400 block tracking-wide uppercase leading-none">Hak & Masa Akses</span>
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2.5 text-xs text-slate-600">
                          <Clock size={14} className="text-slate-400 flex-shrink-0" />
                          <div>
                            <span className="text-[9px] font-semibold text-slate-400 block uppercase leading-none">Jadwal Harian</span>
                            <span className="font-bold text-slate-700 mt-0.5 block">{selectedCard.scheduleStart} - {selectedCard.scheduleEnd} WIB</span>
                          </div>
                        </div>

                        {selectedCard.validUntil && (
                          <div className="flex items-center gap-2.5 text-xs text-slate-600">
                            <Calendar size={14} className="text-slate-400 flex-shrink-0" />
                            <div>
                              <span className="text-[9px] font-semibold text-slate-400 block uppercase leading-none">Berlaku Hingga</span>
                              {selectedCard.validUntil === '1970-01-01' ? (
                                <span className="font-bold text-red-600 mt-0.5 block">
                                  KARTU DIBLOKIR
                                </span>
                              ) : (
                                <span className="font-bold text-slate-700 mt-0.5 block">
                                  {new Date(selectedCard.validUntil).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                  })}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Riwayat Akses Kartu */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block tracking-wide uppercase leading-none">Riwayat Akses Kartu</span>
                <div className="overflow-x-auto border border-slate-100 rounded-2xl bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        <th className="py-2.5 px-3">Waktu</th>
                        <th className="py-2.5 px-3">Pemegang</th>
                        <th className="py-2.5 px-3">Ruangan</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {cardLogs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400 text-[11px] leading-relaxed">
                            Belum ada riwayat aktivitas tap untuk kartu ini
                          </td>
                        </tr>
                      ) : (
                        cardLogs.slice(0, 5).map((log) => {
                          const isAllowed = log.status === 'allowed';
                          return (
                            <tr key={log.id} className="hover:bg-slate-50/40 transition-colors">
                              <td className="py-3 px-3 whitespace-nowrap">
                                <span className="block font-semibold text-slate-700 leading-tight">{formatLogTime(log.access_time)} WIB</span>
                                <span className="text-[9px] font-bold text-slate-400 block mt-0.5">{formatLogDate(log.access_time)}</span>
                              </td>
                              <td className="py-3 px-3 font-semibold text-slate-700 whitespace-nowrap">
                                {log.user_name || 'Tidak Dikenal'}
                              </td>
                              <td className="py-3 px-3 text-slate-500 font-medium truncate max-w-[80px] leading-tight" title={log.room}>
                                {log.room}
                              </td>
                              <td className="py-3 px-3 text-center whitespace-nowrap">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase ${
                                  isAllowed ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/60' : 'bg-red-50 text-red-700 border border-red-100/60'
                                }`}>
                                  {isAllowed ? 'Allowed' : 'Denied'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Section: Photos or Action Prompt (2/5 width) */}
            <div className="md:col-span-2 space-y-6 border-t md:border-t-0 md:border-l border-slate-100 md:pl-8 pt-6 md:pt-0 flex flex-col">
              {selectedCard.status === 'registered' ? (
                <div className="space-y-4 flex flex-col h-full">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block tracking-wide uppercase leading-none mb-3">Foto Wajah Terdaftar (InsightFace)</span>
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
                        {cardPhotos.map((photoUrl, idx) => (
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
                </div>
              ) : (
                // Unregistered Layout
                <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                    <ShieldAlert size={28} />
                  </div>
                  <h5 className="font-bold text-slate-700 text-base">Kartu Belum Didaftarkan</h5>
                  <p className="text-slate-400 text-xs mt-2 max-w-[280px] leading-relaxed">
                    Kartu RFID ini terdeteksi melakukan tapping, tetapi kodenya belum terdaftar ke akun pengguna mana pun di database.
                  </p>

                  <button
                    onClick={() => onRegister(selectedCard.uid)}
                    className="mt-8 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs tracking-wider shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/25 transition-all duration-150 flex items-center justify-center gap-2 group"
                  >
                    <span>Daftarkan ke User Baru</span>
                    <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
      {/* Modal Tambah Kartu */}
      {isAddCardOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-5">
              <h4 className="font-bold text-slate-800 text-base">Registrasi Kartu RFID Baru</h4>
              <button
                onClick={() => {
                  setIsAddCardOpen(false);
                  setNewCardUid('');
                  setNewCardValidUntil('');
                  setAddCardError('');
                }}
                className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1.5">RFID UID (Plaintext)</label>
                <input
                  type="text"
                  placeholder="Contoh: 7B E6 40 02"
                  value={newCardUid}
                  onChange={(e) => setNewCardUid(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-semibold font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1.5">Masa Berlaku (Opsional)</label>
                <input
                  type="date"
                  value={newCardValidUntil}
                  onChange={(e) => setNewCardValidUntil(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all cursor-pointer"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1.5">Tetapkan ke User Terdaftar (Opsional)</label>
                <select
                  value={newCardUserId}
                  onChange={(e) => setNewCardUserId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="">-- Tanpa Pemilik (Kartu Menganggur) --</option>
                  {users.filter(u => !u.rfid_uid).map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              {addCardError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-2xl border border-red-100 text-[11px] font-bold leading-tight">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  <span>{addCardError}</span>
                </div>
              )}

              <button
                onClick={handleCreateCard}
                disabled={isAddingCard}
                className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-2xl font-bold text-xs tracking-wider shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/25 transition-all duration-150 flex items-center justify-center gap-1.5"
              >
                {isAddingCard ? 'Memproses...' : 'Daftarkan Kartu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
