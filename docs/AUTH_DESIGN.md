# FrameLord Authentication Design

**Version:** 1.0
**Date:** 2025-12-05
**Status:** Planning Phase
**Approach:** JWT-based with social login support

---

## Table of Contents

1. [Overview](#overview)
2. [Design Principles](#design-principles)
3. [Authentication Flows](#authentication-flows)
4. [Token Management](#token-management)
5. [Contact Zero Integration](#contact-zero-integration)
6. [Social Login](#social-login)
7. [Security Considerations](#security-considerations)
8. [Account Management](#account-management)

---

## Overview

FrameLord's authentication system is designed to seamlessly integrate with the Contact-centric architecture, where **Contact Zero** represents the authenticated user. Authentication creates both a user account and Contact Zero in a single atomic operation.

### Core Requirements

- **JWT-based authentication:** Stateless, scalable, works offline
- **Contact Zero mapping:** User account ↔ Contact Zero linkage
- **Social login:** Google, GitHub (email/password fallback)
- **Secure by default:** HTTPS only, secure token storage
- **Offline support:** Cached tokens work offline
- **Multi-device:** Same account on multiple devices

---

## Design Principles

1. **User Account = Contact Zero:** One-to-one mapping, created together
2. **Stateless Tokens:** JWT contains user_id + contact_zero_id, no server session
3. **Refresh Tokens:** Long-lived refresh tokens for seamless re-authentication
4. **Social First:** Encourage Google/GitHub login, email/password as fallback
5. **Privacy:** No tracking, no analytics on auth flows
6. **Developer-Friendly:** Clear error messages, easy to debug

---

## Authentication Flows

### 1. Registration Flow

**User Action:** Sign up with email/password or social login

**Steps:**

```
┌─────────────────────────────────────────────────────────┐
│  1. User visits /signup                                 │
│     - Enters email, password, full name                 │
│     - Or clicks "Sign up with Google"                   │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  2. Backend: Create User + Contact Zero (atomic)        │
│     BEGIN TRANSACTION;                                  │
│       INSERT INTO users (email, password_hash, ...)     │
│       INSERT INTO contacts (user_id, is_contact_zero)   │
│       INSERT INTO folders (default PARA folders)        │
│     COMMIT;                                             │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  3. Backend: Generate Tokens                            │
│     access_token = JWT({                                │
│       sub: user_id,                                     │
│       email: user@example.com,                          │
│       contact_zero_id: cnt_zero_123,                    │
│       exp: now + 1 hour                                 │
│     })                                                  │
│                                                         │
│     refresh_token = JWT({                               │
│       sub: user_id,                                     │
│       type: 'refresh',                                  │
│       exp: now + 30 days                                │
│     })                                                  │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  4. Response: Return User + Tokens                      │
│     {                                                   │
│       user: { id, email, full_name },                   │
│       contact_zero: { id, full_name, avatar_url },      │
│       access_token: "eyJhbGciOiJIUzI1NiIs...",          │
│       refresh_token: "eyJhbGciOiJIUzI1NiIs...",         │
│       expires_in: 3600                                  │
│     }                                                   │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  5. Client: Store Tokens + Initialize App               │
│     - Store access_token in memory                      │
│     - Store refresh_token in secure storage (httpOnly)  │
│     - Fetch initial data (contacts, notes, tasks)       │
│     - Load Contact Zero into contactStore               │
└─────────────────────────────────────────────────────────┘
```

**API Request:**
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe",
  "avatar_url": "data:image/png;base64,..."  // Optional
}
```

**API Response (201 Created):**
```json
{
  "data": {
    "user": {
      "id": "usr_abc123",
      "email": "user@example.com",
      "full_name": "John Doe",
      "email_verified_at": null,
      "created_at": "2025-12-05T10:30:00Z"
    },
    "contact_zero": {
      "id": "cnt_zero_abc123",
      "full_name": "John Doe",
      "email": "user@example.com",
      "avatar_url": "data:image/png;base64,...",
      "is_contact_zero": true,
      "relationship_role": "self",
      "status": "active",
      "frame": {
        "current_score": null,
        "trend": "flat",
        "last_scan_at": null
      },
      "tags": [],
      "created_at": "2025-12-05T10:30:00Z"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 3600
  }
}
```

---

### 2. Login Flow

**User Action:** Sign in with email/password or social login

**Steps:**

```
┌─────────────────────────────────────────────────────────┐
│  1. User visits /login                                  │
│     - Enters email, password                            │
│     - Or clicks "Sign in with Google"                   │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  2. Backend: Verify Credentials                         │
│     - Lookup user by email                              │
│     - Verify password hash (bcrypt)                     │
│     - Or verify social OAuth token                      │
└────────────────┬────────────────────────────────────────┘
                 │
      ┌──────────┴──────────┐
      │                     │
      ▼                     ▼
┌─────────────┐      ┌─────────────┐
│  VALID      │      │  INVALID    │
└──────┬──────┘      └──────┬──────┘
       │                    │
       │                    ▼
       │             ┌──────────────────┐
       │             │ 401 Unauthorized │
       │             │ "Invalid email   │
       │             │  or password"    │
       │             └──────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  3. Backend: Generate Tokens                            │
│     - Same as registration flow                         │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  4. Response: Return User + Tokens                      │
│     - Same as registration flow                         │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  5. Client: Store Tokens + Load Data                    │
│     - Update last_login_at in users table               │
└─────────────────────────────────────────────────────────┘
```

**API Request:**
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**API Response (200 OK):**
```json
{
  "data": {
    "user": { ... },
    "contact_zero": { ... },
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 3600
  }
}
```

---

### 3. Token Refresh Flow

**Trigger:** Access token expires (1 hour lifetime)

**Steps:**

```
┌─────────────────────────────────────────────────────────┐
│  1. Client: Detect Token Expiration                     │
│     - API returns 401 Unauthorized                      │
│     - Or client checks exp claim before request         │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  2. Client: Request New Access Token                    │
│     POST /auth/refresh                                  │
│     { refresh_token: "eyJhbGciOiJIUzI1NiIs..." }        │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  3. Backend: Verify Refresh Token                       │
│     - Decode JWT                                        │
│     - Check exp claim (30 days)                         │
│     - Check if token is revoked (optional blacklist)    │
└────────────────┬────────────────────────────────────────┘
                 │
      ┌──────────┴──────────┐
      │                     │
      ▼                     ▼
┌─────────────┐      ┌─────────────┐
│  VALID      │      │  INVALID    │
└──────┬──────┘      └──────┬──────┘
       │                    │
       │                    ▼
       │             ┌──────────────────┐
       │             │ 401 Unauthorized │
       │             │ "Refresh token   │
       │             │  expired"        │
       │             └──────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  4. Backend: Generate New Access Token                  │
│     access_token = JWT({                                │
│       sub: user_id,                                     │
│       email: user@example.com,                          │
│       contact_zero_id: cnt_zero_123,                    │
│       exp: now + 1 hour                                 │
│     })                                                  │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  5. Response: Return New Access Token                   │
│     {                                                   │
│       access_token: "eyJhbGciOiJIUzI1NiIs...",          │
│       expires_in: 3600                                  │
│     }                                                   │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  6. Client: Update Stored Token                         │
│     - Replace old access_token in memory                │
│     - Retry original API request                        │
└─────────────────────────────────────────────────────────┘
```

**API Request:**
```http
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**API Response (200 OK):**
```json
{
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 3600
  }
}
```

---

### 4. Logout Flow

**User Action:** Sign out

**Steps:**

```
┌─────────────────────────────────────────────────────────┐
│  1. Client: Clear Tokens                                │
│     - Delete access_token from memory                   │
│     - Delete refresh_token from secure storage          │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  2. Client: Clear Local Data (Optional)                 │
│     - Clear in-memory stores                            │
│     - Or keep cached for next login                     │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  3. Backend: Revoke Refresh Token (Optional)            │
│     POST /auth/logout                                   │
│     - Add refresh_token to blacklist                    │
│     - Or use short-lived tokens and skip blacklist      │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  4. Redirect to Login                                   │
└─────────────────────────────────────────────────────────┘
```

**API Request:**
```http
POST /auth/logout
Authorization: Bearer <access_token>
```

**API Response (204 No Content)**

---

## Token Management

### JWT Structure

**Access Token Payload:**
```json
{
  "sub": "usr_abc123",              // User ID
  "email": "user@example.com",
  "contact_zero_id": "cnt_zero_abc123",
  "iat": 1701234567,                // Issued at (Unix timestamp)
  "exp": 1701238167,                // Expires at (Unix timestamp)
  "jti": "token_unique_id"          // JWT ID (for revocation)
}
```

**Refresh Token Payload:**
```json
{
  "sub": "usr_abc123",
  "type": "refresh",
  "iat": 1701234567,
  "exp": 1703826567,                // 30 days from issue
  "jti": "refresh_token_unique_id"
}
```

### Token Lifetimes

| Token Type | Lifetime | Storage | Purpose |
|------------|----------|---------|---------|
| Access Token | 1 hour | Memory (JS variable) | API authentication |
| Refresh Token | 30 days | Secure cookie (httpOnly, SameSite) | Token refresh |

### Token Storage (Client-Side)

**Web App:**
```typescript
// Access token: In-memory only (cleared on tab close)
let accessToken: string | null = null;

function setAccessToken(token: string) {
  accessToken = token;
}

// Refresh token: httpOnly cookie (set by server)
// Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000
```

**Desktop/Mobile App:**
```typescript
// Access token: In-memory
let accessToken: string | null = null;

// Refresh token: Secure storage
// - Desktop: Electron safeStorage / Keychain
// - Mobile: iOS Keychain / Android Keystore
import { SecureStore } from './platform';

async function storeRefreshToken(token: string) {
  await SecureStore.set('refresh_token', token);
}

async function getRefreshToken(): Promise<string | null> {
  return await SecureStore.get('refresh_token');
}
```

### Token Revocation (Optional)

For enhanced security, maintain a token blacklist:

```sql
CREATE TABLE token_revocations (
  jti VARCHAR(255) PRIMARY KEY,        -- JWT ID
  user_id UUID NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Index for fast lookup
CREATE INDEX idx_token_revocations_user_id ON token_revocations(user_id);

-- Auto-delete expired revocations (cron job)
DELETE FROM token_revocations WHERE expires_at < NOW();
```

**On logout:**
```sql
INSERT INTO token_revocations (jti, user_id, expires_at)
VALUES ('refresh_token_unique_id', 'usr_abc123', '2025-12-15T10:30:00Z');
```

**On token validation:**
```sql
SELECT 1 FROM token_revocations WHERE jti = 'refresh_token_unique_id';
-- If found, reject token
```

---

## Contact Zero Integration

### User-Contact Zero Mapping

**Database Constraint:**
```sql
-- In contacts table
UNIQUE(user_id, is_contact_zero) WHERE is_contact_zero = TRUE
```

This ensures:
- One user → one Contact Zero
- Contact Zero is never deleted (unless user account is deleted)

### Contact Zero Creation

**On user registration:**
```sql
BEGIN TRANSACTION;

-- 1. Create user account
INSERT INTO users (id, email, password_hash, full_name, created_at)
VALUES ('usr_abc123', 'user@example.com', '$2b$10$...', 'John Doe', NOW())
RETURNING id;

-- 2. Create Contact Zero
INSERT INTO contacts (
  id, user_id, full_name, email, avatar_url,
  is_contact_zero, relationship_domain, relationship_role, status,
  created_at, updated_at
)
VALUES (
  'cnt_zero_abc123', 'usr_abc123', 'John Doe', 'user@example.com', NULL,
  TRUE, 'hybrid', 'self', 'active',
  NOW(), NOW()
)
RETURNING id;

-- 3. Create default PARA folders
INSERT INTO folders (id, user_id, name, is_default, sort_order, created_at)
VALUES
  ('folder_projects_abc123', 'usr_abc123', 'Projects', TRUE, 0, NOW()),
  ('folder_areas_abc123', 'usr_abc123', 'Areas', TRUE, 1, NOW()),
  ('folder_resources_abc123', 'usr_abc123', 'Resources', TRUE, 2, NOW()),
  ('folder_archive_abc123', 'usr_abc123', 'Archive', TRUE, 3, NOW());

COMMIT;
```

### Contact Zero in JWT

Include `contact_zero_id` in access token payload so client can immediately identify Contact Zero without extra API call:

```typescript
// Client: Parse JWT on login
const decodedToken = jwt.decode(accessToken);
const CONTACT_ZERO_ID = decodedToken.contact_zero_id;

// Client: Load Contact Zero into store
const contactZero = await fetch(`/api/v1/contacts/${CONTACT_ZERO_ID}`, {
  headers: { Authorization: `Bearer ${accessToken}` }
});

contactStore.setContactZero(contactZero);
```

### Protecting Contact Zero

**API Validation:**
```typescript
// Backend: Prevent Contact Zero deletion
app.delete('/api/v1/contacts/:id', async (req, res) => {
  const contact = await getContactById(req.params.id);

  if (contact.is_contact_zero) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Cannot delete Contact Zero. Delete your account instead.'
      }
    });
  }

  await deleteContact(req.params.id);
  res.status(204).send();
});
```

---

## Social Login

### Supported Providers

1. **Google OAuth 2.0**
2. **GitHub OAuth**
3. **Email/Password (fallback)**

### Google OAuth Flow

**Steps:**

```
┌─────────────────────────────────────────────────────────┐
│  1. User clicks "Sign in with Google"                   │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  2. Client: Redirect to Google OAuth                    │
│     https://accounts.google.com/o/oauth2/v2/auth?       │
│       client_id=<google_client_id>&                     │
│       redirect_uri=https://framelord.ai/auth/google&    │
│       response_type=code&                               │
│       scope=openid email profile                        │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  3. User: Authorize FrameLord on Google                 │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  4. Google: Redirect to /auth/google?code=<auth_code>   │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  5. Backend: Exchange Code for Token                    │
│     POST https://oauth2.googleapis.com/token            │
│     {                                                   │
│       code: <auth_code>,                                │
│       client_id: <google_client_id>,                    │
│       client_secret: <google_client_secret>,            │
│       redirect_uri: https://framelord.ai/auth/google,   │
│       grant_type: authorization_code                    │
│     }                                                   │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  6. Backend: Get User Profile                           │
│     GET https://www.googleapis.com/oauth2/v1/userinfo   │
│     Authorization: Bearer <google_access_token>         │
│                                                         │
│     Response:                                           │
│     {                                                   │
│       email: "user@gmail.com",                          │
│       name: "John Doe",                                 │
│       picture: "https://..."                            │
│     }                                                   │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  7. Backend: Create or Login User                       │
│     - Check if user exists (by email)                   │
│     - If new: create user + Contact Zero                │
│     - If exists: update last_login_at                   │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  8. Backend: Generate FrameLord Tokens                  │
│     - access_token, refresh_token                       │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  9. Redirect to App with Tokens                         │
│     https://app.framelord.ai/#token=<access_token>      │
└─────────────────────────────────────────────────────────┘
```

**Database Schema for Social Login:**
```sql
ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN github_id VARCHAR(255) UNIQUE;

-- Allow null password_hash for social login users
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
```

**Backend Logic:**
```typescript
async function handleGoogleCallback(googleProfile: GoogleProfile) {
  // Check if user exists by Google ID
  let user = await getUserByGoogleId(googleProfile.id);

  if (!user) {
    // Check if user exists by email
    user = await getUserByEmail(googleProfile.email);

    if (user) {
      // Link existing account to Google
      await updateUser(user.id, { google_id: googleProfile.id });
    } else {
      // Create new user + Contact Zero
      user = await createUser({
        email: googleProfile.email,
        full_name: googleProfile.name,
        avatar_url: googleProfile.picture,
        google_id: googleProfile.id,
        email_verified_at: new Date(), // Google verified
      });

      await createContactZero(user.id, {
        full_name: googleProfile.name,
        email: googleProfile.email,
        avatar_url: googleProfile.picture,
      });
    }
  }

  // Generate tokens
  const tokens = generateTokens(user);
  return tokens;
}
```

---

## Security Considerations

### 1. HTTPS Only

**Enforce HTTPS in production:**
```typescript
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});
```

### 2. Password Security

**Hashing with bcrypt:**
```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- Optional: special character

```typescript
function validatePassword(password: string): boolean {
  const minLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return minLength && hasUppercase && hasLowercase && hasNumber;
}
```

### 3. Token Security

**JWT Signing:**
```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET; // Store in env, rotate regularly

function generateAccessToken(user: User): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      contact_zero_id: user.contact_zero_id,
    },
    JWT_SECRET,
    {
      expiresIn: '1h',
      algorithm: 'HS256',
    }
  );
}
```

**Token Validation:**
```typescript
function verifyAccessToken(token: string): User | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded as User;
  } catch (error) {
    // Token expired or invalid
    return null;
  }
}
```

### 4. CSRF Protection

For web apps using cookies, implement CSRF tokens:

```typescript
import csrf from 'csurf';

const csrfProtection = csrf({ cookie: true });

app.post('/auth/login', csrfProtection, async (req, res) => {
  // CSRF token validated automatically
  // ...
});
```

### 5. Rate Limiting

Prevent brute-force attacks:

```typescript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts. Try again in 15 minutes.',
});

app.post('/auth/login', authLimiter, async (req, res) => {
  // ...
});
```

### 6. Email Verification (Optional)

Send verification email on signup:

```typescript
async function sendVerificationEmail(user: User) {
  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '24h' });
  const verificationUrl = `https://framelord.ai/verify-email?token=${token}`;

  await sendEmail({
    to: user.email,
    subject: 'Verify your FrameLord account',
    body: `Click here to verify: ${verificationUrl}`,
  });
}

