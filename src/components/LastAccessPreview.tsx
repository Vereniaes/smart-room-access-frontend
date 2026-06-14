/**
 * smart-room-access-frontend/src/components/LastAccessPreview.tsx
 *
 * -> component for showing the last rfid tap details & photo preview
 * -> menggunakan tema minimalist putih hijau (emerald green)
 */

import React from 'react';
import { User, MapPin, CreditCard, Clock, CheckCircle2, AlertTriangle, Image as ImageIcon } from 'lucide-react';

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

interface LastAccessPreviewProps {
  log: AccessLog | null;
  layout?: 'horizontal' | 'vertical';
}

export default function LastAccessPreview({ log, layout = 'vertical' }: LastAccessPreviewProps) {
  // helper --------------------------------------------------------------------------
  
  // function untuk memformat waktu tap RFID ke format lokal WIB dengan titik
  // input param: dateString -> ISO string tanggal
  // output: string format HH.MM.SS WIB
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${hours}.${minutes}.${seconds} WIB`;
    } catch (e) {
      return dateString;
    }
  };

  // function untuk memformat tanggal ke format lengkap Indonesia
  // input param: dateString -> ISO string tanggal
  // output: string format "1 Juni 2026"
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const day = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${day} ${month} ${year}`;
    } catch (e) {
      return '';
    }
  };

  // end of helper ------------------------------------------------------------------

  if (!log) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm h-full flex flex-col gap-6">
        <div className="border-b border-slate-50 pb-3 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {layout === 'horizontal' ? 'Tap Terakhir Masuk (Real-time)' : 'Detail Akses Terpilih (Preview)'}
          </span>
        </div>
        <div className="flex-grow flex flex-col items-center justify-center text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 mb-4 animate-pulse">
            <ImageIcon size={28} />
          </div>
          <h3 className="font-semibold text-slate-700">Belum Ada Aktivitas</h3>
          <p className="text-slate-400 text-xs mt-1 max-w-[240px]">
            Menunggu aktivitas tap kartu RFID dari perangkat IoT untuk ditampilkan.
          </p>
        </div>
      </div>
    );
  }

  const isAllowed = log.status === 'allowed';
  const displayName = log.user_name || 'Tidak Dikenal';
  const roleName = log.user_role ? log.user_role.toUpperCase() : 'TAMU / GUEST';

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm h-full flex flex-col gap-5">
      {/* Top: Card Header inside container */}
      <div className="border-b border-slate-50 pb-3 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {layout === 'horizontal' ? 'Tap Terakhir Masuk (Real-time)' : 'Detail Akses Terpilih (Preview)'}
        </span>
      </div>

      {/* Main Content Area */}
      <div className={`flex flex-1 ${
        layout === 'horizontal' ? 'flex-col md:flex-row gap-6' : 'flex flex-col gap-5'
      }`}>
        {/* Left/Top Area: Photo + Time/Date directly below image */}
        <div className={`flex flex-col gap-3.5 ${layout === 'horizontal' ? 'flex-shrink-0 w-full md:w-44' : 'w-full'}`}>
          <div className={`rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden relative flex items-center justify-center ${
            layout === 'horizontal' ? 'w-full md:w-44 h-44' : 'w-full aspect-square'
          }`}>
            {log.photo_url ? (
              <img
                src={log.photo_url}
                alt={`Akses oleh ${displayName}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // fallback if image fails to load
                  (e.target as HTMLImageElement).src = '';
                  (e.target as HTMLImageElement).parentElement?.classList.add('fallback-active');
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 gap-2 p-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                  <User size={24} />
                </div>
                <span className="text-[10px] font-medium text-slate-500 tracking-wide uppercase">No Image Logged</span>
              </div>
            )}
          </div>

          {/* Time & Date placed directly below image (only in vertical layout) */}
          {layout === 'vertical' && (
            <div className="flex flex-col gap-1 text-xs font-semibold text-slate-500 border-b border-slate-50/65 pb-2.5">
              <div className="flex items-center gap-1.5">
                <Clock size={13} className="text-slate-400" />
                <span>{formatTime(log.access_time)}</span>
              </div>
              <div className="text-slate-400 pl-[19px]">{formatDate(log.access_time)}</div>
            </div>
          )}
        </div>

        {/* Right/Bottom Area: User metadata details */}
        <div className="flex flex-col justify-between flex-1">
          <div>
            {/* Status Badge & Role */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase bg-slate-50 px-2.5 py-1 rounded-md">
                {roleName}
              </span>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                isAllowed 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                  : 'bg-red-50 text-red-700 border border-red-100'
              }`}>
                {isAllowed ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                <span>{isAllowed ? 'TERIMA (ALLOWED)' : 'DITOLAK (DENIED)'}</span>
              </div>
            </div>

            {/* User Name */}
            <h2 className="font-bold text-2xl text-slate-800 tracking-tight mt-3">
              {displayName}
            </h2>
            <p className="text-slate-400 text-xs font-medium mt-1">
              {log.message || 'Melakukan tapping kartu RFID'}
            </p>

            {/* Details Grid */}
            <div className={`grid gap-4 mt-6 ${
              layout === 'horizontal' ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'
            }`}>
              <div className="flex items-center gap-2.5 text-slate-600">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                  <CreditCard size={15} />
                </div>
                <div className="overflow-hidden">
                  <span className="text-[10px] font-semibold text-slate-400 block tracking-wide uppercase leading-none">RFID UID</span>
                  <span className="text-xs font-semibold text-slate-700 font-mono truncate block mt-0.5" title={log.uid}>
                    {log.uid}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-slate-600">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                  <MapPin size={15} />
                </div>
                <div className="overflow-hidden">
                  <span className="text-[10px] font-semibold text-slate-400 block tracking-wide uppercase leading-none">RUANGAN</span>
                  <span className="text-xs font-bold text-slate-700 block truncate mt-0.5">
                    {log.room}
                  </span>
                </div>
              </div>

              {layout === 'horizontal' && (
                <div className="flex items-center gap-2.5 text-slate-600 col-span-2 sm:col-span-1">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                    <Clock size={15} />
                  </div>
                  <div className="overflow-hidden">
                    <span className="text-[10px] font-semibold text-slate-400 block tracking-wide uppercase leading-none">WAKTU AKSES</span>
                    <span className="text-xs font-bold text-slate-700 block mt-0.5 whitespace-nowrap">
                      {formatTime(log.access_time)}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">
                      {formatDate(log.access_time)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
