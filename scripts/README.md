# Import Scripts

## Import Cheaters Script

This script imports cheaters from the [cf-cheater-highlighter repository](https://github.com/macaquedev/cf-cheater-highlighter/blob/main/cheaters.json) into your Firebase database.

### Features

- **Fetches data** from the GitHub repository automatically
- **Duplicate checking** - skips users that already exist in your database
- **Comprehensive logging** - shows progress and results
- **Error handling** - continues processing even if some entries fail
- **Rate limiting** - adds delays to avoid overwhelming the database
- **Firebase config via environment variables** - no hardcoded config

### Usage

Before running, create a `.env` file in the project root with your Firebase config:

```
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

Run the script using npm:

```bash
npm run import-cheaters
```

### What it does

1. **Fetches** the cheaters.json file from GitHub
2. **Checks** each username against your existing database (both `cheaters` and `reports` collections)
3. **Adds** new cheaters with:
   - Username (normalized to lowercase)
   - Evidence: "see discord"
   - Status: "cheater"
   - Reported date: current timestamp
4. **Skips** any users that already exist
5. **Reports** a summary of results

### Output

The script provides detailed logging including:
- Progress updates for each user
- Summary of added, skipped, and failed entries
- Lists of usernames for each category
- Error details if any occur

### Safety

- **No duplicates** - checks both cheaters and reports collections
- **Case insensitive** - normalizes usernames to lowercase
- **Non-destructive** - only adds new entries, never modifies existing ones
- **Rate limited** - 100ms delay between operations to avoid database limits
- **No hardcoded config** - all Firebase config is loaded from environment variables

### Technical Details

- Uses CommonJS modules (compatible with React Scripts)
- Fetches data from GitHub raw content API
- Requires environment variables for Firebase config
- Handles network errors gracefully 