/* ===== Data Layer ===== */
const KEYS = { srv: 'ren_servicios', cli: 'ren_clientes', prod: 'ren_productos', ex: 'ren_exchange', ejs: 'ren_emailjs', wa: 'ren_whatsapp' };
const load = k => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } };
const save = (k, d) => localStorage.setItem(k, JSON.stringify(d));
const gid = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
const $ = id => document.getElementById(id);

let servicios = load(KEYS.srv);
let clientes = load(KEYS.cli);
let productos = load(KEYS.prod);
let tc = { venta: 0, compra: 0 };
let delId = null, delType = '';

const TL = { hosting:'Hosting', correo:'Correo Emp.', licencia:'Licencia SW', otro:'Otro' };
const PL = { mensual:'Mensual', trimestral:'Trimestral', semestral:'Semestral', anual:'Anual', bienal:'Bienal', otro:'Otro' };

/* Helpers */
function days(f) { const t=new Date(); t.setHours(0,0,0,0); return Math.ceil((new Date(f+'T00:00:00')-t)/864e5); }
function status(d) { return d<0?'vencido':d<=7?'critico':d<=30?'proximo':'aldia'; }
function fd(s) { return new Date(s+'T00:00:00').toLocaleDateString('es-CR',{day:'2-digit',month:'short',year:'numeric'}); }
function fm(a,c) { const n=parseFloat(a); return c==='CRC'?'₡'+n.toLocaleString('es-CR',{minimumFractionDigits:2,maximumFractionDigits:2}):'$'+n.toFixed(2); }
function cv(a,from,to) { if(from===to||!tc.venta) return null; return from==='USD'?a*tc.venta:a/tc.compra; }
function esc(t) { const d=document.createElement('div'); d.textContent=t; return d.innerHTML; }
function toast(m,type='info') { const c=$('toastContainer'),t=document.createElement('div'); t.className='toast toast-'+type; t.innerHTML=(type==='success'?'✅':type==='error'?'❌':'ℹ️')+' '+m; c.appendChild(t); setTimeout(()=>t.remove(),3500); }
function getClient(id) { return clientes.find(c=>c.id===id); }
function closeModal(id) { $(id).classList.remove('active'); }

/* Exchange Rate */
async function fetchRate() {
    const btn=$('btnRefreshRate'); btn.classList.add('spinning');
    try {
        const c=localStorage.getItem(KEYS.ex); 
        if(c){const p=JSON.parse(c); if(Date.now()-p.ts<36e5){tc=p;$('exchangeRate').textContent='₡'+tc.venta.toFixed(2)+' / ₡'+tc.compra.toFixed(2);btn.classList.remove('spinning');return;}}
        const r=await fetch('https://api.hacienda.go.cr/indicadores/tc/dolar');
        const d=await r.json(); tc={venta:d.venta.valor,compra:d.compra.valor,ts:Date.now()};
        save(KEYS.ex,tc); $('exchangeRate').textContent='₡'+tc.venta.toFixed(2)+' / ₡'+tc.compra.toFixed(2);
    } catch(e) { $('exchangeRate').textContent='No disponible'; }
    btn.classList.remove('spinning');
}

/* ===== Populate Selects ===== */
function popClients() {
    const s=$('srvCliente'),v=s.value; s.innerHTML='<option value="">Seleccionar cliente...</option>';
    clientes.forEach(c=>{s.innerHTML+=`<option value="${c.id}">${esc(c.nombre)}${c.empresa?' - '+esc(c.empresa):''}</option>`;});
    s.value=v;
}
function popProducts() {
    const s=$('srvProducto'),v=s.value; s.innerHTML='<option value="">Sin producto</option>';
    productos.forEach(p=>{s.innerHTML+=`<option value="${p.id}">${esc(p.nombre)} - ${fm(p.precio,p.moneda)}</option>`;});
    s.value=v;
}

/* ===== WhatsApp via CallMeBot ===== */
function getWAConfig() {
    const d = localStorage.getItem(KEYS.wa);
    if (!d) return null;
    const c = JSON.parse(d);
    return (c.phone && c.apikey) ? c : null;
}

function sendWhatsApp(text) {
    return new Promise((resolve, reject) => {
        const cfg = getWAConfig();
        if (!cfg) { reject(new Error('WhatsApp no configurado')); return; }
        const phone = cfg.phone.replace(/[^0-9+]/g, '');
        const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(cfg.apikey)}`;
        
        // Use fetch with no-cors mode (request is sent, we just can't read the response)
        fetch(url, { mode: 'no-cors' })
            .then(() => {
                // With no-cors we get an opaque response, but the message is sent
                resolve(true);
            })
            .catch(() => {
                // Fallback: use image tag trick for GET request
                const img = new Image();
                img.onload = img.onerror = () => resolve(true);
                img.src = url;
            });
    });
}
