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
      //changeLinks();
    });
  }

  applyStyle() {
    document.querySelector("#thestyle").setAttribute("href", this.path);
    document.querySelector("#csslink").setAttribute("href", this.path);
  }
}

function setupInitialList() {
  let styleListElement = document.querySelector("#design-selection nav ul");
  for (let style of styles) {
    let selector = new StyleSelector(style);
    styleListElement.appendChild(selector.li);
  }

  document.querySelector(".next a").addEventListener("click", function () {
    let currentIndex = styles.findIndex(
      (style) => getSelectedStylePath().indexOf(style.path) > -1
    );
    debugger;
    let nextIndex = (currentIndex + 1) % styles.length;
    new StyleSelector(styles[nextIndex]).applyStyle();
  });
}

document.addEventListener("DOMContentLoaded", setupInitialList);
