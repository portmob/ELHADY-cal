/* app.js — ELHADY Cal+ (Glass iOS18) */

/* ---------------------------
   Service Worker registration
   --------------------------- */
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
        .then(reg => {
            // auto-update flow
            if (reg.waiting) {
                reg.waiting.postMessage("skipWaiting");
            }
            reg.addEventListener('updatefound', () => {
                const nw = reg.installing;
                nw.addEventListener('statechange', () => {
                    if (nw.state === 'installed' && navigator.serviceWorker.controller) {
                        // new SW installed -> reload
                        nw.postMessage('skipWaiting');
                        setTimeout(()=> location.reload(), 500);
                    }
                });
            });
        }).catch(()=>{ /* ignore reg errors */ });
}

/* ---------------------------
   Storage & helpers
   --------------------------- */
const ds = (id)=>document.getElementById(id);
const modalBackdrop = ds('modalBackdrop');

let payments = JSON.parse(localStorage.getItem('payments')||'[]');
let supplies = JSON.parse(localStorage.getItem('supplies')||'[]');
let labor = JSON.parse(localStorage.getItem('labor') || '[]');
function saveAll(){
    localStorage.setItem('payments', JSON.stringify(payments));
    localStorage.setItem('supplies', JSON.stringify(supplies));
    localStorage.setItem('labor', JSON.stringify(labor));
}

/* splash hide */
window.addEventListener('load', ()=> setTimeout(()=> { const s=ds('splash'); if(s) s.style.display='none'; }, 800));

/* theme toggle */
const themeBtn = document.querySelector('.circle-btn') || ds('themeBtn');
if (localStorage.getItem('theme') === 'light') document.body.classList.add('light');
themeBtn && themeBtn.addEventListener('click', ()=> {
    document.body.classList.toggle('light');
    localStorage.setItem('theme', document.body.classList.contains('light')?'light':'dark');
});

/* navigation */
function openSection(id){
    document.querySelectorAll('.screen').forEach(s=> s.classList.remove('visible'));
    ds(id).classList.add('visible');
    // re-render
    if (id === 'payments') renderPayments();
    if (id === 'supplies') renderSupplies();
}

/* initially home */
openSection('home');

/* FAB behavior */
ds('fab').addEventListener('click', ()=> {
    if (ds('payments').classList.contains('visible')) openAddPayment();
    else if (ds('supplies').classList.contains('visible')) openAddSupply();
    else if (ds('labor').classList.contains('visible')) openAddLabor();
    else openSection('payments');
});

/* modal helpers */
function openModal(html){
    modalBackdrop.innerHTML = `<div class="modal">${html}</div>`;
    modalBackdrop.style.display = 'flex';
    requestAnimationFrame(()=> modalBackdrop.querySelector('.modal').classList.add('show'));
}
function closeModal(){
    const box = modalBackdrop.querySelector('.modal');
    if (box) box.classList.remove('show');
    setTimeout(()=> { modalBackdrop.style.display='none'; modalBackdrop.innerHTML=''; },180);
}

/* date format */
const fmt = d => new Date(d).toLocaleDateString();

/* ---------------------------
   PAYMENTS
   --------------------------- */
