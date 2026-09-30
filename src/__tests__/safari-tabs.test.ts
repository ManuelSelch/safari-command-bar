import { describe, expect, it } from "vitest";
import { parseSafariTabsOutput } from "../utils/safari-tabs";

const fieldDelimiter = "\u001f";
const rowDelimiter = "\u001e";

describe("Safari tab parsing", () => {
  it("parses osascript tab output", () => {
    const output = [
      [
        "924",
        "1",
        "Raycast API",
        "https://developers.raycast.com",
        "true",
      ].join(fieldDelimiter),
      ["120", "1", "Other", "https://other.example.com", "false"].join(
        fieldDelimiter,
      ),
      ["924", "2", "Example", "https://example.com/path", "false"].join(
        fieldDelimiter,
      ),
    ].join(rowDelimiter);

    expect(parseSafariTabsOutput(output)).toEqual([
      {
        id: "924-1",
        windowId: 924,
        displayWindowIndex: 2,
        tabIndex: 1,
        title: "Raycast API",
        url: "https://developers.raycast.com",
        domain: "developers.raycast.com",
        isCurrent: true,
      },
      {
        id: "120-1",
        windowId: 120,
        displayWindowIndex: 1,
        tabIndex: 1,
        title: "Other",
        url: "https://other.example.com",
        domain: "other.example.com",
        isCurrent: false,
      },
      {
        id: "924-2",
        windowId: 924,
        displayWindowIndex: 2,
        tabIndex: 2,
        title: "Example",
        url: "https://example.com/path",
        domain: "example.com",
        isCurrent: false,
      },
    ]);
  });

  it("returns no tabs for empty output", () => {
    expect(parseSafariTabsOutput("")).toEqual([]);
  });
});
