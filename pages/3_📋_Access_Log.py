"""
pages/3_📋_Access_Log.py
Full access log dengan foto, filter, dan export
"""
import streamlit as st
import sys, os
import pandas as pd
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from utils.api import get_logs

st.set_page_config(page_title="Access Log — Smart Door", page_icon="📋", layout="wide")

WIB = timezone(timedelta(hours=7))

if not st.session_state.get("token"):
    st.error("🔒 Silakan login terlebih dahulu.")
    st.page_link("app.py", label="← Ke halaman Login", icon="🔐")
    st.stop()

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');
* { font-family: 'Inter', sans-serif !important; }
[data-testid="stAppViewContainer"] { background: #0a0f1e; }
[data-testid="stSidebar"] { background: #080c18 !important; border-right: 1px solid #1f2d4a; }

.log-row {
    background: #111827; border: 1px solid #1f2d4a; border-radius: 10px;
    padding: 0.8rem 1rem; margin-bottom: 0.5rem; display: flex;
    align-items: center; gap: 1rem;
}
.log-row:hover { border-color: #374151; background: #1a2035; }
.badge {
    font-size: 0.7rem; font-weight: 700; border-radius: 6px; padding: 3px 10px;
    text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap;
}
.badge-allowed { background: rgba(34,197,94,0.15); color: #22c55e; border: 1px solid rgba(34,197,94,0.25); }
.badge-denied { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.25); }
.uid-mono { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #64748b; }
.filter-bar {
    background: #111827; border: 1px solid #1f2d4a; border-radius: 12px;
    padding: 1rem 1.2rem; margin-bottom: 1.5rem;
}
</style>
""", unsafe_allow_html=True)

st.markdown("## 📋 Access Log")
st.caption("Riwayat lengkap akses datacenter")
st.divider()

# ── Data ──────────────────────────────────────────────────────────────────────
logs = get_logs()

def parse_wib(ts_str):
    try:
        dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        return dt.astimezone(WIB)
    except Exception:
        return None

if not logs:
    st.warning("Tidak ada data log.")
    st.stop()

df = pd.DataFrame(logs)
df["dt_wib"] = df["access_time"].apply(parse_wib)
df["date"] = df["dt_wib"].apply(lambda x: x.date() if x else None)
df["time_str"] = df["dt_wib"].apply(lambda x: x.strftime("%H:%M:%S") if x else "—")
df["date_str"] = df["dt_wib"].apply(lambda x: x.strftime("%d %b %Y") if x else "—")
df = df.sort_values("access_time", ascending=False)

# ── Filters ───────────────────────────────────────────────────────────────────
with st.container():
    st.markdown('<div class="filter-bar">', unsafe_allow_html=True)
    fc1, fc2, fc3, fc4 = st.columns([2, 1.5, 1.5, 1])
    with fc1:
        search = st.text_input("🔍 Cari nama / UID", placeholder="Ketik nama atau UID...", label_visibility="collapsed")
    with fc2:
        status_filter = st.selectbox("Status", ["Semua", "Granted ✅", "Denied ❌"], label_visibility="collapsed")
    with fc3:
        dates = sorted(df["date"].dropna().unique(), reverse=True)
        date_options = ["Semua Tanggal"] + [str(d) for d in dates]
        date_sel = st.selectbox("Tanggal", date_options, label_visibility="collapsed")
    with fc4:
        refresh_btn = st.button("🔄 Refresh")
    st.markdown('</div>', unsafe_allow_html=True)

# Apply filters
df_f = df.copy()
if search:
    mask = df_f["uid"].str.contains(search, case=False, na=False)
    if "user_name" in df_f.columns:
        mask = mask | df_f["user_name"].str.contains(search, case=False, na=False)
    df_f = df_f[mask]
if status_filter == "Granted ✅":
    df_f = df_f[df_f["status"] == "allowed"]
elif status_filter == "Denied ❌":
    df_f = df_f[df_f["status"] == "denied"]
if date_sel != "Semua Tanggal":
    df_f = df_f[df_f["date"].astype(str) == date_sel]

# ── Summary bar ───────────────────────────────────────────────────────────────
sc1, sc2, sc3 = st.columns(3)
sc1.metric("Total Ditampilkan", len(df_f))
sc2.metric("✅ Granted", len(df_f[df_f["status"] == "allowed"]))
sc3.metric("❌ Denied", len(df_f[df_f["status"] == "denied"]))

st.markdown("<br>", unsafe_allow_html=True)

# ── Log table ─────────────────────────────────────────────────────────────────
if df_f.empty:
    st.info("Tidak ada log yang sesuai filter.")
else:
    # Show 20 per page
    page_size = 20
    total_pages = max(1, -(-len(df_f) // page_size))
    if total_pages > 1:
        page = st.number_input("Halaman", min_value=1, max_value=total_pages, value=1) - 1
    else:
        page = 0

    page_df = df_f.iloc[page * page_size : (page + 1) * page_size]

    # Toggle photo mode
    show_photos = st.toggle("📸 Tampilkan foto", value=False)

    if show_photos:
        # Card mode with photos
        for _, row in page_df.iterrows():
            is_ok = row["status"] == "allowed"
            badge = "badge-allowed" if is_ok else "badge-denied"
            badge_txt = "GRANTED" if is_ok else "DENIED"
            name = row.get("user_name") or row.get("name") or "Unknown"
            uid = row.get("uid", "—")
            msg = row.get("message", "—")
            room = row.get("room", "—")
            photo_url = row.get("photo_url")

            col_info, col_photo = st.columns([2, 1])
            with col_info:
                st.markdown(f"""
                <div class="log-row" style="flex-direction:column;align-items:flex-start">
                    <div style="display:flex;gap:0.8rem;align-items:center;width:100%">
                        <span class="badge {badge}">{badge_txt}</span>
                        <span style="font-weight:600;color:#e2e8f0">{name}</span>
                        <span style="color:#64748b;font-size:0.8rem;margin-left:auto">{row['date_str']} {row['time_str']}</span>
                    </div>
                    <div class="uid-mono" style="margin-top:0.4rem">UID: {uid} · Room: {room}</div>
                    <div style="font-size:0.8rem;color:#475569;margin-top:0.2rem">{msg}</div>
                </div>
                """, unsafe_allow_html=True)
            with col_photo:
                if photo_url:
                    st.image(photo_url, use_container_width=True)
                else:
                    st.markdown('<div style="background:#111827;border:1px solid #1f2d4a;border-radius:8px;height:80px;display:flex;align-items:center;justify-content:center;color:#374151;font-size:0.8rem">📷 No photo</div>', unsafe_allow_html=True)
    else:
        # Table mode
        display_df = page_df[["date_str", "time_str", "status", "uid", "room", "message"]].copy()
        if "user_name" in page_df.columns:
            display_df.insert(2, "name", page_df["user_name"].fillna("Unknown"))
        display_df.columns = ["Tanggal", "Waktu (WIB)", *([col for col in display_df.columns[2:]])]
        display_df["status"] = display_df["status"].apply(lambda x: "✅ Granted" if x == "allowed" else "❌ Denied")
        st.dataframe(
            display_df,
            use_container_width=True,
            hide_index=True,
            column_config={
                "Tanggal": st.column_config.TextColumn("📅 Tanggal", width="medium"),
                "Waktu (WIB)": st.column_config.TextColumn("⏰ Waktu", width="small"),
                "status": st.column_config.TextColumn("Status", width="small"),
            }
        )

    if total_pages > 1:
        st.caption(f"Halaman {page+1} dari {total_pages} · Total {len(df_f)} records")

# ── CSV Export ────────────────────────────────────────────────────────────────
st.divider()
csv = df_f.drop(columns=["dt_wib", "date", "time_str", "date_str"], errors="ignore").to_csv(index=False)
st.download_button("⬇️ Export CSV", data=csv, file_name=f"access_log_{datetime.now(WIB).strftime('%Y%m%d')}.csv", mime="text/csv")
