# Import Scripts

## Import Cheaters Script

This script imports cheaters from the [cf-cheater-highlighter repository](https://github.com/macaquedev/cf-cheater-highlighter/blob/main/cheaters.json) into your Firebase database.

### Features

- **Fetches data** from the GitHub repository automatically
- **Duplicate checking** - skips users that already exist in your database
- **Comprehensive logging** - shows progress and results
- **Error handling** - continues processing even if some entries fail
- **Rate limiting** - adds delays to avoid overwhelming the database
- **Firebase config included** - no additional setup required

### Usage

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

### Technical Details

- Uses CommonJS modules (compatible with React Scripts)
- Includes Firebase configuration
- Fetches data from GitHub raw content API
- Handles network errors gracefully 