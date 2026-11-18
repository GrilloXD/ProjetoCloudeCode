"""Referência independente dos cálculos da calculadora (Python puro). Gera casos e compara com os resultados do navegador."""
import json, random, sys, math
sys.stdout.reconfigure(encoding='utf-8')
modo, W = sys.argv[1], sys.argv[2]
random.seed(20261117)

def price(pv, i, n):
    return pv / n if i == 0 else pv * i * (1 + i) ** n / ((1 + i) ** n - 1)

def sac_total(pv, i, n):
    saldo, tot = pv, 0.0
    for t in range(n):
        j = saldo * i; a = pv / n; tot += a + j; saldo -= a
    return tot

def taxa_implicita(pv, p, n):
    lo, hi = 1e-12, 5.0
    f = lambda i: sum(p / (1 + i) ** t for t in range(1, n + 1)) - pv
    for _ in range(300):
        mid = (lo + hi) / 2
        if f(mid) > 0: lo = mid
        else: hi = mid
    return (lo + hi) / 2

def saldo_price(pv, i, n, pagas):
    from decimal import Decimal as D, getcontext
    getcontext().prec = 60
    pv, i = D(repr(pv)), D(repr(i))
    p = pv * i * (1 + i) ** n / ((1 + i) ** n - 1); s = pv
    for _ in range(pagas): s = s * (1 + i) - p
    return float(s)

