/* ==================== DASHBOARD ==================== */
function updateDash() {
    let v=0,p=0,a=0;
    servicios.forEach(s=>{const d=days(s.fecha);if(d<0)v++;else if(d<=30)p++;else a++;});
    $('totalServicios').textContent=servicios.length;
    $('totalVencidos').textContent=v;
    $('totalProximos').textContent=p;
    $('totalAlDia').textContent=a;
}

/* ==================== SERVICIOS ==================== */
function renderServicios() {
    const fn=$('filterNombre').value.toLowerCase().trim(),ft=$('filterTipo').value,fe=$('filterEstado').value;
    const filtered=servicios.filter(s=>{
        const cli=getClient(s.clienteId);
        const name=cli?cli.nombre:'';
        if(fn&&!name.toLowerCase().includes(fn)) return false;
        if(ft&&s.tipo!==ft) return false;
        if(fe){const d=days(s.fecha),st=status(d);if(fe==='vencido'&&st!=='vencido'&&st!=='critico')return false;if(fe==='proximo'&&st!=='proximo')return false;if(fe==='aldia'&&st!=='aldia')return false;}
        return true;
    }).sort((a,b)=>new Date(a.fecha)-new Date(b.fecha));

    const tb=$('tbodyServicios'),tbl=$('tablaServicios'),em=$('emptyServicios');
    if(!filtered.length){tbl.style.display='none';em.classList.add('visible');return;}
    tbl.style.display='';em.classList.remove('visible');

    tb.innerHTML=filtered.map((s,i)=>{
        const d=days(s.fecha),st=status(d),cli=getClient(s.clienteId);
        let bc,bt,dc;
        if(st==='vencido'){bc='badge-danger';bt='Vencido';dc='danger';}
        else if(st==='critico'){bc='badge-danger';bt='⚠ Urgente';dc='danger';}
        else if(st==='proximo'){bc='badge-warning';bt='Próximo';dc='warning';}
        else{bc='badge-success';bt='Al día';dc='success';}
        const dt=d<0?Math.abs(d)+'d atrás':d+'d';
        const cur=s.moneda||'USD',alt=cv(s.monto,cur,cur==='USD'?'CRC':'USD');
        const altT=alt!==null?fm(alt,cur==='USD'?'CRC':'USD'):'';
        const cName=cli?esc(cli.nombre):'<em style="color:var(--color-text-muted)">Sin cliente</em>';
        const cEmail=cli&&cli.email?'<br><span style="font-size:.75rem;color:var(--color-text-muted)">'+esc(cli.email)+'</span>':'';
        return `<tr style="animation-delay:${i*.03}s">
            <td><span class="badge ${bc}">${bt}</span></td>
            <td><strong>${cName}</strong>${cEmail}</td>
            <td><span class="badge-tipo">${TL[s.tipo]||s.tipo}</span></td>
            <td>${PL[s.periodo]||s.periodo}</td>
            <td>${fd(s.fecha)}</td>
            <td><span class="days-count ${dc}">${dt}</span></td>
            <td><div class="monto-cell"><span class="monto-main">${fm(s.monto,cur)}</span>${altT?'<span class="monto-alt">'+altT+'</span>':''}</div></td>
            <td><div class="cell-actions">
                <button class="btn-icon edit" title="Editar" onclick="editSrv('${s.id}')">✏️</button>
                <button class="btn-icon delete" title="Eliminar" onclick="confirmDel('${s.id}','servicio')">🗑️</button>
            </div></td></tr>`;
    }).join('');
}

function openSrvModal(title){$('modalServicioTitle').textContent=title;popClients();popProducts();$('formServicio').querySelectorAll('.form-group').forEach(g=>g.classList.remove('has-error'));$('clientPreview').style.display='none';$('srvConversion').style.display='none';$('modalServicioOverlay').classList.add('active');}

$('btnNuevoServicio').addEventListener('click',()=>{$('formServicio').reset();$('servicioId').value='';openSrvModal('Nueva Venta');$('srvCliente').focus();});

function editSrv(id){
    const s=servicios.find(x=>x.id===id);if(!s)return;
    $('servicioId').value=s.id;$('srvCliente').value=s.clienteId||'';$('srvTipo').value=s.tipo;$('srvPeriodo').value=s.periodo;$('srvFecha').value=s.fecha;$('srvMoneda').value=s.moneda||'USD';$('srvMonto').value=s.monto;$('srvNotas').value=s.notas||'';
    openSrvModal('Editar Venta');
    $('srvProducto').value=s.productoId||'';
    updateClientPreview();updateSrvConv();
}

