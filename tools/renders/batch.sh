#!/bin/bash
# BlackPhage - rendu final des images de synthèse (lancer de rayons, Mitsuba 3) : les huit images du carrousel.
#   pip install mitsuba opencv-python-headless pillow numpy
#   bash tools/renders/batch.sh        (compter plusieurs minutes par image ; les PNG sortent dans tools/renders/final/)
# Ensuite : convertir en WebP (1080 x 720) dans assets/img/gallery/ et décrire chaque image dans assets/data/culture-gallery.json.
cd "$(dirname "$0")"
mkdir -p final
export PYTHONPATH=.
for spec in "lab-tubes 480" "flasks-glow 480" "idea-bulb 420" "petri-pipette 420" "dna-helix 300" "desk-laptop 300" "sticky-wall 240" "paper-plane 240"; do
  set -- $spec
  nice -n 15 python3 run.py gallery $1 $2 1080 720 final/$1 6 > final/$1.log 2>&1
done
