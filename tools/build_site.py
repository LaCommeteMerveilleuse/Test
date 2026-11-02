"""Génère le site BlackPhage : index.html et careers.html (texte en anglais, échangeable en français par le bouton FR / EN)
et assets/data/strings.js (toutes les chaînes, dans les deux langues).

Les textes viennent de tools/content.py (chaque clé existe dans les deux langues). Les légendes des visuels viennent de
assets/data/culture-gallery.json. Le script refuse d'écrire si un texte visible contient un tiret long, un point-virgule ou un deux-points.

Usage : python3 tools/build_site.py
"""
import json, math
import pathlib
import re
import sys
from html import escape, unescape

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from content import STR, ARTICLES  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = json.loads((ROOT / 'assets/data/site.json').read_text(encoding='utf-8'))
BAD = re.compile('[—;:]')   # tiret long, point-virgule, deux-points
problems = []

ARROW = '<svg class="arr" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M10.5 5l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
CHEV_L = '<svg class="arr" viewBox="0 0 20 20" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>'
CHEV_R = '<svg class="arr" viewBox="0 0 20 20" aria-hidden="true"><path d="M7.5 4.5 13 10l-5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>'
NORTH = '<svg class="arr" viewBox="0 0 20 20" aria-hidden="true"><path d="M6 14 14 6M7.5 6H14v6.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
CLOSE = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
ICONS = {
    'brain': '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M10 6a4 4 0 0 0-4 4 3.5 3.5 0 0 0-1.5 6A4 4 0 0 0 10 22a3 3 0 0 0 4-2.5V8.5A2.5 2.5 0 0 0 10 6Zm8 0a4 4 0 0 1 4 4 3.5 3.5 0 0 1 1.5 6A4 4 0 0 1 18 22a3 3 0 0 1-4-2.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    'cube': '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="m14 3.5 9 5v11l-9 5-9-5v-11l9-5Zm0 0v11m0 0 9-5.5m-9 5.5-9-5.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    'loop': '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M6.4 11.6A8.2 8.2 0 0 1 20.6 8.6M21.6 16.4A8.2 8.2 0 0 1 7.4 19.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M21.6 4v5.2h-5.2M6.4 24v-5.2h5.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
}


def h(s):
    """Échappe un texte et met de vraies apostrophes."""
    return escape(s, quote=False).replace("'", "’")


def a(s):
    return escape(s, quote=True)


def en(key):
    return h(STR['en'][key])


def add_str(key, fr, en_):
    STR['fr'][key] = fr
    STR['en'][key] = en_


def tx(key, tag='span', cls='', attrs=''):
    """Un texte traduisible : l'anglais est écrit dans la page, le bouton FR / EN le remplace."""
    c = f' class="{cls}"' if cls else ''
    return f'<{tag}{c} data-i18n="{key}"{(" " + attrs) if attrs else ""}>{en(key)}</{tag}>'


def culture():
    """Les visuels du carrousel « Where science meets the startup spirit » : des personnages en cubes (pixel 3D) dans divers lieux qui montrent nos valeurs
    (assets/data/culture-gallery.json). Un champ « row » facultatif range les images en plusieurs rangées qui défilent en sens inverse. Un fichier sans « / »
    est cherché dans assets/img/gallery/, sinon à partir de assets/img/. Rend une liste de rangées, chacune une liste de (numéro, chemin, mention ?, largeur, hauteur)."""
    rows = {}
    manifest = ROOT / 'assets/data/culture-gallery.json'
    n = 0
    for c in json.loads(manifest.read_text(encoding='utf-8')):
        path = f'assets/img/{c["file"]}' if '/' in c['file'] else f'assets/img/gallery/{c["file"]}'
        if not (ROOT / path).exists():
            continue
        n += 1
        add_str(f'cu{n}_c', c['caption_fr'], c['caption_en'])
        add_str(f'cu{n}_a', c['alt_fr'], c['alt_en'])
        has_credit = bool(c.get('credit_en'))
        if has_credit:
            add_str(f'cu{n}_cr', c.get('credit_fr', c['credit_en']), c['credit_en'])
        rows.setdefault(int(c.get('row', 0)), []).append((n, path, has_credit, int(c.get('width', 1200)), int(c.get('height', 800))))
    return [rows[k] for k in sorted(rows)]


