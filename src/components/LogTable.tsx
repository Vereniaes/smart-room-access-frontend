/**
 * smart-room-access-frontend/src/components/LogTable.tsx
 *
 * -> component for showing access logs table with integrated search and filters
 * -> menyediakan interaktivitas klik baris untuk load ke panel preview
 * -> menggunakan tema minimalist putih hijau (emerald green)
 */

import React, { useState, useEffect } from 'react';
import { Eye, ArrowRightLeft, ShieldAlert, ShieldCheck, Search } from 'lucide-react';

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

interface LogTableProps {
  logs: AccessLog[];
  selectedLogId: number | null;
  onSelectLog: (log: AccessLog) => void;
}

export default function LogTable({ logs, selectedLogId, onSelectLog }: LogTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'allowed' | 'denied'>('all');
  const [pageSize, setPageSize] = useState<number>(10);
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'yesterday' | 'week'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter logs based on query and selections
  const filteredLogs = logs.filter((log) => {
    // 1. Search Query
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      const matchName = log.user_name?.toLowerCase().includes(query) || false;
      const matchUid = log.uid.toLowerCase().includes(query);
      const matchRoom = log.room.toLowerCase().includes(query);
      if (!matchName && !matchUid && !matchRoom) {
        return false;
      }
    }

    // 2. Status Filter
    if (statusFilter !== 'all') {
      if (log.status !== statusFilter) {
        return false;
      }
    }

    // 3. Time Filter
    if (timeFilter !== 'all') {
      const logDate = new Date(log.access_time);
      const now = new Date();
      
      if (timeFilter === 'today') {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (logDate < todayStart) return false;
      } else if (timeFilter === 'yesterday') {
        const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (logDate < yesterdayStart || logDate >= yesterdayEnd) return false;
      } else if (timeFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (logDate < weekAgo) return false;
      }
    }

    return true;
  });

  // Calculate total pages
  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;

  // Paginated logs
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * pageSize,
    (currentPage - 1) * pageSize + pageSize
  );

  // Reset page to 1 on any filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, timeFilter, pageSize, logs.length]);

  // helper --------------------------------------------------------------------------

  // memformat waktu tap RFID ke format lokal dengan titik
  // input param: dateString -> ISO string
  // output: string format HH.MM.SS
  const formatTime = (dateString: string) => {
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

  // memformat tanggal ke format lokal singkat
  // input param: dateString -> ISO string
  // output: string format DD/MM/YYYY
  const formatDate = (dateString: string) => {
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

  // helper untuk menghasilkan subset nomor halaman yang ditampilkan
  // output: array of numbers (nomor halaman)
  const getPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  };

  // end of helper ------------------------------------------------------------------

  return (
    <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm flex flex-col h-full">
      {/* Header Panel with Integrated Search and Filters */}
      <div className="px-6 py-5 border-b border-slate-50 flex flex-col gap-4 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 tracking-tight text-base">Aktivitas Terbaru</h3>
            <p className="text-slate-400 text-xs mt-0.5">Daftar tapping kartu RFID secara real-time</p>
          </div>
          <div className="text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowRightLeft size={16} />
          </div>
        </div>

        {/* Filters and Search Bar Container */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between pt-1">
          {/* Search Input */}
          <div className="relative w-full md:w-64">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Cari nama, RFID, ruangan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all"
            />
          </div>

          {/* Filter Group */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
            {/* Status Tabs */}
            <div className="flex bg-slate-50 p-0.5 rounded-xl border border-slate-100">
              {(['all', 'allowed', 'denied'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wide capitalize transition-all ${
                    statusFilter === tab
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab === 'all' ? 'Semua' : tab === 'allowed' ? 'Diterima' : 'Ditolak'}
                </button>
              ))}
            </div>

            {/* Time Filter */}
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-500 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
            >
              <option value="all">Semua Waktu</option>
              <option value="today">Hari Ini</option>
              <option value="yesterday">Kemarin</option>
              <option value="week">1 Minggu Terakhir</option>
            </select>

            {/* Page Size Filter */}
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-500 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
            >
              <option value={10}>10 Baris</option>
              <option value={30}>30 Baris</option>
              <option value={50}>50 Baris</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Area */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50">
              <th className="py-3.5 px-6">User / Pemegang</th>
              <th className="py-3.5 px-6">RFID UID</th>
              <th className="py-3.5 px-6">Ruangan</th>
              <th className="py-3.5 px-6">Status</th>
              <th className="py-3.5 px-6">Waktu</th>
              <th className="py-3.5 px-6 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paginatedLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                  Tidak ada data log akses yang ditemukan.
                </td>
              </tr>
            ) : (
              paginatedLogs.map((log) => {
                const isAllowed = log.status === 'allowed';
                const isSelected = selectedLogId === log.id;
                const displayName = log.user_name || 'User Tidak Terdaftar';
                const displayRole = log.user_role ? log.user_role.toUpperCase() : 'TAMU';

                return (
                  <tr
                    key={log.id}
                    onClick={() => onSelectLog(log)}
                    className={`group cursor-pointer transition-colors duration-150 text-sm ${
                      isSelected 
                        ? 'bg-emerald-50/30' 
                        : 'hover:bg-slate-50/60'
                    }`}
                  >
                    {/* User Info */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                          isAllowed
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-700'
                        }`}>
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700 block max-w-[150px] truncate">
                            {displayName}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 block tracking-wide uppercase mt-0.5">
                            {displayRole}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* RFID UID */}
                    <td className="py-4 px-6 font-mono text-xs font-semibold text-slate-500">
                      <span className="truncate block max-w-[90px]" title={log.uid}>
                        {log.uid}
                      </span>
                    </td>

                    {/* Room Name */}
                    <td className="py-4 px-6 text-slate-600 font-medium truncate max-w-[120px]">
                      {log.room}
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-6">
                      <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        isAllowed
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700'
                      }`}>
                        {isAllowed ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                        <span>{isAllowed ? 'Allowed' : 'Denied'}</span>
                      </div>
                    </td>

                    {/* Time & Date */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className="font-semibold text-slate-700 block">
                        {formatTime(log.access_time)}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 block mt-0.5">
                        {formatDate(log.access_time)}
                      </span>
                    </td>

                    {/* Action Button */}
                    <td className="py-4 px-6 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onSelectLog(log)}
                        className={`p-2 rounded-xl transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                            : 'bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                        }`}
                        title="Preview Log Detail"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-slate-50 flex items-center justify-center bg-slate-50/20">
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-100 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-all"
            >
              Prev
            </button>

            {getPageNumbers().map((page, idx) => {
              if (page < 0) {
                return (
                  <span key={`ellipsis-${idx}`} className="px-2.5 text-slate-400 text-xs font-bold select-none">
                    ...
                  </span>
                );
              }
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                    currentPage === page
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                      : 'bg-white border border-slate-100 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              );
            })}

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-100 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
