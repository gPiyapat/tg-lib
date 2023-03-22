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
exports.PageBase = void 0
const test_1 = require("@playwright/test")
const fs_1 = __importDefault(require("fs"))
const tg_xpath_1 = require("./tg-xpath")
class PageBase extends tg_xpath_1.XPathablePage {
  /**
   * Wait until there is no network activity.
   * @see https://playwright.dev/docs/api/class-page#page-wait-for-load-state
   */
  waitForNetworkIdle() {
    return __awaiter(this, void 0, void 0, function* () {
      yield this.page.waitForLoadState("networkidle")
    })
  }
  /**
   * Wait for download event.
   * You are discouraged to use this since it can have race condition
   * Use {@link isExpectedToDownloadNonEmptyFileAfter} instead
   */
  waitForDownload() {
    return this.page.waitForEvent("download")
  }
  /**
   * Check that the given action will result in a download of a non-empty file.
   * @param action
   */
  isExpectedToDownloadNonEmptyFileAfter(action) {
    return __awaiter(this, void 0, void 0, function* () {
      const [download, _] = yield Promise.all([
        this.isExpectedToHaveDownloadedNonEmptyFile(),
        action(),
      ])
      return download
    })
  }
  isExpectedToHaveDownloadedNonEmptyFile() {
    return __awaiter(this, void 0, void 0, function* () {
      const download = yield this.waitForDownload()
      const dlPath = yield download.path()
      yield (0, test_1.expect)(dlPath, "Download Path is Null").not.toBeNull()
      yield (0, test_1.expect)(
        fs_1.default.statSync(dlPath.toString()).size
      ).toBeGreaterThan(0)
      return download
    })
  }
  /**
   * Every page should overwrite this to define the basic elements
   * that user should be able to see on this page when visit.
   */
  basicElements() {
    // We decide to make this runtime error instead of abstract
    // False positive would be much harder to catch.
    // and not all element will need this
    throw new Error(`basicElements not defined on ${this.constructor.name}`)
  }
  /**
   * Check that all basic Elements defined in {@link basicElements}
   * @param options
   */
  isExpectedToHaveAllBasicElementsVisible(options) {
    return __awaiter(this, void 0, void 0, function* () {
      yield Promise.all(
        this.basicElements().map((x) =>
          __awaiter(this, void 0, void 0, function* () {
            yield x.isExpected.toBeVisible(options)
          })
        )
      )
    })
  }
  /**
   * Experimental TestCase step generator.
   * I actually prefer just writing lambda.
   * @param action
   */
  static testStep(action) {
    return (ctx) =>
      __awaiter(this, void 0, void 0, function* () {
        const page = new this(ctx.get().page)
        yield action({ page, ctx })
      })
  }
}
exports.PageBase = PageBase
