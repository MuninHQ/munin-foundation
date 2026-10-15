/* Read-only projection of existing Context Memory and Control Room records. */
(() => {
  function createGraph(data, core) {
    const sections = Object.values(data?.state?.sections || {}).filter(section => section.scope !== 'sensitive-private');
    const events = core?.controlRoom?.timeline || [];
    const nodes = [], edges = [];
    const group = (id, label, items) => {
      if (!items.length) return;
      nodes.push({id,label,kind:'group',summary:`${items.length} registros nesta fonte.`,source:id==='timeline'?'#timeline':'#sections'});
      for (const item of items) { nodes.push(item); edges.push({from:id,to:item.id,label:'Pertence à fonte'}); }
    };
    group('contexts','Contextos locais',sections.map((section,index) => ({id:`context-${section.key}`,label:String(section.key),kind:'context',scope:section.scope,summary:JSON.stringify(section.value ?? {},null,2),updatedAt:section.updatedAt,source:'#sections'})));
    group('timeline','Atividade registrada',events.map((event,index) => ({id:`event-${event.id || `${event.at || ''}:${event.title || ''}:${index}`}`,label:String(event.title || 'Evento'),kind:'event',summary:String(event.summary || 'Sem resumo registrado'),updatedAt:event.at,source:'#timeline'})));
    return { nodes,edges,hiddenSensitive:Object.values(data?.state?.sections || {}).filter(section => section.scope==='sensitive-private').length };
  }
  window.MuninMemoryGraph = Object.freeze({createGraph});
  const root = document.getElementById('memory-constellation');
  if (!root) return;
  const svg = root.querySelector('svg'), list = root.querySelector('[data-graph-list]'), detail = root.querySelector('[data-graph-detail]');
  const search = root.querySelector('input[type="search"]'), filter = root.querySelector('select'), rotation = root.querySelector('input[type="range"]'), status = root.querySelector('[data-graph-status]');
  const NS='http://www.w3.org/2000/svg';
  let graph={nodes:[],edges:[]}, selected=null, yaw=0, pitch=.2, drag=null;
  const el = (name, attrs={}) => {const node=document.createElementNS(NS,name);for(const [k,v] of Object.entries(attrs))node.setAttribute(k,v);return node;};
  function select(id) { selected=id; render(); }
  function renderDetail() {
    const node=graph.nodes.find(item=>item.id===selected);
    detail.replaceChildren();
    const heading=document.createElement('h3'); heading.textContent=node?.label || 'Explore uma conexão';
    const meta=document.createElement('p');meta.className='muted';meta.textContent=node ? node.kind==='group'?'Fonte local':node.kind==='context'?'Context Memory · '+node.scope:'Control Room · atividade registrada' : 'Selecione um ponto ou use a lista. As linhas indicam a fonte de cada registro.';
    detail.append(heading,meta);
    if (!node) return;
    if (node.updatedAt) {const time=document.createElement('p');time.className='muted';time.textContent='Registro: '+new Date(node.updatedAt).toLocaleString('pt-BR');detail.append(time);}
    const body=document.createElement('pre');body.textContent=node.summary.slice(0,6000);detail.append(body);
    if (node.summary.length>6000) {const note=document.createElement('p');note.textContent='Prévia limitada. Abra a fonte para consultar o registro.';detail.append(note);}
    const link=document.createElement('a');link.href=node.source;link.textContent='Abrir fonte ↓';detail.append(link);
  }
  function render() {
    const focusedId=root.contains(document.activeElement) ? document.activeElement.getAttribute('data-graph-id') : null, focusedTag=document.activeElement?.tagName;
    const query=search.value.trim().toLocaleLowerCase('pt-BR');
    const matches=graph.nodes.filter(node => node.kind!=='group' && (filter.value==='all'||node.kind===filter.value) && (!query||node.label.toLocaleLowerCase('pt-BR').includes(query)));
    const visible=matches.slice(0,48);
    const ids=new Set(visible.map(node=>node.id));
    const edges=graph.edges.filter(edge=>ids.has(edge.to));
    edges.forEach(edge=>ids.add(edge.from));
    const nodes=graph.nodes.filter(node=>ids.has(node.id));
    status.textContent=graph.nodes.length ? `${visible.length} de ${matches.length} registros · linhas por fonte${graph.hiddenSensitive?' · conteúdo sensível omitido':''}` : 'Nenhum registro disponível para visualizar.';
    list.replaceChildren();
    if (!visible.length) {const empty=document.createElement('p');empty.className='muted';empty.textContent=graph.nodes.length?'Nenhum registro corresponde ao filtro.':'Os contextos e eventos aparecerão após serem registrados no Munin.';list.append(empty);}
    visible.forEach(node => {const button=document.createElement('button');button.type='button';button.dataset.graphId=node.id;button.textContent=node.label;button.setAttribute('aria-pressed',String(node.id===selected));button.addEventListener('click',()=>select(node.id));list.append(button);});
    svg.replaceChildren();
    const positions=new Map();
    const phi=Math.PI*(3-Math.sqrt(5));
    nodes.forEach((node,i)=>{
      const y=1-(i+.5)/Math.max(nodes.length,1)*2,r=Math.sqrt(Math.max(0,1-y*y)),a=i*phi;
      const x=Math.cos(a)*r,z=Math.sin(a)*r,xx=x*Math.cos(yaw)+z*Math.sin(yaw),zz=z*Math.cos(yaw)-x*Math.sin(yaw),yy=y*Math.cos(pitch)-zz*Math.sin(pitch),depth=y*Math.sin(pitch)+zz*Math.cos(pitch);
      const perspective=2.6/(2.6-depth*.45);
      positions.set(node.id,{x:320+xx*205*perspective,y:210+yy*138*perspective,depth});
    });
    edges.forEach(edge=>{const a=positions.get(edge.from),b=positions.get(edge.to);svg.append(el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:edge.to===selected||edge.from===selected?'graph-edge selected':'graph-edge'}));});
    [...nodes].sort((a,b)=>positions.get(a.id).depth-positions.get(b.id).depth).forEach(node=>{
      const p=positions.get(node.id),g=el('g',{transform:`translate(${p.x},${p.y})`,class:`graph-node ${node.kind} ${selected===node.id?'selected':''}`,role:'button',tabindex:'0','data-graph-id':node.id,'aria-label':node.label,'aria-pressed':String(selected===node.id)});
      const title=el('title');title.textContent=node.label;g.append(title,el('circle',{r:node.kind==='group'?11:6}));
      const label=el('text',{y:node.kind==='group'?30:24,'text-anchor':'middle'});label.textContent=node.label.length>24?node.label.slice(0,22)+'…':node.label;g.append(label);
      g.addEventListener('click',()=>select(node.id));g.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select(node.id);const replacement=[...svg.querySelectorAll('g')].find(item=>item.getAttribute('data-graph-id')===node.id);replacement?.focus();}});svg.append(g);
    });
    renderDetail();
    if (focusedId) [...root.querySelectorAll('[data-graph-id]')].find(item=>item.getAttribute('data-graph-id')===focusedId && item.tagName===focusedTag)?.focus();
  }
  window.addEventListener('munin:memory-data',event=>{if(event.detail.error){status.textContent='Fonte indisponível. Atualize para tentar novamente; a última visão disponível foi preservada.';return;}graph=createGraph(event.detail.data,event.detail.core);if(!graph.nodes.some(node=>node.id===selected))selected=null;render();});
  search.addEventListener('input',render);filter.addEventListener('change',render);
  rotation.addEventListener('input',()=>{yaw=Number(rotation.value)*Math.PI/180;render();});
  root.querySelector('[data-graph-reset]').addEventListener('click',()=>{yaw=0;pitch=.2;rotation.value='0';search.value='';filter.value='all';selected=null;render();});
  svg.addEventListener('pointerdown',event=>{if(event.target.closest('g'))return;drag={x:event.clientX,y:event.clientY,yaw,pitch};svg.setPointerCapture(event.pointerId);});
  svg.addEventListener('pointermove',event=>{if(!drag)return;yaw=drag.yaw+(event.clientX-drag.x)*.008;pitch=Math.max(-1,Math.min(1,drag.pitch+(event.clientY-drag.y)*.008));rotation.value=String(Math.round(yaw*180/Math.PI));render();});
  const stop=()=>drag=null;svg.addEventListener('pointerup',stop);svg.addEventListener('pointercancel',stop);
  render();
})();
