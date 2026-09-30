import { describe, expect, it } from "vitest";
import {
  extractBookmarks,
  filterBookmarksByProfile,
  listProfileNames,
} from "../utils/safari-bookmarks";
import { SafariBookmarksRoot } from "../types";

const bookmarksFixture: SafariBookmarksRoot = {
  Children: [
    {
      Title: "BookmarksBar",
      Children: [
        {
          Title: "Work",
          Children: [
            {
              WebBookmarkType: "WebBookmarkTypeLeaf",
              WebBookmarkUUID: "gitlab",
              URLString: "https://gitlab.example.com",
              URIDictionary: { title: "GitLab" },
            },
            {
              Title: "Docs",
              Children: [
                {
                  WebBookmarkType: "WebBookmarkTypeLeaf",
                  WebBookmarkUUID: "raycast-docs",
                  URLString: "https://developers.raycast.com",
                  URIDictionary: { title: "Raycast Docs" },
                },
              ],
            },
          ],
        },
        {
          Title: "Personal",
          Children: [
            {
              WebBookmarkType: "WebBookmarkTypeLeaf",
              WebBookmarkUUID: "hn",
              URLString: "https://news.ycombinator.com",
              URIDictionary: { title: "Hacker News" },
            },
          ],
        },
      ],
    },
    {
      Title: "com.apple.ReadingList",
      Children: [
        {
          WebBookmarkType: "WebBookmarkTypeLeaf",
          WebBookmarkUUID: "reading-list-item",
          URLString: "https://example.com/read-later",
          URIDictionary: { title: "Read Later" },
        },
      ],
    },
  ],
};

describe("Safari bookmark extraction", () => {
  it("extracts leaf bookmarks with their full folder path", () => {
    const bookmarks = extractBookmarks(bookmarksFixture);

    expect(bookmarks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "GitLab",
          domain: "gitlab.example.com",
          folderPath: ["BookmarksBar", "Work"],
        }),
        expect.objectContaining({
          title: "Raycast Docs",
          domain: "developers.raycast.com",
          folderPath: ["BookmarksBar", "Work", "Docs"],
        }),
      ]),
    );
  });

  it("ignores Safari reading list entries", () => {
    const bookmarks = extractBookmarks(bookmarksFixture);

    expect(bookmarks.map((bookmark) => bookmark.title)).not.toContain(
      "Read Later",
    );
  });

  it("lists usable profile names from bookmark folders", () => {
    const profileNames = listProfileNames(extractBookmarks(bookmarksFixture));

    expect(profileNames).toEqual(["Docs", "Personal", "Work"]);
  });

  it("filters bookmarks by profile folder including nested folders", () => {
    const workBookmarks = filterBookmarksByProfile(
      extractBookmarks(bookmarksFixture),
      "Work",
    );

    expect(workBookmarks.map((bookmark) => bookmark.title)).toEqual([
      "GitLab",
      "Raycast Docs",
    ]);
  });
});
