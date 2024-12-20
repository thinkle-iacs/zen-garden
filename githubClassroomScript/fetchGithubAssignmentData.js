const { githubFetch, writeJsonFile, readJsonFile } = require("./utils");
const inquirer = require("inquirer");
const prompt = inquirer.default.prompt;

const ASSIGNMENT_FILE = "githubClassroomScript/student_repos.json";

const getAssignmentData = async () => {
  try {
    // Step 1: Fetch classrooms
    const classrooms = await githubFetch("https://api.github.com/classrooms");
    const classroomChoices = classrooms.map((classroom) => ({
      name: classroom.name,
      value: classroom.id,
    }));

    const { selectedClassroom } = await prompt([
      {
        type: "list",
        name: "selectedClassroom",
        message: "Select a classroom:",
        choices: classroomChoices,
      },
    ]);

    // Step 2: Fetch assignments for the selected classroom
    const assignments = await githubFetch(`https://api.github.com/classrooms/${selectedClassroom}/assignments`);
    const assignmentChoices = assignments.map((assignment) => ({
      name: assignment.title,
      value: assignment.id,
    }));

    const { selectedAssignment } = await prompt([
      {
        type: "list",
        name: "selectedAssignment",
        message: "Select an assignment:",
        choices: assignmentChoices,
      },
    ]);
    let index = assignmentChoices.findIndex((assignment) => assignment.value === selectedAssignment);
    let ogAssignment = assignments[index];
    console.log('ogAssignment:',ogAssignment);

    // Step 3: Fetch accepted assignments for the selected assignment
    const students = await githubFetch(
      `https://api.github.com/assignments/${selectedAssignment}/accepted_assignments`
    );
    console.log('assignments:',students[0]);
    // Transform student data for saving
    const studentData = students.map((entry) => ({
      student: entry.students[0]?.login || "Unknown",
      rootUrl: entry.repository.html_url,
      fetched: false,
      fetchedAsOf: null,
    }));

    // Write to JSON file
    writeJsonFile(ASSIGNMENT_FILE, studentData);
    console.log(`Saved student data to ${ASSIGNMENT_FILE}`);
  } catch (error) {
    console.error("Error fetching assignment data:", error.message);
  }
};

module.exports = { getAssignmentData };