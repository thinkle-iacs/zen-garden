const fs = require("fs");
const path = require("path");

const INDEX_FILE = "styles/index.js";


/**
 * Reads the styles array from a given index.js file.
 */
const readStylesFromFile = (filePath) => {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf8");
  try {
    const match = content.match(/const styles = ([\s\S]*?);/);
    return match ? JSON.parse(match[1]) : [];
  } catch (error) {
    console.error(`Error reading styles from ${filePath}:`, error.message);
    return [];
  }
};

/**
 * Writes the styles array to a given index.js file.
 */
const writeStylesToFile = (styles, filePath) => {
  const content = `const styles = ${JSON.stringify(styles, null, 2)};\nexports.styles = styles;`;
  fs.writeFileSync(filePath, content);
};

/**
 * Merges styles into a target file.
 */
const mergeStyles = (newStyles, targetFile) => {
  const existingStyles = readStylesFromFile(targetFile);
  const existingPaths = new Set(existingStyles.map((style) => style.path));

  const mergedStyles = [...existingStyles];

  for (const newStyle of newStyles) {
    if (!existingPaths.has(newStyle.path)) {
      mergedStyles.push(newStyle);
    } else {
      // Update existing entry if present
      const index = mergedStyles.findIndex((style) => style.path === newStyle.path);
      mergedStyles[index] = { ...mergedStyles[index], ...newStyle };
    }
  }

  writeStylesToFile(mergedStyles, targetFile);
  console.log(`Styles merged into ${targetFile}`);
};

/**
 * Merges styles into the local index.js file.
 */
const addStyles = (newStyles) => {
  mergeStyles(newStyles, INDEX_FILE);
};

module.exports = { mergeStyles, addStyles  };