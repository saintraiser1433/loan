# SMS Notifications Setup Guide

This guide explains how to set up automated SMS notifications for the loan management system.

## Features

The system sends SMS notifications for:

1. **Loan Application Approval/Rejection** - Automatic when admin/loan officer evaluates application
2. **Borrower Account Approval/Rejection** - Automatic when admin approves/rejects borrower registration
3. **Payment Approval/Rejection** - Automatic when admin approves/rejects a payment
4. **7 Days Before Due Date Reminder** - Scheduled reminder sent 7 days before loan due date
5. **Overdue Loan Notification** - Scheduled notification for loans that are past due

## Setup Instructions

### 1. Configure SMS Gateway

1. Go to **Dashboard > SMS Settings** (Admin only)
2. Install the [Android SMS Gateway app](https://github.com/capcom6/android-sms-gateway) on your Android device
3. Configure the app:
   - Enable Local Server or Cloud Server
   - Note the username and password
   - For local mode: Note your device's IP address
4. Enter the credentials in the SMS Settings page
5. Test the connection using the "Test SMS" button
6. Enable SMS sending

### 2. Set Up Cron Job for Scheduled Notifications

The system includes an API endpoint `/api/sms/notifications` that should be called periodically to send:
- 7 days before due date reminders
- Overdue loan notifications

#### Option A: Using Vercel Cron (Recommended for Vercel deployments)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/sms/notifications",
      "schedule": "0 9 * * *"
    }
  ]
}
```

This runs daily at 9 AM. You can also set it to run every hour:
```json
{
  "schedule": "0 * * * *"
}
```

#### Option B: Using External Cron Service

Use services like:
- **cron-job.org** - Free cron service
- **EasyCron** - Reliable cron service
- **GitHub Actions** - If using GitHub

Set up a cron job to call:
```
GET https://your-domain.com/api/sms/notifications
Authorization: Bearer YOUR_CRON_SECRET
```

#### Option C: Using Windows Task Scheduler (Local Development)

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger (e.g., Daily at 9:00 AM)
4. Set action: Start a program
5. Program: `curl` or `PowerShell`
6. Arguments:
   ```powershell
   Invoke-WebRequest -Uri "http://localhost:3000/api/sms/notifications" -Method GET -Headers @{"Authorization"="Bearer YOUR_CRON_SECRET"}
   ```

#### Option D: Using Linux Cron (Server Deployment)

Add to crontab (`crontab -e`):

```bash
# Run daily at 9 AM
0 9 * * * curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.com/api/sms/notifications

# Or run every hour
0 * * * * curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.com/api/sms/notifications
```

### 3. Set Environment Variable (Optional but Recommended)

Add to your `.env` file:

```env
CRON_SECRET=your-secret-key-here
```

This prevents unauthorized access to the notifications endpoint.

## How It Works

### Automatic Notifications

These are sent immediately when actions occur:
- Loan application approval/rejection
- Borrower account approval/rejection  
- Payment approval/rejection

### Scheduled Notifications

The `/api/sms/notifications` endpoint:
1. Finds loans due in exactly 7 days
2. Sends reminder SMS (only once per day per loan)
3. Finds overdue loans
4. Updates loan status to OVERDUE if needed
5. Sends overdue notification SMS (only once per day per loan)

### Duplicate Prevention

The system checks SMS logs to ensure:
- Only one reminder per day per loan
- Only one overdue notification per day per loan

## Testing

1. **Test SMS Settings**: Use the "Test SMS" button in SMS Settings
2. **Test Automatic Notifications**: Approve/reject a loan application or payment
3. **Test Scheduled Notifications**: Manually call the endpoint:
   ```bash
   curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/sms/notifications
   ```

## Troubleshooting

### SMS Not Sending

1. Check SMS Settings are configured and enabled
2. Verify Android SMS Gateway app is running
3. Check SMS logs in the database for error messages
4. Test SMS connection using the "Test SMS" button

### Cron Job Not Running

1. Verify the cron service is active
2. Check the endpoint URL is correct
3. Verify authorization header if using CRON_SECRET
4. Check server logs for errors

### Duplicate SMS

The system prevents duplicates by checking SMS logs. If you see duplicates:
1. Check the SMS logs table
2. Verify the date/time logic is working correctly
3. Ensure cron job isn't running too frequently

## SMS Message Formats

### 7 Days Before Due Date Reminder
```
Dear [Name],

REMINDER: Your loan payment is due in 7 days.

Loan Details:
- Loan ID: [id]
- Remaining Balance: ₱[amount]
- Due Date: [date]

Please make your payment before the due date to avoid late fees.

Glan Credible and Capital Inc.
```

### Overdue Notification
```
Dear [Name],

⚠️ URGENT: Your loan is OVERDUE!

Loan Details:
- Loan ID: [id]
- Remaining Balance: ₱[amount]
- Days Overdue: [days]
- Estimated Late Fee: ₱[fee]
- Due Date: [date]

Please make your payment immediately to avoid additional penalties.

Glan Credible and Capital Inc.
```

### Payment Approved
```
Dear [Name],

Your [partial/full] payment of ₱[amount] has been APPROVED.

Loan ID: [id]
Remaining Balance: ₱[amount]

Thank you for your payment!

Glan Credible and Capital Inc.
```

### Payment Rejected
```
Dear [Name],

Your payment of ₱[amount] has been REJECTED.

Reason: [reason]

Loan ID: [id]

Please contact us for assistance.

Glan Credible and Capital Inc.
```



