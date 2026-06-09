import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { downloadTextFile } from "./text-file-download";

class FakeBlob {
  constructor(
    public parts: string[],
    public options: { type: string }
  ) {}
}

describe("text-file-download", () => {
  it("텍스트와 파일명을 받아 다운로드 링크를 만들고 정리한다", () => {
    // Given
    const events: string[] = [];
    const anchor = createFakeAnchor(events);
    const createdBlobs: FakeBlob[] = [];
    const revokedUrls: string[] = [];

    // When
    downloadTextFile(
      {
        text: "Space 1 쌓는 순서",
        filename: "my-tetris-space-1-loading.txt"
      },
      {
        Blob: class extends FakeBlob {
          constructor(parts: string[], options: { type: string }) {
            super(parts, options);
            createdBlobs.push(this);
          }
        },
        URL: {
          createObjectURL: () => "blob://download-text",
          revokeObjectURL: (url) => {
            revokedUrls.push(url);
          }
        },
        document: {
          body: {
            appendChild: () => events.push("append")
          },
          createElement: () => anchor
        }
      }
    );

    // Then
    assert.equal(anchor.href, "blob://download-text");
    assert.equal(anchor.download, "my-tetris-space-1-loading.txt");
    assert.deepEqual(createdBlobs[0].parts, ["Space 1 쌓는 순서"]);
    assert.deepEqual(createdBlobs[0].options, { type: "text/plain;charset=utf-8" });
    assert.deepEqual(events, ["append", "click", "remove"]);
    assert.deepEqual(revokedUrls, ["blob://download-text"]);
  });

  it("클릭 중 실패해도 링크와 object URL을 정리한다", () => {
    // Given
    const events: string[] = [];
    const anchor = createFakeAnchor(events, { clickThrows: true });
    const revokedUrls: string[] = [];

    // When / Then
    assert.throws(
      () =>
        downloadTextFile(
          {
            text: "확인 필요: 경고 확인",
            filename: "warning.txt"
          },
          {
            Blob: FakeBlob,
            URL: {
              createObjectURL: () => "blob://warning",
              revokeObjectURL: (url) => {
                revokedUrls.push(url);
              }
            },
            document: {
              body: {
                appendChild: () => events.push("append")
              },
              createElement: () => anchor
            }
          }
        ),
      /download blocked/
    );
    assert.deepEqual(events, ["append", "click", "remove"]);
    assert.deepEqual(revokedUrls, ["blob://warning"]);
  });

  it("링크를 화면에 붙이는 중 실패해도 object URL을 정리한다", () => {
    // Given
    const events: string[] = [];
    const anchor = createFakeAnchor(events);
    const revokedUrls: string[] = [];

    // When / Then
    assert.throws(
      () =>
        downloadTextFile(
          {
            text: "Space 1 쌓는 순서",
            filename: "append-failure.txt"
          },
          {
            Blob: FakeBlob,
            URL: {
              createObjectURL: () => "blob://append-failure",
              revokeObjectURL: (url) => {
                revokedUrls.push(url);
              }
            },
            document: {
              body: {
                appendChild: () => {
                  events.push("append");
                  throw new Error("append blocked");
                }
              },
              createElement: () => anchor
            }
          }
        ),
      /append blocked/
    );
    assert.deepEqual(events, ["append", "remove"]);
    assert.deepEqual(revokedUrls, ["blob://append-failure"]);
  });
});

function createFakeAnchor(events: string[], options: { clickThrows?: boolean } = {}) {
  return {
    href: "",
    download: "",
    click: () => {
      events.push("click");

      if (options.clickThrows) {
        throw new Error("download blocked");
      }
    },
    remove: () => {
      events.push("remove");
    }
  };
}
