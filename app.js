/* register SW (ignore errors) */
if('serviceWorker' in navigator){
    navigator.serviceWorker.register('service-worker.js').catch(()=>{});
}

/* storage init */
let payments = JSON.parse(localStorage.getItem('payments') || '[]');
let supplies = JSON.parse(localStorage.getItem('supplies') || '[]');
function saveAll(){ localStorage.setItem('payments', JSON.stringify(payments)); localStorage.setItem('supplies', JSON.stringify(supplies)); }

/* helpers */
const el = id => document.getElementById(id);
const modalBackdrop = el('modalBackdrop');
function openModalInner(html){
    modalBackdrop.innerHTML = `<div class="modal">${html}</div>`;
    modalBackdrop.style.display = 'flex';
    const box = modalBackdrop.querySelector('.modal');
    requestAnimationFrame(()=> box.classList.add('show'));
}
function closeModal(){
    const box = modalBackdrop.querySelector('.modal');
    if(box) box.classList.remove('show');
    setTimeout(()=>{ modalBackdrop.style.display='none'; modalBackdrop.innerHTML=''; }, 190);
}

/* splash hide */
window.addEventListener('load', ()=> setTimeout(()=>{ const s = el('splash'); if(s) s.style.display='none'; },700));

/* theme */
const themeBtn = el('themeBtn');
if(localStorage.getItem('theme') === 'light') document.body.classList.add('light');
themeBtn.addEventListener('click', ()=>{
    document.body.classList.toggle('light');
    localStorage.setItem('theme', document.body.classList.contains('light') ? 'light' : 'dark');
    // toggle icon
    const ic = themeBtn.querySelector('ion-icon');
    ic.setAttribute('name', document.body.classList.contains('light') ? 'moon' : 'sunny');
});

/* navigation */
function openSection(id){
    document.querySelectorAll('.screen').forEach(s=> s.classList.remove('visible'));
    const sec = el(id);
    sec.classList.add('visible');
    // re-render when opening
    if(id === 'payments') renderPayments();
    if(id === 'supplies') renderSupplies();
}

/* initial: show home */
openSection('home');

/* FAB functionality */
el('fab').addEventListener('click', ()=> {
    if(el('payments').classList.contains('visible')) openAddPayment();
    else if(el('supplies').classList.contains('visible')) openAddSupply();
    else openSection('payments');
});

/* TAB BAR actions */
function onTab(name){
    if(name === 'view') {
        // go to page currently open - if none, open home
        if(document.querySelector('.screen.visible')) return;
        openSection('home');
    } else if(name === 'filter') {
        // open filter for visible page
        if(el('payments').classList.contains('visible')) openFilterPayments();
        else if(el('supplies').classList.contains('visible')) openFilterSupplies();
        else openFilterPayments();
    } else if(name === 'export') {
        if(el('payments').classList.contains('visible')) exportPayments();
        else if(el('supplies').classList.contains('visible')) exportSupplies();
        else exportPayments();
    } else if(name === 'ios') {
        alert('This is a web app UI — tap Add to Home Screen to install.');
    }
}

/* format date */
const fmt = d => new Date(d).toLocaleDateString();

/* --------- PAYMENTS --------- */
function renderPayments(){
    const tbody = document.querySelector('#paymentsTable tbody');
    // filters (we can keep hidden inputs for persistence)
    const fp_sender = document.getElementById('fp_sender') ? document.getElementById('fp_sender').value : '';
    const fp_receiver = document.getElementById('fp_receiver') ? document.getElementById('fp_receiver').value : '';
    const fp_start = document.getElementById('fp_start') ? document.getElementById('fp_start').value : '';
    const fp_end = document.getElementById('fp_end') ? document.getElementById('fp_end').value : '';

    let data = payments.filter(p=>{
        const d = new Date(p.date);
        if(fp_sender && !p.sender.toLowerCase().includes(fp_sender.toLowerCase())) return false;
        if(fp_receiver && !p.receiver.toLowerCase().includes(fp_receiver.toLowerCase())) return false;
        if(fp_start && d < new Date(fp_start)) return false;
        if(fp_end && d > new Date(fp_end)) return false;
        return true;
    });

    tbody.innerHTML = data.map((p,i)=>`
    <tr>
      <td>${i+1}</td>
      <td>${p.sender}</td>
      <td>${p.receiver}</td>
      <td>${Number(p.amount).toLocaleString()}</td>
      <td>${fmt(p.date)}</td>
      <td>
        <button class="btn-outline" onclick="editPayment(${i})">✏</button>
        <button class="btn-danger" onclick="deletePayment(${i})">🗑</button>
      </td>
    </tr>
  `).join('');

    el('totalPayments').textContent = data.reduce((s,x)=>s+Number(x.amount),0);
    el('paymentsCount').textContent = payments.length;
}