$('formServicio').addEventListener('submit',e=>{
    e.preventDefault();let ok=true;
    [['srvCliente'],['srvTipo'],['srvPeriodo'],['srvFecha'],['srvMonto']].forEach(([id])=>{
        const f=$(id),g=f.closest('.form-group');
        if(!f.value.trim()){g.classList.add('has-error');ok=false;}else g.classList.remove('has-error');
    });
    if(!ok)return;
    const data={clienteId:$('srvCliente').value,tipo:$('srvTipo').value,periodo:$('srvPeriodo').value,fecha:$('srvFecha').value,moneda:$('srvMoneda').value,monto:parseFloat($('srvMonto').value),productoId:$('srvProducto').value,notas:$('srvNotas').value.trim()};
    const eid=$('servicioId').value;
    if(eid){const i=servicios.findIndex(s=>s.id===eid);if(i!==-1)servicios[i]={...servicios[i],...data};toast('Servicio actualizado','success');}
    else{servicios.push({id:gid(),...data});toast('Servicio creado','success');}
    save(KEYS.srv,servicios);closeModal('modalServicioOverlay');refresh();
});

$('srvCliente').addEventListener('change',updateClientPreview);
function updateClientPreview(){const c=getClient($('srvCliente').value),p=$('clientPreview');if(c){$('cpName').textContent=c.nombre+(c.empresa?' ('+c.empresa+')':'');$('cpEmail').textContent=c.email||'Sin email';p.style.display='block';}else p.style.display='none';}

$('srvProducto').addEventListener('change',function(){const p=productos.find(x=>x.id===this.value);if(p){$('srvTipo').value=p.categoria||'';$('srvPeriodo').value=p.periodo||'';$('srvMoneda').value=p.moneda||'USD';$('srvMonto').value=p.precio||'';updateSrvConv();}});
$('srvMonto').addEventListener('input',updateSrvConv);$('srvMoneda').addEventListener('change',updateSrvConv);
function updateSrvConv(){const a=parseFloat($('srvMonto').value),c=$('srvMoneda').value;if(a>0&&tc.venta){const r=cv(a,c,c==='USD'?'CRC':'USD');if(r!==null){$('srvConvText').textContent='≈ '+fm(r,c==='USD'?'CRC':'USD');$('srvConversion').style.display='block';return;}}$('srvConversion').style.display='none';}

$('filterNombre').addEventListener('input',renderServicios);$('filterTipo').addEventListener('change',renderServicios);$('filterEstado').addEventListener('change',renderServicios);

/* ==================== CLIENTES ==================== */
function renderClientes(){
    const q=$('filterClientes').value.toLowerCase().trim();
    const filtered=clientes.filter(c=>{if(!q)return true;return c.nombre.toLowerCase().includes(q)||(c.email||'').toLowerCase().includes(q)||(c.empresa||'').toLowerCase().includes(q);});
    const tb=$('tbodyClientes'),tbl=$('tablaClientes'),em=$('emptyClientes');
    if(!filtered.length){tbl.style.display='none';em.classList.add('visible');return;}
    tbl.style.display='';em.classList.remove('visible');
    tb.innerHTML=filtered.map((c,i)=>{
        const svcCount=servicios.filter(s=>s.clienteId===c.id).length;
        return `<tr style="animation-delay:${i*.03}s">
            <td><strong>${esc(c.nombre)}</strong>${c.empresa?'<br><span class="svc-count">'+esc(c.empresa)+'</span>':''}</td>
            <td>${c.email?esc(c.email):'<span style="color:var(--color-text-muted)">—</span>'}</td>
            <td>${c.telefono?esc(c.telefono):'<span style="color:var(--color-text-muted)">—</span>'}</td>
            <td>${c.empresa?esc(c.empresa):'<span style="color:var(--color-text-muted)">—</span>'}</td>
            <td><span class="badge badge-info">${svcCount}</span></td>
            <td><div class="cell-actions">
                <button class="btn-icon edit" title="Editar" onclick="editCli('${c.id}')">✏️</button>
                <button class="btn-icon delete" title="Eliminar" onclick="confirmDel('${c.id}','cliente')">🗑️</button>
            </div></td></tr>`;
    }).join('');
}

