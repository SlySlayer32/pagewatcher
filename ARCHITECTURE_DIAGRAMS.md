# Architecture Diagrams

This document provides visual representations of the PageWatcher Facebook authentication system architecture.

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Authentication Flow](#authentication-flow)
3. [Token Management Flow](#token-management-flow)
4. [Page Monitoring Flow](#page-monitoring-flow)
5. [Data Model Relationships](#data-model-relationships)
6. [Security Layers](#security-layers)
7. [Deployment Architecture](#deployment-architecture)

---

## System Architecture

### High-Level System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Login UI   │  │  Dashboard   │  │ Page Monitor │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          │ HTTPS            │ HTTPS            │ HTTPS
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼─────────────────┐
│                    PageWatcher Application                        │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                   API Gateway / Router                      │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │  │
│  │  │   Auth   │  │   API    │  │  Pages   │  │ Webhooks │  │  │
│  │  │  Routes  │  │  Routes  │  │  Routes  │  │  Routes  │  │  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │  │
│  └───────┼─────────────┼─────────────┼─────────────┼────────┘  │
│          │             │             │             │            │
│  ┌───────▼─────────────▼─────────────▼─────────────▼────────┐  │
│  │                   Middleware Layer                         │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │  │
│  │  │   Auth   │  │   Rate   │  │  Error   │  │ Security │  │  │
│  │  │  Check   │  │  Limiter │  │ Handler  │  │ Headers  │  │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │  │
│  └────────────────────────┬────────────────────────────────┘  │
│                           │                                    │
│  ┌────────────────────────▼────────────────────────────────┐  │
│  │                   Service Layer                          │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │  │
│  │  │   Auth   │  │  Token   │  │ Facebook │  │   Page   │  │  │
│  │  │ Service  │  │ Service  │  │   API    │  │ Service  │  │  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │  │
│  │       │             │             │             │         │  │
│  │  ┌────▼─────────────▼─────────────▼─────────────▼─────┐  │  │
│  │  │           Encryption Service                        │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └────────────────────────┬────────────────────────────────┘  │
└───────────────────────────┼───────────────────────────────────┘
                            │
                ┌───────────▼───────────┐
                │   PostgreSQL Database │
                │  ┌─────────────────┐  │
                │  │ Users │ Tokens  │  │
                │  │ Pages │ Events  │  │
                │  └─────────────────┘  │
                └───────────────────────┘
                            │
                            │ API Calls
                            │
                ┌───────────▼───────────┐
                │   Facebook Platform   │
                │  ┌─────────────────┐  │
                │  │  OAuth Server   │  │
                │  │  Graph API      │  │
                │  │  Pages API      │  │
                │  └─────────────────┘  │
                └───────────────────────┘
```

---

## Authentication Flow

### Complete OAuth 2.0 Flow Diagram

```
┌─────────┐                ┌──────────┐                 ┌──────────┐                ┌──────────┐
│  User   │                │PageWatch │                 │ Facebook │                │ Database │
│ Browser │                │   App    │                 │  OAuth   │                │          │
└────┬────┘                └─────┬────┘                 └─────┬────┘                └─────┬────┘
     │                           │                            │                           │
     │ 1. Click "Login"          │                            │                           │
     ├──────────────────────────►│                            │                           │
     │                           │                            │                           │
     │                           │ 2. Generate State Token    │                           │
     │                           ├───────────────────────────────────────────────────────►│
     │                           │                            │                           │
     │                           │ 3. Store State in Session  │                           │
     │                           │◄───────────────────────────────────────────────────────┤
     │                           │                            │                           │
     │ 4. Redirect to Facebook   │                            │                           │
     │◄──────────────────────────┤                            │                           │
     │                           │                            │                           │
     │ 5. Facebook Login Page    │                            │                           │
     ├───────────────────────────────────────────────────────►│                           │
     │                           │                            │                           │
     │ 6. User Enters Credentials│                            │                           │
     │───────────────────────────────────────────────────────►│                           │
     │                           │                            │                           │
     │ 7. User Approves App      │                            │                           │
     │───────────────────────────────────────────────────────►│                           │
     │                           │                            │                           │
     │ 8. Redirect with Auth Code│                            │                           │
     │◄───────────────────────────────────────────────────────┤                           │
     │                           │                            │                           │
     │ 9. Callback with Code     │                            │                           │
     ├──────────────────────────►│                            │                           │
     │                           │                            │                           │
     │                           │ 10. Validate State Token   │                           │
     │                           ├───────────────────────────────────────────────────────►│
     │                           │                            │                           │
     │                           │ 11. State Validated        │                           │
     │                           │◄───────────────────────────────────────────────────────┤
     │                           │                            │                           │
     │                           │ 12. Exchange Code for Token│                           │
     │                           ├───────────────────────────►│                           │
     │                           │                            │                           │
     │                           │ 13. Return Access Token    │                           │
     │                           │◄───────────────────────────┤                           │
     │                           │                            │                           │
     │                           │ 14. Get User Info          │                           │
     │                           ├───────────────────────────►│                           │
     │                           │                            │                           │
     │                           │ 15. User Data              │                           │
     │                           │◄───────────────────────────┤                           │
     │                           │                            │                           │
     │                           │ 16. Encrypt Token          │                           │
     │                           │ (AES-256-GCM)              │                           │
     │                           │                            │                           │
     │                           │ 17. Store User & Token     │                           │
     │                           ├───────────────────────────────────────────────────────►│
     │                           │                            │                           │
     │                           │ 18. Create Session         │                           │
     │                           │◄───────────────────────────────────────────────────────┤
     │                           │                            │                           │
     │ 19. Set Session Cookie    │                            │                           │
     │◄──────────────────────────┤                            │                           │
     │                           │                            │                           │
     │ 20. Redirect to Dashboard │                            │                           │
     │◄──────────────────────────┤                            │                           │
     │                           │                            │                           │
```

---

## Token Management Flow

### Token Lifecycle Management

```
┌────────────────────────────────────────────────────────────────────┐
│                        Token Lifecycle                              │
└────────────────────────────────────────────────────────────────────┘

1. TOKEN CREATION
   ┌──────────────┐
   │ OAuth Success│
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐      ┌───────────────┐      ┌──────────────┐
   │ Access Token │─────►│ Generate Salt │─────►│ Generate IV  │
   │  (Plain)     │      │   (16 bytes)  │      │  (12 bytes)  │
   └──────────────┘      └───────────────┘      └──────────────┘
          │
          ▼
   ┌──────────────────────────────────────────────────────────┐
   │             Derive Key (PBKDF2 + SHA256)                 │
   │              100,000 iterations                          │
   └──────────────────────┬───────────────────────────────────┘
                          │
                          ▼
   ┌──────────────────────────────────────────────────────────┐
   │         Encrypt with AES-256-GCM                         │
   │  Input: Token, Key, IV                                   │
   │  Output: Ciphertext, Authentication Tag                  │
   └──────────────────────┬───────────────────────────────────┘
                          │
                          ▼
   ┌──────────────────────────────────────────────────────────┐
   │              Store in Database                           │
   │  - encrypted_access_token (ciphertext)                   │
   │  - salt (base64)                                         │
   │  - iv (base64)                                           │
   │  - tag (base64)                                          │
   │  - expires_at                                            │
   └──────────────────────────────────────────────────────────┘


2. TOKEN RETRIEVAL & VALIDATION
   ┌──────────────┐
   │ API Request  │
   └──────┬───────┘
          │
          ▼
   ┌──────────────────────────────────────────────────────────┐
   │           Retrieve Token from Database                   │
   └──────────────────────┬───────────────────────────────────┘
                          │
                          ▼
   ┌──────────────────────────────────────────────────────────┐
   │              Check Expiration                            │
   │         if (now > expires_at)                            │
   └──────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          │                               │
          ▼ Expired                       ▼ Valid
   ┌─────────────┐                ┌──────────────┐
   │   Refresh   │                │   Decrypt    │
   │    Token    │                │    Token     │
   └──────┬──────┘                └──────┬───────┘
          │                               │
          │                               ▼
          │                        ┌──────────────┐
          │                        │  Use Token   │
          │                        └──────────────┘
          │
          ▼
   ┌──────────────────────────────────────────────────────────┐
   │           Request New Token from Facebook                │
   └──────────────────────┬───────────────────────────────────┘
                          │
                          ▼
   ┌──────────────────────────────────────────────────────────┐
   │         Encrypt & Store New Token                        │
   └──────────────────────────────────────────────────────────┘


3. TOKEN REFRESH (Automatic)
   ┌──────────────────────────────────────────────────────────┐
   │         Background Refresh Job (Every Hour)              │
   └──────────────────────┬───────────────────────────────────┘
                          │
                          ▼
   ┌──────────────────────────────────────────────────────────┐
   │  SELECT * FROM tokens WHERE                              │
   │  expires_at < NOW() + INTERVAL '1 hour'                  │
   └──────────────────────┬───────────────────────────────────┘
                          │
                          ▼
   ┌──────────────────────────────────────────────────────────┐
   │        For Each Expiring Token:                          │
   │        1. Request refresh from Facebook                  │
   │        2. Encrypt new token                              │
   │        3. Update database                                │
   │        4. Log refresh event                              │
   └──────────────────────────────────────────────────────────┘


4. TOKEN REVOCATION
   ┌──────────────┐
   │ User Logout  │
   │     OR       │
   │Security Event│
   └──────┬───────┘
          │
          ▼
   ┌──────────────────────────────────────────────────────────┐
   │            Decrypt Token                                 │
   └──────────────────────┬───────────────────────────────────┘
                          │
                          ▼
   ┌──────────────────────────────────────────────────────────┐
   │   POST to Facebook Graph API                             │
   │   /me/permissions?access_token={token}                   │
   │   Method: DELETE                                         │
   └──────────────────────┬───────────────────────────────────┘
                          │
                          ▼
   ┌──────────────────────────────────────────────────────────┐
   │      DELETE FROM tokens WHERE user_id = ?                │
   └──────────────────────┬───────────────────────────────────┘
                          │
                          ▼
   ┌──────────────────────────────────────────────────────────┐
   │              Log Revocation Event                        │
   └──────────────────────────────────────────────────────────┘
```

---

## Page Monitoring Flow

### Continuous Page Monitoring Process

```
┌────────────────────────────────────────────────────────────────────┐
│                   Page Monitoring Scheduler                         │
│                   (Runs every 5 minutes)                            │
└────────────────────────┬───────────────────────────────────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │ SELECT * FROM pages WHERE    │
          │ monitoring_enabled = TRUE    │
          └──────────────┬───────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │   For Each Page:             │
          └──────────────┬───────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        ▼                                 │
┌───────────────┐                         │
│ Get User Token│                         │
└───────┬───────┘                         │
        │                                 │
        ▼                                 │
┌───────────────┐                         │
│Validate Token │                         │
└───────┬───────┘                         │
        │                                 │
        ├─── Expired? ──► Refresh Token   │
        │                      │          │
        ▼ Valid                ▼          │
┌──────────────────────────────────┐     │
│  Fetch Page Data from Facebook   │     │
│  GET /v18.0/{page_id}/feed       │     │
└───────┬──────────────────────────┘     │
        │                                │
        ▼                                │
┌──────────────────────────────────┐     │
│  Compare with Last Check:        │     │
│  - New posts?                    │     │
│  - Updated posts?                │     │
│  - New comments?                 │     │
└───────┬──────────────────────────┘     │
        │                                │
        ├─── Changes Found? ─────────┐   │
        │                            │   │
        ▼ Yes                        │   │
┌──────────────────────────────────┐│   │
│   Create Monitoring Event        ││   │
│   INSERT INTO monitoring_events  ││   │
└───────┬──────────────────────────┘│   │
        │                            │   │
        ▼                            │   │
┌──────────────────────────────────┐│   │
│   Trigger Notification           ││   │
│   (Email, Push, Webhook)         ││   │
└───────┬──────────────────────────┘│   │
        │                            │   │
        │                            ▼ No│
        │                    ┌───────────┴────┐
        │                    │  Log Check     │
        │                    │  No Changes    │
        │                    └───────────┬────┘
        │                                │
        ▼                                │
┌──────────────────────────────────┐    │
│  UPDATE pages SET                │    │
│  last_checked = NOW()            │    │
└───────┬──────────────────────────┘    │
        │                                │
        └────────────────┬───────────────┘
                         │
                         ▼
          ┌──────────────────────────────┐
          │   Next Page in Queue          │
          └──────────────┬────────────────┘
                         │
                         └──► Repeat
```

---

## Data Model Relationships

### Entity Relationship Diagram

```
┌─────────────────────────────────────┐
│            USERS                    │
├─────────────────────────────────────┤
│ PK │ id (UUID)                      │
│    │ facebook_user_id (UNIQUE)      │
│    │ username                       │
│    │ email                          │
│    │ created_at                     │
│    │ updated_at                     │
└──────────────┬──────────────────────┘
               │
               │ 1:N
               │
    ┌──────────┴──────────┐
    │                     │
    │ 1:N                 │ 1:N
    │                     │
    ▼                     ▼
┌───────────────────┐   ┌───────────────────────────┐
│     TOKENS        │   │          PAGES            │
├───────────────────┤   ├───────────────────────────┤
│ PK │ id          │   │ PK │ id                   │
│ FK │ user_id     │   │ FK │ user_id              │
│    │ encrypted_  │   │    │ facebook_page_id     │
│    │ access_token│   │    │ page_name            │
│    │ salt        │   │    │ page_url             │
│    │ iv          │   │    │ monitoring_enabled   │
│    │ tag         │   │    │ check_interval       │
│    │ expires_at  │   │    │ last_checked         │
│    │ scope       │   │    │ created_at           │
│    │ created_at  │   │    │ updated_at           │
│    │ updated_at  │   └────────────┬──────────────┘
└───────────────────┘                │
                                     │ 1:N
                                     │
                                     ▼
                        ┌────────────────────────────┐
                        │   MONITORING_EVENTS        │
                        ├────────────────────────────┤
                        │ PK │ id                    │
                        │ FK │ page_id               │
                        │    │ event_type            │
                        │    │ content               │
                        │    │ facebook_event_id     │
                        │    │ detected_at           │
                        │    │ processed             │
                        │    │ created_at            │
                        └────────────────────────────┘

Relationships:
─────────────
User → Tokens:          One to Many (cascade delete)
User → Pages:           One to Many (cascade delete)
Page → MonitoringEvent: One to Many (cascade delete)
```

---

## Security Layers

### Defense in Depth Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         Layer 1: Network                            │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ - HTTPS/TLS 1.3                                              │  │
│  │ - Firewall Rules                                             │  │
│  │ - DDoS Protection                                            │  │
│  │ - IP Whitelisting (optional)                                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────┐
│                    Layer 2: Application Gateway                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ - Rate Limiting (100 req/min per user)                       │  │
│  │ - Request Size Limits                                        │  │
│  │ - CORS Policy                                                │  │
│  │ - Security Headers (HSTS, CSP, X-Frame-Options)             │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────┐
│                   Layer 3: Authentication                           │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ - OAuth 2.0 State Validation                                 │  │
│  │ - Session Management (httpOnly, secure cookies)              │  │
│  │ - CSRF Token Validation                                      │  │
│  │ - Token Expiration Checks                                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────┐
│                    Layer 4: Authorization                           │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ - User Permission Checks                                     │  │
│  │ - Resource Ownership Validation                              │  │
│  │ - Scope Verification                                         │  │
│  │ - API Endpoint Access Control                                │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────┐
│                    Layer 5: Input Validation                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ - SQL Injection Prevention (Parameterized Queries)           │  │
│  │ - XSS Prevention (Output Escaping)                           │  │
│  │ - Input Sanitization                                         │  │
│  │ - Schema Validation                                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────┐
│                      Layer 6: Data Protection                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ - Token Encryption (AES-256-GCM)                             │  │
│  │ - Database Encryption at Rest                                │  │
│  │ - Secure Key Management                                      │  │
│  │ - Encrypted Database Connections (SSL/TLS)                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────┐
│                    Layer 7: Monitoring & Logging                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ - Audit Logging                                              │  │
│  │ - Failed Login Attempts Tracking                             │  │
│  │ - Anomaly Detection                                          │  │
│  │ - Security Event Alerts                                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

---

## Deployment Architecture

### Production Deployment Topology

```
┌───────────────────────────────────────────────────────────────────────┐
│                            Internet                                    │
└────────────────────────────────┬──────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        CDN / WAF (Optional)                             │
│  - Static Asset Caching                                                 │
│  - DDoS Protection                                                      │
│  - Geographic Distribution                                              │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │ HTTPS
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         Load Balancer                                   │
│  - SSL Termination                                                      │
│  - Health Checks                                                        │
│  - Traffic Distribution                                                 │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │
                 ┌───────────────┼───────────────┐
                 │               │               │
                 ▼               ▼               ▼
        ┌────────────┐  ┌────────────┐  ┌────────────┐
        │   App      │  │   App      │  │   App      │
        │ Server 1   │  │ Server 2   │  │ Server 3   │
        │            │  │            │  │            │
        │ ┌────────┐ │  │ ┌────────┐ │  │ ┌────────┐ │
        │ │PageWatc││  │ │PageWatc││  │ │PageWatc││
        │ │her App ││  │ │her App ││  │ │her App ││
        │ └────────┘ │  │ └────────┘ │  │ └────────┘ │
        └─────┬──────┘  └─────┬──────┘  └─────┬──────┘
              │               │               │
              └───────────────┼───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │     Redis (Session Store)      │
              │  - Session Management          │
              │  - Rate Limiting Data          │
              │  - Cache                       │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   PostgreSQL Database          │
              │   ┌─────────────────────┐     │
              │   │ Primary (Read/Write)│     │
              │   └──────────┬──────────┘     │
              │              │                 │
              │              │ Replication     │
              │              │                 │
              │   ┌──────────▼──────────┐     │
              │   │ Replica 1 (Read)    │     │
              │   └─────────────────────┘     │
              │              │                 │
              │   ┌──────────▼──────────┐     │
              │   │ Replica 2 (Read)    │     │
              │   └─────────────────────┘     │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   Backup Storage (S3/GCS)     │
              │  - Daily Database Backups      │
              │  - Audit Logs                  │
              │  - Encrypted Storage           │
              └───────────────────────────────┘

              ┌───────────────────────────────┐
              │   Monitoring & Logging         │
              │  ┌──────────────────────────┐ │
              │  │ Application Logs         │ │
              │  │ Error Tracking (Sentry)  │ │
              │  │ Metrics (Prometheus)     │ │
              │  │ Dashboards (Grafana)     │ │
              │  └──────────────────────────┘ │
              └───────────────────────────────┘

External Services:
┌──────────────────┐
│ Facebook OAuth   │ ◄─── OAuth Requests
│ Graph API        │ ◄─── API Calls
└──────────────────┘
```

---

## Component Interaction Diagram

### Request Processing Flow

```
HTTP Request
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Middleware Pipeline                       │
│                                                              │
│  1. ┌──────────────────┐                                    │
│     │ Security Headers │  ─► Add HSTS, CSP, X-Frame-Options │
│     └────────┬─────────┘                                    │
│              │                                               │
│  2. ┌────────▼─────────┐                                    │
│     │  Rate Limiter    │  ─► Check request limit            │
│     └────────┬─────────┘     (100 req/min per user)        │
│              │                                               │
│  3. ┌────────▼─────────┐                                    │
│     │   CORS Handler   │  ─► Validate origin                │
│     └────────┬─────────┘                                    │
│              │                                               │
│  4. ┌────────▼─────────┐                                    │
│     │ Session Parser   │  ─► Parse session cookie           │
│     └────────┬─────────┘                                    │
│              │                                               │
│  5. ┌────────▼─────────┐                                    │
│     │  Auth Middleware │  ─► Verify authentication          │
│     └────────┬─────────┘                                    │
└──────────────┼──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│                       Route Handler                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  1. Parse Request Parameters                           │ │
│  │  2. Validate Input                                     │ │
│  │  3. Call Service Layer                                 │ │
│  └──────────────────────┬─────────────────────────────────┘ │
└────────────────────────┼────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  1. Business Logic Processing                          │ │
│  │  2. Call External APIs (if needed)                     │ │
│  │  3. Perform Encryption/Decryption                      │ │
│  │  4. Interact with Database                             │ │
│  └──────────────────────┬─────────────────────────────────┘ │
└────────────────────────┼────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                       Data Layer                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  1. Execute Database Queries                           │ │
│  │  2. Handle Transactions                                │ │
│  │  3. Return Results                                     │ │
│  └──────────────────────┬─────────────────────────────────┘ │
└────────────────────────┼────────────────────────────────────┘
                         │
                         ▼
                   ┌──────────┐
                   │ Database │
                   └──────────┘
                         │
                         ▼ (Response flows back up)
┌─────────────────────────────────────────────────────────────┐
│                   Response Processing                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  1. Format Response                                    │ │
│  │  2. Set Response Headers                               │ │
│  │  3. Log Request/Response                               │ │
│  └──────────────────────┬─────────────────────────────────┘ │
└────────────────────────┼────────────────────────────────────┘
                         │
                         ▼
                   HTTP Response
```

---

## Conclusion

These architecture diagrams provide a visual reference for understanding the PageWatcher system design. Use them alongside the detailed documentation for implementation.

For more details, refer to:
- [TECHNICAL_SPECIFICATION.md](./TECHNICAL_SPECIFICATION.md) - Complete technical specs
- [FACEBOOK_AUTH_IMPLEMENTATION_PLAN.md](./FACEBOOK_AUTH_IMPLEMENTATION_PLAN.md) - Implementation roadmap
- [SECURITY.md](./SECURITY.md) - Security best practices
