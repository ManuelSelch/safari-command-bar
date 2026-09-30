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
import {
  SafariTab,
  focusSafariTab,
  loadCachedSafariTabs,
  loadSafariTabsAndCache,
} from "./utils/safari-tabs";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [tabs, setTabs] = useState<SafariTab[]>([]);
  const [error, setError] = useState<string>();
  const [searchText, setSearchText] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string>();

  async function loadCachedData() {
    setIsLoading(true);
    setError(undefined);

    try {
      const cachedTabs = await loadCachedSafariTabs();

      if (cachedTabs) {
        setTabs(cachedTabs);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshData() {
    try {
      setTabs(await loadSafariTabsAndCache());
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  }

  async function reload() {
    await loadCachedData();
    void refreshData();
  }

  useEffect(() => {
    void reload();
  }, []);

  const topItemId = tabs[0] ? getTabItemId(tabs[0]) : undefined;

  function resetListState() {
    setSearchText("");
    setSelectedItemId(topItemId);
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Search Safari Tabs"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      selectedItemId={selectedItemId ?? topItemId}
      onSelectionChange={(id) => setSelectedItemId(id ?? undefined)}
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
            refresh={refreshData}
            resetListState={resetListState}
          />
        ))
      )}
    </List>
  );
}

function TabItem({
  tab,
  refresh,
  resetListState,
}: {
  tab: SafariTab;
  refresh: () => Promise<void>;
  resetListState: () => void;
}) {
  async function focusTab() {
    try {
      await focusSafariTab(tab);
      resetListState();
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
      id={getTabItemId(tab)}
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

function getTabItemId(tab: SafariTab): string {
  return `tab-${tab.id}`;
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
