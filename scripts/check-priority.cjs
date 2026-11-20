const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync('src/services/jiraPriority.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
let current = {id:'2',name:'Высокий'}, write;
const context = {exports:{},encodeURIComponent,fetch:async (url,opts={}) => {
 if (url.endsWith('/editmeta')) return {ok:true,json:async () => ({fields:{priority:{allowedValues:[{id:'1',name:'Критический'},{id:'2',name:'Высокий'}]}}})};
 if (opts.method==='PUT') { write=JSON.parse(opts.body); current={id:write.fields.priority.id,name:'Критический'}; return {ok:true}; }
 return {ok:true,json:async () => ({fields:{priority:current}})};
}};
vm.runInNewContext(source,context);
(async () => { const service=context.exports.createJiraPriorityService(); const options=await service.options('FCRM-1'); assert.equal(options.length,2); const saved=await service.save('FCRM-1',options[0].value); assert.equal(saved.name,'Критический'); assert.equal(write.fields.priority.id,'1'); console.log('Смена приоритета: выбор доступного значения и проверка сохранения работают.'); })().catch(error=>{console.error(error);process.exitCode=1});
