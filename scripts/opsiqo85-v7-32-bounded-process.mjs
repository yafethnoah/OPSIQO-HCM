import { spawn, spawnSync } from 'node:child_process';

function trimBuffer(parts,limit=12000){
  while(parts.join('').length>limit&&parts.length>1)parts.shift();
}

export function killProcessTree(pid){
  if(!pid)return;
  if(process.platform==='win32'){
    spawnSync('taskkill',['/PID',String(pid),'/T','/F'],{stdio:'ignore',windowsHide:true,timeout:5000});
    return;
  }
  try{process.kill(-pid,'SIGKILL')}catch{try{process.kill(pid,'SIGKILL')}catch{}}
}

export function runBoundedProcess({command,args=[],env=process.env,cwd=process.cwd(),timeoutMs=20000}){
  return new Promise(resolve=>{
    const stdout=[];const stderr=[];
    const child=spawn(command,args,{env,cwd,stdio:['ignore','pipe','pipe'],windowsHide:true,detached:process.platform!=='win32'});
    child.stdout?.setEncoding('utf8');child.stderr?.setEncoding('utf8');
    child.stdout?.on('data',chunk=>{stdout.push(String(chunk));trimBuffer(stdout)});
    child.stderr?.on('data',chunk=>{stderr.push(String(chunk));trimBuffer(stderr)});
    const started=Date.now();let settled=false;
    const finish=value=>{if(settled)return;settled=true;clearTimeout(timer);resolve({...value,durationMs:Date.now()-started,stdout:stdout.join('').slice(-4000),stderr:stderr.join('').slice(-4000)})};
    const timer=setTimeout(()=>{killProcessTree(child.pid);finish({timedOut:true,code:null,pid:child.pid})},timeoutMs);
    child.once('error',error=>finish({timedOut:false,code:null,pid:child.pid,error:error instanceof Error?error.message:String(error)}));
    child.once('close',code=>finish({timedOut:false,code,pid:child.pid}));
  });
}
