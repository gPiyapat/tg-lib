"use strict"
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value)
          })
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value))
        } catch (e) {
          reject(e)
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value))
        } catch (e) {
          reject(e)
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected)
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next())
    })
  }
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod }
  }
Object.defineProperty(exports, "__esModule", { value: true })
exports.table =
  exports.Table =
  exports.label =
  exports.Label =
  exports.image =
  exports.Image =
  exports.textArea =
  exports.TextArea =
  exports.anchor =
  exports.Anchor =
  exports.input =
  exports.Input =
  exports.icon =
  exports.Icon =
  exports.div =
  exports.Div =
  exports.span =
  exports.Span =
  exports.button =
  exports.Button =
  exports.select =
  exports.Select =
  exports.DrDropdown =
  exports.optionItem =
  exports.OptionItem =
  exports.textbox =
  exports.Textbox =
  exports.xpath =
  exports.XPath =
  exports.XPathablePage =
    void 0
const test_1 = require("@playwright/test")
const fs_1 = __importDefault(require("fs"))
class XPathablePage {
  constructor(page) {
    this.page = page
  }
  get xpath() {
    return exports.xpath.onPage(this.page)
  }
  static onPage(page) {
    return new this(page)
  }
}
exports.XPathablePage = XPathablePage
class XPath {
  constructor(xpath, page, base) {
    this.base = base || this.defaultBaseElement()
    this.xpath = xpath || this.base
    this.page = page
  }
  onPage(page) {
    const con = this.constructor
    // if you figure out how to get type script to do inheritance correctly fix this
    return new con(this.xpath, page, this.base)
  }
  defaultBaseElement() {
    return "//*"
  }
  locate() {
    if (!this.page) {
      throw new Error(`Cannot Locate ${this.xpath} with missing page`)
    }
    return this.page.locator(this.xpath)
  }
  strippedXPath() {
    if (this.xpath.startsWith("//")) {
      return this.xpath.substring(2)
    } else {
      return this.xpath
    }
  }
  join(xpath, sep = "/") {
    const xp = xpath instanceof XPath ? xpath.strippedXPath() : xpath
    return new XPath(`${this.xpath}${sep}${xp}`, this.page)
  }
  _(xpath) {
    const tmp = this.join(xpath)
    const con = xpath.constructor
    return new con(tmp.xpath, this.page)
  }
  __(xpath) {
    const tmp = this.join(xpath, "//")
    const con = xpath.constructor
    return new con(tmp.xpath, this.page)
  }
  nth(n) {
    return new XPath(`(${this.xpath})[${n}]`, this.page)
  }
  nthChild(n) {
    return new XPath(`${this.xpath}[${n}]`, this.page)
  }
  first() {
    return this.nth(1)
  }
  back() {
    return new XPath(`${this.xpath}/..`, this.page)
  }
  ancestor(xpath) {
    return this.join(xpath, "/ancestor::")
  }
  firstAncestor(xpath) {
    return this.ancestor(xpath).first()
  }
  sibling(xpath) {
    return this.back()._(xpath)
  }
  withCondition(condition) {
    const con = this.constructor
    return new con(`${this.xpath}[${condition}]`, this.page)
  }
  withTestId(dataTestId) {
    return this.withAttrEqual("data-test-id", dataTestId)
  }
  withTestClass(dataTestClass) {
    return this.withAttrEqual("data-test-class", dataTestClass)
  }
  withText(text) {
    return this.withCondition(`normalize-space(text()) = "${text}"`)
  }
  withAttr(attr) {
    return this.withCondition(`@${attr}`)
  }
  withAttrEqual(attr, value) {
    return this.withCondition(`@${attr}="${value}"`)
  }
  thatAttrContains(attr, value) {
    return this.withCondition(`contains(@${attr},"${value}")`)
  }
  thatContainsText(text) {
    return this.withCondition(`contains(text(), "${text}")`)
  }
  thatChildContainsText(text) {
    return this.withCondition(`.//*[contains(text(), "${text}")]`)
  }
  withId(id) {
    return this.withAttrEqual("id", id)
  }
  withClass(klass) {
    // a precise class look up
    // ex link will only match class="link" and class="blue link"
    // but not class="deep-link
    // see https://scrapfly.io/blog/how-to-select-elements-by-class-in-xpath/
    return this.withCondition(
      `contains(concat(" ", normalize-space(@class), " "), " ${klass} ")`
    )
  }
  withPlaceHolder(placeholder) {
    return new Textbox(
      `//input[contains(@placeholder, "${placeholder}")]`,
      this.page
    )
  }
  thatContainsClass(klass) {
    // a much more imprecise matching
    return this.thatAttrContains("class", klass)
  }
  withFormControlName(formControlName) {
    return this.withAttrEqual("formcontrolname", formControlName)
  }
  withRole(role) {
    return this.withAttrEqual("role", role)
  }
  fillAndCheck(text) {
    return __awaiter(this, void 0, void 0, function* () {
      const textbox = this.locate()
      yield textbox.fill(text)
      yield (0, test_1.expect)(textbox).toHaveValue(text)
    })
  }
  click(options) {
    return __awaiter(this, void 0, void 0, function* () {
      yield this.locate().click(options)
    })
  }
  expectDownloadGotNonEmptyFile() {
    return __awaiter(this, void 0, void 0, function* () {
      const ele = this.locate()
      const [download, _] = yield Promise.all([
        this.page.waitForEvent("download"),
        ele.click(),
      ])
      const path = yield download.path()
      ;(0, test_1.expect)(path).not.toBeNull()
      ;(0, test_1.expect)(fs_1.default.statSync(path).size).toBeGreaterThan(0)
      return download
    })
  }
  get anyElement() {
    return new XPath(undefined, this.page)
  }
  get textbox() {
    return new Textbox(undefined, this.page)
  }
  get optionItem() {
    return new OptionItem(undefined, this.page)
  }
  get select() {
    return new Select(undefined, this.page)
  }
  get drDropdown() {
    return new DrDropdown(undefined, this.page)
  }
  get button() {
    return new Button(undefined, this.page)
  }
  get span() {
    return new Span(undefined, this.page)
  }
  get div() {
    return new Div(undefined, this.page)
  }
  get icon() {
    return new Icon(undefined, this.page)
  }
  get input() {
    return new Input(undefined, this.page)
  }
  get anchor() {
    return new Anchor(undefined, this.page)
  }
  get textArea() {
    return new TextArea(undefined, this.page)
  }
  get image() {
    return new Image(undefined, this.page)
  }
  get label() {
    return new Label(undefined, this.page)
  }
  get table() {
    return new Table(undefined, this.page)
  }
  fromString(xpathString) {
    const con = this.constructor
    return new con(xpathString, this.page)
  }
  fs(xpathString) {
    return this.fromString(xpathString)
  }
  custom(tag) {
    return new XPath(undefined, this.page, "//" + tag)
  }
  expectToBeVisible(options) {
    return this.isExpected.toBeVisible(options)
  }
  expectToBeEnabled() {
    return this.isExpected.toBeEnabled()
  }
  expectToBeDisabled() {
    return this.isExpected.toBeDisabled()
  }
  expectToHaveText(text) {
    return this.isExpected.toHaveText(text)
  }
  expectToHaveValue(value) {
    return this.isExpected.toHaveValue(value)
  }
  expectedToBeInvisible() {
    //this needs to be checked
    return this.isExpected.toHaveCount(0)
  }
  get isExpected() {
    return (0, test_1.expect)(this.locate())
  }
  fill(text) {
    return this.locate().fill(text)
  }
  focus() {
    return this.locate().focus()
  }
  waitForAttachment() {
    return __awaiter(this, void 0, void 0, function* () {
      yield this.locate().waitFor({ state: "attached" })
    })
  }
  waitForAttachmentAfter(action) {
    return __awaiter(this, void 0, void 0, function* () {
      yield Promise.all([this.waitForAttachment(), action()])
    })
  }
  waitForDetachment() {
    return __awaiter(this, void 0, void 0, function* () {
      yield this.locate().waitFor({ state: "detached" })
    })
  }
  waitForDetachmentAfter(action) {
    return __awaiter(this, void 0, void 0, function* () {
      yield Promise.all([this.waitForDetachment(), action()])
    })
  }
}
exports.XPath = XPath
exports.xpath = new XPath()
class Textbox extends XPath {
  defaultBaseElement() {
    return "//input"
  }
}
exports.Textbox = Textbox
exports.textbox = new Textbox()
class OptionItem extends XPath {
  defaultBaseElement() {
    return "//nz-option-item"
  }
}
exports.OptionItem = OptionItem
exports.optionItem = new OptionItem()
class DrDropdown extends XPath {
  defaultBaseElement() {
    return "//dr-dropdown"
  }
  selectedItem() {
    //dr-dropdown//*[@id="label"]
    return this.__(this.anyElement.withId("label"))
  }
  showOptions() {
    return __awaiter(this, void 0, void 0, function* () {
      yield Promise.all([
        this.choicesContainer().locate().waitFor({ state: "attached" }),
        this.click(),
      ])
    })
  }
  selectItemWithText(text) {
    return __awaiter(this, void 0, void 0, function* () {
      yield this.showOptions()
      yield Promise.all([
        this.choicesContainer().locate().waitFor({ state: "detached" }),
        this.optionWithText(text).click(),
      ])
      yield this.selectedItem().isExpected.toHaveText(text)
    })
  }
  optionWithText(text) {
    return this.allOptionItems().withText(text)
  }
  allOptionItems() {
    return this.choicesContainer().__(this.fromString("//li"))
  }
  choicesContainer() {
    return this.div
      .withClass("cdk-overlay-container")
      .__(this.fromString("//ul"))
  }
}
exports.DrDropdown = DrDropdown
class Select extends XPath {
  defaultBaseElement() {
    return "//nz-select"
  }
  optionItemWithText(text) {
    return new OptionItem(`//nz-option-item[./*[text()="${text}"]]`, this.page)
  }
  allOptionItems() {
    return this.optionItem
  }
  expectAllOptionsToSatisfyRegex(r) {
    return __awaiter(this, void 0, void 0, function* () {
      yield this.allOptionItems().isExpected.not.toHaveCount(0)
      const items = yield this.allOptionItems().locate().all()
      yield Promise.all(
        items.map((item) => (0, test_1.expect)(item).toHaveText(r))
      )
    })
  }
  activeItem() {
    return new XPath(`${this.xpath}//nz-select-item`, this.page)
  }
  openSelection() {
    return __awaiter(this, void 0, void 0, function* () {
      const select = this.locate()
      yield Promise.all([
        this.optionContainer().locate().waitFor({ state: "attached" }),
        select.click(),
      ])
    })
  }
  selectAndCheck(text) {
    return __awaiter(this, void 0, void 0, function* () {
      yield this.openSelection()
      const item = this.optionItemWithText(text).locate()
      yield item.click()
      yield item.waitFor({ state: "detached" })
      yield (0, test_1.expect)(this.activeItem().locate()).toHaveText(text)
    })
  }
  cancelSelection() {
    return __awaiter(this, void 0, void 0, function* () {
      yield Promise.all([
        this.optionContainer().locate().waitFor({ state: "detached" }),
        this.page.keyboard.press("Escape"),
      ])
    })
  }
  optionContainer() {
    return this.fromString("//nz-option-container")
  }
}
exports.Select = Select
exports.select = new Select()
class Button extends XPath {
  defaultBaseElement() {
    return "//button"
  }
}
exports.Button = Button
exports.button = new Button()
class Span extends XPath {
  defaultBaseElement() {
    return "//span"
  }
}
exports.Span = Span
exports.span = new Span()
class Div extends XPath {
  defaultBaseElement() {
    return "//div"
  }
}
exports.Div = Div
exports.div = new Div()
class Icon extends XPath {
  defaultBaseElement() {
    return "//i"
  }
  withNzType(nzType) {
    return new Icon(`//i[@nztype="${nzType}"]`, this.page)
  }
}
exports.Icon = Icon
exports.icon = new Icon()
class Input extends XPath {
  defaultBaseElement() {
    return "//input"
  }
  withType(type) {
    return new Input(`${this.xpath}[@type="${type}"]`, this.page)
  }
}
exports.Input = Input
exports.input = new Input()
class Anchor extends XPath {
  defaultBaseElement() {
    return "//a"
  }
}
exports.Anchor = Anchor
exports.anchor = new Anchor()
class TextArea extends XPath {
  defaultBaseElement() {
    return "//textarea"
  }
}
exports.TextArea = TextArea
exports.textArea = new TextArea()
class Image extends XPath {
  defaultBaseElement() {
    return "//img"
  }
}
exports.Image = Image
exports.image = new Image()
class Label extends XPath {
  defaultBaseElement() {
    return "//label"
  }
  expectToBeRequired() {
    return __awaiter(this, void 0, void 0, function* () {
      yield (0, test_1.expect)(this.locate()).toHaveClass(
        "ant-form-item-required"
      )
    })
  }
}
exports.Label = Label
exports.label = new Label()
class Table extends XPath {
  defaultBaseElement() {
    return "//table"
  }
  tableHeadsRows() {
    return this._(this.fs("thead"))._(this.fs("tr"))
  }
  tableHead() {
    return this.tableHeadsRows()._(this.fs("th"))
  }
  tableHeadWithText(text) {
    return this.tableHead().thatChildContainsText(text)
  }
  tableBody() {
    return this._(this.fs("tbody"))
  }
  tableRows() {
    return this.tableBody()._(this.fs("tr"))
  }
  tableRow(row, options) {
    const r =
      row +
      ((
        options === null || options === void 0
          ? void 0
          : options.excludeHiddenRow
      )
        ? 1
        : 0)
    return this.tableRows().nthChild(row)
  }
  tableCellsAtColumn(i) {
    return this.tableBody()._(this.fs("tr"))._(this.fs("td")).nthChild(i)
  }
  textValuesAtColumn(i, options) {
    return __awaiter(this, void 0, void 0, function* () {
      const cells = yield this.tableCellsAtColumn(i).locate().all()
      if (
        (options === null || options === void 0
          ? void 0
          : options.excludeHiddenRow) &&
        cells.length > 0
      ) {
        cells.splice(0, 1)
      }
      const ret = yield Promise.all(cells.map((x) => x.textContent()))
      return ret
    })
  }
  /**
   * Be careful with nztable sometimes it has hidden row.
   * @param row
   * @param column
   * @param options
   */
  tableCellAtRowColumn(row, column, options) {
    const td = this.fs("td")
    return this.tableRow(row, options)._(td).nthChild(column)
  }
}
exports.Table = Table
exports.table = new Table()
