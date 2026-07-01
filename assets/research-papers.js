/* research-papers.js - progressive enhancement for the Research Papers section.
   Static HTML already renders everything; this only adds filter/search on the hub
   and copy-citation / share on every page. No backend calls. Safe with elements absent. */
(function(){
  'use strict';

  /* ---------- copy citation ---------- */
  document.querySelectorAll('[data-copy]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var el = document.getElementById(btn.getAttribute('data-copy'));
      if(!el) return;
      var txt = el.textContent.trim();
      var done = function(){ var o=btn.textContent; btn.textContent='✓ Copied'; setTimeout(function(){btn.textContent=o;},1500); };
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(txt).then(done, function(){ fallbackCopy(txt); done(); });
      } else { fallbackCopy(txt); done(); }
    });
  });
  function fallbackCopy(txt){
    try{ var ta=document.createElement('textarea'); ta.value=txt; ta.style.position='fixed'; ta.style.left='-9999px';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }catch(e){}
  }

  /* ---------- share ---------- */
  document.querySelectorAll('[data-share]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var canon = document.querySelector('link[rel=canonical]');
      var url = canon ? canon.href : location.href;
      var title = document.title;
      var done = function(){ var o=btn.textContent; btn.textContent='✓ Link copied'; setTimeout(function(){btn.textContent=o;},1500); };
      if(navigator.share){ navigator.share({title:title, url:url}).catch(function(){}); }
      else if(navigator.clipboard){ navigator.clipboard.writeText(url).then(done, function(){}); }
      else { fallbackCopy(url); done(); }
    });
  });

  /* ---------- hub filter + search ---------- */
  var controls = document.getElementById('controls');
  if(!controls) return;                 // not the hub
  controls.hidden = false;              // reveal only when JS is present
  var search = document.getElementById('search');
  var count  = document.getElementById('count');
  var fbtns  = Array.prototype.slice.call(controls.querySelectorAll('.filter button'));
  var papers = Array.prototype.slice.call(document.querySelectorAll('.paper'));
  var groups = Array.prototype.slice.call(document.querySelectorAll('.spotlight, .theme-sec'));
  var mode = 'all';

  function apply(){
    var q = (search.value || '').trim().toLowerCase();
    var shown = 0;
    papers.forEach(function(p){
      var tierOk = (mode === 'all') || (p.getAttribute('data-tier') === mode);
      var textOk = !q || (p.getAttribute('data-text') || '').indexOf(q) !== -1;
      var vis = tierOk && textOk;
      p.hidden = !vis;
      if(vis) shown++;
    });
    groups.forEach(function(g){
      var any = g.querySelector('.paper:not([hidden])');
      g.hidden = !any;
    });
    if(count) count.textContent = shown + (shown === 1 ? ' paper' : ' papers');
  }

  fbtns.forEach(function(b){
    b.addEventListener('click', function(){
      mode = b.getAttribute('data-f');
      fbtns.forEach(function(x){ x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      apply();
    });
  });
  if(search) search.addEventListener('input', apply);
  apply();
})();
