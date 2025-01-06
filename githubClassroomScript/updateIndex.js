const fs = require("fs");
const path = require("path");

const INDEX_FILE = "styles/index.js";


/**
 * Reads the styles array from a given index.js file.
 */
const readStylesFromFile = (filePath) => {
  const absolutePath = path.resolve(filePath);
  console.log('Looking here: ',absolutePath);
  if (!fs.existsSync(filePath)) {
    console.log('File not found, starting fresh');
    return [];
  }
  const content = fs.readFileSync(filePath, "utf8");
  console.log('Read content:',content.substring(0,100));
  try {
    const match = content.match(/const styles\s*=\s*([\s\S]*?);/);
    if (match && match[1]) {
      const parsedStyles = JSON.parse(match[1]);
      return parsedStyles;
    } else {
      console.error(`Error parsing styles from ${filePath}`);
      return [];
    }
  } catch (error) {
    console.error(`Error reading styles from ${filePath}:`, error.message);
    return [];
  }
};

/**
 * Writes the styles array to a given index.js file.
 */
const writeStylesToFile = (styles, filePath) => {
  console.log('Writing style to ',filePath);
  const absolutePath = path.resolve(filePath);
  console.log('absolute path: ',absolutePath);
  const content = `const styles = ${JSON.stringify(styles, null, 2)};\nexports.styles = styles;`;
  fs.writeFileSync(filePath, content);
};

/**
 * Merges styles into a target file.
 */
const mergeStyles = (newStyles, targetFile) => {
  const existingStyles = readStylesFromFile(targetFile);
  const existingPaths = new Set(existingStyles.map((style) => style.path));
  console.log('We have read the existing styles from the file',existingStyles.length,'in number');

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
  console.log('After merge we have',mergedStyles.length,'in number');

  writeStylesToFile(mergedStyles, targetFile);
  console.log(`Styles merged into ${targetFile}`);
};

/**
 * Backup the index.js file by copying it with a timestamp.
 */
const backupFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    console.log(`No existing ${filePath} found to back up.`);
    return;
  }

  const dir = path.dirname(filePath);
  const baseName = path.basename(filePath, ".js");
  const backupFileName = `${baseName}_backup_${new Date().toISOString().replace(/[:.]/g, "-")}.js`;
  const backupPath = path.join(dir, backupFileName);

  fs.copyFileSync(filePath, backupPath);
  console.log(`Backup created: ${backupPath}`);
};

/**
 * Merges styles into the local index.js file.
 * Before merging, creates a backup of the existing file.
 */
const addStyles = (newStyles) => {
  // Create a backup before modifying the file
  backupFile(INDEX_FILE);

  // Merge the new styles into the existing ones
  mergeStyles(newStyles, INDEX_FILE);
};


module.exports = { mergeStyles, addStyles  };