function renderPayments(){
    const tbody = document.querySelector('#paymentsTable tbody');
    const fp_sender = ds('fp_sender')?.value || '';
    const fp_receiver = ds('fp_receiver')?.value || '';
    const fp_start = ds('fp_start')?.value || '';
    const fp_end = ds('fp_end')?.value || '';

    let data = payments.filter(p=>{
        const pd = new Date(p.date);
        if (fp_sender && !p.sender.toLowerCase().includes(fp_sender.toLowerCase())) return false;
        if (fp_receiver && !p.receiver.toLowerCase().includes(fp_receiver.toLowerCase())) return false;
        if (fp_start && pd < new Date(fp_start)) return false;
        if (fp_end && pd > new Date(fp_end)) return false;
        return true;
    });
    /* HERE: Reverse order */
    data = data.slice().reverse();
    tbody.innerHTML = data.map((p,i)=>`
    <tr>
      <td>${i+1}</td>
      <td>${escapeHtml(p.sender)}</td>
      <td>${escapeHtml(p.receiver)}</td>
      <td>${Number(p.amount).toLocaleString()}</td>
      <td>${fmt(p.date)}</td>
      <td>
        <button class="btn-edit" onclick="editPayment(${(payments.length - 1 - i)})">تعديل</button>
        <button class="btn-delete" onclick="deletePayment(${(payments.length - 1 - i)})">حذف</button>
      </td>
    </tr>
  `).join('');

    ds('totalPayments').textContent = data.reduce((s,x)=> s + Number(x.amount), 0);
    ds('paymentsCount').textContent = payments.length;
}

/* add/edit/delete payments */
function openAddPayment(){
    openModal(`
    <h3>إضافة عملية</h3>
    <input id="pm_sender" placeholder="المرسل">
    <input id="pm_receiver" placeholder="المستلم">
    <input id="pm_amount" type="number" placeholder="المبلغ">
    <div class="actions">
      <button class="btn-ios" onclick="closeModal()">إلغاء</button>
      <button class="btn-ios" id="savePaymentBtn">حفظ</button>
    </div>
  `);
    ds('savePaymentBtn').onclick = ()=>{
        const s = ds('pm_sender').value.trim();
        const r = ds('pm_receiver').value.trim();
        const a = ds('pm_amount').value.trim();
        if(!s||!r||!a) return alert('املأ الحقول');
        payments.push({ sender:s, receiver:r, amount:Number(a), date:new Date().toISOString() });
        saveAll(); closeModal(); renderPayments();
    };
}

function editPayment(i){
    const p = payments[i];
    openModal(`
    <h3>تعديل عملية</h3>
    <input id="pm_sender" value="${escapeAttr(p.sender)}">
    <input id="pm_receiver" value="${escapeAttr(p.receiver)}">
    <input id="pm_amount" type="number" value="${p.amount}">
    <input id="pm_date" type="date" value="${p.date.split('T')[0]}">
    <div class="actions">
      <button class="btn-ios" onclick="closeModal()">إلغاء</button>
      <button class="btn-ios" id="saveEditPaymentBtn">حفظ</button>
    </div>
  `);
    ds('saveEditPaymentBtn').onclick = ()=>{
        const s = ds('pm_sender').value.trim();
        const r = ds('pm_receiver').value.trim();
        const a = ds('pm_amount').value;
        const d = ds('pm_date').value;
        payments[i] = { sender:s, receiver:r, amount:Number(a), date:new Date(d).toISOString() };
        saveAll(); closeModal(); renderPayments();
    };
}

function deletePayment(i){
    if(!confirm('مسح العملية؟')) return;
    payments.splice(i,1);
    saveAll(); renderPayments();
}

/* filters modal for payments */
function openFilterPayments(){
    openModal(`
    <h3>فلترة المدفوعات</h3>
    <input id="fp_sender_m" placeholder="المرسل">
    <input id="fp_receiver_m" placeholder="المستلم">
    <input id="fp_start_m" type="date">
    <input id="fp_end_m" type="date">
    <div class="actions">
      <button class="btn-ios" id="clearPayFilterBtn">مسح</button>
      <button class="btn-ios" id="applyPayFilterBtn">تطبيق</button>
    </div>
  `);
    ds('applyPayFilterBtn').onclick = ()=>{
        if(!ds('fp_sender')) {
            document.body.insertAdjacentHTML('beforeend','<input id="fp_sender" type="hidden"><input id="fp_receiver" type="hidden"><input id="fp_start" type="hidden"><input id="fp_end" type="hidden">');
        }
        ds('fp_sender').value = ds('fp_sender_m').value;
        ds('fp_receiver').value = ds('fp_receiver_m').value;
        ds('fp_start').value = ds('fp_start_m').value;
        ds('fp_end').value = ds('fp_end_m').value;
        closeModal(); renderPayments();
    };
    ds('clearPayFilterBtn').onclick = ()=>{
        if(ds('fp_sender')){ ds('fp_sender').value=''; ds('fp_receiver').value=''; ds('fp_start').value=''; ds('fp_end').value=''; }
        closeModal(); renderPayments();
    };
}

