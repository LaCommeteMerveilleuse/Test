// BlackPhage - le signe. Un lambda (le bactériophage, d'où le nom) dessiné en gouttes de liquide.
// Une petite goutte, la cible, se glisse de temps en temps entre les deux pieds : le Smart Binder se referme dessus.
// Le rendu liquide vient d'un filtre SVG (flou, seuil, éclairage) : léger, net à toutes les tailles, sans WebGL.
// Couleurs de l'abysse : une perle claire qui plonge vers un bleu-vert profond, avec un reflet d'or sur le pied.

const DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
<linearGradient id="bp-liq" gradientUnits="userSpaceOnUse" x1="6" y1="2" x2="42" y2="48"><stop offset="0" stop-color="#f6fdff"/><stop offset="0.42" stop-color="#9fe6f3"/><stop offset="0.78" stop-color="#3a9fc0"/><stop offset="1" stop-color="#1b6a8a"/></linearGradient>
<filter id="bp-liquid" filterUnits="userSpaceOnUse" x="-6" y="-6" width="60" height="60" color-interpolation-filters="sRGB">
<feGaussianBlur in="SourceGraphic" stdDeviation="1.55" result="blur"/>
<feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" result="goo"/>
<feGaussianBlur in="goo" stdDeviation="1.1" result="soft"/>
<feDiffuseLighting in="soft" surfaceScale="2.4" diffuseConstant="1" lighting-color="#ffffff" result="diff"><feDistantLight azimuth="235" elevation="62"/></feDiffuseLighting>
<feComponentTransfer in="diff" result="lift"><feFuncR type="linear" slope="0.40" intercept="0.74"/><feFuncG type="linear" slope="0.40" intercept="0.74"/><feFuncB type="linear" slope="0.40" intercept="0.74"/></feComponentTransfer>
<feComposite in="lift" in2="goo" operator="in" result="liftIn"/>
<feBlend in="goo" in2="liftIn" mode="multiply" result="shaded"/>
<feSpecularLighting in="soft" surfaceScale="2.6" specularConstant="0.9" specularExponent="34" lighting-color="#fff4dc" result="spec"><fePointLight x="9" y="-6" z="24"/></feSpecularLighting>
<feComposite in="spec" in2="goo" operator="in" result="specIn"/>
<feComposite in="shaded" in2="specIn" operator="arithmetic" k1="0" k2="1" k3="1" k4="0"/>
</filter></defs></svg>`;

let ready = false;
/** Ajoute une fois les définitions partagées (dégradé et filtre) au document. */
export function mountMarkDefs() {
  if (ready || !document.body) return;
  ready = true;
  document.body.insertAdjacentHTML('afterbegin', DEFS);
}

// perles du lambda : [x, y, rayon]
const BEADS = [[12.5, 9, 4.9], [18.9, 18.1, 2.9], [25.2, 27, 3.5], [31.6, 34.2, 3.0], [38, 41, 5.0], [18.2, 34.4, 2.8], [10.4, 41, 4.7]];

/** Le signe en SVG. intro:true joue l'assemblage des gouttes (première page de la session seulement). */
export function markSvg({ intro = false, bold = false } = {}) {
  const w = bold ? 1.22 : 1;
  const beads = BEADS.map(([x, y, r], i) => `<circle cx="${x}" cy="${y}" r="${+(r * (r > 4 ? 1.06 : w)).toFixed(2)}"${intro ? ` class="bead" style="--i:${i}"` : ''}/>`).join('');
  return `<svg class="mark${intro ? ' mark--intro' : ''}" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
<g filter="url(#bp-liquid)" fill="url(#bp-liq)" stroke="url(#bp-liq)" stroke-linecap="round" stroke-linejoin="round">
<path d="M12.5 9L38 41" stroke-width="${+(4.6 * w).toFixed(2)}" fill="none"/><path d="M25.2 27L10.4 41" stroke-width="${+(4.1 * w).toFixed(2)}" fill="none"/>
${beads}<circle class="target" cx="24.2" cy="42.6" r="${bold ? 3.7 : 3.3}"/></g></svg>`;
}
