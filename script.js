const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const inputDirectory = "./input"; // Directory containing
const outputDirectory = "./output"; // Directory to store compressed

// Ensure output directory exists
if (!fs.existsSync(outputDirectory)) {
  fs.mkdirSync(outputDirectory);
}

// Function to delete and recreate the input directory
const cleanupInputDirectory = () => {
  fs.rmdir(inputDirectory, { recursive: true }, (err) => {
    if (err) {
      console.error("Error deleting input directory:", err);
    } else {
      console.log("Input directory deleted successfully");
      fs.mkdirSync(inputDirectory);
      console.log("Input directory recreated");
    }
  });
};

// Read files from input directory
fs.readdir(inputDirectory, (err, files) => {
  if (err) {
    console.error("Error reading input directory:", err);
    return;
  }

  if (files.length === 0) {
    cleanupInputDirectory();
    return;
  }

  let processedCount = 0;

  files.forEach((file) => {
    const inputFilePath = path.join(inputDirectory, file);
    const outputFilePath = path.join(
      outputDirectory,
      file.split(".")[0] + ".webp"
    );

    // Convert and compress image
    sharp(inputFilePath)
      .toFormat("webp", { quality: 100 }) // Change to { quality: 80 } for lossy compression
      .toFile(outputFilePath)
      .then(() => {
        console.log(`Converted ${file} to WebP`);
        processedCount++;

        // Check if all files are processed
        if (processedCount === files.length) {
          cleanupInputDirectory();
        }
      })
      .catch((err) => {
        console.error(`Error converting ${file}:`, err);
        processedCount++;

        // Check if all files are processed
        if (processedCount === files.length) {
          cleanupInputDirectory();
        }
      });
  });
});
