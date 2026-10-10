// Prepare only. Publishing requires explicit owner approval after review.
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {validateConfig} from '../server/finance-store.mjs';
const root=resolve(import.meta.dirname,'..'),output=resolve(root,'.finance/worker-package');
const bootstrap=JSON.parse(await readFile(resolve(root,'.finance/bootstrap-v2.json'),'utf8'));
validateConfig(bootstrap.config);
const snapshot=JSON.parse(await readFile(resolve(root,'.finance/current.json'),'utf8'));
const files=['server/finance-worker.mjs','server/finance-store.mjs','assets/finance/20261010/csv.mjs','assets/finance/20261010/engine.mjs'];
for(const file of files){await mkdir(dirname(resolve(output,file)),{recursive:true});await copyFile(resolve(root,file),resolve(output,file));}
await writeFile(resolve(output,'server/finance-private.mjs'),'export const bootstrap='+JSON.stringify(bootstrap)+';\nexport default '+JSON.stringify(snapshot)+';\n');
await writeFile(resolve(output,'wrangler.json'),JSON.stringify({name:'porto-finance-api',main:'server/finance-worker.mjs',account_id:'01505ab3bea2f372002e420a5887adf4',compatibility_date:'2026-10-09',preview_urls:false,compatibility_flags:['global_fetch_strictly_public'],durable_objects:{bindings:[{name:'FINANCE_DB',class_name:'FinanceStore'}]},migrations:[{tag:'finance-sqlite-v1',new_sqlite_classes:['FinanceStore']}],observability:{enabled:false}},null,2));
console.log('Private worker package prepared in ignored .finance/worker-package. No upload or deployment performed. Existing FINANCE_SESSION_SECRET must be preserved.');
