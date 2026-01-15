/* app.js — ELHADY Cal+ (MD3 Updated) */

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(()=>{});
}

const ds = (id) => document.getElementById(id);
let payments = JSON.parse(localStorage.getItem('payments') || '[]');
let supplies = JSON.parse(localStorage.getItem('supplies') || '[]');
let labor = JSON.parse(localStorage.getItem('labor') || '[]');

let currentSection = 'home';
let activeFilter = ''; // Stores search query

function saveAll() {
    localStorage.setItem('payments', JSON.stringify(payments));
    localStorage.setItem('supplies', JSON.stringify(supplies));
    localStorage.setItem('labor', JSON.stringify(labor));
}

/* ---------------------------
   Navigation & Animation
   --------------------------- */
function openSection(id) {
    // 1. Reset Filter when changing pages
    activeFilter = '';

    // 2. Handle Screens Visibility
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('visible'));
    ds(id).classList.add('visible');
    currentSection = id;

    // 3. UI Updates
    const titles = { 'home': 'ELHADY', 'payments': 'المدفوعات', 'supplies': 'التوريدات', 'labor': 'العمالة' };
    ds('pageTitle').textContent = titles[id] || 'ELHADY';

    // 4. Back Button Logic
    if(id === 'home') {
        ds('backBtn').style.display = 'none';
        ds('fab').style.display = 'none';
        ds('nav-home').classList.add('active');
    } else {
        ds('backBtn').style.display = 'flex';
        ds('fab').style.display = 'flex';
        ds('nav-home').classList.remove('active');
    }

    // 5. Render Data
    renderAll();
}

function renderAll() {
    if (currentSection === 'payments') renderPayments();
    if (currentSection === 'supplies') renderSupplies();
    if (currentSection === 'labor') renderLabor();
}

window.addEventListener('load', () => {
    openSection('home');
    if(localStorage.getItem('theme') === 'dark') document.body.classList.add('dark');
});

ds('themeBtn').onclick = () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
};

/* ---------------------------
   HELPER: Date Totals
   --------------------------- */
function calculateTotals(data, valueKey, dateKey = 'date') {
    const now = new Date();
    const curM = now.getMonth();     // 0-11
    const curY = now.getFullYear();

    // Logic for Previous Month (handle Jan rollback)
    const prevM = curM === 0 ? 11 : curM - 1;
    const prevY = curM === 0 ? curY - 1 : curY;

    let total = 0, current = 0, previous = 0;

    data.forEach(item => {
        // Assume date stored as ISO string or YYYY-MM-DD
        // Use logic to parse custom date format if labor uses custom
        let d = new Date(item[dateKey]);
        if(isNaN(d.getTime())) {
            // Fallback for Labor if stored differently, labor stores month as "YYYY-MM"
            if(item.month) d = new Date(item.month + "-01");
        }

        const val = Number(item[valueKey]) || 1; // Default to 1 for counting (labor)

        total += val;

        if (d.getMonth() === curM && d.getFullYear() === curY) current += val;
        if (d.getMonth() === prevM && d.getFullYear() === prevY) previous += val;
    });

    return { total, current, previous };
}

/* ---------------------------
   PAYMENTS
   --------------------------- */
function renderPayments() {
    const list = document.getElementById('paymentsList');

    // حماية: التأكد من وجود العنصر في html
    if (!list) {
        console.error("خطأ: لم يتم العثور على العنصر id='paymentsList' في ملف html");
        return;
    }

    list.innerHTML = ''; // مسح المحتوى القديم

    // تجهيز كلمة البحث (تحويلها لأحرف صغيرة لتسهيل البحث)
    const term = (activeFilter || '').toLowerCase();

    // فلترة البيانات
    let data = payments.filter(p => {
        const s = (p.sender || '').toLowerCase();
        const r = (p.receiver || '').toLowerCase();
        return s.includes(term) || r.includes(term);
    }).slice().reverse(); // الأحدث أولاً

    // حساب الإجماليات
    const stats = calculateTotals(payments, 'amount');
    if(ds('pay_curr')) ds('pay_curr').textContent = stats.current.toLocaleString();
    if(ds('pay_prev')) ds('pay_prev').textContent = stats.previous.toLocaleString();
    if(ds('pay_all')) ds('pay_all').textContent = stats.total.toLocaleString();

    // إذا لم توجد بيانات
    if (data.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.6">لا توجد مدفوعات للعرض</div>';
        return;
    }

    // رسم البطاقات
    data.forEach((p) => {
        // العثور على الترتيب الأصلي للحذف والتعديل
        const realIndex = payments.indexOf(p);

        const card = document.createElement('div');
        card.className = 'filled-card';
        card.innerHTML = `
            <div class="info">
                <div class="main-text">${p.sender}</div>
                <div class="sub-text">
                    <span class="material-symbols-rounded" style="font-size:14px; margin-left:4px">arrow_back</span>
                    ${p.receiver}
                </div>
                <div class="sub-text" style="opacity:0.6; font-size:11px; margin-top:4px">
                    ${new Date(p.date).toLocaleDateString('ar-EG')}
                </div>
            </div>
            
            <div style="text-align:left">
                <div class="amount" style="color:var(--md-sys-color-primary); font-weight:bold; font-size:16px">
                    ${Number(p.amount).toLocaleString()}
                </div>
                <div class="actions" style="margin-top:8px; display:flex; gap:10px; justify-content:flex-end">
                    <span onclick="delPay(${realIndex})" class="material-symbols-rounded" style="font-size:20px; color:#ba1a1a; cursor:pointer">delete</span>
                </div>
            </div>
        `;
        list.appendChild(card);
    });
}

function delPay(i) { if(confirm('حذف؟')) { payments.splice(i,1); saveAll(); renderPayments(); } }

/* ---------------------------
   SUPPLIES
   --------------------------- */
function renderSupplies() {
    const list = ds('suppliesList');
    list.innerHTML = '';

    let data = supplies.filter(s =>
        s.sender.includes(activeFilter) || s.type.includes(activeFilter)
    ).slice().reverse();

    const stats = calculateTotals(supplies, 'qty');
    ds('sup_curr').textContent = stats.current;
    ds('sup_prev').textContent = stats.previous;
    ds('sup_all').textContent = stats.total;

    data.forEach((s) => {
        const realIndex = supplies.indexOf(s);
        const card = document.createElement('div');
        card.className = 'filled-card';
        card.innerHTML = `
            <div class="info">
                <div class="main-text">${s.type} <span style="font-size:12px;opacity:0.7">(${s.sender})</span></div>
                <div class="sub-text">
                    إلى: ${s.receiver} • ${new Date(s.date).toLocaleDateString('ar-EG')}
                </div>
            </div>
            <div class="amount">${s.qty}</div>
            <div class="actions">
                <button class="icon-btn" style="width:32px;height:32px" onclick="delSup(${realIndex})">
                    <span class="material-symbols-rounded" style="font-size:18px;color:var(--md-sys-color-error)">delete</span>
                </button>
            </div>
        `;
        list.appendChild(card);
    });
}
function delSup(i) { if(confirm('حذف؟')) { supplies.splice(i,1); saveAll(); renderSupplies(); } }

/* ---------------------------
   LABOR
   --------------------------- */
function renderLabor() {
    const list = ds('laborList');
    list.innerHTML = '';

    let data = labor.filter(l => l.worker.includes(activeFilter)).slice().reverse();

    // Calculate totals (Count only)
    const stats = calculateTotals(labor, null, 'month'); // Special date handling
    ds('lab_curr').textContent = stats.current;
    ds('lab_prev').textContent = stats.previous;
    ds('lab_all').textContent = stats.total;

    data.forEach((l) => {
        const realIndex = labor.indexOf(l);
        const card = document.createElement('div');
        card.className = 'filled-card';
        card.innerHTML = `
            <div class="info">
                <div class="main-text">${l.worker}</div>
                <div class="sub-text">
                    ${l.contractor} • ${l.place}
                </div>
                <div class="sub-text" style="color:var(--md-sys-color-primary)">
                    ${l.day?'☀️ يوم ':''} ${l.night?'🌑 سهرة':''} (${l.dayNo}/${l.month})
                </div>
            </div>
            <div class="actions">
                 <button class="icon-btn" style="width:32px;height:32px" onclick="delLab(${realIndex})">
                    <span class="material-symbols-rounded" style="font-size:18px;color:var(--md-sys-color-error)">delete</span>
                </button>
            </div>
        `;
        list.appendChild(card);
    });
}
function delLab(i) { if(confirm('حذف؟')) { labor.splice(i,1); saveAll(); renderLabor(); } }

/* ---------------------------
   ADD ACTIONS (FAB)
   --------------------------- */
