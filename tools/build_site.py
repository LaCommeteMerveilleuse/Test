"""Génère les pages statiques de BlackPhage, en français (racine) et en anglais (dossier en/).

Les textes viennent de tools/content.py (chaque clé existe dans les deux langues) et de assets/data/*.json.
Le script écrit aussi, dans l'en-tête de chaque page, le bloc de langue (liens hreflang et redirection
automatique selon la langue du navigateur), entre les repères langue:debut et langue:fin.
Il refuse d'écrire si un texte visible contient un tiret long, un point-virgule ou un deux-points.

Usage : python tools/build_site.py
"""
import json
import pathlib
import re
import sys
from datetime import date
from html import escape, unescape
from urllib.parse import quote

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from content import STR  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = json.loads((ROOT / 'assets/data/site.json').read_text(encoding='utf-8'))
PROGRAMS = json.loads((ROOT / 'assets/data/programs.json').read_text(encoding='utf-8'))

# ------------------------------------------------------------------ pages
# key : valeur de data-page sur <body>. three : la page charge une scène three.js (table d'import).
PAGES = {
    'index': dict(key='accueil', title_key='home_title', desc_key='home_desc', three=True, scripts=['chrome.js', 'scene.js']),
    'tech': dict(key='tech', title_key='tech_title', desc_key='tech_desc', three=True, scripts=['chrome.js', 'tech.js']),
    'program': dict(key='programme', title_key='prog_title', desc_key='prog_desc', three=True, scripts=['chrome.js', 'program.js']),
    'careers': dict(key='carrieres', title_key='car_title', desc_key='car_desc', three=False, scripts=['chrome.js']),
}

# Redirection automatique : une seule décision par visite, jamais contre un choix explicite (bouton FR / EN).
# Sans stockage disponible, on ne redirige pas, car on ne pourrait pas retenir le choix de la personne.
REDIRECT = '''<script>
(function () { try {
  var d = document.documentElement, here = (d.dataset.lang || d.lang) === 'en' ? 'en' : 'fr';
  try { localStorage.setItem('bp-t', '1'); localStorage.removeItem('bp-t'); } catch (e) { return; }
  var want = localStorage.getItem('bp-lang');
  if (want !== 'fr' && want !== 'en') {
    if (sessionStorage.getItem('bp-auto')) return;
    sessionStorage.setItem('bp-auto', '1');
    var l = (navigator.languages && navigator.languages[0]) || navigator.language || 'fr';
    want = /^fr/i.test(l) ? 'fr' : 'en';
  }
  if (want === here) return;
  var f = location.pathname.split('/').pop(); if (!/\\.html$/.test(f)) f = 'index.html';
  location.replace((here === 'en' ? '../' : 'en/') + f + location.search + location.hash);
} catch (e) {} })();
</script>'''

GLOBE = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M2.5 10h15M10 2.5c-3.2 3.4-3.2 11.6 0 15M10 2.5c3.2 3.4 3.2 11.6 0 15" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'
ARROW = '<svg class="arr" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M10.5 5l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
ICONS = {
    'ph': '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M14 3.5c3.9 4.8 7.2 8.5 7.2 12.3a7.2 7.2 0 0 1-14.4 0c0-3.8 3.3-7.5 7.2-12.3Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8.6 16.6c1.6-1.3 3.1-1.3 4.7 0s3.1 1.3 4.7 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    'gentle': '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M14 3.6 22 6.8v6.2c0 4.8-3.3 8.7-8 10.6-4.7-1.9-8-5.8-8-10.6V6.8l8-3.2Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 14.2c1.3 1.5 2.5 2.2 4 2.2s2.7-.7 4-2.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    'precise': '<svg viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="14" cy="14" r="2.2" fill="currentColor"/><path d="M14 2.5v5M14 20.5v5M2.5 14h5M20.5 14h5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    'compass': '<svg viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="9.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m18.6 9.4-2.3 6.9-6.9 2.3 2.3-6.9Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    'heart': '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M14 23.2s-8.4-5-8.4-11.3a4.7 4.7 0 0 1 8.4-2.9 4.7 4.7 0 0 1 8.4 2.9c0 6.3-8.4 11.3-8.4 11.3Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    'team': '<svg viewBox="0 0 28 28" aria-hidden="true"><circle cx="10.5" cy="10.5" r="3.8" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="19.5" cy="11.5" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3.8 22.5c.5-4 3-6 6.7-6s6.2 2 6.7 6M17.5 16.6c3.2-.5 6 .9 6.7 5.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    'fold': '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M6.4 11.6A8.2 8.2 0 0 1 20.6 8.6M21.6 16.4A8.2 8.2 0 0 1 7.4 19.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M21.6 4v5.2h-5.2M6.4 24v-5.2h5.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    'globe': '<svg viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="9.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4.5 14h19M14 4.5c-4 4.4-4 14.6 0 19M14 4.5c4 4.4 4 14.6 0 19" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    'grow': '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M14 23.5V8.5M8.2 14.2 14 8.4l5.8 5.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 23.5h16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
}

