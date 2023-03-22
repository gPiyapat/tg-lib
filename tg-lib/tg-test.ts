import { Page, test } from "@playwright/test"

export interface TestData {
  page: Page
}

export interface TestContext<T> {
  get(): T

  set(t: T): void

  page: Page
}

export class SimpleTestContext<T> implements TestContext<T> {
  ctx?: T

  constructor(ctx?: T) {
    this.ctx = ctx
  }

  get(): T {
    if (this.ctx) {
      return this.ctx
    } else {
      throw new Error("Context Not defined yet.")
    }
  }

  set(newCtx: T) {
    this.ctx = newCtx
  }

  static empty<T>(): TestContext<T> {
    return new SimpleTestContext<T>()
  }

  public get page(): Page {
    return (this.ctx! as any).page as Page
  }
}

export type Action<Data> = (data: TestContext<Data>) => Promise<void>
type CheckExpectedResult<Data> = Action<Data>

export abstract class TestStep<D extends TestData> {
  description: string
  total_action: number = 0

  protected constructor(description: string, total_action: number = 0) {
    this.description = description
    this.total_action = total_action
  }

  async action(ctx: TestContext<D>): Promise<void> {
    this.total_action++
    await this.doAction(ctx)
  }

  abstract doAction(ctx: TestContext<D>): Promise<void>

  public fullName(): string {
    return this.description
  }

  static actionCheck<T extends TestData>(
    description: string,
    params: { action?: Action<T>; checker?: CheckExpectedResult<T> }
  ): PairTestStep<T> {
    return new PairTestStep(description, params.action, params.checker)
  }

  static simple<T extends TestData>(
    description: string,
    action: Action<T>
  ): SimpleTestStep<T> {
    return new SimpleTestStep(description, action)
  }
}

class SimpleTestStep<D extends TestData> extends TestStep<D> {
  _action: Action<D>

  constructor(description: string, action: Action<D>) {
    super(description)
    this._action = action
  }

  async doAction(ctx: TestContext<D>): Promise<void> {
    await this._action(ctx)
  }
}

class PairTestStep<D extends TestData> extends TestStep<D> {
  _action?: Action<D>
  _checker?: CheckExpectedResult<D>

  constructor(
    description: string,
    action?: Action<D>,
    checker?: CheckExpectedResult<D>
  ) {
    super(description)
    this._action = action
    this._checker = checker
  }

  async doAction(ctx: TestContext<D>): Promise<void> {
    if (this._action) {
      await test.step("Action", () => this._action!(ctx))
    }
    if (this._checker) {
      await test.step("Check", () => this._checker!(ctx))
    }
  }
}

let testCaseRunningNo = 0
type TestCaseCoverage = Record<string, number>

export class TestCaseRegistry {
  testCases: Record<string, TestCase<TestData>>

  constructor(testCases: Record<string, TestCase<TestData>> = {}) {
    this.testCases = testCases
  }

  register(testcase: TestCase<TestData>) {
    if (this.testCases[testcase.id]) {
      throw new Error(`Duplicate Registration for ${testcase.id}`)
    }
    this.testCases[testcase.id] = testcase
  }

  coverage(): TestCaseCoverage {
    const cov: TestCaseCoverage = {}
    for (const [id, testCase] of Object.entries(this.testCases)) {
      cov[id] = testCase.total_action
    }
    return cov
  }

  private idSortFunction(a: string, b: string) {
    if (a.includes("-") && b.includes("-")) {
      const intA = parseInt(a.split("-")[1])
      const intB = parseInt(b.split("-")[1])
      return intA - intB
    } else if (a.includes("-") && !b.includes("-")) {
      return -1
    } else if (!a.includes("-") && b.includes("-")) {
      return 1
    } else {
      return a.localeCompare(b)
    }
  }

