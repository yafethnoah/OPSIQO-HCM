'use client';

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';

export type OpsiqoSelectOption = {
  value:string;
  label:string;
};

export function OpsiqoSelect({
  value,
  onChange,
  options,
  ariaLabel,
  disabled=false,
}:{
  value:string;
  onChange:(value:string)=>void;
  options:OpsiqoSelectOption[];
  ariaLabel:string;
  disabled?:boolean;
}){
  const rootRef=useRef<HTMLDivElement>(null);
  const [open,setOpen]=useState(false);
  const selectedIndex=Math.max(0,options.findIndex(option=>option.value===value));
  const [activeIndex,setActiveIndex]=useState(selectedIndex);
  const selected=useMemo(
    ()=>options.find(option=>option.value===value)||options[0],
    [options,value]
  );

  useEffect(()=>{
    if(!open)return;
    setActiveIndex(selectedIndex);
    const onPointerDown=(event:PointerEvent)=>{
      if(rootRef.current&&!rootRef.current.contains(event.target as Node))setOpen(false);
    };
    document.addEventListener('pointerdown',onPointerDown);
    return()=>document.removeEventListener('pointerdown',onPointerDown);
  },[open,selectedIndex]);

  function choose(index:number){
    const option=options[index];
    if(!option)return;
    onChange(option.value);
    setActiveIndex(index);
    setOpen(false);
  }

  function onTriggerKeyDown(event:KeyboardEvent<HTMLButtonElement>){
    if(disabled)return;
    if(event.key==='ArrowDown'){
      event.preventDefault();
      if(!open){setOpen(true);setActiveIndex(selectedIndex);return;}
      setActiveIndex(index=>Math.min(options.length-1,index+1));
    }else if(event.key==='ArrowUp'){
      event.preventDefault();
      if(!open){setOpen(true);setActiveIndex(selectedIndex);return;}
      setActiveIndex(index=>Math.max(0,index-1));
    }else if(event.key==='Enter'||event.key===' '){
      event.preventDefault();
      if(open)choose(activeIndex);
      else setOpen(true);
    }else if(event.key==='Escape'){
      event.preventDefault();
      setOpen(false);
    }
  }

  return <div ref={rootRef} className={`opsiqoSelect${open?' isOpen':''}`}>
    <button
      type="button"
      className="opsiqoSelectTrigger"
      aria-label={ariaLabel}
      aria-haspopup="listbox"
      aria-expanded={open}
      disabled={disabled}
      onClick={()=>setOpen(current=>!current)}
      onKeyDown={onTriggerKeyDown}
    >
      <span>{selected?.label||'Select'}</span>
      <span className="opsiqoSelectChevron" aria-hidden="true">⌄</span>
    </button>

    {open?<div
      className="opsiqoSelectMenu"
      role="listbox"
      aria-label={ariaLabel}
    >
      {options.map((option,index)=><button
        type="button"
        key={option.value}
        role="option"
        aria-selected={option.value===value}
        className={`opsiqoSelectOption${option.value===value?' isSelected':''}${index===activeIndex?' isActive':''}`}
        onMouseEnter={()=>setActiveIndex(index)}
        onClick={()=>choose(index)}
      >
        <span>{option.label}</span>
        {option.value===value?<span className="opsiqoSelectCheck" aria-hidden="true">✓</span>:null}
      </button>)}
    </div>:null}
  </div>;
}
