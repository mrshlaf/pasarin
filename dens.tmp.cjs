const fs=require("fs");
const rows=fs.readFileSync("ts.list.tmp","utf8").split("\n").filter(Boolean).map(f=>{
 const L=fs.readFileSync(f,"utf8").split(/\r?\n/).filter(l=>l.trim());
 const c=L.filter(l=>/^\s*(\/\/|\{\/\*)/.test(l)).length; const code=L.length-c;
 return [f,code,c,(c/code*100).toFixed(1)];
}).sort((a,b)=>a[3]-b[3]);
for(const r of rows) console.log(r[3].padStart(5)+"%", String(r[1]).padStart(5), String(r[2]).padStart(4), r[0]);
