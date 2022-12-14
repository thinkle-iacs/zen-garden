function getSelectedStylePath() {
  return document.querySelector("#thestyle").href;
}
class StyleSelector {
  constructor(style) {
    /*
    style.path.replace(/\/.*$/, ""),
      style.name,
      `styles/${style.path}`,
      style.designer,
      style.portfolio;*/
    this.id = style.path.replace(/\/.*$/, "");
    this.name = style.name;
    this.path = `styles/${style.path}`;
    this.designer = style.designer;
    this.portfolio = style.portfolio;
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
    styleLink.addEventListener("click", () => {
      this.applyStyle();
    });
  }

  applyStyle() {
    document.querySelector("#thestyle").setAttribute("href", this.path);
    document.querySelector("#csslink").setAttribute("href", this.path);
    updateSelections(false, this);
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
  return getRandomSubarray(bigList, 5);
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

function setupInitialList() {
  let selected = location.hash.slice(1);
  for (let style of styles) {
    let selector = new StyleSelector(style);
    allSelectors.push(selector);
    if (selected == selector.id) {
      selector.applyStyle();
    }
  }

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
