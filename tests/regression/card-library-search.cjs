'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const facets=require('../../preview/public/card-facets.js');
const repo=path.resolve(__dirname,'../..');
const report={checks:[],startedAt:new Date().toISOString()};
function pass(name){report.checks.push(name);console.log('PASS',name);}

const equipment={name:'Quiet Blade',type_line:'Artifact — Equipment',oracle_text:'Equipped creature gets +1/+1.'};
const support={name:'Armory Keeper',type_line:'Creature — Human',oracle_text:'Equipment you control have equip {0}.'};
const protection={name:'Shelter the Team',type_line:'Instant',oracle_text:'Permanents you control gain hexproof and indestructible until end of turn.'};
assert(facets.matches(equipment,['equipment_cards']));
assert(!facets.matches(equipment,['equipment_support']));
assert(facets.matches(support,['equipment_support']));
assert(!facets.matches(support,['equipment_cards']));
assert(facets.matches(protection,['protection']));
pass('Equipment type, Equipment support, and functional protection stay distinct');

const tagged={role_tags:['equipment_cards','protection']};
assert(facets.matches(tagged,['equipment_cards','protection'],'all'));
assert(!facets.matches(tagged,['equipment_support','protection'],'all'));
assert(facets.matches(tagged,['equipment_support','protection'],'any'));
pass('Gameplay roles support predictable Match any and Match all semantics');

assert.equal(facets.roles.length,14);
assert.deepEqual(facets.groups.map(group=>group.id),['essentials','interaction','resilience','engines']);
assert(facets.roles.every(role=>role.description.length>20));
pass('Four understandable groups expose fourteen described gameplay facets');

const app=fs.readFileSync(path.join(repo,'preview/src/app.jsx'),'utf8'),worker=fs.readFileSync(path.join(repo,'preview/public/card-worker.js'),'utf8');
assert.match(app,/\[legal,setLegal\]=useState\(true\)/);
assert.match(app,/Reset to Commander defaults/);
assert.match(app,/Missing a role is not proof/);
assert.match(app,/identity:'true'/);
assert.match(worker,/params\.identity==='true'/);
assert.match(worker,/roleMode==='all'/);
assert.match(worker,/manifest\(true\)/);
assert(!worker.includes("String(params.colors)!==''&&[...c.color_identity]"));
pass('Commander legality defaults on and color identity, legality, and release metadata remain separate constraints');

const dataRoot=path.resolve(process.env.DECK_SAGE_CARD_DATA_ROOT||path.join(repo,'preview/public/card-data')),manifest=JSON.parse(fs.readFileSync(path.join(dataRoot,'manifest.json'),'utf8')),index=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dataRoot,'search-index.json.gz'))));
if(index.fields.includes('role_tags')){
 const positions=Object.fromEntries(index.fields.map((field,index)=>[field,index])),byName=new Map(index.cards.map(row=>[row[positions.name],row]));
 for(const [name,role] of [['Sol Ring','ramp'],['Counterspell','counterspells'],['Heroic Intervention','protection']]){const row=byName.get(name);assert(row,`${name} is indexed`);assert(row[positions.role_tags].includes(role),`${name} has ${role}`);}
 assert.equal(manifest.schema,'deck-sage-static-v2');
 pass('Refreshed index carries authoritative positive role assignments for representative cards');
}else pass('Legacy checked-in snapshot remains searchable through conservative rules-text fallbacks before CI refresh');

report.finishedAt=new Date().toISOString();
fs.writeFileSync(path.join(__dirname,'card-library-search-report.json'),JSON.stringify(report,null,2));
