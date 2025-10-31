# Technical Specification: Facebook Authentication

## System Architecture

### High-Level Architecture Diagram
```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   User      │◄───────►│  PageWatcher │◄───────►│  Facebook    │
│   Browser   │         │  Application │         │  OAuth API   │
└─────────────┘         └──────────────┘         └──────────────┘
                              │
                              │
                              ▼
                        ┌──────────────┐
                        │  PostgreSQL  │
                        │  Database    │
                        └──────────────┘
```

## API Endpoints Specification

### 1. Authentication Endpoints

#### `GET /auth/facebook`
Initiates the Facebook OAuth flow.

**Request:**
```
GET /auth/facebook
```

**Response:**
```
HTTP 302 Redirect to Facebook
Location: https://www.facebook.com/v18.0/dialog/oauth?
  client_id={app_id}&
  redirect_uri={redirect_uri}&
  state={csrf_token}&
  scope=pages_show_list,pages_read_engagement,pages_read_user_content
```

**Security:**
- Generates cryptographically secure state token
- Stores state in session for verification
- Sets session cookie with httpOnly and secure flags

---

#### `GET /auth/facebook/callback`
Handles the OAuth callback from Facebook.

**Request:**
```
GET /auth/facebook/callback?code={auth_code}&state={state}
```

**Success Response:**
```json
HTTP 200 OK
{
  "success": true,
  "user": {
    "id": "user_123",
    "facebook_id": "fb_456789",
    "name": "John Doe"
  },
  "redirect": "/dashboard"
}
```

**Error Responses:**
```json
HTTP 400 Bad Request
{
  "error": "invalid_state",
  "message": "CSRF token validation failed"
}

HTTP 401 Unauthorized
{
  "error": "access_denied",
  "message": "User denied permissions"
}

HTTP 500 Internal Server Error
{
  "error": "token_exchange_failed",
  "message": "Failed to exchange authorization code"
}
```

**Process Flow:**
1. Validate state parameter against session
2. Exchange authorization code for access token
3. Fetch user information from Facebook
4. Store encrypted tokens in database
5. Create user session
6. Redirect to dashboard

---

#### `POST /auth/logout`
Logs out the current user.

**Request:**
```json
POST /auth/logout
{
  "revoke_token": true
}
```

**Response:**
```json
HTTP 200 OK
{
  "success": true,
  "message": "Successfully logged out"
}
```

**Process:**
1. Revoke Facebook access token (if requested)
2. Delete tokens from database
3. Clear user session
4. Clear cookies

---

### 2. Page Management Endpoints

#### `GET /api/pages`
Retrieves list of Facebook pages accessible to the user.

**Request:**
```
GET /api/pages
Authorization: Bearer {session_token}
```

**Response:**
```json
HTTP 200 OK
{
  "pages": [
    {
      "id": "page_123",
      "facebook_page_id": "fb_page_456",
      "name": "My Business Page",
      "category": "Business",
      "access_token": null,
      "monitoring_enabled": false
    }
  ],
  "total": 1
}
```

**Error Response:**
```json
HTTP 401 Unauthorized
{
  "error": "token_expired",
  "message": "Access token has expired"
}
```

---

#### `POST /api/pages/{page_id}/monitor`
Enables monitoring for a specific page.

**Request:**
```json
POST /api/pages/page_123/monitor
Authorization: Bearer {session_token}
{
  "check_interval": 300,
  "notifications_enabled": true
}
```

**Response:**
```json
HTTP 200 OK
{
  "success": true,
  "page": {
    "id": "page_123",
    "monitoring_enabled": true,
    "check_interval": 300
  }
}
```

---

#### `DELETE /api/pages/{page_id}/monitor`
Disables monitoring for a specific page.

**Request:**
```
DELETE /api/pages/page_123/monitor
Authorization: Bearer {session_token}
```

**Response:**
```json
HTTP 200 OK
{
  "success": true,
  "message": "Monitoring disabled for page"
}
```

---

### 3. Token Management Endpoints

