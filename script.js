function getSelectedStylePath() {
  return document.querySelector("#thestyle").href;
}
class StyleSelector {
  constructor(style) {
    const folderName = style.path.replace(/\/.*$/, ""); // Extract folder name (e.g., "foo")
    const fileName = style.path.split("/").pop().replace(".css", ""); // Extract file name without extension (e.g., "style" or "two")
    this.id = `${folderName}--${fileName}`; // Combine folder and file name (e.g., "foo--style")
    this.name = style.name;
    this.path = `styles/${style.path}`;
    this.designer = style.designer;
    this.portfolio = style.portfolio;
    this.highlight = style.highlight;
    this.buildElement();
  }

  buildElement() {
    this.li = document.createElement("li");
    this.li.innerHTML = `
      <a href="#${this.id}" class="design-name">
        ${this.name}
      </a> by 
      <a href=${this.portfolio || "#"}>
        ${this.designer}
      </a>
    `;
    this.setupHandler();
  }

  setupHandler() {
    let styleLink = this.li.querySelector("a.design-name");
    styleLink.addEventListener("click", (event) => {
      this.applyStyle();      
    });
  }

  applyStyle() {
    document.querySelector("#thestyle").setAttribute("href", this.path);
    document.querySelector("#csslink").setAttribute("href", this.path);
    updateSelections(false, this);
    setTimeout(
      ()=>{
        console.log('Scroll up');
        window.scrollTo({top:0});
        },
        10
      );
  }
}
let allSelectors = [];

function getRandomSubarray(arr, size) {
  var shuffled = arr.slice(0),
    i = arr.length,
    temp,
    index;
  while (i--) {
    index = Math.floor((i + 1) * Math.random());
    temp = shuffled[index];
    shuffled[index] = shuffled[i];
    shuffled[i] = temp;
  }
  return shuffled.slice(0, size);
}

function grabSome(bigList) {  
  let filteredList = bigList.filter((i)=>i.highlight);  
  if (filteredList.length >= 5) {
    return getRandomSubarray(filteredList,5);
  } else {  
    return getRandomSubarray(bigList, 5);
  }
}

function updateSelections(includeAll = false, startWith = null) {
  let styleListElement = document.querySelector("#design-selection nav ul");
  styleListElement.innerHTML = "";
  let mySelection = grabSome(allSelectors);
  if (includeAll) {
    mySelection = allSelectors;
  }
  if (startWith) {
    mySelection = [
      startWith,
      ...mySelection.filter((s) => s.id != startWith.id),
    ];
  }
  for (let item of mySelection) {
    item.buildElement();
    styleListElement.appendChild(item.li);
  }
}

function applyStyleForHash () {  
  let selected = location.hash.slice(1);
  if (selected == "all") {
    return
  }
  let closestMatch = null;
  let foundHash = false;
  for (let style of styles) {
    let selector = new StyleSelector(style);
    allSelectors.push(selector);
    if (selected == selector.id) {
      selector.applyStyle();
      foundHash = true;
    }
    if (!closestMatch && selector.id.includes(selected)) {
      closestMatch = selector;
    }
  }
  if (!foundHash && closestMatch) {
    closestMatch.applyStyle();
  }
}

function setupInitialList() {
  applyStyleForHash();

  updateSelections();

  document.querySelector(".next a").addEventListener("click", function () {
    let currentIndex = styles.findIndex(
      (style) => getSelectedStylePath().indexOf(style.path) > -1
    );
    let nextIndex = (currentIndex + 1) % styles.length;
    new StyleSelector(styles[nextIndex]).applyStyle();
  });

  document.querySelector(".viewall a").addEventListener("click", function () {
    updateSelections(true);
  });
}

document.addEventListener("DOMContentLoaded", setupInitialList);
window.addEventListener(
  "hashchange",
  function () {
    applyStyleForHash();
  },
  false
)