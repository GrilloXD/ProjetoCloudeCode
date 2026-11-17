import json, io, sys, re, os, unicodedata
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
banks = json.load(open('inst/banks.json', encoding='utf-8'))
rec = {d['ispb']: d for d in json.load(open('inst/receita_all.json', encoding='utf-8'))}
v12 = json.load(open('inst/v12_listas.json', encoding='utf-8'))
def norm(s):
    s = unicodedata.normalize('NFD', (s or '').upper()); s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'\s+', ' ', re.sub(r'[^A-Z0-9 ]', ' ', s)).strip()
STOP = {'S','A','SA','BANCO','BCO','DE','DO','DA','DOS','DAS','E','LTDA','INSTITUICAO','PAGAMENTO','IP','SOCIEDADE','CREDITO','DIRETO','SCD','FINANCIAMENTO','INVESTIMENTO','CFI','SCFI','BRASIL','MULTIPLO','COOPERATIVO','COOPERATIVA','FINANCEIRA','PAGAMENTOS'}
def toks(s): return [t for t in norm(s).split() if t not in STOP]
MIN = {'DE','DA','DO','DAS','DOS','E','EM','A','O','AS','OS','NA','NO','PARA','COM'}
MAI = {'SA','S/A','SCD','SCFI','CFI','DTVM','CTVM','IP','LTDA','ME','EPP','II','III','IV','VI','VII','VIII','IX','XI','BMG','BTG','BV','BS2','XP','C6','BRB','BNP','HSBC','JP','UBS','ABC','BR','SCM','ICBC','KDB','MUFG','BNY','CCR','CECM','QI','S/N','SN','KM','SAUN','SBS','SCN','SEPN','SGAS','SHIS','SIG','SAUS','BNDES','CEP','RS','SP','RJ','MG','PR','SC','DF','GO','BA','PE','CE','ES','MT','MS','PA','AM'}
def titulo(s):
    out = []
    for i, w in enumerate(re.split(r'(\s+|-|/|\()', (s or '').strip())):
        if not w or re.fullmatch(r'\s+|-|/|\(', w): out.append(w); continue
        u = w.upper()
        if u in ('SA', 'S.A', 'S.A.'): out.append('S.A.')
        elif u in MAI or re.fullmatch(r'[0-9]+[A-Z]{0,2}|[A-Z]\d+', u): out.append(u)
        elif u in MIN and i > 0: out.append(u.lower())
        else: out.append(u[:1] + u[1:].lower())
    return re.sub(r'\s+', ' ', ''.join(out)).strip()
def cnpjfmt(c): c = re.sub(r'\D', '', c or ''); return '%s.%s.%s/%s-%s' % (c[:2], c[2:5], c[5:8], c[8:12], c[12:]) if len(c) == 14 else ''
def cepfmt(c): c = re.sub(r'\D', '', c or '').zfill(8); return c[:5] + '-' + c[5:]
def viacep(cep):
    p = 'inst/cep/%s.json' % re.sub(r'\D', '', cep or '')
    try:
        j = json.load(open(p, encoding='utf-8'))
        return None if j.get('erro') else j
    except Exception: return None
INFRA = re.compile(r'TESOURO NACIONAL|^CIP S A$|BALCAO B3|^CAMARA|BANCO CENTRAL DO BRASIL|^SELIC$')
def endereco_receita(d):
    v = viacep(d.get('cep'))
    tipo = (d.get('descricao_tipo_de_logradouro') or '').strip(); log = (d.get('logradouro') or '').strip()
    rua = titulo((tipo + ' ' + log).strip()) if not log.upper().startswith(tipo.upper()) else titulo(log)
    if v and v.get('logradouro') and norm(log) and norm(log) in norm(v['logradouro']): rua = v['logradouro']
    num = (d.get('numero') or '').strip().upper(); comp = titulo(re.sub(r'\s+', ' ', (d.get('complemento') or '').strip()))
    if len(comp) > 45 or re.search(r'\d{6,}', comp): comp = ''  # complemento muito longo ou corrompido no CNPJ: omitido
    l = rua + (', ' + (num if num not in ('SN', 'S/N') else 's/n') if num else '') + (', ' + comp if comp else '')
    return {'l': l, 'b': (v.get('bairro') if v and v.get('bairro') else titulo(d.get('bairro') or '')),
            'm': (v.get('localidade') if v and v.get('localidade') else titulo(d.get('municipio') or '')),
            'uf': (d.get('uf') or '').upper(), 'cep': cepfmt(d.get('cep'))}
db = []
for b in banks:
    ispb = b.get('ispb'); nome = re.sub(r'\s+', ' ', (b.get('fullName') or b.get('name') or '').strip())
    if not ispb or not nome or INFRA.search(norm(nome)): continue
    if nome == nome.upper() and re.search(r'[A-Z]{4}', nome): nome = titulo(nome)
    ent = {'n': nome, 'i': ispb}
    if b.get('code') is not None: ent['k'] = str(b['code']).zfill(3)
    d = rec.get(ispb) or {}
    if d and not d.get('_erro') and d.get('logradouro'):
        a = set(norm(nome).split()); c = set(norm(d.get('razao_social')).split())
        if len(a & c) / max(1, min(len(a), len(c))) >= 0.5:
            ent['c'] = cnpjfmt(d['cnpj']); ent['r'] = titulo(d['razao_social']); ent['s'] = endereco_receita(d); ent['f'] = 'rf'
            sit = (d.get('descricao_situacao_cadastral') or '').upper()
            if sit and sit != 'ATIVA': ent['x'] = 'Situação no CNPJ: ' + sit.capitalize()
    if 's' not in ent:
        h = b.get('headquarters_address') or {}
        if h.get('street') and h.get('city'):
            ent['s'] = {'l': titulo(re.sub(r'\s+', ' ', h['street'])) + (', ' + titulo(h['complement']) if h.get('complement') else ''), 'b': titulo(h.get('district') or ''), 'm': titulo(h['city']), 'uf': (h.get('state') or '').upper(), 'cep': cepfmt(h.get('zipCode') or '')}
            ent['f'] = 'bcb'
    db.append(ent)