BAD = re.compile('[—;:]')   # tiret long, point-virgule, deux-points
problems = []


def h(s):
    """Échappe un texte et met de vraies apostrophes."""
    return escape(s, quote=False).replace("'", "\u2019")


def a(s):
    return escape(s, quote=True)


def hb(s):
    """Comme h(), et le nom de l'agent est mis en valeur."""
    return h(s).replace('NovaDiff active', '<strong class="brandname">NovaDiff active</strong>')


def L(o, lg):
    return o.get(lg) or o['fr'] if isinstance(o, dict) else o


# ------------------------------------------------------------------ éléments communs
def lang_block(name, lg):
    f = f'{name}.html'
    fr, en = (f, 'en/' + f) if lg == 'fr' else ('../' + f, f)
    return ('<!-- langue:debut -->\n'
            f'  <link rel="alternate" hreflang="fr" href="{fr}">\n'
            f'  <link rel="alternate" hreflang="en" href="{en}">\n'
            f'  <link rel="alternate" hreflang="x-default" href="{en}">\n'
            f'  {REDIRECT}\n  <!-- langue:fin -->')


def head(name, lg, T, P):
    pg = PAGES[name]
    title = T[pg['title_key']]
    full = 'BlackPhage' if name == 'index' else f'{title} · BlackPhage'
    desc = T[pg['desc_key']]
    importmap = f'\n  <script type="importmap">{{ "imports": {{ "three": "{P or './'}assets/vendor/three/three.module.min.js" }} }}</script>' if pg['three'] else ''
    scripts = '\n  '.join(f'<script type="module" src="{P}assets/js/{s}"></script>' for s in pg['scripts'])
    return f'''<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>{h(full)}</title>
  <meta name="description" content="{a(desc)}">
  <meta name="theme-color" content="#151a3c">
  <meta property="og:title" content="{a(full)}">
  <meta property="og:description" content="{a(desc)}">
  <meta property="og:type" content="website">
  {lang_block(name, lg)}
  <link rel="icon" href="{P}assets/favicon.svg" type="image/svg+xml">
  <link rel="preload" href="{P}assets/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="{P}assets/css/site.css">{importmap}
  <script>document.documentElement.classList.add('js')</script>
  {scripts}
</head>'''


def logo(T, P, extra=''):
    """Le logo officiel (blanc, pour les fonds sombres). Les fichiers ne sont jamais modifiés."""
    return (f'<a class="logo{extra}" href="index.html" aria-label="{a(T["home_aria"])}">'
            f'<img class="logo__img" src="{P}assets/img/blackphage-logo-blanc.svg" alt="BlackPhage" width="170" height="29"></a>')


def langswitch(lg, name):
    other = 'en' if lg == 'fr' else 'fr'
    href = (f'en/{name}.html' if lg == 'fr' else f'../{name}.html')
    T = STR[lg]
    return (f'<a class="langswitch" href="{href}" hreflang="{other}" lang="{other}" aria-label="{a(T["lang_switch_label"])}">{GLOBE}'
            f'<span class="{"is-on" if lg == "fr" else ""}">FR</span><span class="{"is-on" if lg == "en" else ""}">EN</span></a>')


