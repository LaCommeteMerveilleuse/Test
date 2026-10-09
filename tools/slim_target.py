#!/usr/bin/env python3
"""
Drop the buffers the site no longer reads from assets/data/adk.bin.

build_protein.py also exports the hinge-motion data of the two adenylate-kinase conformations
(per-vertex domain weights and residuals). The site now uses the protein only as a static target, so
`residual` and `weights` are removed and the remaining buffers are repacked.

Usage: python3 tools/slim_target.py [--data assets/data]
Idempotent: running it twice changes nothing the second time.
"""
import argparse
import json
import os

DROP = {'residual', 'weights'}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', default='assets/data')
    args = ap.parse_args()
    jpath = os.path.join(args.data, 'adk.json')
    bpath = os.path.join(args.data, 'adk.bin')
    meta = json.load(open(jpath))
    blob = open(bpath, 'rb').read()
    sizes = {'float32': 4, 'int8': 1, 'uint8': 1, 'int16': 2, 'uint32': 4}

    out, offset, layout = [], 0, {}
    for name, d in meta['buffers'].items():
        if name in DROP:
            continue
        nbytes = d['count'] * d['item'] * sizes[d['dtype']]
        pad = (-offset) % 4
        if pad:
            out.append(b'\0' * pad)
            offset += pad
        out.append(blob[d['offset']:d['offset'] + nbytes])
        layout[name] = dict(d, offset=offset)
        offset += nbytes

    new = b''.join(out)
    if len(new) == len(blob):
        print('already slim')
        return
    meta['buffers'] = layout
    meta.pop('residualScale', None)
    open(bpath, 'wb').write(new)
    json.dump(meta, open(jpath, 'w'), ensure_ascii=False, indent=1)
    print('adk.bin: %.2f MB -> %.2f MB' % (len(blob) / 1e6, len(new) / 1e6))


if __name__ == '__main__':
    main()