/* add payment */
function openAddPayment(){
    openModalInner(`
    <h3>إضافة عملية</h3>
    <input id="pm_sender" placeholder="المرسل">
    <input id="pm_receiver" placeholder="المستلم">
    <input id="pm_amount" type="number" placeholder="المبلغ">
    <div class="actions">
      <button class="btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn-outline" id="savePayBtn">حفظ</button>
    </div>
  `);
    document.getElementById('savePayBtn').onclick = ()=>{
        const s = document.getElementById('pm_sender').value.trim();
        const r = document.getElementById('pm_receiver').value.trim();
        const a = document.getElementById('pm_amount').value.trim();
        if(!s||!r||!a) return alert('املا الحقول');
        payments.push({ sender:s, receiver:r, amount:Number(a), date:new Date().toISOString() });
        saveAll(); closeModal(); renderPayments();
    };
}

function editPayment(i){
    const p = payments[i];
    openModalInner(`
    <h3>تعديل عملية</h3>
    <input id="pm_sender" value="${p.sender}">
    <input id="pm_receiver" value="${p.receiver}">
    <input id="pm_amount" type="number" value="${p.amount}">
    <input id="pm_date" type="date" value="${p.date.split('T')[0]}">
    <div class="actions">
      <button class="btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn-outline" id="saveEditPayBtn">حفظ</button>
    </div>
  `);
    document.getElementById('saveEditPayBtn').onclick = ()=>{
        const s = document.getElementById('pm_sender').value.trim();
        const r = document.getElementById('pm_receiver').value.trim();
        const a = document.getElementById('pm_amount').value;
        const d = document.getElementById('pm_date').value;
        payments[i] = { sender:s, receiver:r, amount:Number(a), date:new Date(d).toISOString() };
        saveAll(); closeModal(); renderPayments();
    };
}

function deletePayment(i){
    if(!confirm('مسح؟')) return;
    payments.splice(i,1); saveAll(); renderPayments();
}

/* filter modal payments */
function openFilterPayments(){
    openModalInner(`
    <h3>فلترة المدفوعات</h3>
    <input id="fp_sender_m" placeholder="المرسل">
    <input id="fp_receiver_m" placeholder="المستلم">
    <input id="fp_start_m" type="date">
    <input id="fp_end_m" type="date">
    <div class="actions">
      <button class="btn-outline" id="applyPayFilterBtn">تطبيق</button>
      <button class="btn-danger" id="resetPayFilterBtn">مسح</button>
    </div>
  `);
    document.getElementById('applyPayFilterBtn').onclick = ()=>{
        // create hidden inputs if missing
        if(!document.getElementById('fp_sender')) {
            document.body.insertAdjacentHTML('beforeend', `<input id="fp_sender" type="hidden"><input id="fp_receiver" type="hidden"><input id="fp_start" type="hidden"><input id="fp_end" type="hidden">`);
        }
        document.getElementById('fp_sender').value = document.getElementById('fp_sender_m').value;
        document.getElementById('fp_receiver').value = document.getElementById('fp_receiver_m').value;
        document.getElementById('fp_start').value = document.getElementById('fp_start_m').value;
        document.getElementById('fp_end').value = document.getElementById('fp_end_m').value;
        closeModal(); renderPayments();
    };
    document.getElementById('resetPayFilterBtn').onclick = ()=>{
        if(document.getElementById('fp_sender')) {
            document.getElementById('fp_sender').value = '';
            document.getElementById('fp_receiver').value = '';
            document.getElementById('fp_start').value = '';
            document.getElementById('fp_end').value = '';
        }
        closeModal(); renderPayments();
    };
}