# ------------------------------------------------------------------ éléments communs
def head(title_key, desc_key, home):
    desc = en(desc_key)
    return f'''<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>{en(title_key) if home else en(title_key) + ' · BlackPhage'}</title>
  <meta name="description" content="{a(STR['en'][desc_key])}">
  <meta name="theme-color" content="#ffffff">
  <meta property="og:title" content="BlackPhage">
  <meta property="og:description" content="{a(STR['en'][desc_key])}">
  <meta property="og:type" content="website">
  <link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
  <link rel="preload" href="assets/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="assets/css/site.css">
  <script type="importmap">{{ "imports": {{ "three": "./assets/vendor/three/three.module.min.js" }} }}</script>
  <script>
    (function () {{
      var d = document.documentElement; d.classList.add('js', 'i18n-pending');
      var l = 'en';
      try {{ l = localStorage.getItem('bp-lang') || ''; }} catch (e) {{}}
      if (l !== 'fr' && l !== 'en') l = /^fr/i.test((navigator.languages && navigator.languages[0]) || navigator.language || '') ? 'fr' : 'en';
      d.lang = l; d.dataset.lang = l;
      setTimeout(function () {{ d.classList.remove('i18n-pending'); }}, 2500);
    }})();
  </script>
  <script type="module" src="assets/js/main.js"></script>
</head>'''


def header(home):
    base = '' if home else 'index.html'
    links = [('why', 'nav_why'), ('novadiff', 'nav_novadiff'), ('story', 'nav_science'), ('articles', 'nav_articles')]
    pill = ''.join(f'<a href="{base}#{k}" data-i18n="{t}">{en(t)}</a>' for k, t in links)
    pill += f'<a href="careers.html"{" aria-current=\"page\"" if not home else ""} data-i18n="nav_careers">{en("nav_careers")}</a>'
    return f'''<header class="nav" id="nav">
  <a class="logo" href="{base or '#top'}" aria-label="{a(STR['en']['home_aria'])}" data-i18n-aria-label="home_aria"><img class="logo__img" src="assets/img/blackphage-logo-noir.svg" alt="BlackPhage" width="170" height="29"></a>
  <nav class="nav__pill" id="nav-pill" aria-label="{a(STR['en']['nav_main'])}" data-i18n-aria-label="nav_main">
    <i class="nav__ind" aria-hidden="true"></i>{pill}
  </nav>
  <div class="nav__end">
    <button class="lang" id="lang" type="button" aria-label="{a(STR['en']['lang_aria'])}" data-i18n-aria-label="lang_aria" title="{a(STR['en']['lang_hint'])}" data-i18n-title="lang_hint"><span class="lang__on" data-l="en">EN</span><span data-l="fr">FR</span></button>
    <button class="btn btn--dark nav__cta" type="button" data-open-contact data-i18n="nav_contact" data-cursor="">{en('nav_contact')}</button>
    <button class="burger" id="burger" type="button" aria-label="{a(STR['en']['nav_menu'])}" data-i18n-aria-label="nav_menu" aria-expanded="false" aria-controls="menu"><span></span><span></span></button>
  </div>
</header>
<div class="menu" id="menu" aria-hidden="true">
  <div class="menu__panel">
    <p class="menu__title" data-i18n="menu_title">{en('menu_title')}</p>
    <nav class="menu__list" aria-label="{a(STR['en']['nav_main'])}" data-i18n-aria-label="nav_main">
      {''.join(f'<a class="menu__item" href="{base}#{k}" style="--i:{n}"><span class="menu__n">0{n + 1}</span><span class="menu__t" data-i18n="{t}">{en(t)}</span>{NORTH}</a>' for n, (k, t) in enumerate(links))}
      <a class="menu__item" href="careers.html" style="--i:{len(links)}"><span class="menu__n">0{len(links) + 1}</span><span class="menu__t" data-i18n="nav_careers">{en('nav_careers')}</span>{NORTH}</a>
    </nav>
    <div class="menu__foot">
      <button class="btn btn--dark" type="button" data-open-contact data-i18n="nav_contact">{en('nav_contact')}</button>
      <a class="menu__mail" data-mail="email" href="mailto:{a(SITE['email'])}">{h(SITE['email'])}</a>
    </div>
  </div>
</div>'''