/* export payments */
function exportPayments(){
    if(!payments.length) return alert('لا يوجد بيانات');
    const data = payments.map((p,i)=> ({ '#': i+1, 'المرسل': p.sender, 'المستلم': p.receiver, 'المبلغ': p.amount, 'التاريخ': fmt(p.date) }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Payments');
    XLSX.writeFile(wb, 'ELHADY_Payments.xlsx');
}

/* ---------------------------
   SUPPLIES (same pattern)
   --------------------------- */

function renderSupplies(){
    const tbody = document.querySelector('#suppliesTable tbody');
    const fs_sender = ds('fs_sender')?.value || '';
    const fs_receiver = ds('fs_receiver')?.value || '';
    const fs_start = ds('fs_start')?.value || '';
    const fs_end = ds('fs_end')?.value || '';

    let data = supplies.filter(s=>{
        const sd = new Date(s.date);
        if (fs_sender && !s.sender.toLowerCase().includes(fs_sender.toLowerCase())) return false;
        if (fs_receiver && !s.receiver.toLowerCase().includes(fs_receiver.toLowerCase())) return false;
        if (fs_start && sd < new Date(fs_start)) return false;
        if (fs_end && sd > new Date(fs_end)) return false;
        return true;
    });
    data = data.slice().reverse();
    tbody.innerHTML = data.map((s,i)=>`
    <tr>
      <td>${i+1}</td>
      <td>${escapeHtml(s.sender)}</td>
      <td>${escapeHtml(s.receiver)}</td>
      <td>${s.qty}</td>
      <td>${escapeHtml(s.type)}</td>
      <td>${fmt(s.date)}</td>
      <td>
        <button class="btn-edit" onclick="editSupply(${supplies.length - 1 - i})">تعديل</button>
        <button class="btn-delete" onclick="deleteSupply(${supplies.length - 1 - i})">حذف</button>
      </td>
    </tr>
  `).join('');

    ds('totalSupplies').textContent = data.reduce((s,x)=> s + Number(x.qty), 0);
    ds('suppliesCount').textContent = supplies.length;
}

function openAddSupply(){
    openModal(`
    <h3>إضافة توريدة</h3>
    <input id="sp_sender" placeholder="المرسل">
    <input id="sp_receiver" placeholder="المستلم">
    <input id="sp_qty" type="number" placeholder="الكمية">
    <input id="sp_type" placeholder="النوع">
    <div class="actions">
      <button class="btn-ios" onclick="closeModal()">إلغاء</button>
      <button class="btn-ios" id="saveSupplyBtn">حفظ</button>
    </div>
  `);
    ds('saveSupplyBtn').onclick = ()=>{
        const a = ds('sp_sender').value.trim();
        const b = ds('sp_receiver').value.trim();
        const c = ds('sp_qty').value.trim();
        const d = ds('sp_type').value.trim();
        if(!a||!b||!c||!d) return alert('املأ الحقول');
        supplies.push({ sender:a, receiver:b, qty:Number(c), type:d, date:new Date().toISOString() });
        saveAll(); closeModal(); renderSupplies();
    };
}

function editSupply(i){
    const s = supplies[i];
    openModal(`
    <h3>تعديل توريدة</h3>
    <input id="sp_sender" value="${escapeAttr(s.sender)}">
    <input id="sp_receiver" value="${escapeAttr(s.receiver)}">
    <input id="sp_qty" value="${s.qty}">
    <input id="sp_type" value="${escapeAttr(s.type)}">
    <input id="sp_date" type="date" value="${s.date.split('T')[0]}">
    <div class="actions">
      <button class="btn-ios" onclick="closeModal()">إلغاء</button>
      <button class="btn-ios" id="saveEditSupplyBtn">حفظ</button>
    </div>
  `);
    ds('saveEditSupplyBtn').onclick = ()=>{
        supplies[i] = { sender: ds('sp_sender').value.trim(), receiver: ds('sp_receiver').value.trim(), qty: Number(ds('sp_qty').value), type: ds('sp_type').value.trim(), date: new Date(ds('sp_date').value).toISOString() };
        saveAll(); closeModal(); renderSupplies();
    };
}

function deleteSupply(i){
    if(!confirm('مسح التوريدة؟')) return;
    supplies.splice(i,1); saveAll(); renderSupplies();
}

/* filters modal for supplies */
function openFilterSupplies(){
    openModal(`
    <h3>فلترة التوريدات</h3>
    <input id="fs_sender_m" placeholder="المرسل">
    <input id="fs_receiver_m" placeholder="المستلم">
    <input id="fs_start_m" type="date">
    <input id="fs_end_m" type="date">
    <div class="actions">
      <button class="btn-ios" id="clearSupFilterBtn">مسح</button>
      <button class="btn-ios" id="applySupFilterBtn">تطبيق</button>
    </div>
  `);
    ds('applySupFilterBtn').onclick = ()=>{
        if(!ds('fs_sender')) document.body.insertAdjacentHTML('beforeend','<input id="fs_sender" type="hidden"><input id="fs_receiver" type="hidden"><input id="fs_start" type="hidden"><input id="fs_end" type="hidden">');
        ds('fs_sender').value = ds('fs_sender_m').value;
        ds('fs_receiver').value = ds('fs_receiver_m').value;
        ds('fs_start').value = ds('fs_start_m').value;
        ds('fs_end').value = ds('fs_end_m').value;
        closeModal(); renderSupplies();
    };
    ds('clearSupFilterBtn').onclick = ()=>{
        if(ds('fs_sender')){ ds('fs_sender').value=''; ds('fs_receiver').value=''; ds('fs_start').value=''; ds('fs_end').value=''; }
        closeModal(); renderSupplies();
    };
}

/* export supplies */
function exportSupplies(){
    if(!supplies.length) return alert('لا يوجد بيانات');
    const data = supplies.map((s,i)=> ({ '#':i+1, 'المرسل':s.sender, 'المستلم':s.receiver, 'الكمية':s.qty, 'النوع':s.type, 'التاريخ':fmt(s.date) }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Supplies');
    XLSX.writeFile(wb,'ELHADY_Supplies.xlsx');
}

function renderLabor(){
    const tbody = document.querySelector('#laborTable tbody');

    let data = labor.slice().reverse(); // يظهر من الجديد للقديم

    tbody.innerHTML = data.map((p,i)=>`
    <tr>
      <td>${i+1}</td>
      <td>${p.worker}</td>
      <td>${p.contractor}</td>
      <td>${p.day ? "✔" : "✘"}</td>
      <td>${p.night ? "✔" : "✘"}</td>
      <td>${p.place}</td>
      <td>${p.dayNo}</td>
      <td>${p.month}</td>
      <td>
        <button class="btn-edit" onclick="editLabor(${labor.length - 1 - i})">تعديل</button>
        <button class="btn-delete" onclick="deleteLabor(${labor.length - 1 - i})">حذف</button>
      </td>
    </tr>
  `).join('');

    ds('laborCount').textContent = labor.length;
    ds('laborTotal').textContent = labor.length;
}

function openAddLabor(){
    openModal(`
    <h3>إضافة حضور عامل</h3>

    <input id="l_worker" placeholder="اسم العامل">
    <input id="l_contractor" placeholder="المقاول">
    <input id="l_place" placeholder="مكان العمل">

    <div style="margin-top:10px;font-size:14px;">حضور يوم</div>
    <input id="l_day" type="checkbox">

    <div style="margin-top:10px;font-size:14px;">حضور سهرة</div>
    <input id="l_night" type="checkbox">

    <input id="l_dayNo" type="number" placeholder="اليوم">
    <input id="l_month" placeholder="الشهر (مثال 2025-02)">

    <div class="actions">
      <button class="btn-ios" onclick="closeModal()">إلغاء</button>
      <button class="btn-ios" id="saveLaborBtn">حفظ</button>
    </div>
  `);

    ds("saveLaborBtn").onclick = () => {
        labor.push({
            worker: ds('l_worker').value,
            contractor: ds('l_contractor').value,
            place: ds('l_place').value,
            day: ds('l_day').checked,
            night: ds('l_night').checked,
            dayNo: ds('l_dayNo').value,
            month: ds('l_month').value
        });
        saveAll();
        closeModal();
        renderLabor();
    };
}

function editLabor(i){
    const p = labor[i];

    openModal(`
    <h3>تعديل حضور</h3>

    <input id="l_worker" value="${p.worker}">
    <input id="l_contractor" value="${p.contractor}">
    <input id="l_place" value="${p.place}">

    <label>حضور يوم</label>
    <input id="l_day" type="checkbox" ${p.day ? "checked" : ""}>

    <label>حضور سهرة</label>
    <input id="l_night" type="checkbox" ${p.night ? "checked" : ""}>

    <input id="l_dayNo" value="${p.dayNo}">
    <input id="l_month" value="${p.month}">

    <div class="actions">
      <button class="btn-ios" onclick="closeModal()">إلغاء</button>
      <button class="btn-ios" id="saveEditLaborBtn">حفظ</button>
    </div>
  `);

    ds("saveEditLaborBtn").onclick = () => {
        labor[i] = {
            worker: ds('l_worker').value,
            contractor: ds('l_contractor').value,
            place: ds('l_place').value,
            day: ds('l_day').checked,
            night: ds('l_night').checked,
            dayNo: ds('l_dayNo').value,
            month: ds('l_month').value
        };
        saveAll();
        closeModal();
        renderLabor();
    };
}

function deleteLabor(i){
    if(!confirm("مسح سجل العمالة؟")) return;
    labor.splice(i,1);
    saveAll();
    renderLabor();
}

function exportLabor(){
    if(!labor.length) return alert("لا يوجد بيانات");

    const data = labor.map((p,i) => ({
        "#": i + 1,
        "العامل": p.worker,
        "المقاول": p.contractor,
        "حضور يوم": p.day ? "نعم" : "لا",
        "حضور سهرة": p.night ? "نعم" : "لا",
        "مكان العمل": p.place,
        "اليوم": p.dayNo,
        "الشهر": p.month
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Labor");

    XLSX.writeFile(wb, "ELHADY_Labor.xlsx");
}

/* TAB BAR actions */
function onTab(name){
    if(name === 'view'){ /* go home or keep current */ openSection('home'); }
    else if(name === 'filter'){
        if (ds('payments').classList.contains('visible')) openFilterPayments();
        else if (ds('supplies').classList.contains('visible')) openFilterSupplies();
        else openFilterPayments();
    } else if(name === 'export'){
        if (ds('payments').classList.contains('visible')) exportPayments();
        else if (ds('supplies').classList.contains('visible')) exportSupplies();
        else if(ds('labor').classList.contains('visible')) exportLabor();
        else exportPayments();
    }
}

/* initial render */
renderPayments(); renderSupplies();

/* utility escape to avoid HTML injection */
function escapeHtml(s){ if(s==null) return ''; return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function escapeAttr(s){ return String(s).replace(/"/g,'&quot;'); }
