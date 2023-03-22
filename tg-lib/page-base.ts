import { expect, Page } from "@playwright/test"
import * as fs from "fs"
import { Download } from "playwright-core"
import { Action, TestContext, TestData } from "./tg-test"
import { XPath, XPathablePage } from "./tg-xpath"

export class PageBase extends XPathablePage {
  /**
   * Wait until there is no network activity.
   * @see https://playwright.dev/docs/api/class-page#page-wait-for-load-state
   */
  async waitForNetworkIdle() {
    await this.page.waitForLoadState("networkidle")
  }

  /**
   * Wait for download event.
   * You are discouraged to use this since it can have race condition
   * Use {@link isExpectedToDownloadNonEmptyFileAfter} instead
   */
  waitForDownload(): Promise<Download> {
    return this.page.waitForEvent("download")
  }

  /**
   * Check that the given action will result in a download of a non-empty file.
   * @param action
   */
  async isExpectedToDownloadNonEmptyFileAfter(action: () => Promise<Download>) {
    const [download, _] = await Promise.all([
      this.isExpectedToHaveDownloadedNonEmptyFile(),
      action(),
    ])
    return download
  }

  private async isExpectedToHaveDownloadedNonEmptyFile(): Promise<Download> {
    const download = await this.waitForDownload()
    const dlPath = await download.path()
    await expect(dlPath, "Download Path is Null").not.toBeNull()
    await expect(fs.statSync(dlPath!.toString()).size).toBeGreaterThan(0)
    return download
  }

  /**
   * Every page should overwrite this to define the basic elements
   * that user should be able to see on this page when visit.
   */
  basicElements(): Array<XPath> {
    // We decide to make this runtime error instead of abstract
    // False positive would be much harder to catch.
    // and not all element will need this
    throw new Error(`basicElements not defined on ${this.constructor.name}`)
  }

  /**
   * Check that all basic Elements defined in {@link basicElements}
   * @param options
   */
  async isExpectedToHaveAllBasicElementsVisible(options?: {
    timeout?: number
  }) {
    await Promise.all(
      this.basicElements().map(async (x) => {
        await x.isExpected.toBeVisible(options)
      })
    )
  }

  /**
   * Experimental TestCase step generator.
   * I actually prefer just writing lambda.
   * @param action
   */
  static testStep<D extends TestData, T extends PageBase>(
    this: { new (p: Page): T },
    action: (params: { page: T; ctx: TestContext<D> }) => Promise<void>
  ): Action<D> {
    return async (ctx: TestContext<D>) => {
      const page = new this(ctx.get().page)
      await action({ page, ctx })
    }
  }
}