def footer(home):
    base = '' if home else 'index.html'
    return f'''<footer class="foot">
  <div class="container foot__in">
    <div class="foot__brand">
      <a class="logo" href="{base or '#top'}"><img class="logo__img" src="assets/img/blackphage-logo-noir.svg" alt="BlackPhage" width="150" height="26"></a>
      <p data-i18n="foot_tagline">{en('foot_tagline')}</p>
    </div>
    <div><h4 data-i18n="foot_explore">{en('foot_explore')}</h4><ul>
      <li><a href="{base}#why" data-i18n="nav_why">{en('nav_why')}</a></li>
      <li><a href="{base}#novadiff" data-i18n="nav_novadiff">{en('nav_novadiff')}</a></li>
      <li><a href="{base}#articles" data-i18n="nav_articles">{en('nav_articles')}</a></li></ul></div>
    <div><h4 data-i18n="foot_company">{en('foot_company')}</h4><ul>
      <li><a href="careers.html" data-i18n="nav_careers">{en('nav_careers')}</a></li>
      <li><button class="foot__link" type="button" data-open-contact data-i18n="nav_contact">{en('nav_contact')}</button></li></ul></div>
    <div><h4 data-i18n="foot_contact">{en('foot_contact')}</h4><ul>
      <li class="mailrow"><a data-mail="email" href="mailto:{a(SITE['email'])}">{h(SITE['email'])}</a><button class="copy" type="button" data-copy="{a(SITE['email'])}" data-mailkey="email"></button></li></ul></div>
  </div>
  <div class="container foot__legal"><p data-i18n="legal">{en('legal')}</p><p>© 2026 BlackPhage. <span data-i18n="rights">{en('rights')}</span>.</p></div>
</footer>'''


def contact_modal():
    opts = ''.join(f'<option value="{k}" data-i18n="form_a{k}">{en(f"form_a{k}")}</option>' for k in range(1, 9))
    return f'''<div class="modal" id="contact-modal" role="dialog" aria-modal="true" aria-labelledby="form-title" aria-hidden="true">
  <div class="modal__scrim" data-close></div>
  <div class="modal__box">
    <button class="modal__x" type="button" data-close aria-label="{a(STR['en']['form_close'])}" data-i18n-aria-label="form_close">{CLOSE}</button>
    <div class="modal__form" id="form-wrap">
      <h2 id="form-title" data-i18n="form_title">{en('form_title')}</h2>
      <p class="modal__lead" data-i18n="form_lead">{en('form_lead')}</p>
      <form id="contact-form" novalidate>
        <div class="field"><label for="f-last" data-i18n="form_last">{en('form_last')}</label><input id="f-last" name="last" type="text" autocomplete="family-name" required><span class="field__err" data-i18n="form_required">{en('form_required')}</span></div>
        <div class="field"><label for="f-first" data-i18n="form_first">{en('form_first')}</label><input id="f-first" name="first" type="text" autocomplete="given-name" required><span class="field__err" data-i18n="form_required">{en('form_required')}</span></div>
        <div class="field field--wide"><label for="f-act" data-i18n="form_activity">{en('form_activity')}</label><select id="f-act" name="activity" required><option value="" data-i18n="form_pick">{en('form_pick')}</option>{opts}</select><span class="field__err" data-i18n="form_required">{en('form_required')}</span></div>
        <div class="field field--wide"><label for="f-msg" data-i18n="form_msg">{en('form_msg')}</label><textarea id="f-msg" name="message" rows="5" required></textarea><span class="field__err" data-i18n="form_required">{en('form_required')}</span></div>
        <button class="btn btn--dark btn--lg field--wide" type="submit"><span data-i18n="form_send">{en('form_send')}</span>{ARROW}</button>
      </form>
    </div>
    <div class="modal__ok" id="form-ok" hidden>
      <h2 data-i18n="form_ok_title">{en('form_ok_title')}</h2>
      <p class="modal__lead" data-i18n="form_ok_text">{en('form_ok_text')}</p>
      <p class="modal__addr"><span data-i18n="form_mail_label">{en('form_mail_label')}</span> <a data-mail="email" href="mailto:{a(SITE['email'])}">{h(SITE['email'])}</a></p>
      <textarea id="form-copy" readonly rows="6" aria-label="{a(STR['en']['form_copy'])}" data-i18n-aria-label="form_copy"></textarea>
      <button class="btn btn--light" type="button" id="form-copy-btn" data-i18n="form_copy">{en('form_copy')}</button>
    </div>
  </div>
</div>
<div class="modal reader" id="reader" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="reader-title">
  <div class="modal__scrim" data-close></div>
  <article class="modal__box reader__box">
    <button class="modal__x" type="button" data-close aria-label="{a(STR['en']['art_close'])}" data-i18n-aria-label="art_close">{CLOSE}</button>
    <p class="reader__tag" id="reader-tag"></p>
    <h2 id="reader-title"></h2>
    <p class="reader__meta" id="reader-meta"></p>
    <div class="reader__body" id="reader-body"></div>
    <p class="reader__note" data-i18n="art_note">{en('art_note')}</p>
  </article>
</div>
<div class="cursor" aria-hidden="true"><i class="cursor__dot"></i></div>'''


