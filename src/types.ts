export type SafariBookmark = {
  uuid: string;
  title: string;
  url: string;
  domain: string;
  folderPath: string[];
};

export type SafariBookmarkNode = {
  Title?: string;
  Children?: SafariBookmarkNode[];
  WebBookmarkType?: string;
  WebBookmarkUUID?: string;
  URLString?: string;
  URIDictionary?: {
    title?: string;
  };
  ReadingListNonSync?: {
    Title?: string;
  };
};

export type SafariBookmarksRoot = SafariBookmarkNode;