def header(name, lg, T):
    key = PAGES[name]['key']
    P = '' if lg == 'fr' else '../'

    def link(href, label, k, also=()):
        cur = ' aria-current="page"' if key == k else ''
        cls = ' class="is-active"' if key in also else ''
        return f'<a href="{href}"{cur}{cls}>{h(label)}</a>'

    return f'''<header class="nav" id="nav">
  <div class="nav__in">
    {logo(T, P)}
    <nav class="nav__pill glass" id="nav-links" aria-label="{a(T["nav_main"])}">
      {link('index.html', T['nav_home'], 'accueil')}
      {link('tech.html', T['nav_tech'], 'tech', also=('programme',))}
      {link('careers.html', T['nav_careers'], 'carrieres')}
      <a class="btn btn--light nav__cta-m" href="index.html#contact">{h(T['nav_partner'])}</a>
    </nav>
    <div class="nav__end">
      {langswitch(lg, name)}
      <a class="btn btn--light nav__cta" href="index.html#contact">{h(T['nav_partner'])}</a>
      <button class="nav__burger" type="button" aria-label="{a(T['nav_menu'])}" aria-expanded="false" aria-controls="nav-links"><span></span></button>
    </div>
  </div>
</header>'''


def program_links(lg):
    out = []
    for p in PROGRAMS['programs']:
        if p.get('detail'):
            out.append(f'<li><a href="program.html#{a(p["id"])}">{h(L(p["name"], lg))}</a></li>')
    return ''.join(out)


def footer(name, lg, T):
    P = '' if lg == 'fr' else '../'
    return f'''<footer class="foot">
  <div class="container foot__in">
    <div class="foot__brand">
      {logo(T, P)}
      <p class="foot__tag">{h(T['foot_tagline'])}</p>
    </div>
    <div><h4>{h(T['foot_company'])}</h4><ul><li><a href="index.html#who">{h(T['foot_who'])}</a></li><li><a href="careers.html">{h(T['nav_careers'])}</a></li></ul></div>
    <div><h4>{h(T['foot_tech'])}</h4><ul data-programs-list><li><a href="tech.html">{h(T['nav_tech'])}</a></li>{program_links(lg)}</ul></div>
    <div><h4>{h(T['foot_contact'])}</h4><ul><li><a data-mail="email" href="mailto:{a(SITE['email'])}">{h(SITE['email'])}</a></li><li>{langswitch(lg, name)}</li></ul></div>
  </div>
  <div class="container foot__legal"><p>{h(T['legal'])}</p><p>© {date.today().year} BlackPhage. {h(T['rights'])}.</p></div>
</footer>'''


def page(name, lg, main, extra_before_main=''):
    T = STR[lg]
    P = '' if lg == 'fr' else '../'
    pg = PAGES[name]
    html_attrs = f'lang="{lg}" data-lang="{lg}"' + (f' data-base="{P}"' if P else '')
    cls = {'accueil': 'page-home', 'programme': 'page-program'}.get(pg['key'], 'page-inner')
    return f'''<!doctype html>
<html {html_attrs}>
{head(name, lg, T, P)}
<body data-page="{pg['key']}" class="{cls}">
<a class="skip" href="#main">{h(T['skip'])}</a>
{extra_before_main}{header(name, lg, T)}
<main id="main">
{main}
</main>
{footer(name, lg, T)}
</body>
</html>
'''


# ------------------------------------------------------------------ accueil
def steps_html(T):
    return ''.join(
        f'<li class="step reveal"><span class="step__n">{i}</span><div><h3>{h(T[f"step_{i}"])}</h3><p>{h(T[f"step_{i}n"])}</p></div></li>'
        for i in range(1, 5))


def pillars_html(T):
    """Les trois qualités d'un Smart Binder, en cases pleines."""
    return ''.join(
        f'<article class="pillar glass panel reveal" style="--i:{i - 1}"><span class="pillar__ico">{ICONS[k]}</span><h3>{h(T[f"pillar_{i}"])}</h3><p>{h(T[f"pillar_{i}n"])}</p></article>'
        for i, k in ((1, 'ph'), (2, 'fold'), (3, 'gentle')))


def home_targets(lg, T):
    """Les cartes des trois cibles, d'après assets/data/programs.json."""
    out = ''
    for i, p in enumerate(PROGRAMS['programs']):
        apps = ''.join(f'<li>{h(L(x, lg))}</li>' for x in p['applications'])
        out += (f'<article class="target glass panel reveal" style="--i:{i}">'
                f'<p class="target__area">{h(L(p["area"], lg))}</p>'
                f'<h3 class="target__name">{h(L(p["name"], lg))}</h3>'
                f'<p class="target__full">{h(L(p["full"], lg))}</p>'
                f'<p class="target__sub">{h(T["tg_more"])}</p>'
                f'<ul class="target__apps">{apps}</ul>'
                f'<a class="target__go" href="tech.html#{a(p["id"])}">{h(T["tg_go"])}{ARROW}</a></article>')
    return out


