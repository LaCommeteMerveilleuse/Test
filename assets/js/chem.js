// BlackPhage — the small amount of chemistry the page displays.
// Pure functions, no DOM: everything on screen that looks like a measurement comes from here
// or from tools/build_protein.py.

/** Effective histidine pKa used for the demonstration (free imidazole ≈ 6.0; in proteins 5.5–7). */
export const HIS_PKA = 6.5;

// Reference side-chain / terminal pKa values (Lehninger); histidine is set to HIS_PKA.
const PKA_POS = { nterm: 8.0, K: 10.5, R: 12.5, H: HIS_PKA };
const PKA_NEG = { cterm: 3.1, D: 3.9, E: 4.3, C: 8.3, Y: 10.1 };

/** Henderson–Hasselbalch: fraction of a base that is protonated at `pH`. */
export function protonated(pH, pKa = HIS_PKA) {
  return 1 / (1 + Math.pow(10, pH - pKa));
}

/** Net charge of a protein of the given residue composition at `pH`. */
export function netCharge(pH, comp) {
  let q = 0;
  q += protonated(pH, PKA_POS.nterm) - 1 / (1 + Math.pow(10, PKA_NEG.cterm - pH));
  for (const [aa, n] of Object.entries(comp)) {
    if (aa in PKA_POS) q += n * protonated(pH, PKA_POS[aa]);
    if (aa in PKA_NEG) q -= n / (1 + Math.pow(10, PKA_NEG[aa] - pH));
  }
  return q;
}

/** Fraction of the way from the open to the closed conformation (0 = open, 1 = closed). */
export function closingFromPh(pH) {
  // The binding region is meant to be accessible when the histidines are protonated.
  return 1 - protonated(pH);
}

/** Reference pH of body compartments (typical literature ranges). */
export const COMPARTMENTS = [
  { id: 'endosome', label: 'Endosome', from: 5.0, to: 6.5 },
  { id: 'tissue', label: 'Tissu tumoral ou inflammatoire', from: 6.5, to: 6.9 },
  { id: 'blood', label: 'Sang', from: 7.35, to: 7.45 },
];

const fr1 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const fmt1 = (x) => fr1.format(x).replace('-', '−');
export const fmt0 = (x) => String(Math.round(x)).replace('-', '−');
