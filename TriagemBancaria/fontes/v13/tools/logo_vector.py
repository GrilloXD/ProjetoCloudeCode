"""Extrai o logotipo oficial em SVG vetorial a partir do content stream do PDF do manual.
Interpreta apenas os operadores usados pelo Illustrator nesta pagina (paths, clip, fill, shading axial)."""
import re, io, sys, pymupdf
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
SRC = sys.argv[1]

def mul(m, n):  # m aplicado primeiro, depois n  (convencao PDF: novo = m x ctm)
    a, b, c, d, e, f = m; A, B, C, D, E, F = n
    return (a*A + b*C, a*B + b*D, c*A + d*C, c*B + d*D, e*A + f*C + E, e*B + f*D + F)
def ap(m, x, y):
    a, b, c, d, e, f = m
    return (a*x + c*y + e, b*x + d*y + f)
def hexc(r, g, b):
    return '#%02x%02x%02x' % tuple(int(round(max(0, min(1, v)) * 255)) for v in (r, g, b))

def interpret(cont):
    def _keep_colors(m):   # ignora texto, mas preserva operadores de cor (fazem parte do estado grafico)
        return ' ' + ' '.join(re.findall(r'(?:[-+]?\d*\.?\d+\s+){3}rg|[-+]?\d*\.?\d+\s+g', m.group(0))) + ' '
    cont = re.sub(r'BT.*?ET', _keep_colors, cont, flags=re.S)
    toks = re.findall(r'/[^\s/\[\]()<>]+|[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?|[A-Za-z\*\'"]+', cont)
    out = []          # elementos: dict(kind, d, pts, fill | grad)
    stack = []
    gs = {'ctm': (1, 0, 0, 1, 0, 0), 'fill': (0, 0, 0), 'clip': None}
    ops = []; path = []; pts = []; cur = None; pending_clip = False
    def fmt(v): return ('%.3f' % v).rstrip('0').rstrip('.')
    for t in toks:
        if re.match(r'[-+]?\d*\.?\d+', t) and not t[0].isalpha():
            ops.append(float(t)); continue
        if t.startswith('/'):
            ops.append(t); continue
        o = ops; ops = []
        if t == 'q': stack.append(dict(gs))
        elif t == 'Q': gs = stack.pop()
        elif t == 'cm': gs['ctm'] = mul(tuple(o[-6:]), gs['ctm'])
        elif t == 'm':
            x, y = ap(gs['ctm'], o[-2], o[-1]); path.append('M%s %s' % (fmt(x), fmt(y))); pts.append((x, y)); cur = (o[-2], o[-1])
        elif t == 'l':
            x, y = ap(gs['ctm'], o[-2], o[-1]); path.append('L%s %s' % (fmt(x), fmt(y))); pts.append((x, y)); cur = (o[-2], o[-1])
        elif t == 'c':
            p = [ap(gs['ctm'], o[i], o[i+1]) for i in (-6, -4, -2)]
            path.append('C' + ' '.join('%s %s' % (fmt(x), fmt(y)) for x, y in p)); pts.extend(p); cur = (o[-2], o[-1])
        elif t == 'v':
            p = [ap(gs['ctm'], cur[0], cur[1]), ap(gs['ctm'], o[-4], o[-3]), ap(gs['ctm'], o[-2], o[-1])]
            path.append('C' + ' '.join('%s %s' % (fmt(x), fmt(y)) for x, y in p)); pts.extend(p); cur = (o[-2], o[-1])
        elif t == 'y':
            p = [ap(gs['ctm'], o[-4], o[-3]), ap(gs['ctm'], o[-2], o[-1]), ap(gs['ctm'], o[-2], o[-1])]
            path.append('C' + ' '.join('%s %s' % (fmt(x), fmt(y)) for x, y in p)); pts.extend(p); cur = (o[-2], o[-1])
        elif t == 'h': path.append('Z')
        elif t == 're':
            x, y, w, h = o[-4:]
            c4 = [ap(gs['ctm'], x, y), ap(gs['ctm'], x + w, y), ap(gs['ctm'], x + w, y + h), ap(gs['ctm'], x, y + h)]
            path.append('M' + ' L'.join('%s %s' % (fmt(a), fmt(b)) for a, b in c4) + ' Z'); pts.extend(c4)
        elif t in ('W', 'W*'): pending_clip = True
        elif t in ('n', 'f', 'F', 'f*', 'B', 'b', 'S', 's'):
            if pending_clip:
                gs['clip'] = {'d': ' '.join(path), 'pts': list(pts)}; pending_clip = False
            if t in ('f', 'F', 'f*') and path:
                out.append({'kind': 'fill', 'd': ' '.join(path), 'pts': list(pts), 'fill': hexc(*gs['fill']), 'rule': 'evenodd' if t == 'f*' else 'nonzero'})
            path = []; pts = []
        elif t == 'rg': gs['fill'] = tuple(o[-3:])
        elif t == 'g': gs['fill'] = (o[-1],) * 3
        elif t == 'sh':
            if gs['clip']:
                p0 = ap(gs['ctm'], 0, 0); p1 = ap(gs['ctm'], 1, 0)
                out.append({'kind': 'grad', 'd': gs['clip']['d'], 'pts': gs['clip']['pts'], 'p0': p0, 'p1': p1})
        # demais operadores (gs, BX, EX, k, cs, etc.) ignorados
    return out