def build_index(lg):
    T = STR[lg]
    P = '' if lg == 'fr' else '../'
    idea = ''.join(
        f'<li class="pillar glass panel reveal" style="--i:{i - 1}"><span class="idea__n">0{i}</span><h3 class="idea__h">{h(T[f"idea_{i}"])}</h3><p class="idea__p">{h(T[f"idea_{i}n"])}</p></li>'
        for i in range(1, 4))
    main = f'''<section class="hero" id="top">
  <div class="hero__copy container">
    <h1 class="hero__title"><span class="hero__line">{h(T['home_h1_a'])} <em class="accent">{h(T['home_h1_b'])}</em></span> <span class="hero__line">{h(T['home_h1_c'])}</span></h1>
    <p class="hero__lead">{hb(T['home_lead'])}</p>
    <div class="hero__cta">
      <a class="btn btn--light btn--lg" href="tech.html">{h(T['cta_tech'])}{ARROW}</a>
      <a class="btn btn--ghost btn--lg" href="index.html#contact">{h(T['cta_partner'])}</a>
    </div>
  </div>
  <p class="sr-only">{h(T['art_alt'])}</p>
  <button class="sr-only sr-only--focus" type="button" data-fish-wave>{h(T['fish_touch'])}</button>
</section>

<section class="sec idea" id="idea" data-station="1">
  <div class="container">
    <div class="who" id="who">
      <p class="eyebrow reveal">{h(T['who_eyebrow'])}</p>
      <p class="who__p reveal">{hb(T['who_p'])}</p>
    </div>
    <h2 class="eyebrow idea__eyebrow reveal">{h(T['idea_eyebrow'])}</h2>
    <ol class="idea__list pillars">{idea}</ol>
  </div>
</section>

<section class="sec nova" id="nova" data-station="2">
  <div class="container nova__grid">
    <div class="nova__copy">
      <p class="eyebrow reveal">{h(T['nova_eyebrow'])}</p>
      <h2 class="h2 reveal">{h(T['nova_h2'])}</h2>
      <p class="lead reveal">{h(T['nova_lead'])}</p>
      <ol class="steps">{steps_html(T)}</ol>
    </div>
  </div>
</section>

<section class="sec binders" id="binders" data-station="3">
  <div class="container">
    <div class="sec__head">
      <p class="eyebrow reveal">{h(T['class_eyebrow'])}</p>
      <h2 class="h2 reveal">{h(T['class_h2'])}</h2>
      <p class="lead reveal">{hb(T['class_lead'])}</p>
    </div>
    <div class="pillars">{pillars_html(T)}</div>
  </div>
</section>

<section class="sec targets" id="targets" data-station="4">
  <div class="container">
    <div class="sec__head">
      <p class="eyebrow reveal">{h(T['tg_eyebrow'])}</p>
      <h2 class="h2 reveal">{h(T['tg_h2'])}</h2>
      <p class="lead reveal">{h(T['tg_lead'])}</p>
    </div>
    <div class="targets__grid">{home_targets(lg, T)}</div>
    <div class="targets__cta reveal"><a class="btn btn--light btn--lg" href="tech.html">{h(T['cta_tech'])}{ARROW}</a></div>
  </div>
</section>

<section class="sec sec--tight about" id="about">
  <div class="container">
    <div class="sec__head">
      <p class="eyebrow reveal">{h(T['drive_eyebrow'])}</p>
      <h2 class="h2 reveal">{h(T['drive_h2'])}</h2>
    </div>
    <div class="cards3">{drive_html(T)}</div>
  </div>
</section>

<section class="sec" id="contact">
  <div class="container">
    <div class="contact glass reveal">
      <div class="contact__copy">
        <p class="eyebrow">{h(T['contact_eyebrow'])}</p>
        <h2 class="h2">{h(T['contact_h2'])}</h2>
        <p class="lead">{h(T['contact_p'])}</p>
      </div>
      <ul class="contact__list">{contact_rows(T, lg)}</ul>
    </div>
  </div>
</section>
</section>'''
    return page('index', lg, main, extra_before_main='<canvas id="scene" class="scene" aria-hidden="true"></canvas>\n')


