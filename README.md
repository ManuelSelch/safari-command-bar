# Safari Command Bar

A tiny Raycast extension for profile-aware Safari bookmark search.

## Idea
- Safari profiles are mirrored by bookmark folders with the same name. 
- The extension stores a manual `current profile`, then searches bookmarks below the matching folder only.
- It also shows the current opened tabs

## Commands
- **Set Safari Profile**: choose a bookmark folder as current profile.
- **Search Profile Bookmarks**: search open Safari tabs first, then bookmarks inside the current profile folder.
- **Search Safari Tabs**: search open Safari tabs and press Enter to focus the selected tab.

## Installation
1. Install [Raycast](https://www.raycast.com/) and Node.js/npm.
2. Clone this repository:

   ```bash
   git clone https://github.com/ManuelSelch/safari-command-bar.git
   cd safari-command-bar
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Start the extension in Raycast development mode:

   ```bash
   npm run dev
   ```

5. Open Raycast and run the extension commands:
   - `Set Safari Profile`
   - `Search Profile Bookmarks`
   - `Search Safari Tabs`

6. Give Raycast **Full Disk Access** in macOS System Settings so it can read Safari bookmarks:

   ```text
   ~/Library/Safari/Bookmarks.plist
   ```

## Development
```bash
npm install
npm test
npm run typecheck
npm run dev
```

Raycast needs Full Disk Access to read:

```text
~/Library/Safari/Bookmarks.plist
```