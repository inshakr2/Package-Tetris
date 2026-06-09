interface TextFileDownloadInput {
  filename: string;
  text: string;
}

interface TextFileAnchor {
  download: string;
  href: string;
  click: () => void;
  remove?: () => void;
}

interface TextFileDownloadDocument {
  body: {
    appendChild: (node: TextFileAnchor) => void;
    removeChild?: (node: TextFileAnchor) => void;
  };
  createElement: (tagName: "a") => TextFileAnchor;
}

interface TextFileDownloadEnvironment {
  Blob?: new (parts: string[], options: { type: string }) => unknown;
  URL?: {
    createObjectURL: (blob: unknown) => string;
    revokeObjectURL: (url: string) => void;
  };
  document?: TextFileDownloadDocument;
}

export function downloadTextFile(
  { filename, text }: TextFileDownloadInput,
  environment: TextFileDownloadEnvironment = getBrowserTextFileDownloadEnvironment()
): void {
  if (!environment.Blob || !environment.URL || !environment.document) {
    throw new Error("작업 지시서 파일을 만들 수 없습니다.");
  }

  const blob = new environment.Blob([text], { type: "text/plain;charset=utf-8" });
  const url = environment.URL.createObjectURL(blob);
  const anchor = environment.document.createElement("a");
  anchor.href = url;
  anchor.download = filename;

  try {
    environment.document.body.appendChild(anchor);
    anchor.click();
  } finally {
    if (anchor.remove) {
      anchor.remove();
    } else {
      environment.document.body.removeChild?.(anchor);
    }

    environment.URL.revokeObjectURL(url);
  }
}

function getBrowserTextFileDownloadEnvironment(): TextFileDownloadEnvironment {
  const globalScope = globalThis as typeof globalThis & TextFileDownloadEnvironment;

  return {
    Blob: globalScope.Blob,
    URL: globalScope.URL,
    document: globalScope.document
  };
}
