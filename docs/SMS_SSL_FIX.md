# SMS SSL Certificate Fix

## Problem
If you're seeing errors like:
```
Error: certificate has expired
code: 'CERT_HAS_EXPIRED'
```

This means the SSL certificate for your SMS gateway server has expired.

## Solutions

### Option 1: Fix the Certificate (Recommended for Production)
Update the SSL certificate on your SMS gateway server. Contact your SMS gateway provider or server administrator to renew the certificate.

### Option 2: Bypass SSL Verification (Development Only)
**⚠️ WARNING: Only use this for development/testing. Never use in production!**

To temporarily bypass SSL certificate verification, set this environment variable:

**Windows (PowerShell):**
```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"
npm run sms:worker
```

**Windows (Command Prompt):**
```cmd
set NODE_TLS_REJECT_UNAUTHORIZED=0
npm run sms:worker
```

**Linux/Mac:**
```bash
export NODE_TLS_REJECT_UNAUTHORIZED=0
npm run sms:worker
```

**Or create a `.env` file:**
```env
NODE_TLS_REJECT_UNAUTHORIZED=0
```

## How It Works

The SMS library (`lib/sms.ts`) now checks for the `NODE_TLS_REJECT_UNAUTHORIZED` environment variable. If set to `"0"`, it will bypass SSL certificate verification for Node.js environments.

## Important Notes

1. **Security Risk**: Bypassing SSL verification makes your connection vulnerable to man-in-the-middle attacks. Only use in development.

2. **Status Tracking**: The SMS worker now only marks SMS as "sent" (status = 1) if the SMS was actually sent successfully. Failed attempts will not update the status, so the worker will retry on the next check.

3. **Error Logging**: All SMS attempts (successful or failed) are logged in the `sms_logs` table in your database.

## Checking SMS Status

You can check SMS logs in your database:
```sql
SELECT * FROM sms_logs ORDER BY "createdAt" DESC LIMIT 10;
```

Or use Prisma Studio:
```bash
npm run db:studio
```


