"""
app.py — Login Page / Entry Point
Smart Door Security Dashboard
"""
import streamlit as st
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
from utils.api import login

st.set_page_config(
    page_title="Smart Door — Security Dashboard",
    page_icon="🔐",
    layout="centered",
    initial_sidebar_state="collapsed",
)

# ── CSS ───────────────────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

* { font-family: 'Inter', sans-serif !important; }
code, .mono { font-family: 'JetBrains Mono', monospace !important; }

.main { background: #0a0f1e; }
[data-testid="stAppViewContainer"] { background: #0a0f1e; }
[data-testid="stSidebar"] { background: #080c18; }

.login-card {
    background: linear-gradient(135deg, #111827 0%, #1a2035 100%);
    border: 1px solid #1f2d4a;
    border-radius: 16px;
    padding: 2.5rem;
    box-shadow: 0 25px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(239,68,68,0.1);
}

.logo-badge {
    background: linear-gradient(135deg, #ef4444, #b91c1c);
    border-radius: 12px;
    width: 56px; height: 56px;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.8rem;
    margin: 0 auto 1rem;
    box-shadow: 0 8px 24px rgba(239,68,68,0.4);
}

.title-text {
    text-align: center;
    font-size: 1.5rem;
    font-weight: 700;
    color: #f1f5f9;
    margin-bottom: 0.25rem;
}

.subtitle-text {
    text-align: center;
    font-size: 0.85rem;
    color: #64748b;
    margin-bottom: 2rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
}

.stTextInput > div > div > input {
    background: #0a0f1e !important;
    border: 1px solid #1f2d4a !important;
    border-radius: 8px !important;
    color: #e2e8f0 !important;
    font-size: 0.95rem !important;
}
.stTextInput > div > div > input:focus {
    border-color: #ef4444 !important;
    box-shadow: 0 0 0 3px rgba(239,68,68,0.15) !important;
}

.stButton > button {
    background: linear-gradient(135deg, #ef4444, #b91c1c) !important;
    border: none !important;
    border-radius: 8px !important;
    color: white !important;
    font-weight: 600 !important;
    padding: 0.6rem 2rem !important;
    width: 100% !important;
    font-size: 0.95rem !important;
    letter-spacing: 0.02em !important;
    transition: all 0.2s !important;
    box-shadow: 0 4px 12px rgba(239,68,68,0.3) !important;
}
.stButton > button:hover {
    transform: translateY(-1px) !important;
    box-shadow: 0 6px 20px rgba(239,68,68,0.4) !important;
}

.footer-text {
    text-align: center;
    font-size: 0.75rem;
    color: #334155;
    margin-top: 2rem;
}
</style>
""", unsafe_allow_html=True)

# ── Redirect jika sudah login ─────────────────────────────────────────────────
if st.session_state.get("token"):
    st.switch_page("pages/1_🔴_Live_Monitor.py")

# ── Login UI ──────────────────────────────────────────────────────────────────
col1, col2, col3 = st.columns([1, 1.8, 1])
with col2:
    st.markdown('<div class="login-card">', unsafe_allow_html=True)
    st.markdown('<div class="logo-badge">🔐</div>', unsafe_allow_html=True)
    st.markdown('<div class="title-text">Smart Door Security</div>', unsafe_allow_html=True)
    st.markdown('<div class="subtitle-text">Datacenter Access Control</div>', unsafe_allow_html=True)

    username = st.text_input("Username", placeholder="admin", key="login_user")
    password = st.text_input("Password", type="password", placeholder="••••••••", key="login_pass")

    if st.button("🔓 Sign In", key="login_btn"):
        if not username or not password:
            st.error("Username dan password wajib diisi.")
        else:
            with st.spinner("Authenticating..."):
                try:
                    token, user = login(username, password)
                    st.session_state.token = token
                    st.session_state.user = user
                    st.success(f"Welcome, {user['name']}!")
                    st.rerun()
                except Exception as e:
                    st.error(f"❌ {e}")

    st.markdown('<div class="footer-text">Smart Room Access Control System v1.0</div>', unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)
