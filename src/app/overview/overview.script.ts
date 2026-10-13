// @ts-nocheck
// The Overview page's script: the <script> from demos/alert-demo.html, run inside startOverview().
// Changes from the original:
//  - it runs inside the Overview page's shadow root: `document` below looks elements up there;
//  - the queue, open issues and selected event live in AlertsService (`state`), shared with the
//    Admin Triggers page, so this script only draws them and handles the buttons;
//  - the trigger lists moved to the Admin Triggers page;
//  - setTimeout/setInterval are tracked so stop() can cancel them when you leave the page
//    (snoozes are scheduled in AlertsService instead, so they still fire after you leave);
//  - the functions the page's buttons call are returned at the end.
// Type checking is off for this file because the demo is plain JavaScript.
import type { AlertsService } from '../alerts-state/alerts.service';

export function startOverview(root: ShadowRoot, state: AlertsService) {
  const document = {
    getElementById: (id) => root.getElementById(id),
    querySelectorAll: (selector) => root.querySelectorAll(selector),
    createElement: (tag) => window.document.createElement(tag),
    createTextNode: (text) => window.document.createTextNode(text),
  };
  const timeouts = new Set();
  const intervals = new Set();
  const setTimeout = (callback, ms) => {
    const id = window.setTimeout(() => {
      timeouts.delete(id);
      callback();
    }, ms);
    timeouts.add(id);
    return id;
  };
  const setInterval = (callback, ms) => {
    const id = window.setInterval(callback, ms);
    intervals.add(id);
    return id;
  };

  // ---------- Demo script below ----------

  // The list of alerts is in alerts-state/alerts.catalog.ts.
  // The trigger lists are on the Admin Triggers page.

  // ---------- INSURANCE SCORE ----------
  // Demo numbers. Change these to try different homes and cars.
  const SCORES = {
    home: { value: 155000, baseline: 1200, costPerPoint: 6 },  // $155k house, ~$1,200/yr insurance
    car:  { value: 25000,  baseline: 1800, costPerPoint: 9 }   // $25k car, ~$1,800/yr insurance
  };

  // Letter grade for a number of penalty points.
  function gradeFor(points) {
    if (points === 0)  return "A+";
    if (points <= 5)   return "A";
    if (points <= 10)  return "A-";
    if (points <= 15)  return "B+";
    if (points <= 20)  return "B";
    if (points <= 25)  return "B-";
    if (points <= 30)  return "C+";
    if (points <= 35)  return "C";
    if (points <= 40)  return "C-";
    return "D";
  }

  // Turns 1200 into "$1,200".
  function money(amount) {
    return amount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  }

  // The queue and open issues live in AlertsService (`state`). These helpers change the state,
  // then redraw, so the rest of this script reads as before.
  function removeEvent(id) {
    state.removeEvent(id);
    render();
  }

  // A reminder was fixed: stop counting it, and clear any copies from the queue.
  function resolveIssue(alertInfo) {
    state.resolveIssue(alertInfo);
  }

  // Clicking an unaddressed reminder on the score card:
  //  - if it's already in the queue, opens it, just like clicking it in the queue
  //  - if it isn't (it was dismissed), puts it back in the queue and opens it
  function addressIssue(alertInfo) {
    state.addressIssue(alertInfo);
    render();
    // Scroll so the opened reminder is in view (helpful on small screens).
    document.getElementById("eventCard").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // Update both score cards on the page.
  function renderScore() {
    renderScoreCard("home");
    renderScoreCard("car");
  }

  // Update one score card ("home" or "car").
  function renderScoreCard(asset) {
    const settings = SCORES[asset];
    const issues = state.openIssues().filter(function (i) { return i.asset === asset; });

    // The hidden counter: add up penalty points for this card's open issues.
    let points = 0;
    issues.forEach(function (i) { points = points + i.penalty; });

    const grade = gradeFor(points);
    const added = points * settings.costPerPoint;
    const gradeBox = document.getElementById(asset + "-grade");
    gradeBox.textContent = grade;
    gradeBox.className = "grade " + grade.charAt(0);   // "A", "B", "C" or "D" picks the color

    // Alert Girl: thumbs up for a perfect A+, otherwise thinking it over
    document.getElementById(asset + "-happy").classList.toggle("show", points === 0);
    document.getElementById(asset + "-thinking").classList.toggle("show", points > 0);

    document.getElementById(asset + "-value").textContent = money(settings.value);
    document.getElementById(asset + "-baseline").textContent = money(settings.baseline) + " / yr";
    document.getElementById(asset + "-added").textContent = "+" + money(added) + " / yr";
    document.getElementById(asset + "-total").textContent = money(settings.baseline + added) + " / yr";

    // One clickable line per open issue, showing what it adds to the cost
    const rows = document.getElementById(asset + "-issues");
    rows.innerHTML = "";
    issues.forEach(function (i) {
      const row = document.createElement("tr");
      row.className = "issue";
      row.title = "Click to add this back to your queue";
      row.onclick = function () { addressIssue(i); };
      const label = document.createElement("td");
      label.textContent = i.name;
      const cost = document.createElement("td");
      cost.textContent = "+" + money(i.penalty * settings.costPerPoint) + " / yr";
      row.appendChild(label);
      row.appendChild(cost);
      rows.appendChild(row);
    });

    const summary = document.getElementById(asset + "-summary");
    if (issues.length === 0) {
      summary.textContent = "Great job! You have no unaddressed reminders.";
    } else {
      const count = issues.length;
      summary.textContent = "Fixing your " + count + " unaddressed reminder" + (count > 1 ? "s" : "") +
                            " could save you about " + money(added) + " a year.";
    }
  }

  // ---------- THE QUEUE ----------
  // The queue itself (adding, removing, ordering, which event is shown) is in AlertsService.

  // Shows when an event happened.
  // Less than 24 hours ago: the time, like "2:05:31 PM".
  // 24 hours or more ago:   the date, like "Oct 11, 2026".
  const ONE_DAY = 24 * 60 * 60 * 1000;   // 24 hours in milliseconds
  function formatTime(date) {
    const age = Date.now() - date.getTime();
    if (age >= ONE_DAY) {
      return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
    }
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
  }

  // Redraw the queue once a minute, so times switch to dates
  // when events pass the 24-hour mark while the page is open.
  setInterval(render, 60 * 1000);

  // Draw everything once when the page opens.
  render();

  // ---------- DRAW THE QUEUE ON THE PAGE ----------
  function render() {
    const groups = document.getElementById("queueGroups");
    groups.innerHTML = "";
    document.getElementById("queueCount").textContent = state.queue().length;
    document.getElementById("queueEmpty").style.display = state.queue().length ? "none" : "block";

    const sorted = state.sortedQueue();
    const alertEvents = sorted.filter(function (e) { return e.info.type === "alert"; });
    const reminderEvents = sorted.filter(function (e) { return e.info.type === "reminder"; });
    drawGroup(groups, "alert", "Alerts", alertEvents);
    drawGroup(groups, "reminder", "Reminders", reminderEvents);

    showEvent(state.selectedEvent());
    renderScore();
  }

  // Draws one group (Alerts or Reminders) with a heading and its rows.
  function drawGroup(container, type, heading, events) {
    if (events.length === 0) return;

    const title = document.createElement("div");
    title.className = "group-heading " + type;
    title.textContent = heading + " (" + events.length + ")";
    container.appendChild(title);

    const list = document.createElement("ul");
    list.className = "queue-list";
    events.forEach(function (entry) {
      const row = document.createElement("li");
      row.className = "queue-item " + type + (entry.id === state.selectedId() ? " selected" : "");
      row.onclick = function () { state.select(entry.id); render(); };

      const badge = document.createElement("span");
      badge.className = "badge " + type;
      badge.textContent = type === "alert" ? "ALERT" : "REMINDER";

      const name = document.createElement("span");
      name.className = "name";
      name.textContent = entry.info.name;

      const time = document.createElement("span");
      time.className = "time";
      time.textContent = formatTime(entry.time);

      row.appendChild(badge);
      row.appendChild(name);
      row.appendChild(time);
      list.appendChild(row);
    });
    container.appendChild(list);
  }

  // ---------- SHOW ONE EVENT IN FULL ----------
  function showEvent(entry) {
    const card = document.getElementById("eventCard");
    if (!entry) {
      card.className = "event-card";   // hidden
      return;
    }
    const info = entry.info;
    card.className = "event-card show " + info.type;

    document.getElementById("cardType").textContent = info.type === "alert" ? "ALERT" : "REMINDER";
    document.getElementById("cardTime").textContent = formatTime(entry.time);
    document.getElementById("cardTitle").textContent = info.title;
    document.getElementById("cardMessage").textContent = info.message;

    // Hide all Alert Girl pictures, then show the one this event asks for (if any)
    document.querySelectorAll(".mascot").forEach(function (m) {
      m.classList.remove("show");
    });
    if (info.mascot) {
      document.getElementById("mascot-" + info.mascot).classList.add("show");
    }

    // Remove any old buttons, then add this event's buttons.
    const buttonArea = document.getElementById("cardButtons");
    buttonArea.innerHTML = "";
    info.buttons.forEach(function (b) {
      const button = document.createElement("button");
      button.className = b.style;
      button.textContent = b.label;
      button.onclick = function () { handleAction(b.action, entry); };
      buttonArea.appendChild(button);
    });
  }

  // ---------- TOASTER MESSAGE ----------
  // Shows a small message at the top of the screen for a number of seconds.
  let toastTimer;
  // "face" is optional: one of the Alert Girl faces below, shown before the text.
  function showToast(text, seconds, face) {
    const toast = document.getElementById("toast");
    toast.innerHTML = face || "";
    const words = document.createElement("span");
    words.textContent = text;
    toast.appendChild(words);
    toast.classList.add("show");
    clearTimeout(toastTimer);  // if a toast is already showing, restart its timer
    toastTimer = setTimeout(function () {
      toast.classList.remove("show");
    }, seconds * 1000);
  }

  // ---------- ALERT GIRL FACES (used like emojis) ----------
  const FACE_WHISPER  = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="56 34 140 112" class="face-icon" role="img" aria-label="Alert Girl whispering"><g stroke="#1e1e1e" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round">
  <path d="M70 128 Q62 44 120 40 Q178 44 170 128 Q158 136 146 126 V100 H94 V126 Q82 136 70 128 Z" fill="#d8452c"/>
  <rect x="110" y="122" width="20" height="18" fill="#f6cfae"/>
  <ellipse cx="120" cy="94" rx="38" ry="42" fill="#f6cfae"/>
  <path d="M80 92 Q78 52 120 50 Q162 52 160 92 Q150 70 128 72 Q104 76 80 92 Z" fill="#d8452c"/>
  <path d="M104 62 Q118 60 132 68" fill="none" stroke-width="2.5"/>
  <path d="M122 102 Q119 109 124 110" fill="none" stroke-width="2.5"/>
  <path d="M96 84 Q104 80 112 83" fill="none" stroke-width="3.5"/>
  <path d="M128 83 Q136 80 144 84" fill="none" stroke-width="3.5"/>
  <path d="M98 95 Q104 91 110 95" fill="none" stroke-width="3.5"/>
  <circle cx="108" cy="97" r="3.5" fill="#1e1e1e" stroke="none"/>
  <path d="M130 95 Q136 91 142 95" fill="none" stroke-width="3.5"/>
  <circle cx="140" cy="97" r="3.5" fill="#1e1e1e" stroke="none"/>
  <ellipse cx="128" cy="118" rx="4" ry="3.5" fill="#7a2b22" stroke-width="2.5"/>
  <ellipse cx="148" cy="116" rx="10" ry="13" fill="#f6cfae"/>
  <path d="M143 108 Q147 116 143 124" fill="none" stroke-width="2"/></g><g stroke="#1e1e1e" stroke-width="3" stroke-linecap="round"><path d="M166 104 L178 98"/><path d="M168 116 L182 116"/><path d="M166 128 L178 134"/></g></svg>`;
  const FACE_HAPPY    = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="56 34 140 112" class="face-icon" role="img" aria-label="Alert Girl happy to help"><g stroke="#1e1e1e" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round">
  <path d="M70 128 Q62 44 120 40 Q178 44 170 128 Q158 136 146 126 V100 H94 V126 Q82 136 70 128 Z" fill="#d8452c"/>
  <rect x="110" y="122" width="20" height="18" fill="#f6cfae"/>
  <ellipse cx="120" cy="94" rx="38" ry="42" fill="#f6cfae"/>
  <path d="M80 92 Q78 52 120 50 Q162 52 160 92 Q150 70 128 72 Q104 76 80 92 Z" fill="#d8452c"/>
  <path d="M104 62 Q118 60 132 68" fill="none" stroke-width="2.5"/>
  <path d="M122 102 Q119 109 124 110" fill="none" stroke-width="2.5"/>
  <path d="M95 80 Q104 74 112 79" fill="none" stroke-width="3.5"/>
  <path d="M128 79 Q136 74 145 80" fill="none" stroke-width="3.5"/>
  <path d="M97 97 Q104 89 111 97" fill="none" stroke-width="3.5"/>
  <path d="M129 97 Q136 89 143 97" fill="none" stroke-width="3.5"/>
  <path d="M106 112 Q120 128 134 112 Z" fill="#ffffff" stroke-width="3"/>
  <circle cx="93" cy="110" r="5.5" fill="#f2a28f" stroke="none" opacity="0.75"/>
  <circle cx="147" cy="110" r="5.5" fill="#f2a28f" stroke="none" opacity="0.75"/></g></svg>`;
  const FACE_CONFUSED = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="56 34 140 112" class="face-icon" role="img" aria-label="Alert Girl confused"><g stroke="#1e1e1e" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round">
  <path d="M70 128 Q62 44 120 40 Q178 44 170 128 Q158 136 146 126 V100 H94 V126 Q82 136 70 128 Z" fill="#d8452c"/>
  <rect x="110" y="122" width="20" height="18" fill="#f6cfae"/>
  <ellipse cx="120" cy="94" rx="38" ry="42" fill="#f6cfae"/>
  <path d="M80 92 Q78 52 120 50 Q162 52 160 92 Q150 70 128 72 Q104 76 80 92 Z" fill="#d8452c"/>
  <path d="M104 62 Q118 60 132 68" fill="none" stroke-width="2.5"/>
  <path d="M122 102 Q119 109 124 110" fill="none" stroke-width="2.5"/>
  <path d="M95 84 Q104 82 112 84" fill="none" stroke-width="3.5"/>
  <path d="M128 80 Q136 72 145 77" fill="none" stroke-width="3.5"/>
  <ellipse cx="104" cy="96" rx="6" ry="7" fill="#ffffff" stroke-width="2.5"/>
  <ellipse cx="136" cy="96" rx="6" ry="7" fill="#ffffff" stroke-width="2.5"/>
  <circle cx="106" cy="94" r="3.5" fill="#1e1e1e" stroke="none"/>
  <circle cx="138" cy="94" r="3.5" fill="#1e1e1e" stroke="none"/>
  <path d="M108 120 Q113 115 118 120 Q123 125 128 120 Q131 117 134 119" fill="none" stroke-width="3.5"/></g><text x="170" y="82" font-family="Arial, sans-serif" font-size="34" font-weight="900" fill="#2f78c9" stroke="#1e1e1e" stroke-width="1.5">?</text></svg>`;
  const FACE_SLEEPY   = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="56 34 140 112" class="face-icon" role="img" aria-label="Alert Girl snoozing"><g stroke="#1e1e1e" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round">
  <path d="M70 128 Q62 44 120 40 Q178 44 170 128 Q158 136 146 126 V100 H94 V126 Q82 136 70 128 Z" fill="#d8452c"/>
  <rect x="110" y="122" width="20" height="18" fill="#f6cfae"/>
  <ellipse cx="120" cy="94" rx="38" ry="42" fill="#f6cfae"/>
  <path d="M80 92 Q78 52 120 50 Q162 52 160 92 Q150 70 128 72 Q104 76 80 92 Z" fill="#d8452c"/>
  <path d="M104 62 Q118 60 132 68" fill="none" stroke-width="2.5"/>
  <path d="M122 102 Q119 109 124 110" fill="none" stroke-width="2.5"/>
  <path d="M97 95 Q104 99 111 95" fill="none" stroke-width="3.5"/>
  <path d="M129 95 Q136 99 143 95" fill="none" stroke-width="3.5"/>
  <path d="M112 118 Q120 122 128 118" fill="none" stroke-width="3.5"/>
  <circle cx="93" cy="110" r="5" fill="#f2a28f" stroke="none" opacity="0.6"/>
  <circle cx="147" cy="110" r="5" fill="#f2a28f" stroke="none" opacity="0.6"/></g><g font-family="Arial, sans-serif" font-weight="900" fill="#2f78c9" stroke="#1e1e1e" stroke-width="1"><text x="160" y="80" font-size="18">z</text><text x="172" y="64" font-size="24">Z</text></g></svg>`;
  const FACE_FIRE     = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="56 18 140 128" class="face-icon" role="img" aria-label="Alert Girl wearing a firefighter helmet"><g stroke="#1e1e1e" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round">
  <path d="M70 128 Q62 44 120 40 Q178 44 170 128 Q158 136 146 126 V100 H94 V126 Q82 136 70 128 Z" fill="#d8452c"/>
  <rect x="110" y="122" width="20" height="18" fill="#f6cfae"/>
  <ellipse cx="120" cy="94" rx="38" ry="42" fill="#f6cfae"/>
  <path d="M80 92 Q78 52 120 50 Q162 52 160 92 Q150 70 128 72 Q104 76 80 92 Z" fill="#d8452c"/>
  <path d="M104 62 Q118 60 132 68" fill="none" stroke-width="2.5"/>
  <path d="M122 102 Q119 109 124 110" fill="none" stroke-width="2.5"/><path d="M96 84 Q104 80 112 83" fill="none" stroke-width="3.5"/>
  <path d="M128 83 Q136 80 144 84" fill="none" stroke-width="3.5"/>
  <ellipse cx="104" cy="96" rx="3.5" ry="3.5" fill="#1e1e1e" stroke="none"/>
  <ellipse cx="136" cy="96" rx="3.5" ry="3.5" fill="#1e1e1e" stroke="none"/>
  <path d="M110 116 Q120 122 130 116" fill="none" stroke-width="3.5"/>
  <!-- Firefighter helmet -->
  <path d="M70 78 Q66 30 120 26 Q174 30 170 78 Z" fill="#d93a3f"/>
  <path d="M58 80 Q120 64 182 80 Q184 90 172 88 Q120 76 68 88 Q56 90 58 80 Z" fill="#b52d31"/>
  <path d="M120 28 V70" fill="none" stroke-width="3"/>
  <path d="M106 36 H134 V58 Q120 66 106 58 Z" fill="#f5c400" stroke-width="3"/>
  <text x="120" y="54" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="900" fill="#1e1e1e" stroke="none">1</text>
    </g></svg>`;
  const FACE_PHONE    = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="56 34 140 112" class="face-icon" role="img" aria-label="Alert Girl on the phone"><g stroke="#1e1e1e" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round">
  <path d="M70 128 Q62 44 120 40 Q178 44 170 128 Q158 136 146 126 V100 H94 V126 Q82 136 70 128 Z" fill="#d8452c"/>
  <rect x="110" y="122" width="20" height="18" fill="#f6cfae"/>
  <ellipse cx="120" cy="94" rx="38" ry="42" fill="#f6cfae"/>
  <path d="M80 92 Q78 52 120 50 Q162 52 160 92 Q150 70 128 72 Q104 76 80 92 Z" fill="#d8452c"/>
  <path d="M104 62 Q118 60 132 68" fill="none" stroke-width="2.5"/>
  <path d="M122 102 Q119 109 124 110" fill="none" stroke-width="2.5"/>
  <path d="M96 82 Q104 78 112 81" fill="none" stroke-width="3.5"/>
  <path d="M128 81 Q136 78 144 82" fill="none" stroke-width="3.5"/>
  <ellipse cx="104" cy="96" rx="3.5" ry="3.5" fill="#1e1e1e" stroke="none"/>
  <ellipse cx="136" cy="96" rx="3.5" ry="3.5" fill="#1e1e1e" stroke="none"/>
  <path d="M108 114 Q120 124 132 114" fill="none" stroke-width="3.5"/>
  <rect x="150" y="84" width="14" height="34" rx="4" fill="#2e3a4a" stroke-width="3"/>
  <ellipse cx="156" cy="112" rx="9" ry="10" fill="#f6cfae"/></g><g stroke="#1e1e1e" stroke-width="3" stroke-linecap="round" fill="none"><path d="M172 86 Q178 94 172 102"/><path d="M180 80 Q190 94 180 108"/></g></svg>`;

  // ---------- INSURANCE COMPANY BUTTONS (pretend, for the demo) ----------
  function openAccount() {
    showToast("Pretend Progressive Website opened in new tab", 6, FACE_WHISPER);
  }

  function startClaim() {
    showToast("Starting Claim with Progressive.", 6, FACE_HAPPY);
  }

  function startCall() {
    showToast("Pretend this started a call to Progressive.", 6, FACE_WHISPER);
  }

  // ---------- PRETEND SECURITY FEED ----------
  let feedClockTimer = null;

  function openFeed() {
    document.getElementById("feedPanel").classList.add("open");
    // Restart the camera animation, so the fire grows 10 seconds after opening
    document.getElementById("feedScene").setCurrentTime(0);
    updateFeedClock();
    clearInterval(feedClockTimer);
    feedClockTimer = setInterval(updateFeedClock, 1000);   // tick like a real camera
  }

  function closeFeed() {
    document.getElementById("feedPanel").classList.remove("open");
    clearInterval(feedClockTimer);
  }

  function updateFeedClock() {
    const now = new Date();
    document.getElementById("feedClock").textContent =
      now.toLocaleDateString() + " " + now.toLocaleTimeString();
  }

  // ---------- PRETEND CHATBOT ----------
  let chatStarted = false;

  function openChat() {
    document.getElementById("chatPanel").classList.add("open");
    if (!chatStarted) {
      chatStarted = true;
      addChatMessage("bot", "Hello would you like to discuss your insurance score or something else?", FACE_HAPPY);
    }
    document.getElementById("chatText").focus();
  }

  function closeChat() {
    document.getElementById("chatPanel").classList.remove("open");
  }

  // Adds one chat bubble. "who" is "bot" or "user". Bots can add a face at the end.
  function addChatMessage(who, text, face) {
    const bubble = document.createElement("div");
    bubble.className = "msg " + who;
    bubble.textContent = text;
    if (face) bubble.insertAdjacentHTML("beforeend", face);
    const box = document.getElementById("chatMessages");
    box.appendChild(bubble);
    box.scrollTop = box.scrollHeight;   // scroll to the newest message
  }

  // When the user sends a message, the bot always gives the same answer.
  function sendChat(event) {
    event.preventDefault();   // stops the page from reloading
    const input = document.getElementById("chatText");
    const text = input.value.trim();
    if (!text) return;
    addChatMessage("user", text);
    input.value = "";
    setTimeout(function () {
      addChatMessage("bot", "Oh I'm not sure about that, maybe you should try calling.", FACE_CONFUSED);
    }, 700);
  }

  // ---------- WHAT EACH BUTTON DOES ----------
  const SNOOZE_MINUTES = 15;

  function handleAction(action, entry) {
    const info = entry.info;

    // "Mark as replaced" keeps the event in the queue until the photo is uploaded.
    if (action === "replaced") {
      openUpload(entry);
      return;
    }
    // Calling 911 keeps the alert in the queue, since the emergency isn't over yet.
    if (action === "call911") {
      showToast("Calling 911, but not really 'cause it is just a demo", 8, FACE_FIRE);
      return;
    }
    // Security feed: only works for alerts that have a camera.
    if (action === "securityFeed") {
      if (info.camera) {
        openFeed();
      } else {
        showToast("No camera available", 4, FACE_CONFUSED);
      }
      return;
    }
    // "Schedule Change" keeps it in the queue until an appointment is booked.
    if (action === "schedule") {
      openScheduleChoice(entry);
      return;
    }

    // Every other button finishes this event and takes it out of the queue.
    removeEvent(entry.id);

    if (action === "callPlumber") {
      showToast("Contacting a local plumber now. Updates will be sent to your phone.", 10, FACE_PHONE);
    }
    else if (action === "snooze") {
      // e.g. "Smoke alarm alerts paused for 15 minutes"
      showToast(info.name + " alerts paused for " + SNOOZE_MINUTES + " minutes", 5, FACE_SLEEPY);
      // Put the same alert back in the queue after the snooze time.
      // minutes x 60 seconds x 1000 milliseconds
      state.addEventLater(info, SNOOZE_MINUTES * 60 * 1000);
    }
    else if (action === "maximizeAir") {
      showToast("All system fans set to maximum and air quality alerts paused for 1 hour.", 10, FACE_HAPPY);
      // Put the alert back after 1 hour (60 minutes x 60 seconds x 1000 milliseconds).
      state.addEventLater(info, 60 * 60 * 1000);
    }
    else if (action === "orderReplacement") {
      resolveIssue(info);   // fixed! the insurance score improves
      render();
      showToast(info.orderMessage, 10, FACE_HAPPY);
    }
    else if (action === "callService") {
      showToast("Contacting a local service technician now. Updates will be sent to your phone.", 10, FACE_PHONE);
    }
    // "dismiss" needs nothing extra: the event is already out of the queue.
  }

  // ---------- SCHEDULING CAR SERVICE ----------
  let scheduleFor = null;   // the queued car reminder being scheduled
  let pickedDay = null;     // the day chosen on the calendar
  let pickedTime = null;    // the time chosen on the calendar

  function closeOverlay(id) {
    document.getElementById(id).classList.remove("show");
  }

  // Step 1: ask how they want to schedule.
  function openScheduleChoice(entry) {
    scheduleFor = entry;
    document.getElementById("scheduleFor").textContent =
      "How would you like to schedule your " + entry.info.serviceName.toLowerCase() + "?";
    document.getElementById("scheduleOverlay").classList.add("show");
  }

  // "Call for Service": pretend, for the demo. The reminder stays in the queue.
  function callForCarService() {
    closeOverlay("scheduleOverlay");
    showToast("Pretend this called for service.", 6, FACE_PHONE);
  }

  // "Schedule Online": open the pretend calendar.
  function scheduleOnline() {
    closeOverlay("scheduleOverlay");
    pickedDay = null;
    pickedTime = null;
    document.getElementById("calendarFor").textContent = "Booking: " + scheduleFor.info.serviceName;
    document.getElementById("calConfirm").disabled = true;
    document.getElementById("calTimes").innerHTML = '<span class="cal-hint">Choose a day to see open times.</span>';
    drawCalendarDays();
    document.getElementById("calendarOverlay").classList.add("show");
  }

  // Shows the next 14 days. Sundays are closed, and a few days are fully booked.
  // (The "booked" days and times are made up so the demo looks realistic.)
  function drawCalendarDays() {
    const grid = document.getElementById("calDays");
    grid.innerHTML = "";
    for (let i = 1; i <= 14; i++) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() + i);

      const button = document.createElement("button");
      button.className = "cal-day";
      button.innerHTML = day.toLocaleDateString([], { weekday: "short" }) +
                         '<span class="num">' + day.getDate() + "</span>";
      const closed = day.getDay() === 0;        // Sunday
      const fullyBooked = i % 5 === 3;          // pretend some days are full
      button.disabled = closed || fullyBooked;
      button.title = closed ? "Closed" : fullyBooked ? "Fully booked" : "Open";
      button.onclick = function () {
        pickedDay = day;
        pickedTime = null;
        document.getElementById("calConfirm").disabled = true;
        grid.querySelectorAll(".cal-day").forEach(function (b) { b.classList.remove("picked"); });
        button.classList.add("picked");
        drawCalendarTimes(i);
      };
      grid.appendChild(button);
    }
  }

  // Shows hourly times from 8 AM to 4 PM. Some are already booked.
  function drawCalendarTimes(dayNumber) {
    const area = document.getElementById("calTimes");
    area.innerHTML = "";
    for (let hour = 8; hour <= 16; hour++) {
      const label = (hour > 12 ? hour - 12 : hour) + ":00 " + (hour < 12 ? "AM" : "PM");
      const button = document.createElement("button");
      button.className = "cal-time";
      button.textContent = label;
      button.disabled = (dayNumber + hour) % 3 === 0;   // pretend these are taken
      button.onclick = function () {
        pickedTime = label;
        area.querySelectorAll(".cal-time").forEach(function (b) { b.classList.remove("picked"); });
        button.classList.add("picked");
        document.getElementById("calConfirm").disabled = false;
      };
      area.appendChild(button);
    }
  }

  // Booking the appointment counts as fixing the reminder, so the score improves.
  function confirmAppointment() {
    closeOverlay("calendarOverlay");
    const info = scheduleFor.info;
    const when = pickedDay.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) + " at " + pickedTime;
    removeEvent(scheduleFor.id);
    resolveIssue(info);
    render();
    showToast(info.serviceName + " scheduled with your mechanic for " + when + ".", 8, FACE_HAPPY);
  }

  // ---------- FAKE PHOTO UPLOAD ----------
  // For the demo, this pretends to be a file picker with one file in it.
  let uploadFor = null;  // remembers which queued event opened the upload window

  function openUpload(entry) {
    uploadFor = entry;
    document.getElementById("uploadPrompt").textContent = entry.info.uploadPrompt;
    document.getElementById("demoFile").classList.remove("selected");
    document.getElementById("uploadBtn").disabled = true;
    document.getElementById("uploadOverlay").classList.add("show");
  }

  // Clicking the file highlights it and turns on the Upload button.
  function selectDemoPhoto() {
    document.getElementById("demoFile").classList.add("selected");
    document.getElementById("uploadBtn").disabled = false;
  }

  // Uploading finishes the reminder and removes it from the queue.
  function uploadPhoto() {
    document.getElementById("uploadOverlay").classList.remove("show");
    removeEvent(uploadFor.id);
    resolveIssue(uploadFor.info);   // fixed! the insurance score improves
    render();
    showToast(uploadFor.info.replacedMessage, 5, FACE_HAPPY);
  }

  // Cancel just closes the window. The reminder stays in the queue.
  function cancelUpload() {
    document.getElementById("uploadOverlay").classList.remove("show");
  }

  // ---------- End of demo script ----------

  return {
    render,
    actions: {
      openAccount,
      openChat,
      startCall,
      startClaim,
      closeChat,
      sendChat,
      closeFeed,
      showToast,
      FACE_FIRE,
      scheduleOnline,
      callForCarService,
      closeOverlay,
      confirmAppointment,
      selectDemoPhoto,
      uploadPhoto,
      cancelUpload,
    },
    stop() {
      timeouts.forEach((id) => window.clearTimeout(id));
      intervals.forEach((id) => window.clearInterval(id));
    },
  };
}
