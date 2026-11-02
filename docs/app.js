(function () {
  var CATEGORIES = [
    ["earnings", "決算"],
    ["macro", "経済指標"],
    ["politics", "政治・選挙"],
    ["market", "市場・取引時間"],
    ["ipo", "IPO（新規上場）"]
  ];

  // 略語の解説。表示の統一用にも使う。
  var GLOSSARY = [
    ["ISM", "Institute for Supply Management（米供給管理協会）の景気調査。50が好不況の目安。"],
    ["CPI", "Consumer Price Index（消費者物価指数）。"],
    ["FOMC", "Federal Open Market Committee（米連邦公開市場委員会）。議事要旨は会合内容の記録。"],
    ["OPEX", "オプション満期（Expiration）。月次は第3金曜日。"],
    ["S&P 500", "米大型株500種の株価指数。表記は「S&P 500」に統一。"],
    ["ET", "Eastern Time（米東部時間）。夏時間はEDT（UTC-4）、冬時間（11月〜3月初め）はEST（UTC-5）。"],
    ["JST", "Japan Standard Time（日本時間、UTC+9）。"]
  ];

  var DOW = ["月", "火", "水", "木", "金", "土", "日"];

  var app = document.getElementById("app");
  var asOfNode = document.getElementById("as-of");
  var currentMonth = null;

  var params = new URLSearchParams(location.search);
  var requested = params.get("month");
  if (requested && !/^\d{4}-\d{2}$/.test(requested)) requested = null;

  fetch("months.json")
    .then(function (response) {
      if (!response.ok) throw new Error("months.json を読めませんでした。");
      return response.json();
    })
    .then(function (months) {
      if (!months || !months.length) throw new Error("months.json に公開月がありません。");
      var entry = null;
      if (requested) {
        entry = months.filter(function (item) { return item.month === requested; })[0] || null;
      }
      var target = entry || months[months.length - 1];
      currentMonth = target.month;
      return fetch(target.file).then(function (response) {
        if (!response.ok) throw new Error(target.file + " を読めませんでした。");
        return response.json();
      });
    })
    .then(render)
    .catch(function (error) {
      app.innerHTML = "";
      var p = document.createElement("p");
      p.className = "status";
      p.textContent = error.message;
      app.appendChild(p);
    });

  function formatMonthLabel(ym) {
    var parts = ym.split("-");
    return parts[0] + "年" + Number(parts[1]) + "月";
  }

  function render(data) {
    asOfNode.textContent = data.asOf;
    asOfNode.setAttribute("datetime", data.asOf);
    var monthKey = data.month || currentMonth;
    if (monthKey) {
      var heading = formatMonthLabel(monthKey) + " 米国市場スイングカレンダー";
      document.title = heading;
      var h1 = document.querySelector(".page-head h1");
      if (h1) h1.textContent = heading;
    }
    app.innerHTML = "";

    var calendar = document.createElement("section");
    calendar.className = "calendar-col";
    calendar.appendChild(monthGrid(data));
    data.unconfirmed.forEach(function (item) {
      calendar.appendChild(unconfirmedCard(item));
    });
    calendar.appendChild(legend());
    calendar.appendChild(glossary());

    app.appendChild(calendar);

    var universeFile = "universe-" + (data.month || currentMonth) + ".json";
    fetch(universeFile)
      .then(function (response) {
        return response.ok ? response.json() : null;
      })
      .then(function (universe) {
        if (universe) calendar.appendChild(universeSection(universe));
      })
      .catch(function () {});

    var overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.hidden = true;
    var dialog = document.createElement("div");
    dialog.className = "detail modal";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    overlay.appendChild(dialog);
    app.appendChild(overlay);

    function closeModal() {
      overlay.hidden = true;
      calendar.querySelectorAll(".cell.selected").forEach(function (cell) {
        cell.classList.remove("selected");
      });
    }
    overlay.addEventListener("click", function (event) {
      if (event.target === overlay || event.target.closest("[data-close]")) closeModal();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !overlay.hidden) closeModal();
    });

    calendar.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-date]");
      if (!button) return;
      var date = button.getAttribute("data-date");
      calendar.querySelectorAll(".cell").forEach(function (cell) {
        cell.classList.toggle("selected", cell === button);
      });
      var events = data.events.filter(function (item) {
        return item.jstDate === date;
      });
      dialog.innerHTML = "";
      var close = document.createElement("button");
      close.type = "button";
      close.className = "modal-close";
      close.setAttribute("data-close", "");
      close.setAttribute("aria-label", "閉じる");
      close.textContent = "×";
      dialog.appendChild(close);
      dialog.appendChild(events.length ? dayDetail(date, events) : emptyDay(date));
      overlay.hidden = false;
    });
  }

  function legend() {
    var row = document.createElement("div");
    row.className = "legend";
    CATEGORIES.forEach(function (pair) {
      var span = document.createElement("span");
      var dot = document.createElement("i");
      dot.className = "dot " + pair[0];
      span.appendChild(dot);
      span.appendChild(document.createTextNode(pair[1]));
      row.appendChild(span);
    });
    return row;
  }

  function glossary() {
    var section = document.createElement("section");
    section.className = "glossary";
    var title = document.createElement("h2");
    title.textContent = "略語の解説";
    section.appendChild(title);
    var list = document.createElement("dl");
    GLOSSARY.forEach(function (pair) {
      var term = document.createElement("dt");
      term.textContent = pair[0];
      var desc = document.createElement("dd");
      desc.textContent = pair[1];
      list.appendChild(term);
      list.appendChild(desc);
    });
    section.appendChild(list);
    return section;
  }

  var UNIVERSE_STATUS = {
    confirmed: "確定",
    estimated: "推定",
    unconfirmed: "未確定",
    watch: "今月候補",
    none: "—"
  };

  function universeSection(universe) {
    var section = document.createElement("section");
    section.className = "universe";
    var title = document.createElement("h2");
    title.textContent = "対象銘柄と決算月";
    section.appendChild(title);
    if (universe.note) section.appendChild(paragraph(universe.note));
    var details = document.createElement("details");
    var summary = document.createElement("summary");
    var mag7Count = (universe.mag7 || []).length;
    var itCount = (universe.itTop50 || []).length;
    summary.textContent = "一覧を見る（Mag7 " + mag7Count + "社＋IT上位" + itCount + "社）";
    details.appendChild(summary);
    var table = document.createElement("table");
    var head = document.createElement("tr");
    ["銘柄", "Mag7", "平常の決算月", "今月の扱い"].forEach(function (label) {
      var th = document.createElement("th");
      th.textContent = label;
      head.appendChild(th);
    });
    table.appendChild(head);
    var mag7 = {};
    (universe.mag7 || []).forEach(function (item) {
      mag7[item.ticker] = true;
    });
    var seen = {};
    (universe.mag7 || []).concat(universe.itTop50 || []).forEach(function (item) {
      if (seen[item.ticker]) return;
      seen[item.ticker] = true;
      var tr = document.createElement("tr");
      var ticker = document.createElement("td");
      ticker.textContent = item.name + "(" + item.ticker + ")";
      tr.appendChild(ticker);
      var badge = document.createElement("td");
      badge.textContent = mag7[item.ticker] ? "●" : "—";
      tr.appendChild(badge);
      var months = document.createElement("td");
      months.textContent = item.months.join("・") + "月";
      tr.appendChild(months);
      var status = document.createElement("td");
      status.textContent = UNIVERSE_STATUS[item.thisMonth] || item.thisMonth;
      if (item.thisMonth && item.thisMonth !== "none") status.className = "st-" + item.thisMonth;
      tr.appendChild(status);
      table.appendChild(tr);
    });
    details.appendChild(table);
    section.appendChild(details);
    return section;
  }

  function unconfirmedCard(item) {
    var card = document.createElement("article");
    card.className = "unconfirmed";
    var details = document.createElement("details");
    var summary = document.createElement("summary");
    var kicker = document.createElement("span");
    kicker.className = "kicker";
    kicker.textContent = item.window + "・日付未確定";
    summary.appendChild(kicker);
    var title = document.createElement("span");
    title.className = "unconfirmed-title";
    title.textContent = item.name;
    summary.appendChild(title);
    var hint = document.createElement("span");
    hint.className = "unconfirmed-hint";
    hint.textContent = "詳細を見る";
    summary.appendChild(hint);
    details.appendChild(summary);
    var body = document.createElement("div");
    body.className = "unconfirmed-body";
    body.appendChild(paragraph(item.window + "。日付が確定したら、その日本時間の日付のマスへ移します。"));
    appendFields(body, item);
    body.appendChild(sourceLine(item));
    details.appendChild(body);
    card.appendChild(details);
    return card;
  }

  function monthGrid(data) {
    var grid = document.createElement("div");
    grid.className = "grid";
    DOW.forEach(function (label, index) {
      var cell = document.createElement("div");
      cell.className = "dow" + (index >= 5 ? " weekend" : "");
      cell.textContent = label;
      grid.appendChild(cell);
    });

    var byDate = {};
    data.events.forEach(function (item) {
      if (!byDate[item.jstDate]) byDate[item.jstDate] = [];
      byDate[item.jstDate].push(item);
    });

    var monthParts = (data.month || currentMonth).split("-");
    var targetYear = Number(monthParts[0]);
    var targetMonth = Number(monthParts[1]) - 1;
    var cursor = new Date(targetYear, targetMonth, 1);
    var lead = (cursor.getDay() + 6) % 7;
    cursor.setDate(1 - lead);
    for (var i = 0; i < 42; i += 1) {
      var inMonth = cursor.getMonth() === targetMonth && cursor.getFullYear() === targetYear;
      var iso = isoDate(cursor);
      if (inMonth) {
        var dayEvents = byDate[iso] || [];
        var isWeekend = cursor.getDay() === 0 || cursor.getDay() === 6;
        var isHoliday = dayEvents.some(function (item) {
          return item.category === "market" && item.jstTime === null;
        });
        var button = document.createElement("button");
        button.type = "button";
        button.className =
          "cell" + (isWeekend ? " weekend" : "") + (isHoliday ? " holiday" : "");
        button.setAttribute("data-date", iso);
        if (isHoliday) button.setAttribute("aria-label", iso + " 休場");
        var head = document.createElement("div");
        head.className = "cell-head";
        var num = document.createElement("span");
        num.className = "day-num";
        num.textContent = String(cursor.getDate());
        head.appendChild(num);
        var dots = document.createElement("span");
        dots.className = "dots";
        unique(dayEvents.map(function (item) { return item.category; })).forEach(function (category) {
          var dot = document.createElement("i");
          dot.className = "dot " + category;
          dots.appendChild(dot);
        });
        head.appendChild(dots);
        button.appendChild(head);
        var names = document.createElement("div");
        names.className = "cell-events";
        var CATEGORY_ORDER = { politics: 0, macro: 1, earnings: 2, market: 3, ipo: 4 };
        var ordered = dayEvents.slice().sort(function (a, b) {
          return (CATEGORY_ORDER[a.category] ?? 9) - (CATEGORY_ORDER[b.category] ?? 9);
        });
        ordered.slice(0, 6).forEach(function (item) {
          var chip = document.createElement("span");
          chip.className = "cell-event";
          var chipDot = document.createElement("i");
          chipDot.className = "dot " + item.category;
          chip.appendChild(chipDot);
          var label = document.createElement("span");
          label.className = "cell-event-name";
          var displayName = item.shortName || item.name;
          if (item.estimated) displayName = "推定 " + displayName;
          label.textContent = displayName;
          label.title = item.name + (item.estimated ? "（日付は推定）" : "");
          chip.appendChild(label);
          names.appendChild(chip);
        });
        if (dayEvents.length > 6) {
          var more = document.createElement("span");
          more.className = "cell-more";
          more.textContent = "+" + (dayEvents.length - 6) + "件";
          names.appendChild(more);
        }
        button.appendChild(names);
        grid.appendChild(button);
      } else {
        var pad = document.createElement("div");
        pad.className = "cell outside";
        grid.appendChild(pad);
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return grid;
  }

  function emptyDay(date) {
    var panel = document.createElement("div");
    panel.className = "detail";
    var title = document.createElement("h2");
    title.textContent = formatJstDate(date);
    panel.appendChild(title);
    var text = document.createElement("p");
    text.textContent = "この日の予定はありません";
    panel.appendChild(text);
    return panel;
  }

  function dayDetail(date, events) {
    var panel = document.createElement("div");
    panel.className = "detail";
    var title = document.createElement("h2");
    title.textContent = formatJstDate(date);
    panel.appendChild(title);
    events.forEach(function (item) {
      panel.appendChild(eventBlock(item));
    });
    return panel;
  }

  function eventBlock(item) {
    var block = document.createElement("article");
    block.className = "event";
    var title = document.createElement("h3");
    var dot = document.createElement("i");
    dot.className = "dot " + item.category;
    title.appendChild(dot);
    title.appendChild(document.createTextNode(" " + item.name));
    block.appendChild(title);
    var times = document.createElement("p");
    times.className = "times";
    times.textContent =
      "日本時間（JST） " + formatJstDate(item.jstDate) + " " + (item.jstTime || "終日") +
      " / 米東部時間（ET） " + formatJstDate(item.usMarketDate) + " " + (item.etTime || "終日");
    block.appendChild(times);
    if (item.estimated) block.appendChild(paragraph("日付は推定です。確定したら更新します。"));
    appendFields(block, item);
    block.appendChild(sourceLine(item));
    return block;
  }

  // 項目は4点に整理: 予想 / 上振れ / 下振れ / 持越
  function appendFields(parent, item) {
    [
      ["予想", item.consensus],
      ["上振れ", item.upside],
      ["下振れ", item.downside],
      ["持越", item.swing]
    ].forEach(function (pair) {
      var field = document.createElement("p");
      field.className = "field";
      var label = document.createElement("strong");
      label.textContent = pair[0] + "： ";
      field.appendChild(label);
      field.appendChild(document.createTextNode(pair[1]));
      parent.appendChild(field);
    });
  }

  function sourceLine(item) {
    var p = document.createElement("p");
    p.className = "source";
    var a = document.createElement("a");
    a.href = item.sourceUrl;
    a.textContent = item.sourceName;
    a.target = "_blank";
    a.rel = "noreferrer";
    p.appendChild(document.createTextNode("出典: "));
    p.appendChild(a);
    return p;
  }

  function paragraph(text) {
    var p = document.createElement("p");
    p.textContent = text;
    return p;
  }

  function unique(list) {
    var seen = {};
    return list.filter(function (item) {
      if (seen[item]) return false;
      seen[item] = true;
      return true;
    });
  }

  function isoDate(date) {
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");
    return date.getFullYear() + "-" + month + "-" + day;
  }

  function formatJstDate(iso) {
    var parts = iso.split("-");
    var date = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
    var weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    return Number(parts[1]) + "月" + Number(parts[2]) + "日（" + weekdays[date.getUTCDay()] + "）";
  }
})();
