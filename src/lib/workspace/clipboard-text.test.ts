import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { writeClipboardText } from "./clipboard-text";

describe("clipboard-text", () => {
  it("Clipboard API가 있으면 writeText로 텍스트를 복사한다", async () => {
    // Given
    const writes: string[] = [];

    // When
    await writeClipboardText("Space 1 쌓는 순서", {
      navigator: {
        clipboard: {
          writeText: async (text) => {
            writes.push(text);
          }
        }
      }
    });

    // Then
    assert.deepEqual(writes, ["Space 1 쌓는 순서"]);
  });

  it("Clipboard API가 없으면 textarea와 execCommand 폴백으로 복사한다", async () => {
    // Given
    const commands: string[] = [];
    const appendedValues: string[] = [];
    let removed = false;

    // When
    await writeClipboardText("1층: 바닥 박스", {
      document: {
        body: {
          appendChild: (node) => {
            appendedValues.push(node.value);
          }
        },
        createElement: () => ({
          value: "",
          style: {},
          setAttribute: () => undefined,
          focus: () => undefined,
          select: () => undefined,
          remove: () => {
            removed = true;
          }
        }),
        execCommand: (command) => {
          commands.push(command);
          return true;
        }
      }
    });

    // Then
    assert.deepEqual(appendedValues, ["1층: 바닥 박스"]);
    assert.deepEqual(commands, ["copy"]);
    assert.equal(removed, true);
  });

  it("복사 폴백이 실패해도 임시 textarea를 제거한다", async () => {
    // Given
    let removed = false;

    // When / Then
    await assert.rejects(
      () =>
        writeClipboardText("복사 실패 케이스", {
          document: {
            body: {
              appendChild: () => undefined
            },
            createElement: () => ({
              value: "",
              style: {},
              setAttribute: () => undefined,
              focus: () => undefined,
              select: () => undefined,
              remove: () => {
                removed = true;
              }
            }),
            execCommand: () => false
          }
        }),
      /클립보드 복사에 실패했습니다/
    );
    assert.equal(removed, true);
  });
});
