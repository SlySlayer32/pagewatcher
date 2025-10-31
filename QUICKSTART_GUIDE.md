# PageWatcher Facebook Authentication - Quickstart Guide

## Prerequisites

Before you begin, ensure you have:
- A Facebook Developer account
- Node.js 18+ or Python 3.9+ installed
- PostgreSQL 13+ installed
- Git installed
- A text editor or IDE

## Step 1: Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click "My Apps" → "Create App"
3. Select "Consumer" as the app type
4. Fill in app details:
   - **App Name:** PageWatcher
   - **Contact Email:** your-email@example.com
5. Click "Create App"

### Configure Facebook Login

1. In your app dashboard, click "Add Product"
2. Find "Facebook Login" and click "Set Up"
3. Select "Web" as the platform
4. Enter your site URL: `http://localhost:3000` (for development)
5. Go to "Facebook Login" → "Settings"
6. Add OAuth Redirect URIs:
   - Development: `http://localhost:3000/auth/facebook/callback`
   - Production: `https://yourdomain.com/auth/facebook/callback`
7. Save changes

### Get App Credentials

1. Go to "Settings" → "Basic"
2. Copy your **App ID**
3. Click "Show" and copy your **App Secret**
4. Keep these secure!

### Request Permissions

1. Go to "App Review" → "Permissions and Features"
2. Request the following permissions:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_read_user_content`
3. Submit for review (required for production use)

## Step 2: Set Up Development Environment

### Option A: Python/Flask Implementation

#### Install Dependencies
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install required packages
pip install flask flask-sqlalchemy psycopg2-binary python-dotenv \
    requests cryptography facebook-sdk werkzeug
```

#### Create Environment File
Create `.env` in the project root:
```bash
# Facebook OAuth
FACEBOOK_APP_ID=your_app_id_here
FACEBOOK_APP_SECRET=your_app_secret_here
FACEBOOK_OAUTH_REDIRECT_URI=http://localhost:3000/auth/facebook/callback

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/pagewatcher

# Security (generate secure keys)
ENCRYPTION_KEY=your_32_byte_base64_encoded_key
SESSION_SECRET=your_random_session_secret

# Application
FLASK_ENV=development
FLASK_APP=app.py
PORT=3000
```

#### Generate Encryption Key
```bash
python -c "import os, base64; print(base64.b64encode(os.urandom(32)).decode())"
```

### Option B: Node.js/Express Implementation

#### Initialize Project
```bash
# Initialize npm project
npm init -y

# Install dependencies
npm install express express-session passport passport-facebook \
    pg sequelize bcrypt dotenv crypto-js axios
```

#### Create Environment File
Create `.env` in the project root:
```bash
# Facebook OAuth
FACEBOOK_APP_ID=your_app_id_here
FACEBOOK_APP_SECRET=your_app_secret_here
FACEBOOK_OAUTH_REDIRECT_URI=http://localhost:3000/auth/facebook/callback

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/pagewatcher

# Security
ENCRYPTION_KEY=your_32_byte_hex_key
SESSION_SECRET=your_random_session_secret

# Application
NODE_ENV=development
PORT=3000
```

#### Generate Encryption Key
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 3: Set Up Database

### Create Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE pagewatcher;

# Connect to the new database
\c pagewatcher
```

### Run Migrations
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

-- Create indexes
CREATE INDEX idx_tokens_user_id ON tokens(user_id);
CREATE INDEX idx_pages_user_id ON pages(user_id);
CREATE INDEX idx_pages_monitoring_enabled ON pages(monitoring_enabled);
```

## Step 4: Project Structure

Create the following directory structure:

