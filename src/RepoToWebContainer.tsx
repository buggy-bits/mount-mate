import React, { useState } from "react";
import { Upload, Download, FileText, Folder, Copy, Check } from "lucide-react";

interface FileItem {
  path: string;
  content: string;
  size: number;
  type: "file";
}

interface WebContainerFile {
  file: {
    contents: string;
  };
}

interface WebContainerDirectory {
  directory: {
    [key: string]: WebContainerFile | WebContainerDirectory;
  };
}

interface WebContainerStructure {
  [key: string]: WebContainerFile | WebContainerDirectory;
}

const RepoToWebContainer: React.FC = () => {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [webContainerCode, setWebContainerCode] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const handleDrag = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (
    e: React.DragEvent<HTMLDivElement>
  ): Promise<void> => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const items = e.dataTransfer.items;
    const fileList: FileItem[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file") {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          await processEntry(entry, fileList);
        }
      }
    }

    setFiles(fileList);
    generateWebContainerCode(fileList);
  };

  const processEntry = async (
    entry: FileSystemEntry,
    fileList: FileItem[],
    path: string = ""
  ): Promise<void> => {
    const fullPath = path + entry.name;

    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry;
      const file = await new Promise<File>((resolve) => {
        fileEntry.file(resolve);
      });

      // Skip certain files/directories
      if (shouldSkipFile(fullPath)) {
        return;
      }

      const content = await readFileContent(file);
      fileList.push({
        path: fullPath,
        content: content,
        size: file.size,
        type: "file",
      });
    } else if (entry.isDirectory) {
      // Skip certain directories
      if (shouldSkipDirectory(entry.name)) {
        return;
      }

      const dirEntry = entry as FileSystemDirectoryEntry;
      const reader = dirEntry.createReader();
      const entries = await new Promise<FileSystemEntry[]>((resolve) => {
        reader.readEntries(resolve);
      });

      for (const childEntry of entries) {
        await processEntry(childEntry, fileList, fullPath + "/");
      }
    }
  };

  const shouldSkipFile = (path: string): boolean => {
    const skipPatterns = [
      /node_modules/,
      /\.git/,
      /dist/,
      /build/,
      /\.DS_Store/,
      /\.env(\..*)?/,
      /coverage/,
      /\.nyc_output/,
      /\.cache/,
      /\.vscode/,
      /\.idea/,
      /thumbs\.db/i,
      /ehthumbs\.db/i,
      /desktop\.ini/i,
      /package-lock\.json/,
      /yarn\.lock/,
      /pnpm-lock\.yaml/,
      /\.lock$/,
      /\.log$/,
      /\.editorconfig/,

      // /\.eslintcache/,
      // /\.npm/,
      // /\.npmrc/,
      // /\.nvmrc/,
      // /\.babelrc(\.js)?/,
      // /babel\.config\.js/,
      // /\.prettierrc(\..*)?/,
      // /\.prettierignore/,
      // /\.history/,
      // /\.next/,
      // /\.nuxt/,
      // /\.expo/,
      // /out/,
      // /public\/static/,
      // /\.tmp/,
      // /tmp/,
      // /temp/,
      // /\.jest/,
      // /test-results/,
      // /cypress\/videos/,
      // /cypress\/screenshots/,
      // /\.firebase/,
      // /\.local/,
      // /\.pnp(\.js)?/,
      // /\.tsbuildinfo/,
      // /\.sublime-(workspace|project)$/,
      // /\.Trash-.*/,
    ];

    return skipPatterns.some((pattern) => pattern.test(path));
  };

  const shouldSkipDirectory = (name: string): boolean => {
    const skipDirs: string[] = [
      "node_modules",
      ".git",
      "dist",
      "build",
      ".vscode",
      ".idea",
      "coverage",
      ".nyc_output",
      ".cache",
    ];
    return skipDirs.includes(name);
  };

  const readFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        resolve((e.target?.result as string) || "");
      };
      reader.onerror = () => {
        resolve(""); // Return empty string on error
      };
      reader.readAsText(file);
    });
  };

  const generateWebContainerCode = (fileList: FileItem[]): void => {
    setIsProcessing(true);

    // Build the nested structure
    const structure: WebContainerStructure = {};

    fileList.forEach((file) => {
      const parts = file.path.split("/");
      let current: any = structure;

      // Navigate through the path, creating directories as needed
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) {
          current[part] = {
            directory: {},
          };
        }
        // Move into the directory's contents
        current = current[part].directory;
      }

      // Add the file at the final location
      const fileName = parts[parts.length - 1];
      current[fileName] = {
        file: {
          contents: file.content,
        },
      };
    });

