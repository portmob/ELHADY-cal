// Clean, modular app JS for ELHADY Cal+
const qs = s => document.querySelector(s);
const qsa = s => Array.from(document.querySelectorAll(s));
const fmtDateOnly = d => new Date(d).toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });

let payments = JSON.parse(localStorage.getItem('payments') || '[]');
let supplies = JSON.parse(localStorage.getItem('supplies') || '[]');
const saveAll = () => { localStorage.setItem('payments', JSON.stringify(payments)); localStorage.setItem('supplies', JSON.stringify(supplies)); };

// Splash hide
window.addEventListener('load', () => {
    setTimeout(() => {
        const s = qs('#splash');
        if (s) { s.style.opacity = '0'; s.style.transition = 'opacity .4s ease'; setTimeout(()=>s.remove(), 500); }
    }, 700);
});

// Register SW (if available)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(()=>{ /* ignore */ });
}

// Tabs
const btnPayments = qs('#btnPayments'), btnSupplies = qs('#btnSupplies');
const paymentsSection = qs('#paymentsSection'), suppliesSection = qs('#suppliesSection');

function showPayments(){
    paymentsSection.style.display = 'block';
    suppliesSection.style.display = 'none';
    btnPayments.classList.add('active'); btnSupplies.classList.remove('active');
}
function showSupplies(){
    suppliesSection.style.display = 'block';
    paymentsSection.style.display = 'none';
    btnSupplies.classList.add('active'); btnPayments.classList.remove('active');
}
btnPayments.addEventListener('click', showPayments);
btnSupplies.addEventListener('click', showSupplies);
// initial
showPayments();

// Modal helpers
function openModal(html){
    const backdrop = qs('#modalBackdrop');
    backdrop.innerHTML = html;
    backdrop.style.display = 'flex';
    backdrop.setAttribute('aria-hidden', 'false');
    backdrop.addEventListener('click', function handler(e){
        if (e.target === backdrop) { closeModal(); backdrop.removeEventListener('click', handler); }
    });
}
function closeModal(){
    const backdrop = qs('#modalBackdrop');
    backdrop.style.display = 'none';
    backdrop.innerHTML = '';
    backdrop.setAttribute('aria-hidden', 'true');
}

