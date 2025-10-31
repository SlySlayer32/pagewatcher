# Project Structure

This document outlines the recommended project structure for implementing the PageWatcher application with Facebook authentication.

## Overview

The project follows a modular architecture with clear separation of concerns. Choose the structure that matches your chosen technology stack (Python/Flask or Node.js/Express).

## Python/Flask Structure

```
pagewatcher/
│
├── .env                        # Environment variables (DO NOT COMMIT)
├── .env.example               # Template for environment variables
├── .gitignore                 # Git ignore rules
├── README.md                  # Project documentation
├── requirements.txt           # Python dependencies
├── setup.py                   # Package setup file
├── pytest.ini                 # Pytest configuration
│
├── app.py                     # Main application entry point
├── wsgi.py                    # WSGI entry point for production
│
├── config/
│   ├── __init__.py
│   ├── database.py           # Database connection and setup
│   ├── settings.py           # Application configuration
│   └── logging.py            # Logging configuration
│
├── models/
│   ├── __init__.py
│   ├── base.py               # Base model class
│   ├── user.py               # User model
│   ├── token.py              # Token model
│   ├── page.py               # Page model
│   └── monitoring_event.py   # Monitoring event model
│
├── services/
│   ├── __init__.py
│   ├── auth_service.py       # Authentication business logic
│   ├── token_service.py      # Token management logic
│   ├── encryption_service.py # Encryption/decryption
│   ├── facebook_api.py       # Facebook API client
│   ├── page_service.py       # Page management logic
│   └── monitoring_service.py # Page monitoring logic
│
├── routes/
│   ├── __init__.py
│   ├── auth.py               # Authentication endpoints
│   ├── api.py                # API endpoints
│   ├── pages.py              # Page management endpoints
│   └── webhooks.py           # Webhook endpoints
│
├── middleware/
│   ├── __init__.py
│   ├── auth_middleware.py    # Authentication middleware
│   ├── rate_limit.py         # Rate limiting middleware
│   ├── error_handler.py      # Error handling middleware
│   └── security.py           # Security headers middleware
│
├── utils/
│   ├── __init__.py
│   ├── validators.py         # Input validation utilities
│   ├── helpers.py            # General helper functions
│   └── decorators.py         # Custom decorators
│
├── migrations/
│   ├── versions/
│   │   └── 001_initial.py    # Database migrations
│   └── env.py                # Alembic environment
│
├── static/
│   ├── css/
│   │   ├── main.css
│   │   └── dashboard.css
│   ├── js/
│   │   ├── main.js
│   │   └── dashboard.js
│   └── images/
│       └── logo.png
│
├── templates/
│   ├── base.html             # Base template
│   ├── index.html            # Home page
│   ├── login.html            # Login page
│   ├── dashboard.html        # User dashboard
│   ├── pages.html            # Pages list
│   └── errors/
│       ├── 404.html
│       └── 500.html
│
├── tests/
│   ├── __init__.py
│   ├── conftest.py           # Pytest fixtures
│   ├── test_auth.py          # Authentication tests
│   ├── test_token_service.py # Token service tests
│   ├── test_encryption.py    # Encryption tests
│   ├── test_facebook_api.py  # Facebook API tests
│   ├── test_pages.py         # Page management tests
│   └── integration/
│       ├── __init__.py
│       └── test_oauth_flow.py # OAuth integration tests
│
├── scripts/
│   ├── init_db.py            # Database initialization
│   ├── generate_keys.py      # Generate encryption keys
│   └── monitor.py            # Background monitoring script
│
└── docs/
    ├── API.md                # API documentation
    ├── DEPLOYMENT.md         # Deployment guide
    └── ARCHITECTURE.md       # Architecture documentation
```

## Node.js/Express Structure