def background():
    return '''<div class="bg" aria-hidden="true">
  <i class="bg__blob bg__blob--a"></i><i class="bg__blob bg__blob--b"></i><i class="bg__blob bg__blob--c"></i>
  <i class="bg__grid"></i><i class="bg__beam"></i><canvas class="bg__dust" id="dust"></canvas><i class="bg__spot"></i><i class="bg__grain"></i>
</div>'''


def page(title_key, desc_key, home, body_cls, main):
    attrs = f'data-title-key="{title_key}" data-desc-key="{desc_key}" data-home="{1 if home else 0}"'
    return f'''<!doctype html>
<html lang="en" data-lang="en">
{head(title_key, desc_key, home)}
<body class="{body_cls}" {attrs}>
<a class="skip" href="#main" data-i18n="skip">{en('skip')}</a>
{background()}
{'<canvas id="agent" class="agent" aria-hidden="true"></canvas>' if home else ''}
{header(home)}
<main id="main">
{main}
</main>
{footer(home)}
{contact_modal()}
</body>
</html>
'''


def sechead(prefix, eyebrow=True, center=True, extra=''):
    return (f'<header class="sec__head{" center" if center else ""}">'
            + (tx(f'{prefix}_eyebrow', 'p', 'eyebrow reveal') if eyebrow else '')
            + tx(f'{prefix}_title', 'h2', 'h2 reveal')
            + (tx(f'{prefix}_lead', 'p', 'lead reveal') if f'{prefix}_lead' in STR['en'] else '') + extra + '</header>')