// Render payments
function renderPayments(){
    const tbody = qs('#paymentsTable tbody'), cards = qs('#paymentsCards');
    const fs = qs('#filterPaySender').value.trim().toLowerCase();
    const fr = qs('#filterPayReceiver').value.trim().toLowerCase();
    const st = qs('#filterPayStart').value ? new Date(qs('#filterPayStart').value) : null;
    const en = qs('#filterPayEnd').value ? new Date(qs('#filterPayEnd').value) : null;

    const filtered = payments.filter(p=>{
        const d = new Date(p.date);
        return p.sender.toLowerCase().includes(fs) && p.receiver.toLowerCase().includes(fr) && (!st || d >= st) && (!en || d <= en);
    });

    tbody.innerHTML = ''; cards.innerHTML = '';
    filtered.forEach((p, idx)=>{
        const realIndex = payments.indexOf(p);
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${idx+1}</td><td>${escapeHtml(p.sender)}</td><td>${escapeHtml(p.receiver)}</td><td>${Number(p.amount).toLocaleString()}</td><td>${fmtDateOnly(p.date)}</td>
      <td>
        <button class="outline-btn" data-action="edit" data-i="${realIndex}">✏️</button>
        <button class="btn-danger" data-action="del" data-i="${realIndex}">حذف</button>
      </td>`;
        tbody.appendChild(tr);

        const card = document.createElement('div');
        card.className = 'card-item';
        card.innerHTML = `<div><strong>${escapeHtml(p.sender)}</strong> — <span class="muted">${fmtDateOnly(p.date)}</span></div>
      <div>${escapeHtml(p.receiver)} — <strong>${Number(p.amount).toLocaleString()} ج</strong></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
        <button class="outline-btn" data-action="edit" data-i="${realIndex}">✏️ تعديل</button>
        <button class="btn-danger" data-action="del" data-i="${realIndex}">حذف</button>
      </div>`;
        cards.appendChild(card);
    });

    // attach events
    qsa('[data-action="edit"]').forEach(btn => btn.onclick = e => editPayment(Number(btn.dataset.i)));
    qsa('[data-action="del"]').forEach(btn => btn.onclick = e => { if (confirm('مسح؟')) { deletePayment(Number(btn.dataset.i)); } });

    qs('#totalPayments').textContent = filtered.reduce((s,x)=> s + Number(x.amount), 0).toLocaleString();
}

// Add payment modal
qs('#openAddPayment').onclick = ()=> {
    openModal(`<div class="modal"><h3>إضافة عملية</h3>
    <div class="modal-row"><input id="m_sender" placeholder="المرسل"/><input id="m_receiver" placeholder="المستلم"/></div>
    <div class="modal-row"><input id="m_amount" type="number" placeholder="المبلغ"/></div>
    <div class="modal-actions"><button class="outline-btn" onclick="closeModal()">إلغاء</button><button class="outline-btn" id="saveNewPaymentBtn">حفظ</button></div>
  </div>`);
    qs('#saveNewPaymentBtn').onclick = ()=> {
        const s = qs('#m_sender').value.trim(), r = qs('#m_receiver').value.trim(), a = qs('#m_amount').value;
        if (!s||!r||!a) return alert('أدخل كل البيانات');
        payments.push({ sender:s, receiver:r, amount:Number(a), date:new Date().toISOString() });
        saveAll(); closeModal(); renderPayments();
    };
};

// Edit / Delete payments
function editPayment(i){
    const p = payments[i];
    if (!p) return alert('خطأ: السطر غير موجود');
    openModal(`<div class="modal"><h3>تعديل عملية</h3>
    <div class="modal-row"><input id="m_sender" value="${escapeAttr(p.sender)}"/><input id="m_receiver" value="${escapeAttr(p.receiver)}"/></div>
    <div class="modal-row"><input id="m_amount" type="number" value="${p.amount}"/><input id="m_date" type="date" value="${p.date.split('T')[0]}"/></div>
    <div class="modal-actions"><button class="outline-btn" onclick="closeModal()">إلغاء</button><button class="outline-btn" id="saveEditPaymentBtn">حفظ</button></div>
  </div>`);
    qs('#saveEditPaymentBtn').onclick = ()=> {
        const s = qs('#m_sender').value.trim(), r = qs('#m_receiver').value.trim(), a = qs('#m_amount').value, d = qs('#m_date').value;
        if (!s||!r||!a||!d) return alert('برجاء ملء كل الحقول');
        payments[i] = { sender:s, receiver:r, amount:Number(a), date:new Date(d).toISOString() };
        saveAll(); closeModal(); renderPayments();
    };
}
function deletePayment(i){ payments.splice(i,1); saveAll(); renderPayments(); }

// Export & clear payments
qs('#exportPayments').onclick = ()=> {
    if (!payments.length) return alert('لا يوجد بيانات');
    const data = payments.map((p,i)=> ({ '#': i+1, 'المرسل': p.sender, 'المستلم': p.receiver, 'المبلغ': p.amount, 'التاريخ': fmtDateOnly(p.date) }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Payments'); XLSX.writeFile(wb, 'ELHADY_Payments.xlsx');
};
qs('#clearPayments').onclick = ()=> { if (confirm('مسح كل المدفوعات؟')) { payments=[]; saveAll(); renderPayments(); } };

// ------- SUPPLIES -------
function renderSupplies(){
    const tbody = qs('#suppliesTable tbody'), cards = qs('#suppliesCards');
    const fs = qs('#filterSupSender').value.trim().toLowerCase();
    const fr = qs('#filterSupReceiver').value.trim().toLowerCase();
    const st = qs('#filterSupStart').value ? new Date(qs('#filterSupStart').value) : null;
    const en = qs('#filterSupEnd').value ? new Date(qs('#filterSupEnd').value) : null;

    const filtered = supplies.filter(s=>{
        const d = new Date(s.date);
        return s.sender.toLowerCase().includes(fs) && s.receiver.toLowerCase().includes(fr) && (!st || d >= st) && (!en || d <= en);
    });

    tbody.innerHTML = ''; cards.innerHTML = '';
    filtered.forEach((s, idx) => {
        const realIndex = supplies.indexOf(s);
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${idx+1}</td><td>${escapeHtml(s.sender)}</td><td>${escapeHtml(s.receiver)}</td><td>${Number(s.qty)}</td><td>${escapeHtml(s.type)}</td><td>${fmtDateOnly(s.date)}</td>
      <td><button class="outline-btn" data-action="edit-s" data-i="${realIndex}">✏️</button><button class="btn-danger" data-action="del-s" data-i="${realIndex}">حذف</button></td>`;
        tbody.appendChild(tr);

        const card = document.createElement('div');
        card.className = 'card-item';
        card.innerHTML = `<div><strong>${escapeHtml(s.sender)}</strong> — <span class="muted">${fmtDateOnly(s.date)}</span></div>
      <div>${escapeHtml(s.receiver)} — <strong>${Number(s.qty)}</strong> وحدة</div>
      <div>${escapeHtml(s.type)}</div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
        <button class="outline-btn" data-action="edit-s" data-i="${realIndex}">✏️ تعديل</button>
        <button class="btn-danger" data-action="del-s" data-i="${realIndex}">حذف</button>
      </div>`;
        cards.appendChild(card);
    });

    qsa('[data-action="edit-s"]').forEach(btn => btn.onclick = ()=> editSupply(Number(btn.dataset.i)));
    qsa('[data-action="del-s"]').forEach(btn => btn.onclick = ()=> { if (confirm('مسح التوريدة؟')) { deleteSupply(Number(btn.dataset.i)); } });

    qs('#totalSupplies').textContent = filtered.reduce((s,x)=> s + Number(x.qty), 0).toLocaleString();
}

