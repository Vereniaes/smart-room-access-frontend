"""
pages/4_👥_User_Management.py
CRUD user — daftar, tambah, edit, hapus authorized cards
"""
import streamlit as st
import sys, os
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from utils.api import get_users, create_user, update_user, delete_user

st.set_page_config(page_title="User Management — Smart Door", page_icon="👥", layout="wide")

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

.user-card {
    background: #111827; border: 1px solid #1f2d4a; border-radius: 12px;
    padding: 1rem 1.2rem; margin-bottom: 0.5rem;
    display: flex; align-items: center; gap: 1rem;
}
.user-card:hover { border-color: #374151; }
.role-badge {
    font-size: 0.7rem; font-weight: 700; border-radius: 6px; padding: 2px 8px;
    text-transform: uppercase; letter-spacing: 0.05em;
}
.role-admin { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }
.role-staff { background: rgba(59,130,246,0.15); color: #60a5fa; border: 1px solid rgba(59,130,246,0.2); }
.role-student { background: rgba(168,85,247,0.15); color: #c084fc; border: 1px solid rgba(168,85,247,0.2); }
.role-guest { background: rgba(249,115,22,0.15); color: #fb923c; border: 1px solid rgba(249,115,22,0.2); }
.form-card {
    background: #111827; border: 1px solid #1f2d4a; border-radius: 14px;
    padding: 1.5rem;
}
.avatar {
    width: 38px; height: 38px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 1rem; font-weight: 700; flex-shrink: 0;
    background: linear-gradient(135deg, #374151, #1f2d4a);
    color: #94a3b8;
}
</style>
""", unsafe_allow_html=True)

st.markdown("## 👥 User Management")
st.caption("Kelola authorized RFID cards")
st.divider()

# ── Data ──────────────────────────────────────────────────────────────────────
if "users_data" not in st.session_state:
    st.session_state.users_data = get_users()

users = st.session_state.users_data
ROLES = ["admin", "staff", "student", "guest"]
ROLE_COLORS = {"admin": "role-admin", "staff": "role-staff", "student": "role-student", "guest": "role-guest"}

col_list, col_form = st.columns([1.6, 1])

# ── User List ─────────────────────────────────────────────────────────────────
with col_list:
    col_h, col_r = st.columns([3, 1])
    with col_h:
        st.markdown(f"#### 🔑 Authorized Users ({len(users)})")
    with col_r:
        if st.button("🔄 Refresh"):
            st.session_state.users_data = get_users()
            st.rerun()

    search = st.text_input("Cari user...", placeholder="Nama atau role", label_visibility="collapsed")
    filtered = [u for u in users if not search or search.lower() in u.get("name", "").lower() or search.lower() in u.get("role", "")]

    if not filtered:
        st.info("Tidak ada user ditemukan.")
    else:
        for user in filtered:
            role = user.get("role", "guest")
            role_class = ROLE_COLORS.get(role, "role-guest")
            initials = user.get("name", "?")[:2].upper()
            schedule = f"{user.get('schedule_start', '?')} – {user.get('schedule_end', '?')}"
            valid = user.get("valid_until") or "∞"

            col_info, col_edit, col_del = st.columns([4, 1, 1])
            username_part = f" · @{user.get('username')}" if user.get('username') else ""
            with col_info:
                st.markdown(f"""
                <div class="user-card">
                    <div class="avatar">{initials}</div>
                    <div style="flex:1;min-width:0">
                        <div style="font-weight:600;color:#e2e8f0">{user.get('name')}</div>
                        <div style="font-size:0.75rem;color:#64748b;margin-top:2px">
                            🕐 {schedule} · 📅 s/d {valid}{username_part}
                        </div>
                    </div>
                    <span class="role-badge {role_class}">{role}</span>
                </div>
                """, unsafe_allow_html=True)
            with col_edit:
                if st.button("✏️", key=f"edit_{user['id']}", help="Edit"):
                    st.session_state.edit_user = user
                    st.session_state.form_mode = "edit"
                    st.rerun()
            with col_del:
                if st.button("🗑️", key=f"del_{user['id']}", help="Hapus"):
                    st.session_state.confirm_delete = user["id"]

            # Confirm delete
            if st.session_state.get("confirm_delete") == user["id"]:
                st.warning(f"Hapus **{user['name']}**? Tindakan ini tidak bisa dibatalkan.")
                ca, cb = st.columns(2)
                with ca:
                    if st.button("✅ Ya, Hapus", key=f"confirm_{user['id']}"):
                        if delete_user(user["id"]):
                            st.success(f"User {user['name']} dihapus.")
                            st.session_state.users_data = get_users()
                            st.session_state.confirm_delete = None
                            st.rerun()
                        else:
                            st.error("Gagal menghapus user.")
                with cb:
                    if st.button("❌ Batal", key=f"cancel_{user['id']}"):
                        st.session_state.confirm_delete = None
                        st.rerun()

# ── Form ──────────────────────────────────────────────────────────────────────
with col_form:
    mode = st.session_state.get("form_mode", "create")
    edit_user = st.session_state.get("edit_user", {}) if mode == "edit" else {}

    st.markdown(f"#### {'✏️ Edit User' if mode == 'edit' else '➕ Tambah User Baru'}")
    st.markdown('<div class="form-card">', unsafe_allow_html=True)

    with st.form("user_form", clear_on_submit=(mode == "create")):
        name = st.text_input("Nama *", value=edit_user.get("name", ""))
        rfid_uid = st.text_input(
            "RFID UID *" + (" (kosongkan jika tidak diubah)" if mode == "edit" else ""),
            placeholder="XX XX XX XX",
            value="" if mode == "edit" else "",
            help="Format: BF 2E BE C4 (spasi dipisahkan)"
        )
        username = st.text_input("Username (opsional)", value=edit_user.get("username") or "")
        password = st.text_input("Password (opsional)", type="password",
                                  help="Isi jika user butuh akses dashboard")
        role = st.selectbox("Role *", ROLES, index=ROLES.index(edit_user.get("role", "student")))

        sc1, sc2 = st.columns(2)
        with sc1:
            schedule_start = st.text_input("Jam Mulai *", value=edit_user.get("schedule_start", "08:00"))
        with sc2:
            schedule_end = st.text_input("Jam Selesai *", value=edit_user.get("schedule_end", "17:00"))

        valid_until = st.text_input("Berlaku Hingga (opsional)", value=edit_user.get("valid_until") or "",
                                     placeholder="2026-12-31")

        if mode == "edit":
            col_s, col_c = st.columns(2)
            with col_s:
                submitted = st.form_submit_button("💾 Simpan", use_container_width=True)
            with col_c:
                if st.form_submit_button("✖ Batal", use_container_width=True):
                    st.session_state.form_mode = "create"
                    st.session_state.edit_user = {}
                    st.rerun()
        else:
            submitted = st.form_submit_button("➕ Tambah User", use_container_width=True)

        if submitted:
            if not name or not schedule_start or not schedule_end:
                st.error("Nama, jam mulai, dan jam selesai wajib diisi.")
            elif mode == "create" and not rfid_uid:
                st.error("RFID UID wajib diisi untuk user baru.")
            else:
                payload = {
                    "name": name,
                    "role": role,
                    "schedule_start": schedule_start,
                    "schedule_end": schedule_end,
                }
                if rfid_uid:
                    payload["rfid_uid"] = rfid_uid
                if username:
                    payload["username"] = username
                if password:
                    payload["password"] = password
                if valid_until:
                    payload["valid_until"] = valid_until

                if mode == "create":
                    ok, result = create_user(payload)
                    if ok:
                        st.success(f"✅ User **{name}** berhasil ditambahkan!")
                        st.session_state.users_data = get_users()
                        st.rerun()
                    else:
                        st.error(f"❌ {result}")
                else:
                    ok, result = update_user(edit_user["id"], payload)
                    if ok:
                        st.success(f"✅ User **{name}** berhasil diupdate!")
                        st.session_state.users_data = get_users()
                        st.session_state.form_mode = "create"
                        st.session_state.edit_user = {}
                        st.rerun()
                    else:
                        st.error(f"❌ {result}")

    st.markdown('</div>', unsafe_allow_html=True)

    # Quick tip
    st.markdown("""
    <div style="background:#0a0f1e;border:1px solid #1f2d4a;border-radius:10px;padding:1rem;margin-top:1rem;font-size:0.78rem;color:#475569">
    💡 <strong style="color:#64748b">Cara cari RFID UID:</strong><br>
    Upload firmware → tap kartu → lihat Serial Monitor<br><br>
    ⏰ <strong style="color:#64748b">Format jadwal:</strong> HH:MM (24 jam, WIB)<br>
    Contoh: 08:00 – 17:00
    </div>
    """, unsafe_allow_html=True)
