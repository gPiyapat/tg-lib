import { expect, Locator, Page } from "@playwright/test"
import * as fs from "fs"
import { Download } from "playwright-core"

type XPathablePageLike<T> = { new (page: Page): T }

export class XPathablePage {
  page: Page

  constructor(page: Page) {
    this.page = page
  }

  get xpath(): XPath {
    return xpath.onPage(this.page)
  }

  static onPage<T extends XPathablePage>(
    this: XPathablePageLike<T>,
    page: Page
  ): T {
    return new this(page)
  }
}

export class XPath {
  //XPath with props
  xpath: string
  page?: Page
  base: string

  constructor(xpath?: string, page?: Page, base?: string) {
    this.base = base || this.defaultBaseElement()
    this.xpath = xpath || this.base
    this.page = page
  }

  onPage(page: Page): this {
    const con = this.constructor as any
    // if you figure out how to get type script to do inheritance correctly fix this
    return new con(this.xpath, page, this.base)
  }

  defaultBaseElement() {
    return "//*"
  }

  locate(): Locator {
    if (!this.page) {
      throw new Error(`Cannot Locate ${this.xpath} with missing page`)
    }
    return this.page.locator(this.xpath)
  }

  strippedXPath(): string {
    if (this.xpath.startsWith("//")) {
      return this.xpath.substring(2)
    } else {
      return this.xpath
    }
  }

  join<T>(xpath: T | string, sep: string = "/"): XPath {
    const xp = xpath instanceof XPath ? xpath.strippedXPath() : xpath
    return new XPath(`${this.xpath}${sep}${xp}`, this.page)
  }

  _<T extends XPath>(xpath: T): T {
    const tmp = this.join(xpath)
    const con: any = xpath.constructor
    return new con(tmp.xpath, this.page)
  }

  __<T extends XPath>(xpath: T): T {
    const tmp = this.join(xpath, "//")
    const con: any = xpath.constructor
    return new con(tmp.xpath, this.page)
  }

  nth(n: number): XPath {
    return new XPath(`(${this.xpath})[${n}]`, this.page)
  }

  nthChild(n: number): XPath {
    return new XPath(`${this.xpath}[${n}]`, this.page)
  }

  first(): XPath {
    return this.nth(1)
  }

  back(): XPath {
    return new XPath(`${this.xpath}/..`, this.page)
  }

  ancestor(xpath: XPath | string): XPath {
    return this.join(xpath, "/ancestor::")
  }

  firstAncestor(xpath: XPath) {
    return this.ancestor(xpath).first()
  }

  sibling(xpath: XPath) {
    return this.back()._(xpath)
  }

  withCondition(condition: string): this {
    const con = this.constructor as any
    return new con(`${this.xpath}[${condition}]`, this.page)
  }

  withTestId(dataTestId: string): this {
    return this.withAttrEqual("data-test-id", dataTestId)
  }

  withTestClass(dataTestClass: string): this {
    return this.withAttrEqual("data-test-class", dataTestClass)
  }

  withText(text: string): this {
    return this.withCondition(`normalize-space(text()) = "${text}"`)
  }

  withAttr(attr: string): this {
    return this.withCondition(`@${attr}`)
  }

  withAttrEqual(attr: string, value: string): this {
    return this.withCondition(`@${attr}="${value}"`)
  }

  thatAttrContains(attr: string, value: string): this {
    return this.withCondition(`contains(@${attr},"${value}")`)
  }

  thatContainsText(text: string): this {
    return this.withCondition(`contains(text(), "${text}")`)
  }

  thatChildContainsText(text: string): this {
    return this.withCondition(`.//*[contains(text(), "${text}")]`)
  }

  withId(id: string): this {
    return this.withAttrEqual("id", id)
  }

  withClass(klass: string): this {
    // a precise class look up
    // ex link will only match class="link" and class="blue link"
    // but not class="deep-link
    // see https://scrapfly.io/blog/how-to-select-elements-by-class-in-xpath/
    return this.withCondition(
      `contains(concat(" ", normalize-space(@class), " "), " ${klass} ")`
    )
  }

  withPlaceHolder(placeholder: string): Textbox {
    return new Textbox(
      `//input[contains(@placeholder, "${placeholder}")]`,
      this.page
    )
  }

  thatContainsClass(klass: string): this {
    // a much more imprecise matching
    return this.thatAttrContains("class", klass)
  }