# ------------------------------------------------------------------ l'accueil
def build_index():
    rows = culture()

    def shot(n, f, cr, w, h, hidden):
        return (f'<figure class="shot"{" aria-hidden=" + chr(34) + "true" + chr(34) if hidden else ""}><img src="{f}" alt="{a(STR["en"][f"cu{n}_a"])}" data-i18n-alt="cu{n}_a" loading="lazy" width="{w}" height="{h}">'
                f'<figcaption><span data-i18n="cu{n}_c">{en(f"cu{n}_c")}</span>'
                + (f'<small class="shot__credit" data-i18n="cu{n}_cr">{en(f"cu{n}_cr")}</small>' if cr else '') + '</figcaption></figure>')

    def marquee_row(pics, cls):
        # la boucle : une moitié doit être plus large que le plus grand écran (environ 4 400 px) pour qu'aucun vide n'apparaisse ; la seconde moitié la répète
        one = sum(w / h * 224 + 20 for _, _, _, w, h in pics) or 1
        reps = max(1, math.ceil(4400 / one))
        half = ''.join(shot(n, f, cr, w, h, r > 0) for r in range(reps) for n, f, cr, w, h in pics)
        dup = ''.join(shot(n, f, cr, w, h, True) for r in range(reps) for n, f, cr, w, h in pics)
        return f'<div class="marquee {cls}" data-marquee><div class="marquee__track">{half}{dup}</div></div>'

    culture_rows = ''.join(marquee_row(pics, 'marquee--slow' if i % 2 == 0 else 'marquee--alt') for i, pics in enumerate(rows))
    culture_html = (f'''<section class="sec culture" id="culture" data-tone="mist">
  <div class="container"><header class="sec__head center">{tx('culture_title', 'h2', 'h2 reveal')}</header></div>
  {culture_rows}
</section>''' if rows else '')
    arts = ''
    covers = ['lab-bench', 'pitch-day', 'pipette-plate', 'founders-table', 'data-wall', 'healthy-years', 'whiteboard-sprint', 'partners-handshake', 'lab-bench', 'pipette-plate']
    for i, (_tag, mins, *_rest) in enumerate(ARTICLES, 1):
        cover = f'assets/img/culture/{covers[i - 1]}.webp'
        cover_html = f'<img src="{cover}" alt="" loading="lazy" width="600" height="400">' if (ROOT / cover).exists() else '<i class="acard__ph"></i>'
        arts += f'''<button class="acard" type="button" data-article="{i}" data-min="{mins}">
          <span class="acard__cover">{cover_html}<span class="acard__badge" data-i18n="a{i}_tag">{en(f"a{i}_tag")}</span></span>
          <span class="acard__body">
            <h3 data-i18n="a{i}_title">{en(f"a{i}_title")}</h3>
            <span class="acard__ex" data-i18n="a{i}_ex">{en(f"a{i}_ex")}</span>
            <span class="acard__meta"><span>{mins} <span data-i18n="art_min">{en("art_min")}</span></span>{NORTH}</span>
          </span>
        </button>'''
    steps = ''.join(f'<li class="sstep{" is-on" if k == 1 else ""}" data-step="{k}"><b class="sstep__n">{k}</b><div>{tx(f"story_s{k}t", "h3")}{tx(f"story_s{k}", "p")}</div></li>' for k in range(1, 5))
    cards_row = f'''<div class="arts" data-arts>
    <button class="arts__nav arts__nav--prev" type="button" data-dir="-1" aria-label="{a(STR['en']['art_prev'])}" data-i18n-aria-label="art_prev" disabled>{CHEV_L}</button>
    <div class="arts__scroll" tabindex="0" role="region" aria-label="{a(STR['en']['art_list'])}" data-i18n-aria-label="art_list"><div class="arts__track">{arts}</div></div>
    <button class="arts__nav arts__nav--next" type="button" data-dir="1" aria-label="{a(STR['en']['art_next'])}" data-i18n-aria-label="art_next">{CHEV_R}</button>
  </div>'''
    feats = ''.join(f'''<li class="feat reveal-wipe" style="--i:{k}"><span class="feat__ico">{ICONS[ic]}</span><div>{tx(f"nova_f{k + 1}", "h3")}{tx(f"nova_f{k + 1}n", "p")}</div></li>''' for k, ic in enumerate(['brain', 'cube', 'loop']))
    nova_chips = ''.join(tx(f'nova_c{k}', 'li', 'chip chip--pop') for k in range(1, 4))
    prog_chips = ''.join(tx(f'prog_{k}', 'li', 'chip') for k in range(1, 8))
    main = f'''<section class="hero" id="top" data-tone="haze">
  <div class="slot slot--brain" data-slot="brain" role="img" aria-label="{a(STR['en']['brain_alt'])}" data-i18n-aria-label="brain_alt"><img class="slot__poster" src="assets/img/agent-brain.webp" alt="" width="1120" height="720"></div>
  <div class="container hero__in">
    <h1 class="hero__title" data-split>{tx('hero_t1')} {tx('hero_t2', 'span', 'grad')} {tx('hero_t3')}</h1>
  </div>
  <i class="hero__cue" aria-hidden="true"></i>
</section>

<section class="sec rescue" id="why" data-tone="warm">
  <div class="container rescue__in">
    <div class="rescue__txt">
      {tx('rescue_eyebrow', 'p', 'eyebrow reveal')}
      {tx('rescue_title', 'h2', 'h2 reveal')}
      {tx('hero_sub', 'p', 'lead rescue__lead reveal')}
      <p class="rescue__p" data-words data-i18n="rescue_p">{en('rescue_p')}</p>
      <div class="hero__cta reveal">
        <a class="btn btn--dark btn--lg" href="#novadiff"><span data-i18n="hero_cta1">{en('hero_cta1')}</span>{ARROW}</a>
        <a class="btn btn--light btn--lg" href="#articles" data-i18n="hero_cta2">{en('hero_cta2')}</a>
      </div>
    </div>
    <div class="rescue__side">
      <div class="slot slot--brain2" data-slot="brain2" aria-hidden="true"></div>
      <ol class="rescue__steps">
        <li class="step reveal-line" style="--i:0"><span class="step__n">1</span>{tx('rescue_s1', 'span')}</li>
        <li class="step reveal-line" style="--i:1"><span class="step__n">2</span>{tx('rescue_s2', 'span')}</li>
        <li class="step reveal-line" style="--i:2"><span class="step__n">3</span>{tx('rescue_s3', 'span')}</li>
      </ol>
    </div>
  </div>
</section>

{culture_html}

<section class="sec nova" id="novadiff" data-tone="blue">
  <div class="container nova__in">
    <div class="nova__txt">
      {tx('nova_eyebrow', 'p', 'eyebrow reveal')}
      {tx('nova_title', 'h2', 'h2 reveal')}
      {tx('nova_text', 'p', 'lead reveal')}
      {tx('nova_text2', 'p', 'lead reveal')}
      <ul class="feats">{feats}</ul>
      <ul class="chips chips--row">{nova_chips}</ul>
      <div class="progs reveal">{tx('prog_title', 'p', 'progs__t')}<ul class="chips">{prog_chips}</ul></div>
    </div>
    <div class="slot slot--robot" data-slot="robot" role="img" aria-label="{a(STR['en']['robot_alt'])}" data-i18n-aria-label="robot_alt"><img class="slot__poster" src="assets/img/agent-robot.webp" alt="" width="760" height="928"></div>
  </div>
</section>

<section class="story" id="story" data-story data-tone="aqua">
  <div class="story__pin">
    <header class="story__head">{tx('story_eyebrow', 'p', 'eyebrow')}{tx('story_title', 'h2', 'h2')}</header>
    <div class="story__frame" data-slot="story" aria-hidden="true"></div>
    <div class="story__text">
      {tx('story_lead', 'p', 'story__lead')}
      <ol class="story__steps">{steps}</ol>
    </div>
  </div>
</section>

<section class="sec articles" id="articles" data-tone="warm2">
  <div class="container">{sechead('art')}</div>
  {cards_row}
</section>

<section class="sec contact" id="contact" data-tone="deep">
  <div class="container contact__in">
    {tx('grid_sub', 'p', 'contact__line reveal')}
    <button class="contact__btn" type="button" data-open-contact data-magnet><i class="contact__ring" aria-hidden="true"></i><span class="contact__glow" aria-hidden="true"></span><span class="contact__txt" data-i18n="grid_btn">{en('grid_btn')}</span>{ARROW}</button>
  </div>
</section>'''
    return page('home_title', 'home_desc', True, 'page-home', main)