# vincula lista curada da v12 (nomes amigaveis + agencia RP) ao cadastro oficial
def melhor(nome):
    t = set(toks(nome)); best, bs = None, 0
    if not t: return None, 0
    for e in db:
        u = set(toks(e['n']) + toks(e.get('r', '')))
        if not u: continue
        sc = len(t & u) / len(t | (u & t) | t)
        sc = len(t & u) / max(len(t), 1)
        if sc > bs or (sc == bs and best and len(toks(e['n'])) < len(toks(best['n']))): best, bs = e, sc
    return best, bs
cur = []
manual = {'Banco do Brasil S.A.': '00000000', 'Caixa Econômica Federal': '00360305', 'Banco Santander (Brasil) S.A.': '90400888', 'Itaú Unibanco S.A.': '60701190', 'Banco Bradesco S.A.': '60746948', 'Nu Pagamentos S.A. (Nubank)': '18236120', 'Banco Inter S.A.': '00416968', 'Banco C6 S.A.': '31872495', 'Banco BMG S.A.': '61186680', 'Banco Pan S.A.': '59285411', 'Banco BV S.A.': '01858774', 'Banco Votorantim S.A.': '59588111'}
byispb = {e['i']: e for e in db}
nolink = []
for nome in v12['BANCOS_LISTA']:
    end = v12['BANCOS_RP'].get(nome, '')
    e = byispb.get(manual.get(nome, '')) if nome in manual else None
    sc = 1.0
    if not e: e, sc = melhor(nome)
    ent = {'n': nome, 'cur': 1}
    if e and sc >= 0.99:
        ent['link'] = e['i']
    else:
        nolink.append((nome, e['n'] if e else None, round(sc, 2)))
    if end:
        if 'Ribeirão Preto' in end: ent['a'] = end
        else: ent['v12'] = end
    cur.append(ent)
print('curados', len(cur), 'sem vinculo exato', len(nolink))
for x in nolink: print('  ', x)
json.dump({'db': db, 'cur': cur}, open('inst/merge_preview.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
inst12 = set(norm(x) for x in v12['INSTITUICOES_LISTA'])
dbn = set(norm(e['n']) for e in db)
faltam = sorted(x for x in v12['INSTITUICOES_LISTA'] if norm(x) not in dbn)
print('da lista ampla v12 sem correspondencia exata no BACEN atual:', len(faltam)); print(faltam[:60])

# ── vinculos manuais conferidos pelo nome oficial ──
extra_link = {'Banco Triângulo S.A. (Tribanco)': '17351180', 'Banco CSF S.A. (Carrefour)': '08357240', 'Banco do Estado do Rio Grande do Sul S.A. (Banrisul)': '92702067',
              'Banco do Estado do Pará S.A. (Banpará)': '04913711', 'Banco do Estado de Sergipe S.A. (Banese)': '13009717', 'PagSeguro Internet Instituição de Pagamento S.A. (PagBank)': '08561701'}
NAO_VINCULAR = {'Pan Financeira S.A. - CFI', 'Mercantil Financeira S.A. - CFI', 'Neon Pagamentos S.A. - Instituição de Pagamento', 'Banco Master S.A.'}
for c in cur:
    if c['n'] in NAO_VINCULAR:
        c.pop('link', None)
        end = v12['BANCOS_RP'].get(c['n'], '')
        if end and 'Ribeirão Preto' not in end: c['v12'] = end
    if c['n'] in extra_link: c['link'] = extra_link[c['n']]
INFRA_NOMES = re.compile(r'BANCO CENTRAL|SELIC|^CIP S|B3$|BALCAO B3|TESOURO NACIONAL')
extras = [{'n': x, 'sem': 1} for x in faltam if not INFRA_NOMES.search(norm(x)) and 'PARATI' not in norm(x)]
alias = [{'n': 'PARATI - CRÉDITO, FINANCIAMENTO E INVESTIMENTO S.A. (atual MEUTUDO S.A. - SCFI)', 'link': '03311443', 'd': 'Meutudo S.A. - Sociedade de Crédito, Financiamento e Investimento (antiga Parati - Crédito, Financiamento e Investimento S.A.)',
          'o': 'Mesmo CNPJ (03.311.443/0001-91), ISPB 03311443 e código 326: a razão social atual registrada é MEUTUDO S.A. - Sociedade de Crédito, Financiamento e Investimento. Endereço da sede conforme a Receita Federal; o cadastro de sedes do BACEN indica a sala 2 do mesmo conjunto. Conferir antes do envio.', 'q': 1}]
final = {'gerado': '2026-11-16', 'db': db, 'cur': cur + alias, 'ext': extras}
json.dump(final, open('out/inst_cadastro.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('final: db', len(db), 'curados+alias', len(cur) + len(alias), 'extras sem endereco', len(extras), 'bytes', os.path.getsize('out/inst_cadastro.json'))
print([c for c in cur if not c.get('link')])
