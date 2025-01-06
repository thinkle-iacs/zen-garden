let fs = require("fs");
let http = require("https");
let currentIndex = require("./styles/index.js");
const studentUrls = [];

function isValidHttpUrl(string) {
  let url;

  try {
    url = new URL(string);
  } catch (_) {
    return false;
  }

  return url.protocol === "http:" || url.protocol === "https:";
}

const downloadFile = async (url, path) => {
  console.log("Download!", url, "to", path);
  let file = fs.createWriteStream(path);
  http.get(url, function (response) {
    response.pipe(file);

    // after download completed close filestream
    file.on("finish", () => {
      file.close();
    });
  });
  /* 
  const fileStream = fs.createWriteStream(path);
  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on("error", reject);
    fileStream.on("finish", resolve);
  }); */
};

async function readFiles() {
  let text = await fs.readFileSync("toFetch.json");
  let json = JSON.parse(text);

  for (let item of json) {
    if (!isValidHttpUrl(item.url)) {
      console.warn("Invalid URL for item", item);
      continue;
    }
    // Validate and correct the 'id' to ensure it contains only valid characters
    let validId = item.id.replace(/[^a-zA-Z0-9-_]/g, "-");
    validId = validId.replace(/-{2,}/g, "-"); // replace multiple dashes with a single dash
    if (validId !== item.id) {
      console.warn(
        `Warning: ID "${item.id}" is invalid. Using corrected ID "${validId}".`
      );
      item.id = validId; // Correct the id
    }
    // Validate portfolio URL
    if (!isValidHttpUrl(item.portfolio)) {
      console.warn(
        `Warning: Portfolio URL "${item.portfolio}" is invalid. Replacing with placeholder.`
      );
      item.portfolio = "#fixme";
    }
    console.log("Fetching item", item.url);
    let resolved = await fetch(item.url);
    let text = await resolved.text();
    // URL Finder...
    let URLs = text.matchAll(/url[("']([^)*]*)["')]/g);
    try {
      console.log("Creating dir for ", item.id);
      fs.mkdirSync(`styles/${item.id}`);
    } catch (err) {
      if (err.code == "EEXIST") {
        console.log("Directory already exists");
      } else {
        throw err;
      }
    }
    for (let u of URLs) {
      //console.log("MATCH", u[1]);
      if (!u[1] || u[1].search(/[:][/]/) > -1) {
        console.log("leaving alone: ", u[1]);
      } else {
        let toFix = u[1];
        toFix = toFix.replace(/^['"']|['"']$/g, "");
        let fullURL = new URL(toFix, item.url).href;
        let filename = fullURL.substring(fullURL.lastIndexOf("/") + 1);

        // A bit dangerous: if we used e.g. cat as both a file
        // name and a class name, this would replace cat with a
        // full URL and break our CSS. Seems unlikely though.
        // Unless we had an element like <cat class="jpeg"> :)
        downloadFile(fullURL, `styles/${item.id}/${filename}`);
        text = text.replace(u[1], `/styles/${item.id}/${filename}`);
      }
    }
    fs.writeFileSync(`styles/${item.id}/style.css`, text);
    studentUrls.push(`https://iacs-zen-garden.netlify.app/#${item.id}`);
    let existing = currentIndex.styles.find(
      (style) => style.path == `${item.id}/style.css`
    );
    if (existing) {
      existing.name = item.name;
      existing.designer = item.contributor;
      existing.portfolio = item.portfolio;
    } else {
      currentIndex.styles.push({
        name: item.name,
        path: `${item.id}/style.css`,
        designer: item.contributor,
        portfolio: item.portfolio,
      });
    }
  }
  console.log("Write out new index.js");
  const body = `const styles=${JSON.stringify(currentIndex.styles, null, 2)};
exports.styles = styles;`;
  fs.writeFileSync("./styles/index.js", body);
  fs.writeFileSync("./new-urls.txt", studentUrls.join("\n"));
}
readFiles();