```
pagewatcher/
│
├── .env                        # Environment variables (DO NOT COMMIT)
├── .env.example               # Template for environment variables
├── .gitignore                 # Git ignore rules
├── README.md                  # Project documentation
├── package.json               # Node dependencies
├── tsconfig.json              # TypeScript configuration (if using TS)
├── jest.config.js             # Jest testing configuration
│
├── server.js                  # Main application entry point
├── app.js                     # Express app configuration
│
├── src/
│   │
│   ├── config/
│   │   ├── index.js
│   │   ├── database.js       # Database configuration
│   │   ├── passport.js       # Passport configuration
│   │   └── logger.js         # Logging configuration
│   │
│   ├── models/
│   │   ├── index.js          # Model exports
│   │   ├── User.js           # User model
│   │   ├── Token.js          # Token model
│   │   ├── Page.js           # Page model
│   │   └── MonitoringEvent.js # Monitoring event model
│   │
│   ├── services/
│   │   ├── authService.js    # Authentication logic
│   │   ├── tokenService.js   # Token management
│   │   ├── encryptionService.js # Encryption/decryption
│   │   ├── facebookAPI.js    # Facebook API client
│   │   ├── pageService.js    # Page management
│   │   └── monitoringService.js # Monitoring logic
│   │
│   ├── routes/
│   │   ├── index.js          # Route exports
│   │   ├── auth.js           # Authentication routes
│   │   ├── api.js            # API routes
│   │   ├── pages.js          # Page routes
│   │   └── webhooks.js       # Webhook routes
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js # Authentication middleware
│   │   ├── rateLimiter.js    # Rate limiting
│   │   ├── errorHandler.js   # Error handling
│   │   └── security.js       # Security headers
│   │
│   ├── utils/
│   │   ├── validators.js     # Input validation
│   │   ├── helpers.js        # Helper functions
│   │   └── constants.js      # Constants
│   │
│   └── database/
│       ├── migrations/       # Database migrations
│       └── seeders/          # Database seeders
│
├── public/
│   ├── css/
│   │   ├── main.css
│   │   └── dashboard.css
│   ├── js/
│   │   ├── main.js
│   │   └── dashboard.js
│   └── images/
│       └── logo.png
│
├── views/
│   ├── layouts/
│   │   └── main.hbs          # Main layout (Handlebars)
│   ├── index.hbs             # Home page
│   ├── login.hbs             # Login page
│   ├── dashboard.hbs         # User dashboard
│   ├── pages.hbs             # Pages list
│   └── errors/
│       ├── 404.hbs
│       └── 500.hbs
│
├── tests/
│   ├── unit/
│   │   ├── auth.test.js      # Authentication tests
│   │   ├── token.test.js     # Token tests
│   │   └── encryption.test.js # Encryption tests
│   └── integration/
│       ├── oauth.test.js     # OAuth flow tests
│       └── api.test.js       # API integration tests
│
├── scripts/
│   ├── initDb.js             # Database initialization
│   ├── generateKeys.js       # Generate encryption keys
│   └── monitor.js            # Background monitoring
│
└── docs/
    ├── API.md                # API documentation
    ├── DEPLOYMENT.md         # Deployment guide
    └── ARCHITECTURE.md       # Architecture documentation
```

## Key Components Description

### Application Entry Point
- **app.py / server.js**: Main application file that initializes the app, sets up routes, and starts the server
- **wsgi.py**: Production WSGI server entry point (Python only)

### Configuration
- **config/database.py**: Database connection setup and ORM configuration
- **config/settings.py**: Application settings loaded from environment variables
- **config/logging.py**: Logging configuration for different environments

### Models
Define database schemas and ORM models:
- **User**: User account information
- **Token**: Encrypted access tokens
- **Page**: Facebook page information
- **MonitoringEvent**: Page monitoring events

### Services
Business logic layer:
- **auth_service.py**: OAuth flow, user authentication
- **token_service.py**: Token encryption, storage, refresh
- **encryption_service.py**: AES-256 encryption/decryption
- **facebook_api.py**: Facebook Graph API client
- **page_service.py**: Page management operations
- **monitoring_service.py**: Page monitoring logic

### Routes
HTTP endpoint handlers:
- **auth.py**: `/auth/*` endpoints for OAuth flow
- **api.py**: `/api/*` RESTful API endpoints
- **pages.py**: `/pages/*` page management endpoints
- **webhooks.py**: Facebook webhook endpoints