def consorcio(cred, prazo, adm, fr, seg, reaj):
    pago, lst = 0.0, []
    for t in range(1, prazo + 1):
        bem = cred * (1 + reaj / 100) ** ((t - 1) // 12)
        parc = bem / prazo * (1 + (adm + fr) / 100) + seg
        pago += parc; lst.append((t, bem, parc, pago))
    return lst

def vpl_cons(lst, k, i):
    s = lst[k - 1][1] / (1 + i) ** k
    for t, bem, parc, pago in lst: s -= parc / (1 + i) ** t
    return s

def indebito(v, ini, fim):
    a = list(map(int, ini.split('-'))); b = list(map(int, fim.split('-')))
    antes = depois = 0.0; y, m = a
    while (y, m) <= tuple(b):
        if (y, m) <= (2021, 3): antes += v
        else: depois += v
        m += 1
        if m > 12: m, y = 1, y + 1
    return antes, depois

if modo == 'gerar':
    casos = []
    for _ in range(300):
        casos.append({'pv': round(random.uniform(500, 300000), 2), 'i': round(random.uniform(0.0, 0.12), 6) if random.random() > 0.05 else 0.0, 'n': random.randint(1, 420)})
    cons = []
    for _ in range(80):
        cons.append({'cred': round(random.uniform(10000, 400000), 2), 'prazo': random.randint(12, 200), 'adm': round(random.uniform(8, 25), 2), 'fr': round(random.uniform(0, 4), 2), 'seg': round(random.uniform(0, 80), 2), 'reaj': round(random.choice([0, random.uniform(0, 10)]), 2)})
    ind = []
    for _ in range(60):
        y1 = random.randint(2015, 2025); m1 = random.randint(1, 12); dur = random.randint(1, 120)
        y2, m2 = y1 + (m1 - 1 + dur - 1) // 12, (m1 - 1 + dur - 1) % 12 + 1
        ind.append({'v': round(random.uniform(10, 900), 2), 'ini': '%04d-%02d' % (y1, m1), 'fim': '%04d-%02d' % (y2, m2)})
    json.dump({'casos': casos, 'cons': cons, 'ind': ind}, open(W + '/out/tests/casos.json', 'w'))
    print('casos gerados')
else:
    C = json.load(open(W + '/out/tests/casos.json')); R = json.load(open(W + '/out/tests/res_calc.json', encoding='utf-8'))
    erros = []
    def ok(nome, esperado, obtido, tol=1e-6, rel=1e-9):
        if esperado is None or obtido is None:
            if esperado != obtido: erros.append((nome, esperado, obtido))
            return
        if abs(esperado - obtido) > max(tol, rel * abs(esperado)): erros.append((nome, esperado, obtido))
    for k, (c, r) in enumerate(zip(C['casos'], R['casos'])):
        pv, i, n = c['pv'], c['i'], c['n']
        ok('price %d' % k, price(pv, i, n), r['cxPmt'], 1e-7, 1e-10)
        if i > 0:
            ok('tabelaPrice %d' % k, price(pv, i, n), r['tabelaPrice'], 1e-7, 1e-10)
            ok('tabelaSAC total %d' % k, sac_total(pv, i, n), r['tabelaSACtotal'], 1e-6, 1e-10)
            ok('rotativo %d' % k, pv * ((1 + i) ** n - 1), r['rotativo'], 1e-5, 1e-9)
            ok('aaEfetiva %d' % k, ((1 + i) ** 12 - 1) * 100, r['aaEfetiva'], 1e-9, 1e-12)
            p = price(pv, i, n)
            if n > 1: ok('taxaImplicita %d' % k, taxa_implicita(pv, p, n), r['taxaImpl'], 1e-9, 1e-6)
            ok('tabela price total %d' % k, p * n, r['cxTabelaTotal'], 1e-5, 1e-10)
            ok('tabela sac total %d' % k, sac_total(pv, i, n), r['cxTabelaSacTotal'], 1e-5, 1e-10)
            ok('tabela saldo final %d' % k, 0.0, r['cxTabelaSaldoFinal'], 1e-6)
            pagas = n // 3
            if 0 < pagas < n:
                ok('quitacao = saldo price %d' % k, saldo_price(pv, i, n, pagas), r['quitacao'], 1e-5, 1e-9)
                m = max(1, (n - pagas) // 4)
                pres = sum(p / (1 + i) ** t for t in range(n - pagas - m + 1, n - pagas + 1))
                ok('antecipacao parcial %d' % k, pres, r['antecipacao'], 1e-6, 1e-10)
    for k, (c, r) in enumerate(zip(C['cons'], R['cons'])):
        lst = consorcio(c['cred'], c['prazo'], c['adm'], c['fr'], c['seg'], c['reaj'])
        ok('cons parcela1 %d' % k, lst[0][2], r['parc1'], 1e-7)
        ok('cons parcelaN %d' % k, lst[-1][2], r['parcN'], 1e-7)
        ok('cons pago %d' % k, lst[-1][3], r['pago'], 1e-5)
        if c['reaj'] == 0:
            ok('cons pago formula %d' % k, c['cred'] * (1 + (c['adm'] + c['fr']) / 100) + c['seg'] * c['prazo'], r['pago'], 1e-5)
        if r['taxaEq'] is not None:
            ok('cons VPL na taxa %d' % k, 0.0, vpl_cons(lst, r['k'], r['taxaEq']), 1e-3 * c['cred'] / 1000)
    for k, (c, r) in enumerate(zip(C['ind'], R['ind'])):
        a, d = indebito(c['v'], c['ini'], c['fim'])
        ok('ind antes %d' % k, a, r['antes'], 1e-6); ok('ind depois %d' % k, d, r['depois'], 1e-6)
        ok('ind dobro %d' % k, a + 2 * d, r['dobroPos'], 1e-6)
    ext = {1: 'um', 2: 'dois', 3: 'três', 5: 'cinco', 10: 'dez', 15: 'quinze', 20: 'vinte', 21: 'vinte e um', 30: 'trinta', 45: 'quarenta e cinco', 60: 'sessenta', 90: 'noventa', 99: 'noventa e nove', 100: 'cem', 120: 'cento e vinte'}
    for n, e in ext.items():
        if R['extenso'][str(n)] != e: erros.append(('extenso %d' % n, e, R['extenso'][str(n)]))
    print('verificações com erro:', len(erros))
    for e in erros[:30]: print('  ', e)
    print('extras abusividade:', json.dumps(R.get('abus'), ensure_ascii=False)[:1500])
