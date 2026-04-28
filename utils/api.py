"""
utils/api.py — API client untuk Smart Door backend
"""
import requests
import streamlit as st

BASE_URL = "https://smart-room-access-backend-5nzoavtwya-et.a.run.app/api/v1"


def _headers():
    token = st.session_state.get("token", "")
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ── Auth ──────────────────────────────────────────────────────────────────────

def login(username: str, password: str):
    """Login dan kembalikan (token, user) atau raise Exception."""
    resp = requests.post(
        f"{BASE_URL}/auth/login",
        json={"username": username, "password": password},
        timeout=10,
    )
    if resp.status_code == 200:
        data = resp.json()["data"]
        return data["accessToken"], data["user"]
    raise Exception(resp.json().get("message", "Login gagal"))


def logout():
    try:
        requests.post(f"{BASE_URL}/auth/logout", headers=_headers(), timeout=5)
    except Exception:
        pass


# ── Logs ──────────────────────────────────────────────────────────────────────

def get_logs():
    """Ambil semua access logs. Return list atau []."""
    try:
        resp = requests.get(f"{BASE_URL}/logs", headers=_headers(), timeout=10)
        if resp.status_code == 200:
            return resp.json().get("data", [])
        if resp.status_code in (401, 403):
            st.session_state.token = None
        return []
    except Exception:
        return []


# ── Users ─────────────────────────────────────────────────────────────────────

def get_users():
    try:
        resp = requests.get(f"{BASE_URL}/users", headers=_headers(), timeout=10)
        if resp.status_code == 200:
            return resp.json().get("data", [])
        return []
    except Exception:
        return []


def create_user(payload: dict):
    resp = requests.post(f"{BASE_URL}/users", headers=_headers(), json=payload, timeout=10)
    if resp.status_code in (200, 201):
        return True, resp.json().get("data")
    return False, resp.json().get("message", "Gagal membuat user")


def update_user(user_id: int, payload: dict):
    resp = requests.put(f"{BASE_URL}/users/{user_id}", headers=_headers(), json=payload, timeout=10)
    if resp.status_code == 200:
        return True, resp.json().get("data")
    return False, resp.json().get("message", "Gagal update user")


def delete_user(user_id: int):
    resp = requests.delete(f"{BASE_URL}/users/{user_id}", headers=_headers(), timeout=10)
    return resp.status_code == 200
