import unittest
from pathlib import Path
from render import escape,rich,render
class Safety(unittest.TestCase):
 def test_tex_injection(self):
  for s in [r'\input{/etc/passwd}',r'$\input{secret}$',r'$^^5cinput{secret}$']:
   self.assertNotIn(r'\input{',rich(s))
 def test_math(self):self.assertEqual(r'$\frac{1}{2}$',rich(r'$\frac{1}{2}$'))
 def test_escape(self):self.assertEqual(r'a\_b\%',escape('a_b%'))
 def test_compile(self):
  questions=[{'_source':'zhenti','_id':str(i),'stem':f'第 {i} 道验证题。已知 $A=\\begin{{bmatrix}}1&2\\\\3&4\\end{{bmatrix}}$，请判断 $2^{{10}}$ 的值。','options':{'A':'1024','B':'2048','C':'4096','D':'8192'}} for i in range(1,21)]
  for layout in ['compact','spacious']:
   pdf=render({'title':'408 组卷排版验证','layout':layout},questions,Path('/tmp/pdf-verification')/layout)
   self.assertGreater(pdf.stat().st_size,10000)
if __name__=='__main__':unittest.main()