  coverageSummary(): {
    totalTestCase: number
    coveredTestCase: number
    placeholder: number
  } {
    let coveredTest = 0
    let placeholder = 0
    for (let tc of Object.values(this.testCases)) {
      coveredTest += tc.total_action > 0 ? 1 : 0
      placeholder += tc.placeholder ? 1 : 0
    }
    return {
      totalTestCase: Object.keys(this.testCases).length,
      coveredTestCase: coveredTest,
      placeholder: placeholder,
    }
  }

  printCoverage() {
    const sortedKeys: Array<string> = Object.keys(this.testCases).sort(
      this.idSortFunction
    )

    const red = (s: string) => `\x1b[31m${s}\x1b[0m`
    const green = (s: string) => `\x1b[32m${s}\x1b[0m`
    const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`
    console.log(
      `${"No".padStart(3)} | ${"n".padStart(3)} | ${"ID".padEnd(
        10
      )} | Description`
    )

    for (const i in sortedKeys) {
      const no = (parseInt(i) + 1).toString()
      const key = sortedKeys[i]
      const tc = this.testCases[key]
      const total = tc.total_action
      const color = total == 0 ? red : green
      const totalText = color(total.toString().padStart(3))
      const desc = tc.description
      console.log(
        `${no.padStart(3)} | ${totalText} | ${key.padEnd(10)} | ${desc}`
      )
    }
    const summary = this.coverageSummary()
    const percentage = (
      (summary.coveredTestCase / summary.totalTestCase) *
      100
    ).toFixed(2)
    console.log(
      yellow(
        `Summary: ${summary.coveredTestCase}/${summary.totalTestCase} (${percentage}%)`
      )
    )
    console.log(`Placeholder: ${summary.placeholder}`)
  }
}

export const testcaseRegistry = new TestCaseRegistry()

export interface TestRunnerOption {
  stepOnly?: boolean
}

type TestStepsLike<D extends TestData> =
  | Array<TestStep<D>>
  | TestStep<D>
  | Action<D>

interface TestCaseOptions {
  skipRegistration?: boolean
  idempotent?: boolean
  placeHolder?: boolean
}

export class TestCase<D extends TestData> extends TestStep<D> {
  id: string
  description: string
  prerequisite: Array<TestCase<Partial<D> & TestData>>
  steps: Array<TestStep<Partial<D> & TestData>>
  idempotent: boolean
  placeholder: boolean

  constructor(
    id: string,
    description: string,
    prerequisite: Array<TestCase<D>>,
    steps: TestStepsLike<D>,
    idempotent: boolean,
    placeholder: boolean = false
  ) {
    super(description)
    this.id = id
    this.description = description
    this.prerequisite = prerequisite
    this.steps = this.normalizeSteps(steps)
    this.idempotent = idempotent
    this.placeholder = placeholder
  }

  private normalizeSteps(
    steps: TestStepsLike<D>
  ): Array<TestStep<Partial<D> & TestData>> {
    if (steps instanceof Array<TestStep<D>>) {
      return steps
    } else if (steps instanceof TestStep<D>) {
      return [steps]
    } else {
      return [TestStep.simple("Steps", steps)]
    }
  }

  /**
   * Copy the test step but change only id and description.
   * (and perhaps prerequisite if specified)
   * @param id
   * @param description
   * @param prerequisite
   */
  alias(
    id: string,
    description: string,
    prerequisite?: Array<TestCase<D>>
  ): TestCase<D> {
    return new TestCase(
      id,
      description,
      prerequisite || this.prerequisite,
      this.steps,
      this.idempotent
    )
  }

  async doAction(ctx: TestContext<D>): Promise<void> {
    await this.doPrerequisiteAction(ctx)
    await this.doStepOnlyAction(ctx)
  }

  async doStepOnlyAction(ctx: TestContext<D>): Promise<void> {
    for (let step of this.steps) {
      await test.step(step.fullName(), async () => {
        await step.action(ctx)
      })
    }
  }

  async doPrerequisiteAction(ctx: TestContext<D>): Promise<void> {
    for (let step of this.prerequisite) {
      await test.step(step.fullName(), async () => {
        await step.action(ctx)
      })
    }
  }

  testRunner(
    ctx: TestContext<D>,
    options?: TestRunnerOption
  ): () => Promise<void> {
    return async () => {
      if (options?.stepOnly) {
        this.total_action += 1
        await this.doStepOnlyAction(ctx)
      } else {
        await this.action(ctx)
      }
    }
  }

  fullName(): string {
    return `[${this.id}] ${this.description}`
  }

  /**
   * Make a tuple of [testName, testFunction]
   * where testFunction includes both the prerequisite and steps
   * The intended use is test(...myTestCase.withName(ctx))
   * @param ctx
   * @param options
   */
  withName(
    ctx: TestContext<D>,
    options?: TestRunnerOption
  ): [string, () => Promise<void>] {
    testCaseRunningNo += 1
    return [
      `(${testCaseRunningNo})${this.fullName()}`,
      this.testRunner(ctx, options),
    ]
  }

  /**
   * Make tuple of [testName, testFunction]
   * where testFunction includes both the prerequisite and steps
   * The intended use is test(...myTestCase.withNameStepOnly(ctx)).
   * chainTest relies heavily on this.
   * @param ctx
   * @param options
   */
  withNameStepOnly(
    ctx: TestContext<D>,
    options?: TestRunnerOption
  ): [string, () => Promise<void>] {
    const op = { ...(options || {}), stepOnly: true }
    return this.withName(ctx, op)
  }

  register(): this {
    testcaseRegistry.register(this)
    return this
  }

  /**
   * Create and register idempotent test.
   * Idempotent test is defined as a test that does not change the state.
   * Ex. Fill invalid information check that program complains and remove everything.
   * @param id
   * @param description
   * @param prerequisite
   * @param steps
   * @param options
   */
  static idempotent<D extends TestData>(
    id: string,
    description: string,
    prerequisite: Array<TestCase<D>>,
    steps: TestStepsLike<D>,
    options?: TestCaseOptions
  ): TestCase<D> {
    const tc = new TestCase(
      id,
      description,
      prerequisite,
      steps,
      true,
      !!options?.placeHolder
    )
    if (!options?.skipRegistration) {
      tc.register()
    }
    return tc
  }

  /**
   * Create and register a breaking test.
   * Any test that change the state "significantly" is a breaking change
   * @param id
   * @param description
   * @param prerequisite
   * @param steps
   * @param options
   */
  static breaking<D extends TestData>(
    id: string,
    description: string,
    prerequisite: Array<TestCase<D>>,
    steps: TestStepsLike<D>,
    options?: TestCaseOptions
  ): TestCase<D> {
    const tc = new TestCase(
      id,
      description,
      prerequisite,
      steps,
      false,
      !!options?.placeHolder
    )
    if (!options?.skipRegistration) {
      tc.register()
    }
    return tc
  }

  static placeholder<D extends TestData>(
    id: string,
    description: string,
    prerequisite?: Array<TestCase<D>>,
    steps?: TestStepsLike<D>
  ): TestCase<D> {
    const _prereq = prerequisite || []
    const _steps = steps || TestStep.simple("Blank", async () => {})
    return new TestCase(id, description, _prereq, _steps, true, true).register()
  }
}

/**
 * Create a chain test.
 * The first test in the list will
 * be run with both prerequisite and the steps.
 * The subsequent tests will be run only with its own steps.
 * @param ctx
 * @param testCases
 */
export function chainTest<D extends TestData>(
  ctx: TestContext<D>,
  testCases: Array<TestCase<D>>
) {
  let first = true
  for (let testCase of testCases) {
    if (first) {
      test(...testCase.withName(ctx))
      first = false
    } else {
      test(...testCase.withNameStepOnly(ctx))
    }
  }
}

/**
 * Test Step that just Pause 2 seconds.
 */
export const PAUSE = TestCase.idempotent(
  "Pause",
  "Let's wait a bit. 2 Sec",
  [],
  async (ctx) => {
    await ctx.page.waitForTimeout(2000)
  },
  { skipRegistration: true }
)
