# Security Considerations for Facebook Authentication

## Overview

This document outlines critical security considerations for implementing Facebook authentication in the PageWatcher application. Security must be a primary concern throughout the development lifecycle.

## Table of Contents
1. [OAuth 2.0 Security](#oauth-20-security)
2. [Token Security](#token-security)
3. [Data Protection](#data-protection)
4. [Application Security](#application-security)
5. [Infrastructure Security](#infrastructure-security)
6. [Compliance](#compliance)
7. [Incident Response](#incident-response)

---

## OAuth 2.0 Security

### CSRF Protection

**Threat:** Cross-Site Request Forgery attacks during OAuth flow
**Mitigation:**

```python
# Generate and validate state parameter
import secrets

def initiate_oauth():
    state = secrets.token_urlsafe(32)
    session['oauth_state'] = state
    session['oauth_timestamp'] = time.time()
    # Store state with 5-minute expiration
    return redirect(f"https://facebook.com/oauth?state={state}")

def handle_callback():
    # Verify state parameter
    received_state = request.args.get('state')
    stored_state = session.get('oauth_state')
    timestamp = session.get('oauth_timestamp')
    
    # Validate state exists
    if not received_state or not stored_state:
        raise SecurityError("Missing state parameter")
    
    # Validate state matches
    if not secrets.compare_digest(received_state, stored_state):
        raise SecurityError("Invalid state parameter")
    
    # Validate state is not expired (5 minutes)
    if time.time() - timestamp > 300:
        raise SecurityError("State parameter expired")
    
    # Clear state after use
    session.pop('oauth_state')
    session.pop('oauth_timestamp')
```

### Redirect URI Validation

**Threat:** Open redirect vulnerabilities
**Mitigation:**

```python
ALLOWED_REDIRECT_URIS = [
    'http://localhost:3000/auth/facebook/callback',  # Development
    'https://yourdomain.com/auth/facebook/callback'   # Production
]

def validate_redirect_uri(uri):
    """Strictly validate redirect URI."""
    if uri not in ALLOWED_REDIRECT_URIS:
        raise SecurityError("Invalid redirect URI")
    return uri
```

### Authorization Code Security

**Best Practices:**
- Authorization codes should be single-use
- Codes should expire after 10 minutes
- Implement PKCE (Proof Key for Code Exchange) for additional security

```python
import hashlib
import base64

def generate_pkce_challenge():
    """Generate PKCE code verifier and challenge."""
    code_verifier = base64.urlsafe_b64encode(os.urandom(32)).decode('utf-8')
    code_verifier = code_verifier.rstrip('=')
    
    code_challenge = hashlib.sha256(code_verifier.encode('utf-8')).digest()
    code_challenge = base64.urlsafe_b64encode(code_challenge).decode('utf-8')
    code_challenge = code_challenge.rstrip('=')
    
    return code_verifier, code_challenge
```

---

## Token Security

### Token Encryption

**Requirement:** All access tokens MUST be encrypted before storage

```python
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2
import os
import base64

class TokenEncryption:
    def __init__(self, master_key: str):
        """Initialize with master encryption key."""
        self.master_key = master_key.encode()
    
    def encrypt_token(self, token: str) -> dict:
        """Encrypt token using AES-256-GCM."""
        # Generate unique salt and nonce
        salt = os.urandom(16)
        nonce = os.urandom(12)
        
        # Derive encryption key from master key
        kdf = PBKDF2(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = kdf.derive(self.master_key)
        
        # Encrypt token
        aesgcm = AESGCM(key)
        ciphertext = aesgcm.encrypt(nonce, token.encode(), None)
        
        return {
            'ciphertext': base64.b64encode(ciphertext).decode(),
            'salt': base64.b64encode(salt).decode(),
            'nonce': base64.b64encode(nonce).decode()
        }
    
    def decrypt_token(self, encrypted_data: dict) -> str:
        """Decrypt token."""
        # Decode components
        ciphertext = base64.b64decode(encrypted_data['ciphertext'])
        salt = base64.b64decode(encrypted_data['salt'])
        nonce = base64.b64decode(encrypted_data['nonce'])
        
        # Derive key
        kdf = PBKDF2(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = kdf.derive(self.master_key)
        
        # Decrypt
        aesgcm = AESGCM(key)
        plaintext = aesgcm.decrypt(nonce, ciphertext, None)
        
        return plaintext.decode()
```

### Token Storage

**Requirements:**
- Never store tokens in plain text
- Use separate encryption key per environment
- Rotate encryption keys periodically
- Never log tokens
- Never expose tokens in error messages

```python
class SecureTokenStorage:
    def __init__(self, db_connection, encryption_service):
        self.db = db_connection
        self.encryption = encryption_service
    
    def store_token(self, user_id: str, access_token: str, 
                   expires_in: int, scope: str) -> None:
        """Securely store encrypted token."""
        # Encrypt token
        encrypted = self.encryption.encrypt_token(access_token)
        
        # Calculate expiration
        expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
        
        # Store in database
        self.db.execute("""
            INSERT INTO tokens 
            (user_id, encrypted_access_token, salt, nonce, 
             token_type, expires_at, scope, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                encrypted_access_token = excluded.encrypted_access_token,
                salt = excluded.salt,
                nonce = excluded.nonce,
                expires_at = excluded.expires_at,
                updated_at = CURRENT_TIMESTAMP
        """, (
            user_id, 
            encrypted['ciphertext'],
            encrypted['salt'],
            encrypted['nonce'],
            'Bearer',
            expires_at,
            scope,
            datetime.utcnow()
        ))
        
        self.db.commit()
```

### Token Validation

```python
def validate_token(self, user_id: str) -> bool:
    """Check if token is valid and not expired."""
    token_data = self.db.execute("""
        SELECT expires_at FROM tokens 
        WHERE user_id = ? AND expires_at > ?
    """, (user_id, datetime.utcnow())).fetchone()
    
    return token_data is not None
```

### Token Refresh

```python
def refresh_token_if_needed(self, user_id: str) -> str:
    """Automatically refresh token if expired or expiring soon."""
    token_data = self.get_token(user_id)
    
    # Refresh if token expires in less than 1 hour
    if token_data['expires_at'] < datetime.utcnow() + timedelta(hours=1):
        return self.refresh_access_token(user_id)
    
    return self.decrypt_token(token_data)
```

---

## Data Protection

### Database Security

**Requirements:**
1. Use parameterized queries (ALWAYS)
2. Encrypt sensitive data at rest
3. Use database connection encryption (SSL/TLS)
4. Implement row-level security
5. Regular backups with encryption

```python
# GOOD: Parameterized query
cursor.execute(
    "SELECT * FROM users WHERE id = ?",
    (user_id,)
)

# BAD: String concatenation (SQL Injection vulnerability)
cursor.execute(
    f"SELECT * FROM users WHERE id = '{user_id}'"
)
```

### Personal Data Handling

**GDPR Compliance Requirements:**
- Obtain explicit consent
- Allow data export
- Allow data deletion
- Implement data minimization
- Document data processing

```python
class DataProtection:
    def export_user_data(self, user_id: str) -> dict:
        """Export all user data (GDPR right to data portability)."""
        user = self.get_user(user_id)
        pages = self.get_user_pages(user_id)
        # Exclude sensitive fields like encrypted tokens
        return {
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'created_at': user['created_at'].isoformat()
            },
            'pages': pages
        }
    
    def delete_user_data(self, user_id: str) -> None:
        """Delete all user data (GDPR right to erasure)."""
        # Revoke Facebook token first
        self.revoke_facebook_access(user_id)
        
        # Delete from database (cascade will handle related records)
        self.db.execute("DELETE FROM users WHERE id = ?", (user_id,))
        self.db.commit()
        
        # Log deletion for audit
        self.audit_log.log_data_deletion(user_id)
```

---

## Application Security

### Input Validation

**All user inputs must be validated and sanitized.**

```python
from typing import Optional
import re

def validate_page_name(name: str) -> Optional[str]:
    """Validate and sanitize page name."""
    if not name or len(name) > 255:
        raise ValueError("Invalid page name length")
    
    # Remove potentially dangerous characters
    sanitized = re.sub(r'[<>"\']', '', name)
    
    return sanitized.strip()

def validate_email(email: str) -> bool:
    """Validate email format."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None
```

### XSS Prevention

```python
from html import escape

def render_user_content(content: str) -> str:
    """Escape HTML to prevent XSS."""
    return escape(content)

# In templates, use auto-escaping
# Jinja2 example:
# {{ user_content | escape }}
```

### Rate Limiting

```python
from functools import wraps
from flask import request, jsonify
import time

class RateLimiter:
    def __init__(self):
        self.requests = {}  # Use Redis in production
    
    def limit(self, max_requests: int, window: int):
        """Rate limit decorator."""
        def decorator(f):
            @wraps(f)
            def wrapper(*args, **kwargs):
                # Get client identifier
                client_id = request.remote_addr
                current_time = time.time()
                
                # Get request history
                if client_id not in self.requests:
                    self.requests[client_id] = []
                
                # Remove old requests outside window
                self.requests[client_id] = [
                    req_time for req_time in self.requests[client_id]
                    if current_time - req_time < window
                ]
                
                # Check rate limit
                if len(self.requests[client_id]) >= max_requests:
                    return jsonify({
                        'error': 'rate_limit_exceeded',
                        'retry_after': window
                    }), 429
                
                # Add current request
                self.requests[client_id].append(current_time)
                
                return f(*args, **kwargs)
            return wrapper
        return decorator

# Usage
limiter = RateLimiter()

@app.route('/api/pages')
@limiter.limit(max_requests=100, window=60)  # 100 requests per minute
def get_pages():
    # ... implementation
    pass
```

### Session Security

```python
from flask import Flask

app = Flask(__name__)

# Session configuration
app.config.update(
    SESSION_COOKIE_SECURE=True,      # HTTPS only
    SESSION_COOKIE_HTTPONLY=True,    # Not accessible via JavaScript
    SESSION_COOKIE_SAMESITE='Lax',   # CSRF protection
    PERMANENT_SESSION_LIFETIME=3600, # 1 hour
    SESSION_COOKIE_NAME='__Host-session'  # Strict security prefix
)
```

---

## Infrastructure Security

### HTTPS Enforcement

```python
from flask import Flask, redirect, request

def redirect_to_https():
    """Redirect all HTTP requests to HTTPS."""
    if not request.is_secure and not app.debug:
        url = request.url.replace('http://', 'https://', 1)
        return redirect(url, code=301)

@app.before_request
def before_request():
    return redirect_to_https()
```

### Security Headers

```python
@app.after_request
def add_security_headers(response):
    """Add security headers to all responses."""
    response.headers['Strict-Transport-Security'] = \
        'max-age=31536000; includeSubDomains'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Content-Security-Policy'] = \
        "default-src 'self'; script-src 'self' 'unsafe-inline'"
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    return response
```

### Secrets Management

```python
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Configuration from environment variables only."""
    
    # Facebook OAuth
    FACEBOOK_APP_ID = os.getenv('FACEBOOK_APP_ID')
    FACEBOOK_APP_SECRET = os.getenv('FACEBOOK_APP_SECRET')
    
    # Encryption
    ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY')
    
    # Session
    SESSION_SECRET = os.getenv('SESSION_SECRET')
    
    @classmethod
    def validate(cls):
        """Validate all required configs are present."""
        required = [
            'FACEBOOK_APP_ID',
            'FACEBOOK_APP_SECRET',
            'ENCRYPTION_KEY',
            'SESSION_SECRET'
        ]
        
        missing = [key for key in required if not getattr(cls, key)]
        
        if missing:
            raise ValueError(f"Missing required config: {', '.join(missing)}")

# Validate on startup
Config.validate()
```

---

## Compliance

### Facebook Platform Policy

**Requirements:**
1. Implement data deletion callback
2. Display privacy policy
3. Respect user permissions
4. Don't store data longer than necessary
5. Implement data deletion requests

```python
@app.route('/facebook/data-deletion', methods=['POST'])
def facebook_data_deletion():
    """Handle Facebook data deletion request."""
    # Verify request is from Facebook
    signed_request = request.form.get('signed_request')
    
    if not verify_facebook_signature(signed_request):
        return jsonify({'error': 'Invalid signature'}), 401
    
    # Parse user ID
    data = parse_signed_request(signed_request)
    facebook_user_id = data.get('user_id')
    
    # Delete user data
    delete_user_by_facebook_id(facebook_user_id)
    
    # Return confirmation URL
    confirmation_code = generate_deletion_confirmation_code(facebook_user_id)
    
    return jsonify({
        'url': f'https://yourdomain.com/deletion/{confirmation_code}',
        'confirmation_code': confirmation_code
    })
```

### Audit Logging

```python
import logging
from datetime import datetime

class AuditLogger:
    def __init__(self):
        self.logger = logging.getLogger('audit')
        self.logger.setLevel(logging.INFO)
    
    def log_auth_attempt(self, user_id: str, success: bool, ip: str):
        """Log authentication attempt."""
        self.logger.info({
            'event': 'auth_attempt',
            'user_id': user_id,
            'success': success,
            'ip': ip,
            'timestamp': datetime.utcnow().isoformat()
        })
    
    def log_token_access(self, user_id: str, action: str):
        """Log token access."""
        self.logger.info({
            'event': 'token_access',
            'user_id': user_id,
            'action': action,
            'timestamp': datetime.utcnow().isoformat()
        })
    
    def log_data_deletion(self, user_id: str):
        """Log data deletion."""
        self.logger.warning({
            'event': 'data_deletion',
            'user_id': user_id,
            'timestamp': datetime.utcnow().isoformat()
        })
```

---

## Incident Response

### Security Incident Plan

1. **Detection**
   - Monitor error logs
   - Track failed authentication attempts
   - Monitor unusual token usage patterns

2. **Containment**
   - Revoke compromised tokens immediately
   - Lock affected user accounts
   - Block suspicious IP addresses

3. **Investigation**
   - Review audit logs
   - Identify scope of breach
   - Document findings

4. **Recovery**
   - Reset user credentials
   - Rotate encryption keys
   - Update security measures

5. **Post-Incident**
   - Notify affected users
   - Update security documentation
   - Implement preventive measures

### Token Revocation

```python
def revoke_all_user_tokens(user_id: str):
    """Revoke all tokens for a user (security incident)."""
    # Get all tokens
    tokens = self.db.execute("""
        SELECT id, encrypted_access_token, salt, nonce 
        FROM tokens WHERE user_id = ?
    """, (user_id,)).fetchall()
    
    # Revoke each token with Facebook
    for token in tokens:
        try:
            decrypted = self.decrypt_token(token)
            self.revoke_facebook_token(decrypted)
        except Exception as e:
            self.logger.error(f"Failed to revoke token: {e}")
    
    # Delete from database
    self.db.execute("DELETE FROM tokens WHERE user_id = ?", (user_id,))
    self.db.commit()
    
    # Log incident
    self.audit_log.log_security_incident('token_revocation_all', user_id)
```

---

## Security Checklist

### Pre-Deployment
- [ ] All secrets in environment variables
- [ ] Encryption keys generated and secured
- [ ] HTTPS enforced in production
- [ ] Security headers configured
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention verified
- [ ] XSS prevention implemented
- [ ] CSRF protection enabled
- [ ] Session security configured
- [ ] Error messages sanitized
- [ ] Audit logging enabled

### Regular Security Tasks
- [ ] Weekly: Review error and audit logs
- [ ] Monthly: Update dependencies
- [ ] Quarterly: Security audit
- [ ] Quarterly: Rotate encryption keys
- [ ] Yearly: Penetration testing

### Security Testing
- [ ] Unit tests for authentication
- [ ] Integration tests for OAuth flow
- [ ] Security tests for encryption
- [ ] Penetration testing
- [ ] Dependency vulnerability scanning

---

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Facebook Security Best Practices](https://developers.facebook.com/docs/security/best-practices)
- [OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)

---

## Conclusion

Security is not a one-time implementation but an ongoing process. Regular reviews, updates, and monitoring are essential to maintain a secure application. Always follow the principle of least privilege and defense in depth.
