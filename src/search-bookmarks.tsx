import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  List,
  Toast,
  Keyboard,
  closeMainWindow,
  open,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { SafariBookmark } from "./types";
import { ProfilePicker } from "./set-profile";
import {
  filterBookmarksByProfile,
  listProfileNames,
  loadSafariBookmarks,
} from "./utils/safari-bookmarks";
import {
  getCurrentProfile,
  setCurrentProfile as persistCurrentProfile,
} from "./utils/profile-storage";
import { SafariTab, focusSafariTab, loadSafariTabs } from "./utils/safari-tabs";

export default function Command() {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState<SafariBookmark[]>([]);
  const [tabs, setTabs] = useState<SafariTab[]>([]);
  const [currentProfile, setCurrentProfile] = useState<string>();
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState<string>();

  async function reload(profileOverride?: string) {
    setIsLoading(true);
    setError(undefined);

    try {
      const [bookmarks, storedProfile, tabs] = await Promise.all([
        loadSafariBookmarks(),
        getCurrentProfile(),
        loadSafariTabs().catch(() => []),
      ]);
      setBookmarks(bookmarks);
      setTabs(tabs);
      setCurrentProfile(profileOverride || storedProfile);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const profileNames = useMemo(() => listProfileNames(bookmarks), [bookmarks]);

  const profileBookmarks = useMemo(() => {
    return currentProfile
      ? filterBookmarksByProfile(bookmarks, currentProfile)
      : [];
  }, [bookmarks, currentProfile]);

  async function chooseProfile(profile: string) {
    setCurrentProfile(profile);
    await persistCurrentProfile(profile);
    await showToast({
      style: Toast.Style.Success,
      title: `Safari profile set to ${profile}`,
    });
  }

  if (error) {
    return (
      <Detail
        markdown={`# Could not read Safari bookmarks\n\n${error}\n\nGrant Raycast Full Disk Access if needed.`}
        actions={
          <CommonActions
            onChangeProfile={() =>
              push(<ProfilePicker onSelected={(profile) => reload(profile)} />)
            }
          />
        }
      />
    );
  }

  const hasTabs = tabs.length > 0;
  const hasBookmarks = Boolean(currentProfile && profileBookmarks.length > 0);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={
        currentProfile ? `${currentProfile} Bookmarks` : "Profile Bookmarks"
      }
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={{ keepSectionOrder: true }}
      searchBarPlaceholder="Search..."
      searchBarAccessory={
        !isLoading ? (
          <ProfileDropdown
            key={currentProfile ?? NO_PROFILE_VALUE}
            currentProfile={currentProfile}
            profiles={profileNames}
            onChange={chooseProfile}
          />
        ) : undefined
      }
    >
      {hasTabs ? (
        <List.Section title="Open Tabs" subtitle={`${tabs.length}`}>
          {tabs.map((tab) => (
            <TabItem
              key={tab.id}
              tab={tab}
              refresh={reload}
              resetSearch={() => setSearchText("")}
            />
          ))}
        </List.Section>
      ) : null}

      {hasBookmarks ? (
        <List.Section title="Bookmarks" subtitle={`${profileBookmarks.length}`}>
          {profileBookmarks.map((bookmark) => (
            <BookmarkItem
              key={bookmark.uuid}
              bookmark={bookmark}
              currentProfile={currentProfile}
              onChangeProfile={() =>
                push(
                  <ProfilePicker onSelected={(profile) => reload(profile)} />,
                )
              }
            />
          ))}
        </List.Section>
      ) : null}

      {!isLoading && !hasTabs && !currentProfile ? (
        <List.EmptyView
          icon={Icon.PersonCircle}
          title="No current profile selected"
          description="Choose a Safari bookmark folder first."
          actions={
            <CommonActions
              onChangeProfile={() =>
                push(
                  <ProfilePicker onSelected={(profile) => reload(profile)} />,
                )
              }
            />
          }
        />
      ) : null}

      {!isLoading && !hasTabs && currentProfile && !hasBookmarks ? (
        <List.EmptyView
          icon={Icon.Bookmark}
          title={`No bookmarks found for ${currentProfile}`}
          description="The current profile must match a Safari bookmark folder name."
          actions={
            <CommonActions
              onChangeProfile={() =>
                push(
                  <ProfilePicker onSelected={(profile) => reload(profile)} />,
                )
              }
            />
          }
        />
      ) : null}
    </List>
  );
}

const NO_PROFILE_VALUE = "__no-profile-selected__";

function ProfileDropdown({
  currentProfile,
  profiles,
  onChange,
}: {
  currentProfile?: string;
  profiles: string[];
  onChange: (profile: string) => void;
}) {
  const selectableProfiles =
    currentProfile && !profiles.includes(currentProfile)
      ? [currentProfile, ...profiles]
      : profiles;

  return (
    <List.Dropdown
      tooltip="Select Safari Profile"
      defaultValue={currentProfile ?? NO_PROFILE_VALUE}
      onChange={(value) => {
        if (value !== NO_PROFILE_VALUE && value !== currentProfile) {
          onChange(value);
        }
      }}
    >
      <List.Dropdown.Item title="Select Profile" value={NO_PROFILE_VALUE} />
      <List.Dropdown.Section title="Profiles">
        {selectableProfiles.map((profile) => (
          <List.Dropdown.Item key={profile} title={profile} value={profile} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

const SYSTEM_FOLDER_TITLES = new Set([
  "",
  "Bookmarks",
  "BookmarksBar",
  "BookmarksMenu",
]);

function TabItem({
  tab,
  refresh,
  resetSearch,
}: {
  tab: SafariTab;
  refresh: () => Promise<void>;
  resetSearch: () => void;
}) {
  async function focusTab() {
    try {
      await focusSafariTab(tab);
      resetSearch();
      await refresh();
      await closeMainWindow({ clearRootSearch: true });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not focus tab",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <List.Item
      icon={getTabIcon(tab)}
      title={tab.title}
      subtitle={tab.domain || tab.url}
      keywords={[
        tab.url,
        tab.domain,
        `window ${tab.windowId}`,
        `tab ${tab.tabIndex}`,
      ]}
      accessories={[{ text: `Window ${tab.windowId} · Tab ${tab.tabIndex}` }]}
      actions={
        <ActionPanel>
          <Action title="Focus Tab" icon={Icon.Window} onAction={focusTab} />
          <Action.CopyToClipboard title="Copy URL" content={tab.url} />
          <Action.CopyToClipboard
            title="Copy Markdown Link"
            content={`[${tab.title}](${tab.url})`}
          />
          <Action
            title="Reload Tabs"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={refresh}
          />
        </ActionPanel>
      }
    />
  );
}

function BookmarkItem({
  bookmark,
  currentProfile,
  onChangeProfile,
}: {
  bookmark: SafariBookmark;
  currentProfile?: string;
  onChangeProfile: () => void;
}) {
  const folderPath = getRelativeFolderPath(bookmark.folderPath, currentProfile);
  const accessories = folderPath ? [{ text: folderPath }] : [];

  async function openInSafari() {
    try {
      await open(bookmark.url, "Safari");
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not open bookmark",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <List.Item
      icon={getBookmarkIcon(bookmark)}
      title={bookmark.title}
      subtitle={bookmark.domain}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            title="Open in Safari"
            icon={Icon.Globe}
            onAction={openInSafari}
          />
          <Action.CopyToClipboard title="Copy URL" content={bookmark.url} />
          <Action.CopyToClipboard
            title="Copy Markdown Link"
            content={`[${bookmark.title}](${bookmark.url})`}
          />
          <Action
            title="Change Current Profile"
            icon={Icon.PersonCircle}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            onAction={onChangeProfile}
          />
        </ActionPanel>
      }
    />
  );
}

function getTabIcon(tab: SafariTab) {
  return getWebsiteIcon(tab.domain, Icon.Globe);
}

function getBookmarkIcon(bookmark: SafariBookmark) {
  return getWebsiteIcon(bookmark.domain, Icon.Bookmark);
}

function getWebsiteIcon(domain: string, fallback: Icon) {
  if (!domain) {
    return fallback;
  }

  return {
    source: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`,
    fallback,
  };
}

function getRelativeFolderPath(
  folderPath: string[],
  currentProfile?: string,
): string {
  const profileIndex = currentProfile ? folderPath.indexOf(currentProfile) : -1;
  const relativePath =
    profileIndex >= 0 ? folderPath.slice(profileIndex + 1) : folderPath;

  return relativePath
    .filter((folder) => !SYSTEM_FOLDER_TITLES.has(folder))
    .join(" / ");
}

function CommonActions({ onChangeProfile }: { onChangeProfile: () => void }) {
  return (
    <ActionPanel>
      <Action
        title="Set Current Profile"
        icon={Icon.PersonCircle}
        onAction={onChangeProfile}
      />
    </ActionPanel>
  );
}
