#!/usr/bin/env python3
"""Driver for pushing captured screens into Figma.

  driver.py images  CAP SCREEN...          -> prints list of image files still to upload (writes CAP/pending.json)
  driver.py upload  CAP URLS.json          -> POSTs pending images to upload URLs, stores hashes in CAP/hashes.json
  driver.py carrier CAP OUT.svg SCREEN...  -> builds base64 carrier SVG with builder + payload
  driver.py post    FILE URL               -> POSTs one file, prints JSON
"""
import base64, json, os, sys, subprocess, html, re
from urllib.parse import urlparse, unquote

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PUBLIC = ['index', 'ready-ppts', 'order', 'service', 'about', 'contact', 'track', 'account', 'ai-ppt', 'view', 'thank-you',
          'chapters', 'papers', 'state-board', 'state-books', 'study-notes-pdf', 'cbse-date-sheet-2027', 'bihar-board-class-10-syllabus',
          'bihar-board-class-12-syllabus', 'educational-ppt', 'student-ppt', 'ready-made-ppt', 'custom-ppt-design', 'cbse-icse-state-board-ppt',
          'lecture-recording-video-editing', 'delivery', 'privacy', 'refund', 'terms']
TITLES = {'index': 'Home', 'ready-ppts': 'Ready PPTs (shop)', 'order': 'Order form', 'service': 'Services', 'about': 'About', 'contact': 'Contact',
          'track': 'Track order', 'account': 'My PPTs / Account', 'ai-ppt': 'AI PPT maker', 'view': 'File viewer', 'thank-you': 'Thank you',
          'chapters': 'Chapters', 'papers': 'Papers (PYQ)', 'state-board': 'State board', 'state-books': 'State books', 'study-notes-pdf': 'Study notes PDF',
          'cbse-date-sheet-2027': 'CBSE date sheet 2027', 'bihar-board-class-10-syllabus': 'Bihar Board 10 syllabus', 'bihar-board-class-12-syllabus': 'Bihar Board 12 syllabus',
          'educational-ppt': 'SEO: Educational PPT', 'student-ppt': 'SEO: Student PPT', 'ready-made-ppt': 'SEO: Ready-made PPT', 'custom-ppt-design': 'SEO: Custom PPT design',
          'cbse-icse-state-board-ppt': 'SEO: CBSE/ICSE/State PPT', 'lecture-recording-video-editing': 'SEO: Lecture video editing',
          'delivery': 'Delivery policy', 'privacy': 'Privacy policy', 'refund': 'Refund policy', 'terms': 'Terms'}
ADMIN = ['login', 'dash', 'stats', 'report', 'orders', 'sales', 'customers', 'coupons', 'messages', 'reviews', 'ppts', 'notes', 'cfiles', 'themes', 'prices', 'menu', 'site', 'settings']
ATITLES = {'login': 'Login', 'dash': 'Dashboard', 'stats': 'Analytics', 'report': 'Revenue report', 'orders': 'Orders', 'sales': 'Online sales', 'customers': 'Customers',
           'coupons': 'Coupons', 'messages': 'Inbox', 'reviews': 'Reviews', 'ppts': 'Ready PPTs', 'notes': 'Study notes', 'cfiles': 'Category files', 'themes': 'Themes',
           'prices': 'Pricing', 'menu': 'Category menu', 'site': 'Site controls', 'settings': 'Settings'}
MAXH = 6000


def load(cap, s):
    return json.load(open(os.path.join(cap, 'json', s + '.json')))


def img_file(src):
    if src.startswith('file:'):
        return src[5:]
    u = urlparse(src)
    if u.hostname == 'localhost':
        p = os.path.join(REPO, unquote(u.path).lstrip('/'))
        if os.path.isfile(p):
            return p
        m = re.match(r'/uploads/themes/samples/(.*)', unquote(u.path))
    return None


def sha(f):
    import hashlib
    g = as_png(f) if f.endswith('.webp') and os.path.exists(os.path.join('/tmp', 'figpng', os.path.basename(f) + '.png')) else f
    return hashlib.sha1(open(g, 'rb').read()).hexdigest()


def uploaded(cap):
    hp = os.path.join(cap, 'hashes.json')
    return set(json.load(open(hp)).values()) if os.path.exists(hp) else set()


