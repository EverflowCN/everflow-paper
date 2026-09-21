import re,subprocess,unittest
from pathlib import Path
from render import escape,rich,choice_rich,render,merge_layers,resolve,external_css_reference,normalize_soft_breaks,prepared_stem

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
 def test_subitem_markers_start_paragraphs(self):
  roman=rich('关于栈：I 第一项；II 第二项；III 第三项；IV 第四项。')
  self.assertEqual(roman.count(r'\par '),4)
  self.assertIn('：'+r'\par '+'I 第一项；'+r'\par '+'II 第二项；'+r'\par '+'III 第三项；'+r'\par '+'IV 第四项。',roman)
  circled=rich('步骤包括：①第一步；②第二步；③第三步；④第四步。')
  self.assertEqual(circled.count(r'\par '),4)
  self.assertIn('：'+r'\par '+'①第一步；'+r'\par '+'②第二步；'+r'\par '+'③第三步；'+r'\par '+'④第四步。',circled)
 def test_subitem_markers_do_not_break_protocol_or_option_summary(self):
  text=rich('I/O 指令；答案仅 I、II、III；PCIe。')
  self.assertNotIn(r'\par I/O',text)
  self.assertNotIn('、'+r'\par ',text)
 def test_choice_renderer_never_emits_paragraph_tokens(self):
  option=choice_rich('I、II、III；II、III、IV；①第一项；②第二项')
  self.assertNotIn(r'\par',option)
  self.assertIn('I、II、III',option)
 def test_choice_regression_from_failed_export(self):
  questions=[{'_source':'relax','_id':'regression','stem':'测试题。','options':{
   'A':'I、II、III','B':'II、III、IV','C':'I、III、IV','D':'I、II、IV'}}]
  dest=Path('/tmp/pdf-verification/choice-regression')
  pdf=render({'title':'选择题段落回归','layout':'compact'},questions,dest)
  self.assertGreater(pdf.stat().st_size,10000)
  tex=(dest/'questions.tex').read_text(encoding='utf8')
  self.assertNotIn(r'\fourchoices{\par',tex)
 def test_escape(self):self.assertEqual(r'a\_b\%',escape('a_b%'))
 def test_svg_css_allows_local_fragments_only(self):
  self.assertFalse(external_css_reference('marker-end:url(#arrow)'))
  self.assertFalse(external_css_reference('fill: url("#gradient-1")'))
  self.assertTrue(external_css_reference('fill:url(https://example.com/a.svg#x)'))
  self.assertTrue(external_css_reference('fill:url(data:image/svg+xml;base64,AAAA)'))
  self.assertTrue(external_css_reference('@import url("https://example.com/x.css")'))
 def test_imported_soft_linebreaks_do_not_split_tokens(self):
  text=normalize_soft_breaks('一个系统中仅有\nP₁\n和\nP₂\n两个作业。\n\nP₁\n：计算 60ms')
  self.assertIn('仅有 P₁ 和 P₂ 两个作业。',text)
  self.assertIn('P₁ ：计算 60ms',text)
  self.assertNotIn('P₁\n和\nP₂',text)
 def test_real_zhenti_override_cleanup(self):
  payload={'title':'真题导入格式回归','layout':'compact','questions':[{'source':'zhenti','id':'2012-27'},{'source':'zhenti','id':'2012-29'}]}
  questions=resolve(payload,[])
  first=prepared_stem(questions[0]);second=prepared_stem(questions[1])
  self.assertNotIn('|',first)
  self.assertIn('P₀ 、 P₁ 、 P₂ 、 P₃ 、 P₄',first)
  self.assertIn('P₁ 和 P₂',second)
  self.assertNotIn('P₁\n和\nP₂',second)
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
  payload={'title':'408 真题图片排版验证','layout':'compact','questions':[{'source':'zhenti','id':'2010-4'},{'source':'zhenti','id':'2012-27'},{'source':'zhenti','id':'2012-29'},{'source':'zhenti','id':'2019-38'}]}
  questions=resolve(payload,[])
  self.assertTrue(any(q.get('figures') for q in questions))
  dest=Path('/tmp/pdf-verification/canonical')
  render(payload,questions,dest)
  tex=(dest/'questions.tex').read_text(encoding='utf8')
  self.assertNotIn('P₁\\par',tex)
  self.assertNotIn('P₂\\par',tex)
  self.assertNotIn('进程 | 已分配资源',tex)
  from PIL import Image
  with Image.open(dest/'figure-1.png') as im:
   px=im.convert('RGB').getpixel((0,0))
   self.assertGreaterEqual(min(px),245)
 def test_failed_zhenti_export_regression(self):
  ids=['2015-17','2024-37','2023-15','2010-27','2023-3','2012-11','2010-18','2019-38','2026-29','2009-36','2010-28','2022-26','2017-34','2018-23','2012-10','2026-33','2011-19','2026-10','2024-3','2026-18','2019-22','2019-4','2022-6','2016-21','2011-15','2024-9','2009-17','2025-9','2010-38','2016-11','2012-27','2011-36','2024-30','2018-5','2022-13','2026-14','2022-30','2015-32','2026-37','2019-23']
  payload={'title':'408 仿真组卷 · 408 真题','layout':'compact','questions':[{'source':'zhenti','id':qid} for qid in ids]}
  questions=resolve(payload,[])
  self.assertEqual(len(questions),40)
  self.assertTrue(all((q.get('stem') or q.get('figures')) for q in questions))
  pdf=render(payload,questions,Path('/tmp/pdf-verification/failed-zhenti-regression'))
  self.assertGreater(pdf.stat().st_size,10000)
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