const firstKey = Object.keys(structure)[0];
let JSONstructrue: any = undefined;
if (
  firstKey &&
  structure[firstKey] &&
  "directory" in structure[firstKey]
) {
  const dir = structure[firstKey] as WebContainerDirectory;
  const secondKey = Object.keys(dir.directory)[0];
  if (secondKey) {
    JSONstructrue = dir.directory;
  }
}

// const JSONstructrue = structure[Object.keys(structure)[0]][Object.keys(structure[Object.keys(structure)[0]])[0]]
    const code = `const files = ${JSON.stringify(JSONstructrue, null, 2 )};

// Mount to webcontainer 
await webcontainerInstance.mount(files);`;

    setWebContainerCode(code);
    setIsProcessing(false);
  };

  const handleFileInput = async (
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const selectedFiles = Array.from(e.target.files || []);
    const fileList: FileItem[] = [];

    for (const file of selectedFiles) {
      if (shouldSkipFile((file as any).webkitRelativePath || file.name)) {
        continue;
      }

      const content = await readFileContent(file);
      fileList.push({
        path: (file as any).webkitRelativePath || file.name,
        content: content,
        size: file.size,
        type: "file",
      });
    }
    console.log("Selected files:", fileList);
    setFiles(fileList);
    generateWebContainerCode(fileList);
  };

  const copyToClipboard = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(webContainerCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const downloadCode = (): void => {
    const blob = new Blob([webContainerCode], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "webcontainer-files.js";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Repository to WebContainer Converter
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Drop your repository folder or select files to automatically
            generate WebContainer-compatible file structure
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Upload className="text-blue-600" />
              Upload Repository
            </h2>

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Folder className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">
                Drag and drop your repository folder here
              </p>
              <p className="text-sm text-gray-500 mb-4">or</p>
              <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
                <FileText className="mr-2 h-4 w-4" />
                Select Files
                <input
                  type="file"
                  multiple
                  {...({ webkitdirectory: "" } as any)}
                  className="hidden"
                  onChange={handleFileInput}
                />
              </label>
            </div>

            {files.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-3">
                  Processed Files ({files.length})
                </h3>
                <div className="max-h-48 overflow-y-auto bg-gray-50 rounded-lg p-3">
                  {files.slice(0, 10).map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 py-1 text-sm"
                    >
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="truncate">{file.path}</span>
                      <span className="text-gray-400 ml-auto">
                        {(file.size / 1024).toFixed(1)}KB
                      </span>
                    </div>
                  ))}
                  {files.length > 10 && (
                    <div className="text-center text-gray-500 mt-2">
                      ... and {files.length - 10} more files
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Generated Code Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <FileText className="text-green-600" />
              Generated WebContainer Code
            </h2>

            {isProcessing ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Processing files...</span>
              </div>
            ) : webContainerCode ? (
              <div>
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copied ? "Copied!" : "Copy Code"}
                  </button>
                  <button
                    onClick={downloadCode}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                </div>

                <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-96">
                  <pre className="text-green-400 text-sm whitespace-pre-wrap">
                    {webContainerCode}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Upload files to generate WebContainer code</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4">How to Use</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h4 className="font-semibold mb-2">Upload Repository</h4>
              <p className="text-gray-600">
                Drag and drop your repo folder or select files
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <span className="text-green-600 font-bold">2</span>
              </div>
              <h4 className="font-semibold mb-2">Auto-Generate Code</h4>
              <p className="text-gray-600">
                Code is automatically generated with proper structure
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <span className="text-purple-600 font-bold">3</span>
              </div>
              <h4 className="font-semibold mb-2">Copy & Use</h4>
              <p className="text-gray-600">
                Copy the code and use it with WebContainer
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepoToWebContainer;