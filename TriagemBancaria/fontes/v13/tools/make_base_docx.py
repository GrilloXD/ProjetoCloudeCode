"""Gera o DOCX-base da v13 a partir do modelo institucional oficial (cabecalho com logotipo, estilos e margens preservados)."""
import zipfile, re, io, sys, base64
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
src = zipfile.ZipFile('modelo/modelo_novo.docx')
out_path = 'out/base_v13.docx'
drop = lambda n: n.startswith('[trash]/') or n == 'docProps/thumbnail.jpeg' or n == 'word/stylesWithEffects.xml'
def txt(name): return src.read(name).decode('utf-8-sig')
files = {}
for n in src.namelist():
    if drop(n): continue
    files[n] = src.read(n)
# content types / rels: remove stylesWithEffects e thumbnail
ct = txt('[Content_Types].xml')
ct = re.sub(r'<Override PartName="/word/stylesWithEffects\.xml"[^>]*/>', '', ct)
files['[Content_Types].xml'] = ct.encode('utf-8')
rels = txt('word/_rels/document.xml.rels')
rels, n1 = re.subn(r'<Relationship [^>]*Target="stylesWithEffects\.xml"[^>]*/>', '', rels); assert n1 == 1
files['word/_rels/document.xml.rels'] = rels.encode('utf-8')
root = txt('_rels/.rels')
root = re.sub(r'<Relationship [^>]*Target="docProps/thumbnail\.jpeg"[^>]*/>', '', root)
files['_rels/.rels'] = root.encode('utf-8')
# cabecalho
h = txt('word/header1.xml')
assert h.count('[UNIDADE OU SETOR]') == 1 and h.count('[SUBUNIDADE, SE HOUVER]') == 1
h = h.replace('[UNIDADE OU SETOR]', '{{CAB1}}').replace('[SUBUNIDADE, SE HOUVER]', '{{CAB2}}')
files['word/header1.xml'] = h.encode('utf-8')
# rodape
f = txt('word/footer1.xml')
a = 'Defensoria Pública do Estado de São Paulo | Rua Boa Vista, 200 - 8º andar - Centro - São Paulo/SP'
b = '+55 11 3105-9040 | www.defensoria.sp.def.br'
assert f.count(a) == 1 and f.count(b) == 1
f = f.replace(a, '{{ROD1}}').replace(b, '{{ROD2}}')
files['word/footer1.xml'] = f.encode('utf-8')
# corpo: mantem a abertura de <w:body> e o sectPr; o conteudo e gerado pelo sistema
d = txt('word/document.xml')
i = d.index('<w:body>') + len('<w:body>'); j = d.index('<w:sectPr')
d = d[:i] + '<w:p><w:r><w:t>{{CORPO}}</w:t></w:r></w:p>' + d[j:]
files['word/document.xml'] = d.encode('utf-8')
z = zipfile.ZipFile(out_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=9)
# [Content_Types].xml primeiro
order = ['[Content_Types].xml'] + [n for n in files if n != '[Content_Types].xml']
for n in order: z.writestr(n, files[n])
z.close()
raw = open(out_path, 'rb').read()
open('out/base_v13.b64', 'w').write(base64.b64encode(raw).decode())
print('base docx', len(raw), 'bytes; b64', len(base64.b64encode(raw)))
print(re.search(r'<w:sectPr.*?</w:sectPr>', d, flags=re.S).group(0))