### Middleware
Request processing middleware:
- **auth_middleware.py**: Verify user authentication
- **rate_limit.py**: Rate limiting per user/IP
- **error_handler.py**: Centralized error handling
- **security.py**: Security headers, CORS

### Utils
Helper functions and utilities:
- **validators.py**: Input validation functions
- **helpers.py**: General utility functions
- **decorators.py**: Custom decorators for routes

### Static Files
Frontend assets:
- **css/**: Stylesheets
- **js/**: JavaScript files
- **images/**: Images and icons

### Templates/Views
HTML templates:
- **base.html**: Base template with common elements
- **dashboard.html**: User dashboard
- **pages.html**: Page management interface

### Tests
Test files:
- **unit tests**: Test individual components
- **integration tests**: Test complete workflows
- **conftest.py**: Pytest fixtures and configuration

### Scripts
Utility scripts:
- **init_db.py**: Initialize database schema
- **generate_keys.py**: Generate encryption keys
- **monitor.py**: Background monitoring daemon

## Dependencies

### Python/Flask
```txt
# requirements.txt
flask==3.0.0
flask-sqlalchemy==3.1.1
psycopg2-binary==2.9.9
python-dotenv==1.0.0
requests==2.31.0
cryptography==41.0.7
facebook-sdk==3.1.0
werkzeug==3.0.1
pytest==7.4.3
pytest-cov==4.1.0
alembic==1.13.1
```

### Node.js/Express
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "express-session": "^1.17.3",
    "passport": "^0.7.0",
    "passport-facebook": "^3.0.0",
    "pg": "^8.11.3",
    "sequelize": "^6.35.2",
    "dotenv": "^16.3.1",
    "axios": "^1.6.2",
    "crypto-js": "^4.2.0",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "nodemon": "^3.0.2"
  }
}
```

## File Templates

### app.py (Python)
```python
from flask import Flask
from config.database import init_db
from config.settings import Config
from routes import auth, api, pages

app = Flask(__name__)
app.config.from_object(Config)

# Initialize database
init_db(app)

# Register blueprints
app.register_blueprint(auth.bp)
app.register_blueprint(api.bp)
app.register_blueprint(pages.bp)

if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=Config.PORT,
        debug=Config.DEBUG
    )
```

### server.js (Node.js)
```javascript
const express = require('express');
const session = require('express-session');
const passport = require('passport');
require('dotenv').config();

const app = express();
const config = require('./src/config');
const routes = require('./src/routes');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session(config.session));
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/auth', routes.auth);
app.use('/api', routes.api);
app.use('/pages', routes.pages);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

## Database Schema Files

### models/user.py (Python/SQLAlchemy)
```python
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from .base import Base

class User(Base):
    __tablename__ = 'users'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    facebook_user_id = Column(String(255), unique=True, nullable=False)
    username = Column(String(255), nullable=False)
    email = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

### models/User.js (Node.js/Sequelize)
```javascript
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('User', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        facebookUserId: {
            type: DataTypes.STRING(255),
            unique: true,
            allowNull: false
        },
        username: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        email: {
            type: DataTypes.STRING(255)
        }
    }, {
        timestamps: true,
        underscored: true
    });
};
```

## Best Practices

1. **Separation of Concerns**
   - Keep routes thin, move logic to services
   - Models only contain data structure
   - Services contain business logic

2. **Configuration**
   - All secrets in environment variables
   - Separate config for dev/prod
   - Never commit `.env` file

3. **Error Handling**
   - Centralized error handling middleware
   - Proper error logging
   - User-friendly error messages

4. **Testing**
   - Write tests alongside code
   - Aim for 80%+ coverage
   - Test critical paths thoroughly

5. **Security**
   - Validate all inputs
   - Encrypt sensitive data
   - Use security middleware
   - Regular dependency updates

## Next Steps

1. Choose your technology stack (Python or Node.js)
2. Set up the basic project structure
3. Install dependencies
4. Configure environment variables
5. Initialize database
6. Start implementing features following the implementation plan

Refer to [QUICKSTART_GUIDE.md](./QUICKSTART_GUIDE.md) for step-by-step setup instructions.