  withFormControlName(formControlName: string): this {
    return this.withAttrEqual("formcontrolname", formControlName)
  }

  withRole(role: string): this {
    return this.withAttrEqual("role", role)
  }

  async fillAndCheck(text: string) {
    const textbox = this.locate()
    await textbox.fill(text)
    await expect(textbox).toHaveValue(text)
  }

  async click(options?: { delay?: number; force?: boolean }) {
    await this.locate().click(options)
  }

  async expectDownloadGotNonEmptyFile(): Promise<Download> {
    const ele = this.locate()
    const [download, _] = await Promise.all([
      this.page!.waitForEvent("download"),
      ele.click(),
    ])
    const path = await download.path()
    expect(path).not.toBeNull()
    expect(fs.statSync(path!).size).toBeGreaterThan(0)
    return download
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

  get textArea(): TextArea {
    return new TextArea(undefined, this.page)
  }

  get image(): Image {
    return new Image(undefined, this.page)
  }

  get label(): Label {
    return new Label(undefined, this.page)
  }

  get table(): Table {
    return new Table(undefined, this.page)
  }

  fromString<T extends XPath>(this: T, xpathString: string): T {
    const con = this.constructor as any
    return new con(xpathString, this.page) as T
  }

  fs(xpathString: string): XPath {
    return this.fromString(xpathString)
  }

  custom(tag: string) {
    return new XPath(undefined, this.page, "//" + tag)
  }

  expectToBeVisible(options?: { timeout?: number; visible?: boolean }) {
    return this.isExpected.toBeVisible(options)
  }

  expectToBeEnabled() {
    return this.isExpected.toBeEnabled()
  }

  expectToBeDisabled() {
    return this.isExpected.toBeDisabled()
  }

  expectToHaveText(text: string) {
    return this.isExpected.toHaveText(text)
  }

  expectToHaveValue(value: any) {
    return this.isExpected.toHaveValue(value)
  }

  expectedToBeInvisible() {
    //this needs to be checked
    return this.isExpected.toHaveCount(0)
  }

  get isExpected(): ReturnType<typeof expect<Locator>> {
    return expect(this.locate())
  }

  fill(text: string) {
    return this.locate().fill(text)
  }

  focus() {
    return this.locate().focus()
  }

  async waitForAttachment(): Promise<void> {
    await this.locate().waitFor({ state: "attached" })
  }

  async waitForAttachmentAfter(action: () => Promise<void>): Promise<void> {
    await Promise.all([this.waitForAttachment(), action()])
  }

  async waitForDetachment(): Promise<void> {
    await this.locate().waitFor({ state: "detached" })
  }

  async waitForDetachmentAfter(action: () => Promise<void>): Promise<void> {
    await Promise.all([this.waitForDetachment(), action()])
  }
}

export const xpath = new XPath()

export class Textbox extends XPath {
  defaultBaseElement(): string {
    return "//input"
  }
}

export const textbox = new Textbox()

export class OptionItem extends XPath {
  defaultBaseElement(): string {
    return "//nz-option-item"
  }
}

export const optionItem = new OptionItem()

export class DrDropdown extends XPath {
  defaultBaseElement(): string {
    return "//dr-dropdown"
  }

  selectedItem(): XPath {
    //dr-dropdown//*[@id="label"]
    return this.__(this.anyElement.withId("label"))
  }

  async showOptions() {
    await Promise.all([
      this.choicesContainer().locate().waitFor({ state: "attached" }),
      this.click(),
    ])
  }

  async selectItemWithText(text: string) {
    await this.showOptions()
    await Promise.all([
      this.choicesContainer().locate().waitFor({ state: "detached" }),
      this.optionWithText(text).click(),
    ])

    await this.selectedItem().isExpected.toHaveText(text)
  }

  optionWithText(text: string): XPath {
    return this.allOptionItems().withText(text)
  }

  allOptionItems(): XPath {
    return this.choicesContainer().__(this.fromString("//li"))
  }

  choicesContainer(): XPath {
    return this.div
      .withClass("cdk-overlay-container")
      .__(this.fromString("//ul"))
  }
}

export class Select extends XPath {
  defaultBaseElement(): string {
    return "//nz-select"
  }

  optionItemWithText(text: string): OptionItem {
    return new OptionItem(`//nz-option-item[./*[text()="${text}"]]`, this.page)
  }