```
pagewatcher/
├── .env                        # Environment variables (DO NOT COMMIT)
├── .env.example               # Template for environment variables
├── .gitignore                 # Git ignore file
├── README.md                  # Project README
├── requirements.txt           # Python dependencies (if using Python)
├── package.json              # Node dependencies (if using Node.js)
│
├── app.py                    # Main application file (Python)
├── server.js                 # Main application file (Node.js)
│
├── config/
│   ├── __init__.py
│   ├── database.py           # Database configuration
│   └── settings.py           # Application settings
│
├── models/
│   ├── __init__.py
│   ├── user.py               # User model
│   ├── token.py              # Token model
│   └── page.py               # Page model
│
├── services/
│   ├── __init__.py
│   ├── auth_service.py       # Authentication logic
│   ├── token_service.py      # Token management
│   ├── facebook_api.py       # Facebook API client
│   └── encryption_service.py # Encryption/decryption
│
├── routes/
│   ├── __init__.py
│   ├── auth.py               # Authentication routes
│   ├── pages.py              # Page management routes
│   └── api.py                # API routes
│
├── middleware/
│   ├── __init__.py
│   ├── auth_middleware.py    # Authentication middleware
│   └── rate_limit.py         # Rate limiting
│
├── static/
│   ├── css/
│   └── js/
│
├── templates/
│   ├── index.html            # Home page
│   ├── dashboard.html        # User dashboard
│   └── login.html            # Login page
│
└── tests/
    ├── __init__.py
    ├── test_auth.py          # Authentication tests
    ├── test_token.py         # Token tests
    └── test_facebook_api.py  # API tests
```

## Step 5: Create .gitignore

Create `.gitignore` file:
```
# Environment variables
.env
.env.local

# Python
__pycache__/
*.py[cod]
*$py.class
venv/
env/
*.so
.Python

# Node.js
node_modules/
npm-debug.log
yarn-error.log

# Database
*.db
*.sqlite

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Build
dist/
build/
```

## Step 6: Create .env.example

Create `.env.example` file:
```bash
# Facebook OAuth Configuration
FACEBOOK_APP_ID=your_app_id_here
FACEBOOK_APP_SECRET=your_app_secret_here
FACEBOOK_OAUTH_REDIRECT_URI=http://localhost:3000/auth/facebook/callback

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/pagewatcher

# Security Keys (generate new ones for production)
ENCRYPTION_KEY=generate_32_byte_key
SESSION_SECRET=generate_random_secret

# Application Settings
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# Monitoring Settings
CHECK_INTERVAL=300
MAX_PAGES_PER_USER=10
```

## Step 7: Implement Basic Authentication Flow

### Python/Flask Example

Create `app.py`:
```python
from flask import Flask, redirect, url_for, session, request, jsonify
from flask_sqlalchemy import SQLAlchemy
import os
from dotenv import load_dotenv
import requests

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SESSION_SECRET')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
db = SQLAlchemy(app)

FACEBOOK_APP_ID = os.getenv('FACEBOOK_APP_ID')
FACEBOOK_APP_SECRET = os.getenv('FACEBOOK_APP_SECRET')
FACEBOOK_REDIRECT_URI = os.getenv('FACEBOOK_OAUTH_REDIRECT_URI')

@app.route('/')
def index():
    return '''
        <h1>PageWatcher</h1>
        <a href="/auth/facebook">Login with Facebook</a>
    '''

@app.route('/auth/facebook')
def facebook_login():
    # Generate state for CSRF protection
    import secrets
    state = secrets.token_urlsafe(32)
    session['oauth_state'] = state
    
    # Build authorization URL
    fb_auth_url = (
        f"https://www.facebook.com/v18.0/dialog/oauth?"
        f"client_id={FACEBOOK_APP_ID}&"
        f"redirect_uri={FACEBOOK_REDIRECT_URI}&"
        f"state={state}&"
        f"scope=pages_show_list,pages_read_engagement,pages_read_user_content"
    )
    
    return redirect(fb_auth_url)

@app.route('/auth/facebook/callback')
def facebook_callback():
    # Verify state
    state = request.args.get('state')
    if state != session.get('oauth_state'):
        return "Invalid state parameter", 400
    
    # Get authorization code
    code = request.args.get('code')
    if not code:
        return "Authorization denied", 401
    
    # Exchange code for access token
    token_url = "https://graph.facebook.com/v18.0/oauth/access_token"
    response = requests.get(token_url, params={
        'client_id': FACEBOOK_APP_ID,
        'client_secret': FACEBOOK_APP_SECRET,
        'redirect_uri': FACEBOOK_REDIRECT_URI,
        'code': code
    })
    
    token_data = response.json()
    access_token = token_data.get('access_token')
    
    if not access_token:
        return "Failed to get access token", 500
    
    # Get user information
    user_url = "https://graph.facebook.com/me"
    user_response = requests.get(user_url, params={
        'access_token': access_token,
        'fields': 'id,name,email'
    })
    
    user_data = user_response.json()
    
    # Store user info in session
    session['user_id'] = user_data.get('id')
    session['user_name'] = user_data.get('name')
    
    # SECURITY: Encrypt token before storage - see SECURITY.md for implementation
    # Example: encrypted_token = encrypt_token(access_token, ENCRYPTION_KEY)
    # For this demo only - NEVER store plain tokens in production:
    session['access_token'] = access_token  # TODO: Replace with encrypted storage
    
    return redirect('/dashboard')

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('index'))
    
    return f'''
        <h1>Welcome, {session.get('user_name')}!</h1>
        <p>User ID: {session.get('user_id')}</p>
        <a href="/pages">View My Pages</a><br>
        <a href="/logout">Logout</a>
    '''

@app.route('/pages')
def pages():
    if 'access_token' not in session:
        return redirect(url_for('index'))
    
    # Get user's pages
    pages_url = "https://graph.facebook.com/me/accounts"
    response = requests.get(pages_url, params={
        'access_token': session.get('access_token')
    })
    
    pages_data = response.json()
    return jsonify(pages_data)

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True, port=int(os.getenv('PORT', 3000)))
```

