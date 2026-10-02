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