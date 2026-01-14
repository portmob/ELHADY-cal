/* app.js — ELHADY */

/* ---------------------------
   Service Worker
   --------------------------- */
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(()=>{});
}

/* ---------------------------
   State & Storage
   --------------------------- */
const ds = (id) => document.getElementById(id);

let payments = JSON.parse(localStorage.getItem('payments') || '[]');
let supplies = JSON.parse(localStorage.getItem('supplies') || '[]');
let labor = JSON.parse(localStorage.getItem('labor') || '[]');
let currentSection = 'home';

function saveAll() {
    localStorage.setItem('payments', JSON.stringify(payments));
    localStorage.setItem('supplies', JSON.stringify(supplies));
    localStorage.setItem('labor', JSON.stringify(labor));
}

/* ---------------------------
   Navigation & UI
   --------------------------- */
function openSection(id) {
    // إخفاء كل الشاشات
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('visible'));

    // إظهار الشاشة المطلوبة
    const target = document.getElementById(id);
    if(target) target.classList.add('visible');

    currentSection = id;

    // تحديث العناوين
    const titles = {
        'home': 'ELHADY',
        'payments': 'المدفوعات',
        'supplies': 'التوريدات',
        'labor': 'العمالة'
    };
    document.getElementById('pageTitle').textContent = titles[id] || 'ELHADY';

    // تحديث حالة البار السفلي (Bottom Nav)
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if(id === 'home') {
        const navHome = document.getElementById('nav-home');
        if(navHome) navHome.classList.add('active');
    }

    // === التحكم في زر الرجوع وزر الإضافة (FAB) ===
    const fab = document.getElementById('fab');
    const backBtn = document.getElementById('backBtn');

    if (id === 'home') {
        // نحن في الرئيسية: أخفِ زر الرجوع وأخفِ زر الإضافة
        fab.style.display = 'none';
        backBtn.style.display = 'none';
    } else {
        // نحن في صفحة فرعية: أظهر زر الرجوع وأظهر زر الإضافة
        fab.style.display = 'flex';
        backBtn.style.display = 'flex';
    }

    // إعادة تحميل البيانات حسب القسم
    if (id === 'payments') renderPayments();
    if (id === 'supplies') renderSupplies();
    if (id === 'labor') renderLabor();
}

/* Initial Load */
window.addEventListener('load', () => {
    openSection('home');
    applyTheme();
});

/* Theme Toggle */
ds('themeBtn').addEventListener('click', () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
});

function applyTheme() {
    if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark');
}

/* FAB Action */
ds('fab').addEventListener('click', () => {
    if (currentSection === 'payments') openAddPayment();
    else if (currentSection === 'supplies') openAddSupply();
    else if (currentSection === 'labor') openAddLabor();
});

/* ---------------------------
   Modal System
   --------------------------- */
function openModal(html) {
    const backdrop = ds('modalBackdrop');
    backdrop.innerHTML = `<div class="md3-dialog">${html}</div>`;
    backdrop.classList.add('open');
}

function closeModal() {
    const backdrop = ds('modalBackdrop');
    backdrop.classList.remove('open');
    setTimeout(() => backdrop.innerHTML = '', 200);
}

