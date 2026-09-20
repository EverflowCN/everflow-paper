import re,subprocess,unittest
from pathlib import Path
from render import escape,rich,render,merge_layers,resolve

class Safety(unittest.TestCase):
 def test_tex_injection(self):
  for s in [r'\input{/etc/passwd}',r'$\input{secret}$',r'$^^5cinput{secret}$']:
   self.assertNotIn(r'\input{',rich(s))
 def test_math(self):self.assertEqual(r'$\frac{1}{2}$',rich(r'$\frac{1}{2}$'))
 def test_ascii_blank_vs_function_call(self):
  text=rich('调用 wait()/signal()，边是()，正确的有( )个。')
  self.assertIn('wait()/signal()',text)
  self.assertEqual(text.count(r'\blank{}'),2)
  self.assertNotIn(r'wait\blank{}',text)
 def test_escape(self):self.assertEqual(r'a\_b\%',escape('a_b%'))
 def test_original_supplement_wins(self):
  paraphrase={'stem':'summary','verification':{'status':'verified','mode':'cross-checked-paraphrase'}}
  original={'stem':'original','verification':{'status':'verified','mode':'original-paper'}}
  merged=merge_layers([{'questions':{'1':paraphrase}},{'questions':{'1':original,'2':original}}])
  self.assertEqual(merged['questions']['1'],original)
  self.assertIn('2',merged['questions'])
 def test_real_relax_ascii_blanks(self):
  payload={'title':'Relax 半角空格回归','layout':'compact','questions':[
   {'source':'relax','id':'ds-5-37'},
   {'source':'relax','id':'ds-5-44'},
   {'source':'relax','id':'os-2-26'},
   {'source':'relax','id':'os-1-17'},
   {'source':'relax','id':'os-2-9'},
  ]}
  questions=resolve(payload,[])
  rendered=[rich(q.get('stem','')) for q in questions]
  self.assertIn(r'\blank{}',rendered[0])
  self.assertIn(r'\blank{}',rendered[1])
  self.assertIn(r'\blank{}',rendered[2])
  self.assertIn('sin()',rendered[3])
  self.assertIn('wait()',rendered[4])
 def test_canonical_figures(self):
  payload={'title':'408 真题图片排版验证','layout':'compact','questions':[{'source':'zhenti','id':'2026-28'},{'source':'zhenti','id':'2026-36'},{'source':'zhenti','id':'2025-1'}]}
  questions=resolve(payload,[])
  self.assertTrue(any(q.get('figures') for q in questions))
  render(payload,questions,Path('/tmp/pdf-verification/canonical'))
 def test_compile(self):
  questions=[{'_source':'zhenti','_id':str(i),'stem':r'验证题。调用 wait()/signal()，答案位置（ ）数据，另一处（ ），已知 $A=\begin{bmatrix}1&2\\3&4\end{bmatrix}$，请判断 $2^{10}$ 的值。','options':{'A':'1024','B':'2048','C':'4096','D':'8192'}} for i in range(1,21)]
  for layout in ['compact','spacious']:
   dest=Path('/tmp/pdf-verification')/layout
   pdf=render({'title':'408 组卷排版验证','layout':layout},questions,dest)
   self.assertGreater(pdf.stat().st_size,10000)
   text=subprocess.run(['pdftotext','-layout',str(pdf),'-'],capture_output=True,text=True,check=True).stdout
   for number in (1,2,3,20):
    self.assertRegex(text,rf'(?m)^\s*{number}\.\s')
   paper_tex=(dest/'paper.tex').read_text(encoding='utf8')
   self.assertIn(r'\begin{qitems}',paper_tex)
   self.assertIn(r'\end{qitems}',paper_tex)
   self.assertIn(r'\input{00-user-config/05-watermark-config.tex}',paper_tex)
   self.assertIn(r'\input{90-core/everflow-watermark-core.sty}',paper_tex)
   self.assertTrue((dest/'assets/watermark/water.png').is_file())
   self.assertIn(r'\providecommand{\EverflowExamWatermarkEnabled}{true}',(dest/'00-user-config/05-watermark-config.tex').read_text(encoding='utf8'))
   tex=(dest/'questions.tex').read_text(encoding='utf8')
   self.assertIn(r'调用 wait()/signal()，答案位置\blank{}数据，另一处\blank{}，',tex)
   self.assertNotIn(r'wait\blank{}',tex)
   self.assertNotIn(r'\\blank',tex)
   self.assertNotIn(r'\blank数据',tex)
   self.assertNotIn('blankNone',tex)
   self.assertNotIn('blankNone',text)
   if layout=='spacious':
    self.assertIn(r'\vspace*{25mm}',tex)
   else:
    self.assertNotIn(r'\vspace*{25mm}',tex)

if __name__=='__main__':unittest.main()
