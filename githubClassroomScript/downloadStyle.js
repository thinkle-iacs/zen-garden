const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const https = require("https");
const { githubFetch } = require("./utils");

/**
 * Downloads a file from a given URL and saves it to a specified path.
 */
const downloadExternalFile = async (url, targetPath) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(targetPath);
    https
      .get(url, (response) => {
        if (response.statusCode === 200) {
          response.pipe(file);
          file.on("finish", () => {
            file.close(resolve);
          });
        } else {
          reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        }
      })
      .on("error", (err) => {
        reject(new Error(`Error fetching ${url}: ${err.message}`));
      });
  });
};

/**
 * Sanitizes filenames by truncating or hashing long names.
 */
const sanitizeFilename = (url) => {
  const maxFilenameLength = 255; // Safe limit for most file systems
  const baseName = path.basename(url);
  if (baseName.length <= maxFilenameLength) return baseName;

  // Use a hash for long filenames
  const hash = crypto.createHash("md5").update(url).digest("hex");
  const extension = path.extname(baseName);
  return `${hash}${extension}`;
};

/**
 * Process a CSS file:
 * - Find assets referenced in `url(...)`.
 * - Download assets from the GitHub repo or external sources.
 * - Update CSS to point to locally downloaded assets with proper paths.
 * - Save the modified CSS file to the target directory.
 */
const downloadStyle = async (owner, repo, styleFilePath, cssContent, targetDir, styleFolderName) => {
  try {
    console.log(`Processing style file: ${styleFilePath}`);

    // Find all `url(...)` references in the CSS
    const urlMatches = [...cssContent.matchAll(/url[("']([^)*]*)["')]/g)];
    let updatedCss = cssContent;

    for (const match of urlMatches) {
      const assetPath = match[1].trim();

      if (!assetPath) {
        console.log("Skipping empty URL.");
        continue;
      }

      const fileName = sanitizeFilename(assetPath);
      const localPath = `${targetDir}/${styleFolderName}/${fileName}`;
      const publicPath = `/styles/${styleFolderName}/${fileName}`;

      if (assetPath.startsWith("http://") || assetPath.startsWith("https://")) {
        // Skip Google Fonts URLs or similar
        if (assetPath.includes("fonts.googleapis.com")) {
          console.log(`Skipping non-savable URL: ${assetPath}`);
          continue;
        }

        // Handle external URLs
        console.log(`Downloading external asset: ${assetPath}`);
        try {
          fs.mkdirSync(`${targetDir}/${styleFolderName}`, { recursive: true });
          await downloadExternalFile(assetPath, localPath);
          updatedCss = updatedCss.replace(assetPath, publicPath);
        } catch (error) {
          console.error(`Failed to download external asset: ${assetPath}`, error.message);
        }
      } else {
        // Handle internal GitHub repo assets
        const cssDir = path.dirname(styleFilePath);
        const resolvedPath = path.join(cssDir, assetPath).replace(/\\/g, "/");

        console.log(`Fetching internal asset: ${resolvedPath}`);
        try {
          const fileContent = await githubFetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${resolvedPath}`
          );

          // Decode base64 content returned by GitHub API
          const decodedContent = Buffer.from(fileContent.content, "base64");
          fs.mkdirSync(`${targetDir}/${styleFolderName}`, { recursive: true });
          fs.writeFileSync(localPath, decodedContent);

          updatedCss = updatedCss.replace(assetPath, publicPath);
        } catch (error) {
          console.error(`Failed to fetch internal asset: ${resolvedPath}`, error.message);
        }
      }
    }

    // Save the updated CSS file
    const cssFileName = path.basename(styleFilePath);
    const outputPath = `${targetDir}/${styleFolderName}/${cssFileName}`;
    fs.writeFileSync(outputPath, updatedCss);

    console.log(`Updated CSS saved to: ${outputPath}`);
  } catch (error) {
    console.error(`Error processing style file: ${styleFilePath}`, error.message);
  }
};
module.exports = { downloadStyle };