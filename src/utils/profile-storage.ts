import { LocalStorage } from "@raycast/api";

const CURRENT_PROFILE_KEY = "currentSafariProfile";

export async function getCurrentProfile(): Promise<string | undefined> {
  const value = await LocalStorage.getItem<string>(CURRENT_PROFILE_KEY);
  return value?.trim() || undefined;
}

export async function setCurrentProfile(profile: string): Promise<void> {
  await LocalStorage.setItem(CURRENT_PROFILE_KEY, profile);
}
