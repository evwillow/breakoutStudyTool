# Google Analytics Credentials

Place your Google Analytics service account JSON key file here.

## Setup Instructions

1. **Create a Service Account:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to IAM & Admin → Service Accounts
   - Create a new service account
   - Download the JSON key file

2. **Enable Google Analytics Data API:**
   - In Google Cloud Console, go to APIs & Services → Library
   - Search for "Google Analytics Data API"
   - Click Enable

3. **Grant Access:**
   - In Google Analytics, go to Admin → Property Access Management
   - Add the service account email (from the JSON file)
   - Grant "Viewer" role

4. **Place the File:**
   - Rename your downloaded JSON file to `ga-service-account.json`
   - Place it in this directory: `src/analytics/credentials/ga-service-account.json`

5. **Update .env:**
   Add to your `.env.local` file:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=src/analytics/credentials/ga-service-account.json
   GA_PROPERTY_ID=your_property_id_here
   ```

## Finding Your Property ID

- Go to Google Analytics 4
- Admin → Property Settings
- Copy the numeric Property ID (e.g., `123456789`)

