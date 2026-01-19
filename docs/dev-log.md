# Development Log

## 2026-01-09 PKCE Code Verifier Authentication Issue

### Issue
Magic link authentication was failing with error:
```
AuthPKCECodeVerifierMissingError: PKCE code verifier not found in storage. 
This can happen if the auth flow was initiated in a different browser or device, 
or if the storage was cleared. For SSR frameworks (Next.js, SvelteKit, etc.), 
use @supabase/ssr on both the server and client to store the code verifier in cookies.
```

**Symptoms:**
- User clicks "Send Magic Link" → receives email → clicks magic link
- Redirects to `/auth/callback` but then redirects back to login page
- Error occurs in callback route when calling `exchangeCodeForSession(code)`

### Root Cause
The `@supabase/ssr` package version `^0.1.0` had known bugs with PKCE code verifier cookie handling in SSR contexts. The cookie was being set on the client and received on the server, but Supabase's internal code in v0.1.0 couldn't properly read/parse the code verifier from cookies.

### Debugging Process
1. Added instrumentation to track cookie setting/reading on both client and server
2. Confirmed cookies were being set correctly on client side
3. Confirmed cookies were present on server side in callback route
4. Identified that Supabase's internal `getAll()` calls weren't finding the code verifier
5. Discovered outdated package version through web search and version comparison

### Solution
1. **Updated `@supabase/ssr`** from `^0.1.0` to `^0.5.1` in `package.json`
   - Version 0.5.1 includes fixes for PKCE cookie encoding/decoding
   - Improved cookie handling in Next.js App Router server components
   - Better code verifier persistence across redirects

2. **Enhanced cookie configuration** in `lib/supabase/client.ts`:
   - Added default `path: '/'` to ensure cookies accessible across routes
   - Added default `sameSite: 'lax'` to allow cookies on redirects
   - These improvements ensure proper cookie behavior (though version update was primary fix)

### Files Modified
- `project/package.json` - Updated `@supabase/ssr` to `^0.5.1`
- `project/lib/supabase/client.ts` - Added default cookie options (path, sameSite)
- `project/app/auth/callback/route.ts` - No changes needed (already correctly configured)

### Verification
After updating the package and restarting the dev server, magic link authentication works correctly:
- User receives magic link email
- Clicking link redirects to callback route
- `exchangeCodeForSession()` successfully finds code verifier
- User is authenticated and redirected to dashboard

### Lessons Learned
- Always check package versions when encountering library-specific errors
- `@supabase/ssr` v0.1.0 is outdated and has known PKCE bugs
- Cookie configuration (path, sameSite) is critical for SSR authentication flows
- Debugging with runtime evidence (logs) was essential to identify the root cause
