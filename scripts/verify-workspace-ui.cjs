// Optional browser acceptance suite. Uses isolated synthetic data only.
// npm run build, then MUNIN_PLAYWRIGHT_MODULE=/path/to/playwright node scripts/verify-career-command.cjs
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {mkdtemp,writeFile,mkdir,rm}=require('node:fs/promises');
const {tmpdir}=require('node:os');
const path=require('node:path');
const {chromium}=require(process.env.MUNIN_PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'munin-career-browser-'));
 const now=new Date().toISOString(),ago=days=>new Date(Date.now()-days*86400000).toISOString();
 const jobs=[{id:'demo-interview',company:'Atlas Payments',role:'Senior Product Manager · Payments',status:'interview',fitScore:92,matchedSignals:['payments','product'],nextAction:'Preparar dois casos de integração bancária.',followUpAt:ago(1)}, {id:'demo-applied',company:'North Fintech',role:'Implementation Manager',status:'applied',fitScore:86,matchedSignals:['payments'],nextAction:'Acompanhar o retorno.'}, {id:'demo-review',company:'Orbit Bank',role:'Head of Digital Assets',status:'investigating',fitScore:90,matchedSignals:['digital assets'],nextAction:'Validar escopo e contratação.'}, {id:'demo-offer',company:'Example Bank',role:'Product Lead',status:'offer',fitScore:87,matchedSignals:['product'],nextAction:'Revisar a proposta.'}].map(j=>({...j,createdAt:ago(10),updatedAt:ago(2)}));
 const messages=[['new1','Nova Finance','Senior Product Manager · Open Finance','payments open finance open banking fintech product strategy'], ['new2','Meridian','Payments Implementation Lead','payments product fintech strategy leadership financial infrastructure'], ['new3','Vector Labs','Digital Assets Strategy Manager','digital assets stablecoin blockchain product strategy fintech'], ['new4','Wayfinder','Financial Infrastructure Manager','payments fintech product strategy leadership'], ['new5','Old Bank','Junior Analyst','junior']].map(([id,company,role,snippet])=>({id,provider:'gmail',providerMessageId:id,subject:role+' na empresa '+company,detectedCompany:company,detectedRole:role,snippet:snippet+' Apply https://example.com/jobs/'+id,receivedAt:ago(1),category:'job_alert',confidence:.95,handled:true}));
 messages.push({id:'unreadable-digest',provider:'gmail',providerMessageId:'unreadable-digest',subject:'New jobs',snippet:'Job alert',receivedAt:now,category:'job_alert',confidence:.95,handled:true,alertExtraction:{count:0,incomplete:true}});
 await writeFile(path.join(root,'state.json'),JSON.stringify({jobs,projects:[],actions:[],decisions:[],research:[],goals:[],relations:[]}));
 await writeFile(path.join(root,'career-inbox.json'),JSON.stringify({messages,syncedAt:now}));
 await mkdir('.artifacts',{recursive:true});
 const env={...process.env,MUNIN_DATA_DIR:root,MUNIN_API_PORT:'4321',MUNIN_MOBILE_TOKEN:'munin-synthetic-walkthrough-token'};
 const apiServer=spawn(process.execPath,['dist/src/server.js'],{env,stdio:['ignore','ignore','inherit']});
 const webServer=spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','apps/web/vite.config.ts','--host','127.0.0.1','--port','5181','--strictPort'],{env,stdio:['ignore','ignore','inherit']});
 let browser;
 try{
  let ready=false;
  for(let i=0;i<100;i++){try{await fetch('http://127.0.0.1:5181/career-command.html',{signal:AbortSignal.timeout(1000)});await fetch('http://127.0.0.1:4321/api/career-intelligence/workspace',{signal:AbortSignal.timeout(1000)});ready=true;break;}catch{await new Promise(r=>setTimeout(r,100));}}
  if(!ready)throw new Error('Local test servers did not start; check ports 4321 and 5181.');
  for(const [endpoint,payload] of [['projects',{name:'Demo · Novo posicionamento profissional',priority:'P1'}],['actions',{title:'Demo · Revisar portfólio para entrevista',priority:'P1'}],['research',{question:'Demo · Quais tendências de Open Finance priorizar?'}]]){const response=await fetch(`http://127.0.0.1:4321/api/${endpoint}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});assert.equal(response.status,201);}
  browser=await chromium.launch({...(process.env.MUNIN_CHROMIUM_EXECUTABLE?{executablePath:process.env.MUNIN_CHROMIUM_EXECUTABLE}:{}),headless:true});

  const record=process.env.MUNIN_RECORD_VIDEO==='1';
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:1000},...(record?{recordVideo:{dir:'.artifacts/workspace-recording',size:{width:1440,height:1000}}}:{})});
  await context.addInitScript(()=>localStorage.setItem('munin-mobile-token','munin-synthetic-walkthrough-token'));
  const page=await context.newPage();page.setDefaultTimeout(8000);const errors=[];page.on('pageerror',e=>errors.push({url:page.url(),message:e.message}));
  const routes=['hud','index','operator-hub','action-inbox','radar','manus','flows','operator-chat','portfolio','executive-briefing','intelligence','council','career-command','career-inbox','career-intake','email-intelligence','context-memory','content-studio','viral-engine','linkedin','linkedin-brand','linkedin-compose','linkedin-assets','linkedin-history','linkedin-publisher','settings','image-settings','mobile','hud-mobile'];
  const scenes=[];
  async function label(title){
   await page.addStyleTag({content:'.hud-body .hud-command{bottom:84px}.hud-body .hud-activity{bottom:170px}'});
   await page.evaluate(title=>{
    document.querySelector('.walkthrough-caption')?.remove();
    const el=document.createElement('div');el.className='walkthrough-caption';el.setAttribute('popover','manual');
    el.style.cssText='position:fixed;inset:auto 0 0;margin:0;width:auto;border:0;border-top:2px solid #3B82F6;background:#0D1117;color:#F2F6FA;padding:18px 28px;font:20px system-ui;pointer-events:none;display:flex;justify-content:space-between;gap:24px';
    const strong=document.createElement('strong');strong.textContent=title;el.append(strong);
    const small=document.createElement('small');small.textContent='DEMONSTRAÇÃO LOCAL · DADOS FICTÍCIOS';small.style.cssText='font-size:12px;color:#A8B3C1;align-self:center';el.append(small);document.body.append(el);el.showPopover();
   },title);
  }
  for(const [i,route] of routes.entries()){
   await page.setViewportSize({width:1440,height:1000});
   console.log('Opening',route);const response=await page.goto(`http://127.0.0.1:5181/${route}.html`);assert.equal(response.status(),200,route);
   await page.waitForTimeout(route.startsWith('hud')?3500:1200);
   if(route.startsWith('hud'))await page.waitForFunction(()=>!document.getElementById('hud-headline').textContent.includes('Carregando'));
   console.log('Loaded',route);await page.locator('body.munin-workspace').waitFor({state:'attached'});
   if(route==='mobile'){const enter=page.getByRole('button',{name:'Entrar no Munin',exact:true});if(await enter.count()){await enter.click();await page.waitForTimeout(750);}}
   const title=(await page.locator('h1').count()?await page.locator('h1').first().textContent():null)||await page.title();
   await label(`${String(i+1).padStart(2,'0')} / ${routes.length} · ${title}`);
   await page.screenshot({path:`.artifacts/workspace-${route}.png`});
   if(record)await page.waitForTimeout(1800);
   // Exercise real local controls, without submitting external jobs or publishing content.
   if(record&&route==='hud'){
    await page.locator('#hud-command-input').fill('prioridades');
    await page.locator('#hud-command-form').evaluate(form=>form.requestSubmit());
    await page.waitForTimeout(1500);await label('HUD · consulta de prioridades no runtime local');await page.waitForTimeout(1800);
   }
   if(record&&route==='operator-chat'){await page.getByRole('button',{name:'SITREP',exact:true}).click();await page.waitForTimeout(1500);await label('Chat operacional · resumo gerado pelo Munin local');await page.waitForTimeout(1800);}
   if(route==='index'){
    for(const name of ['Projetos','Pesquisa','Sistema']){
     await page.locator('aside.sidebar').getByRole('button',{name,exact:true}).click();await label(`Command Center · ${name}`);await page.waitForTimeout(record?1500:150);
    }
    await page.locator('aside.sidebar').getByRole('button',{name:'Hoje',exact:true}).click();
   }
   if(route==='career-command'){
    await page.getByRole('button',{name:/Meu pipeline/}).click();await page.getByRole('button',{name:/Atlas Payments/}).click();await page.getByRole('dialog').waitFor();
    await label('Carreira · editar próxima ação e salvar no runtime local');
    await page.locator('textarea[name=nextAction]').fill('Preparar apresentação de pagamentos para a entrevista.');
    if(record)await page.waitForTimeout(1700);
    await page.getByRole('button',{name:'Salvar próximo passo'}).click();
    const stored=await (await fetch('http://127.0.0.1:4321/api/workspace')).json();
    assert.equal(stored.state.jobs.find(j=>j.id==='demo-interview').nextAction,'Preparar apresentação de pagamentos para a entrevista.');
    await page.keyboard.press('Escape');
    if(record)await page.waitForTimeout(1600);
   }
   if(route==='mobile'){
    for(const name of ['Memória','Execuções','Objetivos','Ajustes']){
     const button=page.getByRole('navigation',{name:'Navegação principal',exact:true}).getByRole('button',{name,exact:true});
     if(await button.count()){await button.click();await label(`Mobile · ${name}`);await page.waitForTimeout(record?1200:150);}
    }
   }
   if(!route.startsWith('hud')&&route!=='index'&&route!=='mobile'){
    const launcher=page.getByRole('button',{name:'Abrir ações rápidas e comandos'});
    await launcher.click();const palette=page.locator('dialog.munin-command-overlay');await palette.waitFor({state:'visible'});
    await palette.locator('input').fill('HUD');assert.equal(await palette.getByRole('link').count(),2);
    await page.keyboard.press('Escape');assert.equal(await palette.isVisible(),false);
   }
   if(record&&!route.startsWith('hud')){await page.evaluate(()=>scrollTo({top:500,behavior:'smooth'}));await page.waitForTimeout(1000);await page.evaluate(()=>scrollTo({top:0,behavior:'smooth'}));await page.waitForTimeout(500);}
   await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);
   const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
   assert.ok(dimensions.scroll<=dimensions.width+1,`${route}: horizontal overflow on mobile`);
   scenes.push({route,title,mobileOverflow:dimensions.scroll-dimensions.width});
   await writeFile('.artifacts/workspace-validation.json',JSON.stringify({scenes,errors},null,2));
   if(record&&['hud','career-command','mobile','hud-mobile'].includes(route)){await label(`${title} · tela compacta`);await page.waitForTimeout(1500);}
  }
  await page.setViewportSize({width:1440,height:1000});await page.goto('http://127.0.0.1:5181/settings.html');await page.getByRole('button',{name:'Animações ativas',exact:true}).click();
  assert.equal(await page.locator('html').getAttribute('data-workspace-motion'),'off');await page.reload();
  assert.equal(await page.locator('html').getAttribute('data-workspace-motion'),'off');
  await page.goto('http://127.0.0.1:5181/index.html');await page.locator('body.munin-workspace').waitFor({state:'attached'});
  await page.waitForFunction(()=>document.documentElement.dataset.reduceMotion==='on');
  assert.equal(await page.locator('html').getAttribute('data-workspace-motion'),'off');
  await page.locator('aside.sidebar button[data-section=Career]').click();await page.waitForURL('**/career-command.html');
  const reduced=await browser.newContext({reducedMotion:'reduce'});const reducedPage=await reduced.newPage();
  await reducedPage.goto('http://127.0.0.1:5181/radar.html');await reducedPage.locator('body.munin-workspace').waitFor();
  assert.equal(await reducedPage.locator('html').getAttribute('data-workspace-motion'),'off');await reduced.close();
  await writeFile('.artifacts/workspace-validation.json',JSON.stringify({scenes,errors},null,2));
  const video=record?page.video():null;await context.close();if(video)console.log('VIDEO',await video.path());
  console.log(JSON.stringify({scenes,errors},null,2));assert.deepEqual(errors,[],'Uncaught browser errors');
 }finally{if(browser)await browser.close();apiServer.kill();webServer.kill();await rm(root,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exit(1)});
