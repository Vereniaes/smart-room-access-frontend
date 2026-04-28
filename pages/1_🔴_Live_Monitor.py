"""
pages/1_🔴_Live_Monitor.py
Real-time access monitor — auto-refresh setiap 5 detik
"""
import streamlit as st
import sys, os, time
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from utils.api import get_logs

st.set_page_config(
    page_title="Live Monitor — Smart Door",
    page_icon="🔴",
    layout="wide",
)

WIB = timezone(timedelta(hours=7))

# ── Auth guard ────────────────────────────────────────────────────────────────
if not st.session_state.get("token"):
    st.error("🔒 Silakan login terlebih dahulu.")
    st.page_link("app.py", label="← Ke halaman Login", icon="🔐")
    st.stop()

# ── CSS ───────────────────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');
* { font-family: 'Inter', sans-serif !important; }

[data-testid="stAppViewContainer"] { background: #0a0f1e; }
[data-testid="stSidebar"] { background: #080c18 !important; border-right: 1px solid #1f2d4a; }

.live-badge {
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3);
    border-radius: 20px; padding: 4px 12px; font-size: 0.8rem; color: #ef4444;
    font-weight: 600; letter-spacing: 0.05em;
}
.pulse {
    width: 8px; height: 8px; border-radius: 50%; background: #ef4444;
    animation: pulse 1.5s infinite;
}
@keyframes pulse {
    0%,100% { opacity:1; transform:scale(1); }
    50% { opacity:0.4; transform:scale(1.3); }
}

.status-card {
    border-radius: 16px; padding: 1.8rem; text-align: center;
    margin-bottom: 1rem; border: 1px solid;
    transition: all 0.3s;
}
.status-granted {
    background: linear-gradient(135deg, rgba(34,197,94,0.12), rgba(16,185,129,0.08));
    border-color: rgba(34,197,94,0.3);
    box-shadow: 0 0 30px rgba(34,197,94,0.1);
}
.status-denied {
    background: linear-gradient(135deg, rgba(239,68,68,0.12), rgba(220,38,38,0.08));
    border-color: rgba(239,68,68,0.3);
    box-shadow: 0 0 30px rgba(239,68,68,0.1);
}
.status-icon { font-size: 3rem; margin-bottom: 0.5rem; }
.status-label {
    font-size: 1.4rem; font-weight: 700; margin-bottom: 0.25rem;
}
.status-granted .status-label { color: #22c55e; }
.status-denied .status-label { color: #ef4444; }
.status-name { font-size: 1rem; color: #94a3b8; }
.status-time { font-size: 0.8rem; color: #475569; margin-top: 0.5rem; font-family: 'JetBrains Mono', monospace; }

.event-card {
    background: #111827; border: 1px solid #1f2d4a;
    border-radius: 12px; padding: 1rem 1.2rem; margin-bottom: 0.6rem;
    display: flex; align-items: center; gap: 1rem;
    transition: all 0.2s;
}
.event-card:hover { border-color: #374151; background: #1a2035; }
.event-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.event-dot-granted { background: #22c55e; box-shadow: 0 0 8px #22c55e; }
.event-dot-denied { background: #ef4444; box-shadow: 0 0 8px #ef4444; }
.event-name { font-weight: 600; color: #e2e8f0; font-size: 0.9rem; }
.event-uid { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #475569; }
.event-time { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #64748b; margin-left: auto; flex-shrink: 0; }
.event-status-badge {
    font-size: 0.7rem; font-weight: 600; border-radius: 6px; padding: 2px 8px; flex-shrink: 0;
}
.badge-granted { background: rgba(34,197,94,0.15); color: #22c55e; border: 1px solid rgba(34,197,94,0.2); }
.badge-denied { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }

.metric-mini {
    background: #111827; border: 1px solid #1f2d4a; border-radius: 10px;
    padding: 1rem; text-align: center;
}
.metric-mini-val { font-size: 1.8rem; font-weight: 700; color: #e2e8f0; }
.metric-mini-label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; }

.photo-thumb { border-radius: 8px; border: 1px solid #1f2d4a; }
.clock-display {
    font-family: 'JetBrains Mono', monospace; font-size: 2rem; font-weight: 600;
    color: #e2e8f0; text-align: center; letter-spacing: 0.1em;
    background: #111827; border: 1px solid #1f2d4a; border-radius: 12px; padding: 1rem;
}
</style>
""", unsafe_allow_html=True)

# ── Header ────────────────────────────────────────────────────────────────────
col_title, col_live, col_user = st.columns([3, 1, 1])
with col_title:
    st.markdown("## 🔴 Live Monitor")
    st.caption("Real-time datacenter access feed")
with col_live:
    st.markdown('<div class="live-badge"><div class="pulse"></div> LIVE</div>', unsafe_allow_html=True)
with col_user:
    user = st.session_state.get("user", {})
    st.caption(f"👤 {user.get('name', 'Admin')}")

st.divider()

# ── Controls ──────────────────────────────────────────────────────────────────
col_refresh, col_interval, col_logout = st.columns([2, 2, 1])
with col_refresh:
    auto_refresh = st.toggle("⚡ Auto-refresh", value=True)
with col_interval:
    interval = st.slider("Interval (detik)", 3, 30, 5)
with col_logout:
    if st.button("🚪 Logout"):
        st.session_state.clear()
        st.switch_page("app.py")

@st.fragment(run_every=interval if auto_refresh else None)
def render_live_dashboard():
    logs = get_logs()
    now_wib = datetime.now(WIB)

    def parse_wib(ts_str):
        try:
            dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            return dt.astimezone(WIB)
        except Exception:
            return None

    # Sort by access_time desc
    logs_sorted = sorted(logs, key=lambda x: x.get("access_time", ""), reverse=True)
    latest = logs_sorted[0] if logs_sorted else None
    recent_10 = logs_sorted[:10]

    # ── Main layout ───────────────────────────────────────────────────────────────
    col_left, col_right = st.columns([1.2, 1.8])

    with col_left:
        # Clock
        st.markdown(f'<div class="clock-display">{now_wib.strftime("%H:%M:%S")}<br><span style="font-size:0.8rem;color:#475569">{now_wib.strftime("%A, %d %B %Y")} WIB</span></div>', unsafe_allow_html=True)
        st.markdown("<br>", unsafe_allow_html=True)

        # Latest event card
        if latest:
            is_granted = latest.get("status") == "allowed"
            card_class = "status-granted" if is_granted else "status-denied"
            icon = "✅" if is_granted else "❌"
            label = "ACCESS GRANTED" if is_granted else "ACCESS DENIED"
            name = latest.get("user_name") or latest.get("name") or "Unknown"
            uid = latest.get("uid", "—")
            ts = parse_wib(latest.get("access_time", ""))
            ts_str = ts.strftime("%H:%M:%S") if ts else "—"
            msg = latest.get("message", "")

            st.markdown(f"""
            <div class="status-card {card_class}">
                <div class="status-icon">{icon}</div>
                <div class="status-label">{label}</div>
                <div class="status-name">{name}</div>
                <div class="status-time">UID: {uid}</div>
                <div class="status-time">{ts_str} WIB</div>
                <div class="status-time" style="color:#6b7280;margin-top:0.5rem;font-size:0.75rem">{msg}</div>
            </div>
            """, unsafe_allow_html=True)

            # Foto jika ada
            photo_url = latest.get("photo_url")
            if photo_url:
                st.image(photo_url, caption="📸 Foto Akses Terakhir", use_container_width=True)
        else:
            st.info("Belum ada data akses.")

        # Mini metrics
        today_str = now_wib.strftime("%Y-%m-%d")
        today_logs = [l for l in logs if l.get("access_time", "").startswith(today_str[:10]) or 
                      (parse_wib(l.get("access_time", "")) and parse_wib(l.get("access_time","")).strftime("%Y-%m-%d") == today_str)]
        allowed_today = sum(1 for l in today_logs if l.get("status") == "allowed")
        denied_today = sum(1 for l in today_logs if l.get("status") == "denied")

        st.markdown("<br>", unsafe_allow_html=True)
        mc1, mc2, mc3 = st.columns(3)
        with mc1:
            st.markdown(f'<div class="metric-mini"><div class="metric-mini-val" style="color:#22c55e">{allowed_today}</div><div class="metric-mini-label">Granted</div></div>', unsafe_allow_html=True)
        with mc2:
            st.markdown(f'<div class="metric-mini"><div class="metric-mini-val" style="color:#ef4444">{denied_today}</div><div class="metric-mini-label">Denied</div></div>', unsafe_allow_html=True)
        with mc3:
            st.markdown(f'<div class="metric-mini"><div class="metric-mini-val">{len(today_logs)}</div><div class="metric-mini-label">Total</div></div>', unsafe_allow_html=True)

    with col_right:
        st.markdown("#### 📋 Recent Access Events")
        if recent_10:
            for log in recent_10:
                is_ok = log.get("status") == "allowed"
                dot_class = "event-dot-granted" if is_ok else "event-dot-denied"
                badge_class = "badge-granted" if is_ok else "badge-denied"
                badge_txt = "GRANTED" if is_ok else "DENIED"
                name = log.get("user_name") or log.get("name") or "Unknown"
                uid = log.get("uid", "—")
                ts = parse_wib(log.get("access_time", ""))
                ts_str = ts.strftime("%H:%M") if ts else "—"
                room = log.get("room", "—")

                st.markdown(f"""
                <div class="event-card">
                    <div class="event-dot {dot_class}"></div>
                    <div style="flex:1;min-width:0">
                        <div class="event-name">{name}</div>
                        <div class="event-uid">{uid} · {room}</div>
                    </div>
                    <div class="event-status-badge {badge_class}">{badge_txt}</div>
                    <div class="event-time">{ts_str}</div>
                </div>
                """, unsafe_allow_html=True)
        else:
            st.markdown('<div style="color:#475569;text-align:center;padding:2rem">Belum ada event hari ini</div>', unsafe_allow_html=True)

render_live_dashboard()
