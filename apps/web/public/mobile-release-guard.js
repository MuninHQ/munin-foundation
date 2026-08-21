(()=>{
  const splash=document.getElementById('munin-splash');
  if(!splash)return;
  const close=()=>{if(!splash.isConnected)return;splash.classList.add('leaving');setTimeout(()=>splash.remove(),700)};
  const enter=splash.querySelector('.munin-approved-enter');
  if(enter)enter.textContent='ENTRAR NO MUNIN';
  const style=document.createElement('style');
  style.textContent='.munin-approved-enter{display:block!important;left:50%!important;right:auto!important;bottom:10.5%!important;width:min(78%,420px)!important;height:58px!important;min-height:58px!important;transform:translateX(-50%)!important;border:1px solid rgba(210,174,112,.7)!important;background:rgba(5,9,12,.78)!important;color:#f4e5c7!important;font:700 14px/1 system-ui!important;letter-spacing:.1em!important;backdrop-filter:blur(8px)!important;-webkit-backdrop-filter:blur(8px)!important}';
  document.head.appendChild(style);
  enter?.addEventListener('click',close,{once:true});
  window.setTimeout(close,4000);
})();
