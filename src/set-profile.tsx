import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  listProfileNames,
  loadSafariBookmarks,
} from "./utils/safari-bookmarks";
import { getCurrentProfile, setCurrentProfile } from "./utils/profile-storage";

type ProfilePickerProps = {
  onSelected?: (profile: string) => void;
};

export default function Command() {
  return <ProfilePicker />;
}

export function ProfilePicker({ onSelected }: ProfilePickerProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [profiles, setProfiles] = useState<string[]>([]);
  const [currentProfile, setCurrentProfileState] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    async function load() {
      try {
        const [bookmarks, currentProfile] = await Promise.all([
          loadSafariBookmarks(),
          getCurrentProfile(),
        ]);
        setProfiles(listProfileNames(bookmarks));
        setCurrentProfileState(currentProfile);
      } catch (error) {
        setError(error instanceof Error ? error.message : String(error));
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, []);

  async function chooseProfile(profile: string) {
    await setCurrentProfile(profile);
    setCurrentProfileState(profile);
    await showToast({
      style: Toast.Style.Success,
      title: `Safari profile set to ${profile}`,
    });
    onSelected?.(profile);
    if (onSelected) {
      pop();
    }
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Set Safari Profile"
      searchBarPlaceholder="Search bookmark folders..."
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not read Safari bookmarks"
          description={`${error}\n\nGrant Raycast Full Disk Access if needed.`}
        />
      ) : profiles.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No bookmark folders found"
          description="Create folders in Safari bookmarks first."
        />
      ) : (
        profiles.map((profile) => (
          <List.Item
            key={profile}
            icon={
              profile === currentProfile
                ? { source: Icon.CheckCircle, tintColor: Color.Green }
                : Icon.Folder
            }
            title={profile}
            accessories={
              profile === currentProfile
                ? [{ tag: { value: "Current", color: Color.Green } }]
                : []
            }
            actions={
              <ActionPanel>
                <Action
                  title="Set Current Profile"
                  icon={Icon.CheckCircle}
                  onAction={() => chooseProfile(profile)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