app.get('/auth/verify-email', async (req, res) => {
  const { token } = req.query;
  const decoded = jwt.verify(token, JWT_SECRET);

  await updateUser(decoded.sub, { email_verified_at: new Date() });

  res.redirect('/login?verified=true');
});
```

---

## Account Management

### 1. Password Reset

**Flow:**

```
1. User clicks "Forgot password?"
2. User enters email
3. Backend sends reset email with token
4. User clicks link → reset password form
5. User enters new password
6. Backend updates password_hash
7. Redirect to login
```

**API:**
```http
POST /auth/forgot-password
{ "email": "user@example.com" }

→ 200 OK (email sent)

POST /auth/reset-password
{
  "token": "reset_token_...",
  "new_password": "NewSecurePass123!"
}

→ 200 OK (password updated)
```

### 2. Change Email

**Flow:**

```
1. User updates email in settings
2. Backend sends verification email to NEW email
3. User clicks verification link
4. Backend updates users.email
5. Optionally send notification to OLD email
```

### 3. Delete Account

**Flow:**

```
1. User clicks "Delete account" in settings
2. Confirm with password
3. Backend:
   - Soft delete: users.status = 'deleted'
   - Hard delete (after 30 days): DELETE FROM users WHERE id = ...
   - Cascade deletes: contacts, notes, tasks, etc.