#### `POST /api/auth/refresh`
Refreshes the access token.

**Request:**
```
POST /api/auth/refresh
Authorization: Bearer {session_token}
```

**Response:**
```json
HTTP 200 OK
{
  "success": true,
  "expires_at": "2024-12-31T23:59:59Z"
}
```

---

## Data Models

### User Model
```typescript
interface User {
  id: string;                    // Primary key
  facebook_user_id: string;      // Facebook user ID
  username: string;              // Display name
  email?: string;                // Optional email
  created_at: Date;
  updated_at: Date;
}
```

### Token Model
```typescript
interface Token {
  id: string;                    // Primary key
  user_id: string;               // Foreign key to User
  encrypted_access_token: string; // AES-256 encrypted
  token_type: string;            // "Bearer"
  expires_at: Date;
  encrypted_refresh_token?: string; // Optional refresh token
  scope: string;                 // Comma-separated scopes
  created_at: Date;
  updated_at: Date;
}
```

### Page Model
```typescript
interface Page {
  id: string;                    // Primary key
  user_id: string;               // Foreign key to User
  facebook_page_id: string;      // Facebook page ID
  page_name: string;
  page_url: string;
  category?: string;
  monitoring_enabled: boolean;
  check_interval?: number;       // Seconds between checks
  last_checked?: Date;
  created_at: Date;
  updated_at: Date;
}
```

### Monitoring Event Model
```typescript
interface MonitoringEvent {
  id: string;                    // Primary key
  page_id: string;               // Foreign key to Page
  event_type: string;            // "post", "update", "comment"
  content?: string;              // Event content
  facebook_event_id: string;     // Facebook object ID
  detected_at: Date;
  processed: boolean;
  created_at: Date;
}
```

---

## Authentication Flow Diagram

```
User                PageWatcher          Facebook           Database
 │                       │                   │                  │
 │   Click "Login"       │                   │                  │
 ├──────────────────────►│                   │                  │
 │                       │                   │                  │
 │                       │ Generate State    │                  │
 │                       ├──────────────────────────────────────►│
 │                       │                   │                  │
 │   Redirect to FB      │                   │                  │
 │◄──────────────────────┤                   │                  │
 │                       │                   │                  │
 │   Authorize App       │                   │                  │
 ├───────────────────────┴──────────────────►│                  │
 │                                           │                  │
 │   Authorization Code                      │                  │
 │◄──────────────────────────────────────────┤                  │
 │                       │                   │                  │
 │   Callback with code  │                   │                  │
 ├──────────────────────►│                   │                  │
 │                       │                   │                  │
 │                       │ Validate State    │                  │
 │                       ├──────────────────────────────────────►│
 │                       │                   │                  │
 │                       │ Exchange Code     │                  │
 │                       ├──────────────────►│                  │
 │                       │                   │                  │
 │                       │ Access Token      │                  │
 │                       │◄──────────────────┤                  │
 │                       │                   │                  │
 │                       │ Get User Info     │                  │
 │                       ├──────────────────►│                  │
 │                       │                   │                  │
 │                       │ User Data         │                  │
 │                       │◄──────────────────┤                  │
 │                       │                   │                  │
 │                       │ Store Encrypted Token                │
 │                       ├──────────────────────────────────────►│
 │                       │                   │                  │
 │   Redirect to Dashboard                   │                  │
 │◄──────────────────────┤                   │                  │
 │                       │                   │                  │
```

---

## Token Encryption Specification

### Encryption Algorithm
- **Algorithm:** AES-256-GCM
- **Key Derivation:** PBKDF2 with SHA-256
- **Iterations:** 100,000
- **Salt:** 16 bytes (unique per token)
- **IV:** 12 bytes (unique per encryption)

