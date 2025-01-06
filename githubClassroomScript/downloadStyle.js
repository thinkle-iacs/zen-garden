const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const https = require("https");
const { githubFetch } = require("./utils");
const mime = require("mime-types");

/**
 * Downloads a file from a given URL and saves it to a specified path.
 */
const downloadExternalFile = async (url, targetPath) => {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode === 200) {
          // Determine file extension from Content-Type if not present
          const contentType = response.headers["content-type"];
          const sanitizedFileName = sanitizeFilename(url, contentType); // Use sanitizeFilename for consistency
          const adjustedPath = path.join(path.dirname(targetPath), sanitizedFileName);

          console.log(`Downloading external file to: ${adjustedPath}`); // Debugging log

          const file = fs.createWriteStream(adjustedPath);
          response.pipe(file);
          file.on("finish", () => {
            file.close(() => resolve(sanitizedFileName));
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
const sanitizeFilename = (url, contentType = null) => {
  const maxFilenameLength = 255; // Safe limit for most file systems
  const urlPath = url.split("?")[0]; // Remove query parameters
  let baseName = path.basename(urlPath);

  // Generate a random salt for uniqueness
  //const SALT = crypto.randomBytes(2).toString("hex");
  //baseName = baseName[0] + SALT + baseName.substring(1);

  // If the file has no extension, infer it from the Content-Type
  if (!path.extname(baseName) && contentType) {
    const extension = mime.extension(contentType) || 'bin';
    if (extension) baseName += `.${extension}`;
  }

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

    // Cache for already processed URLs
    const processedUrls = new Set();

    // Find all `url(...)` references in the CSS
    const urlMatches = [...cssContent.matchAll(/url\((["']?)(.+?)\1\)/g)];
    let updatedCss = cssContent;

    for (const match of urlMatches) {
      let assetPath = match[2].trim(); // Correct group to match URL content
      assetPath = assetPath.replace(/\\(.)/g, "$1"); // Unescape

      console.log("Processing asset at:", assetPath);

      if (!assetPath) {
        console.log("Skipping empty URL.");
        continue;
      }

      // Skip already processed URLs
      if (processedUrls.has(assetPath)) {
        console.log(`Skipping already-processed asset: ${assetPath}`);
        continue;
      }

      // Add to processed cache
      processedUrls.add(assetPath);

      const sanitizedFileName = sanitizeFilename(assetPath);
      const localPath = `${targetDir}/${styleFolderName}/${sanitizedFileName}`;
      const publicPath = `/styles/${styleFolderName}/${sanitizedFileName}`;

      if (assetPath.startsWith("http://") || assetPath.startsWith("https://")) {
        // Skip Google Fonts URLs or similar
        if (assetPath.includes("fonts.googleapis.com")) {
          console.log(`Skipping non-savable URL: ${assetPath}`);
          continue;
        }

        console.log(`Downloading external asset: ${assetPath}`);
        try {
          fs.mkdirSync(`${targetDir}/${styleFolderName}`, { recursive: true });
          const downloadedFileName = await downloadExternalFile(assetPath, localPath);
          const adjustedPublicPath = `/styles/${styleFolderName}/${downloadedFileName}`;
          updatedCss = updatedCss.replaceAll(assetPath, adjustedPublicPath);
          console.log("Replaced", assetPath, "with", adjustedPublicPath);
        } catch (error) {
          console.error(`Failed to download external asset: ${assetPath}`, error.message);
        }
      } else {
        // Handle internal GitHub repo assets
        if (assetPath.startsWith(`/styles/${styleFolderName}/`)) {
          console.log(`Skipping already-processed URL: ${assetPath}`);
          continue;
        }

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

          updatedCss = updatedCss.replaceAll(assetPath, publicPath);
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