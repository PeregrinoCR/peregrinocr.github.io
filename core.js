/* ===== Data Layer ===== */
const KEYS = { srv: 'ren_servicios', cli: 'ren_clientes', prod: 'ren_productos', ex: 'ren_exchange', ejs: 'ren_emailjs', wa: 'ren_whatsapp', cat: 'ren_categorias' };
const FIREBASE_CFG_KEY = 'ren_firebase_config';
const load = k => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } };
let _syncQ = Promise.resolve();
const save = (k, d) => { try { localStorage.setItem(k, JSON.stringify(d)); if(firebaseReady && Array.isArray(d)) syncToFirestore(k,d); } catch(e) { console.error('Error al guardar en localStorage:', e); toast('Error al guardar datos: espacio en almacenamiento agotado', 'error'); } };
const gid = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
const $ = id => document.getElementById(id);

let servicios = [];
let clientes = [];
let productos = [];
let tc = { venta: 0, compra: 0 };
let delId = null, delType = '';
let categorias = [];
let TL = {};
let firestore = null, firebaseReady = false;

const DEFAULT_CATEGORIES = [
    { id:'hosting', name:'Hosting' },
    { id:'correo', name:'Correo Emp.' },
    { id:'licencia', name:'Licencia SW' },
    { id:'otro', name:'Otro' }
];
function initCategorias(){categorias=load(KEYS.cat);if(!categorias.length){categorias=DEFAULT_CATEGORIES.map(c=>({...c}));save(KEYS.cat,categorias);}rebuildTL();}
function rebuildTL(){TL={};categorias.forEach(c=>{TL[c.id]=c.name;});}
function slugify(t){return t.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')||'sin_nombre';}
const PL = { mensual:'Mensual', trimestral:'Trimestral', semestral:'Semestral', anual:'Anual', bienal:'Bienal', otro:'Otro' };

/* Helpers */
function days(f) { const t=new Date(); t.setHours(0,0,0,0); return Math.ceil((new Date(f+'T00:00:00')-t)/864e5); }
function status(d) { return d<0?'vencido':d<=7?'critico':d<=30?'proximo':'aldia'; }
function fd(s) { return new Date(s+'T00:00:00').toLocaleDateString('es-CR',{day:'2-digit',month:'short',year:'numeric'}); }
function fm(a,c) { const n=parseFloat(a); return c==='CRC'?'₡'+n.toLocaleString('es-CR',{minimumFractionDigits:2,maximumFractionDigits:2}):'$'+n.toFixed(2); }
function cv(a,from,to) { if(from===to||!tc.venta||!tc.compra) return null; return from==='USD'?a*tc.venta:a/tc.compra; }
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

/* ===== Firebase / Cloud Sync ===== */
function getFirebaseConfig(){try{return JSON.parse(localStorage.getItem(FIREBASE_CFG_KEY))||null;}catch{return null;}}
function initFirebase(){const c=getFirebaseConfig();if(!c||!c.projectId)return false;try{if(!firebase.apps.length)firebase.initializeApp(c);firestore=firebase.firestore();firebaseReady=true;return true;}catch(e){console.error('Firebase init error:',e);firebaseReady=false;return false;}}
async function asyncLoadFromStore(k){if(firebaseReady)try{const s=await firestore.collection(k).get();if(!s.empty){const d=[];s.forEach(doc=>d.push({id:doc.id,...doc.data()}));localStorage.setItem(k,JSON.stringify(d));return d;}}catch(e){console.error('Firestore read error:',e);}return load(k);}
async function syncToFirestore(k,d){if(!firebaseReady||!firestore||!Array.isArray(d))return;_syncQ=_syncQ.then(async()=>{try{const c=firestore.collection(k),s=await c.get(),si=new Set,li=new Set(d.map(i=>i.id));s.forEach(doc=>si.add(doc.id));const b=firestore.batch();d.forEach(i=>{const{id,...r}=i;b.set(c.doc(id),r);});si.forEach(id=>{if(!li.has(id))b.delete(c.doc(id));});await b.commit();}catch(e){console.error('Sync '+k+':',e.message);}});}
async function syncAllToFirestore(){if(!firebaseReady){toast('Firebase no está configurado','error');return;}toast('Sincronizando datos...','info');await Promise.all([syncToFirestore(KEYS.srv,servicios),syncToFirestore(KEYS.cli,clientes),syncToFirestore(KEYS.prod,productos),syncToFirestore(KEYS.cat,categorias)]);toast('✅ Datos sincronizados con la nube','success');}
async function initData(){initFirebase();servicios=await asyncLoadFromStore(KEYS.srv);clientes=await asyncLoadFromStore(KEYS.cli);productos=await asyncLoadFromStore(KEYS.prod);if(firebaseReady){const cd=await asyncLoadFromStore(KEYS.cat);if(cd.length){categorias=cd;rebuildTL();return;}}initCategorias();}

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
        
        // Use Image() to make a GET request - most reliable cross-origin method
        const img = new Image();
        let done = false;
        const finish = () => { if(!done){ done=true; resolve(true); } };
        img.onload = finish;
        img.onerror = finish;
        img.src = url;
        
        // Timeout fallback: resolve anyway after 10s
        setTimeout(finish, 10000);
    });
}

/* Init categorias moved to initData() in app.js */