# ------------------------------------------------------------------ notre technologie
def tech_targets(lg, T):
    """Une grande carte par cible : ce qu'elle fait, ses applications potentielles, notre approche."""
    out = ''
    for i, p in enumerate(PROGRAMS['programs'], 1):
        apps = ''.join(f'<li class="reveal" style="--i:{j}"><span class="where__dot" aria-hidden="true"></span>{h(L(x, lg))}</li>' for j, x in enumerate(p['applications']))
        link = f'<a class="btn btn--ghost" href="program.html#{a(p["id"])}">{h(T["t_view"])}{ARROW}</a>' if p.get('detail') else ''
        out += f'''<article class="tcard glass panel reveal" id="{a(p['id'])}">
  <div class="tcard__head">
    <p class="tcard__n">0{i}</p>
    <p class="eyebrow">{h(L(p['area'], lg))}</p>
    <h3 class="tcard__name">{h(L(p['name'], lg))}</h3>
    <p class="tcard__full">{h(L(p['full'], lg))}</p>
  </div>
  <div class="tcard__body">
    <p class="tcard__role">{h(L(p['role'], lg))}</p>
    <h4 class="tcard__sub">{h(T['t_apps'])}</h4>
    <ul class="where tcard__apps">{apps}</ul>
    <h4 class="tcard__sub">{h(T['t_approach'])}</h4>
    <p class="tcard__approach">{h(L(p['approach'], lg))}</p>
    {link}
  </div>
</article>'''
    return out


def build_tech(lg):
    T = STR[lg]
    main = f'''<section class="pagehead">
  <div class="container pagehead__grid pagehead__grid--art">
    <div>
      <p class="eyebrow">{h(T['tech_eyebrow'])}</p>
      <h1 class="h1 h1--wide">{h(T['tech_h1'])}</h1>
      <p class="lead">{hb(T['tech_lead'])}</p>
    </div>
    <div class="phero__art pagehead__art" aria-hidden="true"></div>
  </div>
</section>

<section class="sec sec--tight" id="agent">
  <div class="container split">
    <div>
      <p class="eyebrow reveal">{h(T['agent_eyebrow'])}</p>
      <h2 class="h2 reveal">{h(T['agent_h2'])}</h2>
      <p class="lead reveal">{h(T['agent_lead'])}</p>
    </div>
    <ol class="steps">{steps_html(T)}</ol>
  </div>
</section>

<section class="sec sec--tight" id="binders">
  <div class="container">
    <div class="sec__head">
      <p class="eyebrow reveal">{h(T['sb_eyebrow'])}</p>
      <h2 class="h2 reveal">{h(T['sb_h2'])}</h2>
      <p class="lead reveal">{hb(T['class_lead'])}</p>
    </div>
    <div class="pillars">{pillars_html(T)}</div>
  </div>
</section>

<section class="sec sec--tight" id="targets">
  <div class="container">
    <div class="sec__head">
      <p class="eyebrow reveal">{h(T['targets_eyebrow'])}</p>
      <h2 class="h2 reveal">{h(T['targets_h2'])}</h2>
      <p class="lead reveal">{h(T['targets_lead'])}</p>
    </div>
    <div class="tcards">{tech_targets(lg, T)}</div>
  </div>
</section>

<section class="sec sec--tight" id="goal">
  <div class="container">
    <div class="goal glass panel reveal">
      <p class="eyebrow">{h(T['goal_eyebrow'])}</p>
      <h2 class="goal__h">{h(T['goal_h2'])}</h2>
      <p class="lead">{h(T['goal_p'])}</p>
    </div>
    <p class="disclaimer">{h(T['tech_note'])}</p>
  </div>
</section>

<section class="sec end">
  <div class="container">
    <div class="end__in glass reveal">
      <h2 class="end__h end__h--sm">{h(T['end_h2'])}</h2>
      <p class="lead">{h(T['end_p'])}</p>
      <div class="hero__cta">
        <a class="btn btn--light btn--lg" href="index.html#contact">{h(T['cta_partner'])}{ARROW}</a>
        <a class="btn btn--ghost btn--lg" data-mail="email" href="mailto:{a(SITE['email'])}">{h(SITE['email'])}</a>
      </div>
    </div>
  </div>
</section>'''
    return page('tech', lg, main, extra_before_main='<canvas id="protein" class="protein" aria-hidden="true"></canvas>\n')