# ------------------------------------------------------------------ carrières
def build_careers():
    why = ''.join(f'<article class="card"><span class="feat__ico">{ICONS[ic]}</span>{tx(f"why_{i}", "h3")}{tx(f"why_{i}n", "p", "card__p")}</article>' for i, ic in ((1, 'brain'), (2, 'cube'), (3, 'loop')))
    quals = ''.join(f'<li class="qual reveal-line" style="--i:{i - 1}">{tx(f"q_{i}", "span", "qual__w")}{tx(f"q_{i}n", "span", "qual__p")}</li>' for i in range(1, 6))
    skills = ''.join(tx(f'sk_{i}', 'li', 'chip') for i in range(1, 9))
    sbb_subject = a(STR['en']['mail_subject_apply'] + ' ' + STR['en']['sbb_title'])
    sbb_meta = ''.join(f'<div>{tx(f"sbb_m{k}_k", "dt")}{tx(f"sbb_m{k}_v", "dd")}</div>' for k in range(1, 5))
    sbb_secs = ''
    for k in range(1, 8):
        lis = ''.join(tx(f'sbb_s{k}_{j}', 'li') for j in range(1, 6) if f'sbb_s{k}_{j}' in STR['en'])
        sbb_secs += f'<section class="jobx__sec">{tx(f"sbb_s{k}_h", "h4")}<ul>{lis}</ul></section>'
    featured = f'''<article class="jobx reveal" id="serial-biotech-builder">
    <p class="tag">{tx("sbb_eyebrow")} · {tx("sbb_team")} · {tx("job_full")}</p>
    {tx("sbb_title", "h3", "jobx__title")}
    {tx("sbb_lead", "p", "jobx__lead")}
    <dl class="jobx__meta">{sbb_meta}</dl>
    <div class="jobx__cols">{sbb_secs}</div>
    <div class="jobx__cta"><a class="btn btn--dark btn--lg" data-mail="careersEmail" data-subject="{sbb_subject}" href="mailto:{a(SITE["careersEmail"])}?subject={sbb_subject}"><span data-i18n="job_apply">{en("job_apply")}</span>{ARROW}</a></div>
  </article>'''
    main = f'''<section class="pagehead">
  <div class="container">
    <a class="back" href="index.html">{ARROW}<span data-i18n="c_back">{en('c_back')}</span></a>
    {tx('car_eyebrow', 'p', 'eyebrow')}
    {tx('car_h1', 'h1', 'h1')}
    {tx('car_lead', 'p', 'lead')}
  </div>
</section>
<section class="sec sec--tight"><div class="container">{tx('why_eyebrow', 'p', 'eyebrow reveal')}{tx('why_h2', 'h2', 'h2 reveal')}<div class="cards3">{why}</div></div></section>
<section class="sec sec--tight"><div class="container">{tx('prof_eyebrow', 'p', 'eyebrow reveal')}{tx('prof_h2', 'h2', 'h2 reveal')}<ol class="quals">{quals}</ol></div></section>
<section class="sec sec--tight"><div class="container">{tx('skill_eyebrow', 'p', 'eyebrow reveal')}{tx('skill_h2', 'h2', 'h2 reveal')}{tx('skill_lead', 'p', 'lead reveal')}<ul class="chips chips--row">{skills}</ul></div></section>
<section class="sec sec--tight" id="jobs"><div class="container">{tx('jobs_eyebrow', 'p', 'eyebrow reveal')}{tx('jobs_h2', 'h2', 'h2 reveal')}{tx('jobs_lead', 'p', 'lead reveal')}
  <p class="mailrow"><a data-mail="careersEmail" href="mailto:{a(SITE['careersEmail'])}">{h(SITE['careersEmail'])}</a><button class="copy" type="button" data-copy="{a(SITE['careersEmail'])}" data-mailkey="careersEmail"></button></p>
  {featured}</div></section>
<section class="sec end"><div class="container"><div class="endcard reveal">{tx('car_end_h2', 'h2', 'h2')}{tx('car_end_p', 'p', 'lead')}
  <div class="hero__cta"><a class="btn btn--dark btn--lg" data-mail="careersEmail" data-subject="{a(STR['en']['mail_subject_apply'])}" href="mailto:{a(SITE['careersEmail'])}?subject={a(STR['en']['mail_subject_apply'])}"><span data-i18n="car_end_cta">{en('car_end_cta')}</span>{ARROW}</a></div></div></div></section>'''
    return page('car_title', 'car_desc', False, 'page-careers', main)


