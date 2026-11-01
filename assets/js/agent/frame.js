// BlackPhage - le repère du récepteur, partagé par la membrane, le récepteur, le ruban, la protéine G et la cascade.
// Unités arbitraires. L'axe y monte vers l'extérieur de la cellule. La membrane est la nappe horizontale autour de y = 0.
// Le récepteur est un faisceau vertical de sept hélices, au centre, qui traverse la bicouche.
// Ne pas modifier ce fichier sans prévenir : toutes les formes en dépendent.
export const FRAME = {
  thickness: 0.64,                 // la bicouche va de y = -0.32 à y = +0.32
  halfSize: 3.4,                   // demi-largeur de la nappe de membrane (x et z)
  receptor: { radius: 0.36, top: 1.0, bottom: -1.0 },   // faisceau de sept hélices autour de l'axe y, du cytoplasme (bas) à l'extérieur (haut)
  pocket: { y: 0.72, radius: 0.30, rim: 1.0 },           // la poche : entrée tout en haut (y = 1.0), fond vers y = 0.45
  ligandTip: [0.0, 0.58, 0.0],       // la pointe du ruban, plantée au fond de la poche, quand il est arrimé
  ligandTail: [0.55, 2.45, 0.2],     // l'autre bout du ruban, hors de la poche, quand il est arrimé
  gprotein: [0.0, -1.55, 0.0],       // le centre de la protéine G, sous le faisceau, quand le récepteur est activé
  cascade: [[0.0, -2.35, 0.0], [0.55, -3.15, 0.25], [-0.45, -3.95, 0.1], [0.1, -4.8, 0.0]],   // les nœuds de la cascade, vers le bas
};
