"""Génère les pages anglaises (en/*.html) à partir des pages françaises.

Le script s'occupe aussi du bloc de langue de l'en-tête de chaque page (liens hreflang et redirection
automatique selon la langue du navigateur), entre les repères langue:debut et langue:fin.

Chaque morceau de texte visible et chaque attribut textuel doit figurer dans tools/en_strings.py.
Un texte manquant fait échouer le script, pour qu'aucune phrase française ne reste dans la version anglaise.
Usage : python tools/build_en.py
"""
import re, sys, pathlib
from html import unescape
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from en_strings import EN

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = ['index', 'catalogue', 'produit', 'panier', 'sur-mesure', 'a-propos', 'careers']
ATTRS = ['placeholder', 'aria-label', 'alt', 'title', 'content']
SKIP_META = {'viewport', 'theme-color'}
missing = []

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

def lang_block(name, lang):
    f = f'{name}.html'
    fr, en = (f, 'en/' + f) if lang == 'fr' else ('../' + f, f)
    return ('<!-- langue:debut -->\n'
            f'  <link rel="alternate" hreflang="fr" href="{fr}">\n'
            f'  <link rel="alternate" hreflang="en" href="{en}">\n'
            f'  <link rel="alternate" hreflang="x-default" href="{en}">\n'
            f'  {REDIRECT}\n  <!-- langue:fin -->')

BLOCK = re.compile(r'<!-- langue:debut -->.*?<!-- langue:fin -->', re.S)

def sync_head(src, name, lang):
    block = lang_block(name, lang)
    if BLOCK.search(src):
        return BLOCK.sub(lambda m: block, src)
    return src.replace('  <link rel="icon"', '  ' + block + '\n  <link rel="icon"', 1)

def tr(s):
    key = re.sub(r'\s+', ' ', unescape(s)).strip()
    if not key:
        return s
    if key not in EN:
        missing.append(key)
        return s
    lead = re.match(r'\s*', s).group(0)
    trail = re.search(r'\s*$', s).group(0)
    return lead + EN[key] + trail

def convert(src, name):
    # contenus à ne pas traduire : script et style
    parts = re.split(r'(<script\b.*?</script>|<style\b.*?</style>)', src, flags=re.S)
    out = []
    for part in parts:
        if part.startswith('<script') or part.startswith('<style'):
            part = part.replace('src="assets/', 'src="../assets/')
            out.append(part)
            continue
        def attr(m):
            tag = m.group(0)
            if tag.startswith('<meta') and re.search(r'name="(%s)"' % '|'.join(SKIP_META), tag):
                return tag
            if tag.startswith('<meta') and 'charset' in tag:
                return tag
            for a in ATTRS:
                tag = re.sub(r'(\s%s=")([^"]*)(")' % a, lambda mm: mm.group(1) + tr(mm.group(2)).replace('"', '&quot;') + mm.group(3), tag)
            if tag.startswith('<input') and 'type="radio"' in tag:
                tag = re.sub(r'(\svalue=")([^"]*)(")', lambda mm: mm.group(1) + tr(mm.group(2)).replace('"', '&quot;') + mm.group(3), tag)
            tag = re.sub(r'(href|src)="(assets/[^"]*)"', r'\1="../\2"', tag)
            tag = re.sub(r'href="mailto:([^"?]*)\?subject=([^"]*)"', lambda mm: 'href="mailto:%s?subject=%s"' % (mm.group(1), tr_subject(mm.group(2))), tag)
            return tag
        part = re.sub(r'<[a-zA-Z][^>]*>', attr, part)
        part = re.sub(r'>([^<]+)<', lambda m: '>' + tr(m.group(1)) + '<', part)
        out.append(part)
    html = ''.join(out)
    html = html.replace('<html lang="fr">', '<html lang="en" data-lang="en" data-base="../">')
    return sync_head(html, name, 'en')

def tr_subject(enc):
    from urllib.parse import unquote, quote
    return quote(tr(unquote(enc)), safe='')

(ROOT / 'en').mkdir(exist_ok=True)
for name in PAGES:
    src = (ROOT / f'{name}.html').read_text(encoding='utf-8')
    src = sync_head(src, name, 'fr')
    (ROOT / f'{name}.html').write_text(src, encoding='utf-8')
    html = convert(src, name)
    (ROOT / 'en' / f'{name}.html').write_text(html, encoding='utf-8')
# l'importmap de l'accueil doit pointer vers le dossier parent
p = ROOT / 'en' / 'index.html'
t = p.read_text(encoding='utf-8').replace('"./assets/vendor', '"../assets/vendor')
p.write_text(t, encoding='utf-8')
if missing:
    print('TEXTES MANQUANTS')
    for m in dict.fromkeys(missing):
        print(repr(m))
    sys.exit(1)
print('ok', len(PAGES), 'pages')