def mime(p):
    e = p.rsplit('.', 1)[-1].lower()
    return {'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'webp': 'image/webp', 'gif': 'image/gif', 'svg': 'image/svg+xml'}.get(e)


def placements(cap):
    """Grid of sections: website page and admin page."""
    have = set(f[:-5] for f in os.listdir(os.path.join(cap, 'json')))
    out = {}
    def hgt(s):
        return (min(load(cap, s)['root']['h'], MAXH) if s.startswith('admin') else load(cap, s)['root']['h']) if s in have else 900
    # website: 5 sections per row, each section holds desktop + phone
    col, x, y, rowh = 0, 0, 0, 0
    for i, p in enumerate(PUBLIC):
        d, m = f'site-{p}-d', f'site-{p}-m'
        h = max(hgt(d), hgt(m)) + 200
        sw = 100 + 1440 + 120 + 390 + 100
        out[d] = dict(page='site', section=f'{i+1:02d} · {TITLES[p]}', sx=x, sy=y, sw=sw, sh=h, fx=100, fy=100, name=f'{TITLES[p]} — Desktop')
        out[m] = dict(page='site', section=f'{i+1:02d} · {TITLES[p]}', sx=x, sy=y, sw=sw, sh=h, fx=100 + 1440 + 120, fy=100, name=f'{TITLES[p]} — Phone')
        rowh = max(rowh, h); col += 1; x += sw + 200
        if col == 5:
            col, x, y, rowh = 0, 0, y + rowh + 300, 0
    col, x, y, rowh = 0, 0, 0, 0
    for i, t in enumerate(ADMIN):
        d = f'admin-{t}-d'
        h = hgt(d) + 200; sw = 1640
        out[d] = dict(page='admin', section=f'{i+1:02d} · {ATITLES[t]}', sx=x, sy=y, sw=sw, sh=h, fx=100, fy=100, name=f'Admin · {ATITLES[t]}')
        rowh = max(rowh, h); col += 1; x += sw + 200
        if col == 6:
            col, x, y, rowh = 0, 0, y + rowh + 300, 0
    return out


def clamp(root, key=''):
    if not key.startswith('admin') or root['h'] <= MAXH:
        return root
    def keep(n):
        return n['y'] < MAXH
    def rec(n):
        if 'ch' in n:
            n['ch'] = [rec(c) for c in n['ch'] if keep(c)]
        return n
    root['h'] = MAXH
    return rec(root)


def cmd_images(cap, screens):
    hashes = json.load(open(os.path.join(cap, 'hashes.json'))) if os.path.exists(os.path.join(cap, 'hashes.json')) else {}
    pend = []; up = uploaded(cap)
    for s in screens:
        for src in load(cap, s)['images']:
            f = img_file(src)
            if f and mime(f) and sha(f) not in up and f not in pend and os.path.getsize(f) < 9_500_000:
                pend.append(f)
    json.dump(pend, open(os.path.join(cap, 'pending.json'), 'w'))
    print(len(pend))


def post(f, url, retry=True):
    r = subprocess.run(['curl', '-sS', '-X', 'POST', '-F', f'file=@{f};type={mime(f)}', url], capture_output=True, text=True)
    try:
        return json.loads(r.stdout)
    except Exception:
        return {'success': False, 'error': (r.stdout + r.stderr)[:300]}


def as_png(f):
    from PIL import Image
    out = os.path.join('/tmp', 'figpng', os.path.basename(f) + '.png')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    Image.open(f).convert('RGBA').save(out)
    return out


def cmd_upload(cap, urls_file):
    urls = [u['submitUrl'] if isinstance(u, dict) else u for u in json.load(open(urls_file))]
    pend = json.load(open(os.path.join(cap, 'pending.json')))
    hp = os.path.join(cap, 'hashes.json')
    hashes = json.load(open(hp)) if os.path.exists(hp) else {}
    placed = []
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(8) as ex:
        res = list(ex.map(lambda fu: (fu[0], post(as_png(fu[0]) if fu[0].endswith('.webp') else fu[0], fu[1])), zip(pend, urls)))
    for f, r in res:
        if r.get('success'):
            hashes[f + '#' + r['imageHash'][:8]] = r['imageHash']; placed.append(r.get('placedOnNodeId'))
        else:
            print('FAIL', f, r)
    json.dump(hashes, open(hp, 'w'))
    pp = os.path.join(cap, 'placed.json')
    old = json.load(open(pp)) if os.path.exists(pp) else []
    json.dump(old + [p for p in placed if p], open(pp, 'w'))
    print('uploaded', len(placed))


def cmd_carrier(cap, out, screens):
    hp = os.path.join(cap, 'hashes.json')
    hashes = json.load(open(hp)) if os.path.exists(hp) else {}
    pl = placements(cap)
    payload = []; up = uploaded(cap)
    for s in screens:
        d = load(cap, s)
        hs = {}
        for i, src in enumerate(d['images']):
            f = img_file(src)
            if f and mime(f) and sha(f) in up:
                hs[str(i)] = sha(f)
        p = pl[s]
        payload.append(dict(name=p['name'], section=p['section'], sx=p['sx'], sy=p['sy'], sw=p['sw'], sh=p['sh'], fx=p['fx'], fy=p['fy'], root=clamp(d['root'], s), hashes=hs, key=s))
    builder = open(os.path.join(os.path.dirname(__file__), 'builder.js')).read()
    def chunks(b):
        s = base64.b64encode(b.encode('utf-8')).decode()
        return [s[i:i + 30000] for i in range(0, len(s), 30000)]
    parts = []
    for gid, body in (('BUILDER', builder), ('PAYLOAD', json.dumps(payload, separators=(',', ':')))):
        texts = ''.join(f'<text x="0" y="{10 + i * 12}" font-family="Inter" font-size="10">{c}</text>' for i, c in enumerate(chunks(body)))
        parts.append(f'<g id="{gid}">{texts}</g>')
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">{"".join(parts)}</svg>'
    open(out, 'w').write(svg)
    print(out, len(svg))


if __name__ == '__main__':
    c = sys.argv[1]
    if c == 'images': cmd_images(sys.argv[2], sys.argv[3:])
    elif c == 'upload': cmd_upload(sys.argv[2], sys.argv[3])
    elif c == 'carrier': cmd_carrier(sys.argv[2], sys.argv[3], sys.argv[4:])
    elif c == 'post': print(json.dumps(post(sys.argv[2], sys.argv[3])))
    elif c == 'place': print(json.dumps(placements(sys.argv[2]), indent=0))
