# Node Auth Backend

Express.js REST API for user registration, OTP email verification, and login with JWT.

## Stack

- **Runtime** — Node.js (ESM)
- **Framework** — Express 5
- **Email** — Nodemailer via Gmail SMTP
- **OTP** — otp-generator (6-digit numeric)
- **Auth** — JSON Web Tokens (jsonwebtoken)

## API Endpoints

Base path: `/user`

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/user/register` | Register a new user, sends OTP to email |
| `POST` | `/user/auth` | Verify OTP, activate account |
| `POST` | `/user/login` | Login with email + password, returns JWT |
| `GET` | `/health` | Reachability probe |

### POST `/user/register`
```json
{ "name": "John", "mail": "john@example.com", "pass": "secret", "MNo": "9876543210" }
```
Response: `{ "msg": "OTP sent", "user": { "ID", "mail", "name" } }`

### POST `/user/auth`
```json
{ "mail": "john@example.com", "otp": "482910" }
```
Response: `{ "msg": "Account verified, you may log in now", "user": { ... } }`

### POST `/user/login`
```json
{ "mail": "john@example.com", "pass": "secret" }
```
Response: `{ "msg": "user logged in", "user": { ..., "token": "<JWT>" } }`

## Environment Variables

Create a `.env` file in the root (never commit this):

```env
GMAIL_MAIL=your_gmail@gmail.com
GMAIL_PASS=your_gmail_app_password
SMTP_HOST=smtp.gmail.com
JWT_SECRET_KEY=your_long_random_secret
```

> `GMAIL_PASS` must be a Gmail **App Password**, not your account password.  
> Enable 2FA on your Google account, then generate one at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).

## Running Locally

```bash
npm install
npm run dev     # nodemon, auto-restarts on file change
```

## Production

```bash
npm start       # plain node, no file watching
```

Set the environment variables on your hosting platform instead of a `.env` file.

> **Note:** User data is stored in memory. All users are lost on server restart. Suitable for development/demo only — add a database for persistent production use.
