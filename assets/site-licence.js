/**
 * site-licence.js — the copyright and licence footer, in one place.
 *
 * This site is 27 hand-written static pages with no build step, so a footer
 * pasted into each one would drift the first time a licence line changed. It is
 * injected instead, from here, and every page shows the same notice.
 *
 * The notice is deliberately specific rather than a bare "all rights reserved".
 * Econstellar is three things at once — software, scholarship, and a name — and
 * a visitor who wants to reuse a figure should not have to guess which rules
 * apply to it. See LICENSING.md for the full map.
 *
 * It degrades safely: a page that already carries its own <footer> gets the
 * licence bar appended after it rather than a second competing footer, and a
 * page where injection fails is simply a page without the bar, never a broken
 * one.
 */
(function () {
  'use strict';

  var HOLDER = 'Avishek Bhandari';
  var UNIT = 'School of Humanities, Social Sciences and Management, IIT Bhubaneswar';
  var YEAR = 2026;
  var REPO = 'https://github.com/avishekb9/econstellar';

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    for (var k in attrs) { if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]); }
    if (text) n.textContent = text;
    return n;
  }

  function link(href, text, rel) {
    var a = el('a', { href: href, target: '_blank', rel: rel ? rel + ' noopener' : 'noopener' }, text);
    return a;
  }

  function build() {
    var bar = el('div', { id: 'ec-licence', role: 'contentinfo' });

    var line1 = el('p', { class: 'ec-lic-line' });
    line1.appendChild(document.createTextNode('© ' + YEAR + ' ' + HOLDER + ' · '));
    line1.appendChild(el('span', { class: 'ec-lic-unit' }, UNIT));

    var line2 = el('p', { class: 'ec-lic-line ec-lic-terms' });
    line2.appendChild(document.createTextNode('Site code '));
    line2.appendChild(link(REPO + '/blob/main/LICENSE', 'MIT', 'license'));
    line2.appendChild(document.createTextNode(' · Text, figures and teaching material '));
    line2.appendChild(link('https://creativecommons.org/licenses/by/4.0/', 'CC BY 4.0', 'license'));
    line2.appendChild(document.createTextNode(' · The Econstellar name and logo are reserved · '));
    line2.appendChild(link(REPO + '/blob/main/LICENSING.md', 'full terms'));

    var line3 = el('p', { class: 'ec-lic-line ec-lic-cite' });
    line3.appendChild(document.createTextNode(
      'Reusing a result? Cite the paper it comes from, not the site. '
      + 'Research packages carry their own licences.'));

    bar.appendChild(line1);
    bar.appendChild(line2);
    bar.appendChild(line3);
    return bar;
  }

  function style() {
    if (document.getElementById('ec-licence-css')) return;
    var s = el('style', { id: 'ec-licence-css' });
    // Falls back to readable defaults on any page that does not define the
    // site tokens, so this never renders as invisible text on a dark page.
    s.textContent = [
      '#ec-licence{margin:3rem 0 0;padding:1.4rem 1.2rem 2rem;text-align:center;',
      'border-top:1px solid var(--rule,rgba(255,255,255,.08));',
      'font-family:var(--mono,ui-monospace,monospace);font-size:.68rem;line-height:1.85;',
      'color:var(--dim,#6b7280);letter-spacing:.02em}',
      '#ec-licence .ec-lic-line{margin:0}',
      '#ec-licence .ec-lic-unit{color:var(--dim,#6b7280)}',
      '#ec-licence .ec-lic-terms{margin-top:.35rem}',
      '#ec-licence .ec-lic-cite{margin-top:.35rem;opacity:.72}',
      '#ec-licence a{color:var(--cyan,#00d4ff);text-decoration:none;border-bottom:1px solid transparent}',
      '#ec-licence a:hover{border-bottom-color:currentColor}',
      '@media print{#ec-licence{color:#000}#ec-licence a{color:#000}}',
    ].join('');
    document.head.appendChild(s);
  }

  function mount() {
    try {
      if (document.getElementById('ec-licence')) return;   // never twice
      style();
      var bar = build();
      var existing = document.querySelector('footer');
      if (existing && existing.parentNode) existing.parentNode.insertBefore(bar, existing.nextSibling);
      else document.body.appendChild(bar);
    } catch (e) { /* a missing footer must never take a page down */ }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
}());
