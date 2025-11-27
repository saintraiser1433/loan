# Loan Management System - Setup Guide

## Prerequisites
- PostgreSQL installed and running
- Node.js 18+ installed
- npm or yarn

## Database Setup

1. **Create the database:**
   ```sql
   CREATE DATABASE loan_db;
   ```

2. **Update `.env` file** (create it if it doesn't exist):
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/loan_db?schema=public"
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key-change-this-in-production
   SMS_API_KEY=your-sms-api-key
   SMS_API_SECRET=your-sms-api-secret
   ```

3. **Run database migrations:**
   ```bash
   npm run db:push
   ```

4. **Seed initial data:**
   ```bash
   npm run db:seed
   ```

## Features Implemented

### Database Schema
- ✅ User model with roles (BORROWER, LOAN_OFFICER, ADMIN)
- ✅ Loan Application with all required fields
- ✅ Loan Types, Purposes, Payment Durations
- ✅ Loans and Payments
- ✅ Contact Persons
- ✅ SMS Logs

### API Routes
- ✅ `/api/auth/[...nextauth]` - Authentication
- ✅ `/api/register` - User registration
- ✅ `/api/loans/applications` - Create and get loan applications
- ✅ `/api/loans/evaluate` - Loan officer evaluation
- ✅ `/api/loans/create` - Create loan from approved application
- ✅ `/api/loans/types` - Manage loan types
- ✅ `/api/payments` - Payment processing
- ✅ `/api/purposes` - Get loan purposes
- ✅ `/api/payment-durations` - Get payment durations

### Core Features

#### Loan Officer/Admin:
- Evaluate borrowers and assign credit score/loan limit
- Decline borrowers with reasons (SMS integration ready)
- Increase loan limit and credit score when fully paid
- Add loan types with interest rates
- Add payment durations
- View reports (API ready, UI needed)

#### Borrower:
- Loan application with:
  - Occupational information
  - Document uploads (primary ID, 2 secondary IDs, selfie with ID)
  - Payslip and billing receipts
  - 3 contact persons
- Payment with receipt upload
- Partial or full payment
- Choose loan amount (if approved for 5k, can borrow 3k)

## Next Steps

1. **Create UI Components:**
   - Login/Register pages
   - Borrower dashboard
   - Loan application form
   - Payment form
   - Loan Officer dashboard
   - Evaluation interface
   - Reports page

2. **File Upload:**
   - Set up file storage (local or cloud)
   - Create upload API endpoint
   - Update application form to handle uploads

3. **SMS Integration:**
   - Integrate SMS service (Twilio, etc.)
   - Implement SMS sending in evaluation and payment routes

4. **Reports:**
   - Create report generation API
   - Build report UI components

## Default Admin Account
- Email: `admin@loan.com`
- Password: `admin123` (change this in production!)

## Running the Application

```bash
# Install dependencies
npm install

# Set up database
npm run db:push
npm run db:seed

# Run development server
npm run dev
```

## Database Management

```bash
# View database in Prisma Studio
npm run db:studio

# Create migration
npm run db:migrate

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```





## Prerequisites
- PostgreSQL installed and running
- Node.js 18+ installed
- npm or yarn

## Database Setup

1. **Create the database:**
   ```sql
   CREATE DATABASE loan_db;
   ```

2. **Update `.env` file** (create it if it doesn't exist):
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/loan_db?schema=public"
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key-change-this-in-production
   SMS_API_KEY=your-sms-api-key
   SMS_API_SECRET=your-sms-api-secret
   ```

3. **Run database migrations:**
   ```bash
   npm run db:push
   ```

4. **Seed initial data:**
   ```bash
   npm run db:seed
   ```

## Features Implemented

### Database Schema
- ✅ User model with roles (BORROWER, LOAN_OFFICER, ADMIN)
- ✅ Loan Application with all required fields
- ✅ Loan Types, Purposes, Payment Durations
- ✅ Loans and Payments
- ✅ Contact Persons
- ✅ SMS Logs

### API Routes
- ✅ `/api/auth/[...nextauth]` - Authentication
- ✅ `/api/register` - User registration
- ✅ `/api/loans/applications` - Create and get loan applications
- ✅ `/api/loans/evaluate` - Loan officer evaluation
- ✅ `/api/loans/create` - Create loan from approved application
- ✅ `/api/loans/types` - Manage loan types
- ✅ `/api/payments` - Payment processing
- ✅ `/api/purposes` - Get loan purposes
- ✅ `/api/payment-durations` - Get payment durations

### Core Features

#### Loan Officer/Admin:
- Evaluate borrowers and assign credit score/loan limit
- Decline borrowers with reasons (SMS integration ready)
- Increase loan limit and credit score when fully paid
- Add loan types with interest rates
- Add payment durations
- View reports (API ready, UI needed)

#### Borrower:
- Loan application with:
  - Occupational information
  - Document uploads (primary ID, 2 secondary IDs, selfie with ID)
  - Payslip and billing receipts
  - 3 contact persons
- Payment with receipt upload
- Partial or full payment
- Choose loan amount (if approved for 5k, can borrow 3k)

## Next Steps

1. **Create UI Components:**
   - Login/Register pages
   - Borrower dashboard
   - Loan application form
   - Payment form
   - Loan Officer dashboard
   - Evaluation interface
   - Reports page

2. **File Upload:**
   - Set up file storage (local or cloud)
   - Create upload API endpoint
   - Update application form to handle uploads

3. **SMS Integration:**
   - Integrate SMS service (Twilio, etc.)
   - Implement SMS sending in evaluation and payment routes

4. **Reports:**
   - Create report generation API
   - Build report UI components

## Default Admin Account
- Email: `admin@loan.com`
- Password: `admin123` (change this in production!)

## Running the Application

```bash
# Install dependencies
npm install

# Set up database
npm run db:push
npm run db:seed

# Run development server
npm run dev
```

## Database Management

```bash
# View database in Prisma Studio
npm run db:studio

# Create migration
npm run db:migrate

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```






