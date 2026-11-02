/* Meu Bolso: lógica do app.
   Valores em centavos (inteiros). Meses no formato 'AAAA-MM', datas 'AAAA-MM-DD'. */

/* ---------- cálculos ---------- */
var THRESH=[50,70,85,95,100,120];
var MES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
var MES3=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
function pad(n){return String(n).padStart(2,'0')}
function addMonths(key,k){var p=key.split('-').map(Number);var t=p[0]*12+(p[1]-1)+k;return Math.floor(t/12)+'-'+pad(t%12+1)}
function monthDiff(a,b){var x=a.split('-').map(Number),y=b.split('-').map(Number);return (y[0]*12+y[1])-(x[0]*12+x[1])}
function monthsRange(a,b){var out=[],n=monthDiff(a,b);for(var i=0;i<=n;i++)out.push(addMonths(a,i));return out}
function daysInMonth(key){var p=key.split('-').map(Number);return new Date(p[0],p[1],0).getDate()}
function dayIn(key,day){return key+'-'+pad(Math.min(day,daysInMonth(key)))}
function daysBetween(a,b){return Math.round((Date.parse(b+'T12:00:00')-Date.parse(a+'T12:00:00'))/864e5)}
function fmt(cents){return (cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function fmtSigned(c){return c<0?'−'+fmt(-c):fmt(c)}
function compact(cents){var v=cents/100;if(v>=1000)return (v/1000).toLocaleString('pt-BR',{maximumFractionDigits:1})+' mil';return String(Math.round(v))}
function money2input(c){return c?(c/100).toFixed(2).replace('.',','):''}
function parseMoney(s){
  s=String(s||'').replace(/[R$\s]/g,'');
  if(!s)return NaN;
  if(s.indexOf(',')>=0)s=s.replace(/\./g,'').replace(',','.');
  else if(/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'');
  if(!/^\d+(\.\d{1,2})?$/.test(s))return NaN;
  return Math.round(parseFloat(s)*100);
}
function firstMonth(p,card){
  var k=p.date.slice(0,7);
  if(card&&card.closeDay){var day=+p.date.slice(8,10);if(day>card.closeDay)k=addMonths(k,1)}
  return k;
}
function chargesOf(p,card){
  var n=card?Math.max(1,p.n|0):1;
  var base=Math.floor(p.total/n),rem=p.total-base*n,start=firstMonth(p,card),out=[];
  for(var i=0;i<n;i++)out.push({pid:p.id,month:addMonths(start,i),value:base+(i<rem?1:0),idx:i+1,n:n});
  return out;
}
/* gastos fixos viram lançamentos virtuais, um por mês, até o horizonte */
function horizon(){var h=addMonths(todayKey(),24),v=addMonths(ui.homeMonth,1);return v>h?v:h}
function recMonths(r,to){var end=r.end&&r.end<to?r.end:to;return r.start>end?[]:monthsRange(r.start,end)}
function expandRecurring(st){
  var to=horizon(),out=[];
  st.recurring.forEach(function(r){
    recMonths(r,to).forEach(function(m){
      out.push({id:'r:'+r.id+':'+m,rec:r.id,desc:r.desc,total:r.total,date:dayIn(m,r.day),cat:r.cat,method:r.method,n:1,kind:r.kind});
    });
  });
  return out;
}
function allCharges(st){
  var m={};st.cards.forEach(function(c){m[c.id]=c});
  var out=[];
  st.purchases.concat(expandRecurring(st)).forEach(function(p){
    var card=p.method==='cash'?null:(m[p.method]||null);
    chargesOf(p,card).forEach(function(c){c.p=p;c.card=card;out.push(c)});
  });
  return out;
}
function sum(list,f){return list.reduce(function(s,x){return s+(f?f(x):x.value)},0)}
function spentOf(chs,key){return chs.reduce(function(s,c){return c.month===key?s+c.value:s},0)}
function levelOf(spent,cap){return cap>0?THRESH.filter(function(t){return spent*100>=t*cap}).length:0}
function pctNum(spent,cap){return cap>0?spent/cap*100:0}
function alertsFor(spent,cap,daysLeft){
  if(!(cap>0))return [];
  var rest=cap-spent,per=(rest>0&&daysLeft)?' Isso dá '+fmt(Math.floor(rest/daysLeft))+' por dia até o fim do mês.':'';
  var defs=[
    [50,'info','Metade do teto','Você passou de 50% do teto do mês. É um bom momento para olhar o que ainda vem pela frente.'],
    [70,'warn','70% usados','Sobrou menos de um terço do teto. Adie o que não for urgente.'],
    [85,'warn','Faixa de atenção',rest>0?'Restam '+fmt(rest)+'.'+per:'Você já passou desta faixa.'],
    [95,'crit','Quase no teto',rest>0?'Faltam só '+fmt(rest)+'. Compre apenas o essencial.':'Você já passou desta faixa. Compre apenas o essencial.'],
    [100,'crit','Teto atingido',rest===0?'Você usou exatamente o teto. Qualquer compra nova passa dele.':'Você passou do teto em '+fmt(-rest)+'.'],
    [120,'crit','20% acima do teto','Revise as parcelas dos próximos meses antes de assumir outra compra.']
  ];
  return defs.filter(function(d){return spent*100>=d[0]*cap}).map(function(d){return {t:d[0],sev:d[1],title:d[2],text:d[3]}});
}
function niceMax(cents){
  var v=Math.max(cents/100,1),pow=Math.pow(10,Math.floor(Math.log10(v))),c=[1,1.5,2,3,4,5,6,8,10];
  for(var i=0;i<c.length;i++){if(c[i]*pow>=v)return Math.round(c[i]*pow*100)}
  return Math.round(10*pow*100);
}

/* ---------- utilidades ---------- */
var LS='meu-bolso-v1';
var CATS=['Mercado','Alimentação','Delivery','Transporte','Lazer','Compras','Assinaturas','Saúde','Casa','Educação','Dívida','Outros'];
var INCATS=['Salário','Freelance','Vendas','Reembolso','Presente','Rendimentos','Outros'];
var KINDS={need:'Necessidade',want:'Desejo'};
var COLORS=['#0A6B63','#2F5BD8','#B4442A','#8A6A12','#3E4A56'];
var WAIT_MS=24*3600*1000;
var $=function(s,r){return (r||document).querySelector(s)};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var uid=function(){return Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4)};
var cap1=function(s){return s.charAt(0).toUpperCase()+s.slice(1)};
function todayStr(){var d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function todayKey(){return todayStr().slice(0,7)}
function mLong(key){var p=key.split('-');return MES[+p[1]-1]+' de '+p[0]}
function mShort(key){var p=key.split('-');return MES3[+p[1]-1]+'/'+p[0]}
function dm(ds){return ds.slice(8,10)+'/'+ds.slice(5,7)}

/* ---------- seletor de data próprio ----------
   O <input type="date"> nativo abre um diálogo quebrado no WebView do Android
   (tela branca / roleta minúscula). Este calendário é desenhado pelo app e
   grava o valor AAAA-MM-DD num input oculto name="date". */
var DIAS=['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
var CAL_ICON='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';
function isoOf(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function dateLabel(v){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(v||''))return 'Escolher data';
  var d=new Date(+v.slice(0,4),+v.slice(5,7)-1,+v.slice(8,10));
  var y=new Date();y.setDate(y.getDate()-1);
  var pre=v===todayStr()?'Hoje, ':v===isoOf(y)?'Ontem, ':DIAS[d.getDay()]+', ';
  return pre+d.getDate()+' de '+MES[d.getMonth()]+' de '+d.getFullYear();
}
function dateFieldHTML(id,label,value){
  return '<div class="field" data-date-field><label for="'+id+'">'+label+'</label>'+
    '<input type="hidden" name="date" value="'+esc(value||'')+'">'+
    '<button type="button" class="input datebtn" id="'+id+'" data-act="date-toggle" aria-expanded="false">'+CAL_ICON+'<span class="dv">'+esc(dateLabel(value))+'</span></button>'+
    '<div class="cal" hidden></div></div>';
}
function calHTML(view,sel){
  var y=+view.slice(0,4),m=+view.slice(5,7)-1,first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate(),today=todayStr();
  var h='<div class="cal-head"><button type="button" class="iconbtn" data-act="date-nav" data-d="-1" aria-label="Mês anterior">‹</button>'+
    '<b>'+MES[m]+' '+y+'</b><button type="button" class="iconbtn" data-act="date-nav" data-d="1" aria-label="Próximo mês">›</button></div><div class="cal-grid">';
  ['D','S','T','Q','Q','S','S'].forEach(function(w){h+='<span class="wd">'+w+'</span>'});
  for(var i=0;i<first;i++)h+='<span></span>';
  for(var d=1;d<=days;d++){
    var v=view+'-'+pad(d);
    h+='<button type="button" class="cal-day'+(v===sel?' sel':'')+(v===today?' today':'')+'" data-act="date-pick" data-v="'+v+'" aria-label="'+esc(dateLabel(v))+'">'+d+'</button>';
  }
  var yd=new Date();yd.setDate(yd.getDate()-1);
  return h+'</div><div class="cal-quick"><button type="button" class="btn sm" data-act="date-pick" data-v="'+today+'">Hoje</button><button type="button" class="btn sm" data-act="date-pick" data-v="'+isoOf(yd)+'">Ontem</button></div>';
}
function dateFieldAct(act,el){
  var f=el.closest('[data-date-field]');if(!f)return;
  var hid=f.querySelector('input[name=date]'),cal=f.querySelector('.cal'),btn=f.querySelector('.datebtn');
  if(act==='date-toggle'){
    var open=cal.hidden;
    if(open){f.dataset.view=(hid.value||todayStr()).slice(0,7);cal.innerHTML=calHTML(f.dataset.view,hid.value)}
    cal.hidden=!open;btn.setAttribute('aria-expanded',String(open));
  }else if(act==='date-nav'){
    f.dataset.view=addMonths(f.dataset.view,+el.dataset.d);cal.innerHTML=calHTML(f.dataset.view,hid.value);
  }else if(act==='date-pick'){
    hid.value=el.dataset.v;f.querySelector('.dv').textContent=dateLabel(hid.value);
    cal.hidden=true;btn.setAttribute('aria-expanded','false');btn.focus();
    hid.dispatchEvent(new Event('change',{bubbles:true}));
  }
}
function plural(n,a,b){return n+' '+(n===1?a:b)}
function isNative(){var C=window.Capacitor;return !!(C&&C.isNativePlatform&&C.isNativePlatform())}
function plugin(name){return isNative()&&window.Capacitor.Plugins?window.Capacitor.Plugins[name]||null:null}

/* ---------- estado ---------- */
function migrate(s){
  s.version=2;
  ['cards','purchases','recurring','incomes','recIncomes','wishes'].forEach(function(k){if(!Array.isArray(s[k]))s[k]=[]});
  if(!s.paid||typeof s.paid!=='object')s.paid={};
  if(typeof s.cap!=='number')s.cap=0;
  if(typeof s.savingsGoal!=='number')s.savingsGoal=0;
  if(!s.prefs||typeof s.prefs!=='object')s.prefs={};
  return s;
}
function blankState(){return migrate({example:false,cap:0})}
function sampleState(){
  var cm=todayKey(),td=+todayStr().slice(8,10),now=Date.now();
  var inM=function(off,day){var k=addMonths(cm,off);return k+'-'+pad(off===0?Math.min(day,td):day)};
  var a='c-azul',v='c-verde';
  /* faturas antigas pagas; a do Cartão Azul de mês passado fica em aberto para mostrar o aviso */
  var paid={};[a,v].forEach(function(c){for(var k=(c===a?2:1);k<=3;k++)paid[c+'|'+addMonths(cm,-k)]=now});
  return migrate({example:true,cap:350000,savingsGoal:50000,paid:paid,
    cards:[{id:a,name:'Cartão Azul',limit:800000,closeDay:25,dueDay:5,color:COLORS[1]},{id:v,name:'Cartão Verde',limit:250000,closeDay:5,dueDay:12,color:COLORS[0]}],
    recurring:[
      {id:'r1',desc:'Aluguel',total:120000,day:5,cat:'Casa',method:'cash',kind:'need',start:addMonths(cm,-3)},
      {id:'r2',desc:'Streaming',total:5990,day:8,cat:'Assinaturas',method:v,kind:'want',start:addMonths(cm,-3)}
    ],
    purchases:[
      {id:'p2',desc:'Mercado do mês',total:38640,date:inM(0,1),cat:'Mercado',method:'cash',n:1,kind:'need'},
      {id:'p3',desc:'Farmácia',total:9650,date:inM(0,1),cat:'Saúde',method:'cash',n:1,kind:'need'},
      {id:'p4',desc:'Celular novo',total:180000,date:inM(-2,14),cat:'Compras',method:a,n:10,kind:'want'},
      {id:'p5',desc:'Notebook',total:360000,date:inM(-1,10),cat:'Compras',method:a,n:12,kind:'need'},
      {id:'p6',desc:'Tênis de corrida',total:35990,date:inM(-1,12),cat:'Compras',method:v,n:3,kind:'want'},
      {id:'p8',desc:'Jantar de aniversário',total:14200,date:inM(0,1),cat:'Alimentação',method:a,n:1,kind:'want'},
      {id:'p9',desc:'Delivery',total:6890,date:inM(-1,20),cat:'Delivery',method:'cash',n:1,kind:'want'}
    ],
    recIncomes:[{id:'i1',desc:'Salário',total:520000,day:5,cat:'Salário',start:addMonths(cm,-3)}],
    incomes:[{id:'i2',desc:'Freela de design',total:80000,date:inM(0,1),cat:'Freelance'}],
    wishes:[
      {id:'w1',desc:'Fone bluetooth',total:29900,cat:'Compras',method:a,n:1,kind:'want',created:now-25*3600*1000,status:'wait'},
      {id:'w2',desc:'Jaqueta',total:24990,cat:'Compras',method:'cash',n:1,kind:'want',created:now-3*3600*1000,status:'wait'},
      {id:'w3',desc:'Videogame',total:350000,cat:'Lazer',method:a,n:10,kind:'want',created:now-9*86400000,status:'gave',decided:now-8*86400000}
    ]});
}
function validState(s){return !!(s&&Array.isArray(s.cards)&&Array.isArray(s.purchases)&&typeof s.cap==='number')}
function loadLocal(){try{var j=localStorage.getItem(LS);var s=j?JSON.parse(j):null;return validState(s)?migrate(s):null}catch(e){return null}}
function saveLocal(){try{localStorage.setItem(LS,JSON.stringify(state))}catch(e){}}

var state=loadLocal()||sampleState();
var ui={tab:'home',homeMonth:todayKey(),capEdit:false,cardId:null,cardMonth:null,cardForm:null,confirm:null,recForm:null,incForm:null};
var draft=null,cache=null,pendingConfirm=null;
var store={ref:null,msg:'',err:false};
var chs=function(){return cache||(cache=allCharges(state))};
var cardById=function(id){return state.cards.find(function(c){return c.id===id})};
function blankDraft(){
  var lm=state.prefs.lastMethod;
  return {desc:'',val:'',date:todayStr(),cat:'Outros',method:(lm&&(lm==='cash'||cardById(lm)))?lm:'cash',n:1,kind:'',perInst:false,editId:null,wishId:null};
}
draft=blankDraft();

/* ---------- gravação ---------- */
var saveTimer=null,saving=false,dirty=false;
function setStatus(msg,err){store.msg=msg;store.err=!!err;var el=$('#status');if(el){el.textContent=msg;el.className='status'+(err?' err':'')}}
function persist(){
  cache=null;saveLocal();scheduleNotifications();
  if(!store.ref)return;
  dirty=true;clearTimeout(saveTimer);saveTimer=setTimeout(flush,500);
}
async function flush(){
  if(saving){saveTimer=setTimeout(flush,300);return}
  if(!dirty)return;
  dirty=false;saving=true;
  try{await store.ref.set({json:JSON.stringify(state),updated:Date.now()});setStatus('Salvo na sua conta')}
  catch(e){setStatus('Não deu para salvar na conta. A cópia do aparelho foi mantida.',true)}
  saving=false;
  if(dirty)flush();
}
async function initStore(){
  try{
    if(!window.claude||!window.claude.use){setStatus('Salvo neste aparelho');return}
    var r=await Promise.all([window.claude.use('db'),window.claude.use('user')]);
    var db=r[0],user=r[1];
    if(!db||!user){setStatus('Salvo neste aparelho');return}
    var id=await user.id();
    if(!id){setStatus('Salvo neste aparelho');return}
    var ref=db.collection('data/users/'+id).doc('financas');
    var snap=await Promise.race([ref.get(),new Promise(function(_,rej){setTimeout(function(){rej(new Error('timeout'))},10000)})]);
    store.ref=ref;
    if(snap.exists){
      var d=snap.data(),s=null;
      try{s=JSON.parse(d.json)}catch(e){}
      if(validState(s)){state=migrate(s);cache=null;saveLocal();render()}
    }else if(!state.example){persist()}
    setStatus('Salvo na sua conta');
  }catch(e){setStatus('Salvo neste aparelho')}
}

/* ---------- faturas ---------- */
function invKey(cid,m){return cid+'|'+m}
function isPaid(cid,m){return !!state.paid[invKey(cid,m)]}
function dueDateOf(card,m){
  if(!card.dueDay)return null;
  var dmon=(card.closeDay&&card.dueDay>card.closeDay)?m:addMonths(m,1);
  return dayIn(dmon,card.dueDay);
}
function cardCharges(card){return chs().filter(function(c){return c.card&&c.card.id===card.id})}
function invoiceTotal(card,m){return spentOf(cardCharges(card),m)}
/* comprometido = faturas em aberto (a partir do mês passado) + parcelas futuras; assinaturas futuras não contam */
function committedOf(card){
  var cm=todayKey(),from=addMonths(cm,-1);
  return sum(cardCharges(card).filter(function(x){return x.month>=from&&!isPaid(card.id,x.month)&&(!x.p.rec||x.month<=cm)}));
}
function invoicesDue(){
  var t=todayStr(),out=[];
  state.cards.forEach(function(card){
    if(!card.dueDay)return;
    for(var k=-2;k<=1;k++){
      var m=addMonths(todayKey(),k),due=dueDateOf(card,m),tot=invoiceTotal(card,m);
      if(!tot||isPaid(card.id,m))continue;
      var d=daysBetween(t,due);
      if(d<=7&&d>=-45)out.push({card:card,m:m,due:due,tot:tot,d:d});
    }
  });
  return out.sort(function(a,b){return a.due<b.due?-1:1});
}

/* ---------- entradas ---------- */
function incomesOf(key){
  var out=state.incomes.filter(function(i){return i.date.slice(0,7)===key}).map(function(i){return {id:i.id,date:i.date,desc:i.desc,total:i.total,cat:i.cat,rec:null}});
  state.recIncomes.forEach(function(r){
    if(r.start<=key&&(!r.end||r.end>=key))out.push({id:r.id,date:dayIn(key,r.day),desc:r.desc,total:r.total,cat:r.cat,rec:r});
  });
  return out.sort(function(a,b){return a.date<b.date?1:a.date>b.date?-1:0});
}
function incomeTotal(key){return sum(incomesOf(key),function(i){return i.total})}

/* ---------- lista de espera ---------- */
function waiting(){return state.wishes.filter(function(w){return w.status==='wait'})}
function readyWishes(){var now=Date.now();return waiting().filter(function(w){return now-w.created>=WAIT_MS})}
function savedByGivingUp(){return sum(state.wishes.filter(function(w){return w.status==='gave'}),function(w){return w.total})}
function timeLeft(w){
  var ms=w.created+WAIT_MS-Date.now();if(ms<=0)return 'pronto para decidir';
  var h=Math.ceil(ms/3600000);return 'libera em '+(h>=1?plural(h,'hora','horas'):'menos de 1 hora');
}

/* ---------- lembretes (só no app instalado) ---------- */
function notifId(s){var h=0;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return 10+Math.abs(h%2000000000)}
var notifTimer=null;
function scheduleNotifications(){clearTimeout(notifTimer);notifTimer=setTimeout(syncNotifications,800)}
async function syncNotifications(){
  var ln=plugin('LocalNotifications');if(!ln)return;
  try{
    var pend=await ln.getPending();
    if(pend&&pend.notifications&&pend.notifications.length)await ln.cancel({notifications:pend.notifications.map(function(n){return {id:n.id}})});
    if(!state.prefs.remind||state.example)return;
    var now=Date.now(),list=[{id:1,title:'Hora de conferir seus gastos',body:'Leva um minuto: veja se faltou lançar alguma compra nesta semana.',schedule:{on:{weekday:1,hour:19,minute:0},allowWhileIdle:true}}];
    state.cards.forEach(function(card){
      if(!card.dueDay)return;
      for(var k=-1;k<=2;k++){
        var m=addMonths(todayKey(),k),due=dueDateOf(card,m),tot=invoiceTotal(card,m);
        if(!tot||isPaid(card.id,m))continue;
        var at=new Date(due+'T10:00:00');at.setDate(at.getDate()-2);
        if(at.getTime()>now)list.push({id:notifId('inv'+invKey(card.id,m)),title:'Fatura do '+card.name+' vence em 2 dias',body:fmt(tot)+' · vence em '+dm(due),schedule:{at:at,allowWhileIdle:true}});
      }
    });
    waiting().forEach(function(w){
      var at=w.created+WAIT_MS;
      if(at>now)list.push({id:notifId('w'+w.id),title:'Você ainda quer: '+w.desc+'?',body:'Passaram 24 horas. Abra o Meu Bolso para decidir.',schedule:{at:new Date(at),allowWhileIdle:true}});
    });
    await ln.schedule({notifications:list});
  }catch(e){}
}
async function enableReminders(){
  var ln=plugin('LocalNotifications');
  if(!ln){toast('Os lembretes funcionam só no app instalado no celular.');return}
  try{
    var p=await ln.checkPermissions();
    if(p.display!=='granted')p=await ln.requestPermissions();
    if(p.display!=='granted'){toast('Sem permissão de notificação. Libere nas configurações do Android.');return}
    state.prefs.remind=true;persist();render();toast('Lembretes ativados');
  }catch(e){toast('Não deu para ativar os lembretes.')}
}

/* ---------- backup ---------- */
function stamp(){return todayStr()}
async function saveFile(name,text,mime){
  var fs=plugin('Filesystem'),sh=plugin('Share');
  if(fs&&sh){
    var r=await fs.writeFile({path:name,data:text,directory:'CACHE',encoding:'utf8'});
    await sh.share({title:name,files:[r.uri],dialogTitle:'Salvar ou enviar'});
    return;
  }
  var blob=new Blob([text],{type:mime}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();
  setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1000);
}
async function exportBackup(){
  try{
    await saveFile('meu-bolso-backup-'+stamp()+'.json',JSON.stringify({app:'meu-bolso',exportedAt:new Date().toISOString(),state:state},null,2),'application/json');
    state.prefs.lastBackup=Date.now();persist();render();toast('Backup gerado');
  }catch(e){if(!/cancel/i.test(String(e&&e.message)))toast('Não deu para gerar o backup.')}
}
function csvCell(v){v=String(v==null?'':v);return /[;"\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}
function money(c){return (c/100).toFixed(2).replace('.',',')}
async function exportCSV(){
  var rows=[['Tipo','Data','Mês','Descrição','Categoria','Forma','Parcela','Classificação','Valor']];
  var until=addMonths(todayKey(),12);
  chs().filter(function(c){return c.month<=until}).sort(function(a,b){return a.month<b.month?-1:a.month>b.month?1:a.p.date<b.p.date?-1:1}).forEach(function(c){
    rows.push([c.p.rec?'Gasto fixo':'Gasto',dm(c.p.date)+'/'+c.p.date.slice(0,4),c.month,c.p.desc,c.p.cat,c.card?c.card.name:'À vista',c.n>1?c.idx+'/'+c.n:'',KINDS[c.p.kind]||'','-'+money(c.value)]);
  });
  var first=state.incomes.concat(state.recIncomes.map(function(r){return {date:r.start+'-01'}})).reduce(function(a,i){return i.date.slice(0,7)<a?i.date.slice(0,7):a},todayKey());
  monthsRange(first,todayKey()).forEach(function(k){incomesOf(k).forEach(function(i){rows.push([i.rec?'Entrada fixa':'Entrada',dm(i.date)+'/'+i.date.slice(0,4),k,i.desc,i.cat,'','','',money(i.total)])})});
  var text='﻿'+rows.map(function(r){return r.map(csvCell).join(';')}).join('\r\n');
  try{await saveFile('meu-bolso-'+stamp()+'.csv',text,'text/csv');toast('Planilha gerada')}
  catch(e){if(!/cancel/i.test(String(e&&e.message)))toast('Não deu para gerar a planilha.')}
}
function importFile(file){
  var rd=new FileReader();
  rd.onload=function(){
    var s=null;
    try{var j=JSON.parse(rd.result);s=j&&j.state?j.state:j}catch(e){}
    if(!validState(s)){toast('Esse arquivo não é um backup do Meu Bolso.');return}
    var when=s&&s.prefs&&s.prefs.lastBackup?new Date(s.prefs.lastBackup).toLocaleDateString('pt-BR'):null;
    openConfirm('Restaurar backup?','O backup tem '+plural(s.purchases.length,'lançamento','lançamentos')+' e '+plural(s.cards.length,'cartão','cartões')+(when?' (feito em '+when+')':'')+'. Os dados atuais deste aparelho serão substituídos.','Restaurar',function(){
      state=migrate(s);state.example=false;persist();go('home');toast('Backup restaurado');
    });
  };
  rd.readAsText(file);
}

/* ---------- utilidades de tela ---------- */
function toast(msg){
  var t=$('#toast');t.textContent=msg;t.hidden=false;
  clearTimeout(toast.t);toast.t=setTimeout(function(){t.hidden=true},2800);
}
function levelClass(l){return 'l'+l}
function daysLeftIn(key){return key===todayKey()?daysInMonth(key)-(+todayStr().slice(8,10))+1:null}
function alertsHTML(list,newFrom){
  return '<ul class="alerts">'+list.map(function(a){
    return '<li class="alert '+a.sev+'"><span class="tag num">'+a.t+'%</span><div><b>'+esc(a.title)+(newFrom!=null&&a.t>newFrom?'<span class="novo">novo</span>':'')+'</b><p>'+esc(a.text)+'</p></div></li>';
  }).join('')+'</ul>';
}
function chipsHTML(name,opts,cur){
  return '<div class="chips">'+opts.map(function(o){var v=typeof o==='string'?o:o[0],l=typeof o==='string'?o:o[1];
    return '<label class="chip"><input type="radio" name="'+name+'" value="'+esc(v)+'"'+(cur===v?' checked':'')+'><span>'+esc(l)+'</span></label>'}).join('')+'</div>';
}
function methodOptions(cur){
  return '<option value="cash"'+(cur==='cash'?' selected':'')+'>À vista (Pix, débito, dinheiro)</option>'+
    state.cards.map(function(c){return '<option value="'+esc(c.id)+'"'+(cur===c.id?' selected':'')+'>'+esc(c.name)+'</option>'}).join('');
}
function catOptions(list,cur){return list.map(function(c){return '<option'+(cur===c?' selected':'')+'>'+esc(c)+'</option>'}).join('')}
function monthNav(){
  var key=ui.homeMonth;
  return '<div class="monthnav"><button class="iconbtn" data-act="home-prev" aria-label="Mês anterior">‹</button><h2>'+esc(cap1(mLong(key)))+'</h2><button class="iconbtn" data-act="home-next" aria-label="Próximo mês">›</button></div>'+
    (key!==todayKey()?'<div style="text-align:center;margin-top:-6px"><button class="linkbtn small" data-act="home-today">Voltar para o mês atual</button></div>':'');
}
function capFormHTML(){
  return '<form id="f-cap" class="form" novalidate>'+
    '<div class="field"><label for="c-cap">Quanto você pode gastar por mês, no total?</label>'+
    '<input class="input num" id="c-cap" name="cap" inputmode="decimal" placeholder="Ex.: 3.500,00" value="'+esc(money2input(state.cap))+'" autocomplete="off"></div>'+
    '<p class="hint">Entram todos os gastos do mês: à vista, gastos fixos e as parcelas que caem nele.</p>'+
    '<div id="cap-err" class="err" role="alert"></div>'+
    '<div class="dialog-actions"><button class="btn primary" type="submit">Salvar teto</button>'+(state.cap?'<button class="btn" type="button" data-act="cap-cancel">Cancelar</button>':'')+'</div></form>';
}
function kindPill(k){return k?'<span class="pill '+k+'">'+esc(KINDS[k])+'</span>':''}
function chargeRow(c,showMethod){
  var meta=[c.p.cat,dm(c.p.date)];
  if(showMethod)meta.push(c.card?c.card.name:'À vista');
  if(c.n>1)meta.push('parcela '+c.idx+'/'+c.n);
  var acts;
  if(c.p.rec){
    acts='<button class="linkbtn small" data-act="rec-manage" data-id="'+esc(c.p.rec)+'">Gerenciar</button>';
  }else{
    var del=ui.confirm===c.p.id;
    acts=(del?'':'<button class="linkbtn small" data-act="edit" data-id="'+esc(c.p.id)+'">Editar</button>')+
      '<button class="linkbtn small danger-link" data-act="del" data-id="'+esc(c.p.id)+'">'+(del?(c.n>1?'Confirmar: apagar as '+c.n+' parcelas':'Confirmar exclusão'):'Excluir')+'</button>';
  }
  return '<li class="item"><span class="t">'+esc(c.p.desc)+(c.p.rec?'<span class="pill">Fixo</span>':'')+kindPill(c.p.kind)+'</span><span class="val num">'+fmt(c.value)+'</span>'+
    '<span class="m">'+esc(meta.join(' · '))+'</span><span class="acts">'+acts+'</span></li>';
}
function openConfirm(title,text,okLabel,onOk){
  pendingConfirm=onOk;
  var ov=$('#overlay');
  ov.innerHTML='<div class="scrim"><div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-t"><h2 id="dlg-t">'+esc(title)+'</h2><p class="muted">'+esc(text)+'</p>'+
    '<div class="dialog-actions"><button class="btn primary" data-act="confirm-ok" id="dlg-ok">'+esc(okLabel)+'</button><button class="btn" data-act="dlg-ok">Cancelar</button></div></div></div>';
  ov.hidden=false;$('#dlg-ok').focus();
}

/* ---------- início ---------- */
function homeHTML(){
  var key=ui.homeMonth,isCur=key===todayKey(),cap=state.cap;
  var all=chs(),inMonth=all.filter(function(c){return c.month===key});
  var spent=sum(inMonth),fixed=sum(inMonth.filter(function(c){return c.p.rec}));
  var lvl=levelOf(spent,cap),pct=pctNum(spent,cap),rest=cap-spent;
  var dl=daysLeftIn(key),alerts=alertsFor(spent,cap,dl);
  var out='';
  if(state.example){
    out+='<div class="banner"><span>Você está vendo <b>dados de exemplo</b>. Apague para usar os seus.</span><button class="btn sm primary" data-act="clear-example">Começar com meus dados</button></div>';
  }else if(state.purchases.length+state.recurring.length>=5&&(!state.prefs.lastBackup||Date.now()-state.prefs.lastBackup>30*86400000)){
    out+='<div class="banner"><span>'+(state.prefs.lastBackup?'Seu último backup tem mais de 30 dias.':'Você ainda não fez backup.')+' Se o app for desinstalado, os dados somem.</span><button class="btn sm primary" data-act="backup">Fazer backup</button></div>';
  }
  out+=monthNav();
  /* faturas vencendo */
  if(isCur){
    var due=invoicesDue();
    if(due.length){
      out+='<section class="panel"><div class="panel-head"><h2>Faturas</h2></div><ul class="list">'+due.map(function(v){
        var when=v.d<0?'venceu há '+plural(-v.d,'dia','dias'):v.d===0?'vence hoje':'vence em '+plural(v.d,'dia','dias');
        return '<li class="item"><span class="t">'+esc(v.card.name)+' · '+esc(mShort(v.m))+'</span><span class="val num">'+fmt(v.tot)+'</span>'+
          '<span class="m'+(v.d<=2?' due-soon':'')+'">'+esc(cap1(when))+' ('+dm(v.due)+')</span><span class="acts"><button class="btn sm" data-act="pay" data-id="'+esc(invKey(v.card.id,v.m))+'">Marcar como paga</button></span></li>';
      }).join('')+'</ul></section>';
    }
  }
  /* lista de espera pronta */
  var ready=readyWishes();
  if(ready.length){
    out+='<section class="panel"><div class="panel-head"><h2>Ainda quer comprar?</h2><span class="small muted">Lista de espera</span></div>'+
      ready.map(function(w){
        return '<div class="wish"><div><b>'+esc(w.desc)+'</b> <span class="num">'+fmt(w.total)+'</span></div><div class="small muted">Passaram 24 horas desde que você anotou. Se a vontade passou, melhor ainda.</div>'+
          '<div class="dialog-actions"><button class="btn sm" data-act="wish-gave" data-id="'+esc(w.id)+'">Desisti</button><button class="btn sm primary" data-act="wish-buy" data-id="'+esc(w.id)+'">Ainda quero, lançar</button></div></div>';
      }).join('')+'</section>';
  }
  if(!(cap>0)){
    out+='<section class="panel"><h2 style="margin-bottom:10px">Defina seu teto mensal</h2>'+capFormHTML()+'</section>';
  }else{
    var fillW=Math.min(pct,120)/120*100;
    var ticks=THRESH.slice(0,5).map(function(t){return '<i class="tick'+(t===100?' cap':'')+'" style="left:'+(t/120*100)+'%"></i>'}).join('');
    var labels=[[50,''],[70,''],[85,''],[100,'capl'],[120,'end']].map(function(x){return '<span class="'+x[1]+'" style="left:'+(x[0]/120*100)+'%">'+(x[0]===100?'teto':x[0]+'%')+'</span>'}).join('');
    var next=addMonths(key,1),nextSpent=spentOf(all,next);
    var stat2=dl?'<div class="stat"><div class="v num">'+(rest>0?fmt(Math.floor(rest/dl)):'—')+'</div><div class="k">por dia até o fim do mês ('+plural(dl,'dia','dias')+')</div></div>':
      '<div class="stat"><div class="v num">'+inMonth.length+'</div><div class="k">'+(inMonth.length===1?'lançamento':'lançamentos')+' no mês</div></div>';
    out+='<section class="panel gauge" aria-label="Termômetro do teto">'+
      '<div class="gauge-head"><div><div class="eyebrow">Gasto em '+esc(MES[+key.slice(5,7)-1])+'</div><div class="big num">'+fmt(spent)+'</div></div>'+
      '<div class="pctbadge num '+levelClass(lvl)+'">'+Math.floor(pct)+'%</div></div>'+
      '<div class="track" role="img" aria-label="'+Math.floor(pct)+'% do teto usado"><div class="fill '+levelClass(lvl)+'" style="width:'+fillW+'%"></div>'+ticks+'</div>'+
      '<div class="scale" aria-hidden="true">'+labels+'</div>'+
      '<div class="stats">'+
        '<div class="stat"><div class="v num'+(rest<0?' bad':'')+'">'+fmtSigned(rest)+'</div><div class="k">'+(rest<0?'acima do teto':'ainda disponível')+'</div></div>'+
        stat2+
        '<div class="stat"><div class="v num">'+fmt(nextSpent)+'</div><div class="k">já previsto em '+esc(mShort(next))+'</div></div>'+
      '</div>'+
      (fixed?'<p class="small muted" style="margin-top:12px">Gastos fixos <b class="num" style="color:var(--ink)">'+fmt(fixed)+'</b> · o que você controla <b class="num" style="color:var(--ink)">'+fmt(spent-fixed)+'</b>'+(cap>fixed?' de '+fmt(cap-fixed):'')+'</p>':'')+
      (ui.capEdit?'<div class="capline" style="display:block">'+capFormHTML()+'</div>':
      '<div class="capline"><span class="small muted">Teto mensal <b class="num" style="color:var(--ink)">'+fmt(cap)+'</b></span><button class="linkbtn small" data-act="cap-edit">Alterar teto</button></div>')+
      '</section>';
  }
  /* saldo do mês */
  var inc=incomeTotal(key);
  if(inc||state.incomes.length||state.recIncomes.length){
    var bal=inc-spent;
    out+='<section class="panel"><div class="panel-head"><h2>Saldo do mês</h2><button class="linkbtn small" data-act="tab" data-tab="income">Ver entradas</button></div>'+
      '<div class="stats" style="margin-top:0"><div class="stat"><div class="v num pos">'+fmt(inc)+'</div><div class="k">recebido</div></div>'+
      '<div class="stat"><div class="v num">'+fmt(spent)+'</div><div class="k">gasto</div></div>'+
      '<div class="stat"><div class="v num '+(bal<0?'bad':'pos')+'">'+fmtSigned(bal)+'</div><div class="k">'+(bal<0?'faltou':'sobrou')+'</div></div></div></section>';
  }
  if(cap>0){
    out+='<section class="panel"><div class="panel-head"><h2>Avisos</h2><span class="small muted num">'+alerts.length+' de '+THRESH.length+'</span></div>'+
      (alerts.length?alertsHTML(alerts):'<p class="hint">Nenhum aviso agora. Eles começam quando o mês chega a 50% do teto e aumentam a cada faixa: 70%, 85%, 95%, 100% e 120%.</p>')+'</section>';
  }
  if(inMonth.length){
    /* por categoria, comparando com o mês anterior */
    var prev=addMonths(key,-1),byCat={},prevCat={};
    inMonth.forEach(function(c){byCat[c.p.cat]=(byCat[c.p.cat]||0)+c.value});
    all.forEach(function(c){if(c.month===prev)prevCat[c.p.cat]=(prevCat[c.p.cat]||0)+c.value});
    var cats=Object.keys(byCat).sort(function(a,b){return byCat[b]-byCat[a]}),maxC=byCat[cats[0]];
    var prevTotal=spentOf(all,prev),diff=spent-prevTotal;
    out+='<section class="panel"><div class="panel-head"><h2>Por categoria</h2><span class="small muted">vs. '+esc(MES3[+prev.slice(5,7)-1])+'</span></div><div class="split">'+
      cats.map(function(k){
        var d=byCat[k]-(prevCat[k]||0);
        return '<div class="split-row"><div class="top2"><span>'+esc(k)+'</span><span class="num">'+fmt(byCat[k])+(d?' <span class="delta '+(d>0?'up':'down')+'">'+(d>0?'+':'−')+fmt(Math.abs(d))+'</span>':'')+'</span></div><div class="bar"><i style="width:'+(byCat[k]/maxC*100)+'%"></i></div></div>';
      }).join('')+'</div>'+
      (prevTotal?'<p class="small muted" style="margin-top:12px">No total, '+(diff>0?'<b class="delta up">'+fmt(diff)+' a mais</b>':diff<0?'<b class="delta down">'+fmt(-diff)+' a menos</b>':'o mesmo')+' que em '+esc(MES[+prev.slice(5,7)-1])+'.</p>':'');
    var need=sum(inMonth.filter(function(c){return c.p.kind==='need'})),want=sum(inMonth.filter(function(c){return c.p.kind==='want'}));
    if(need||want){
      out+='<div class="nw"><div class="nw-bar" role="img" aria-label="Necessidade '+fmt(need)+', desejo '+fmt(want)+'"><i class="need" style="width:'+(need/(need+want)*100)+'%"></i><i class="want" style="width:'+(want/(need+want)*100)+'%"></i></div>'+
        '<div class="small" style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><span><i class="dot need"></i> Necessidade <b class="num">'+fmt(need)+'</b></span><span><i class="dot want"></i> Desejo <b class="num">'+fmt(want)+'</b></span></div>'+
        (spent-need-want>0?'<div class="small muted">Sem classificação: '+fmt(spent-need-want)+'</div>':'')+'</div>';
    }
    out+='</section>';
    /* forma de pagamento */
    var groups={};
    inMonth.forEach(function(c){var k=c.card?c.card.id:'cash';groups[k]=(groups[k]||0)+c.value});
    var rows=Object.keys(groups).sort(function(a,b){return groups[b]-groups[a]}).map(function(k){
      var nm=k==='cash'?'À vista (Pix, débito, dinheiro)':(cardById(k)||{name:'Cartão'}).name;
      return '<div class="split-row"><div class="top2"><span>'+esc(nm)+'</span><span class="num">'+fmt(groups[k])+'</span></div><div class="bar"><i style="width:'+(spent?groups[k]/spent*100:0)+'%"></i></div></div>';
    }).join('');
    out+='<section class="panel"><div class="panel-head"><h2>Por forma de pagamento</h2></div><div class="split">'+rows+'</div></section>';
    var sorted=inMonth.slice().sort(function(a,b){return a.p.date<b.p.date?1:a.p.date>b.p.date?-1:0});
    out+='<section class="panel"><div class="panel-head"><h2>Lançamentos do mês</h2><span class="small muted num">'+fmt(spent)+'</span></div><ul class="list">'+sorted.map(function(c){return chargeRow(c,true)}).join('')+'</ul></section>';
  }else{
    out+='<section class="panel"><p class="empty">Nada lançado em '+esc(mLong(key))+'.<br><button class="linkbtn" data-act="goto-add">Lançar uma compra</button></p></section>';
  }
  return out;
}

/* ---------- lançar ---------- */
function addHTML(){
  var d=draft,editing=!!d.editId;
  var methods='<label class="chip"><input type="radio" name="method" value="cash"'+(d.method==='cash'?' checked':'')+'><span>À vista</span></label>'+
    state.cards.map(function(c){return '<label class="chip"><input type="radio" name="method" value="'+esc(c.id)+'"'+(d.method===c.id?' checked':'')+'><span><i class="dot" style="background:'+esc(c.color)+'"></i>'+esc(c.name)+'</span></label>'}).join('');
  var nOpts='';for(var i=1;i<=24;i++)nOpts+='<option value="'+i+'"'+(d.n===i?' selected':'')+'>'+i+'x</option>';
  return '<section class="panel"><h2 style="margin-bottom:12px">'+(editing?'Editar lançamento':d.wishId?'Lançar compra da lista de espera':'Nova compra ou dívida')+'</h2>'+
    '<form id="f-add" class="form" novalidate>'+
    '<div class="field"><label for="a-val" id="a-val-l">'+(d.perInst?'Valor de cada parcela':'Valor')+'</label><input class="input num bigval" id="a-val" name="val" inputmode="decimal" placeholder="0,00" value="'+esc(d.val)+'" autocomplete="off"></div>'+
    '<div class="field"><label for="a-desc">O que foi?</label><input class="input" id="a-desc" name="desc" maxlength="80" placeholder="Ex.: Tênis, conta de luz, parcela do carro" value="'+esc(d.desc)+'" autocomplete="off"></div>'+
    '<fieldset><div class="legend">Como foi pago</div><div class="chips">'+methods+'</div>'+
    (state.cards.length?'':'<p class="hint" style="margin-top:8px">Quer lançar no cartão? Cadastre seus cartões na aba Cartões.</p>')+'</fieldset>'+
    '<div class="field" id="a-inst" '+(d.method==='cash'?'hidden':'')+'><label for="a-n">Em quantas vezes?</label><select class="input" id="a-n" name="n">'+nOpts+'</select>'+
    '<label class="check" id="a-per-w"'+(d.n>1?'':' hidden')+'><input type="checkbox" name="perInst"'+(d.perInst?' checked':'')+'> O valor que digitei é o de cada parcela (com juros)</label>'+
    '<p class="hint num" id="a-inst-note"></p></div>'+
    '<fieldset><div class="legend">Categoria</div>'+chipsHTML('cat',CATS,d.cat)+'</fieldset>'+
    '<fieldset><div class="legend">Era necessidade ou desejo?</div>'+chipsHTML('kind',[['need','Necessidade'],['want','Desejo']],d.kind)+'</fieldset>'+
    dateFieldHTML('a-date','Data da compra',d.date)+
    '<div class="preview" id="a-prev" aria-live="polite"></div>'+
    '<div id="a-err" class="err" role="alert"></div>'+
    '<button class="btn primary block" type="submit">'+(editing?'Salvar alterações':'Adicionar lançamento')+'</button>'+
    (editing||d.wishId?'<button class="btn block" type="button" data-act="add-cancel">Cancelar</button>':
      '<button class="btn block" type="button" data-act="add-wish">Ainda não comprei: esperar 24 horas</button><p class="hint" style="text-align:center">A compra vai para a lista de espera e o app pergunta amanhã se você ainda quer.</p>')+
    '</form></section>';
}
function readAdd(){
  var f=$('#f-add');if(!f)return;
  var g=function(n){var el=f.querySelector('input[name='+n+']:checked');return el?el.value:''};
  draft.desc=f.elements.desc.value;draft.val=f.elements.val.value;draft.date=f.elements.date.value;
  draft.cat=g('cat')||'Outros';draft.kind=g('kind');draft.method=g('method')||'cash';
  draft.n=+f.elements.n.value||1;draft.perInst=f.elements.perInst.checked;
}
function draftTotal(){
  var v=parseMoney(draft.val);if(!(v>0))return NaN;
  return draft.method!=='cash'&&draft.n>1&&draft.perInst?v*draft.n:v;
}
function candidate(){
  var total=draftTotal();
  if(!(total>0)||!/^\d{4}-\d{2}-\d{2}$/.test(draft.date))return null;
  var p={id:'preview',desc:draft.desc,total:total,date:draft.date,cat:draft.cat,method:draft.method,n:draft.method==='cash'?1:draft.n};
  var card=draft.method==='cash'?null:cardById(draft.method);
  return {p:p,card:card,ch:chargesOf(p,card)};
}
function chargesWithout(id){return id?chs().filter(function(c){return c.p.id!==id}):chs()}
function updateAddPreview(){
  var inst=$('#a-inst'),prev=$('#a-prev'),note=$('#a-inst-note'),perW=$('#a-per-w'),valL=$('#a-val-l');
  if(!prev)return;
  inst.hidden=draft.method==='cash';
  perW.hidden=!(draft.n>1);
  valL.textContent=draft.perInst&&draft.n>1&&draft.method!=='cash'?'Valor de cada parcela':'Valor';
  var c=candidate();
  if(note){
    if(c&&c.card){
      var n=c.p.n,base=Math.floor(c.p.total/n);
      note.textContent=n===1?'1 parcela de '+fmt(c.p.total)+' na fatura de '+mShort(c.ch[0].month):
        n+'x de '+fmt(base)+' (total '+fmt(c.p.total)+') · de '+mShort(c.ch[0].month)+' até '+mShort(c.ch[n-1].month);
    }else note.textContent='';
  }
  if(!c){prev.innerHTML='<div class="eyebrow">Posso comprar isso?</div><p class="hint">Digite o valor para ver o impacto no teto, no limite do cartão e nos próximos meses.</p>';return}
  var h='<div class="eyebrow">Posso comprar isso?</div>',all=chargesWithout(draft.editId),cap=state.cap;
  if(cap>0){
    var f=c.ch[0],before=spentOf(all,f.month),after=before+f.value;
    var lb=levelOf(before,cap),la=levelOf(after,cap);
    var wA=Math.min(pctNum(before,cap),120)/120*100,wB=Math.min(pctNum(after,cap),120)/120*100-wA;
    h+='<div class="pv-row"><span>'+esc(cap1(mShort(f.month)))+'</span><b class="num">'+Math.floor(pctNum(before,cap))+'% → '+Math.floor(pctNum(after,cap))+'% do teto</b></div>'+
      '<div class="mini" aria-hidden="true"><i class="a" style="width:'+wA+'%"></i><i class="b" style="left:'+wA+'%;width:'+Math.max(wB,0)+'%"></i><i class="t100" style="left:'+(100/120*100)+'%"></i></div>';
    h+=la>lb?'<div class="pv-warn">Com esta compra você passa de '+plural(la,'aviso','avisos')+' neste mês (hoje são '+lb+').</div>':
      '<div class="pv-ok">'+(la===0?'Sem avisos neste mês.':plural(la,'aviso','avisos')+', sem mudança.')+'</div>';
    if(c.ch.length>1){
      var share=c.ch[0].value/cap*100;
      h+='<div class="pv-row small"><span>Peso da parcela</span><b class="num">'+share.toLocaleString('pt-BR',{maximumFractionDigits:1})+'% do teto por '+c.ch.length+' meses</b></div>';
    }
    var worst=null;
    c.ch.slice(1).forEach(function(x){var a=spentOf(all,x.month)+x.value;if(levelOf(a,cap)>=4&&(!worst||a/cap>worst.r))worst={m:x.month,r:a/cap}});
    if(worst)h+='<div class="pv-warn">Em '+esc(mShort(worst.m))+' as parcelas levam o mês a '+Math.floor(worst.r*100)+'% do teto.</div>';
  }else h+='<p class="hint">Defina o teto mensal na aba Início para ver o impacto.</p>';
  if(c.card){
    var editingSame=draft.editId?state.purchases.find(function(p){return p.id===draft.editId}):null;
    var free=c.card.limit-committedOf(c.card)+(editingSame&&editingSame.method===c.card.id?editingSame.total:0);
    h+=c.p.total>free?'<div class="pv-warn">Passa do limite livre do '+esc(c.card.name)+' ('+fmt(Math.max(free,0))+' livres).</div>':
      '<div class="pv-row small muted"><span>Limite livre no '+esc(c.card.name)+'</span><span class="num">'+fmt(free)+' → '+fmt(free-c.p.total)+'</span></div>';
  }
  prev.innerHTML=h;
}
function validateDraft(needDate){
  var err=$('#a-err'),total=draftTotal();
  if(!(total>0)){err.textContent='Informe o valor, por exemplo 129,90.';$('#a-val').focus();return null}
  if(!draft.desc.trim()){err.textContent='Escreva o que foi comprado.';$('#a-desc').focus();return null}
  if(needDate&&!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)){err.textContent='Escolha a data da compra.';$('#a-date').focus();return null}
  return total;
}
function submitAdd(){
  readAdd();
  var total=validateDraft(true);if(!total)return;
  var p={id:draft.editId||uid(),desc:draft.desc.trim(),total:total,date:draft.date,cat:draft.cat,method:draft.method,n:draft.method==='cash'?1:Math.max(1,Math.min(48,draft.n|0)),kind:draft.kind||undefined};
  var card=p.method==='cash'?null:cardById(p.method);
  var month=chargesOf(p,card)[0].month;
  var before=spentOf(chargesWithout(draft.editId),month),lb=levelOf(before,state.cap);
  if(draft.editId){
    var i=state.purchases.findIndex(function(x){return x.id===draft.editId});
    if(i>=0)state.purchases[i]=p;else state.purchases.push(p);
  }else state.purchases.push(p);
  if(draft.wishId){var w=state.wishes.find(function(x){return x.id===draft.wishId});if(w){w.status='bought';w.decided=Date.now()}}
  var wasEdit=!!draft.editId;
  state.prefs.lastMethod=p.method;
  persist();
  var after=spentOf(chs(),month),la=levelOf(after,state.cap);
  draft=blankDraft();
  if(wasEdit){go('home');ui.homeMonth=month;render();toast('Lançamento atualizado');return}
  render();
  if(la>lb&&la>=1)openDialog(p.id,month,lb,la,after);
  else toast('Lançado: '+p.desc);
}
function addWish(){
  readAdd();
  var total=validateDraft(false);if(!total)return;
  state.wishes.push({id:uid(),desc:draft.desc.trim(),total:total,cat:draft.cat,method:draft.method,n:draft.method==='cash'?1:draft.n,kind:draft.kind||'want',created:Date.now(),status:'wait'});
  persist();draft=blankDraft();render();
  toast('Anotado. Amanhã eu pergunto se você ainda quer.');
}
function startEdit(id){
  var p=state.purchases.find(function(x){return x.id===id});if(!p)return;
  draft={desc:p.desc,val:money2input(p.total),date:p.date,cat:p.cat,method:p.method,n:p.n||1,kind:p.kind||'',perInst:false,editId:p.id,wishId:null};
  go('add',true);
}
function openDialog(pid,month,lb,la,spent){
  var cap=state.cap,rest=cap-spent;
  var list=alertsFor(spent,cap,daysLeftIn(month));
  var cls=la>=4?'crit':la>=2?'warn':'';
  var ov=$('#overlay');
  ov.innerHTML='<div class="scrim"><div class="dialog '+cls+'" role="alertdialog" aria-modal="true" aria-labelledby="dlg-t">'+
    '<div><div class="eyebrow">'+plural(la,'aviso','avisos')+' em '+esc(mShort(month))+'</div>'+
    '<h2 id="dlg-t" style="margin-top:4px">'+Math.floor(pctNum(spent,cap))+'% do teto de '+esc(MES[+month.slice(5,7)-1])+'</h2>'+
    '<p class="muted" style="margin-top:4px">'+(rest>=0?'Sobram '+fmt(rest)+' para este mês.':'Você está '+fmt(-rest)+' acima do teto.')+'</p></div>'+
    alertsHTML(list,lb>0?THRESH[lb-1]:0)+
    '<div class="dialog-actions"><button class="btn primary" data-act="dlg-ok" id="dlg-ok">Entendi</button><button class="btn danger" data-act="dlg-undo" data-id="'+esc(pid)+'">Desfazer este lançamento</button></div></div></div>';
  ov.hidden=false;
  $('#dlg-ok').focus();
}
function closeDialog(){var ov=$('#overlay');ov.hidden=true;ov.innerHTML='';pendingConfirm=null}

/* ---------- entradas ---------- */
function incFormHTML(){
  var f=ui.incForm,item=null,isRec=false;
  if(f&&f!=='new'){item=f.rec?state.recIncomes.find(function(r){return r.id===f.id}):state.incomes.find(function(i){return i.id===f.id});isRec=!!f.rec}
  var date=item?(isRec?dayIn(todayKey(),item.day):item.date):todayStr();
  return '<section class="panel"><h2 style="margin-bottom:12px">'+(item?'Editar entrada':'Nova entrada')+'</h2><form id="f-inc" class="form" novalidate>'+
    '<div class="field"><label for="i-val">Valor recebido</label><input class="input num bigval" id="i-val" name="val" inputmode="decimal" placeholder="0,00" value="'+esc(item?money2input(item.total):'')+'" autocomplete="off"></div>'+
    '<div class="field"><label for="i-desc">De onde veio?</label><input class="input" id="i-desc" name="desc" maxlength="60" placeholder="Ex.: Salário, freela, venda" value="'+esc(item?item.desc:'')+'" autocomplete="off"></div>'+
    '<fieldset><div class="legend">Tipo</div>'+chipsHTML('cat',INCATS,item?item.cat:'Salário')+'</fieldset>'+
    dateFieldHTML('i-date',isRec?'Dia em que cai (use qualquer data com esse dia)':'Data',date)+
    (item?'':'<label class="check"><input type="checkbox" name="rec"> Recebo esse valor todo mês</label>')+
    (isRec?'<p class="hint">Entrada fixa: a mudança vale para todos os meses.</p>':'')+
    '<div id="i-err" class="err" role="alert"></div>'+
    '<div class="dialog-actions"><button class="btn primary" type="submit">Salvar entrada</button><button class="btn" type="button" data-act="inc-cancel">Cancelar</button></div></form></section>';
}
function incomeHTML(){
  var key=ui.homeMonth,list=incomesOf(key),inc=sum(list,function(i){return i.total}),spent=spentOf(chs(),key),bal=inc-spent;
  var out='<div class="panel-head" style="margin:0"><h2>Entradas</h2>'+(ui.incForm?'':'<button class="btn sm primary" data-act="inc-new">Adicionar entrada</button>')+'</div>';
  if(ui.incForm)out+=incFormHTML();
  out+=monthNav();
  out+='<section class="panel"><div class="stats" style="margin-top:0">'+
    '<div class="stat"><div class="v num pos">'+fmt(inc)+'</div><div class="k">recebido</div></div>'+
    '<div class="stat"><div class="v num">'+fmt(spent)+'</div><div class="k">gasto</div></div>'+
    '<div class="stat"><div class="v num '+(bal<0?'bad':'pos')+'">'+fmtSigned(bal)+'</div><div class="k">'+(bal<0?'faltou':'sobrou')+'</div></div></div>';
  if(inc){
    var used=Math.min(spent/inc*100,100);
    out+='<div class="limitbar" style="margin-top:12px"><i class="'+(spent>inc?'over':used>=85?'hi':'')+'" style="width:'+used+'%"></i></div><p class="small muted" style="margin-top:6px">Você gastou '+Math.round(spent/inc*100)+'% do que recebeu.</p>';
  }
  /* acumulado do ano até o mês */
  var y=key.slice(0,4),months=monthsRange(y+'-01',key),yi=0,ys=0,all=chs();
  months.forEach(function(m){yi+=incomeTotal(m);ys+=spentOf(all,m)});
  out+='<div class="capline"><span class="small muted">De janeiro a '+esc(MES[+key.slice(5,7)-1])+': recebido <b class="num" style="color:var(--ink)">'+fmt(yi)+'</b> · gasto <b class="num" style="color:var(--ink)">'+fmt(ys)+'</b> · saldo <b class="num '+(yi-ys<0?'bad':'pos')+'">'+fmtSigned(yi-ys)+'</b></span></div></section>';
  /* meta de poupança e teto sugerido */
  var goal=state.savingsGoal,sug=inc-goal;
  out+='<section class="panel"><div class="panel-head"><h2>Planejamento</h2></div><form id="f-goal" class="form" novalidate>'+
    '<div class="field"><label for="g-val">Quanto você quer guardar por mês (poupança ou dívidas)?</label><input class="input num" id="g-val" name="goal" inputmode="decimal" placeholder="0,00" value="'+esc(money2input(goal))+'" autocomplete="off"></div>'+
    (inc?'<div class="preview"><div class="pv-row"><span>Recebido em '+esc(mShort(key))+'</span><span class="num">'+fmt(inc)+'</span></div><div class="pv-row"><span>Guardar primeiro</span><span class="num">−'+fmt(goal)+'</span></div>'+
      '<div class="pv-row"><b>Teto sugerido</b><b class="num">'+fmt(Math.max(sug,0))+'</b></div>'+
      (state.cap&&sug>0?'<div class="small muted">Seu teto atual é '+fmt(state.cap)+'.</div>':'')+'</div>':
      '<p class="hint">Cadastre o que você recebe para o app calcular um teto que já reserva a sua meta.</p>')+
    '<div class="dialog-actions"><button class="btn" type="submit">Salvar meta</button>'+(inc&&sug>0&&sug!==state.cap?'<button class="btn primary" type="button" data-act="use-suggested" data-v="'+sug+'">Usar '+fmt(sug)+' como teto</button>':'')+'</div></form></section>';
  out+='<section class="panel"><div class="panel-head"><h2>Recebido em '+esc(MES[+key.slice(5,7)-1])+'</h2><span class="small muted num">'+fmt(inc)+'</span></div>'+
    (list.length?'<ul class="list">'+list.map(function(i){
      var ck=(i.rec?'ri:':'i:')+i.id,del=ui.confirm===ck;
      return '<li class="item"><span class="t">'+esc(i.desc)+(i.rec?'<span class="pill">Fixa</span>':'')+'</span><span class="val num pos">+'+fmt(i.total)+'</span>'+
        '<span class="m">'+esc(i.cat+' · '+dm(i.date))+'</span><span class="acts">'+
        (del?'':'<button class="linkbtn small" data-act="inc-edit" data-id="'+esc(i.id)+'" data-rec="'+(i.rec?1:0)+'">Editar</button>')+
        '<button class="linkbtn small danger-link" data-act="inc-del" data-id="'+esc(i.id)+'" data-rec="'+(i.rec?1:0)+'">'+(del?(i.rec?'Confirmar: encerrar a partir de '+esc(MES3[+key.slice(5,7)-1]):'Confirmar exclusão'):(i.rec?'Encerrar':'Excluir'))+'</button></span></li>';
    }).join('')+'</ul>':'<p class="empty">Nenhuma entrada em '+esc(mLong(key))+'.<br><button class="linkbtn" data-act="inc-new">Adicionar entrada</button></p>')+'</section>';
  return out;
}

/* ---------- cartões ---------- */
function cardFormHTML(card){
  var color=card?card.color:COLORS[state.cards.length%COLORS.length];
  return '<section class="panel"><h2 style="margin-bottom:12px">'+(card?'Editar cartão':'Novo cartão')+'</h2>'+
    '<form id="f-card" class="form" data-id="'+(card?esc(card.id):'')+'" novalidate>'+
    '<div class="field"><label for="k-name">Nome do cartão</label><input class="input" id="k-name" name="name" maxlength="30" placeholder="Ex.: Cartão do banco" value="'+(card?esc(card.name):'')+'" autocomplete="off"></div>'+
    '<div class="field"><label for="k-limit">Limite</label><input class="input num" id="k-limit" name="limit" inputmode="decimal" placeholder="0,00" value="'+(card?esc(money2input(card.limit)):'')+'" autocomplete="off"></div>'+
    '<div class="row2"><div class="field"><label for="k-close">Dia de fechamento</label><input class="input num" id="k-close" name="close" inputmode="numeric" maxlength="2" placeholder="Opcional" value="'+(card&&card.closeDay?card.closeDay:'')+'" autocomplete="off"></div>'+
    '<div class="field"><label for="k-due">Dia de vencimento</label><input class="input num" id="k-due" name="due" inputmode="numeric" maxlength="2" placeholder="Opcional" value="'+(card&&card.dueDay?card.dueDay:'')+'" autocomplete="off"></div></div>'+
    '<p class="hint">Com o fechamento, compras feitas depois dele entram na fatura seguinte. Com o vencimento, o app avisa antes de a fatura vencer.</p>'+
    '<fieldset><div class="legend">Cor</div><div class="swatches">'+COLORS.map(function(c,i){return '<label class="swatch"><input type="radio" name="color" value="'+c+'" aria-label="Cor '+(i+1)+'"'+(c===color?' checked':'')+'><span style="background:'+c+'"></span></label>'}).join('')+'</div></fieldset>'+
    '<div id="k-err" class="err" role="alert"></div>'+
    '<div class="dialog-actions"><button class="btn primary" type="submit">Salvar cartão</button><button class="btn" type="button" data-act="card-form-cancel">Cancelar</button></div></form></section>';
}
function cardsHTML(){
  var out='<div class="panel-head" style="margin:0"><h2>Meus cartões</h2>'+(ui.cardForm?'':'<button class="btn sm primary" data-act="card-new">Adicionar cartão</button>')+'</div>';
  if(ui.cardForm==='new')out+=cardFormHTML(null);
  if(!state.cards.length&&!ui.cardForm)out+='<section class="panel"><p class="empty">Nenhum cartão cadastrado.<br>Adicione um para lançar compras parceladas e ver a fatura de cada mês.</p></section>';
  var cm=todayKey();
  state.cards.forEach(function(c){
    var com=committedOf(c),pct=c.limit>0?com/c.limit*100:0;
    var cls=pct>100?'over':pct>=80?'hi':'';
    var fat=invoiceTotal(c,cm),due=dueDateOf(c,cm),paid=isPaid(c.id,cm);
    out+='<button class="cardrow" data-act="open-card" data-id="'+esc(c.id)+'"><span class="plastic" style="background:'+esc(c.color)+'" aria-hidden="true">'+esc(c.name.charAt(0).toUpperCase())+'</span>'+
      '<span style="min-width:0"><span class="nm">'+esc(c.name)+'</span>'+
      '<span class="small muted num" style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><span>Fatura de '+esc(mShort(cm))+': '+fmt(fat)+(paid?' · paga':due?' · vence '+dm(due):'')+'</span><span>Limite '+fmt(c.limit)+'</span></span>'+
      '<span class="limitbar" style="display:block"><i class="'+cls+'" style="width:'+Math.min(pct,100)+'%"></i></span>'+
      '<span class="small muted num" style="display:block;margin-top:4px">'+fmt(com)+' comprometidos ('+Math.floor(pct)+'%)</span></span></button>';
  });
  return out;
}
function chartSVG(keys,totals,sel){
  var slot=46,padL=44,padR=8,padT=24,padB=32,H=210,plotH=H-padT-padB,W=padL+padR+slot*keys.length;
  var max=niceMax(Math.max.apply(null,totals.concat([1])));
  var y=function(v){return padT+plotH-(v/max)*plotH};
  var cm=todayKey(),s='<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" role="group" aria-label="Fatura por mês">';
  [0,max/2,max].forEach(function(v){
    s+='<line class="grid" x1="'+padL+'" x2="'+(W-padR)+'" y1="'+y(v)+'" y2="'+y(v)+'"/><text class="ax" x="'+(padL-6)+'" y="'+(y(v)+3)+'" text-anchor="end">'+(v===0?'0':compact(v))+'</text>';
  });
  keys.forEach(function(k,i){
    var x=padL+i*slot,v=totals[i],bh=(v/max)*plotH,cx=x+slot/2,isSel=k===sel,mo=+k.slice(5,7);
    if(v>0)s+='<rect class="bar-r'+(isSel?' sel':'')+'" x="'+(x+9)+'" y="'+(y(v))+'" width="'+(slot-18)+'" height="'+bh+'" rx="4"/><text class="vl num" x="'+cx+'" y="'+(y(v)-5)+'" text-anchor="middle">'+compact(v)+'</text>';
    s+='<text class="ax'+(k===cm?' cur':'')+'" x="'+cx+'" y="'+(H-17)+'" text-anchor="middle">'+MES3[mo-1]+'</text>';
    if(i===0||mo===1)s+='<text class="ax" x="'+cx+'" y="'+(H-5)+'" text-anchor="middle">'+k.slice(0,4)+'</text>';
    s+='<rect class="hit" data-act="pick-month" data-month="'+k+'" x="'+x+'" y="'+padT+'" width="'+slot+'" height="'+(H-padT-6)+'" tabindex="0" role="button" aria-label="'+esc(mShort(k))+': '+fmt(v)+'"'+(isSel?' aria-pressed="true"':'')+'/>';
  });
  return s+'</svg>';
}
function cardDetailHTML(){
  var card=cardById(ui.cardId);
  if(!card){ui.cardId=null;return cardsHTML()}
  var cm=todayKey(),cch=cardCharges(card),fixedFree=cch.filter(function(c){return !c.p.rec});
  var start=addMonths(cm,-1),end=addMonths(cm,3);
  if(fixedFree.length){
    var mn=fixedFree.reduce(function(a,c){return c.month<a?c.month:a},fixedFree[0].month),mx=fixedFree.reduce(function(a,c){return c.month>a?c.month:a},fixedFree[0].month);
    if(mn<start)start=mn;if(mx>end)end=mx;
  }
  if(monthDiff(start,end)>35)start=addMonths(end,-35);
  var keys=monthsRange(start,end);
  if(!ui.cardMonth||keys.indexOf(ui.cardMonth)<0)ui.cardMonth=keys.indexOf(cm)>=0?cm:keys[0];
  var sel=ui.cardMonth,totals=keys.map(function(k){return spentOf(cch,k)});
  var com=committedOf(card),free=card.limit-com,pct=card.limit>0?com/card.limit*100:0;
  var list=cch.filter(function(c){return c.month===sel}).sort(function(a,b){return a.p.date<b.p.date?1:a.p.date>b.p.date?-1:0});
  var total=totals[keys.indexOf(sel)];
  var delN=state.purchases.filter(function(p){return p.method===card.id}).length+state.recurring.filter(function(r){return r.method===card.id}).length;
  var due=dueDateOf(card,sel),paid=isPaid(card.id,sel);
  var out='<div class="cardhead"><button class="iconbtn" data-act="back-cards" aria-label="Voltar para os cartões">‹</button><span class="plastic" style="background:'+esc(card.color)+'" aria-hidden="true">'+esc(card.name.charAt(0).toUpperCase())+'</span><div style="min-width:0"><h2>'+esc(card.name)+'</h2><div class="small muted">'+
    [card.closeDay?'Fecha dia '+card.closeDay:'Sem dia de fechamento',card.dueDay?'vence dia '+card.dueDay:''].filter(Boolean).join(' · ')+'</div></div></div>';
  if(ui.cardForm===card.id)out+=cardFormHTML(card);
  out+='<section class="panel"><div class="stats" style="margin-top:0">'+
    '<div class="stat"><div class="v num">'+fmt(card.limit)+'</div><div class="k">limite do cartão</div></div>'+
    '<div class="stat"><div class="v num">'+fmt(com)+'</div><div class="k">comprometido ('+Math.floor(pct)+'%)</div></div>'+
    '<div class="stat"><div class="v num'+(free<0?' bad':'')+'">'+fmtSigned(free)+'</div><div class="k">'+(free<0?'acima do limite':'limite livre')+'</div></div></div>'+
    '<div class="limitbar" style="margin-top:12px"><i class="'+(pct>100?'over':pct>=80?'hi':'')+'" style="width:'+Math.min(pct,100)+'%"></i></div>'+
    '<div class="capline"><span class="small muted">Comprometido = faturas em aberto e parcelas futuras. Faturas pagas saem da conta.</span>'+
    '<span style="display:flex;gap:14px"><button class="linkbtn small" data-act="card-edit" data-id="'+esc(card.id)+'">Editar</button><button class="linkbtn small danger-link" data-act="card-del" data-id="'+esc(card.id)+'">'+(ui.confirm==='card:'+card.id?'Confirmar: apagar cartão'+(delN?' e '+plural(delN,'lançamento','lançamentos'):''):'Excluir')+'</button></span></div></section>';
  out+='<section class="panel"><div class="panel-head"><h2>Gastos por mês</h2><span class="small muted">Toque numa barra</span></div><div class="chart-scroll" id="chart-scroll">'+chartSVG(keys,totals,sel)+'</div></section>';
  var i=keys.indexOf(sel);
  out+='<section class="panel"><div class="monthnav" style="margin-bottom:6px"><button class="iconbtn" data-act="cm-prev" aria-label="Mês anterior"'+(i<=0?' disabled':'')+'>‹</button><div style="text-align:center"><h2>'+esc(cap1(mLong(sel)))+'</h2><div class="small muted">Fatura '+(sel<cm?'':'prevista ')+'<b class="num" style="color:var(--ink)">'+fmt(total)+'</b>'+(due?' · vence '+dm(due):'')+'</div></div><button class="iconbtn" data-act="cm-next" aria-label="Próximo mês"'+(i>=keys.length-1?' disabled':'')+'>›</button></div>'+
    (total?'<div class="invstate'+(paid?' paid':'')+'"><span>'+(paid?'Fatura paga':'Fatura em aberto')+'</span><button class="btn sm'+(paid?'':' primary')+'" data-act="'+(paid?'unpay':'pay')+'" data-id="'+esc(invKey(card.id,sel))+'">'+(paid?'Desfazer':'Marcar como paga')+'</button></div>':'')+
    (list.length?'<ul class="list">'+list.map(function(c){return chargeRow(c,false)}).join('')+'</ul>':'<p class="empty">Nenhum gasto neste cartão em '+esc(mLong(sel))+'.</p>')+'</section>';
  return out;
}

/* ---------- mais ---------- */
function recFormHTML(){
  var r=ui.recForm&&ui.recForm!=='new'?state.recurring.find(function(x){return x.id===ui.recForm}):null;
  return '<form id="f-rec" class="form" data-id="'+(r?esc(r.id):'')+'" novalidate style="margin-top:4px">'+
    '<div class="row2"><div class="field"><label for="r-val">Valor por mês</label><input class="input num" id="r-val" name="val" inputmode="decimal" placeholder="0,00" value="'+esc(r?money2input(r.total):'')+'" autocomplete="off"></div>'+
    '<div class="field"><label for="r-day">Dia do mês</label><input class="input num" id="r-day" name="day" inputmode="numeric" maxlength="2" placeholder="1 a 31" value="'+(r?r.day:'')+'" autocomplete="off"></div></div>'+
    '<div class="field"><label for="r-desc">O que é?</label><input class="input" id="r-desc" name="desc" maxlength="60" placeholder="Ex.: Aluguel, internet, academia" value="'+esc(r?r.desc:'')+'" autocomplete="off"></div>'+
    '<div class="row2"><div class="field"><label for="r-cat">Categoria</label><select class="input" id="r-cat" name="cat">'+catOptions(CATS,r?r.cat:'Casa')+'</select></div>'+
    '<div class="field"><label for="r-method">Pagamento</label><select class="input" id="r-method" name="method">'+methodOptions(r?r.method:'cash')+'</select></div></div>'+
    '<fieldset><div class="legend">Necessidade ou desejo?</div>'+chipsHTML('kind',[['need','Necessidade'],['want','Desejo']],r?r.kind:'need')+'</fieldset>'+
    '<p class="hint">'+(r?'A mudança vale para todos os meses, inclusive os anteriores.':'Começa a contar em '+esc(mLong(todayKey()))+' e se repete todo mês até você encerrar.')+'</p>'+
    '<div id="r-err" class="err" role="alert"></div>'+
    '<div class="dialog-actions"><button class="btn primary" type="submit">Salvar gasto fixo</button><button class="btn" type="button" data-act="rec-cancel">Cancelar</button></div></form>';
}
function moreHTML(){
  var cm=todayKey(),out='';
  /* gastos fixos */
  var active=state.recurring.filter(function(r){return !r.end||r.end>=cm}),ended=state.recurring.length-active.length;
  var totalFixed=sum(active,function(r){return r.total});
  out+='<section class="panel" id="sec-rec"><div class="panel-head"><h2>Gastos fixos</h2>'+(ui.recForm?'':'<button class="btn sm primary" data-act="rec-new">Adicionar</button>')+'</div>'+
    (ui.recForm==='new'?recFormHTML():'')+
    (active.length?'<ul class="list">'+active.map(function(r){
      if(ui.recForm===r.id)return '<li class="item" style="display:block">'+recFormHTML()+'</li>';
      var ck='rec:'+r.id,del=ui.confirm===ck,card=r.method==='cash'?null:cardById(r.method);
      return '<li class="item"><span class="t">'+esc(r.desc)+kindPill(r.kind)+'</span><span class="val num">'+fmt(r.total)+'</span>'+
        '<span class="m">'+esc(['Dia '+r.day,r.cat,card?card.name:'À vista'].join(' · '))+'</span><span class="acts">'+
        (del?'':'<button class="linkbtn small" data-act="rec-edit" data-id="'+esc(r.id)+'">Editar</button>')+
        '<button class="linkbtn small danger-link" data-act="rec-end" data-id="'+esc(r.id)+'">'+(del?'Confirmar: último mês '+esc(MES3[+cm.slice(5,7)-1]):'Encerrar')+'</button></span></li>';
    }).join('')+'</ul><p class="small muted" style="margin-top:10px">Total por mês: <b class="num" style="color:var(--ink)">'+fmt(totalFixed)+'</b>'+(ended?' · '+plural(ended,'encerrado','encerrados'):'')+'</p>':
      (ui.recForm==='new'?'':'<p class="hint">Aluguel, internet, assinaturas e outras contas que se repetem entram sozinhos todo mês e já aparecem no teto.</p>'))+
    '</section>';
  /* lista de espera */
  var w=waiting(),saved=savedByGivingUp(),gaveN=state.wishes.filter(function(x){return x.status==='gave'}).length;
  out+='<section class="panel"><div class="panel-head"><h2>Lista de espera</h2><span class="small muted">24 horas</span></div>'+
    (saved?'<div class="saved"><div class="eyebrow">Você deixou de gastar</div><div class="big num pos" style="font-size:26px">'+fmt(saved)+'</div><div class="small muted">desistindo de '+plural(gaveN,'compra','compras')+' depois de esperar.</div></div>':'')+
    (w.length?'<ul class="list">'+w.map(function(x){
      var ready=Date.now()-x.created>=WAIT_MS;
      return '<li class="item"><span class="t">'+esc(x.desc)+'</span><span class="val num">'+fmt(x.total)+'</span><span class="m">'+esc(timeLeft(x))+'</span>'+
        '<span class="acts"><button class="linkbtn small danger-link" data-act="wish-gave" data-id="'+esc(x.id)+'">Desisti</button>'+(ready?'<button class="linkbtn small" data-act="wish-buy" data-id="'+esc(x.id)+'">Lançar</button>':'')+'</span></li>';
    }).join('')+'</ul>':'<p class="hint">Na tela Lançar, toque em "Ainda não comprei: esperar 24 horas". O app pergunta no dia seguinte se você ainda quer. Muita compra por impulso some nesse intervalo.</p>')+
    '</section>';
  /* lembretes */
  var native=isNative(),on=!!state.prefs.remind;
  out+='<section class="panel"><div class="panel-head"><h2>Lembretes</h2><span class="small muted">'+(on?'ativados':'desativados')+'</span></div>'+
    '<p class="hint">Domingo às 19h para conferir os gastos da semana, 2 dias antes de cada fatura vencer e quando um item da lista de espera completar 24 horas.</p>'+
    (native?'<div class="dialog-actions" style="margin-top:10px">'+(on?'<button class="btn" data-act="remind-off">Desativar lembretes</button>':'<button class="btn primary" data-act="remind-on">Ativar lembretes</button>')+'</div>':
      '<p class="small muted" style="margin-top:8px">Disponível só no app instalado no celular.</p>')+
    (state.example&&on?'<p class="small muted" style="margin-top:8px">Os lembretes começam quando você sair dos dados de exemplo.</p>':'')+'</section>';
  /* backup */
  var lb=state.prefs.lastBackup;
  out+='<section class="panel"><div class="panel-head"><h2>Backup dos dados</h2></div>'+
    '<p class="hint">Os dados ficam só neste aparelho. Se o app for desinstalado ou os dados forem limpos, tudo se perde. Guarde o backup no Drive, no e-mail ou no WhatsApp.</p>'+
    '<p class="small" style="margin-top:8px">'+(lb?'Último backup: <b>'+esc(new Date(lb).toLocaleDateString('pt-BR'))+'</b>':'<b class="bad">Nenhum backup feito ainda.</b>')+'</p>'+
    '<div class="stack" style="margin-top:12px"><button class="btn primary block" data-act="backup">Fazer backup (arquivo .json)</button>'+
    '<button class="btn block" data-act="import">Restaurar backup</button>'+
    '<button class="btn block" data-act="csv">Exportar planilha (.csv)</button></div></section>';
  out+='<p class="small muted" style="text-align:center">Meu Bolso'+(window.APP_VERSION?' · versão '+esc(window.APP_VERSION):'')+'</p>';
  return out;
}

/* ---------- render ---------- */
function render(){
  cache=null;
  document.querySelectorAll('.tab').forEach(function(t){t.setAttribute('aria-current',t.dataset.tab===ui.tab?'page':'false')});
  var v=$('#view'),t=ui.tab;
  v.innerHTML=t==='home'?homeHTML():t==='add'?addHTML():t==='income'?incomeHTML():t==='more'?moreHTML():(ui.cardId?cardDetailHTML():cardsHTML());
  if(t==='add')updateAddPreview();
  if(t==='cards'&&ui.cardId){
    var sc=$('#chart-scroll'),r=sc&&sc.querySelector('rect.bar-r.sel');
    if(sc&&r){sc.scrollLeft=Math.max(0,r.getBBox().x-sc.clientWidth/2+30)}
  }
  setStatus(store.msg,store.err);
}
function go(tab,keepDraft){
  if(ui.tab==='add'&&tab!=='add'&&!keepDraft&&(draft.editId||draft.wishId))draft=blankDraft();
  ui.tab=tab;ui.confirm=null;ui.recForm=null;ui.incForm=null;
  if(tab!=='cards'){ui.cardId=null;ui.cardForm=null}
  window.scrollTo(0,0);render();
  if(tab==='add'&&!draft.val){var el=$('#a-val');if(el)el.focus()}
}

/* ---------- ações ---------- */
function armConfirm(id){
  ui.confirm=id;render();
  clearTimeout(armConfirm.t);armConfirm.t=setTimeout(function(){if(ui.confirm===id){ui.confirm=null;render()}},4000);
}
function focusSoon(sel){setTimeout(function(){var el=$(sel);if(el){el.focus();el.scrollIntoView({block:'center'})}},0)}
document.addEventListener('click',function(e){
  var el=e.target.closest('[data-act]');if(!el)return;
  var act=el.dataset.act,id=el.dataset.id;
  if(act.indexOf('date-')===0){dateFieldAct(act,el);return}
  switch(act){
    case 'tab':go(el.dataset.tab);break;
    case 'goto-add':go('add');break;
    case 'home-prev':ui.homeMonth=addMonths(ui.homeMonth,-1);ui.confirm=null;render();break;
    case 'home-next':ui.homeMonth=addMonths(ui.homeMonth,1);ui.confirm=null;render();break;
    case 'home-today':ui.homeMonth=todayKey();render();break;
    case 'cap-edit':ui.capEdit=true;render();focusSoon('#c-cap');break;
    case 'cap-cancel':ui.capEdit=false;render();break;
    case 'clear-example':
      var keep=state.prefs;state=blankState();state.prefs={remind:keep.remind};ui.capEdit=false;persist();render();toast('Pronto. Defina seu teto para começar.');break;
    case 'edit':startEdit(id);break;
    case 'add-cancel':draft=blankDraft();go('home');break;
    case 'add-wish':addWish();break;
    case 'del':
      if(ui.confirm!==id){armConfirm(id);break}
      state.purchases=state.purchases.filter(function(p){return p.id!==id});ui.confirm=null;persist();render();toast('Lançamento excluído');break;
    case 'dlg-ok':closeDialog();break;
    case 'confirm-ok':var fn=pendingConfirm;closeDialog();if(fn)fn();break;
    case 'dlg-undo':
      state.purchases=state.purchases.filter(function(p){return p.id!==id});persist();closeDialog();render();toast('Lançamento desfeito');break;
    case 'pay':state.paid[id]=Date.now();persist();render();toast('Fatura marcada como paga');break;
    case 'unpay':delete state.paid[id];persist();render();break;
    case 'wish-gave':
      var wg=state.wishes.find(function(x){return x.id===id});
      if(wg){wg.status='gave';wg.decided=Date.now();persist();render();toast('Boa! '+fmt(wg.total)+' que ficam no bolso.')}break;
    case 'wish-buy':
      var wb=state.wishes.find(function(x){return x.id===id});
      if(wb){var mOk=wb.method==='cash'||cardById(wb.method);draft={desc:wb.desc,val:money2input(wb.total),date:todayStr(),cat:wb.cat||'Outros',method:mOk?wb.method:'cash',n:wb.n||1,kind:wb.kind||'want',perInst:false,editId:null,wishId:wb.id};go('add',true)}break;
    case 'inc-new':ui.incForm='new';render();focusSoon('#i-val');break;
    case 'inc-cancel':ui.incForm=null;render();break;
    case 'inc-edit':ui.incForm={id:id,rec:el.dataset.rec==='1'};window.scrollTo(0,0);render();focusSoon('#i-val');break;
    case 'inc-del':
      var rec=el.dataset.rec==='1',ck=(rec?'ri:':'i:')+id;
      if(ui.confirm!==ck){armConfirm(ck);break}
      if(rec){
        var ri=state.recIncomes.find(function(r){return r.id===id}),endM=addMonths(ui.homeMonth,-1);
        if(ri){if(endM<ri.start)state.recIncomes=state.recIncomes.filter(function(r){return r.id!==id});else ri.end=endM}
        toast('Entrada fixa encerrada');
      }else{state.incomes=state.incomes.filter(function(i){return i.id!==id});toast('Entrada excluída')}
      ui.confirm=null;persist();render();break;
    case 'use-suggested':state.cap=+el.dataset.v;persist();render();toast('Teto atualizado para '+fmt(state.cap));break;
    case 'card-new':ui.cardForm='new';render();focusSoon('#k-name');break;
    case 'card-form-cancel':ui.cardForm=null;render();break;
    case 'open-card':ui.cardId=id;ui.cardMonth=null;ui.cardForm=null;ui.confirm=null;window.scrollTo(0,0);render();break;
    case 'back-cards':ui.cardId=null;ui.cardForm=null;ui.confirm=null;render();break;
    case 'card-edit':ui.cardForm=id;render();break;
    case 'card-del':
      if(ui.confirm!=='card:'+id){armConfirm('card:'+id);break}
      state.cards=state.cards.filter(function(c){return c.id!==id});
      state.purchases=state.purchases.filter(function(p){return p.method!==id});
      state.recurring=state.recurring.filter(function(r){return r.method!==id});
      Object.keys(state.paid).forEach(function(k){if(k.indexOf(id+'|')===0)delete state.paid[k]});
      ui.confirm=null;ui.cardId=null;persist();render();toast('Cartão excluído');break;
    case 'pick-month':ui.cardMonth=el.dataset.month;render();break;
    case 'cm-prev':ui.cardMonth=addMonths(ui.cardMonth,-1);render();break;
    case 'cm-next':ui.cardMonth=addMonths(ui.cardMonth,1);render();break;
    case 'rec-new':ui.recForm='new';render();focusSoon('#r-val');break;
    case 'rec-edit':ui.recForm=id;render();focusSoon('#r-val');break;
    case 'rec-manage':go('more');ui.recForm=id;render();focusSoon('#r-val');break;
    case 'rec-cancel':ui.recForm=null;render();break;
    case 'rec-end':
      if(ui.confirm!=='rec:'+id){armConfirm('rec:'+id);break}
      var rr=state.recurring.find(function(r){return r.id===id});
      if(rr)rr.end=todayKey();
      ui.confirm=null;persist();render();toast('Gasto fixo encerrado. Ele não entra mais a partir do mês que vem.');break;
    case 'remind-on':enableReminders();break;
    case 'remind-off':state.prefs.remind=false;persist();render();toast('Lembretes desativados');break;
    case 'backup':exportBackup();break;
    case 'csv':exportCSV();break;
    case 'import':var fi=$('#imp-file');fi.value='';fi.click();break;
  }
});
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'&&!$('#overlay').hidden){closeDialog();return}
  if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('.hit')){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}))}
});
document.addEventListener('input',function(e){if(e.target.closest&&e.target.closest('#f-add')){readAdd();updateAddPreview()}});
document.addEventListener('change',function(e){
  if(e.target.id==='imp-file'){if(e.target.files&&e.target.files[0])importFile(e.target.files[0]);return}
  if(e.target.closest&&e.target.closest('#f-add')){readAdd();updateAddPreview()}
});
function parseDay(v,errEl,label){
  v=String(v||'').trim();if(!v)return null;
  var d=parseInt(v,10);if(!(d>=1&&d<=31)){errEl.textContent='O dia de '+label+' vai de 1 a 31.';return false}
  return d;
}
document.addEventListener('submit',function(e){
  e.preventDefault();
  var f=e.target,err;
  if(f.id==='f-add'){submitAdd();return}
  if(f.id==='f-cap'){
    var v=parseMoney(f.elements.cap.value);
    if(!(v>0)){$('#cap-err').textContent='Informe um valor maior que zero, por exemplo 3.500,00.';return}
    state.cap=v;ui.capEdit=false;persist();render();toast('Teto salvo');return;
  }
  if(f.id==='f-goal'){
    var g=f.elements.goal.value.trim()?parseMoney(f.elements.goal.value):0;
    if(isNaN(g)){toast('Valor inválido. Use, por exemplo, 500,00.');return}
    state.savingsGoal=g;persist();render();toast('Meta salva');return;
  }
  if(f.id==='f-inc'){
    err=$('#i-err');
    var val=parseMoney(f.elements.val.value),desc=f.elements.desc.value.trim(),date=f.elements.date.value;
    var cat=(f.querySelector('input[name=cat]:checked')||{}).value||'Outros';
    if(!(val>0)){err.textContent='Informe o valor recebido, por exemplo 2.500,00.';return}
    if(!desc)desc=cat;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){err.textContent='Escolha a data.';return}
    var fo=ui.incForm;
    if(fo&&fo!=='new'){
      if(fo.rec){var r=state.recIncomes.find(function(x){return x.id===fo.id});if(r){r.total=val;r.desc=desc;r.cat=cat;r.day=+date.slice(8,10)}}
      else{var it=state.incomes.find(function(x){return x.id===fo.id});if(it){it.total=val;it.desc=desc;it.cat=cat;it.date=date}}
    }else if(f.elements.rec&&f.elements.rec.checked){
      state.recIncomes.push({id:uid(),desc:desc,total:val,cat:cat,day:+date.slice(8,10),start:date.slice(0,7)});
    }else{
      state.incomes.push({id:uid(),desc:desc,total:val,cat:cat,date:date});
    }
    ui.incForm=null;if(!(fo&&fo.rec)&&!(f.elements.rec&&f.elements.rec.checked))ui.homeMonth=date.slice(0,7);
    persist();render();toast('Entrada salva');return;
  }
  if(f.id==='f-rec'){
    err=$('#r-err');
    var rv=parseMoney(f.elements.val.value),rd=parseDay(f.elements.day.value,err,'cobrança'),rdesc=f.elements.desc.value.trim();
    if(!(rv>0)){err.textContent='Informe o valor por mês.';return}
    if(rd===false)return;
    if(rd===null){err.textContent='Informe o dia do mês em que a conta cai.';return}
    if(!rdesc){err.textContent='Escreva o que é esse gasto.';return}
    var kind=(f.querySelector('input[name=kind]:checked')||{}).value||'';
    var data={desc:rdesc,total:rv,day:rd,cat:f.elements.cat.value,method:f.elements.method.value,kind:kind||undefined};
    var rid=f.dataset.id;
    if(rid){var rec2=state.recurring.find(function(x){return x.id===rid});if(rec2)Object.assign(rec2,data)}
    else state.recurring.push(Object.assign({id:uid(),start:todayKey()},data));
    ui.recForm=null;persist();render();toast('Gasto fixo salvo');return;
  }
  if(f.id==='f-card'){
    var name=f.elements.name.value.trim(),lim=parseMoney(f.elements.limit.value);
    err=$('#k-err');
    if(!name){err.textContent='Dê um nome ao cartão.';return}
    if(!(lim>0)){err.textContent='Informe o limite do cartão, por exemplo 2.500,00.';return}
    var day=parseDay(f.elements.close.value,err,'fechamento');if(day===false)return;
    var due=parseDay(f.elements.due.value,err,'vencimento');if(due===false)return;
    var color=(f.querySelector('input[name=color]:checked')||{}).value||COLORS[0],cid=f.dataset.id;
    if(cid){var c=cardById(cid);if(c){c.name=name;c.limit=lim;c.closeDay=day;c.dueDay=due;c.color=color}}
    else{state.cards.push({id:uid(),name:name,limit:lim,closeDay:day,dueDay:due,color:color})}
    ui.cardForm=null;persist();render();toast('Cartão salvo');
  }
});
/* volta do segundo plano: atualiza contagens (24h, vencimentos) */
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'&&$('#overlay').hidden&&ui.tab!=='add')render()});

render();
initStore();
scheduleNotifications();