$('btnNuevoCliente').addEventListener('click',()=>{$('formCliente').reset();$('clienteId').value='';$('modalClienteTitle').textContent='Nuevo Cliente';$('formCliente').querySelectorAll('.form-group').forEach(g=>g.classList.remove('has-error'));$('modalClienteOverlay').classList.add('active');$('cliNombre').focus();});

function editCli(id){
    const c=clientes.find(x=>x.id===id);if(!c)return;
    $('clienteId').value=c.id;$('cliNombre').value=c.nombre;$('cliEmpresa').value=c.empresa||'';$('cliEmail').value=c.email||'';$('cliTelefono').value=c.telefono||'';$('cliDireccion').value=c.direccion||'';$('cliNotas').value=c.notas||'';
    $('modalClienteTitle').textContent='Editar Cliente';$('formCliente').querySelectorAll('.form-group').forEach(g=>g.classList.remove('has-error'));$('modalClienteOverlay').classList.add('active');
}

$('formCliente').addEventListener('submit',e=>{
    e.preventDefault();let ok=true;
    const nm=$('cliNombre'),em=$('cliEmail');
    if(!nm.value.trim()){nm.closest('.form-group').classList.add('has-error');ok=false;}else nm.closest('.form-group').classList.remove('has-error');
    if(!em.value.trim()||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value)){em.closest('.form-group').classList.add('has-error');ok=false;}else em.closest('.form-group').classList.remove('has-error');
    if(!ok)return;
    const data={nombre:$('cliNombre').value.trim(),empresa:$('cliEmpresa').value.trim(),email:$('cliEmail').value.trim(),telefono:$('cliTelefono').value.trim(),direccion:$('cliDireccion').value.trim(),notas:$('cliNotas').value.trim()};
    const eid=$('clienteId').value;
    if(eid){const i=clientes.findIndex(c=>c.id===eid);if(i!==-1)clientes[i]={...clientes[i],...data};toast('Cliente actualizado','success');}
    else{clientes.push({id:gid(),...data});toast('Cliente creado','success');}
    save(KEYS.cli,clientes);closeModal('modalClienteOverlay');renderClientes();
});
$('filterClientes').addEventListener('input',renderClientes);

/* ==================== PRODUCTOS ==================== */
function renderProductos(){
    const tb=$('tbodyProductos'),tbl=$('tablaProductos'),em=$('emptyProductos');
    if(!productos.length){tbl.style.display='none';em.classList.add('visible');return;}
    tbl.style.display='';em.classList.remove('visible');
    tb.innerHTML=productos.map((p,i)=>{
        const alt=cv(p.precio,p.moneda,p.moneda==='USD'?'CRC':'USD');
        const altT=alt!==null?fm(alt,p.moneda==='USD'?'CRC':'USD'):'—';
        return `<tr style="animation-delay:${i*.03}s">
            <td><strong>${esc(p.nombre)}</strong></td>
            <td><span class="badge-tipo">${TL[p.categoria]||p.categoria}</span></td>
            <td>${p.moneda==='USD'?fm(p.precio,'USD'):altT}</td>
            <td>${p.moneda==='CRC'?fm(p.precio,'CRC'):altT}</td>
            <td>${PL[p.periodo]||'—'}</td>
            <td>${esc(p.descripcion||'—')}</td>
            <td><div class="cell-actions">
                <button class="btn-icon edit" title="Editar" onclick="editProd('${p.id}')">✏️</button>
                <button class="btn-icon delete" title="Eliminar" onclick="confirmDel('${p.id}','producto')">🗑️</button>
            </div></td></tr>`;
    }).join('');
}

$('btnNuevoProducto').addEventListener('click',()=>{$('formProducto').reset();$('productoId').value='';$('modalProductoTitle').textContent='Nuevo Servicio';$('prodConversion').style.display='none';$('formProducto').querySelectorAll('.form-group').forEach(g=>g.classList.remove('has-error'));$('modalProductoOverlay').classList.add('active');$('prodNombre').focus();});