/* Formatters */
const fmt = d => new Date(d).toLocaleDateString('ar-EG');
const esc = s => String(s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/* ---------------------------
   PAYMENTS
   --------------------------- */
function renderPayments() {
    const tbody = document.querySelector('#paymentsTable tbody');
    // Filters
    const f_sender = ds('fp_sender')?.value.toLowerCase();
    const f_recv = ds('fp_receiver')?.value.toLowerCase();

    let data = payments.filter(p => {
        if(f_sender && !p.sender.toLowerCase().includes(f_sender)) return false;
        if(f_recv && !p.receiver.toLowerCase().includes(f_recv)) return false;
        return true;
    });

    // Reverse for new first
    data = data.slice().reverse();

    tbody.innerHTML = data.map((p, i) => {
        // Calculate original index
        const realIndex = payments.length - 1 - i;
        return `
        <tr>
            <td>${i + 1}</td>
            <td>
                <div style="font-weight:500">${esc(p.sender)}</div>
                <div style="font-size:11px;opacity:0.7">إلى: ${esc(p.receiver)}</div>
            </td>
            <td style="font-weight:bold">${Number(p.amount).toLocaleString()}</td>
            <td style="font-size:12px">${fmt(p.date)}</td>
            <td>
                <button class="sm-btn edit" onclick="editPayment(${realIndex})"><span class="material-symbols-rounded">edit</span></button>
                <button class="sm-btn del" onclick="deletePayment(${realIndex})"><span class="material-symbols-rounded">delete</span></button>
            </td>
        </tr>`;
    }).join('');

    ds('totalPayments').textContent = data.reduce((a, b) => a + Number(b.amount), 0).toLocaleString();
    ds('paymentsCount').textContent = payments.length;
}

function openAddPayment() {
    openModal(`
        <h3>إضافة عملية</h3>
        <div class="field-group">
            <input id="pm_sender" class="md3-field" placeholder="المرسل">
            <input id="pm_receiver" class="md3-field" placeholder="المستلم">
            <input id="pm_amount" type="number" class="md3-field" placeholder="المبلغ">
        </div>
        <div class="dialog-actions">
            <button class="btn-text" onclick="closeModal()">إلغاء</button>
            <button class="btn-filled" id="savePay">حفظ</button>
        </div>
    `);
    ds('savePay').onclick = () => {
        const s = ds('pm_sender').value, r = ds('pm_receiver').value, a = ds('pm_amount').value;
        if (!s || !r || !a) return;
        payments.push({ sender: s, receiver: r, amount: Number(a), date: new Date().toISOString() });
        saveAll(); closeModal(); renderPayments();
    };
}

function editPayment(i) {
    const p = payments[i];
    openModal(`
        <h3>تعديل عملية</h3>
        <div class="field-group">
            <input id="pm_sender" class="md3-field" value="${esc(p.sender)}">
            <input id="pm_receiver" class="md3-field" value="${esc(p.receiver)}">
            <input id="pm_amount" type="number" class="md3-field" value="${p.amount}">
            <input id="pm_date" type="date" class="md3-field" value="${p.date.split('T')[0]}">
        </div>
        <div class="dialog-actions">
            <button class="btn-text" onclick="closeModal()">إلغاء</button>
            <button class="btn-filled" id="saveEdit">حفظ</button>
        </div>
    `);
    ds('saveEdit').onclick = () => {
        payments[i] = {
            sender: ds('pm_sender').value,
            receiver: ds('pm_receiver').value,
            amount: Number(ds('pm_amount').value),
            date: new Date(ds('pm_date').value).toISOString()
        };
        saveAll(); closeModal(); renderPayments();
    };
}

function deletePayment(i) {
    if (confirm('حذف العملية؟')) {
        payments.splice(i, 1); saveAll(); renderPayments();
    }
}

/* ---------------------------
   SUPPLIES
   --------------------------- */
function renderSupplies() {
    const tbody = document.querySelector('#suppliesTable tbody');
    let data = supplies.slice().reverse();

    tbody.innerHTML = data.map((s, i) => {
        const realIndex = supplies.length - 1 - i;
        return `
        <tr>
            <td>${i + 1}</td>
            <td>
                <div style="font-weight:500">${esc(s.sender)}</div>
                <div style="font-size:11px;opacity:0.7">إلى: ${esc(s.receiver)}</div>
            </td>
            <td>
                <div>${s.qty}</div>
                <div style="font-size:11px;opacity:0.7">${esc(s.type)}</div>
            </td>
            <td style="font-size:12px">${fmt(s.date)}</td>
            <td>
                <button class="sm-btn edit" onclick="editSupply(${realIndex})"><span class="material-symbols-rounded">edit</span></button>
                <button class="sm-btn del" onclick="deleteSupply(${realIndex})"><span class="material-symbols-rounded">delete</span></button>
            </td>
        </tr>`;
    }).join('');

    ds('totalSupplies').textContent = data.reduce((a, b) => a + Number(b.qty), 0);
    ds('suppliesCount').textContent = supplies.length;
}

function openAddSupply() {
    openModal(`
        <h3>إضافة توريدة</h3>
        <div class="field-group">
            <input id="sp_sender" class="md3-field" placeholder="المرسل">
            <input id="sp_receiver" class="md3-field" placeholder="المستلم">
            <input id="sp_qty" type="number" class="md3-field" placeholder="الكمية">
            <input id="sp_type" class="md3-field" placeholder="النوع">
        </div>
        <div class="dialog-actions">
            <button class="btn-text" onclick="closeModal()">إلغاء</button>
            <button class="btn-filled" id="saveSup">حفظ</button>
        </div>
    `);
    ds('saveSup').onclick = () => {
        const s = ds('sp_sender').value, r = ds('sp_receiver').value, q = ds('sp_qty').value, t = ds('sp_type').value;
        if (!s || !r || !q) return;
        supplies.push({ sender: s, receiver: r, qty: Number(q), type: t, date: new Date().toISOString() });
        saveAll(); closeModal(); renderSupplies();
    };
}

function editSupply(i) {
    const s = supplies[i];
    openModal(`
        <h3>تعديل توريدة</h3>
        <div class="field-group">
            <input id="sp_sender" class="md3-field" value="${esc(s.sender)}">
            <input id="sp_receiver" class="md3-field" value="${esc(s.receiver)}">
            <input id="sp_qty" type="number" class="md3-field" value="${s.qty}">
            <input id="sp_type" class="md3-field" value="${esc(s.type)}">
            <input id="sp_date" type="date" class="md3-field" value="${s.date.split('T')[0]}">
        </div>
        <div class="dialog-actions">
            <button class="btn-text" onclick="closeModal()">إلغاء</button>
            <button class="btn-filled" id="saveEditSup">حفظ</button>
        </div>
    `);
    ds('saveEditSup').onclick = () => {
        supplies[i] = {
            sender: ds('sp_sender').value,
            receiver: ds('sp_receiver').value,
            qty: Number(ds('sp_qty').value),
            type: ds('sp_type').value,
            date: new Date(ds('sp_date').value).toISOString()
        };
        saveAll(); closeModal(); renderSupplies();
    };
}

function deleteSupply(i) {
    if (confirm('حذف التوريدة؟')) {
        supplies.splice(i, 1); saveAll(); renderSupplies();
    }
}

/* ---------------------------
   LABOR
   --------------------------- */
function renderLabor() {
    const tbody = document.querySelector('#laborTable tbody');
    let data = labor.slice().reverse();

    tbody.innerHTML = data.map((l, i) => {
        const realIndex = labor.length - 1 - i;
        return `
        <tr>
            <td>
                <div style="font-weight:500">${esc(l.worker)}</div>
                <div style="font-size:11px;opacity:0.7">${esc(l.contractor)}</div>
            </td>
            <td style="font-size:12px">
                ${l.day ? '☀️ يوم' : ''} ${l.night ? '🌑 سهرة' : ''}
                <div style="opacity:0.6">${l.dayNo}/${l.month}</div>
            </td>
            <td style="font-size:12px">${esc(l.place)}</td>
            <td>
                <button class="sm-btn edit" onclick="editLabor(${realIndex})"><span class="material-symbols-rounded">edit</span></button>
                <button class="sm-btn del" onclick="deleteLabor(${realIndex})"><span class="material-symbols-rounded">delete</span></button>
            </td>
        </tr>`;
    }).join('');

    ds('laborCount').textContent = labor.length;
    ds('laborTotal').textContent = labor.length; // You can adjust logic to count unique workers if needed
}

function openAddLabor() {
    openModal(`
        <h3>إضافة عمالة</h3>
        <div class="field-group">
            <input id="l_worker" class="md3-field" placeholder="اسم العامل">
            <input id="l_contractor" class="md3-field" placeholder="المقاول">
            <input id="l_place" class="md3-field" placeholder="الموقع">
            
            <div class="checkbox-row">
                <input type="checkbox" id="l_day"> <label for="l_day">حضور يومي</label>
                <input type="checkbox" id="l_night" style="margin-right:15px"> <label for="l_night">سهرة</label>
            </div>

            <div style="display:flex;gap:10px">
                <input id="l_dayNo" type="number" class="md3-field" placeholder="اليوم (1-31)">
                <input id="l_month" class="md3-field" placeholder="الشهر (2025-01)">
            </div>
        </div>
        <div class="dialog-actions">
            <button class="btn-text" onclick="closeModal()">إلغاء</button>
            <button class="btn-filled" id="saveLabor">حفظ</button>
        </div>
    `);
    ds('saveLabor').onclick = () => {
        labor.push({
            worker: ds('l_worker').value,
            contractor: ds('l_contractor').value,
            place: ds('l_place').value,
            day: ds('l_day').checked,
            night: ds('l_night').checked,
            dayNo: ds('l_dayNo').value,
            month: ds('l_month').value
        });
        saveAll(); closeModal(); renderLabor();
    };
}

function editLabor(i) {
    const l = labor[i];
    openModal(`
        <h3>تعديل عمالة</h3>
        <div class="field-group">
            <input id="l_worker" class="md3-field" value="${esc(l.worker)}">
            <input id="l_contractor" class="md3-field" value="${esc(l.contractor)}">
            <input id="l_place" class="md3-field" value="${esc(l.place)}">
            
            <div class="checkbox-row">
                <input type="checkbox" id="l_day" ${l.day?'checked':''}> <label for="l_day">حضور يومي</label>
                <input type="checkbox" id="l_night" ${l.night?'checked':''} style="margin-right:15px"> <label for="l_night">سهرة</label>
            </div>

            <div style="display:flex;gap:10px">
                <input id="l_dayNo" type="number" class="md3-field" value="${l.dayNo}">
                <input id="l_month" class="md3-field" value="${l.month}">
            </div>
        </div>
        <div class="dialog-actions">
            <button class="btn-text" onclick="closeModal()">إلغاء</button>
            <button class="btn-filled" id="saveEditLab">حفظ</button>
        </div>
    `);
    ds('saveEditLab').onclick = () => {
        labor[i] = {
            worker: ds('l_worker').value,
            contractor: ds('l_contractor').value,
            place: ds('l_place').value,
            day: ds('l_day').checked,
            night: ds('l_night').checked,
            dayNo: ds('l_dayNo').value,
            month: ds('l_month').value
        };
        saveAll(); closeModal(); renderLabor();
    };
}

function deleteLabor(i) {
    if (confirm('حذف السجل؟')) { labor.splice(i, 1); saveAll(); renderLabor(); }
}

/* ---------------------------
   Global Tab Actions
   --------------------------- */
function onTab(action) {
    if (action === 'filter') {
        // Simple filter placeholder for now
        openModal(`
            <h3>بحث / فلترة</h3>
            <p>فلترة الجدول الحالي</p>
            <div class="field-group">
                <input id="filter_in" class="md3-field" placeholder="بحث بالاسم...">
            </div>
            <div class="dialog-actions">
                <button class="btn-text" onclick="closeModal()">إلغاء</button>
                <button class="btn-filled" onclick="applyFilter()">تطبيق</button>
            </div>
        `);
    }
    else if (action === 'export') {
        if (currentSection === 'payments') exportData(payments, 'Payments');
        else if (currentSection === 'supplies') exportData(supplies, 'Supplies');
        else if (currentSection === 'labor') exportData(labor, 'Labor');
    }
}

function applyFilter() {
    const val = ds('filter_in').value;
    if(currentSection === 'payments') ds('fp_sender').value = val;
    // ... add other logic for supplies filter connection if needed
    closeModal();
    if(currentSection === 'payments') renderPayments();
}

function exportData(dataset, name) {
    if(!dataset.length) return alert('لا يوجد بيانات');
    const ws = XLSX.utils.json_to_sheet(dataset);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, name);
    XLSX.writeFile(wb, `ELHADY_${name}.xlsx`);
}