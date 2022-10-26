console.log("Hello world");
let fs = require("fs");
let http = require("https");

const downloadFile = async (url, path) => {
  console.log("Download!", url, "to", path);
  let file = fs.createWriteStream(path);
  http.get(url, function (response) {
    response.pipe(file);

    // after download completed close filestream
    file.on("finish", () => {
      file.close();
      console.log("Download Completed");
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
    let id = item.id;
    console.log("Fetching item", item.url);
    let resolved = await fetch(item.url);
    let text = await resolved.text();
    console.log(text);
    // URL Finder...
    let URLs = text.matchAll(/url[("']([^)*]*)["')]/g);
    for (let u of URLs) {
      console.log("MATCH", u[1]);
      if (!u[1] || u[1].search(/[:][/]/) > -1) {
        console.log("leaving alone: ", u[1]);
      } else {
        let toFix = u[1];
        toFix = toFix.replace(/^['"']|['"']$/g, "");
        console.log("Need to fix", toFix);
        let fullURL = new URL(toFix, item.url).href;
        let filename = fullURL.substring(fullURL.lastIndexOf("/") + 1);

        // A bit dangerous: if we used e.g. cat as both a file
        // name and a class name, this would replace cat with a
        // full URL and break our CSS. Seems unlikely though.
        // Unless we had an element like <cat class="jpeg"> :)
        try {
          fs.mkdirSync(`styles/${id}`);
        } catch (err) {
          console.log("Ignore error creating dir");
        }
        downloadFile(fullURL, `styles/${id}/${filename}`);
        text = text.replace(u[1], `/styles/${id}/${filename}`);
      }
    }
    //console.log("New CSS is: ", text);
    fs.writeFileSync(`styles/${id}/style.css`, text);
  }
}
readFiles();
//fetch("https://www.google.com");
