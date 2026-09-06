import fs from 'node:fs';
const raw=fs.readFileSync(new URL('../../../supabase/functions/owner-focus/bundle.ts',import.meta.url),'utf8');
const html=JSON.parse(raw.slice(raw.indexOf(' = ')+3).trim().replace(/;$/,'')).replace('__FOCUS_STATE__','null');
const escaped=html.replaceAll('&','&amp;').replaceAll('"','&quot;');
fs.writeFileSync(new URL('fixed.html',import.meta.url),'<!doctype html><meta charset="utf-8"><iframe title="我的番茄" sandbox="allow-scripts allow-downloads" style="border:0;width:390px;height:844px" srcdoc="'+escaped+'"></iframe>');
