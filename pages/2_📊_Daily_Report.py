"""
pages/2_📊_Daily_Report.py
Laporan harian — statistik & chart akses datacenter
"""
import streamlit as st
import sys, os
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from utils.api import get_logs

st.set_page_config(page_title="Daily Report — Smart Door", page_icon="📊", layout="wide")

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

.metric-card {
    background: linear-gradient(135deg, #111827, #1a2035);
    border: 1px solid #1f2d4a; border-radius: 14px; padding: 1.4rem;
    text-align: center;
}
.metric-val { font-size: 2.5rem; font-weight: 700; }
.metric-label { font-size: 0.78rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 0.3rem; }
.metric-sub { font-size: 0.8rem; color: #475569; margin-top: 0.4rem; }
.section-header {
    font-size: 1rem; font-weight: 600; color: #94a3b8;
    text-transform: uppercase; letter-spacing: 0.08em;
    border-bottom: 1px solid #1f2d4a; padding-bottom: 0.5rem; margin-bottom: 1rem;
}
</style>
""", unsafe_allow_html=True)

# ── Header ────────────────────────────────────────────────────────────────────
now_wib = datetime.now(WIB)
col_h1, col_h2 = st.columns([3, 1])
with col_h1:
    st.markdown("## 📊 Daily Report")
    st.caption(f"Statistik akses datacenter — {now_wib.strftime('%A, %d %B %Y')}")
with col_h2:
    date_filter = st.date_input("Tanggal", value=now_wib.date())

st.divider()

# ── Data ──────────────────────────────────────────────────────────────────────
logs = get_logs()

def parse_wib(ts_str):
    try:
        dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        return dt.astimezone(WIB)
    except Exception:
        return None

if logs:
    df = pd.DataFrame(logs)
    df["dt_wib"] = df["access_time"].apply(parse_wib)
    df["date"] = df["dt_wib"].apply(lambda x: x.date() if x else None)
    df["hour"] = df["dt_wib"].apply(lambda x: x.hour if x else None)
    df["time_str"] = df["dt_wib"].apply(lambda x: x.strftime("%H:%M") if x else "—")

    # Filter by selected date
    df_day = df[df["date"] == date_filter].copy()
else:
    df = pd.DataFrame()
    df_day = pd.DataFrame()

# ── Metrics ───────────────────────────────────────────────────────────────────
total = len(df_day)
granted = len(df_day[df_day["status"] == "allowed"]) if not df_day.empty else 0
denied = len(df_day[df_day["status"] == "denied"]) if not df_day.empty else 0
rate = f"{granted/total*100:.0f}%" if total > 0 else "—"

c1, c2, c3, c4 = st.columns(4)
cards = [
    (total, "#e2e8f0", "Total Events", f"{granted} granted + {denied} denied"),
    (granted, "#22c55e", "Access Granted", "Akses berhasil"),
    (denied, "#ef4444", "Access Denied", "Akses ditolak"),
    (rate, "#f59e0b", "Success Rate", "Persentase granted"),
]
for col, (val, color, label, sub) in zip([c1, c2, c3, c4], cards):
    with col:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-val" style="color:{color}">{val}</div>
            <div class="metric-label">{label}</div>
            <div class="metric-sub">{sub}</div>
        </div>
        """, unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# ── Charts ────────────────────────────────────────────────────────────────────
col_bar, col_pie = st.columns([2, 1])

DARK_LAYOUT = dict(
    paper_bgcolor="#111827",
    plot_bgcolor="#111827",
    font=dict(color="#94a3b8", family="Inter"),
    xaxis=dict(gridcolor="#1f2d4a", linecolor="#1f2d4a"),
    yaxis=dict(gridcolor="#1f2d4a", linecolor="#1f2d4a"),
    margin=dict(l=10, r=10, t=40, b=10),
)

with col_bar:
    st.markdown('<div class="section-header">📈 Distribusi Akses per Jam</div>', unsafe_allow_html=True)
    if not df_day.empty:
        hourly = df_day.groupby(["hour", "status"]).size().reset_index(name="count")
        all_hours = pd.DataFrame({"hour": range(24)})
        for s in ["allowed", "denied"]:
            h = hourly[hourly["status"] == s].set_index("hour")["count"]
            all_hours[s] = all_hours["hour"].map(h).fillna(0)

        fig_bar = go.Figure()
        fig_bar.add_bar(x=all_hours["hour"], y=all_hours["allowed"], name="Granted",
                        marker_color="#22c55e", opacity=0.85)
        fig_bar.add_bar(x=all_hours["hour"], y=all_hours["denied"], name="Denied",
                        marker_color="#ef4444", opacity=0.85)
        fig_bar.update_layout(
            barmode="stack", height=280,
            legend=dict(orientation="h", y=-0.2, x=0.5, xanchor="center", bgcolor="rgba(0,0,0,0)"),
            xaxis_title="Jam (WIB)", yaxis_title="Jumlah",
            **DARK_LAYOUT
        )
        st.plotly_chart(fig_bar, use_container_width=True)
    else:
        st.info("Tidak ada data untuk tanggal ini.")

with col_pie:
    st.markdown('<div class="section-header">🔘 Granted vs Denied</div>', unsafe_allow_html=True)
    if total > 0:
        fig_pie = go.Figure(go.Pie(
            labels=["Granted", "Denied"],
            values=[granted, denied],
            marker_colors=["#22c55e", "#ef4444"],
            hole=0.65,
            textinfo="percent",
            textfont=dict(size=13, color="white"),
        ))
        fig_pie.update_layout(
            height=280,
            showlegend=True,
            legend=dict(orientation="h", y=-0.1, x=0.5, xanchor="center", bgcolor="rgba(0,0,0,0)"),
            annotations=[dict(text=f"<b>{rate}</b>", x=0.5, y=0.5, font_size=22, font_color="#22c55e", showarrow=False)],
            **{k: v for k, v in DARK_LAYOUT.items() if k not in ("xaxis", "yaxis")},
        )
        st.plotly_chart(fig_pie, use_container_width=True)
    else:
        st.info("Tidak ada data.")

# ── Per-user breakdown ────────────────────────────────────────────────────────
st.markdown("<br>", unsafe_allow_html=True)
st.markdown('<div class="section-header">👤 Aktivitas per User Hari Ini</div>', unsafe_allow_html=True)

if not df_day.empty:
    user_col = "user_name" if "user_name" in df_day.columns else "uid"
    user_stats = df_day.groupby([user_col, "status"]).size().unstack(fill_value=0)
    if "allowed" not in user_stats.columns: user_stats["allowed"] = 0
    if "denied" not in user_stats.columns: user_stats["denied"] = 0
    user_stats["total"] = user_stats["allowed"] + user_stats["denied"]
    user_stats = user_stats.reset_index().rename(columns={user_col: "User", "allowed": "✅ Granted", "denied": "❌ Denied", "total": "Total"})

    fig_user = px.bar(
        user_stats, x="User", y=["✅ Granted", "❌ Denied"],
        color_discrete_map={"✅ Granted": "#22c55e", "❌ Denied": "#ef4444"},
        barmode="group", height=260,
    )
    fig_user.update_layout(**DARK_LAYOUT, legend=dict(orientation="h", y=-0.25, bgcolor="rgba(0,0,0,0)"))
    st.plotly_chart(fig_user, use_container_width=True)
else:
    st.info("Tidak ada data untuk tanggal ini.")

# ── 7-day trend ───────────────────────────────────────────────────────────────
st.markdown('<div class="section-header">📅 Tren 7 Hari Terakhir</div>', unsafe_allow_html=True)
if not df.empty:
    df["date_str"] = df["date"].astype(str)
    week = df.groupby(["date_str", "status"]).size().unstack(fill_value=0)
    if "allowed" not in week.columns: week["allowed"] = 0
    if "denied" not in week.columns: week["denied"] = 0
    week = week.reset_index().tail(7)

    fig_trend = go.Figure()
    fig_trend.add_scatter(x=week["date_str"], y=week["allowed"], name="Granted",
                          line=dict(color="#22c55e", width=2), fill="tozeroy",
                          fillcolor="rgba(34,197,94,0.08)", mode="lines+markers",
                          marker=dict(size=6))
    fig_trend.add_scatter(x=week["date_str"], y=week["denied"], name="Denied",
                          line=dict(color="#ef4444", width=2), fill="tozeroy",
                          fillcolor="rgba(239,68,68,0.08)", mode="lines+markers",
                          marker=dict(size=6))
    fig_trend.update_layout(height=220, **DARK_LAYOUT,
                             legend=dict(orientation="h", y=-0.3, bgcolor="rgba(0,0,0,0)"))
    st.plotly_chart(fig_trend, use_container_width=True)
