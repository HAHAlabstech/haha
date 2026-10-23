const test = require("node:test");
const assert = require("node:assert/strict");
const { markTerminalFailure } = require("../worker/jobs/straightman");

test("Straight Man retries do not mark a bit failed before the final attempt", async () => {
  assert.equal(typeof markTerminalFailure, "function");
  let updates = 0;
  const db = {
    straightManAnswer: { async findUnique() { return null; } },
    bit: { async updateMany() { updates += 1; return { count: 1 }; } },
  };

  const marked = await markTerminalFailure({
    name: "straightman",
    attemptsMade: 4,
    opts: { attempts: 5 },
    data: { bitId: "bit-1" },
  }, db);

  assert.equal(marked, false);
  assert.equal(updates, 0);
});

test("exhausted Straight Man job marks the unanswered bit terminally failed", async () => {
  let updateArgs;
  const db = {
    straightManAnswer: { async findUnique() { return null; } },
    bit: { async updateMany(args) { updateArgs = args; return { count: 1 }; } },
  };

  const marked = await markTerminalFailure({
    name: "straightman",
    attemptsMade: 5,
    opts: { attempts: 5 },
    data: { bitId: "bit-1" },
  }, db);

  assert.equal(marked, true);
  assert.deepEqual(updateArgs, {
    where: { id: "bit-1", status: "answered" },
    data: { status: "straightman_failed" },
  });
});

test("exhausted job does not mark a bit failed if the answer was stored", async () => {
  let updates = 0;
  const db = {
    straightManAnswer: { async findUnique() { return { id: "answer-1" }; } },
    bit: { async updateMany() { updates += 1; return { count: 1 }; } },
  };

  const marked = await markTerminalFailure({
    name: "straightman",
    attemptsMade: 5,
    opts: { attempts: 5 },
    data: { bitId: "bit-1" },
  }, db);

  assert.equal(marked, false);
  assert.equal(updates, 0);
});