def bbox(pts):
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    return (min(xs), min(ys), max(xs), max(ys))

def build(page_no, rect_fitz, name, page_h=1080.0, pad=0.0):
    d = pymupdf.open(SRC); page = d[page_no - 1]
    els = interpret(page.read_contents().decode('latin-1'))
    # rect em coordenadas PDF (y para cima)
    X0, X1 = rect_fitz[0] - 3, rect_fitz[2] + 3
    Y0, Y1 = page_h - rect_fitz[3] - 3, page_h - rect_fitz[1] + 3
    keep = []
    for e in els:
        if not e['pts']: continue
        b = bbox(e['pts'])
        if b[0] >= X0 and b[2] <= X1 and b[1] >= Y0 and b[3] <= Y1:
            keep.append(e)
    allp = [p for e in keep for p in e['pts']]
    b = bbox(allp)  # caixa nos pontos de controle (levemente folgada)
    x0, y0, x1, y1 = rect_fitz[0] - pad, page_h - rect_fitz[3] - pad, rect_fitz[2] + pad, page_h - rect_fitz[1] + pad
    w, h = x1 - x0, y1 - y0
    def f(v): return ('%.2f' % v).rstrip('0').rstrip('.')
    defs = []; body = []
    gi = 0
    for e in keep:
        if e['kind'] == 'grad':
            gi += 1; gid = '%s-g%d' % (name, gi)
            defs.append('<linearGradient id="%s" gradientUnits="userSpaceOnUse" x1="%s" y1="%s" x2="%s" y2="%s"><stop offset="0" stop-color="#9fc440"/><stop offset="1" stop-color="#12493c"/></linearGradient>' % (gid, f(e['p0'][0]), f(e['p0'][1]), f(e['p1'][0]), f(e['p1'][1])))
            body.append('<path fill="url(#%s)" d="%s"/>' % (gid, e['d']))
        else:
            body.append('<path fill="%s"%s d="%s"/>' % (e['fill'], ' fill-rule="evenodd"' if e['rule'] == 'evenodd' else '', e['d']))
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %s %s" role="img" aria-label="Defensoria P\u00fablica do Estado de S\u00e3o Paulo"><defs>%s</defs><g transform="matrix(1 0 0 -1 %s %s)">%s</g></svg>'
           % (f(w), f(h), ''.join(defs), f(-x0), f(y1), ''.join(body)))
    open('logo/%s.svg' % name, 'w', encoding='utf-8').write(svg)
    fills = sorted(set(e.get('fill', 'grad') for e in keep))
    print(name, 'elementos', len(keep), 'grad', gi, 'fills', fills, 'viewBox', f(w), f(h), 'bytes', len(svg), 'bbox ctrl', [round(v, 1) for v in b])

build(8, (132.4, 364.2, 898.48, 479.04), 'dpesp-h-pos')
build(8, (127.36, 587.72, 895.96, 702.92), 'dpesp-h-neg')
build(5, (1099.6, 186.72, 1709.08, 453.12), 'dpesp-v-pos')
build(5, (1105.44, 583.04, 1703.4, 844.4), 'dpesp-v-neg')
