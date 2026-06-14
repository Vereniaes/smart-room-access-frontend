/**
 * smart-room-access-frontend/src/components/TrendCharts.tsx
 *
 * -> component for showing Daily, Weekly, and Monthly logs trend
 * -> menganalisis data log untuk menghitung status diterima & ditolak
 * -> merender grafik menggunakan responsive SVG bars
 * -> menggunakan tema minimalist putih hijau (emerald green)
 */

import React from 'react';
import { Calendar, ShieldCheck, ShieldX, TrendingUp } from 'lucide-react';

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

interface TrendChartsProps {
  logs: AccessLog[];
}

export default function TrendCharts({ logs }: TrendChartsProps) {
  // helper --------------------------------------------------------------------------

  // mengelompokkan data berdasarkan tanggal
  // input param: daysAgo -> jumlah hari ke belakang
  // output: data harian { dateStr, allowed, denied }
  const getStatsForLastNDays = (daysAgo: number) => {
    const result = [];
    const now = new Date();
    
    for (let i = daysAgo - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      
      const dayLogs = logs.filter(log => log.access_time.startsWith(dateStr));
      const allowed = dayLogs.filter(log => log.status === 'allowed').length;
      const denied = dayLogs.filter(log => log.status === 'denied').length;
      
      // label nama hari (misal: Sen, Sel, Rab)
      const label = d.toLocaleDateString('id-ID', { weekday: 'short' });
      
      result.push({ dateStr, label, allowed, denied });
    }
    return result;
  };

  // mengelompokkan data harian menjadi 4 waktu (Pagi, Siang, Sore, Malam)
  // output: data bagian hari { label, allowed, denied }
  const getDailyHourlyStats = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayLogs = logs.filter(log => log.access_time.startsWith(todayStr));
    
    const timeSlots = [
      { label: 'Pagi (06-12)', start: 6, end: 12, allowed: 0, denied: 0 },
      { label: 'Siang (12-16)', start: 12, end: 16, allowed: 0, denied: 0 },
      { label: 'Sore (16-20)', start: 16, end: 20, allowed: 0, denied: 0 },
      { label: 'Malam (20-06)', start: 20, end: 30, allowed: 0, denied: 0 }, // 30 represents up to 6am next day
    ];
    
    todayLogs.forEach(log => {
      try {
        const hour = new Date(log.access_time).getHours();
        const isAllowed = log.status === 'allowed';
        
        if (hour >= 6 && hour < 12) {
          if (isAllowed) timeSlots[0].allowed++; else timeSlots[0].denied++;
        } else if (hour >= 12 && hour < 16) {
          if (isAllowed) timeSlots[1].allowed++; else timeSlots[1].denied++;
        } else if (hour >= 16 && hour < 20) {
          if (isAllowed) timeSlots[2].allowed++; else timeSlots[2].denied++;
        } else {
          // malam (20:00 - 05:59)
          if (isAllowed) timeSlots[3].allowed++; else timeSlots[3].denied++;
        }
      } catch (e) {
        // fallback
      }
    });
    
    return timeSlots;
  };

  // mengelompokkan data bulanan menjadi 4 minggu terakhir
  // output: data mingguan { label, allowed, denied }
  const getMonthlyWeeklyStats = () => {
    const now = new Date();
    const weeks = [
      { label: 'W1', startDays: 30, endDays: 22, allowed: 0, denied: 0 },
      { label: 'W2', startDays: 22, endDays: 15, allowed: 0, denied: 0 },
      { label: 'W3', startDays: 15, endDays: 8, allowed: 0, denied: 0 },
      { label: 'W4 (Terbaru)', startDays: 8, endDays: 0, allowed: 0, denied: 0 },
    ];
    
    logs.forEach(log => {
      try {
        const logTime = new Date(log.access_time).getTime();
        const diffDays = (now.getTime() - logTime) / (1000 * 60 * 60 * 24);
        const isAllowed = log.status === 'allowed';
        
        weeks.forEach(w => {
          if (diffDays >= w.endDays && diffDays < w.startDays) {
            if (isAllowed) w.allowed++; else w.denied++;
          }
        });
      } catch (e) {
        // fallback
      }
    });
    
    return weeks;
  };

  // end of helper ------------------------------------------------------------------

  // Ambil data statistik untuk visualisasi grafik
  const dailyData = getDailyHourlyStats();
  const weeklyData = getStatsForLastNDays(7);
  const monthlyData = getMonthlyWeeklyStats();

  // Hitung agregat angka utama
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogs = logs.filter(log => log.access_time.startsWith(todayStr));
  const dailyTotalAllowed = todayLogs.filter(l => l.status === 'allowed').length;
  const dailyTotalDenied = todayLogs.filter(l => l.status === 'denied').length;

  const last7DaysLogs = logs.filter(log => {
    const diff = (new Date().getTime() - new Date(log.access_time).getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  });
  const weeklyTotalAllowed = last7DaysLogs.filter(l => l.status === 'allowed').length;
  const weeklyTotalDenied = last7DaysLogs.filter(l => l.status === 'denied').length;

  const monthlyTotalAllowed = logs.filter(l => l.status === 'allowed').length; // assuming state logs contains last 30 days
  const monthlyTotalDenied = logs.filter(l => l.status === 'denied').length;

  // Render SVG Column Chart
  // params: data -> array of { label, allowed, denied }
  const renderSvgChart = (data: { label: string; allowed: number; denied: number }[]) => {
    const maxVal = Math.max(...data.map(d => Math.max(d.allowed, d.denied, 1)));
    const chartHeight = 100;
    const barWidth = 14;
    const gap = 16;
    const groupGap = 24;
    const paddingLeft = 10;
    
    return (
      <svg className="w-full h-28 mt-4" viewBox={`0 0 320 ${chartHeight + 20}`}>
        {data.map((item, idx) => {
          const groupWidth = barWidth * 2 + gap;
          const x = paddingLeft + idx * (groupWidth + groupGap);
          
          // kalkulasi tinggi bar berdasarkan nilai maks
          const allowedHeight = (item.allowed / maxVal) * chartHeight;
          const deniedHeight = (item.denied / maxVal) * chartHeight;
          
          // kalkulasi y position
          const allowedY = chartHeight - allowedHeight;
          const deniedY = chartHeight - deniedHeight;

          return (
            <g key={idx}>
              {/* Allowed Bar (Green) */}
              <rect
                x={x}
                y={allowedY}
                width={barWidth}
                height={allowedHeight}
                rx={4}
                className="fill-emerald-500 hover:fill-emerald-600 transition-colors cursor-pointer"
              >
                <title>{`Allowed: ${item.allowed}`}</title>
              </rect>
              
              {/* Denied Bar (Red) */}
              <rect
                x={x + barWidth + 4}
                y={deniedY}
                width={barWidth}
                height={deniedHeight}
                rx={4}
                className="fill-red-400 hover:fill-red-500 transition-colors cursor-pointer"
              >
                <title>{`Denied: ${item.denied}`}</title>
              </rect>

              {/* Label */}
              <text
                x={x + barWidth}
                y={chartHeight + 15}
                textAnchor="middle"
                className="text-[9px] fill-slate-400 font-bold tracking-tight"
              >
                {item.label}
              </text>
            </g>
          );
        })}
        {/* Baseline */}
        <line x1="0" y1={chartHeight} x2="320" y2={chartHeight} className="stroke-slate-100 stroke-1" />
      </svg>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      {/* 1. Daily Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h4 className="font-bold text-slate-800 text-sm tracking-tight">Tren Harian (Hari Ini)</h4>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide bg-slate-50 px-2 py-1 rounded">Daily</span>
          </div>

          {/* Counts */}
          <div className="grid grid-cols-2 gap-3 border-b border-slate-50 pb-4 mb-2">
            <div className="bg-emerald-50/40 p-2.5 rounded-2xl border border-emerald-50/50">
              <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wide block">Diterima</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span className="text-base font-extrabold text-emerald-700">{dailyTotalAllowed}</span>
              </div>
            </div>
            <div className="bg-red-50/40 p-2.5 rounded-2xl border border-red-50/50">
              <span className="text-[9px] font-bold text-red-500 uppercase tracking-wide block">Ditolak</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <ShieldX size={14} className="text-red-500" />
                <span className="text-base font-extrabold text-red-700">{dailyTotalDenied}</span>
              </div>
            </div>
          </div>
        </div>

        {/* SVG Chart */}
        <div className="mt-2 flex-1 flex flex-col justify-end">
          {renderSvgChart(dailyData)}
        </div>
      </div>

      {/* 2. Weekly Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-slate-500" />
              <h4 className="font-bold text-slate-800 text-sm tracking-tight">Tren Mingguan (7 Hari)</h4>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide bg-slate-50 px-2 py-1 rounded">Weekly</span>
          </div>

          {/* Counts */}
          <div className="grid grid-cols-2 gap-3 border-b border-slate-50 pb-4 mb-2">
            <div className="bg-emerald-50/40 p-2.5 rounded-2xl border border-emerald-50/50">
              <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wide block">Diterima</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span className="text-base font-extrabold text-emerald-700">{weeklyTotalAllowed}</span>
              </div>
            </div>
            <div className="bg-red-50/40 p-2.5 rounded-2xl border border-red-50/50">
              <span className="text-[9px] font-bold text-red-500 uppercase tracking-wide block">Ditolak</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <ShieldX size={14} className="text-red-500" />
                <span className="text-base font-extrabold text-red-700">{weeklyTotalDenied}</span>
              </div>
            </div>
          </div>
        </div>

        {/* SVG Chart */}
        <div className="mt-2 flex-1 flex flex-col justify-end">
          {renderSvgChart(weeklyData)}
        </div>
      </div>

      {/* 3. Monthly Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-slate-500" />
              <h4 className="font-bold text-slate-800 text-sm tracking-tight">Tren Bulanan (30 Hari)</h4>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide bg-slate-50 px-2 py-1 rounded">Monthly</span>
          </div>

          {/* Counts */}
          <div className="grid grid-cols-2 gap-3 border-b border-slate-50 pb-4 mb-2">
            <div className="bg-emerald-50/40 p-2.5 rounded-2xl border border-emerald-50/50">
              <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wide block">Diterima</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span className="text-base font-extrabold text-emerald-700">{monthlyTotalAllowed}</span>
              </div>
            </div>
            <div className="bg-red-50/40 p-2.5 rounded-2xl border border-red-50/50">
              <span className="text-[9px] font-bold text-red-500 uppercase tracking-wide block">Ditolak</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <ShieldX size={14} className="text-red-500" />
                <span className="text-base font-extrabold text-red-700">{monthlyTotalDenied}</span>
              </div>
            </div>
          </div>
        </div>

        {/* SVG Chart */}
        <div className="mt-2 flex-1 flex flex-col justify-end">
          {renderSvgChart(monthlyData)}
        </div>
      </div>

    </div>
  );
}