function editProd(id){
    const p=productos.find(x=>x.id===id);if(!p)return;
    $('productoId').value=p.id;$('prodNombre').value=p.nombre;$('prodCategoria').value=p.categoria;$('prodPeriodo').value=p.periodo||'';$('prodMoneda').value=p.moneda||'USD';$('prodPrecio').value=p.precio;$('prodDesc').value=p.descripcion||'';
    $('modalProductoTitle').textContent='Editar Servicio';$('formProducto').querySelectorAll('.form-group').forEach(g=>g.classList.remove('has-error'));$('modalProductoOverlay').classList.add('active');updateProdConv();
}

$('formProducto').addEventListener('submit',e=>{
    e.preventDefault();let ok=true;
    [['prodNombre'],['prodCategoria'],['prodPrecio']].forEach(([id])=>{const f=$(id),g=f.closest('.form-group');if(!f.value.trim()){g.classList.add('has-error');ok=false;}else g.classList.remove('has-error');});
    if(!ok)return;
    const data={nombre:$('prodNombre').value.trim(),categoria:$('prodCategoria').value,periodo:$('prodPeriodo').value,moneda:$('prodMoneda').value,precio:parseFloat($('prodPrecio').value),descripcion:$('prodDesc').value.trim()};
    const eid=$('productoId').value;
    if(eid){const i=productos.findIndex(p=>p.id===eid);if(i!==-1)productos[i]={...productos[i],...data};toast('Producto actualizado','success');}
    else{productos.push({id:gid(),...data});toast('Producto creado','success');}
    save(KEYS.prod,productos);closeModal('modalProductoOverlay');renderProductos();
});
$('prodPrecio').addEventListener('input',updateProdConv);$('prodMoneda').addEventListener('change',updateProdConv);
function updateProdConv(){const a=parseFloat($('prodPrecio').value),c=$('prodMoneda').value;if(a>0&&tc.venta){const r=cv(a,c,c==='USD'?'CRC':'USD');if(r!==null){$('prodConvText').textContent='≈ '+fm(r,c==='USD'?'CRC':'USD');$('prodConversion').style.display='block';return;}}$('prodConversion').style.display='none';}

/* ==================== DELETE ==================== */
function confirmDel(id,type){delId=id;delType=type;$('confirmText').textContent=`¿Eliminar este ${type}? Esta acción no se puede deshacer.`;$('confirmOverlay').classList.add('active');}
$('btnCancelDel').addEventListener('click',()=>{closeModal('confirmOverlay');delId=null;});
$('btnConfirmDel').addEventListener('click',()=>{
    if(!delId){closeModal('confirmOverlay');return;}
    if(delType==='servicio'){servicios=servicios.filter(s=>s.id!==delId);save(KEYS.srv,servicios);}
    else if(delType==='cliente'){clientes=clientes.filter(c=>c.id!==delId);save(KEYS.cli,clientes);renderClientes();}
    else if(delType==='producto'){productos=productos.filter(p=>p.id!==delId);save(KEYS.prod,productos);renderProductos();}
    toast(delType.charAt(0).toUpperCase()+delType.slice(1)+' eliminado','success');
    closeModal('confirmOverlay');delId=null;refresh();
});

/* ==================== ALERTAS ==================== */
function getAlerts(){return servicios.filter(s=>{const d=days(s.fecha);return d>=0&&d<=15;}).sort((a,b)=>new Date(a.fecha)-new Date(b.fecha));}

function renderAlertas(){
    const items=getAlerts();
    const tb=$('tbodyAlertas'),tbl=$('tablaAlertas'),em=$('emptyAlertas');
    if(!items.length){tbl.style.display='none';em.classList.add('visible');$('btnWaSendAll').style.display='none';return;}
    tbl.style.display='';em.classList.remove('visible');$('btnWaSendAll').style.display='';
    const waCfg=getWAConfig();
    tb.innerHTML=items.map((s,i)=>{
        const d=days(s.fecha),cli=getClient(s.clienteId);
        let urg,uc;if(d<=2){urg='🔴 Crítico';uc='danger';}else if(d<=7){urg='🟡 Urgente';uc='warning';}else{urg='🔵 Próximo';uc='info';}
        const hasEmail=cli&&cli.email;
        return `<tr style="animation-delay:${i*.03}s">
            <td><span class="badge badge-${uc}">${urg}</span></td>
            <td><strong>${cli?esc(cli.nombre):'—'}</strong></td>
            <td>${hasEmail?esc(cli.email):'<span style="color:var(--color-text-muted)">Sin email</span>'}</td>
            <td><span class="badge-tipo">${TL[s.tipo]||s.tipo}</span></td>
            <td>${fd(s.fecha)}</td>
            <td><span class="days-count ${uc}">${d}d</span></td>
            <td>${fm(s.monto,s.moneda||'USD')}</td>
            <td>${hasEmail?'<button class="btn-sm btn-email" onclick="openEmail(\''+s.id+'\')">📧</button>':'<span style="color:var(--color-text-muted)">—</span>'}</td>
            <td>${waCfg?'<button class="btn-sm btn-whatsapp" onclick="sendWaAlert(\''+s.id+'\')">📨</button>':'<span style="color:var(--color-text-muted)" title="Configura WhatsApp en ⚙️">—</span>'}</td>
        </tr>`;
    }).join('');
    const cnt=items.length,b=$('alertCount');if(cnt>0){b.textContent=cnt;b.style.display='inline-block';}else b.style.display='none';
}