# ------------------------------------------------------------------ programme
def build_program(lg):
    T = STR[lg]
    main = f'''<div class="prog" id="prog" aria-live="polite"><noscript><p class="container note">{h(T['noscript_prog'])}</p></noscript></div>'''
    return page('program', lg, main, extra_before_main='<canvas id="protein" class="protein" aria-hidden="true"></canvas>\n')


# ------------------------------------------------------------------ à propos, fusionné dans l'accueil
def contact_rows(T, lg):
    rows = [('contact_partners', SITE['email']), ('contact_careers', SITE['careersEmail'])]
    keys = ['email', 'careersEmail']
    out = ''
    for (label, addr), k in zip(rows, keys):
        out += (f'<li><span class="contact__k">{h(T[label])}</span>'
                f'<a class="contact__v" data-mail="{k}" href="mailto:{a(addr)}">{h(addr)}</a>'
                f'<button class="copy" type="button" data-copy="{a(addr)}" data-mailkey="{k}"></button></li>')
    return out


def drive_html(T):
    return ''.join(
        f'<article class="card glass panel reveal" style="--i:{i - 1}"><span class="pillar__ico">{ICONS[k]}</span><h3>{h(T[f"drive_{i}"])}</h3><p>{h(T[f"drive_{i}n"])}</p></article>'
        for i, k in ((1, 'compass'), (2, 'precise'), (3, 'heart')))


# ------------------------------------------------------------------ carrières
def mailrow(key, addr):
    """L'adresse en toutes lettres, avec son bouton Copier : un lien mailto: ne s'ouvre pas partout."""
    return (f'<p class="mailrow"><a data-mail="{key}" href="mailto:{a(addr)}">{h(addr)}</a>'
            f'<button class="copy" type="button" data-copy="{a(addr)}" data-mailkey="{key}"></button></p>')