  allOptionItems(): XPath {
    return this.optionItem
  }

  async expectAllOptionsToSatisfyRegex(r: RegExp) {
    await this.allOptionItems().isExpected.not.toHaveCount(0)
    const items = await this.allOptionItems().locate().all()
    await Promise.all(items.map((item) => expect(item).toHaveText(r)))
  }

  activeItem(): XPath {
    return new XPath(`${this.xpath}//nz-select-item`, this.page)
  }

  async openSelection() {
    const select = this.locate()
    await Promise.all([
      this.optionContainer().locate().waitFor({ state: "attached" }),
      select.click(),
    ])
  }

  async selectAndCheck(text: string): Promise<void> {
    await this.openSelection()
    const item = this.optionItemWithText(text).locate()
    await item.click()
    await item.waitFor({ state: "detached" })
    await expect(this.activeItem().locate()).toHaveText(text)
  }

  async cancelSelection() {
    await Promise.all([
      this.optionContainer().locate().waitFor({ state: "detached" }),
      this.page!.keyboard.press("Escape"),
    ])
  }

  optionContainer(): XPath {
    return this.fromString("//nz-option-container")
  }
}

export const select = new Select()

export class Button extends XPath {
  defaultBaseElement(): string {
    return "//button"
  }
}

export const button = new Button()

export class Span extends XPath {
  defaultBaseElement(): string {
    return "//span"
  }
}

export const span = new Span()

export class Div extends XPath {
  defaultBaseElement(): string {
    return "//div"
  }
}

export const div = new Div()

export class Icon extends XPath {
  defaultBaseElement(): string {
    return "//i"
  }

  withNzType(nzType: string): Icon {
    return new Icon(`//i[@nztype="${nzType}"]`, this.page)
  }
}

export const icon = new Icon()

export class Input extends XPath {
  defaultBaseElement(): string {
    return "//input"
  }

  withType(type: string): Input {
    return new Input(`${this.xpath}[@type="${type}"]`, this.page)
  }
}

export const input = new Input()

export class Anchor extends XPath {
  defaultBaseElement(): string {
    return "//a"
  }
}

export const anchor = new Anchor()

export class TextArea extends XPath {
  defaultBaseElement(): string {
    return "//textarea"
  }
}

export const textArea = new TextArea()

export class Image extends XPath {
  defaultBaseElement(): string {
    return "//img"
  }
}

export const image = new Image()

export class Label extends XPath {
  defaultBaseElement(): string {
    return "//label"
  }

  async expectToBeRequired(): Promise<void> {
    await expect(this.locate()).toHaveClass("ant-form-item-required")
  }
}

export const label: Label = new Label()

export class Table extends XPath {
  defaultBaseElement(): string {
    return "//table"
  }

  tableHeadsRows(): XPath {
    return this._(this.fs("thead"))._(this.fs("tr"))
  }

  tableHead(): XPath {
    return this.tableHeadsRows()._(this.fs("th"))
  }

  tableHeadWithText(text: string): XPath {
    return this.tableHead().thatChildContainsText(text)
  }

  tableBody(): XPath {
    return this._(this.fs("tbody"))
  }

  tableRows(): XPath {
    return this.tableBody()._(this.fs("tr"))
  }

  tableRow(row: number, options?: { excludeHiddenRow?: boolean }): XPath {
    const r = row + (options?.excludeHiddenRow ? 1 : 0)
    return this.tableRows().nthChild(row)
  }

  tableCellsAtColumn(i: number): XPath {
    return this.tableBody()._(this.fs("tr"))._(this.fs("td")).nthChild(i)
  }

  async textValuesAtColumn(
    i: number,
    options?: { excludeHiddenRow?: boolean }
  ): Promise<Array<string | null>> {
    const cells = await this.tableCellsAtColumn(i).locate().all()

    if (options?.excludeHiddenRow && cells.length > 0) {
      cells.splice(0, 1)
    }

    const ret = await Promise.all(cells.map((x) => x.textContent()))
    return ret
  }

  /**
   * Be careful with nztable sometimes it has hidden row.
   * @param row
   * @param column
   * @param options
   */
  tableCellAtRowColumn(
    row: number,
    column: number,
    options: { excludeHiddenRow?: boolean }
  ): XPath {
    const td = this.fs("td")
    return this.tableRow(row, options)._(td).nthChild(column)
  }
}

export const table = new Table()
