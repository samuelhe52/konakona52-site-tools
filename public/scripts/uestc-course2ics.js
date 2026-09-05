function genics(firstMonday, options = {}) {
  // Author: @Saafo
  // Version: v0.4.0
  // Link: https://github.com/Saafo/uestc-coursetable-parser/blob/master/course2ics.js
  // License: GPL-3.0 License
  const {
    calendarName = "课表",
    fileName = "课表.ics",
    locationPrefix = "电子科大 ",
    weekFilter = null,
  } = options;
  const timeTable = [
    ["0830", "0915"],
    ["0920", "1005"],
    ["1020", "1105"],
    ["1110", "1155"],
    ["1430", "1515"],
    ["1520", "1605"],
    ["1620", "1705"],
    ["1710", "1755"],
    ["1930", "2015"],
    ["2020", "2105"],
    ["2110", "2155"],
    ["2200", "2245"],
  ];
  const sectionTable = timeTable.map(function (timePair, index) {
    return {
      section: index + 1,
      startTime: timePair[0],
      endTime: timePair[1],
    };
  });

  function dateToStr(date) {
    return String(date.getFullYear()) +
      String(date.getMonth() > 8 ? "" + (date.getMonth() + 1) : "0" + (date.getMonth() + 1)) +
      String(date.getDate() > 9 ? "" + date.getDate() : "0" + date.getDate());
  }
  function utcDateToStr(date) {
    return String(date.getUTCFullYear()) +
      String(date.getUTCMonth() > 8 ? "" + (date.getUTCMonth() + 1) : "0" + (date.getUTCMonth() + 1)) +
      String(date.getUTCDate() > 9 ? "" + date.getUTCDate() : "0" + date.getUTCDate());
  }
  function strToDate(str) {
    let date = new Date();
    date.setFullYear(Number(str.slice(0, 4)), Number(str.slice(4, 6)) - 1, Number(str.slice(6, 8)));
    date.setHours(0, 0, 0, 0);
    return date;
  }
  function utcTimeToStr(date) {
    return String(date.getUTCHours() > 9 ? "" + date.getUTCHours() : "0" + date.getUTCHours()) +
      String(date.getUTCMinutes() > 9 ? "" + date.getUTCMinutes() : "0" + date.getUTCMinutes()) +
      String(date.getUTCSeconds() > 9 ? "" + date.getUTCSeconds() : "0" + date.getUTCSeconds());
  }
  function dateTimeToUTCStr(date) {
    return utcDateToStr(date) + "T" + utcTimeToStr(date) + "Z";
  }
  function combineLocalDateAndTime(date, timeStr) {
    let result = new Date(date);
    result.setHours(Number(timeStr.slice(0, 2)), Number(timeStr.slice(2, 4)), 0, 0);
    return result;
  }
  function escapeICSText(text) {
    return String(text)
      .replace(/\\/g, "\\\\")
      .replace(/\r\n/g, "\\n")
      .replace(/\n/g, "\\n")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,");
  }
  function normalizeValue(value) {
    let normalized = String(value || "").trim();
    return normalized || "暂无";
  }
  function filterWeeks(weeks, context) {
    if (typeof weekFilter !== "function") return weeks;
    return weeks.filter(function (week) {
      return weekFilter(week, context);
    });
  }
  function downloadICS(content, outputFileName) {
    let element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(content),
    );
    element.setAttribute("download", outputFileName);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }
  function inferSemesterFirstMonday() {
    let semesterInput = document.getElementById("semesterBar9334140861Semester");
    let semesterText = semesterInput ? String(semesterInput.value || "").trim() : "";
    let match = semesterText.match(/(\d{4})-(\d{4})学年(\d+)学期/);
    if (!match) return null;

    let startYear = Number(match[1]);
    let endYear = Number(match[2]);
    let term = Number(match[3]);
    if (term === 1) {
      let date = new Date(startYear, 8, 0);
      while (date.getDay() !== 1) date.setDate(date.getDate() - 1);
      return dateToStr(date);
    }
    if (term === 2) {
      let date = new Date(endYear, 2, 1);
      while (date.getDay() !== 1) date.setDate(date.getDate() + 1);
      return dateToStr(date);
    }
    return null;
  }
  function createUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
  function parseWeeksFromRawText(rawWeeks) {
    let weeks = [];
    let segments = String(rawWeeks || "").split(/\s+/);
    for (let seg of segments) {
      seg = seg.trim();
      if (!seg) continue;
      if (seg.startsWith("连")) {
        let r = seg.slice(1).split("-");
        let start = Number(r[0]);
        let end = Number(r[1] || r[0]);
        for (let w = start; w <= end; w++) weeks.push(w);
      } else if (seg.startsWith("单") || seg.startsWith("双")) {
        let isOdd = seg.startsWith("单");
        let rangeStr = seg.slice(1);
        let [startStr, endStr] = rangeStr.split("-");
        let start = Number(startStr);
        let end = Number(endStr || startStr);
        if (isNaN(start) || isNaN(end)) continue;
        for (let w = start; w <= end; w++) {
          if ((w % 2 === 1) === isOdd) weeks.push(w);
        }
      } else if (seg.includes("-")) {
        let r = seg.split("-");
        let start = Number(r[0]);
        let end = Number(r[1]);
        for (let w = start; w <= end; w++) weeks.push(w);
      } else if (/^\d+$/.test(seg)) {
        weeks.push(Number(seg));
      }
    }
    return [...new Set(weeks)].sort(function (a, b) {
      return a - b;
    });
  }
  function parseWeeksFromValidWeeks(validWeeks) {
    let weeks = [];
    let source = String(validWeeks || "");
    for (let i = 1; i < source.length; i++) {
      if (source[i] === "1") weeks.push(i);
    }
    return weeks;
  }
  function weeksToRawText(weeks) {
    if (weeks.length === 0) return "暂无";
    let sorted = [...new Set(weeks)].sort(function (a, b) {
      return a - b;
    });
    let result = [];
    let i = 0;
    while (i < sorted.length) {
      let start = sorted[i];
      let end = start;
      let step = 1;
      if (i + 1 < sorted.length && sorted[i + 1] - sorted[i] === 2) {
        step = 2;
      }
      while (i + 1 < sorted.length && sorted[i + 1] - sorted[i] === step) {
        i++;
        end = sorted[i];
      }
      if (start === end) {
        result.push(String(start));
      } else if (step === 2) {
        result.push((start % 2 === 1 ? "单" : "双") + start + "-" + end);
      } else {
        result.push(start + "-" + end + "周");
      }
      i++;
    }
    return result.join(" ");
  }
  function contiguousBlocksFromSections(sections) {
    if (sections.length === 0) return [];
    let sorted = [...new Set(sections)].sort(function (a, b) {
      return a - b;
    });
    let blocks = [];
    let start = sorted[0];
    let end = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1) {
        end = sorted[i];
      } else {
        blocks.push({ startSection: start, endSection: end });
        start = sorted[i];
        end = sorted[i];
      }
    }
    blocks.push({ startSection: start, endSection: end });
    return blocks;
  }
  function sectionsFromBounds(startSection, endSection) {
    let sections = [];
    for (let section = startSection; section <= endSection; section++) {
      sections.push(sectionTable[section - 1]);
    }
    return sections;
  }

  firstMonday = firstMonday || inferSemesterFirstMonday();
  if (!/^\d{8}$/.test(firstMonday)) {
    console.error("开始日期不合法");
    return;
  }
  const constFirstMonday = strToDate(firstMonday);
  if (dateToStr(constFirstMonday) !== firstMonday || constFirstMonday.getDay() !== 1) {
    console.error("参数为第一周的周一日期，格式如:'20260302'");
    return;
  }
  function getOccurrenceDate(week, day) {
    let date = new Date(constFirstMonday);
    date.setDate(constFirstMonday.getDate() + (week - 1) * 7 + day - 1);
    return date;
  }
  function appendEventFields(uid, name, position, description, currentTimeStr) {
    let chunk = "BEGIN:VEVENT\nTRANSP:OPAQUE\nSEQUENCE:1\n";
    chunk += "CREATED:" + currentTimeStr + "\n";
    chunk += "DTSTAMP:" + currentTimeStr + "\n";
    chunk += "LAST-MODIFIED:" + currentTimeStr + "\n";
    chunk += "UID:" + uid + "\n";
    chunk += "SUMMARY:" + escapeICSText(name) + "\n";
    if (position !== "暂无") {
      chunk += "LOCATION:" + escapeICSText(locationPrefix + position) + "\n";
    }
    chunk += "DESCRIPTION:" + escapeICSText(description) + "\n";
    return chunk;
  }
  function appendEventSeries(icsState, series) {
    let currentTimeStr = dateTimeToUTCStr(new Date());
    let description = [
      series.courseCode,
      series.teacher,
      series.position,
      series.rawWeeks,
    ].join(", ");
    let masterSections = sectionsFromBounds(series.startSection, series.masterEndSection);
    let firstWeek = Math.min.apply(null, series.weeks);
    let lastWeek = Math.max.apply(null, series.weeks);
    let startDate = getOccurrenceDate(firstWeek, series.day);

    icsState.value += appendEventFields(
      series.uid,
      series.name,
      series.position,
      description,
      currentTimeStr,
    );
    icsState.value +=
      "DTSTART;TZID=Asia/Shanghai:" +
      dateToStr(startDate) +
      "T" +
      masterSections[0].startTime +
      "00\n";
    icsState.value +=
      "DTEND;TZID=Asia/Shanghai:" +
      dateToStr(startDate) +
      "T" +
      masterSections[masterSections.length - 1].endTime +
      "00\n";

    if (series.weeks.length > 1) {
      let untilDate = combineLocalDateAndTime(
        getOccurrenceDate(lastWeek, series.day),
        masterSections[0].startTime,
      );
      icsState.value +=
        "RRULE:FREQ=WEEKLY;INTERVAL=1;UNTIL=" +
        dateTimeToUTCStr(untilDate) +
        "\n";
      let weekSet = new Set(series.weeks);
      for (let week = firstWeek; week <= lastWeek; week++) {
        if (!weekSet.has(week)) {
          let exDate = getOccurrenceDate(week, series.day);
          icsState.value +=
            "EXDATE;TZID=Asia/Shanghai:" +
            dateToStr(exDate) +
            "T" +
            masterSections[0].startTime +
            "00\n";
        }
      }
    }
    icsState.value += "END:VEVENT\n";

    for (let override of series.overrides) {
      let overrideDate = getOccurrenceDate(override.week, series.day);
      let overrideSections = sectionsFromBounds(series.startSection, override.endSection);
      icsState.value += appendEventFields(
        series.uid,
        series.name,
        series.position,
        description,
        currentTimeStr,
      );
      icsState.value +=
        "RECURRENCE-ID;TZID=Asia/Shanghai:" +
        dateToStr(overrideDate) +
        "T" +
        masterSections[0].startTime +
        "00\n";
      icsState.value +=
        "DTSTART;TZID=Asia/Shanghai:" +
        dateToStr(overrideDate) +
        "T" +
        overrideSections[0].startTime +
        "00\n";
      icsState.value +=
        "DTEND;TZID=Asia/Shanghai:" +
        dateToStr(overrideDate) +
        "T" +
        overrideSections[overrideSections.length - 1].endTime +
        "00\n";
      icsState.value += "END:VEVENT\n";
    }
  }
  function buildEventSeriesFromTableActivities() {
    if (typeof table0 === "undefined" || !table0.activities) return [];
    let groupMap = new Map();
    for (let slot = 0; slot < table0.activities.length; slot++) {
      let activities = table0.activities[slot] || [];
      if (activities.length === 0) continue;
      let day = Math.floor(slot / 12) + 1;
      let section = (slot % 12) + 1;
      for (let activity of activities) {
        if (!activity) continue;
        let courseTitle = normalizeValue(activity.courseName);
        let courseMatch = courseTitle.match(/(.+?)\(([^)]+)\)$/);
        let name = normalizeValue(courseMatch ? courseMatch[1] : courseTitle);
        let courseCode = normalizeValue(courseMatch ? courseMatch[2] : "");
        let teacher = normalizeValue(activity.teacherName);
        let position = normalizeValue(activity.roomName || activity.room);
        let weeks = parseWeeksFromValidWeeks(activity.vaildWeeks || activity.validWeeks);
        weeks = filterWeeks(weeks, {
          courseCode: courseCode,
          teacher: teacher,
          name: name,
          position: position,
          rawWeeks: weeksToRawText(weeks),
          day: day,
          startSection: section,
          span: 1,
        });
        weeks = [...new Set(weeks)].sort(function (a, b) {
          return a - b;
        });
        if (weeks.length === 0) continue;

        let key = [courseCode, name, teacher, position, day].join("\u0001");
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            courseCode: courseCode,
            teacher: teacher,
            name: name,
            position: position,
            day: day,
            weekSections: new Map(),
          });
        }
        let group = groupMap.get(key);
        for (let week of weeks) {
          if (!group.weekSections.has(week)) group.weekSections.set(week, new Set());
          group.weekSections.get(week).add(section);
        }
      }
    }

    let seriesList = [];
    for (let group of groupMap.values()) {
      let seriesByStart = new Map();
      let weeks = [...group.weekSections.keys()].sort(function (a, b) {
        return a - b;
      });
      for (let week of weeks) {
        let blocks = contiguousBlocksFromSections([...group.weekSections.get(week)]);
        for (let block of blocks) {
          if (!seriesByStart.has(block.startSection)) {
            seriesByStart.set(block.startSection, new Map());
          }
          seriesByStart.get(block.startSection).set(week, block.endSection);
        }
      }

      for (let [startSection, weekToEndSection] of seriesByStart.entries()) {
        let occurrenceWeeks = [...weekToEndSection.keys()].sort(function (a, b) {
          return a - b;
        });
        let endSectionFrequency = new Map();
        for (let endSection of weekToEndSection.values()) {
          endSectionFrequency.set(
            endSection,
            (endSectionFrequency.get(endSection) || 0) + 1,
          );
        }
        let masterEndSection = startSection;
        let masterCount = -1;
        for (let [endSection, count] of endSectionFrequency.entries()) {
          if (
            count > masterCount ||
            (count === masterCount && endSection > masterEndSection)
          ) {
            masterEndSection = endSection;
            masterCount = count;
          }
        }
        let overrides = [];
        for (let week of occurrenceWeeks) {
          let endSection = weekToEndSection.get(week);
          if (endSection !== masterEndSection) {
            overrides.push({ week: week, endSection: endSection });
          }
        }
        seriesList.push({
          uid: createUID(),
          courseCode: group.courseCode,
          teacher: group.teacher,
          name: group.name,
          position: group.position,
          rawWeeks: weeksToRawText(occurrenceWeeks),
          day: group.day,
          startSection: startSection,
          masterEndSection: masterEndSection,
          weeks: occurrenceWeeks,
          overrides: overrides,
        });
      }
    }
    return seriesList;
  }
  function buildEventSeriesFromDOM() {
    let seriesList = [];
    let i = 0;
    for (; i < 84; i++) {
      let $td = $("#TD" + i + "_0");
      if ($td.length === 0) continue;

      let title = ($td.attr("title") || "").trim();
      if (!title) continue;

      let spanStr = $td.attr("rowspan") || "1";
      let span = Number(spanStr);
      if (isNaN(span) || span < 1) span = 1;

      let tokens = title
        .split(";")
        .map(function (t) { return t.trim(); })
        .filter(function (t) { return t; });
      let k = 0;
      while (k < tokens.length) {
        let coursePart = tokens[k];
        k++;
        if (k >= tokens.length || !tokens[k].startsWith("(")) continue;

        let weekLocPart = tokens[k];
        k++;
        let courseMatch = coursePart.match(/([^ ]+)\s+(.+?)\(([^)]+)\)/);
        if (!courseMatch) continue;
        let teacher = normalizeValue(courseMatch[1]);
        let name = normalizeValue(courseMatch[2]);
        let courseCode = normalizeValue(courseMatch[3]);
        let weekLocStr = weekLocPart.slice(1, -1);
        let parts = weekLocStr.split(",").map(function (p) { return p.trim(); });
        let rawWeeks = normalizeValue(parts[0]);
        let position = normalizeValue(parts.slice(1).join(","));
        let weeks = parseWeeksFromRawText(rawWeeks);
        let day = Math.floor(i / 12) + 1;
        let startSection = (i % 12) + 1;
        let filteredWeeks = filterWeeks(weeks, {
          courseCode: courseCode,
          teacher: teacher,
          name: name,
          position: position,
          rawWeeks: rawWeeks,
          day: day,
          startSection: startSection,
          span: span,
        });
        filteredWeeks = [...new Set(filteredWeeks)].sort(function (a, b) {
          return a - b;
        });
        if (filteredWeeks.length === 0) continue;

        seriesList.push({
          uid: createUID(),
          courseCode: courseCode,
          teacher: teacher,
          name: name,
          position: position,
          rawWeeks: rawWeeks,
          day: day,
          startSection: startSection,
          masterEndSection: Math.min(startSection + span - 1, 12),
          weeks: filteredWeeks,
          overrides: [],
        });
      }
      i += span - 1;
    }
    return seriesList;
  }

  let icsState = {
    value:
      "BEGIN:VCALENDAR\n\
METHOD:PUBLISH\n\
VERSION:2.0\n\
X-WR-CALNAME:" + escapeICSText(calendarName) + "\n\
PRODID:-//Saafo//github.com/Saafo/uestc-coursetable-parser/blob/master/course2ics.js 0.4.0//CN\n\
X-WR-TIMEZONE:Asia/Shanghai\n\
CALSCALE:GREGORIAN\n\
BEGIN:VTIMEZONE\n\
TZID:Asia/Shanghai\n\
BEGIN:STANDARD\n\
TZOFFSETFROM:+0800\n\
DTSTART:19890917T020000\n\
TZNAME:GMT+8\n\
TZOFFSETTO:+0800\n\
END:STANDARD\n\
END:VTIMEZONE\n",
  };

  let eventSeriesList = buildEventSeriesFromTableActivities();
  if (eventSeriesList.length === 0) {
    eventSeriesList = buildEventSeriesFromDOM();
  }
  for (let series of eventSeriesList) {
    appendEventSeries(icsState, series);
  }

  icsState.value += "END:VCALENDAR";
  downloadICS(icsState.value, fileName);
}
genics();
