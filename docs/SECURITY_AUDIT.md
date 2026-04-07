# Security Audit Report - Portfolio Tracker

**Date:** April 2026  
**Status:** In Progress  
**Reviewer:** Automated + Manual

---

## Current Security Implementation

### ✅ Implemented Security Features

| Feature | Status | Details |
|---------|--------|---------|
| Password Hashing | ✅ | scrypt with 16-byte salt (64-byte hash) |
| Session Management | ✅ | DB-backed sessions with 30-day TTL |
| Session Rotation | ✅ | Token-based with HMAC-SHA256 signature |
| Rate Limiting (Auth) | ✅ | 5 attempts, 15-minute lockout |
| Rate Limiting (API) | ✅ | 60 requests/minute per IP |
| Account Lockout | ✅ | Email + IP based lockouts |
| Login Attempt Tracking | ✅ | Full audit trail in database |
| Secure Cookies | ✅ | httpOnly, sameSite=lax, secure in prod |
| CSRF Protection | ✅ | Built-in Next.js protections |

### Database Security Tables

- `login_attempts` - Track failed login attempts
- `account_lockouts` - Temporary account/IP lockouts
- `sessions` - Active session management

---

## Security Analysis

### Strengths

1. **Brute-force Protection**: Account locked after 5 failed attempts for 15 minutes
2. **Session Security**: 
   - HttpOnly cookies prevent XSS token theft
   - DB-backed sessions allow invalidation
   - HMAC-signed tokens prevent tampering
3. **Rate Limiting**: Per-IP rate limiting on API endpoints
4. **Audit Trail**: All login attempts recorded

### Areas for Improvement

| Area | Risk Level | Recommendation |
|------|------------|----------------|
| MFA/2FA | Medium | Not implemented |
| Password Strength | Low | No enforcement policy |
| Session Fixation | Low | Should rotate on login |
| Suspicious Activity | Medium | No anomaly detection |

---

## MFA/2FA Options Analysis

### Option 1: NextAuth.js (Recommended)

**Pros:**
- Built-in MFA support (TOTP, WebAuthn)
- OAuth providers (Google, GitHub)
- Battle-tested with Next.js
- Session management included

**Cons:**
- Requires refactoring current auth
- Additional dependency

**Implementation:**
```bash
npm install next-auth
```

### Option 2: Clerk

**Pros:**
- Complete auth solution
- Built-in MFA, fraud detection
- No backend code needed
- Free tier available

**Cons:**
- Vendor lock-in
- Additional cost at scale
- Privacy considerations

### Option 3: Custom TOTP Implementation

**Pros:**
- Full control
- No external dependencies
- Can implement incrementally

**Cons:**
- More development time
- Security audit required
- Key management complexity

**Implementation:**
```bash
npm install otplib @otplib/preset-v11
```

### Option 4: WebAuthn (Passkeys)

**Pros:**
- Phishing-resistant
- Passwordless
- Future-proof

**Cons:**
- Browser support varies
- Complex implementation
- Recovery options needed

---

## Recommendations

### Short-term (This Sprint)

1. **Add password strength validation**
   - Minimum 8 characters
   - Mix of uppercase, lowercase, numbers
   - Check against common passwords

2. **Session rotation on login**
   - Invalidate old session
   - Create new session token
   - Prevent session fixation

### Medium-term (Next Sprint)

3. **Implement TOTP-based 2FA**
   - Use `otplib` library
   - QR code generation
   - Backup codes

4. **Add suspicious activity alerts**
   - New device detection
   - IP change alerts
   - Multiple failed attempts notification

### Long-term (Future)

5. **Consider Passkeys**
   - WebAuthn implementation
   - Better UX than TOTP
   - Higher security

---

## Implementation Plan: TOTP 2FA

### Database Changes

```sql
ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(255);
ALTER TABLE users ADD COLUMN backup_codes JSONB;
```

### Required Environment Variables

```
TOTP_ISSUER=PortfolioTracker
TOTP_SECRET_LENGTH=32
```

### User Flow

1. User enables 2FA in settings
2. Generate secret, display QR code
3. User scans with authenticator app
4. Verify first code to confirm
5. Generate and store backup codes

---

## Security Checklist for Production

- [x] Password hashing (scrypt)
- [x] Session management
- [x] Rate limiting
- [x] Account lockout
- [x] Login audit trail
- [x] Secure cookies
- [ ] MFA/2FA
- [ ] Password strength policy
- [ ] Session fixation protection
- [ ] Suspicious activity alerts

---

## Next Steps

1. **Decision**: Choose MFA provider (recommend NextAuth or custom TOTP)
2. **Implementation**: Add MFA tables and endpoints
3. **Testing**: Security testing with OWASP guidelines
4. **Documentation**: User guide for enabling MFA

---

*This document will be updated as security measures are implemented.*