/* WhatsApp per-alert */
async function sendWaAlert(id){
    const s=servicios.find(x=>x.id===id),cli=getClient(s?.clienteId);
    if(!s){toast('Servicio no encontrado','error');return;}
    const d=days(s.fecha),cur=s.moneda||'USD';
    const altCur=cur==='USD'?'CRC':'USD';
    const alt=cv(s.monto,cur,altCur);
    const name=cli?cli.nombre:'Cliente';
    const montoTexto = s.monto.toFixed(2) + ' ' + cur;
    const altTexto = alt!==null ? ' (' + alt.toFixed(2) + ' ' + altCur + ')' : '';
    const msg=`⚠️ *ALERTA DE VENCIMIENTO*\n\n👤 Cliente: ${name}\n📦 Servicio: ${TL[s.tipo]||s.tipo}\n📅 Vence: ${fd(s.fecha)} (${d} dias)\n💰 Monto: ${montoTexto}${altTexto}\n\n---\nEnviado desde Control de Renovaciones`;
    try{
        await sendWhatsApp(msg);
        toast('Alerta enviada a WhatsApp','success');
    }catch(err){toast('Error: '+err.message,'error');}
}

/* WhatsApp batch summary */
$('btnWaSendAll').addEventListener('click',async()=>{
    const cfg=getWAConfig();
    if(!cfg){toast('Configura WhatsApp en ⚙️ Configuración','error');return;}
    const items=getAlerts();
    if(!items.length){toast('No hay alertas pendientes','info');return;}
    let msg=`📢 *RESUMEN DE ALERTAS*\n${new Date().toLocaleDateString('es-CR')}\n\n`;
    items.forEach((s,i)=>{
        const d=days(s.fecha),cli=getClient(s.clienteId);
        const mCur=s.moneda||'USD',mAltCur=mCur==='USD'?'CRC':'USD',mAlt=cv(s.monto,mCur,mAltCur);
        const ic=d<=2?'🔴':d<=7?'🟡':'🔵';
        const montoPlain = s.monto.toFixed(2) + ' ' + mCur;
        const altPlain = mAlt!==null ? ' (≈ ' + mAlt.toFixed(2) + ' ' + mAltCur + ')' : '';
        msg+=`${ic} *${cli?cli.nombre:'—'}*\n   📦 ${TL[s.tipo]||s.tipo} | 📅 ${fd(s.fecha)} | ⏱ ${d}d | 💰 ${montoPlain}${altPlain}\n\n`;
    });
    msg+=`Total: ${items.length} servicio(s) por vencer.\n---\nEnviado desde Control de Renovaciones`;
    const btn=$('btnWaSendAll');btn.disabled=true;btn.textContent='Enviando...';
    try{
        await sendWhatsApp(msg);
        toast(`Resumen de ${items.length} alerta(s) enviado a WhatsApp`,'success');
    }catch(err){toast('Error: '+err.message,'error');}
    btn.disabled=false;btn.textContent='Enviar Resumen a WhatsApp';
});

