const inquirer = require("inquirer");
const fs = require("fs");
const prompt = inquirer.default.prompt;
require("dotenv").config();
console.log('prompt=', prompt);
const CACHE_FILE = ".cache";

// Helper to make authenticated requests
const githubFetch = async (url) => {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }

  return response.json();
};

// Step 0: Check for cached classroom/assignment
const getCachedChoice = () => {
  if (fs.existsSync(CACHE_FILE)) {
    const cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
    return cache;
  }
  return null;
};

const saveToCache = (data) => {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
};

// Step 1: Fetch classrooms and let the user select one
const fetchClassrooms = async () => {
  const url = "https://api.github.com/classrooms";
  const classrooms = await githubFetch(url);

  const choices = classrooms.map((classroom) => ({
    name: classroom.name,
    value: classroom.id,
  }));

  const { selectedClassroom } = await prompt([
    {
      type: "list",
      name: "selectedClassroom",
      message: "Select a classroom:",
      choices,
    },
  ]);

  return selectedClassroom;
};

// Step 2: Fetch assignments for the selected classroom
const fetchAssignments = async (classroomId) => {
  const url = `https://api.github.com/classrooms/${classroomId}/assignments`;
  const assignments = await githubFetch(url);

  const choices = assignments.map((assignment) => ({
    name: assignment.title,
    value: assignment.id,
  }));

  const { selectedAssignment } = await prompt([
    {
      type: "list",
      name: "selectedAssignment",
      message: "Select an assignment:",
      choices,
    },
  ]);

  return selectedAssignment;
};

// Step 4: Fetch accepted assignments for the selected assignment
const fetchAcceptedAssignments = async (assignmentId) => {
  const url = `https://api.github.com/assignments/${assignmentId}/accepted_assignments`;
  const acceptedAssignments = await githubFetch(url);

  console.log("Accepted Assignments:");
  console.log(JSON.stringify(acceptedAssignments, null, 2));
};

// Main function
const main = async () => {
  try {
    // Step 0: Check cache
    let cache = getCachedChoice();

    if (cache) {
      const { useCache } = await prompt([
        {
          type: "confirm",
          name: "useCache",
          message: `Use cached selection? (Classroom ID: ${cache.classroomId}, Assignment ID: ${cache.assignmentId})`,
          default: true,
        },
      ]);

      if (useCache) {
        await fetchAcceptedAssignments(cache.assignmentId);
        return;
      }
    }

    // Step 1: Get classroom
    const classroomId = await fetchClassrooms();

    // Step 2: Get assignment
    const assignmentId = await fetchAssignments(classroomId);

    // Step 3: Cache selection
    saveToCache({ classroomId, assignmentId });

    // Step 4: Fetch accepted assignments
    await fetchAcceptedAssignments(assignmentId);
  } catch (error) {
    console.error("Error:", error.message);
  }
};

main();