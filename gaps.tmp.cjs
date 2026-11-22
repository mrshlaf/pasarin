const fs=require("fs");
const min=+process.argv[2]||14;
const out=[];
for(const f of fs.readFileSync("ts.list.tmp","utf8").split("\n").filter(Boolean)){
 const L=fs.readFileSync(f,"utf8").split(/\r?\n/);
 let run=0,start=0;
 L.forEach((l,i)=>{const c=/^\s*(\/\/|\{\/\*)/.test(l); if(c||!l.trim()){ if(run>=min) out.push([f,start+1,run]); run=0;} else { if(run===0) start=i; run++; }});
 if(run>=min) out.push([f,start+1,run]);
}
const by={};out.forEach(([f,s,r])=>{(by[f]=by[f]||[]).push(s+"("+r+")")});
let tot=0;for(const f in by){tot+=by[f].length;console.log(String(by[f].length).padStart(3),f,by[f].join(" "))}
console.log("total gaps",tot);
