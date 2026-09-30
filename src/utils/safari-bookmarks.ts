import { homedir } from "node:os";
import { promisify } from "node:util";
import { bplistParser, readFile } from "simple-plist";
import {
  SafariBookmark,
  SafariBookmarkNode,
  SafariBookmarksRoot,
} from "../types";

export const SAFARI_BOOKMARKS_PATH = `${homedir()}/Library/Safari/Bookmarks.plist`;

const SAFARI_BOOKMARKS_MAX_OBJECT_COUNT = 250_000;
(bplistParser as unknown as { maxObjectCount: number }).maxObjectCount =
  SAFARI_BOOKMARKS_MAX_OBJECT_COUNT;

const readPlist = promisify(
  readFile as unknown as (
    path: string,
    callback: (error: Error | null, data: SafariBookmarksRoot) => void,
  ) => void,
);

const SYSTEM_FOLDER_TITLES = new Set([
  "",
  "Bookmarks",
  "BookmarksBar",
  "BookmarksMenu",
  "com.apple.ReadingList",
]);

export async function loadSafariBookmarks(): Promise<SafariBookmark[]> {
  const plist = await readPlist(SAFARI_BOOKMARKS_PATH);
  return extractBookmarks(plist);
}

export function extractBookmarks(root: SafariBookmarksRoot): SafariBookmark[] {
  return flattenBookmarks(root, []);
}

export function listProfileNames(bookmarks: SafariBookmark[]): string[] {
  const folderNames = new Set<string>();

  for (const bookmark of bookmarks) {
    for (const folder of bookmark.folderPath) {
      if (!SYSTEM_FOLDER_TITLES.has(folder)) {
        folderNames.add(folder);
      }
    }
  }

  return [...folderNames].sort((a, b) => a.localeCompare(b));
}

export function filterBookmarksByProfile(
  bookmarks: SafariBookmark[],
  profile: string,
): SafariBookmark[] {
  return bookmarks.filter((bookmark) => bookmark.folderPath.includes(profile));
}

function flattenBookmarks(
  node: SafariBookmarkNode,
  folderPath: string[],
): SafariBookmark[] {
  if (node.Title === "com.apple.ReadingList") {
    return [];
  }

  if (node.Children) {
    const nextFolderPath = node.Title
      ? [...folderPath, node.Title]
      : folderPath;
    return node.Children.flatMap((child) =>
      flattenBookmarks(child, nextFolderPath),
    );
  }

  if (node.WebBookmarkType !== "WebBookmarkTypeLeaf" || !node.URLString) {
    return [];
  }

  return [
    {
      uuid: node.WebBookmarkUUID || node.URLString,
      title: node.Title || node.URIDictionary?.title || node.URLString,
      url: node.URLString,
      domain: getDomain(node.URLString),
      folderPath,
    },
  ];
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