ds('fab').onclick = () => {
    if(currentSection === 'payments') {
        openModal(`
            <h3>إضافة مبلغ</h3>
            <input id="in1" class="md3-field" placeholder="المرسل">
            <input id="in2" class="md3-field" placeholder="المستلم">
            <input id="in3" type="number" class="md3-field" placeholder="المبلغ">
            <button class="menu-card" style="width:100%;background:var(--md-sys-color-primary);color:#fff" onclick="addPay()">حفظ</button>
        `);
    } else if (currentSection === 'supplies') {
        openModal(`
            <h3>إضافة توريدة</h3>
            <input id="s1" class="md3-field" placeholder="النوع">
            <input id="s2" type="number" class="md3-field" placeholder="الكمية">
            <input id="s3" class="md3-field" placeholder="المرسل">
            <input id="s4" class="md3-field" placeholder="المستلم">
            <button class="menu-card" style="width:100%;background:var(--md-sys-color-primary);color:#fff" onclick="addSup()">حفظ</button>
        `);
    } else if (currentSection === 'labor') {
        const today = new Date();
        const mStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0');
        openModal(`
            <h3>إضافة عمالة</h3>
            <input id="l1" class="md3-field" placeholder="العامل">
            <input id="l2" class="md3-field" placeholder="المقاول">
            <input id="l3" class="md3-field" placeholder="الموقع">
            <div style="display:flex;gap:10px;margin-bottom:10px">
                <label><input type="checkbox" id="chkD"> يومي</label>
                <label><input type="checkbox" id="chkN"> سهرة</label>
            </div>
            <input id="l4" value="${today.getDate()}" class="md3-field" placeholder="اليوم">
            <input id="l5" value="${mStr}" class="md3-field" placeholder="الشهر">
            <button class="menu-card" style="width:100%;background:var(--md-sys-color-primary);color:#fff" onclick="addLab()">حفظ</button>
        `);
    }
};

/* ---------------------------
   ADD LOGIC (تم التصحيح)
   --------------------------- */

// إضافة مدفوعات
window.addPay = () => {
    const s = ds('in1').value.trim(); // المرسل
    const r = ds('in2').value.trim(); // المستلم
    const a = ds('in3').value;        // المبلغ

    // 1. التحقق أن الحقول ليست فارغة
    if (!s || !a) {
        alert("⚠️ يرجى كتابة اسم المرسل والمبلغ على الأقل!");
        return;
    }

    // 2. الحفظ
    payments.push({
        sender: s,
        receiver: r || "بدون اسم", // لو المستلم فارغ نكتب "بدون اسم"
        amount: Number(a),        // تحويل النص لرقم ضروري عشان الجمع يشتغل
        date: new Date().toISOString()
    });

    saveAll();      // حفظ في الذاكرة
    closeModal();   // غلق النافذة
    renderPayments(); // تحديث الشاشة
};

// إضافة توريدات
window.addSup = () => {
    const type = ds('s1').value.trim();
    const qty = ds('s2').value;
    const sender = ds('s3').value.trim();
    const receiver = ds('s4').value.trim();

    if (!type || !qty) {
        alert("⚠️ يرجى كتابة النوع والكمية!");
        return;
    }

    supplies.push({
        type: type,
        qty: Number(qty),
        sender: sender || "غير محدد",
        receiver: receiver || "المخزن",
        date: new Date().toISOString()
    });

    saveAll();
    closeModal();
    renderSupplies();
};

// إضافة عمالة
window.addLab = () => {
    const worker = ds('l1').value.trim();

    if (!worker) {
        alert("⚠️ يجب كتابة اسم العامل!");
        return;
    }

    labor.push({
        worker: worker,
        contractor: ds('l2').value.trim(),
        place: ds('l3').value.trim(),
        day: ds('chkD').checked,
        night: ds('chkN').checked,
        dayNo: ds('l4').value,
        month: ds('l5').value
    });

    saveAll();
    closeModal();
    renderLabor();
};

/* ---------------------------
   FILTER & MODAL
   --------------------------- */
function openFilterModal() {
    if(currentSection === 'home') return alert('اختر قسماً أولاً');
    openModal(`
        <h3>بحث سريع</h3>
        <input id="searchInput" class="md3-field" placeholder="ابحث بالاسم أو النوع..." oninput="runFilter(this.value)">
        <button class="icon-btn" onclick="closeModal()" style="margin:0 auto">إغلاق</button>
    `);
    // Auto focus
    setTimeout(()=>ds('searchInput').focus(), 100);
}

window.runFilter = (val) => {
    activeFilter = val;
    renderAll();
};

function openModal(html) {
    const b = ds('modalBackdrop');
    b.innerHTML = `<div class="md3-dialog">${html}</div>`;
    b.classList.add('open');
}
window.closeModal = () => {
    ds('modalBackdrop').classList.remove('open');
    // Clear filter if closed? Optional. Keeping it active allows viewing results.
};
ds('modalBackdrop').onclick = (e) => {
    if(e.target === ds('modalBackdrop')) closeModal();
};

function exportCurrentData() {
    if(currentSection === 'home') return alert('اختر قسماً للتصدير');
    let d = [], name = currentSection;
    if(currentSection === 'payments') d = payments;
    if(currentSection === 'supplies') d = supplies;
    if(currentSection === 'labor') d = labor;

    if(!d.length) return alert('لا يوجد بيانات');
    const ws = XLSX.utils.json_to_sheet(d);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, name);
    XLSX.writeFile(wb, `ELHADY_${name}.xlsx`);
}