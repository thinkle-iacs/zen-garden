const { getAssignmentData } = require("./fetchGithubAssignmentData");
const { fetchProjects } = require("./fetchProjects");
const inquirer = require("inquirer");
const prompt = inquirer.default.prompt;

(async () => {
  try {
    const { action } = await prompt([
      {
        type: "list",
        name: "action",
        message: "What would you like to do?",
        choices: [
          { name: "Fetch assignment data (classes, assignments, etc.)", value: "fetchAssignmentData" },
          { name: "Fetch/update student projects", value: "fetchProjects" },
          { name: "Exit", value: "exit" },
        ],
      },
    ]);

    if (action === "fetchAssignmentData") {
      await getAssignmentData();
    } else if (action === "fetchProjects") {
      await fetchProjects();
    } else {
      console.log("Goodbye!");
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
})();