// Add supply modal
qs('#openAddSupply').onclick = ()=> {
    openModal(`<div class="modal"><h3>إضافة توريدة</h3>
    <div class="modal-row"><input id="s_sender" placeholder="المرسل"/><input id="s_receiver" placeholder="المستلم"/></div>
    <div class="modal-row"><input id="s_qty" type="number" placeholder="الكمية"/><input id="s_type" placeholder="النوع"/></div>
    <div class="modal-actions"><button class="outline-btn" onclick="closeModal()">إلغاء</button><button class="outline-btn" id="saveNewSupplyBtn">حفظ</button></div>
  </div>`);
    qs('#saveNewSupplyBtn').onclick = ()=> {
        const s = qs('#s_sender').value.trim(), r = qs('#s_receiver').value.trim(), q = qs('#s_qty').value, t = qs('#s_type').value.trim();
        if (!s||!r||!q||!t) return alert('أدخل كل البيانات');
        supplies.push({ sender:s, receiver:r, qty:Number(q), type:t, date:new Date().toISOString() });
        saveAll(); closeModal(); renderSupplies();
    };
};

function editSupply(i){
    const s = supplies[i];
    if (!s) return alert('خطأ: السطر غير موجود');
    openModal(`<div class="modal"><h3>تعديل توريدة</h3>
    <div class="modal-row"><input id="m_sender" value="${escapeAttr(s.sender)}"/><input id="m_receiver" value="${escapeAttr(s.receiver)}"/></div>
    <div class="modal-row"><input id="m_qty" type="number" value="${s.qty}"/><input id="m_type" value="${escapeAttr(s.type)}"/></div>
    <div class="modal-row"><input id="m_date" type="date" value="${s.date.split('T')[0]}"/></div>
    <div class="modal-actions"><button class="outline-btn" onclick="closeModal()">إلغاء</button><button class="outline-btn" id="saveEditSupplyBtn">حفظ</button></div>
  </div>`);
    qs('#saveEditSupplyBtn').onclick = ()=> {
        const sender = qs('#m_sender').value.trim(), receiver = qs('#m_receiver').value.trim(), qty = qs('#m_qty').value, type = qs('#m_type').value.trim(), d = qs('#m_date').value;
        if (!sender||!receiver||!qty||!type||!d) return alert('برجاء ملء كل الحقول');
        supplies[i] = { sender, receiver, qty:Number(qty), type, date:new Date(d).toISOString() };
        saveAll(); closeModal(); renderSupplies();
    };
}
function deleteSupply(i){ supplies.splice(i,1); saveAll(); renderSupplies(); }

// Export & clear supplies
qs('#exportSupplies').onclick = ()=> {
    if (!supplies.length) return alert('لا يوجد بيانات');
    const data = supplies.map((s,i)=> ({ '#': i+1, 'المرسل': s.sender, 'المستلم': s.receiver, 'الكمية': s.qty, 'النوع': s.type, 'التاريخ': fmtDateOnly(s.date) }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Supplies'); XLSX.writeFile(wb, 'ELHADY_Supplies.xlsx');
};
qs('#clearSupplies').onclick = ()=> { if (confirm('مسح كل التوريدات؟')) { supplies = []; saveAll(); renderSupplies(); } };

// Filters
['#filterPaySender','#filterPayReceiver','#filterPayStart','#filterPayEnd'].forEach(id => qs(id).addEventListener('input', renderPayments));
qs('#clearPayFilter').onclick = ()=> { ['#filterPaySender','#filterPayReceiver','#filterPayStart','#filterPayEnd'].forEach(id=>qs(id).value=''); renderPayments(); };
['#filterSupSender','#filterSupReceiver','#filterSupStart','#filterSupEnd'].forEach(id => qs(id).addEventListener('input', renderSupplies));
qs('#clearSupFilter').onclick = ()=> { ['#filterSupSender','#filterSupReceiver','#filterSupStart','#filterSupEnd'].forEach(id=>qs(id).value=''); renderSupplies(); };

// Utilities
function escapeHtml(s){ if (s==null) return ''; return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]); }
function escapeAttr(s){ return String(s).replace(/"/g, '&quot;'); }

// Initial render
renderPayments(); renderSupplies();