# ------------------------------------------------------------------ contrôles
class Text:
    """Extrait le texte visible d'une page (nœuds de texte et attributs lus par les lecteurs d'écran)."""
    ATTR = re.compile(r'\s(?:aria-label|alt|title|placeholder)="([^"]*)"')

    @staticmethod
    def of(src):
        body = src.split('</head>', 1)[-1]
        body = re.sub(r'<(script|style)\b.*?</\1>', ' ', body, flags=re.S)
        out = [unescape(m) for m in Text.ATTR.findall(body)]
        out += [unescape(t) for t in re.findall(r'>([^<]+)<', body)]
        out += [unescape(t) for t in re.findall(r'<meta (?:name="description"|property="og:[a-z]+") content="([^"]*)"', src)]
        out += [unescape(t) for t in re.findall(r'<title>([^<]*)</title>', src)]
        return [t.strip() for t in out if t.strip()]


def main():
    out = [('index.html', build_index()), ('careers.html', build_careers())]
    for name, src in out:
        for t in Text.of(src):
            if BAD.search(t):
                problems.append(f'{name} texte visible interdit {t!r}')
    for lg in ('fr', 'en'):
        for k, v in STR[lg].items():
            if BAD.search(v):
                problems.append(f'content {lg}.{k} contient un caractère interdit {v!r}')
            if not v.strip():
                problems.append(f'content {lg}.{k} est vide')
    if set(STR['fr']) != set(STR['en']):
        problems.append('les deux langues n\'ont pas les mêmes clés')
    if problems:
        print('PROBLEMES')
        for p in problems:
            print(' -', p)
        sys.exit(1)
    for name, src in out:
        (ROOT / name).write_text(src, encoding='utf-8')
    strings = {lg: {k: v.replace("'", '’') for k, v in STR[lg].items()} for lg in ('en', 'fr')}
    (ROOT / 'assets/data').mkdir(parents=True, exist_ok=True)
    (ROOT / 'assets/data/strings.js').write_text('// Généré par tools/build_site.py, ne pas modifier à la main.\nexport default ' + json.dumps(strings, ensure_ascii=False, indent=1) + ';\n', encoding='utf-8')
    print('ok', len(out), 'pages,', len(STR['en']), 'chaînes')


if __name__ == '__main__':
    main()
