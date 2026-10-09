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
 const env={...process.env,MUNIN_DATA_DIR:root,MUNIN_API_PORT:'4317'};
 const apiServer=spawn(process.execPath,['dist/src/server.js'],{env,stdio:'ignore'});
 const webServer=spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','apps/web/vite.config.ts','--host','127.0.0.1','--port','5177','--strictPort'],{env,stdio:'ignore'});
 let browser;
 try{
  let ready=false;
  for(let i=0;i<100;i++){try{await fetch('http://127.0.0.1:5177/career-command.html');await fetch('http://127.0.0.1:4317/api/career-intelligence/workspace');ready=true;break;}catch{await new Promise(r=>setTimeout(r,100));}}
  if(!ready)throw new Error('Local test servers did not start; check ports 4317 and 5177.');
  browser=await chromium.launch({...(process.env.MUNIN_CHROMIUM_EXECUTABLE?{executablePath:process.env.MUNIN_CHROMIUM_EXECUTABLE}:{}),headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1100}});const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto('http://127.0.0.1:5177/career-command.html');await page.getByRole('heading',{name:'Vale olhar de perto'}).waitFor();
  assert.equal(await page.locator('.career-card').count(),4);
  assert.match(await page.locator('.career-source-health').innerText(),/6 alertas precisam de revisão/);
  assert.equal(await page.locator('.career-field').isVisible(),true);
  assert.equal(await page.locator('.career-fit-value').count(),4);
  await page.screenshot({path:'.artifacts/career-desktop.png',fullPage:true,animations:'disabled'});
  await page.getByRole('button',{name:'Pausar animações'}).click();
  assert.equal(await page.locator('.career-shell').getAttribute('data-motion'),'off');
  assert.equal(await page.locator('.career-field-ribbon').evaluate(node=>getComputedStyle(node).animationName),'none');
  await page.reload();await page.getByRole('heading',{name:'Vale olhar de perto'}).waitFor();
  assert.equal(await page.locator('.career-shell').getAttribute('data-motion'),'off','Motion choice must survive reload');
  await page.getByRole('button',{name:'Ativar animações'}).click();

  await page.getByRole('searchbox').fill('Nova');assert.equal(await page.locator('.career-card').count(),1);
  await page.getByRole('button',{name:'Ver análise'}).click();await page.getByRole('dialog').waitFor();
  assert.equal(await page.getByRole('link',{name:'Abrir vaga e verificar disponibilidade'}).getAttribute('href'),'https://example.com/jobs/new1');
  await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
  await page.getByRole('searchbox').fill('');
  await page.getByRole('button',{name:/Meu pipeline/}).click();assert.equal(await page.locator('.career-process-row').count(),3);
  await page.getByRole('button',{name:/Atlas Payments/}).click();await page.getByRole('dialog').waitFor();
  await page.locator('select[name=status]').selectOption('applied');await page.locator('textarea[name=nextAction]').fill('Preparar o caso de implantação bancária.');
  await page.getByRole('button',{name:'Salvar próximo passo'}).click();await page.getByRole('status').filter({hasText:'Etapa e próximo passo salvos'}).waitFor();
  await page.getByRole('button',{name:'Preparar candidatura / entrevista'}).click();await page.getByRole('heading',{name:'Candidatura com evidências'}).waitFor();
  assert.match(await page.locator('.career-packet').innerText(),/Envio automático desativado/);
  await page.screenshot({path:'.artifacts/career-details.png',fullPage:true,animations:'disabled'});await page.keyboard.press('Escape');
  await page.getByRole('button',{name:/Propostas recebidas/}).click();assert.equal(await page.locator('.career-process-row').count(),1);
  const due=Number(await page.getByRole('button',{name:/Follow-ups pendentes/}).locator('strong').innerText());await page.getByRole('button',{name:/Follow-ups pendentes/}).click();assert.equal(await page.locator('.career-process-row').count(),due);
  await page.getByRole('button',{name:/Oportunidades/}).click();
  // Failure of an optional remote integration must not erase the local pipeline.
  await page.route('**/api/career-intelligence/calendar',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Calendar unavailable in test'})}));
  await page.route('**/api/career-inbox/sync',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({added:3,totalFetched:1,alertHealth:{vacancies:2}})}));
  await page.getByRole('button',{name:'Sincronizar emails'}).click();await page.getByRole('alert').filter({hasText:'Agenda indisponível'}).waitFor();assert.equal(await page.locator('.career-card').count(),4);
  await page.getByRole('status').filter({hasText:'Emails consultados: 1; registros novos: 3; vagas extraídas: 2.'}).waitFor();
  await page.getByRole('searchbox').fill('missing-role');await page.getByRole('heading',{name:'Nenhuma vaga com esses filtros'}).waitFor();
  await page.getByRole('button',{name:'Limpar filtros'}).click();assert.equal(await page.locator('.career-card').count(),5);
  await page.getByRole('searchbox').fill('Nova');await page.getByRole('button',{name:'Ver análise'}).click();
  await page.getByRole('button',{name:'Adicionar ao pipeline'}).click();await page.getByRole('heading',{name:'Seu próximo passo'}).waitFor();assert.equal(await page.locator('select[name=status]').inputValue(),'discovered');await page.keyboard.press('Escape');
  await page.reload();await page.getByRole('heading',{name:'Vale olhar de perto'}).waitFor();
  await page.getByRole('button',{name:/Meu pipeline/}).click();assert.equal(await page.locator('.career-process-row').count(),4);
  const newJob=await page.request.get('http://127.0.0.1:4317/api/career-intelligence/workspace').then(r=>r.json());const saved=newJob.processes.find(p=>p.job.company==='Nova Finance');assert.equal(saved.job.link,'https://example.com/jobs/new1');assert.equal(saved.job.status,'discovered');
  await page.unroute('**/api/career-intelligence/calendar');await page.reload();await page.getByRole('heading',{name:'Vale olhar de perto'}).waitFor();await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:/Oportunidades/}).click();await page.screenshot({path:'.artifacts/career-mobile.png',fullPage:true,animations:'disabled'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Mobile page overflows horizontally');
  await page.locator('.career-card').first().getByRole('button',{name:'Ver análise'}).click();assert.equal(await page.evaluate(()=>document.querySelector('dialog').scrollWidth>document.querySelector('dialog').clientWidth),false,'Mobile dialog overflows');await page.keyboard.press('Escape');
  await page.setViewportSize({width:768,height:1024});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Tablet page overflows');
  await page.setViewportSize({width:320,height:700});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Small mobile page overflows');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByRole('button',{name:'Movimento reduzido'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Movimento reduzido'}).isDisabled(),true);
  assert.equal(await page.locator('.career-field-ribbon').evaluate(node=>getComputedStyle(node).animationName),'none');
  assert.equal(await page.locator('.career-card').first().evaluate(node=>getComputedStyle(node).animationName),'none');
  assert.deepEqual(pageErrors,[]);
  if(process.env.MUNIN_CAREER_RECORD_VIDEO==='1'){
   const context=await browser.newContext({viewport:{width:1280,height:800},recordVideo:{dir:'.artifacts/career-video',size:{width:1280,height:800}}});
   const reel=await context.newPage();await reel.goto('http://127.0.0.1:5177/career-command.html');await reel.getByRole('heading',{name:'Vale olhar de perto'}).waitFor();
   await reel.waitForTimeout(4500);await reel.locator('.career-card').first().hover();await reel.waitForTimeout(1200);
   await reel.locator('.career-card').first().getByRole('button',{name:'Ver análise'}).click();await reel.waitForTimeout(1500);await reel.keyboard.press('Escape');
   await context.close();console.log('VIDEO: '+await reel.video().path());
  }
console.log('PASS: motion controls/persistence, system reduced motion, vector artwork, score rings, incomplete alert health, search, filters, keyboard dialog, persisted stage, preparation packet, offer/follow-up views, partial API failure, discovery import/link persistence, reload and 320/390/768/1440px layouts.');
 }finally{if(browser)await browser.close();apiServer.kill();webServer.kill();await rm(root,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exit(1)});
