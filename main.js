const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: false, // Allow file access
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'default',
    show: false
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('convert-images-from-buffer', async (event, fileData, config) => {
  console.log('Received buffer conversion request for', fileData.length, 'files');
  const results = [];
  const outputDir = path.join(__dirname, 'output');

  // Ensure output directory exists
  try {
    await fs.mkdir(outputDir, { recursive: true });
    // Create metadata directory for storing file size info
    const metadataDir = path.join(outputDir, '.metadata');
    await fs.mkdir(metadataDir, { recursive: true });
  } catch (error) {
    console.error('Error creating directories:', error);
  }

  config = config || {};

  for (const file of fileData) {
    try {
      const nameWithoutExt = path.parse(file.name).name;
      const outputPath = path.join(outputDir, `${nameWithoutExt}.webp`);

      // Build WebP options based on config
      const webpOptions = {
        effort: typeof config.effort === 'number' ? config.effort : 4,
        smartSubsample: config.smartSubsample !== false
      };

      // Set quality and compression type
      if (config.compressionType === 'lossless') {
        webpOptions.lossless = true;
      } else {
        webpOptions.quality = typeof config.quality === 'number' ? config.quality : 90;
      }

      // Alpha quality
      if (config.alphaQuality) {
        webpOptions.alphaQuality = typeof config.quality === 'number' ? config.quality : 90;
      }

      console.log(`Converting ${file.name} from buffer with options:`, webpOptions);

      await sharp(Buffer.from(file.buffer))
        .toFormat('webp', webpOptions)
        .toFile(outputPath);

      // Store original size in a metadata file (in hidden .metadata folder)
      const metadataDir = path.join(outputDir, '.metadata');
      const metadataPath = path.join(metadataDir, `${nameWithoutExt}.meta.json`);
      await fs.writeFile(metadataPath, JSON.stringify({
        originalName: file.name,
        originalSize: file.originalSize,
        convertedAt: new Date().toISOString()
      }));

      results.push({
        success: true,
        original: file.name,
        output: `${nameWithoutExt}.webp`,
        outputPath: outputPath,
        originalSize: file.originalSize
      });
    } catch (error) {
      console.error(`Error converting ${file.name}:`, error);
      results.push({
        success: false,
        original: file.name,
        error: error.message
      });
    }
  }

  console.log('Buffer conversion results:', results);
  return results;
});

// IPC handlers
ipcMain.handle('convert-images', async (event, filePaths, config) => {
  console.log('Received conversion request:', { filePaths, config });
  const results = [];
  const inputDir = path.join(__dirname, 'input');
  const outputDir = path.join(__dirname, 'output');

  // Ensure directories exist
  try {
    await fs.mkdir(inputDir, { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });
  } catch (error) {
    console.error('Error creating directories:', error);
  }

  config = config || {};
  if (!Array.isArray(filePaths)) {
    console.error('filePaths is not an array:', filePaths);
    return [];
  }

  for (const filePath of filePaths) {
    if (!filePath || typeof filePath !== 'string') {
      console.error('Invalid file path:', filePath);
      results.push({ success: false, original: String(filePath || 'undefined'), error: 'Invalid file path' });
      continue;
    }
    try {
      const fileName = path.basename(filePath);
      const nameWithoutExt = path.parse(fileName).name;
      const outputPath = path.join(outputDir, `${nameWithoutExt}.webp`);

      // Get original file size
      const originalStats = await fs.stat(filePath);
      const originalSize = originalStats.size;

      // Build WebP options based on config
      const webpOptions = {
        effort: typeof config.effort === 'number' ? config.effort : 4,
        smartSubsample: config.smartSubsample !== false
      };

      // Set quality and compression type
      if (config.compressionType === 'lossless') {
        webpOptions.lossless = true;
      } else {
        webpOptions.quality = typeof config.quality === 'number' ? config.quality : 90;
      }

      // Alpha quality
      if (config.alphaQuality) {
        webpOptions.alphaQuality = typeof config.quality === 'number' ? config.quality : 90;
      }

      console.log(`Converting ${filePath} with options:`, webpOptions);

      await sharp(filePath)
        .toFormat('webp', webpOptions)
        .toFile(outputPath);

      // Store original size in a metadata file (in hidden .metadata folder)
      const metadataDir = path.join(outputDir, '.metadata');
      await fs.mkdir(metadataDir, { recursive: true });
      const metadataPath = path.join(metadataDir, `${nameWithoutExt}.meta.json`);
      await fs.writeFile(metadataPath, JSON.stringify({
        originalName: fileName,
        originalSize: originalSize,
        convertedAt: new Date().toISOString()
      }));

      results.push({
        success: true,
        original: fileName,
        output: `${nameWithoutExt}.webp`,
        outputPath: outputPath,
        originalSize: originalSize
      });
    } catch (error) {
      console.error(`Error converting ${filePath}:`, error);
      results.push({
        success: false,
        original: path.basename(filePath),
        error: error.message
      });
    }
  }

  console.log('Conversion results:', results);
  return results;
});

ipcMain.handle('get-converted-images', async () => {
  const outputDir = path.join(__dirname, 'output');

  try {
    const files = await fs.readdir(outputDir);
    const imageFiles = files.filter(file => file.endsWith('.webp'));

    const imagesWithStats = await Promise.all(
      imageFiles.map(async (file) => {
        const filePath = path.join(outputDir, file);
        const stats = await fs.stat(filePath);

        // Try to read original size from metadata (from .metadata folder)
        const nameWithoutExt = path.parse(file).name;
        const metadataDir = path.join(outputDir, '.metadata');
        const metadataPath = path.join(metadataDir, `${nameWithoutExt}.meta.json`);
        let originalSize = null;

        try {
          const metadataContent = await fs.readFile(metadataPath, 'utf8');
          const metadata = JSON.parse(metadataContent);
          originalSize = metadata.originalSize;
        } catch (error) {
          // No metadata file or invalid JSON, original size unknown
          console.log(`No metadata found for ${file}`);
        }

        return {
          name: file,
          path: filePath,
          size: stats.size,
          created: stats.birthtime,
          originalSize: originalSize
        };
      })
    );

    return imagesWithStats.sort((a, b) => b.created - a.created);
  } catch (error) {
    console.error('Error reading output directory:', error);
    return [];
  }
});

ipcMain.handle('open-output-folder', async () => {
  const outputDir = path.join(__dirname, 'output');

  try {
    await fs.mkdir(outputDir, { recursive: true });
    shell.showItemInFolder(outputDir);
  } catch (error) {
    console.error('Error opening output folder:', error);
  }
});

ipcMain.handle('delete-converted-image', async (event, filePath) => {
  try {
    await fs.unlink(filePath);

    // Also delete metadata file if it exists (from .metadata folder)
    const nameWithoutExt = path.parse(path.basename(filePath)).name;
    const outputDir = path.dirname(filePath);
    const metadataDir = path.join(outputDir, '.metadata');
    const metadataPath = path.join(metadataDir, `${nameWithoutExt}.meta.json`);

    try {
      await fs.unlink(metadataPath);
      console.log('Deleted metadata file:', metadataPath);
    } catch (error) {
      // Metadata file might not exist, that's okay
      console.log('No metadata file to delete for:', filePath);
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting file:', error);
    return { success: false, error: error.message };
  }
});