/* ==================== EMAIL ==================== */
let emailSrvId=null;
function openEmail(id){
    const s=servicios.find(x=>x.id===id),cli=getClient(s?.clienteId);
    if(!s||!cli||!cli.email){toast('Cliente sin email registrado','error');return;}
    emailSrvId=id;
    const d=days(s.fecha),cur=s.moneda||'USD';
    const subj=`Recordatorio de Renovación - ${TL[s.tipo]||s.tipo}`;
    const body=`Estimado/a ${cli.nombre},\n\nLe escribimos para recordarle que su servicio de ${(TL[s.tipo]||s.tipo).toLowerCase()} tiene fecha de vencimiento el ${fd(s.fecha)} (${d} días restantes).\n\nDetalles del servicio:\n• Tipo: ${TL[s.tipo]||s.tipo}\n• Período: ${PL[s.periodo]||s.periodo}\n• Monto: ${fm(s.monto,cur)}\n• Vencimiento: ${fd(s.fecha)}\n\nLe recomendamos realizar la renovación a la brevedad posible para evitar interrupciones.\n\nSaludos cordiales.`;
    $('emailTo').textContent=cli.email;$('emailSubject').textContent=subj;$('emailBody').textContent=body;
    const cfg=getEJSConfig();
    $('btnSendEmail').disabled=!cfg;
    $('btnSendEmail').title=cfg?'':'Configure EmailJS en ⚙️ Configuración';
    $('emailOverlay').classList.add('active');
}

$('btnSendEmail').addEventListener('click',async function(){
    const cfg=getEJSConfig();
    if(!cfg){toast('Configura EmailJS en ⚙️ Configuración primero','error');return;}
    const s=servicios.find(x=>x.id===emailSrvId),cli=getClient(s?.clienteId);
    if(!s||!cli)return;
    const d=days(s.fecha),cur=s.moneda||'USD';
    const subj=`Recordatorio de Renovación - ${TL[s.tipo]||s.tipo}`;
    const msg=`Estimado/a ${cli.nombre},\n\nLe recordamos que su servicio de ${(TL[s.tipo]||s.tipo).toLowerCase()} vence el ${fd(s.fecha)} (${d} días).\n\nMonto: ${fm(s.monto,cur)}\nPeríodo: ${PL[s.periodo]||s.periodo}\n\nPor favor, proceda con la renovación para evitar interrupciones.\n\nSaludos cordiales,\n${cfg.fromName||'Administración'}`;
    this.disabled=true;this.textContent='Enviando...';
    try{
        await emailjs.send(cfg.serviceId,cfg.templateId,{to_email:cli.email,to_name:cli.nombre,subject:subj,message:msg},{publicKey:cfg.publicKey});
        toast('✉️ Correo enviado a '+cli.email,'success');closeModal('emailOverlay');
    }catch(err){
        console.error(err);toast('Error al enviar: '+(err.text||err.message||'Error desconocido'),'error');
    }
    this.disabled=false;this.textContent='📧 Enviar Correo';
});

/* ==================== CONFIG ==================== */
function getEJSConfig(){const d=localStorage.getItem(KEYS.ejs);if(!d)return null;const c=JSON.parse(d);return(c.publicKey&&c.serviceId&&c.templateId)?c:null;}

function loadConfig(){
    const c=getEJSConfig();if(c){$('ejsPublicKey').value=c.publicKey||'';$('ejsServiceId').value=c.serviceId||'';$('ejsTemplateId').value=c.templateId||'';$('ejsFromName').value=c.fromName||'';
    const st=$('configStatus');st.className='config-status ok';st.textContent='✅ EmailJS configurado correctamente';st.style.display='block';}
}

$('formConfig').addEventListener('submit',e=>{
    e.preventDefault();
    const data={publicKey:$('ejsPublicKey').value.trim(),serviceId:$('ejsServiceId').value.trim(),templateId:$('ejsTemplateId').value.trim(),fromName:$('ejsFromName').value.trim()};
    if(!data.publicKey||!data.serviceId||!data.templateId){toast('Completa los 3 campos obligatorios','error');return;}
    save(KEYS.ejs,data);
    const st=$('configStatus');st.className='config-status ok';st.textContent='✅ Configuración guardada correctamente';st.style.display='block';
    toast('Configuración de EmailJS guardada','success');
});

