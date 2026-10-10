import {DatabaseSync} from 'node:sqlite';
export function localContext(path=':memory:'){
 const db=new DatabaseSync(path);
 return {db,storage:{sql:{exec(query,...params){const statement=db.prepare(query);const rows=statement.columns().length?statement.all(...params):(statement.run(...params),[]);return {toArray:()=>rows};}},transactionSync(fn){db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}},blockConcurrencyWhile:fn=>fn()};
}
