# Safari Command Bar Requirements

## Goal
Build a small local Raycast extension that makes Safari bookmarks feel like an Arc-style command bar.

## MVP
- Persist a manually selected current profile in Raycast LocalStorage.
- Treat Safari bookmark folders as profile names.
- Search only bookmarks that live inside the current profile folder.
- Include nested bookmarks below that folder.
- Provide a separate command to change the current profile.

## Non-goals
- Detect Safari's real active profile automatically.
- Modify Safari's UI.
- Sync or edit Safari bookmarks.
