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
Object.defineProperty(exports, "__esModule", { value: true })
exports.PAUSE =
  exports.chainTest =
  exports.TestCase =
  exports.testcaseRegistry =
  exports.TestCaseRegistry =
  exports.TestStep =
  exports.SimpleTestContext =
    void 0
const test_1 = require("@playwright/test")
class SimpleTestContext {
  constructor(ctx) {
    this.ctx = ctx
  }
  get() {
    if (this.ctx) {
      return this.ctx
    } else {
      throw new Error("Context Not defined yet.")
    }
  }
  set(newCtx) {
    this.ctx = newCtx
  }
  static empty() {
    return new SimpleTestContext()
  }
  get page() {
    return this.ctx.page
  }
}
exports.SimpleTestContext = SimpleTestContext
class TestStep {
  constructor(description, total_action = 0) {
    this.total_action = 0
    this.description = description
    this.total_action = total_action
  }
  action(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
      this.total_action++
      yield this.doAction(ctx)
    })
  }
  fullName() {
    return this.description
  }
  static actionCheck(description, params) {
    return new PairTestStep(description, params.action, params.checker)
  }
  static simple(description, action) {
    return new SimpleTestStep(description, action)
  }
}
exports.TestStep = TestStep
class SimpleTestStep extends TestStep {
  constructor(description, action) {
    super(description)
    this._action = action
  }
  doAction(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
      yield this._action(ctx)
    })
  }
}
class PairTestStep extends TestStep {
  constructor(description, action, checker) {
    super(description)
    this._action = action
    this._checker = checker
  }
  doAction(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
      if (this._action) {
        yield test_1.test.step("Action", () => this._action(ctx))
      }
      if (this._checker) {
        yield test_1.test.step("Check", () => this._checker(ctx))
      }
    })
  }
}
let testCaseRunningNo = 0
class TestCaseRegistry {
  constructor(testCases = {}) {
    this.testCases = testCases
  }
  register(testcase) {
    if (this.testCases[testcase.id]) {
      throw new Error(`Duplicate Registration for ${testcase.id}`)
    }
    this.testCases[testcase.id] = testcase
  }
  coverage() {
    const cov = {}
    for (const [id, testCase] of Object.entries(this.testCases)) {
      cov[id] = testCase.total_action
    }
    return cov
  }
  idSortFunction(a, b) {
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
  coverageSummary() {
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
    const sortedKeys = Object.keys(this.testCases).sort(this.idSortFunction)
    const red = (s) => `\x1b[31m${s}\x1b[0m`
    const green = (s) => `\x1b[32m${s}\x1b[0m`
    const yellow = (s) => `\x1b[33m${s}\x1b[0m`
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
exports.TestCaseRegistry = TestCaseRegistry
exports.testcaseRegistry = new TestCaseRegistry()
class TestCase extends TestStep {
  constructor(
    id,
    description,
    prerequisite,
    steps,
    idempotent,
    placeholder = false
  ) {
    super(description)
    this.id = id
    this.description = description
    this.prerequisite = prerequisite
    this.steps = this.normalizeSteps(steps)
    this.idempotent = idempotent
    this.placeholder = placeholder
  }
  normalizeSteps(steps) {
    if (steps instanceof Array) {
      return steps
    } else if (steps instanceof TestStep) {
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
  alias(id, description, prerequisite) {
    return new TestCase(
      id,
      description,
      prerequisite || this.prerequisite,
      this.steps,
      this.idempotent
    )
  }
  doAction(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
      yield this.doPrerequisiteAction(ctx)
      yield this.doStepOnlyAction(ctx)
    })
  }
  doStepOnlyAction(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
      for (let step of this.steps) {
        yield test_1.test.step(step.fullName(), () =>
          __awaiter(this, void 0, void 0, function* () {
            yield step.action(ctx)
          })
        )
      }
    })
  }
  doPrerequisiteAction(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
      for (let step of this.prerequisite) {
        yield test_1.test.step(step.fullName(), () =>
          __awaiter(this, void 0, void 0, function* () {
            yield step.action(ctx)
          })
        )
      }
    })
  }
  testRunner(ctx, options) {
    return () =>
      __awaiter(this, void 0, void 0, function* () {
        if (
          options === null || options === void 0 ? void 0 : options.stepOnly
        ) {
          this.total_action += 1
          yield this.doStepOnlyAction(ctx)
        } else {
          yield this.action(ctx)
        }
      })
  }
  fullName() {
    return `[${this.id}] ${this.description}`
  }
  /**
   * Make a tuple of [testName, testFunction]
   * where testFunction includes both the prerequisite and steps
   * The intended use is test(...myTestCase.withName(ctx))
   * @param ctx
   * @param options
   */
  withName(ctx, options) {
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
  withNameStepOnly(ctx, options) {
    const op = Object.assign(Object.assign({}, options || {}), {
      stepOnly: true,
    })
    return this.withName(ctx, op)
  }
  register() {
    exports.testcaseRegistry.register(this)
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
  static idempotent(id, description, prerequisite, steps, options) {
    const tc = new TestCase(
      id,
      description,
      prerequisite,
      steps,
      true,
      !!(options === null || options === void 0 ? void 0 : options.placeHolder)
    )
    if (
      !(options === null || options === void 0
        ? void 0
        : options.skipRegistration)
    ) {
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
  static breaking(id, description, prerequisite, steps, options) {
    const tc = new TestCase(
      id,
      description,
      prerequisite,
      steps,
      false,
      !!(options === null || options === void 0 ? void 0 : options.placeHolder)
    )
    if (
      !(options === null || options === void 0
        ? void 0
        : options.skipRegistration)
    ) {
      tc.register()
    }
    return tc
  }
  static placeholder(id, description, prerequisite, steps) {
    const _prereq = prerequisite || []
    const _steps =
      steps ||
      TestStep.simple("Blank", () =>
        __awaiter(this, void 0, void 0, function* () {})
      )
    return new TestCase(id, description, _prereq, _steps, true, true).register()
  }
}
exports.TestCase = TestCase
/**
 * Create a chain test.
 * The first test in the list will
 * be run with both prerequisite and the steps.
 * The subsequent tests will be run only with its own steps.
 * @param ctx
 * @param testCases
 */
function chainTest(ctx, testCases) {
  let first = true
  for (let testCase of testCases) {
    if (first) {
      ;(0, test_1.test)(...testCase.withName(ctx))
      first = false
    } else {
      ;(0, test_1.test)(...testCase.withNameStepOnly(ctx))
    }
  }
}
exports.chainTest = chainTest
/**
 * Test Step that just Pause 2 seconds.
 */
exports.PAUSE = TestCase.idempotent(
  "Pause",
  "Let's wait a bit. 2 Sec",
  [],
  (ctx) =>
    __awaiter(void 0, void 0, void 0, function* () {
      yield ctx.page.waitForTimeout(2000)
    }),
  { skipRegistration: true }
)
