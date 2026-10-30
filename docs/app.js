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
    ["ET", "Eastern Time（米東部時間）。11月は冬時間（EST、UTC-5）。"],
    ["JST", "Japan Standard Time（日本時間、UTC+9）。"]
  ];

  var DOW = ["月", "火", "水", "木", "金", "土", "日"];

  var SHORT_NAMES = {
    "ism-manufacturing-2026-11": "ISM製造業",
    "aapl-earnings-fy26q4": "Apple決算",
    "us-midterm-2026": "中間選挙",
    "employment-situation-2026-11": "雇用統計",
    "cpi-2026-11": "CPI",
    "fomc-minutes-2026-11": "FOMC議事要旨",
    "monthly-opex-2026-11": "OPEX満期",
    "thanksgiving-2026": "感謝祭・休場",
    "black-friday-2026": "ブラックフライデー",
    "early-close-2026-11-27": "早期終了"
  };

  var app = document.getElementById("app");
  var asOfNode = document.getElementById("as-of");

  fetch("events.json")
    .then(function (response) {
      if (!response.ok) throw new Error("events.json を読めませんでした。");
      return response.json();
    })
    .then(render)
    .catch(function (error) {
      app.innerHTML = "";
      var p = document.createElement("p");
      p.className = "status";
      p.textContent = error.message;
      app.appendChild(p);
    });

  function render(data) {
    asOfNode.textContent = data.asOf;
    asOfNode.setAttribute("datetime", data.asOf);
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

    var cursor = new Date(2026, 10, 1);
    var lead = (cursor.getDay() + 6) % 7;
    cursor.setDate(1 - lead);
    for (var i = 0; i < 42; i += 1) {
      var inMonth = cursor.getMonth() === 10;
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
        dayEvents.slice(0, 3).forEach(function (item) {
          var chip = document.createElement("span");
          chip.className = "cell-event";
          var chipDot = document.createElement("i");
          chipDot.className = "dot " + item.category;
          chip.appendChild(chipDot);
          var label = document.createElement("span");
          label.className = "cell-event-name";
          label.textContent = SHORT_NAMES[item.id] || item.name;
          label.title = item.name;
          chip.appendChild(label);
          names.appendChild(chip);
        });
        if (dayEvents.length > 3) {
          var more = document.createElement("span");
          more.className = "cell-more";
          more.textContent = "+" + (dayEvents.length - 3) + "件";
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
      " ／ 米東部時間（ET） " + item.usMarketDate + " " + (item.etTime || "終日");
    block.appendChild(times);
    appendFields(block, item);
    block.appendChild(sourceLine(item));
    return block;
  }

  // 項目は4点に整理: 市場予想 / 上振れ / 下振れ / 持ち越しの目安
  function appendFields(parent, item) {
    [
      ["市場予想", item.consensus],
      ["上振れ", item.upside],
      ["下振れ", item.downside],
      ["持ち越し", item.swing]
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
    var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    var weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    return Number(parts[1]) + "月" + Number(parts[2]) + "日（" + weekdays[date.getDay()] + "）";
  }
})();
