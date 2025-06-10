# Mount Mate

A developer tool that simplifies creating WebContainer mount objects for StackBlitz's WebContainer API.

## Overview

Mount Mate automates the creation of file structure objects required by StackBlitz's WebContainer `.mount()` method. Upload your project folder and get a properly formatted mount object without manually constructing nested JSON structures.

## The Problem

WebContainers require a specific file structure format:

```javascript
const files = {
  'package.json': {
    file: {
      contents: '{"name": "project", ...}'
    }
  },
  'src': {
    directory: {
      'index.js': {
        file: {
          contents: 'console.log("Hello World");'
        }
      }
    }
  }
};

await webcontainerInstance.mount(files);
```

Creating this structure manually for complex projects is tedious and error-prone.

## The Solution

Mount Mate streamlines this by:

- **Folder Upload**: Drag-and-drop your project folder
- **Automatic Analysis**: Recursively scans all files and directories
- **Structure Generation**: Creates the WebContainer-compatible mount object
- **Export**: Copy or Download structured object

## Features

- Clean interface built with React and Tailwind CSS
- Ignores build files and packages
- Well and proper structured format
- Error handling for unsupported file types
- Full TypeScript support with proper type definitions

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and builds
- **Tailwind CSS** for styling
- **File System APIs** for file processing

## Getting Started

```bash
# Clone the repository
git clone https://github.com/buggy-bits/mount-mate.git

# Install dependencies
cd mount-mate && npm install

# Start development server
npm run dev
```

Open `http://localhost:5173` and start uploading your project folders.

## Contributing

Contributions are welcome. Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/feature-name`)
3. Follow existing TypeScript and React patterns
4. Submit a pull request with clear description

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- [StackBlitz](https://stackblitz.com/) for WebContainers
- [Vite](https://vitejs.dev/) for build tooling
- [Tailwind CSS](https://tailwindcss.com/) for styling

---

**Mount Mate** - Simplifying WebContainer integration.