## Step 8: Run the Application

### Python
```bash
# Activate virtual environment
source venv/bin/activate

# Run the application
python app.py
```

### Node.js
```bash
# Run the application
node server.js
```

Visit `http://localhost:3000` in your browser.

## Step 9: Test the Authentication Flow

1. Click "Login with Facebook"
2. You'll be redirected to Facebook
3. Authorize the app
4. You'll be redirected back to your app
5. You should see your dashboard with user info

## Step 10: Next Steps

### Implement Security Features
- [ ] Add token encryption
- [ ] Implement CSRF protection
- [ ] Add rate limiting
- [ ] Enable HTTPS in production
- [ ] Implement secure session management

### Add Page Monitoring
- [ ] Fetch user's Facebook pages
- [ ] Store pages in database
- [ ] Implement monitoring scheduler
- [ ] Add notification system

### Production Deployment
- [ ] Set up production database
- [ ] Configure environment variables
- [ ] Enable HTTPS
- [ ] Set up logging and monitoring
- [ ] Deploy to production server

## Common Issues & Solutions

### Issue: "Invalid OAuth redirect URI"
**Solution:** Ensure the redirect URI in your Facebook app settings exactly matches the one in your `.env` file.

### Issue: "App Not Set Up"
**Solution:** Make sure Facebook Login product is added to your app and properly configured.

### Issue: Token expired
**Solution:** Implement token refresh logic using long-lived tokens or refresh tokens.

### Issue: Permissions not granted
**Solution:** Request permissions in Facebook App Review for production use.

## Security Checklist

Before going to production:
- [ ] All secrets stored in environment variables
- [ ] Tokens encrypted in database
- [ ] HTTPS enforced on all endpoints
- [ ] CSRF protection implemented
- [ ] Rate limiting configured
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] Security headers configured
- [ ] Error messages don't leak sensitive info

## Resources

- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login)
- [Facebook Graph API](https://developers.facebook.com/docs/graph-api)
- [OAuth 2.0 Specification](https://oauth.net/2/)
- [OWASP Security Guide](https://owasp.org/)

## Support

For issues or questions:
1. Check the [TECHNICAL_SPECIFICATION.md](./TECHNICAL_SPECIFICATION.md)
2. Review [FACEBOOK_AUTH_IMPLEMENTATION_PLAN.md](./FACEBOOK_AUTH_IMPLEMENTATION_PLAN.md)
3. Open an issue on GitHub

## License

[Add your license here]