### Encryption Process
```python
def encrypt_token(token: str, encryption_key: str) -> dict:
    """
    Encrypts a token using AES-256-GCM.
    
    Returns:
        {
            'encrypted_data': base64_encoded_string,
            'salt': base64_encoded_string,
            'iv': base64_encoded_string,
            'tag': base64_encoded_string
        }
    """
    salt = os.urandom(16)
    iv = os.urandom(12)
    
    # Derive key from encryption_key and salt
    key = PBKDF2(encryption_key, salt, dkLen=32, count=100000)
    
    # Encrypt using AES-GCM
    cipher = AES.new(key, AES.MODE_GCM, nonce=iv)
    ciphertext, tag = cipher.encrypt_and_digest(token.encode())
    
    return {
        'encrypted_data': base64.b64encode(ciphertext).decode(),
        'salt': base64.b64encode(salt).decode(),
        'iv': base64.b64encode(iv).decode(),
        'tag': base64.b64encode(tag).decode()
    }
```

### Decryption Process
```python
def decrypt_token(encrypted_data: dict, encryption_key: str) -> str:
    """
    Decrypts a token using AES-256-GCM.
    """
    salt = base64.b64decode(encrypted_data['salt'])
    iv = base64.b64decode(encrypted_data['iv'])
    tag = base64.b64decode(encrypted_data['tag'])
    ciphertext = base64.b64decode(encrypted_data['encrypted_data'])
    
    # Derive key
    key = PBKDF2(encryption_key, salt, dkLen=32, count=100000)
    
    # Decrypt
    cipher = AES.new(key, AES.MODE_GCM, nonce=iv)
    plaintext = cipher.decrypt_and_verify(ciphertext, tag)
    
    return plaintext.decode()
```

---

## Facebook API Integration

### Required Facebook Permissions

| Permission | Scope | Purpose |
|-----------|-------|---------|
| `pages_show_list` | Read | List user's pages |
| `pages_read_engagement` | Read | View page posts and engagement |
| `pages_read_user_content` | Read | View user-generated content |

### Facebook API Calls

#### Get User Pages
```http
GET /v18.0/me/accounts
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "data": [
    {
      "id": "123456789",
      "name": "My Page",
      "access_token": "page_access_token",
      "category": "Business"
    }
  ],
  "paging": {
    "cursors": {
      "before": "...",
      "after": "..."
    }
  }
}
```

#### Get Page Posts
```http
GET /v18.0/{page_id}/feed
Authorization: Bearer {page_access_token}
```

**Response:**
```json
{
  "data": [
    {
      "id": "post_id",
      "message": "Post content",
      "created_time": "2024-01-01T12:00:00+0000"
    }
  ]
}
```

---

## Error Handling Strategy

### Error Categories

1. **Authentication Errors (4xx)**
   - `401 Unauthorized` - Invalid or expired token
   - `403 Forbidden` - Insufficient permissions
   - `400 Bad Request` - Invalid request parameters

2. **Server Errors (5xx)**
   - `500 Internal Server Error` - Unexpected server error
   - `503 Service Unavailable` - Facebook API unavailable

3. **Custom Application Errors**
   - `TOKEN_EXPIRED` - Access token has expired
   - `INVALID_STATE` - CSRF validation failed
   - `PERMISSION_DENIED` - User denied Facebook permissions
   - `PAGE_NOT_FOUND` - Requested page doesn't exist
   - `RATE_LIMIT_EXCEEDED` - Too many requests

### Error Response Format
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context"
    },
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

---

## Rate Limiting

### Application Rate Limits
- **Authentication endpoints:** 5 requests per minute per IP
- **API endpoints:** 100 requests per minute per user
- **Page monitoring:** Respects Facebook's rate limits

### Facebook Rate Limits
- **Standard API calls:** 200 calls per hour per user
- **Pages API:** 4,800 calls per day per app

### Rate Limit Response
```json
HTTP 429 Too Many Requests
{
  "error": "rate_limit_exceeded",
  "message": "Too many requests",
  "retry_after": 60
}
```

---

## Security Headers

### Required HTTP Headers
```http
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
```

---

## Database Schema