def build_careers(lg):
    T = STR[lg]
    why = ''.join(
        f'<article class="card glass reveal"><span class="pillar__ico">{ICONS[k]}</span><h3>{h(T[f"why_{i}"])}</h3><p>{h(T[f"why_{i}n"])}</p></article>'
        for i, k in ((1, 'team'), (2, 'globe'), (3, 'grow')))
    quals = ''.join(
        f'<li class="qual reveal"><span class="qual__w">{h(T[f"q_{i}"])}</span><span class="qual__p">{h(T[f"q_{i}n"])}</span></li>'
        for i in range(1, 6))
    skills = ''.join(f'<li class="chip reveal">{h(T[f"sk_{i}"])}</li>' for i in range(1, 9))
    jobs = ''
    for i in range(1, 5):
        subject = quote(f"{T['mail_subject_apply']} {T[f'job_{i}']}")
        jobs += (f'<article class="job glass reveal"><div class="job__main"><p class="job__tag">{h(T[f"job_{i}_team"])} · {h(T["job_full"])}</p>'
                 f'<h3>{h(T[f"job_{i}"])}</h3><p>{h(T[f"job_{i}n"])}</p></div>'
                 f'<a class="btn btn--ghost" data-mail="careersEmail" data-subject="{subject}" href="mailto:{a(SITE["careersEmail"])}?subject={subject}">{h(T["job_apply"])}{ARROW}</a></article>')
    end_subject = quote(T['mail_subject_apply'])
    main = f'''<section class="pagehead">
  <div class="container">
    <p class="eyebrow">{h(T['car_eyebrow'])}</p>
    <h1 class="h1 h1--wide">{h(T['car_h1'])}</h1>
    <p class="lead">{h(T['car_lead'])}</p>
  </div>
</section>

<section class="sec sec--tight">
  <div class="container">
    <div class="sec__head">
      <p class="eyebrow reveal">{h(T['why_eyebrow'])}</p>
      <h2 class="h2 reveal">{h(T['why_h2'])}</h2>
    </div>
    <div class="cards3">{why}</div>
  </div>
</section>

<section class="sec sec--tight">
  <div class="container">
    <div class="sec__head">
      <p class="eyebrow reveal">{h(T['prof_eyebrow'])}</p>
      <h2 class="h2 reveal">{h(T['prof_h2'])}</h2>
    </div>
    <ol class="quals">{quals}</ol>
  </div>
</section>

<section class="sec sec--tight">
  <div class="container">
    <div class="sec__head">
      <p class="eyebrow reveal">{h(T['skill_eyebrow'])}</p>
      <h2 class="h2 reveal">{h(T['skill_h2'])}</h2>
      <p class="lead reveal">{h(T['skill_lead'])}</p>
    </div>
    <ul class="chips">{skills}</ul>
  </div>
</section>

<section class="sec sec--tight" id="jobs">
  <div class="container">
    <div class="sec__head">
      <p class="eyebrow reveal">{h(T['jobs_eyebrow'])}</p>
      <h2 class="h2 reveal">{h(T['jobs_h2'])}</h2>
      <p class="lead reveal">{h(T['jobs_lead'])}</p>
      {mailrow('careersEmail', SITE['careersEmail'])}
    </div>
    <div class="jobs">{jobs}</div>
  </div>
</section>

<section class="sec end">
  <div class="container">
    <div class="end__in glass reveal">
      <h2 class="end__h end__h--sm">{h(T['car_end_h2'])}</h2>
      <p class="lead">{h(T['car_end_p'])}</p>
      <div class="hero__cta">
        <a class="btn btn--light btn--lg" data-mail="careersEmail" data-subject="{end_subject}" href="mailto:{a(SITE['careersEmail'])}?subject={end_subject}">{h(T['car_end_cta'])}{ARROW}</a>
      </div>
      {mailrow('careersEmail', SITE['careersEmail'])}
    </div>
  </div>
</section>'''
    return page('careers', lg, main)


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
        head_attrs = re.findall(r'<meta (?:name="description"|property="og:[a-z]+") content="([^"]*)"', src)
        out += [unescape(t) for t in head_attrs]
        out += [unescape(t) for t in re.findall(r'<title>([^<]*)</title>', src)]
        return [t.strip() for t in out if t.strip()]


def walk_strings(o, path=''):
    if isinstance(o, dict):
        for k, v in o.items():
            if k.startswith('_') or k in ('id', 'detail', 'updated'):
                continue
            yield from walk_strings(v, f'{path}.{k}')
    elif isinstance(o, list):
        for i, v in enumerate(o):
            yield from walk_strings(v, f'{path}[{i}]')
    elif isinstance(o, str):
        yield path, o


def check_data():
    for path, s in walk_strings(PROGRAMS):
        if BAD.search(s):
            problems.append(f'programs.json {path} contient un caractère interdit {s!r}')
    # chaque champ {fr, en} doit avoir les deux langues
    def langs(o, path=''):
        if isinstance(o, dict):
            if set(o) & {'fr', 'en'}:
                if set(o) != {'fr', 'en'} or not o['fr'] or not o['en']:
                    problems.append(f'programs.json {path} doit avoir fr et en')
            else:
                for k, v in o.items():
                    langs(v, f'{path}.{k}')
        elif isinstance(o, list):
            for i, v in enumerate(o):
                langs(v, f'{path}[{i}]')
    langs(PROGRAMS['programs'], 'programs')


def check(name, src):
    for t in Text.of(src):
        if BAD.search(t):
            problems.append(f'{name} texte visible interdit {t!r}')


def main():
    check_data()
    builders = {'index': build_index, 'tech': build_tech, 'program': build_program, 'careers': build_careers}
    (ROOT / 'en').mkdir(exist_ok=True)
    out = []
    for lg in ('fr', 'en'):
        for name, fn in builders.items():
            src = fn(lg)
            path = ROOT / ('en' if lg == 'en' else '.') / f'{name}.html'
            check(str(path.relative_to(ROOT)), src)
            out.append((path, src))
    if problems:
        print('PROBLEMES')
        for p in problems:
            print(' -', p)
        sys.exit(1)
    for path, src in out:
        path.write_text(src, encoding='utf-8')
    print('ok', len(out), 'pages')


if __name__ == '__main__':
    main()
