import test from 'node:test';import assert from 'node:assert/strict';import {defaults,validateState,start,stop,fruitSide,resolveFruit} from './engine.mjs';

test('old v1 state migrates to tomato fruit without losing records',()=>{
 const s=defaults();delete s.settings.defaultFruit;
 s.sessions.push({id:'old',tagId:'focus',start:1000,end:61000,seconds:60,outcome:'finished',manual:false});
 const v=validateState(s);
 assert.equal(v.settings.defaultFruit,'tomato');
 assert.equal(v.sessions[0].fruitType,'tomato');
});

test('selected pear persists from active timer into its completed record',()=>{
 const s=defaults();s.settings.defaultFruit='pear';
 const a=start(s,{now:10000,minutes:5,id:'pear-session'});
 assert.equal(a.fruitType,'pear');
 const row=stop(s,{now:310000});
 assert.equal(row.fruitType,'pear');
});

test('random fruit resolves once to a supported concrete fruit',()=>{
 const a=resolveFruit('random','alpha'),b=resolveFruit('random','alpha');
 assert.equal(a,b);assert.ok(['tomato','pear'].includes(a));
 const s=defaults();s.settings.defaultFruit='random';
 assert.ok(['tomato','pear'].includes(start(s,{id:'stable-id',now:1,minutes:1}).fruitType));
});

test('fruit size follows recovered duration rule and stays bounded',()=>{
 assert.equal(fruitSide(0),36);
 assert.ok(fruitSide(25*60)>fruitSide(5*60));
 assert.equal(fruitSide(24*60*60),110);
});
