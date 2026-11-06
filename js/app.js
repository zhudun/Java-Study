(function () {
  "use strict";

  var KEY = "java-study.v1";
  var topics = Curriculum.topics;
  var domains = Curriculum.domains;
  var ui = { route: "today", error: "", answer: "", shaky: "", next: "", identity: "" };

  function today() {
    return Study.todayKey(new Date());
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return Study.freshState(today());
      return Study.sanitize(JSON.parse(raw), today());
    } catch (e) {
      return Study.freshState(today());
    }
  }

  var state = load();

  function save() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function passedCount() {
    return topics.filter(function (topic) { return state.passed[topic.id]; }).length;
  }

  function route() {
    var h = (location.hash || "#today").slice(1);
    ui.route = { today: 1, map: 1, identity: 1, review: 1 }[h] ? h : "today";
  }

  function welcome() {
    return '<section class="card">' +
      "<h1>重学 Java</h1>" +
      '<p class="who">' + esc(state.identity) + "</p>" +
      "<p>每天只面对一道题。先用自己的话写下来，算出场。写清楚了，再标过关。连续缺席两天，就把票投回来。</p>" +
      '<div class="actions"><button type="button" class="btn btn-primary" data-action="begin">从 Java 基础开始</button></div>' +
      "</section>";
  }

  function viewToday() {
    if (!state.welcomed) return welcome();
    var topic = Study.nextTopic(topics, state);
    var html = '<p class="who">' + esc(state.identity) + "</p>";
    var misses = Study.trailingMisses(state, today());
    if (misses >= 2) {
      html += '<div class="warn"><p>已经连续缺席 ' + misses + " 天。今天把这一题写下来，票就投回来了。</p></div>";
    } else if (misses === 1) {
      html += '<div class="note"><p>昨天缺席了一次。今天写下来，就不算连续错过。</p></div>';
    }
    if (!topic) {
      return html + '<section class="card is-pass"><h1>111 题都过关了</h1><p>接下来去题库里抽题。基础在 questions/java-basics.md，热门在 questions/java-hot-200.md。</p></section>';
    }
    var domain = domains.find(function (item) { return item.id === topic.domain; });
    var answer = ui.answer || state.answers[topic.id] || "";
    var showed = (state.log[today()] || []).some(function (item) { return item.topicId === topic.id; });
    html += '<section class="card' + (showed ? " is-show" : "") + '">';
    html += '<p class="kicker">' + esc(domain ? domain.name : topic.domain) + " · " + esc(topic.id) + " · 还剩 " + (topics.length - passedCount()) + " 题</p>";
    html += "<h1>" + esc(topic.title) + "</h1>";
    html += "<p>先别翻笔记。用自己的话写下你还记得的。</p>";
    if (ui.error) html += '<div class="err"><p>' + esc(ui.error) + "</p></div>";
    if (showed) html += '<div class="note"><p>今天这题已经出场。想过关，就把要点写完整。</p></div>';
    html += '<form data-action="cast">' +
      '<label for="answer">我还记得</label>' +
      '<textarea id="answer" name="answer">' + esc(answer) + "</textarea>" +
      '<div class="actions">' +
      '<button type="submit" class="btn btn-line" name="status" value="show">两分钟出场</button>' +
      '<button type="submit" class="btn btn-primary" name="status" value="pass">这题过关</button>' +
      "</div></form>";
    if (topic.notes && topic.notes.length) {
      html += "<details><summary>上次留下的要点</summary>" +
        topic.notes.map(function (note) { return "<p>" + esc(note) + "</p>"; }).join("") +
        "</details>";
    }
    if (topic.lastStudied) html += '<p class="hint">上次学过 ' + esc(topic.lastStudied) + "</p>";
    html += "</section>";
    return html;
  }

  function viewMap() {
    var board = Study.domainBoard(domains, topics, state);
    var current = Study.nextTopic(topics, state);
    var html = "<h1>学习地图</h1><p>过关 " + passedCount() + " / " + topics.length + "。今天做排在最前面的那一题。</p>";
    board.forEach(function (domain) {
      var width = domain.total ? Math.round(domain.passed / domain.total * 100) : 0;
      html += '<section class="card"><h2>' + esc(domain.id) + ". " + esc(domain.name) + "</h2>";
      html += '<div class="bar"><span style="width:' + width + '%"></span></div>';
      html += '<p class="quiet">' + domain.passed + " / " + domain.total + "</p>";
      domain.topics.forEach(function (topic) {
        var done = state.passed[topic.id];
        var now = current && current.id === topic.id;
        html += '<div class="topic-row' + (now ? " is-now" : "") + '"><span>' + esc(topic.id) + " " + esc(topic.title) + "</span><span class=\"" + (done ? "pass" : "wait") + "\">" + (done ? "过关 " + esc(done) : (now ? "今天" : "需重学")) + "</span></div>";
      });
      html += "</section>";
    });
    return html;
  }

  function viewIdentity() {
    var days = Study.recentDays(state, today(), 8);
    var html = "<h1>身份</h1>" +
      '<form data-action="save-identity" class="card">' +
      "<label for=\"identity\">写成一句你愿意每天投票的话</label>" +
      '<input id="identity" name="identity" type="text" maxlength="42" value="' + esc(ui.identity || state.identity) + '">' +
      (ui.error ? '<div class="err"><p>' + esc(ui.error) + "</p></div>" : "") +
      '<div class="actions"><button type="submit" class="btn btn-primary">保存</button></div></form>';
    html += '<section class="card"><h2>最近的票</h2>';
    html += days.length ? days.map(function (day) {
      var last = day.entries[day.entries.length - 1];
      var topic = topics.find(function (item) { return item.id === last.topicId; });
      return '<div class="day-row"><span>' + esc(Study.formatCN(day.date)) + "</span><span>" + esc(topic ? topic.title : last.topicId) + " · " + (last.status === "pass" ? "过关" : "出场") + "</span></div>";
    }).join("") : "<p>还没有记录。</p>";
    html += "</section>";
    html += '<section class="card"><h2>备份</h2><p class="quiet">进度只存在这台浏览器里。</p>' +
      '<div class="actions"><button type="button" class="btn btn-line" data-action="export">导出</button>' +
      '<label class="btn btn-ghost">导入<input type="file" accept="application/json" data-action="import" hidden></label></div></section>';
    return html;
  }

  function viewReview() {
    var week = Study.weekSummary(state, topics, today());
    var existing = state.reviews.find(function (item) { return item.weekStart === week.start; });
    var html = "<h1>本周</h1><p>" + esc(Study.formatCN(week.start)) + " 起。出场 " + week.showed + " 天，缺席 " + week.missed + " 天，过关 " + week.passed.length + " 题。</p>";
    if (week.passed.length) {
      html += "<p>" + week.passed.map(function (topic) { return esc(topic.title); }).join("、") + "</p>";
    }
    html += '<form data-action="save-review" class="card">' +
      "<label for=\"shaky\">哪一题其实没真懂</label>" +
      '<textarea id="shaky" name="shaky">' + esc(ui.shaky || (existing && existing.shaky) || "") + "</textarea>" +
      "<label for=\"next\">明天继续哪一块</label>" +
      '<textarea id="next" name="next">' + esc(ui.next || (existing && existing.next) || "") + "</textarea>" +
      '<div class="actions"><button type="submit" class="btn btn-primary">保存本周</button></div></form>';
    return html;
  }

  function nav() {
    var items = [["today", "今天"], ["map", "地图"], ["identity", "身份"], ["review", "本周"]];
    return items.map(function (item) {
      var badge = item[0] === "map" ? '<span class="badge">' + passedCount() + "</span>" : "";
      return '<a href="#' + item[0] + '"' + (ui.route === item[0] ? ' aria-current="page"' : "") + ">" + item[1] + badge + "</a>";
    }).join("");
  }

  function render() {
    route();
    var body = ui.route === "map" ? viewMap() : ui.route === "identity" ? viewIdentity() : ui.route === "review" ? viewReview() : viewToday();
    document.getElementById("app").innerHTML =
      '<div class="app"><aside class="side"><a class="brand" href="#today">重学</a><p class="brand-sub">每天一题</p><nav class="nav">' +
      nav() + '</nav></aside><main>' + body + "</main></div>";
  }

  document.addEventListener("input", function (event) {
    var t = event.target;
    if (!t.name) return;
    if (t.name === "answer") ui.answer = t.value;
    if (t.name === "shaky") ui.shaky = t.value;
    if (t.name === "next") ui.next = t.value;
    if (t.name === "identity") ui.identity = t.value;
  });

  document.addEventListener("click", function (event) {
    var button = event.target.closest("[data-action]");
    if (!button || button.tagName === "FORM") return;
    if (button.getAttribute("data-action") === "begin") {
      state.welcomed = true;
      state.startDate = today();
      ui.error = "";
      save();
      render();
    }
    if (button.getAttribute("data-action") === "export") {
      var blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      var link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "java-study-" + today() + ".json";
      link.click();
      URL.revokeObjectURL(link.href);
    }
  });

  document.addEventListener("change", function (event) {
    var input = event.target;
    if (input.getAttribute("data-action") !== "import" || !input.files || !input.files[0]) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        state = Study.sanitize(JSON.parse(String(reader.result || "")), today());
        ui.error = "";
        save();
        render();
      } catch (e) {
        ui.error = "这份备份读不了。";
        render();
      }
    };
    reader.readAsText(input.files[0]);
  });

  document.addEventListener("submit", function (event) {
    var form = event.target;
    var action = form.getAttribute("data-action");
    if (!action) return;
    event.preventDefault();
    if (action === "cast") {
      var submitter = event.submitter;
      var status = submitter ? submitter.value : "show";
      var topic = Study.nextTopic(topics, state);
      var result = Study.cast(state, topics, today(), topic.id, status, ui.answer || form.elements.answer.value);
      if (!result.ok) {
        ui.error = result.error;
        ui.answer = form.elements.answer.value;
      } else {
        state = result.state;
        ui.error = "";
        ui.answer = "";
        save();
      }
      render();
    }
    if (action === "save-identity") {
      var statement = Study.normalizeIdentity(form.elements.identity.value);
      if (Study.identityTooThin(statement)) {
        ui.error = "这句话还太短。写成「我是一个……的人」。";
        ui.identity = form.elements.identity.value;
      } else {
        state.identity = statement;
        ui.identity = "";
        ui.error = "";
        save();
      }
      render();
    }
    if (action === "save-review") {
      var week = Study.weekRange(today()).start;
      var review = {
        weekStart: week,
        shaky: form.elements.shaky.value.trim(),
        next: form.elements.next.value.trim()
      };
      state.reviews = state.reviews.filter(function (item) { return item.weekStart !== week; }).concat(review);
      ui.shaky = "";
      ui.next = "";
      save();
      render();
    }
  });

  window.addEventListener("hashchange", render);
  render();
})();