$('btnTestEmail').addEventListener('click',async()=>{
    const cfg=getEJSConfig();if(!cfg){toast('Guarda la configuración primero','error');return;}
    const st=$('configStatus');st.className='config-status';st.textContent='Enviando correo de prueba...';st.style.display='block';st.style.color='var(--color-text-secondary)';st.style.background='var(--color-background-tertiary)';
    try{
        await emailjs.send(cfg.serviceId,cfg.templateId,{to_email:'test@test.com',to_name:'Prueba',subject:'Prueba de Configuración',message:'Este es un correo de prueba desde Control de Renovaciones.'},{publicKey:cfg.publicKey});
        st.className='config-status ok';st.textContent='✅ Correo de prueba enviado. Revisa tu bandeja de entrada.';toast('Prueba enviada exitosamente','success');
    }catch(err){
        st.className='config-status err';st.textContent='❌ Error: '+(err.text||err.message||'Verifica las credenciales');toast('Error en la prueba','error');
    }
});

/* ==================== WHATSAPP CONFIG ==================== */
function loadWAConfig(){
    const c=getWAConfig();if(c){$('waPhone').value=c.phone||'';$('waApiKey').value=c.apikey||'';
    const st=$('waConfigStatus');st.className='config-status ok';st.textContent='✅ WhatsApp configurado: '+c.phone;st.style.display='block';}
}

$('formWaConfig').addEventListener('submit',e=>{
    e.preventDefault();
    const phone=$('waPhone').value.trim(),apikey=$('waApiKey').value.trim();
    if(!phone||!apikey){toast('Completa ambos campos','error');return;}
    save(KEYS.wa,{phone,apikey});
    const st=$('waConfigStatus');st.className='config-status ok';st.textContent='✅ WhatsApp configurado: '+phone;st.style.display='block';
    toast('Configuración de WhatsApp guardada','success');renderAlertas();
});

$('btnTestWa').addEventListener('click',async()=>{
    const phone=$('waPhone').value.trim(),apikey=$('waApiKey').value.trim();
    if(!phone||!apikey){toast('Guarda la configuración primero','error');return;}
    // Temporarily save for the test
    save(KEYS.wa,{phone,apikey});
    const st=$('waConfigStatus');st.className='config-status';st.textContent='📨 Enviando mensaje de prueba...';st.style.display='block';st.style.color='var(--color-text-secondary)';st.style.background='var(--color-background-tertiary)';
    try{
        await sendWhatsApp('*Control de Renovaciones*\n\nPrueba exitosa. Las notificaciones de WhatsApp estan configuradas correctamente.\n'+new Date().toLocaleString('es-CR'));
        st.className='config-status ok';st.textContent='Mensaje enviado. Revisa tu WhatsApp (puede tardar unos segundos).';toast('Prueba de WhatsApp enviada','success');
    }catch(err){
        st.className='config-status err';st.textContent='❌ Error: '+err.message;toast('Error en la prueba de WhatsApp','error');
    }
});

/* ==================== TABS & THEME ==================== */
document.querySelectorAll('.nav-tab').forEach(tab=>{tab.addEventListener('click',()=>{
    document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
    tab.classList.add('active');
    const name=tab.dataset.tab;$('content'+name.charAt(0).toUpperCase()+name.slice(1)).classList.add('active');
});});

$('btnTheme').addEventListener('click',()=>{
    const dark=document.documentElement.getAttribute('data-theme')==='dark';
    if(dark){document.documentElement.removeAttribute('data-theme');localStorage.setItem('ren_theme','light');$('themeIcon').textContent='🌙';}
    else{document.documentElement.setAttribute('data-theme','dark');localStorage.setItem('ren_theme','dark');$('themeIcon').textContent='☀️';}
});

$('btnRefreshRate').addEventListener('click',()=>{localStorage.removeItem(KEYS.ex);fetchRate();});

/* Close modals on overlay click */
['modalServicioOverlay','modalClienteOverlay','modalProductoOverlay','confirmOverlay','emailOverlay'].forEach(id=>{
    $(id).addEventListener('click',e=>{if(e.target===$(id))closeModal(id);});
});

document.addEventListener('keydown',e=>{if(e.key==='Escape'){['modalServicioOverlay','modalClienteOverlay','modalProductoOverlay','confirmOverlay','emailOverlay','passOverlay'].forEach(id=>{if($(id).classList.contains('active'))closeModal(id);});}});

/* ==================== INIT ==================== */
function refresh(){updateDash();renderServicios();renderAlertas();}
fetchRate();loadConfig();loadWAConfig();refresh();renderClientes();renderProductos();
