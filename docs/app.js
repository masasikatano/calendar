(function () {
  var CATEGORIES = [
    ["earnings", "決算"],
    ["macro", "経済指標"],
    ["politics", "政治"],
    ["market", "休場・取引時間"],
    ["ipo", "IPO"]
  ];

  var DOW = ["月", "火", "水", "木", "金", "土", "日"];

  var SHORT_NAMES = {
    "ism-manufacturing-2026-11": "ISM製造業",
    "aapl-earnings-fy26q4": "Apple決算",
    "us-midterm-2026": "中間選挙",
    "employment-situation-2026-11": "雇用統計",
    "cpi-2026-11": "CPI",
    "fomc-minutes-2026-11": "FOMC要旨",
    "monthly-opex-2026-11": "OP満期",
    "thanksgiving-2026": "感謝祭 休場",
    "black-friday-2026": "ブラックF",
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
    calendar.appendChild(legend());
    data.unconfirmed.forEach(function (item) {
      calendar.appendChild(unconfirmedCard(item));
    });
    calendar.appendChild(monthGrid(data));

    var detail = document.createElement("section");
    detail.className = "detail-col";
    detail.appendChild(emptyDetail());

    app.appendChild(calendar);
    app.appendChild(detail);

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
      detail.innerHTML = "";
      detail.appendChild(events.length ? dayDetail(date, events) : emptyDay(date));
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

  function unconfirmedCard(item) {
    var card = document.createElement("article");
    card.className = "unconfirmed";
    var details = document.createElement("details");
    var summary = document.createElement("summary");
    var kicker = document.createElement("span");
    kicker.className = "kicker";
    kicker.textContent = "11月上旬・日付未確定";
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
        dayEvents.slice(0, 2).forEach(function (item) {
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
        if (dayEvents.length > 2) {
          var more = document.createElement("span");
          more.className = "cell-more";
          more.textContent = "+" + (dayEvents.length - 2) + "件";
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

  function emptyDetail() {
    var panel = document.createElement("div");
    panel.className = "detail";
    var text = document.createElement("p");
    text.textContent = "日を選ぶと、コンセンサスとS&P500への影響が出ます";
    panel.appendChild(text);
    return panel;
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
      "日本時間 " + formatJstDate(item.jstDate) + " " + (item.jstTime || "終日") +
      " / 米国市場日 " + item.usMarketDate +
      " / 東部時間 " + (item.etTime || "終日");
    block.appendChild(times);
    appendFields(block, item);
    block.appendChild(sourceLine(item));
    return block;
  }

  function appendFields(parent, item) {
    [
      ["コンセンサス", item.consensus],
      ["上振れ時の典型反応", item.upside],
      ["下振れ時の典型反応", item.downside],
      ["スイングでの見方", item.swing]
    ].forEach(function (pair) {
      var field = document.createElement("p");
      field.className = "field";
      var label = document.createElement("strong");
      label.textContent = pair[0];
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
    return Number(parts[1]) + "月" + Number(parts[2]) + "日";
  }
})();
