const assert = require("assert");
const Study = require("../js/logic.js");
const Curriculum = require("../js/curriculum.js");

const topics = Curriculum.topics;
const today = "2026-11-06";

const first = Study.nextTopic(topics, Study.freshState(today));
assert.strictEqual(first.id, "A.1");

let state = Study.freshState(today);
state.welcomed = true;
const tooShort = Study.cast(state, topics, today, "A.1", "pass", "int");
assert.strictEqual(tooShort.ok, false);

const showed = Study.cast(state, topics, today, "A.1", "show", "有 8 种");
assert.strictEqual(showed.ok, true);
assert.strictEqual(Study.nextTopic(topics, showed.state).id, "A.1");
assert.strictEqual(Study.trailingMisses(showed.state, today), 0);

const passed = Study.cast(showed.state, topics, today, "A.1", "pass", "byte short int long float double char boolean");
assert.strictEqual(passed.ok, true);
assert.strictEqual(passed.state.passed["A.1"], today);
assert.strictEqual(Study.nextTopic(topics, passed.state).id, "A.2");

const skipped = Study.cast(passed.state, topics, today, "B.8", "show", "封装继承多态都记得");
assert.strictEqual(skipped.ok, false);

state = Study.freshState("2026-11-04");
state.welcomed = true;
state.log["2026-11-04"] = [{ topicId: "A.1", status: "show", answer: "记得一点", at: "" }];
assert.strictEqual(Study.trailingMisses(state, "2026-11-06"), 1);

const week = Study.weekSummary(passed.state, topics, today);
assert.strictEqual(week.showed, 1);
assert.strictEqual(week.passed.length, 1);

const board = Study.domainBoard(Curriculum.domains, topics, passed.state);
assert.strictEqual(board[0].id, "A");
assert.strictEqual(board[0].passed, 1);
assert.strictEqual(board[0].total, 7);

const roundTrip = Study.sanitize(JSON.parse(JSON.stringify(passed.state)), today);
assert.strictEqual(roundTrip.passed["A.1"], today);
assert.strictEqual(Study.nextTopic(topics, roundTrip).id, "A.2");

console.log("logic tests ok", topics.length);
