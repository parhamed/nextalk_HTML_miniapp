const apiUrl = "https://nextalk-n8n.ir/webhook/miniapp-classes";

const levelMap = { beginner: "مقدماتی", intermediate: "متوسط", advanced: "پیشرفته" };
const dayMap = {
  saturday: "شنبه", sunday: "یکشنبه", monday: "دوشنبه", tuesday: "سه‌شنبه",
  wednesday: "چهارشنبه", thursday: "پنجشنبه", friday: "جمعه"
};

/* ---------- Accordion ---------- */
function togglePanel(id) {
  document.getElementById(id).classList.toggle("collapsed");
}

/* ---------- Toast ---------- */
function toast(msg, type = "info") {
  const wrap = document.getElementById("toasts");
  const el = document.createElement("div");
  el.className = "toast " + type;
  const icon = type === "success" ? "✅" : type === "error" ? "⚠️" : "ℹ️";
  el.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
  wrap.appendChild(el);
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 300); }, 3200);
}

/* ---------- Confirm modal ---------- */
let pendingDeleteId = null;
const overlay = document.getElementById("modalOverlay");
document.getElementById("modalCancel").onclick = () => closeModal();
overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };
document.getElementById("modalConfirm").onclick = () => {
  if (pendingDeleteId != null) doDeleteClass(pendingDeleteId);
  closeModal();
};
function closeModal() { overlay.classList.remove("open"); pendingDeleteId = null; }

function loadingState(target, text) {
  document.getElementById(target).innerHTML =
    `<div class="state"><div class="spinner"></div>${text}</div>`;
}

/* ---------- Classes ---------- */
async function listClasses() {
  loadingState("classes", "در حال بارگذاری کلاس‌ها...");
  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "listClasses" })
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    renderClasses(Array.isArray(data) ? data : (data.items || []));
  } catch (err) {
    console.error("❌ LIST ERROR:", err);
    renderStats([]);
    document.getElementById("classes").innerHTML =
      `<div class="state"><span class="emoji">⚠️</span>خطا در دریافت لیست کلاس‌ها</div>`;
    toast("خطا در دریافت لیست کلاس‌ها", "error");
  }
}

function renderClasses(classes) {
  renderStats(classes);
  if (!Array.isArray(classes) || classes.length === 0) {
    document.getElementById("classes").innerHTML =
      `<div class="state"><span class="emoji">📭</span>هنوز کلاسی ثبت نشده است</div>`;
    return;
  }
  let cards = classes.map(c => {
    const total = Number(c.capacity_total) || 0;
    const used = Number(c.capacity_used) || 0;
    const pct = total ? Math.min(100, Math.round(used / total * 100)) : 0;
    const lvl = (c.level || "").toLowerCase();
    const badge = levelMap[lvl] ? `<span class="badge ${lvl}">${levelMap[lvl]}</span>` : `<span class="badge neutral">${c.level || '-'}</span>`;
    return `
      <div class="card">
        <div class="card-top">
          <span class="card-id">#${c.id}</span>
          ${badge}
        </div>
        <div class="card-rows">
          <div class="card-row"><span class="ck">روز هفته</span><span class="cv">${dayMap[c.week_days] || c.week_days || '-'}</span></div>
          <div class="card-row"><span class="ck">تاریخ شروع</span><span class="cv">${c.date_shamsi || '-'}</span></div>
          <div class="card-row"><span class="ck">ساعت کلاس</span><span class="cv">${c.start_time || '-'} - ${c.end_time || '-'}</span></div>
        </div>
        <div class="card-cap">
          <div class="cap-bar">
            <div class="cap-track"><div class="cap-fill" style="width:${pct}%"></div></div>
            <span class="cap-num">${used}/${total}</span>
          </div>
        </div>
        <div class="card-actions">
          <button class="icon-btn view" onclick="getUsers(${c.id})">👥 کاربران</button>
          <button class="icon-btn delete" onclick="deleteClass(${c.id})">🗑️ حذف</button>
        </div>
      </div>`;
  }).join("");

  document.getElementById("classes").innerHTML = `<div class="cards">${cards}</div>`;
}

