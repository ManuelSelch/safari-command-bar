import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  Keyboard,
  closeMainWindow,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { SafariTab, focusSafariTab, loadSafariTabs } from "./utils/safari-tabs";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [tabs, setTabs] = useState<SafariTab[]>([]);
  const [error, setError] = useState<string>();
  const [searchText, setSearchText] = useState("");

  async function reload() {
    setIsLoading(true);
    setError(undefined);

    try {
      setTabs(await loadSafariTabs());
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Search Safari Tabs"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={{ keepSectionOrder: true }}
      searchBarPlaceholder="Search..."
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not read Safari tabs"
          description={error}
        />
      ) : tabs.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Window} title="No open Safari tabs" />
      ) : (
        tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            refresh={reload}
            resetSearch={() => setSearchText("")}
          />
        ))
      )}
    </List>
  );
}

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
      void refresh();
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

function getTabIcon(tab: SafariTab) {
  if (!tab.domain) {
    return Icon.Globe;
  }

  return {
    source: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(tab.domain)}&sz=64`,
    fallback: Icon.Globe,
  };
}
