(() => {
  const request = window.MuninClient?.request ?? (async path => { const r=await fetch(path); const d=await r.json(); if(!r.ok) throw new Error(d.error||'Falha'); return d; });
  const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  async function refresh(){
    try{
      const brief=await request('/api/career-intelligence/brief');
      const panel=document.getElementById('hud-career');
      if(panel){
        const items=[...brief.interviews,...brief.followUps,...brief.attention,...brief.stale].filter((x,i,a)=>a.findIndex(y=>y.job.id===x.job.id)===i).slice(0,5);
        panel.innerHTML=items.map(p=>`<div class="hud-career-row"><div><strong>${safe(p.job.company)} — ${safe(p.job.role)}</strong><br>${safe(p.job.status)} · ${safe(p.suggestedAction||p.job.nextAction||'Revisar processo')}</div><b>${p.job.fitScore}</b></div>`).join('')||'<div class="hud-career-row"><div>Nenhuma prioridade crítica em carreira.</div></div>';
      }
      const node=document.querySelector('[data-node="career"] [data-metric]'); if(node) node.textContent=brief.counts.interviews||brief.counts.followUps||brief.counts.attention||brief.counts.active;
      const caption=document.getElementById('hud-wave-caption'); if(caption) caption.textContent=`CAREER · ${brief.counts.interviews} entrevistas · ${brief.counts.followUps} follow-ups · ${brief.counts.stale} parados`;
    }catch{}
  }
  refresh(); setInterval(refresh,45000);
})();