/* ---------- Stats Dashboard ---------- */
function renderStats(classes) {
  const grid = document.getElementById("statsGrid");
  if (!grid) return;
  if (!Array.isArray(classes) || classes.length === 0) {
    grid.innerHTML = `<div class="state" style="grid-column:1/-1"><span class="emoji">📭</span>هنوز داده‌ای برای نمایش نیست</div>`;
    return;
  }
  let totalCap = 0, totalUsed = 0, fullCount = 0, lowCount = 0;
  classes.forEach(c => {
    const t = Number(c.capacity_total) || 0;
    const u = Number(c.capacity_used) || 0;
    totalCap += t; totalUsed += u;
    const pct = t ? (u / t * 100) : 0;
    if (pct >= 100) fullCount++;
    if (pct < 50) lowCount++;
  });
  const fillPct = totalCap ? Math.round(totalUsed / totalCap * 100) : 0;
  const freeSeats = totalCap - totalUsed;

  grid.innerHTML = `
    <div class="stat accent">
      <div class="stat-top"><span class="stat-ico">📚</span><span class="stat-label">کلاس‌های فعال</span></div>
      <div class="stat-value">${classes.length}</div>
      <div class="stat-sub">مجموع کلاس‌ها</div>
    </div>
    <div class="stat success">
      <div class="stat-top"><span class="stat-ico">👥</span><span class="stat-label">دانش‌آموزان</span></div>
      <div class="stat-value">${totalUsed}</div>
      <div class="stat-sub">از ${totalCap} ظرفیت</div>
    </div>
    <div class="stat">
      <div class="stat-top"><span class="stat-ico">📈</span><span class="stat-label">نرخ پر شدن</span></div>
      <div class="stat-value">${fillPct}%</div>
      <div class="stat-sub">${freeSeats} صندلی خالی</div>
    </div>
    <div class="stat warning">
      <div class="stat-top"><span class="stat-ico">⚡</span><span class="stat-label">پر / کم‌ظرفیت</span></div>
      <div class="stat-value">${fullCount} / ${lowCount}</div>
      <div class="stat-sub">پر شده / زیر ۵۰٪</div>
    </div>`;
}

/* ---------- Users ---------- */
async function getUsers(classId) {
  document.getElementById("usersPanel").classList.remove("collapsed");
  document.getElementById("users").scrollIntoView({ behavior: "smooth", block: "start" });
  loadingState("users", "در حال بارگذاری کاربران...");
  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "getUsers", class_id: classId })
    });
    const data = await res.json();
    renderUsers(data);
  } catch (err) {
    document.getElementById("users").innerHTML =
      `<div class="state"><span class="emoji">⚠️</span>خطا در دریافت کاربران</div>`;
  }
}

function renderUsers(users) {
  if (!Array.isArray(users) || users.length === 0) {
    document.getElementById("users").innerHTML =
      `<div class="state"><span class="emoji">🙈</span>هیچ کاربری ثبت نشده است.</div>`;
    return;
  }
  let cards = users.map(u => {
    const lvl = levelMap[(u.level||'').toLowerCase()] || u.level || '-';
    return `
      <div class="card">
        <div class="card-top">
          <span class="card-name">${u.name ?? '-'}</span>
          <span class="card-id">#${u.id ?? '-'}</span>
        </div>
        <div class="card-rows">
          <div class="card-row"><span class="ck">پلتفرم</span><span class="cv">${u.platform_id ?? '-'}</span></div>
          <div class="card-row"><span class="ck">شماره تماس</span><span class="cv">${u.phone ?? '-'}</span></div>
          <div class="card-row"><span class="ck">کورس</span><span class="cv">${u.course_type ?? '-'}</span></div>
          <div class="card-row"><span class="ck">سطح</span><span class="cv">${lvl}</span></div>
          <div class="card-row"><span class="ck">کد کلاس</span><span class="cv">${u.class_id ?? '-'}</span></div>
        </div>
      </div>`;
  }).join("");

  document.getElementById("users").innerHTML = `<div class="cards">${cards}</div>`;
}

/* ---------- Delete ---------- */
function deleteClass(classId) {
  pendingDeleteId = classId;
  overlay.classList.add("open");
}
async function doDeleteClass(classId) {
  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deleteClass", class_id: classId })
    });
    if (res.ok) { toast("کلاس با موفقیت حذف شد", "success"); listClasses(); }
    else { toast("خطا در حذف کلاس", "error"); }
  } catch (err) { toast("خطا در حذف کلاس", "error"); }
}

/* ---------- Time options ---------- */
function buildTimeOptions(selectId) {
  const sel = document.getElementById(selectId);
  sel.innerHTML = '<option value="">--:--</option>';
  for (let h = 0; h <= 24; h++) {
    const hh = String(h).padStart(2, "0");
    const opt = document.createElement("option");
    opt.value = `${hh}:00`;
    opt.textContent = `${hh}:00`;
    sel.appendChild(opt);
  }
}

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  listClasses();
  buildTimeOptions("start_time");
  buildTimeOptions("end_time");

  document.getElementById("createClassForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("submitBtn");
    btn.disabled = true;
    btn.innerHTML = '<span>در حال ارسال...</span>';

    const payload = {
      action: "createClass",
      level: document.getElementById("level").value,
      week_day: document.getElementById("week_day").value,
      start_time: document.getElementById("start_time").value,
      end_time: document.getElementById("end_time").value,
      capacity_total: Number(document.getElementById("capacity_total").value),
      repeat_count: Number(document.getElementById("repeat_count").