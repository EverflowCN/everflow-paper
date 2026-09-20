import unittest
from pathlib import Path
from render import escape,rich,render,merge_layers,resolve

class Safety(unittest.TestCase):
 def test_tex_injection(self):
  for s in [r'\input{/etc/passwd}',r'$\input{secret}$',r'$^^5cinput{secret}$']:
   self.assertNotIn(r'\input{',rich(s))
 def test_math(self):self.assertEqual(r'$\frac{1}{2}$',rich(r'$\frac{1}{2}$'))
 def test_escape(self):self.assertEqual(r'a\_b\%',escape('a_b%'))
 def test_original_supplement_wins(self):
  paraphrase={'stem':'summary','verification':{'status':'verified','mode':'cross-checked-paraphrase'}}
  original={'stem':'original','verification':{'status':'verified','mode':'original-paper'}}
  merged=merge_layers([{'questions':{'1':paraphrase}},{'questions':{'1':original,'2':original}}])
  self.assertEqual(merged['questions']['1'],original)
  self.assertIn('2',merged['questions'])
 def test_canonical_figures(self):
  payload={'title':'408 真题图片排版验证','layout':'compact','questions':[{'source':'zhenti','id':'2026-28'},{'source':'zhenti','id':'2026-36'},{'source':'zhenti','id':'2025-1'}]}
  questions=resolve(payload,[])
  self.assertTrue(any(q.get('figures') for q in questions))
  render(payload,questions,Path('/tmp/pdf-verification/canonical'))
 def test_compile(self):
  questions=[{'_source':'zhenti','_id':str(i),'stem':r'验证题。已知 $A=\begin{bmatrix}1&2\\3&4\end{bmatrix}$，请判断 $2^{10}$ 的值。','options':{'A':'1024','B':'2048','C':'4096','D':'8192'}} for i in range(1,21)]
  for layout in ['compact','spacious']:
   dest=Path('/tmp/pdf-verification')/layout
   pdf=render({'title':'408 组卷排版验证','layout':layout},questions,dest)
   self.assertGreater(pdf.stat().st_size,10000)
   paper_tex=(dest/'paper.tex').read_text(encoding='utf8')
   self.assertIn(r'\begin{qitems}',paper_tex)
   self.assertIn(r'\end{qitems}',paper_tex)
   tex=(dest/'questions.tex').read_text(encoding='utf8')
   if layout=='spacious':
    self.assertIn(r'\vspace*{25mm}',tex)
   else:
    self.assertNotIn(r'\vspace*{25mm}',tex)

if __name__=='__main__':unittest.main()
