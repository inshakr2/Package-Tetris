interface ClipboardTextNavigator {
  clipboard?: {
    writeText: (text: string) => Promise<void>;
  };
}

interface ClipboardTextArea {
  value: string;
  style: Record<string, string>;
  setAttribute: (name: string, value: string) => void;
  focus: () => void;
  select: () => void;
  remove?: () => void;
}

interface ClipboardTextDocument {
  body: {
    appendChild: (node: ClipboardTextArea) => void;
    removeChild?: (node: ClipboardTextArea) => void;
  };
  createElement: (tagName: "textarea") => ClipboardTextArea;
  execCommand?: (command: "copy") => boolean;
}

interface ClipboardTextEnvironment {
  navigator?: ClipboardTextNavigator;
  document?: ClipboardTextDocument;
}

export async function writeClipboardText(
  text: string,
  environment: ClipboardTextEnvironment = getBrowserClipboardEnvironment()
): Promise<void> {
  if (environment.navigator?.clipboard?.writeText) {
    await environment.navigator.clipboard.writeText(text);
    return;
  }

  copyTextWithTextareaFallback(text, environment.document);
}

function copyTextWithTextareaFallback(text: string, documentRef: ClipboardTextDocument | undefined) {
  if (!documentRef?.execCommand) {
    throw new Error("클립보드 복사에 실패했습니다.");
  }

  const textarea = documentRef.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";

  documentRef.body.appendChild(textarea);

  try {
    textarea.focus();
    textarea.select();

    if (!documentRef.execCommand("copy")) {
      throw new Error("클립보드 복사에 실패했습니다.");
    }
  } finally {
    if (textarea.remove) {
      textarea.remove();
    } else {
      documentRef.body.removeChild?.(textarea);
    }
  }
}

function getBrowserClipboardEnvironment(): ClipboardTextEnvironment {
  const globalScope = globalThis as typeof globalThis & ClipboardTextEnvironment;

  return {
    navigator: globalScope.navigator,
    document: globalScope.document
  };
}
