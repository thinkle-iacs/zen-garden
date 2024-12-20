const fs = require("fs");
const { githubFetch, readJsonFile, writeJsonFile } = require("./utils");
const { downloadStyle } = require("./downloadStyle");
const { addStyles } = require("./updateIndex");

const ASSIGNMENT_FILE = "githubClassroomScript/student_repos.json";
const STYLES_DIR = "styles";
const INDEX_FILE = `${STYLES_DIR}/index.js`;

// Define patterns for metadata extraction
const METADATA_PATTERNS = {
    designer: [/design by:/i, /author:/i, /by:/i],
    name: [/design name:/i, /title:/i, /design:/i],
  };
  
  const extractMetadata = (cssContent, githubUsername) => {
    const metadata = {
      designer: githubUsername,
      name: "Untitled Design",
    };
  
    for (const [key, patterns] of Object.entries(METADATA_PATTERNS)) {
      for (const pattern of patterns) {
        const match = cssContent.match(new RegExp(`${pattern.source}\\s*(.*)`, "i"));
        if (match && match[1]) {
          // Remove surrounding square brackets and trim whitespace
          metadata[key] = match[1].replace(/[\[\]]/g, "").trim();
          break;
        }
      }
    }
    if (metadata.name == 'your design name') {
        metadata.name = undefined;
    }
    if (metadata.designer == 'your name') {
        metadata.designer = undefined;
    }
  
    return metadata;
  };

const fetchProjects = async () => {
  try {
    const students = readJsonFile(ASSIGNMENT_FILE);
    const styles = [];

    for (const student of students) {
      console.log(`Processing ${student.student}...`);

      // Skip if already fetched and no updates
      if (student.fetched && !(await hasRepoUpdates(student))) {
        console.log(`No updates for ${student.student}`);
        continue;
      }

      const repoUrl = student.rootUrl.replace("https://github.com/", "");
      const [owner, repo] = repoUrl.split("/");

      console.log(`Fetching contents for ${repo}...`);
      const files = await githubFetch(`https://api.github.com/repos/${owner}/${repo}/contents`);

      for (const file of files) {
        if (file.name.endsWith(".css")) {
          console.log(`Found CSS file: ${file.name}`);

          // Check if the file has been modified
          const isModified = await hasFileBeenModified(owner, repo, file.path);
          if (!isModified) {
            console.log(`File ${file.name} is unchanged from the template. Skipping.`);
            continue;
          }

          console.log(`File ${file.name} has been modified. Fetching...`);
          const cssFileContent = await githubFetch(file.download_url);                    
          const metadata = extractMetadata(cssFileContent, student.student);

          const repoDir = `${STYLES_DIR}/${student.student}`;
          if (!fs.existsSync(repoDir)) fs.mkdirSync(repoDir, { recursive: true });
          const styleFilePath = `${file.path}`;
          await downloadStyle(owner, repo, styleFilePath, cssFileContent, STYLES_DIR, student.student);

          // Add entry to styles array
          styles.push({
            name: metadata.name || file.name.replace(".css", ""), // Use file name (without extension) as default name
            path: `${student.student}/${file.name}`,
            designer: metadata.designer || student.student,
            portfolio: student.rootUrl,
          });
        }
      }

      // Fetch the latest commit SHA and update student record
      const latestCommit = await getLatestCommitSha(owner, repo);
      student.fetched = true;
      student.fetchedAsOf = latestCommit;
    }

    // Write updated student records to file
    writeJsonFile(ASSIGNMENT_FILE, students);

    // Write the index.js file
    addStyles(styles);

    console.log("All projects fetched and updated!");
    console.log(`Styles index written to ${INDEX_FILE}`);
  } catch (error) {
    console.error("Error fetching projects:", error.message);
  }
};

/**
 * Check if the repository has updates since the last fetch.
 */
const hasRepoUpdates = async (student) => {
  const repoUrl = student.rootUrl.replace("https://github.com/", "");
  const [owner, repo] = repoUrl.split("/");

  const latestCommit = await getLatestCommitSha(owner, repo);
  return student.fetchedAsOf !== latestCommit;
};

/**
 * Fetch the latest commit SHA for a repository.
 */
const getLatestCommitSha = async (owner, repo) => {
  try {
    const commits = await githubFetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`);
    return commits[0]?.sha || null;
  } catch (error) {
    console.error(`Error fetching commits for ${owner}/${repo}:`, error.message);
    return null;
  }
};

/**
 * Check if a file has been modified since its initial commit.
 */
const hasFileBeenModified = async (owner, repo, filePath) => {
  try {
    const commits = await githubFetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?path=${filePath}`
    );
    return commits.length > 1; // If more than one commit, it's been modified
  } catch (error) {
    console.error(`Error checking file commits for ${owner}/${repo}/${filePath}:`, error.message);
    return false;
  }
};

module.exports = { fetchProjects };