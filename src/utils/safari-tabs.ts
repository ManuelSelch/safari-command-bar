import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const FIELD_DELIMITER = "\u001f";
const ROW_DELIMITER = "\u001e";

export type SafariTab = {
  id: string;
  windowId: number;
  tabIndex: number;
  title: string;
  url: string;
  domain: string;
  isCurrent: boolean;
};

export async function loadSafariTabs(): Promise<SafariTab[]> {
  const { stdout } = await execFileAsync("/usr/bin/osascript", [
    "-e",
    GET_TABS_SCRIPT,
  ]);
  return parseSafariTabsOutput(stdout.trim());
}

export async function focusSafariTab(
  tab: Pick<SafariTab, "windowId" | "tabIndex">,
): Promise<void> {
  await execFileAsync("/usr/bin/osascript", [
    "-e",
    `
      tell application "Safari"
        set windowObj to window id ${tab.windowId}
        set tabObj to tab ${tab.tabIndex} of windowObj
        set index of windowObj to 1
        set current tab of windowObj to tabObj
        activate
      end tell
    `,
  ]);
}

export function parseSafariTabsOutput(output: string): SafariTab[] {
  if (!output) {
    return [];
  }

  return output
    .split(ROW_DELIMITER)
    .map((row) => row.split(FIELD_DELIMITER))
    .filter((fields) => fields.length >= 5)
    .map(([windowId, tabIndex, title, url, isCurrent]) => {
      const parsedWindowId = Number(windowId);
      const parsedTabIndex = Number(tabIndex);
      const parsedUrl = url || "";

      return {
        id: `${parsedWindowId}-${parsedTabIndex}`,
        windowId: parsedWindowId,
        tabIndex: parsedTabIndex,
        title: title || parsedUrl || "Untitled",
        url: parsedUrl,
        domain: getDomain(parsedUrl),
        isCurrent: isCurrent === "true",
      };
    });
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

const GET_TABS_SCRIPT = `
  tell application "Safari"
    if not (exists window 1) then return ""

    set rowDelimiter to ASCII character 30
    set fieldDelimiter to ASCII character 31
    set frontWindowID to id of front window
    set frontTabIndex to index of current tab of front window
    set rows to {}

    repeat with windowObj in windows
      set windowID to id of windowObj
      set tabIndex to 1

      repeat with tabObj in tabs of windowObj
        set tabTitle to name of tabObj
        set tabURL to URL of tabObj
        set isCurrent to false

        if windowID is frontWindowID and tabIndex is frontTabIndex then
          set isCurrent to true
        end if

        set end of rows to ((windowID as text) & fieldDelimiter & (tabIndex as text) & fieldDelimiter & tabTitle & fieldDelimiter & tabURL & fieldDelimiter & (isCurrent as text))
        set tabIndex to tabIndex + 1
      end repeat
    end repeat

    set AppleScript's text item delimiters to rowDelimiter
    set output to rows as text
    set AppleScript's text item delimiters to ""
    return output
  end tell
`;
