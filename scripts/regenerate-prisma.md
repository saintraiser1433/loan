# How to Fix Prisma Client Error

The error `Cannot read properties of undefined (reading 'findMany')` means the Prisma client needs to be regenerated.

## Steps to Fix:

1. **Stop your development server** (press Ctrl+C in the terminal where it's running)

2. **Regenerate Prisma Client:**
   ```bash
   npx prisma generate
   ```

3. **Restart your development server:**
   ```bash
   npm run dev
   ```

After this, notifications should work properly!





