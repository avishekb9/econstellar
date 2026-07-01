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

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- back to top (every Research Papers page) ---------- */
  (function(){
    var tt = document.createElement('button');
    tt.className = 'totop'; tt.type = 'button';
    tt.setAttribute('aria-label', 'Back to top'); tt.innerHTML = '&#8593;';
    document.body.appendChild(tt);
    tt.addEventListener('click', function(){ window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });
    var on = function(){ tt.classList.toggle('show', window.pageYOffset > 600); };
    window.addEventListener('scroll', on, { passive: true }); on();
  })();

  /* ---------- light / dark reading mode (opt-in; default dark, persisted) ---------- */
  (function(){
    var root = document.documentElement;
    var btn = document.getElementById('rp-theme-toggle');
    if(!btn) return;
    function sync(){
      var light = root.getAttribute('data-theme') === 'light';
      btn.setAttribute('aria-pressed', light ? 'true' : 'false');
      btn.innerHTML = light ? '&#9681;' : '&#9680;';   // ◑ light on : ◐ dark
    }
    sync();
    btn.addEventListener('click', function(){
      var light = root.getAttribute('data-theme') === 'light';
      if(light){ root.removeAttribute('data-theme'); try{ localStorage.setItem('rp-theme','dark'); }catch(e){} }
      else { root.setAttribute('data-theme','light'); try{ localStorage.setItem('rp-theme','light'); }catch(e){} }
      sync();
    });
  })();

  /* ---------- theme navigator: sticky offset under the nav + close behaviour ---------- */
  (function(){
    var topnav = document.querySelector('nav');
    if(topnav){
      var setH = function(){ document.documentElement.style.setProperty('--navh', topnav.offsetHeight + 'px'); };
      setH(); window.addEventListener('resize', setH, { passive: true });
    }
    var tn = document.getElementById('themenav');
    if(!tn) return;                         // only on the hub
    tn.querySelectorAll('.themenav__panel a').forEach(function(a){
      a.addEventListener('click', function(){ tn.removeAttribute('open'); });
    });
    document.addEventListener('click', function(ev){
      if(tn.open && !tn.contains(ev.target)) tn.removeAttribute('open');
    });
    document.addEventListener('keydown', function(ev){
      if(ev.key === 'Escape' && tn.open){ tn.removeAttribute('open'); var s = tn.querySelector('summary'); if(s) s.focus(); }
    });
  })();

  /* ---------- scroll-spy: highlight the theme in view ---------- */
  (function(){
    var secs = Array.prototype.slice.call(document.querySelectorAll('.theme-sec[id]'));
    if(!secs.length || !('IntersectionObserver' in window)) return;
    var links = {};
    document.querySelectorAll('.jump a[href^="#"], .themenav__theme[href^="#"]').forEach(function(a){
      var id = a.getAttribute('href').slice(1); (links[id] = links[id] || []).push(a);
    });
    var io = new IntersectionObserver(function(ents){
      ents.forEach(function(en){
        if(en.isIntersecting){
          var id = en.target.id;
          Object.keys(links).forEach(function(k){
            links[k].forEach(function(a){ a.classList.toggle('is-active', k === id); });
          });
        }
      });
    }, { rootMargin: '-140px 0px -70% 0px', threshold: 0 });
    secs.forEach(function(s){ io.observe(s); });
  })();

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
