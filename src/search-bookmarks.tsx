import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  List,
  Toast,
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

export default function Command() {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState<SafariBookmark[]>([]);
  const [currentProfile, setCurrentProfile] = useState<string>();
  const [error, setError] = useState<string>();

  async function reload(profileOverride?: string) {
    setIsLoading(true);
    setError(undefined);

    try {
      const [bookmarks, storedProfile] = await Promise.all([
        loadSafariBookmarks(),
        getCurrentProfile(),
      ]);
      setBookmarks(bookmarks);
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
    await persistCurrentProfile(profile);
    setCurrentProfile(profile);
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

  return (
    <List
      isLoading={isLoading}
      navigationTitle={
        currentProfile ? `${currentProfile} Bookmarks` : "Profile Bookmarks"
      }
      searchBarPlaceholder={
        currentProfile
          ? `Search ${currentProfile} bookmarks...`
          : "Select a profile first..."
      }
      searchBarAccessory={
        <ProfileDropdown
          currentProfile={currentProfile}
          profiles={profileNames}
          onChange={chooseProfile}
        />
      }
    >
      {!currentProfile && !isLoading ? (
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
      ) : profileBookmarks.length === 0 && !isLoading ? (
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
      ) : (
        profileBookmarks.map((bookmark) => (
          <BookmarkItem
            key={bookmark.uuid}
            bookmark={bookmark}
            onChangeProfile={() =>
              push(<ProfilePicker onSelected={(profile) => reload(profile)} />)
            }
          />
        ))
      )}
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
  return (
    <List.Dropdown
      tooltip="Select Safari Profile"
      value={currentProfile ?? NO_PROFILE_VALUE}
      onChange={(value) => {
        if (value !== NO_PROFILE_VALUE) {
          onChange(value);
        }
      }}
    >
      {!currentProfile ? (
        <List.Dropdown.Item title="Select Profile" value={NO_PROFILE_VALUE} />
      ) : null}
      <List.Dropdown.Section title="Profiles">
        {profiles.map((profile) => (
          <List.Dropdown.Item key={profile} title={profile} value={profile} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function BookmarkItem({
  bookmark,
  onChangeProfile,
}: {
  bookmark: SafariBookmark;
  onChangeProfile: () => void;
}) {
  const folderPath = bookmark.folderPath.join(" / ");

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
      icon={Icon.Bookmark}
      title={bookmark.title}
      subtitle={bookmark.domain}
      accessories={[{ text: folderPath }]}
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
