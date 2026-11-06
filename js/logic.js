(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Study = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SHOW_MIN = 2;
  const PASS_MIN = 12;
  const DEFAULT_IDENTITY = "我是一个每天把 Java 学扎实的人";

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function todayKey(date) {
    const d = date || new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function parseKey(key) {
    const parts = String(key).split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function addDays(key, n) {
    const d = parseKey(key);
    d.setDate(d.getDate() + n);
    return todayKey(d);
  }

  function weekday(key) {
    return parseKey(key).getDay();
  }

  function mondayOf(key) {
    const day = weekday(key);
    const diff = day === 0 ? -6 : 1 - day;
    return addDays(key, diff);
  }

  function formatCN(key) {
    const d = parseKey(key);
    return d.getMonth() + 1 + "月" + d.getDate() + "日 · 周" + "日一二三四五六"[d.getDay()];
  }

  function freshState(today) {
    return {
      version: 1,
      createdAt: new Date().toISOString(),
      startDate: today,
      identity: DEFAULT_IDENTITY,
      welcomed: false,
      passed: {},
      answers: {},
      log: {},
      reviews: []
    };
  }

  function normalizeIdentity(s) {
    let t = String(s || "").trim().replace(/[。．.\s]+$/g, "");
    if (!t) return "";
    if (t.startsWith("我")) return t;
    if (t.startsWith("一个")) return "我是" + t;
    return "我是一个" + t;
  }

  function identityTooThin(s) {
    const t = normalizeIdentity(s);
    return t.length < 6 || t === "我是" || t === "我是一个" || t === "我是那种";
  }

  function nextTopic(topics, state) {
    return (topics || []).find(function (topic) {
      return !state.passed[topic.id];
    }) || null;
  }

  function entries(state, key) {
    const list = state.log && state.log[key];
    return Array.isArray(list) ? list : [];
  }

  function showedOn(state, key) {
    return entries(state, key).some(function (item) {
      return item.status === "show" || item.status === "pass";
    });
  }

  function trailingMisses(state, today) {
    if (!state.welcomed || !state.startDate) return 0;
    let n = 0;
    let day = addDays(today, -1);
    while (day >= state.startDate) {
      if (showedOn(state, day)) break;
      n += 1;
      day = addDays(day, -1);
    }
    return n;
  }

  function cast(state, topics, today, topicId, status, answer) {
    const text = String(answer || "").trim();
    const topic = (topics || []).find(function (item) { return item.id === topicId; });
    if (!topic) return { ok: false, error: "没有这道题。" };
    if (state.passed[topicId]) return { ok: false, error: "这题已经过关。" };
    const current = nextTopic(topics, state);
    if (!current || current.id !== topicId) return { ok: false, error: "先把排在前面的题写完。" };
    if (status !== "show" && status !== "pass") return { ok: false, error: "只能记出场或过关。" };
    const min = status === "pass" ? PASS_MIN : SHOW_MIN;
    if (text.length < min) {
      return {
        ok: false,
        error: status === "pass"
          ? "过关要写下能复述的要点。只记得几个字的话，先记两分钟出场。"
          : "先写下一句你还记得的。"
      };
    }
    const entry = { topicId: topicId, status: status, answer: text, at: new Date().toISOString() };
    const day = entries(state, today).concat(entry);
    const log = Object.assign({}, state.log, { [today]: day });
    const answers = Object.assign({}, state.answers, { [topicId]: text });
    const passed = Object.assign({}, state.passed);
    if (status === "pass") passed[topicId] = today;
    return {
      ok: true,
      state: Object.assign({}, state, { log: log, answers: answers, passed: passed, welcomed: true })
    };
  }

  function weekRange(today) {
    const start = mondayOf(today);
    return { start: start, end: addDays(start, 6) };
  }

  function weekSummary(state, topics, today) {
    const range = weekRange(today);
    let showed = 0;
    let missed = 0;
    let day = range.start;
    while (day <= range.end) {
      const started = state.welcomed && state.startDate && day >= state.startDate;
      if (started && day <= today) {
        if (showedOn(state, day)) showed += 1;
        else if (day < today) missed += 1;
      }
      day = addDays(day, 1);
    }
    const passed = (topics || []).filter(function (topic) {
      const when = state.passed[topic.id];
      return when && when >= range.start && when <= range.end;
    });
    return { start: range.start, end: range.end, showed: showed, missed: missed, passed: passed };
  }

  function domainBoard(domains, topics, state) {
    return (domains || []).map(function (domain) {
      const list = (topics || []).filter(function (topic) { return topic.domain === domain.id; });
      const passed = list.filter(function (topic) { return state.passed[topic.id]; }).length;
      return { id: domain.id, name: domain.name, total: list.length, passed: passed, topics: list };
    });
  }

  function recentDays(state, today, limit) {
    const out = [];
    let day = today;
    const stop = state.startDate || today;
    while (day >= stop && out.length < limit) {
      const list = entries(state, day);
      if (list.length) out.push({ date: day, entries: list });
      day = addDays(day, -1);
    }
    return out;
  }

  function sanitize(data, today) {
    const base = freshState(today);
    if (!data || typeof data !== "object") return base;
    const passed = {};
    if (data.passed && typeof data.passed === "object") {
      Object.keys(data.passed).forEach(function (id) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(String(data.passed[id]))) passed[id] = String(data.passed[id]);
      });
    }
    const answers = {};
    if (data.answers && typeof data.answers === "object") {
      Object.keys(data.answers).forEach(function (id) {
        const text = String(data.answers[id] || "").trim();
        if (text) answers[id] = text.slice(0, 2000);
      });
    }
    const log = {};
    if (data.log && typeof data.log === "object") {
      Object.keys(data.log).forEach(function (key) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !Array.isArray(data.log[key])) return;
        log[key] = data.log[key].filter(function (item) {
          return item && (item.status === "show" || item.status === "pass") && item.topicId;
        }).map(function (item) {
          return {
            topicId: String(item.topicId),
            status: item.status,
            answer: String(item.answer || "").slice(0, 2000),
            at: String(item.at || "")
          };
        });
      });
    }
    const reviews = Array.isArray(data.reviews) ? data.reviews.filter(function (item) {
      return item && /^\d{4}-\d{2}-\d{2}$/.test(String(item.weekStart || ""));
    }).map(function (item) {
      return {
        weekStart: String(item.weekStart),
        shaky: String(item.shaky || "").slice(0, 400),
        next: String(item.next || "").slice(0, 400)
      };
    }) : [];
    const identity = normalizeIdentity(data.identity || DEFAULT_IDENTITY);
    return {
      version: 1,
      createdAt: typeof data.createdAt === "string" ? data.createdAt : base.createdAt,
      startDate: /^\d{4}-\d{2}-\d{2}$/.test(String(data.startDate || "")) ? String(data.startDate) : today,
      identity: identityTooThin(identity) ? DEFAULT_IDENTITY : identity,
      welcomed: !!data.welcomed,
      passed: passed,
      answers: answers,
      log: log,
      reviews: reviews
    };
  }

  return {
    SHOW_MIN: SHOW_MIN,
    PASS_MIN: PASS_MIN,
    DEFAULT_IDENTITY: DEFAULT_IDENTITY,
    todayKey: todayKey,
    addDays: addDays,
    mondayOf: mondayOf,
    formatCN: formatCN,
    freshState: freshState,
    normalizeIdentity: normalizeIdentity,
    identityTooThin: identityTooThin,
    nextTopic: nextTopic,
    showedOn: showedOn,
    trailingMisses: trailingMisses,
    cast: cast,
    weekRange: weekRange,
    weekSummary: weekSummary,
    domainBoard: domainBoard,
    recentDays: recentDays,
    sanitize: sanitize
  };
});