/* export payments */
function exportPayments(){
    if(!payments.length) return alert('لا يوجد بيانات');
    const data = payments.map((p,i)=> ({ '#':i+1, 'المرسل':p.sender, 'المستلم':p.receiver, 'المبلغ':p.amount, 'التاريخ':fmt(p.date) }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Payments');
    XLSX.writeFile(wb,'ELHADY_Payments.xlsx');
}

/* --------- SUPPLIES --------- */
function renderSupplies(){
    const tbody = document.querySelector('#suppliesTable tbody');
    // hidden filters
    const fs_sender = document.getElementById('fs_sender') ? document.getElementById('fs_sender').value : '';
    const fs_receiver = document.getElementById('fs_receiver') ? document.getElementById('fs_receiver').value : '';
    const fs_start = document.getElementById('fs_start') ? document.getElementById('fs_start').value : '';
    const fs_end = document.getElementById('fs_end') ? document.getElementById('fs_end').value : '';

    let data = supplies.filter(s=>{
        const d = new Date(s.date);
        if(fs_sender && !s.sender.toLowerCase().includes(fs_sender.toLowerCase())) return false;
        if(fs_receiver && !s.receiver.toLowerCase().includes(fs_receiver.toLowerCase())) return false;
        if(fs_start && d < new Date(fs_start)) return false;
        if(fs_end && d > new Date(fs_end)) return false;
        return true;
    });

    tbody.innerHTML = data.map((s,i)=>`
    <tr>
      <td>${i+1}</td>
      <td>${s.sender}</td>
      <td>${s.receiver}</td>
      <td>${s.qty}</td>
      <td>${s.type}</td>
      <td>${fmt(s.date)}</td>
      <td>
        <button class="btn-outline" onclick="editSupply(${i})">✏</button>
        <button class="btn-danger" onclick="deleteSupply(${i})">🗑</button>
      </td>
    </tr>
  `).join('');

    el('totalSupplies').textContent = data.reduce((s,x)=>s+Number(x.qty),0);
    el('suppliesCount').textContent = supplies.length;
}

/* add supply */
function openAddSupply(){
    openModalInner(`
    <h3>إضافة توريدة</h3>
    <input id="sp_sender" placeholder="المرسل">
    <input id="sp_receiver" placeholder="المستلم">
    <input id="sp_qty" type="number" placeholder="الكمية">
    <input id="sp_type" placeholder="النوع">
    <div class="actions">
      <button class="btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn-outline" id="saveSupBtn">حفظ</button>
    </div>
  `);
    document.getElementById('saveSupBtn').onclick = ()=>{
        const a = document.getElementById('sp_sender').value.trim();
        const b = document.getElementById('sp_receiver').value.trim();
        const c = document.getElementById('sp_qty').value.trim();
        const d = document.getElementById('sp_type').value.trim();
        if(!a||!b||!c||!d) return alert('املا الحقول');
        supplies.push({ sender:a, receiver:b, qty:Number(c), type:d, date:new Date().toISOString() });
        saveAll(); closeModal(); renderSupplies();
    };
}

function editSupply(i){
    const s = supplies[i];
    openModalInner(`
    <h3>تعديل توريدة</h3>
    <input id="sp_sender" value="${s.sender}">
    <input id="sp_receiver" value="${s.receiver}">
    <input id="sp_qty" value="${s.qty}">
    <input id="sp_type" value="${s.type}">
    <input id="sp_date" type="date" value="${s.date.split('T')[0]}">
    <div class="actions">
      <button class="btn-outline" onclick="closeModal()">إلغاء</button>
      <button class="btn-outline" id="saveEditSupBtn">حفظ</button>
    </div>
  `);
    document.getElementById('saveEditSupBtn').onclick = ()=>{
        supplies[i] = { sender: sp_sender.value, receiver: sp_receiver.value, qty: Number(sp_qty.value), type: sp_type.value, date: new Date(sp_date.value).toISOString() };
        saveAll(); closeModal(); renderSupplies();
    };
}

function deleteSupply(i){
    if(!confirm('مسح؟')) return;
    supplies.splice(i,1); saveAll(); renderSupplies();
}

/* filter supplies modal */
function openFilterSupplies(){
    openModalInner(`
    <h3>فلترة التوريدات</h3>
    <input id="fs_sender_m" placeholder="المرسل">
    <input id="fs_receiver_m" placeholder="المستلم">
    <input id="fs_start_m" type="date">
    <input id="fs_end_m" type="date">
    <div class="actions">
      <button class="btn-outline" id="applySupFilterBtn">تطبيق</button>
      <button class="btn-danger" id="resetSupFilterBtn">مسح</button>
    </div>
  `);
    document.getElementById('applySupFilterBtn').onclick = ()=>{
        if(!document.getElementById('fs_sender')) document.body.insertAdjacentHTML('beforeend', `<input id="fs_sender" type="hidden"><input id="fs_receiver" type="hidden"><input id="fs_start" type="hidden"><input id="fs_end" type="hidden">`);
        document.getElementById('fs_sender').value = document.getElementById('fs_sender_m').value;
        document.getElementById('fs_receiver').value = document.getElementById('fs_receiver_m').value;
        document.getElementById('fs_start').value = document.getElementById('fs_start_m').value;
        document.getElementById('fs_end').value = document.getElementById('fs_end_m').value;
        closeModal(); renderSupplies();
    };
    document.getElementById('resetSupFilterBtn').onclick = ()=>{
        if(document.getElementById('fs_sender')){
            document.getElementById('fs_sender').value=''; document.getElementById('fs_receiver').value=''; document.getElementById('fs_start').value=''; document.getElementById('fs_end').value='';
        }
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

/* init render */
renderPayments(); renderSupplies();