4. Logout user
```

**API:**
```http
DELETE /auth/account
Authorization: Bearer <token>
{
  "password": "CurrentPassword123"
}

→ 204 No Content (account deleted)
```

---

## Implementation Checklist

### Backend (Node.js + Express)

- [ ] Install dependencies: `bcrypt`, `jsonwebtoken`, `express-rate-limit`
- [ ] Create `users` table in PostgreSQL
- [ ] Implement `/auth/register` endpoint
- [ ] Implement `/auth/login` endpoint
- [ ] Implement `/auth/refresh` endpoint
- [ ] Implement `/auth/logout` endpoint
- [ ] Implement `/auth/me` endpoint
- [ ] Add JWT middleware for protected routes
- [ ] Add rate limiting to auth endpoints
- [ ] Set up HTTPS in production
- [ ] Add CSRF protection for cookies
- [ ] Implement Google OAuth flow
- [ ] Implement GitHub OAuth flow
- [ ] Add email verification (optional)
- [ ] Add password reset flow

### Frontend (React)

- [ ] Create login/signup UI
- [ ] Implement token storage (memory + secure storage)
- [ ] Add automatic token refresh on 401
- [ ] Add logout functionality
- [ ] Integrate Contact Zero into `contactStore`
- [ ] Add "Sign in with Google" button
- [ ] Add "Sign in with GitHub" button
- [ ] Add password reset flow
- [ ] Show sync status with auth state

---

## Open Questions for Product Decisions

1. **Email Verification:**
   - Required on signup? Or allow unverified users?
   - **Recommendation:** Optional for now, required later for premium features

2. **Multi-Factor Authentication (MFA):**
   - Support 2FA (TOTP, SMS)?
   - **Recommendation:** Not in v1, add in v2 for enterprise users

3. **Session Management:**
   - Allow user to view active sessions?
   - Allow remote logout (kill all sessions)?
   - **Recommendation:** Yes, add to settings in v1.1

4. **Account Linking:**
   - Allow linking Google + GitHub to same account?
   - **Recommendation:** Yes, link by email match

5. **Password Policy:**
   - Enforce password expiration (90 days)?
   - **Recommendation:** No, rely on user awareness + breach detection

---

## Next Steps

1. **Set up PostgreSQL:** Create `users` table and constraints
2. **Implement JWT Middleware:** Build auth middleware for protected routes
3. **Build Login UI:** Design login/signup forms
4. **Test OAuth Flow:** Set up Google OAuth and test end-to-end
5. **Security Audit:** Review token storage and HTTPS setup

---

**End of Authentication Design Document**
