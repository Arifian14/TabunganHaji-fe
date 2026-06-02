# API Integration Guide - Authentication & Idempotency

## Overview

Backend sekarang support **refresh token flow** dan **idempotency** untuk transaksi setor. Frontend menyediakan global `apiFetch()` wrapper yang otomatis menangani:

- ✅ Authorization header (ambil token dari localStorage)
- ✅ Retry on 401 UNAUTHORIZED (refresh token, retry request)
- ✅ Logout on 401 TOKEN_REVOKED (clear tokens, redirect ke /login)
- ✅ Idempotency-Key generation untuk POST/PUT (cegah duplicate charges)

---

## Token Management

### Login (menyimpan token)

✅ **Already implemented** di `app/login/page.tsx`:

```typescript
// Login response now includes both tokens
const data = await res.json();
if (data.accessToken) {
  localStorage.setItem("bsi_token", data.accessToken);
}
if (data.refreshToken) {
  localStorage.setItem("bsi_refresh_token", data.refreshToken);
}
```

### Logout (menghapus token)

Gunakan helper dari `lib/api.ts` atau hapus manual di client:

```typescript
// Option 1: Manual logout
localStorage.removeItem("bsi_token");
localStorage.removeItem("bsi_refresh_token");
window.location.href = "/login";

// Option 2: Tambah endpoint di backend kemudian call POST /auth/logout
// (sudah tersedia di backend)
```

---

## Migration Guide: Replace `fetch()` with `apiFetch()`

### Langkah 1: Import apiFetch

Ubah import di page/component Anda:

```typescript
// Before
// (tidak perlu import apapun, pakai fetch bawaan browser)

// After
import { apiFetch } from "@/lib/api";
```

### Langkah 2: Replace fetch() calls

#### Example 1: GET request (list data)

**Before:**
```typescript
const res = await fetch(`${API_URL}/tabungan-haji`, {
  headers: authHeaders(),
});
```

**After:**
```typescript
const res = await apiFetch("/tabungan-haji");
// No need to add Authorization header - apiFetch handles it!
```

#### Example 2: POST request (create/setor)

**Before:**
```typescript
const res = await fetch(`${API_URL}/tabungan-haji/${rekId}/setor`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...authHeaders(),
  },
  body: JSON.stringify({ nominal: 1000000 }),
});
```

**After:**
```typescript
const res = await apiFetch(`/tabungan-haji/${rekId}/setor`, {
  method: "POST",
  headers: { "Content-Type": "application/json" }, // apiFetch adds Authorization + Idempotency-Key
  body: JSON.stringify({ nominal: 1000000 }),
});
// Idempotency-Key automatically added for POST!
```

#### Example 3: Error handling

Tetap sama, tapi sekarang apiFetch sudah handle 401 otomatis:

```typescript
const res = await apiFetch("/some-endpoint", { method: "POST", ... });

if (!res.ok) {
  const data = await res.json();
  // Handle specific error codes
  if (data.error === "VALIDATION_ERROR") {
    // Form validation failed
  } else if (data.error === "NOT_FOUND") {
    // Resource not found
  } else if (data.error === "IDEMPOTENCY_CONFLICT") {
    // Idempotency-Key conflict (shouldn't happen if using apiFetch)
  }
  return;
}

const result = await res.json();
```

---

## Files to Update

### Priority: High (directly affect user experience)

1. **`app/nasabah/page.tsx`** - list nasabah
   - Replace `fetch()` with `apiFetch()`
   - Already has `authHeaders()` usage

2. **`app/nasabah/[id]/page.tsx`** - view nasabah
   - Replace `fetch()` with `apiFetch()`

3. **`app/nasabah/register/page.tsx`** - register nasabah
   - Replace `fetch()` with `apiFetch()`

4. **`app/rekening/buka/page.tsx`** - buka rekening (setor)
   - **CRITICAL** - this is the SETOR endpoint
   - Replace `fetch()` with `apiFetch()` to get automatic Idempotency-Key
   - This fixes the token invalidation issue!