### SQL Schema
```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facebook_user_id VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tokens table
CREATE TABLE tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    encrypted_access_token TEXT NOT NULL,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    expires_at TIMESTAMP NOT NULL,
    encrypted_refresh_token TEXT,
    scope TEXT NOT NULL,
    salt VARCHAR(255) NOT NULL,
    iv VARCHAR(255) NOT NULL,
    tag VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pages table
CREATE TABLE pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    facebook_page_id VARCHAR(255) NOT NULL,
    page_name VARCHAR(255) NOT NULL,
    page_url TEXT,
    category VARCHAR(100),
    monitoring_enabled BOOLEAN DEFAULT FALSE,
    check_interval INTEGER DEFAULT 300,
    last_checked TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, facebook_page_id)
);

-- Monitoring events table
CREATE TABLE monitoring_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    content TEXT,
    facebook_event_id VARCHAR(255) NOT NULL,
    detected_at TIMESTAMP NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(facebook_event_id)
);

-- Indexes
CREATE INDEX idx_tokens_user_id ON tokens(user_id);
CREATE INDEX idx_tokens_expires_at ON tokens(expires_at);
CREATE INDEX idx_pages_user_id ON pages(user_id);
CREATE INDEX idx_pages_monitoring_enabled ON pages(monitoring_enabled);
CREATE INDEX idx_monitoring_events_page_id ON monitoring_events(page_id);
CREATE INDEX idx_monitoring_events_processed ON monitoring_events(processed);
```

---

## Configuration Management

### Environment Variables
```bash
# Facebook OAuth
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
FACEBOOK_OAUTH_REDIRECT_URI=https://yourdomain.com/auth/facebook/callback

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/pagewatcher

# Security
ENCRYPTION_KEY=your_32_byte_encryption_key
SESSION_SECRET=your_session_secret
ALLOWED_ORIGINS=https://yourdomain.com

# Application
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Monitoring
CHECK_INTERVAL=300
MAX_PAGES_PER_USER=10
```

---

## Monitoring & Logging

### Log Levels
- **ERROR:** System errors, authentication failures
- **WARN:** Token expiration, rate limits approaching
- **INFO:** User login/logout, page monitoring events
- **DEBUG:** Detailed request/response information

### Log Format
```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "level": "INFO",
  "service": "pagewatcher",
  "event": "user_authenticated",
  "user_id": "user_123",
  "details": {
    "facebook_user_id": "fb_456"
  }
}
```

### Metrics to Monitor
- Authentication success/failure rate
- Token refresh frequency
- API response times
- Database query performance
- Rate limit usage
- Error rates by endpoint

---

## Testing Requirements

### Unit Test Coverage
- Minimum 80% code coverage
- All authentication functions
- Token encryption/decryption
- API client methods
- Error handling

### Integration Tests
- Complete OAuth flow
- Token refresh mechanism
- Facebook API integration
- Database operations

### Security Tests
- CSRF protection
- Token encryption
- SQL injection prevention
- XSS prevention
- Rate limiting

---

## Deployment Checklist

- [ ] Facebook App configured with production URLs
- [ ] All environment variables set in production
- [ ] Database migrations applied
- [ ] HTTPS enforced on all endpoints
- [ ] Rate limiting configured
- [ ] Logging and monitoring set up
- [ ] Backup strategy implemented
- [ ] Security headers configured
- [ ] CORS policy configured
- [ ] Error tracking enabled (e.g., Sentry)

---

## API Versioning

The API uses URL versioning:
```
/api/v1/pages
/api/v1/auth/refresh
```

Future versions will maintain backward compatibility for at least 6 months.

---

## Performance Requirements

- **API Response Time:** < 500ms (95th percentile)
- **Database Query Time:** < 100ms (95th percentile)
- **Token Encryption/Decryption:** < 10ms
- **Page Monitoring Interval:** Configurable (default: 5 minutes)
- **Concurrent Users:** Support for 1,000+ concurrent users

---

## Conclusion

This technical specification provides detailed implementation guidelines for the Facebook authentication system. All components are designed with security, scalability, and maintainability in mind.
