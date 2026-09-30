import {
  mkdir,
  readFile as readTextFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
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

const CACHE_DIR = `${homedir()}/Library/Caches/safari-command-bar`;
const BOOKMARK_CACHE_PATH = `${CACHE_DIR}/bookmarks-cache-v1.json`;

type BookmarkCache = {
  mtimeMs: number;
  bookmarks: SafariBookmark[];
};

export async function loadSafariBookmarks(): Promise<SafariBookmark[]> {
  const plist = await readPlist(SAFARI_BOOKMARKS_PATH);
  return extractBookmarks(plist);
}

export async function loadCachedSafariBookmarks(): Promise<
  SafariBookmark[] | undefined
> {
  const cache = await readBookmarkCache();
  return cache?.bookmarks;
}

export async function loadSafariBookmarksCached(): Promise<SafariBookmark[]> {
  const mtimeMs = await getBookmarksMtime();
  const cache = await readBookmarkCache();

  if (cache?.mtimeMs === mtimeMs) {
    return cache.bookmarks;
  }

  const bookmarks = await loadSafariBookmarks();
  await writeBookmarkCache({ mtimeMs, bookmarks });
  return bookmarks;
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

async function getBookmarksMtime(): Promise<number> {
  const stats = await stat(SAFARI_BOOKMARKS_PATH);
  return stats.mtimeMs;
}

async function readBookmarkCache(): Promise<BookmarkCache | undefined> {
  try {
    return JSON.parse(
      await readTextFile(BOOKMARK_CACHE_PATH, "utf8"),
    ) as BookmarkCache;
  } catch {
    return undefined;
  }
}

async function writeBookmarkCache(cache: BookmarkCache): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });

  try {
    await writeFile(BOOKMARK_CACHE_PATH, JSON.stringify(cache), "utf8");
  } catch {
    await rm(BOOKMARK_CACHE_PATH, { force: true });
  }
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