5. **`app/dashboard/page.tsx`** - dashboard
   - Replace `fetch()` with `apiFetch()`

### Priority: Medium (internal operations)

- Any other pages in `app/` that use `fetch()` + `authHeaders()`

### Priority: Low (helper cleanup)

- Remove `authHeaders()` helper (no longer needed in pages)
- Clean up `getToken()` helper if only used for `authHeaders()`

---

## Complete Migration Example

### Before (old pattern):

```typescript
"use client";

import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

function authHeaders() {
  const token = localStorage.getItem("bsi_token");
  return { Authorization: `Bearer ${token}` };
}

export default function MyPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    async function fetchData() {
      const res = await fetch(`${API_URL}/my-endpoint`, {
        headers: { ...authHeaders() },
      });
      const result = await res.json();
      if (res.ok) {
        setData(result);
      }
    }
    fetchData();
  }, []);

  return <div>{/* render data */}</div>;
}
```

### After (new pattern):

```typescript
"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

export default function MyPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    async function fetchData() {
      const res = await apiFetch("/my-endpoint");
      const result = await res.json();
      if (res.ok) {
        setData(result);
      }
    }
    fetchData();
  }, []);

  return <div>{/* render data */}</div>;
}
```

---

## Key Improvements

| Feature | Before | After |
|---------|--------|-------|
| **Authorization** | Manual header + `authHeaders()` helper | Automatic ✅ |
| **Token Refresh** | Manual if 401 | Automatic (max 1 retry) ✅ |
| **Logout on revoke** | Not handled | Automatic redirect to /login ✅ |
| **Idempotency** | Manual Idempotency-Key or none | Automatic UUID for POST/PUT ✅ |
| **Code duplication** | High (`authHeaders()` everywhere) | Low (single `apiFetch()`) ✅ |

---

## Testing Checklist

After updating your page:

- [ ] Login successfully → tokens saved to localStorage
- [ ] Make a request (GET/POST) → no Authorization errors
- [ ] Let token expire in dev → should auto-refresh and retry (if expired, not revoked)
- [ ] Do a setor/tarik → should have Idempotency-Key in request headers (check DevTools Network tab)
- [ ] Logout → tokens cleared, redirect to /login
- [ ] Try setor with network throttle → should auto-retry if timeout/network error

---

## Troubleshooting

### Issue: Still getting 401 UNAUTHORIZED

**Check:**
1. `bsi_token` exists in localStorage after login
2. Token is not expired (check in jwt.io or server logs)
3. Page is using `apiFetch()`, not `fetch()`

### Issue: Token not auto-refreshing

**Check:**
1. `bsi_refresh_token` exists in localStorage after login
2. Backend `POST /auth/refresh` endpoint is working (test with curl/Postman)
3. Refresh token is not expired (exp longer than access token)

### Issue: Still seeing redirect to login on 401

**Check:**
1. If error is "TOKEN_REVOKED" → correct behavior (user was logged out elsewhere)
2. If error is "UNAUTHORIZED" → should auto-retry once
3. Check server logs for `[auth]` debug messages

---

## Notes

- **Access token** expires in ~1 day (configurable via `JWT_EXPIRES_SECONDS`)
- **Refresh token** expires in ~7 days (configurable via `JWT_REFRESH_EXPIRES_SECONDS`)
- **Idempotency-Key** is auto-generated UUID (8-50 chars) for POST/PUT
- **Token blocklist** is in-memory (will lose on server restart); TODO: migrate to Redis/DB for multi-instance
- **Logout** calls `POST /auth/logout` which revokes current jti; to logout from all devices, need different strategy

---

## API Response Format Changes

### Login response (changed field names):

```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "nasabah": { "id": "...", "email": "..." }
}
```

### Refresh response:

```json
{
  "accessToken": "eyJhbGc..."
}
```

Make sure pages expecting `data.token` are updated to `data.accessToken`.
