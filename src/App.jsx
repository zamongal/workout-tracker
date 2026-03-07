import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase ─────────────────────────────────────────────────────
const SUPABASE_URL = "https://qoovtsdonrbhdficjzco.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvb3Z0c2RvbnJiaGRmaWNqemNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4OTMxNzYsImV4cCI6MjA4ODQ2OTE3Nn0.ocuDsXvYv9QXyOfC6CzOzxEJEUWvK040LoIKBTQcfKQ";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── 운동 분류 & 증가 단위 ────────────────────────────────────────
// 바벨: +5kg, 덤벨: +2kg, 머신/케이블: +2.5kg
const BARBELL_LIST = [
  "바벨 벤치프레스","바벨 스쿼트","데드리프트","루마니안 데드리프트",
  "바벨 오버헤드 프레스","힙 쓰러스트","불가리안 스플릿 스쿼트",
  "바벨 벤트오버 로우","바벨 컬",
  "랫 풀다운","트라이셉스 푸시다운","케이블 플라이","시티드 케이블 로우",
  "오버헤드 트라이셉스 익스텐션","케이블 크런치","레그 프레스",
  "레그 익스텐션","레그 컬","카프 레이즈","페이스 풀","사이드 레터럴 레이즈"
];
const DUMBBELL_LIST = ["인클라인 덤벨 프레스","인클라인 덤벨 컬"];

const getExType = (name) => {
  if (BARBELL_LIST.includes(name)) return "barbell";
  if (DUMBBELL_LIST.includes(name)) return "dumbbell";
  return "machine";
};
const getWeightStep = (name) => {
  if (DUMBBELL_LIST.includes(name)) return 2;
  return 5;
};

// ─── 더블 프로그레션 ──────────────────────────────────────────────
function parseRepRange(repsStr) {
  if (!repsStr) return { min: 10, max: 12 };
  if (repsStr.includes("~")) {
    const [a, b] = repsStr.split("~").map(Number);
    return { min: a, max: b };
  }
  const n = Number(repsStr);
  return { min: n, max: n };
}

function calcDoubleProgression(exName, weight, setResults, repsStr, lastEntry) {
  const { min, max } = parseRepRange(repsStr);
  const step  = getWeightStep(exName);
  const filled = setResults.filter(s => s && s.status);
  if (!filled.length) return { nextWeight: weight, nextReps: lastEntry?.nextReps ?? min, bump: false, progressNote: null };

  const totalSets   = setResults.length;
  const failCount   = filled.filter(s => s.status === "fail").length;
  const allSuccess  = filled.every(s => s.status === "success") && filled.length === totalSets;
  const allMaxReps  = allSuccess && (lastEntry?.nextReps ?? min) >= max;

  let nextWeight = weight, nextReps = lastEntry?.nextReps ?? min, bump = false, progressNote = null;

  if (allMaxReps) {
    nextWeight = +(weight + step).toFixed(1);
    nextReps   = min;
    bump       = true;
    progressNote = `🔥 전 세트 ${max}회 달성! +${step}kg → ${nextWeight}kg, ${min}회부터 재시작`;
  } else if (allSuccess) {
    nextReps = Math.min(max, (lastEntry?.nextReps ?? min) + 1);
    progressNote = `✅ 성공! 다음 ${nextReps}회 도전`;
  } else if (failCount >= totalSets) {
    nextReps = Math.max(min, (lastEntry?.nextReps ?? min) - 2);
    progressNote = `전 세트 실패 — 목표 횟수 -2 (${nextReps}회)`;
  } else if (failCount >= 2) {
    nextReps = Math.max(min, (lastEntry?.nextReps ?? min) - 1);
    progressNote = `실패 ${failCount}세트 — 목표 횟수 -1 (${nextReps}회)`;
  } else {
    nextReps = lastEntry?.nextReps ?? min;
    progressNote = `실패 1세트 — 횟수/무게 유지 (${nextReps}회)`;
  }
  return { nextWeight, nextReps, bump, progressNote };
}

// ─── 루틴 정의 ───────────────────────────────────────────────────
const DAY_KEYS  = ["Day 1","Day 2","Day 3","Day 4"];
const DAY_SHORT = { "Day 1":"UA","Day 2":"LA","Day 3":"UB","Day 4":"LB" };
const DAY_LABEL = { "Day 1":"상체 파워","Day 2":"하체 쿼드","Day 3":"상체 볼륨","Day 4":"하체 후면" };
const DAY_COLOR = { "Day 1":"#6366f1","Day 2":"#22c55e","Day 3":"#f59e0b","Day 4":"#ef4444" };

const ROUTINE = {
  "Day 1": [ // Upper A — 파워
    { name:"바벨 벤치프레스",      defaultWeight:65,   sets:4, reps:"5~6",   defaultReps:5,  rir:"2~3" },
    { name:"바벨 벤트오버 로우",   defaultWeight:65,   sets:4, reps:"6~8",   defaultReps:6,  rir:"1~2" },
    { name:"바벨 오버헤드 프레스", defaultWeight:45,   sets:3, reps:"6~8",   defaultReps:6,  rir:"1~2" },
    { name:"랫 풀다운",            defaultWeight:50,   sets:3, reps:"10~12",  defaultReps:10,  rir:"1~2" },
    { name:"케이블 플라이",        defaultWeight:10,   sets:3, reps:"12~15", defaultReps:12, rir:"1"   },
    { name:"트라이셉스 푸시다운",  defaultWeight:20,   sets:3, reps:"12~15", defaultReps:12, rir:"1~2" },
    { name:"바벨 컬",              defaultWeight:20,   sets:3, reps:"10~12",  defaultReps:10,  rir:"1~2" },
  ],
  "Day 2": [ // Lower A — 쿼드
    { name:"바벨 스쿼트",           defaultWeight:80,   sets:4, reps:"6~8",   defaultReps:6,  rir:"1~2" },
    { name:"레그 프레스",           defaultWeight:100,  sets:3, reps:"10~12", defaultReps:10, rir:"1~2" },
    { name:"불가리안 스플릿 스쿼트",defaultWeight:20,   sets:3, reps:"10~12", defaultReps:10, rir:"1~2" },
    { name:"레그 컬",               defaultWeight:30,   sets:3, reps:"12~15", defaultReps:12, rir:"1~2" },
    { name:"카프 레이즈",           defaultWeight:60,   sets:4, reps:"15~20", defaultReps:15, rir:"1"   },
  ],
  "Day 3": [ // Upper B — 볼륨
    { name:"인클라인 덤벨 프레스", defaultWeight:25,   sets:4, reps:"10~12", defaultReps:10, rir:"1~2" },
    { name:"시티드 케이블 로우",   defaultWeight:50,   sets:4, reps:"10~12", defaultReps:10, rir:"1~2" },
    { name:"랫 풀다운",            defaultWeight:50,   sets:3, reps:"10~12", defaultReps:10, rir:"1~2" },
    { name:"페이스 풀",            defaultWeight:20,   sets:4, reps:"15~20", defaultReps:15, rir:"1~2" },
    { name:"사이드 레터럴 레이즈", defaultWeight:10,   sets:5, reps:"15~25", defaultReps:15, rir:"1"   },
    { name:"오버헤드 트라이셉스 익스텐션", defaultWeight:20, sets:3, reps:"12~15", defaultReps:12, rir:"1~2" },
    { name:"인클라인 덤벨 컬",    defaultWeight:10,   sets:3, reps:"12~15", defaultReps:12, rir:"1~2" },
  ],
  "Day 4": [ // Lower B — 후면
    { name:"데드리프트",          defaultWeight:95,   sets:4, reps:"5~6",   defaultReps:5,  rir:"2~3" },
    { name:"루마니안 데드리프트", defaultWeight:85,   sets:3, reps:"8~10",  defaultReps:8,  rir:"1~2" },
    { name:"힙 쓰러스트",         defaultWeight:45,   sets:4, reps:"10~12", defaultReps:10, rir:"1~2" },
    { name:"레그 익스텐션",       defaultWeight:40,   sets:3, reps:"12~15", defaultReps:12, rir:"1"   },
    { name:"카프 레이즈",         defaultWeight:60,   sets:3, reps:"15~20", defaultReps:15, rir:"1"   },
    { name:"케이블 크런치",       defaultWeight:30,   sets:3, reps:"12~15", defaultReps:12, rir:"1"   },
  ],
};

// ─── 상수 ────────────────────────────────────────────────────────
const SET_STATUS = [
  { value:"success", label:"✅", text:"성공", color:"#22c55e", rgb:"34,197,94"   },
  { value:"fail",    label:"❌", text:"실패", color:"#ef4444", rgb:"239,68,68"   },
];
const WEEKDAYS = ["일","월","화","수","목","금","토"];
const DELOAD_CYCLE = 4;
const DELOAD_WEIGHT_RATIO = 0.6;

const getSI     = (v) => SET_STATUS.find(s => s.value === v) || null;
const toDateKey = (d) => { const dt=d||new Date(); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`; };
const fmtTime   = (s) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
const fmtDur    = (s) => { if(!s)return"—"; const m=Math.floor(s/60),sec=s%60; return sec>0?`${m}분 ${sec}초`:`${m}분`; };
const epley1RM  = (w, repsStr) => { const r=parseInt(repsStr?.split("~")[1]||repsStr||"10"); return +(w*(1+r/30)).toFixed(1); };

function isDeloadSession(totalSaved) { return totalSaved>0 && totalSaved%(DELOAD_CYCLE*4)===0; }
function getDeloadWeight(weight)     { return +(weight*DELOAD_WEIGHT_RATIO).toFixed(1); }

const SK  = { history:"wt_v11_history", timer:"wt_v11_timer", session:"wt_v11_session" };
const sGet = (k) => { try{const v=localStorage.getItem(k);return v?JSON.parse(v):null;}catch{return null;} };
const sSet = (k,v) => { try{localStorage.setItem(k,JSON.stringify(v));}catch(e){console.error(e);} };
const sDel = (k)   => { try{localStorage.removeItem(k);}catch{} };

// ─── 미니 차트 ───────────────────────────────────────────────────
function MiniChart({ data, color, exName }) {
  if (!data||data.length<2) return <div style={{fontSize:11,color:"#444",padding:"10px 0",textAlign:"center"}}>데이터 2개 이상 필요해요</div>;
  const W=300,H=64,P=12;
  const weights=data.map(d=>d.weight);
  const mins=Math.min(...weights),maxs=Math.max(...weights),range=maxs-mins||1;
  const pts=data.map((d,i)=>({x:P+(i/(data.length-1))*(W-P*2),y:P+(1-(d.weight-mins)/range)*(H-P*2),...d}));
  const path=pts.map((p,i)=>`${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area=`${path} L${pts[pts.length-1].x},${H} L${pts[0].x},${H} Z`;
  const latest=data[data.length-1];
  const dayKey=Object.keys(ROUTINE).find(k=>ROUTINE[k].find(e=>e.name===exName));
  const exDef=dayKey?ROUTINE[dayKey].find(e=>e.name===exName):null;
  const orm=exDef?epley1RM(latest.weight,exDef.reps):"—";
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontSize:12,color:"#888"}}>최근 {data.length}회</span>
        <span style={{fontSize:12,color:"#a5b4fc",fontWeight:700}}>추정 1RM <span style={{fontSize:15}}>{orm}kg</span></span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{overflow:"visible"}}>
        <defs><linearGradient id={`grad_${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient></defs>
        <path d={area} fill={`url(#grad_${color.replace("#","")})`}/>
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        {pts.map((p,i)=>(
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3.5" fill={color}/>
            {(i===0||i===pts.length-1)&&<text x={p.x} y={p.y-8} textAnchor={i===0?"start":"end"} fontSize="10" fill={color} fontWeight="700">{p.weight}kg</text>}
          </g>
        ))}
      </svg>
      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:8}}>
        {data.map((d,i)=>(
          <div key={i} style={{fontSize:10,color:"#555",background:"rgba(255,255,255,0.03)",borderRadius:5,padding:"2px 7px"}}>
            {d.date.slice(5)} <span style={{color:"#a5b4fc",fontWeight:700}}>{d.weight}kg</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 완료 모달 ───────────────────────────────────────────────────
function SummaryModal({ rec, onClose }) {
  if (!rec) return null;
  const totalVolume=rec.entries.reduce((acc,e)=>{
    const doneSets=(e.sets||[]).filter(Boolean).length;
    const avgReps=e.sets&&e.sets.filter(s=>s&&s.reps).length
      ?e.sets.filter(s=>s&&s.reps).reduce((s,r)=>s+(r.reps||0),0)/e.sets.filter(s=>s&&s.reps).length
      :parseInt(e.reps||"10");
    return acc+e.weight*avgReps*doneSets;
  },0);
  const bumpCount=rec.entries.filter(e=>e.bump).length;
  const successCount=rec.entries.filter(e=>e.overall==="success").length;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#13131f",borderRadius:20,padding:24,width:"100%",maxWidth:460,border:"1px solid rgba(255,255,255,0.08)",maxHeight:"85vh",overflowY:"auto"}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:36,marginBottom:8}}>🎉</div>
          <div style={{fontSize:20,fontWeight:900,color:"#e8e8f0"}}>운동 완료!</div>
          <div style={{fontSize:12,color:"#555",marginTop:4}}>{DAY_SHORT[rec.day]} · {DAY_LABEL[rec.day]}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:20}}>
          {[
            {label:"총 볼륨",value:`${Math.round(totalVolume).toLocaleString()}kg`,color:"#a5b4fc"},
            {label:"운동 시간",value:fmtDur(rec.duration),color:"#34d399"},
            {label:"성공 운동",value:`${successCount}/${rec.entries.length}`,color:"#fbbf24"},
          ].map(s=>(
            <div key={s.label} style={{background:"rgba(255,255,255,0.04)",borderRadius:12,padding:"12px 8px",textAlign:"center",border:"1px solid rgba(255,255,255,0.06)"}}>
              <div style={{fontSize:18,fontWeight:900,color:s.color}}>{s.value}</div>
              <div style={{fontSize:10,color:"#555",marginTop:3}}>{s.label}</div>
            </div>
          ))}
        </div>
        {bumpCount>0&&(
          <div style={{marginBottom:16,padding:"10px 14px",background:"rgba(99,102,241,0.12)",borderRadius:12,border:"1px solid rgba(99,102,241,0.3)",fontSize:13,color:"#a5b4fc",fontWeight:600,textAlign:"center"}}>
            🔥 {bumpCount}개 운동 무게 점프!
          </div>
        )}
        <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:20}}>
          {rec.entries.map(e=>{
            const si=getSI(e.overall);
            return (
              <div key={e.name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",background:"rgba(255,255,255,0.03)",borderRadius:10,border:`1px solid ${si?si.color+"25":"rgba(255,255,255,0.06)"}`}}>
                <div style={{fontSize:13,fontWeight:600}}>{e.name}{e.bump?" 🔥":""}</div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:13,fontWeight:800,color:"#e8e8f0"}}>{e.weight}kg</span>
                  {si&&<span style={{fontSize:11,color:si.color}}>{si.label}</span>}
                  <span style={{fontSize:11,color:"#444"}}>→ {e.nextWeight}kg {e.nextReps}회</span>
                </div>
              </div>
            );
          })}
        </div>
        {rec.note&&<div style={{marginBottom:16,padding:"8px 12px",background:"rgba(255,255,255,0.03)",borderRadius:10,fontSize:12,color:"#888",fontStyle:"italic"}}>📝 {rec.note}</div>}
        <button onClick={onClose} style={{width:"100%",padding:14,borderRadius:12,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer"}}>확인</button>
      </div>
    </div>
  );
}

// ─── 메인 ────────────────────────────────────────────────────────
export default function WorkoutTracker() {
  const [tab,setTab]             = useState("log");
  const [activeDay,setActiveDay] = useState(DAY_KEYS[0]);
  const [sessionLog,setSessionLog]   = useState({});
  const [collapsed,setCollapsed]     = useState({});
  const [history,setHistory]         = useState({});
  const [loaded,setLoaded]           = useState(false);
  const [syncing,setSyncing]         = useState(false);
  const [syncStatus,setSyncStatus]   = useState(null);
  const [timer,setTimer]             = useState(null);
  const [sessionNote,setSessionNote] = useState("");
  const [toast,setToast]             = useState(null);
  const [calMonth,setCalMonth]       = useState(new Date());
  const [selectedDate,setSelectedDate] = useState(null);
  const [graphEx,setGraphEx]         = useState(null);
  const [summaryRec,setSummaryRec]   = useState(null);
  const [bannerHidden,setBannerHidden] = useState(false);
  const timerRef = useRef(null);
  const cardRefs   = useRef({});
  const activeDayRef = useRef(activeDay);
  useEffect(()=>{activeDayRef.current=activeDay;},[activeDay]);
  const today = toDateKey();

  // ── Supabase 로드 ──
  useEffect(()=>{
    const load = async () => {
      setSyncing(true);
      try {
        const {data,error} = await supabase.from("workout_history").select("date, data");
        if(error) throw error;
        const merged={};
        (data||[]).forEach(row=>{merged[row.date]=row.data;});
        const local=sGet(SK.history)||{};
        setHistory({...merged,...local});
        setSyncStatus("ok");
      } catch(e) {
        console.error("Supabase load error:",e);
        setHistory(sGet(SK.history)||{});
        setSyncStatus("error");
      }
      setSyncing(false);
      setLoaded(true);
    };
    load();
    const t=sGet(SK.timer);
    if(t){const el=Math.floor((Date.now()-t.startedAt)/1000);const rem=Math.max(0,t.total-el);if(rem>0)setTimer({...t,remaining:rem});}
  },[]);

  const saveToSupabase = useCallback(async(date,rec)=>{
    setSyncing(true);
    try {
      const {error}=await supabase.from("workout_history").upsert({date,data:rec},{onConflict:"date"});
      if(error) throw error;
      setSyncStatus("ok");
    } catch(e) {
      console.error("Supabase save error:",e);
      setSyncStatus("error");
      showToast("DB 저장 실패, 로컬에만 저장됨 ⚠️","error");
    }
    setSyncing(false);
  },[]);

  const deleteFromSupabase = useCallback(async(date)=>{
    try{await supabase.from("workout_history").delete().eq("date",date);}catch(e){console.error(e);}
  },[]);

  useEffect(()=>{if(loaded)sSet(SK.history,history);},[history,loaded]);

  const {nextDay,totalSaved} = useMemo(()=>{
    const keys=Object.keys(history).sort().reverse();
    const last=keys.length?history[keys[0]]:null;
    return {nextDay:last?(DAY_KEYS[(DAY_KEYS.indexOf(last.day)+1)%DAY_KEYS.length]):DAY_KEYS[0],totalSaved:keys.length};
  },[history]);

  const isDeload = isDeloadSession(totalSaved);

  // 히스토리 로드 후 activeDay를 nextDay로 동기화
  useEffect(()=>{ if(loaded) setActiveDay(nextDay); },[loaded]);

  // ── 휴식 타이머 ──
  useEffect(()=>{
    if(!timer){clearInterval(timerRef.current);return;}
    clearInterval(timerRef.current);
    timerRef.current=setInterval(()=>{
      setTimer(prev=>{
        if(!prev)return null;
        if(prev.remaining<=1){clearInterval(timerRef.current);sDel(SK.timer);try{navigator.vibrate&&navigator.vibrate([300,100,300]);}catch{}return null;}
        return{...prev,remaining:prev.remaining-1};
      });
    },1000);
    return()=>clearInterval(timerRef.current);
  },[timer?.key]);

  const startTimer = useCallback((exName)=>{
    const secs=BARBELL_LIST.includes(exName)?180:90;
    const startedAt=Date.now();
    const t={remaining:secs,total:secs,exName,key:`${exName}-${startedAt}`,startedAt};
    setTimer(t);sSet(SK.timer,t);
  },[]);
  const adjustTimer  = (d)=>setTimer(p=>p?{...p,remaining:Math.max(5,p.remaining+d)}:p);
  const dismissTimer = useCallback(()=>{clearInterval(timerRef.current);setTimer(null);sDel(SK.timer);},[]);

  const resetSession = useCallback(()=>{
    setSessionNote("");sDel(SK.session);
  },[]);

  const getLastSession = useCallback((exName)=>{
    const curDay=activeDayRef.current;
    const keys=Object.keys(history).sort().reverse();
    for(const k of keys){
      if(history[k].day===curDay){const e=history[k].entries?.find(e=>e.name===exName);if(e)return e;}
    }
    return null;
  },[history]);

  const getSuggested = useCallback((ex)=>{
    const last=getLastSession(ex.name);
    const baseWeight=last?last.nextWeight:ex.defaultWeight;
    const baseReps=last?(last.nextReps??ex.defaultReps):ex.defaultReps;
    return {weight:isDeload?getDeloadWeight(baseWeight):baseWeight,reps:isDeload?ex.defaultReps:baseReps};
  },[getLastSession,isDeload]);

  const updateSetStatus = (exName,idx,val,totalSets)=>{
    setSessionLog(prev=>{
      const existing=prev[exName]?.sets||Array(totalSets).fill(null);
      const next=[...existing];
      const targetReps=prev[exName]?.targetReps??getSuggested(ROUTINE[activeDayRef.current].find(e=>e.name===exName)).reps;
      if(next[idx]?.status===val){next[idx]=null;}
      else{
        const defaultReps = val==="success" ? targetReps : Math.max(1, targetReps-1);
        next[idx]={status:val, reps: next[idx]?.status==="fail" ? next[idx].reps : defaultReps};
      }
      const filled=next.filter(Boolean).length;
      if(next[idx]&&filled<totalSets)startTimer(exName);
      if(next[idx]&&filled===totalSets){
        dismissTimer();
        setTimeout(()=>{
          setCollapsed(c=>({...c,[exName]:true}));
          const exercises=ROUTINE[activeDayRef.current];
          const nextEx=exercises.find(e=>{if(e.name===exName)return false;const log=prev[e.name];return!log?.sets||log.sets.filter(Boolean).length<e.sets;});
          if(nextEx&&cardRefs.current[nextEx.name])cardRefs.current[nextEx.name].scrollIntoView({behavior:"smooth",block:"center"});
        },600);
      }
      return{...prev,[exName]:{...prev[exName],sets:next}};
    });
  };

  const updateSetReps = (exName,idx,reps,totalSets)=>{
    setSessionLog(prev=>{
      const existing=prev[exName]?.sets||Array(totalSets).fill(null);
      const next=[...existing];
      if(next[idx])next[idx]={...next[idx],reps};
      return{...prev,[exName]:{...prev[exName],sets:next}};
    });
  };

  const updateWeight    = (exName,val)=>setSessionLog(prev=>({...prev,[exName]:{...prev[exName],weight:val}}));
  const stepWeight      = (exName,delta,suggestedWeight)=>{
    setSessionLog(prev=>{
      const cur=parseFloat(prev[exName]?.weight??suggestedWeight);
      const next=+Math.max(0,cur+delta).toFixed(1);
      return{...prev,[exName]:{...prev[exName],weight:String(next)}};
    });
  };
  const updateTargetReps = (exName,reps)=>setSessionLog(prev=>({...prev,[exName]:{...prev[exName],targetReps:reps}}));

  const exercises      = ROUTINE[activeDay];
  const isExDone       = (n,t)=>(sessionLog[n]?.sets||[]).filter(Boolean).length===t;
  const completedCount = exercises.filter(ex=>isExDone(ex.name,ex.sets)).length;
  const hasAnyInput    = exercises.some(ex=>{const l=sessionLog[ex.name];return l?.weight||(l?.sets||[]).some(Boolean);});

  const showToast = (msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};

  const handleFinish = async()=>{
    if(!hasAnyInput){showToast("세트를 먼저 기록해주세요","error");return;}
    const date=toDateKey();
    const entries=exercises.map(ex=>{
      const log=sessionLog[ex.name]||{};
      const last=getLastSession(ex.name);
      const suggested=getSuggested(ex);
      const weight=parseFloat(log.weight??suggested.weight);
      const sets=log.sets||[];
      const {nextWeight,nextReps,bump,progressNote}=calcDoubleProgression(ex.name,weight,sets,ex.reps,last);
      const filled=sets.filter(Boolean);
      const overall=filled.length===0?"fail":filled.filter(s=>s?.status==="fail").length>=1?"fail":"success";
      return{name:ex.name,weight,sets,overall,date,nextWeight,nextReps,bump,progressNote,reps:ex.reps};
    });
    const isPartial=completedCount<exercises.length;
    const short=DAY_SHORT[activeDay];
    const count=Object.values(history).filter(r=>r.day===activeDay).length+1;
    const label=isDeload?`${short}-D`:`${short}-${count}`;
    const newRec={day:activeDay,entries,partial:isPartial,note:sessionNote,deload:isDeload,label};
    setHistory(prev=>({...prev,[date]:newRec}));
    await saveToSupabase(date,newRec);
    setSummaryRec(newRec);
    setSessionLog({});setCollapsed({});
    setBannerHidden(false);
    dismissTimer();resetSession();setSessionNote("");
  };

  // ── 달력 ──
  const calDays=useMemo(()=>{
    const y=calMonth.getFullYear(),m=calMonth.getMonth();
    const first=new Date(y,m,1).getDay(),total=new Date(y,m+1,0).getDate();
    const cells=[];
    for(let i=0;i<first;i++)cells.push(null);
    for(let d=1;d<=total;d++)cells.push(new Date(y,m,d));
    return cells;
  },[calMonth]);

  const selectedRecord=selectedDate?history[selectedDate]:null;
  const startToday=(day)=>{setActiveDay(day);setSessionLog({});setCollapsed({});setBannerHidden(true);setTab("log");};

  const getWeightHistory=useCallback((exName)=>{
    return Object.entries(history).sort(([a],[b])=>a.localeCompare(b)).flatMap(([date,rec])=>{
      const e=rec.entries?.find(e=>e.name===exName);return e?[{date,weight:e.weight}]:[];
    });
  },[history]);

  const nextSessionLabel=useMemo(()=>{
    const short=DAY_SHORT[nextDay];
    const count=Object.values(history).filter(r=>r.day===nextDay).length+1;
    return isDeload?`${short}-D`:`${short}-${count}`;
  },[nextDay,history,isDeload]);

  if(!loaded) return (
    <div style={{minHeight:"100vh",background:"#0a0a0f",display:"flex",alignItems:"center",justifyContent:"center",color:"#6366f1",fontFamily:"sans-serif",fontSize:14,flexDirection:"column",gap:12}}>
      <div style={{width:32,height:32,border:"3px solid #6366f1",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      불러오는 중...
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#0a0a0f",fontFamily:"'Apple SD Gothic Neo','Pretendard',sans-serif",color:"#e8e8f0",paddingBottom:timer?180:120}}>
      {summaryRec&&<SummaryModal rec={summaryRec} onClose={()=>setSummaryRec(null)}/>}

      {/* ── 헤더 ── */}
      <div style={{background:"linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)",padding:"18px 20px 0",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        <div style={{maxWidth:600,margin:"0 auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <div>
              <div style={{fontSize:10,letterSpacing:3,color:"#6366f1",fontWeight:700,textTransform:"uppercase"}}>운동 트래커</div>
              <div style={{fontSize:20,fontWeight:800,marginTop:2}}>💪 나의 루틴</div>
              <div style={{fontSize:11,color:"#555",marginTop:4,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                다음 <span style={{color:"#a5b4fc",fontWeight:700}}>{nextSessionLabel}</span>
                {syncing&&<span style={{color:"#6366f1",fontSize:10}}>⟳ 동기화 중</span>}
                {!syncing&&syncStatus==="ok"&&<span style={{color:"#22c55e",fontSize:10}}>● 동기화됨</span>}
                {!syncing&&syncStatus==="error"&&<span style={{color:"#ef4444",fontSize:10}}>● 오프라인</span>}
                {isDeload&&<span style={{color:"#f59e0b",fontWeight:700,background:"rgba(245,158,11,0.12)",padding:"1px 7px",borderRadius:5}}>🔄 디로드</span>}
              </div>
            </div>
            <div>
            </div>
          </div>
          <div style={{display:"flex"}}>
            {[["log","기록"],["calendar","달력"],["history","히스토리"]].map(([v,label])=>(
              <button key={v} onClick={()=>setTab(v)} style={{flex:1,padding:"10px 0",border:"none",borderBottom:tab===v?"2px solid #6366f1":"2px solid transparent",background:"transparent",color:tab===v?"#a5b4fc":"#555",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:600,margin:"0 auto",padding:"0 16px"}}>

        {/* ══ 기록 탭 ══ */}
        {tab==="log"&&(
          <>
            {!bannerHidden&&(
              <div style={{margin:"16px 0 12px",padding:"14px 16px",background:isDeload?"rgba(245,158,11,0.08)":"rgba(99,102,241,0.08)",border:`1px solid ${isDeload?"rgba(245,158,11,0.25)":"rgba(99,102,241,0.2)"}`,borderRadius:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:10,color:isDeload?"#f59e0b":"#6366f1",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:3}}>{isDeload?"🔄 디로드 주":"오늘 할 차례"}</div>
                  <div style={{fontSize:16,fontWeight:800}}>{nextSessionLabel} · {DAY_LABEL[nextDay]}</div>
                  {isDeload&&<div style={{fontSize:11,color:"#f59e0b",marginTop:3}}>무게 60% · 회복에 집중해요</div>}
                </div>
                <button onClick={()=>{setActiveDay(nextDay);setSessionLog({});setCollapsed({});setBannerHidden(true);}}
                  style={{padding:"9px 18px",borderRadius:10,border:"none",background:isDeload?"#f59e0b":"#6366f1",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
                  시작하기 →
                </button>
              </div>
            )}

            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{color:DAY_COLOR[activeDay],background:DAY_COLOR[activeDay]+"22",border:`1px solid ${DAY_COLOR[activeDay]}44`,borderRadius:10,padding:"6px 14px",fontSize:15,fontWeight:800}}>{nextSessionLabel}</span>
                <span style={{fontSize:13,color:"#666"}}>{DAY_LABEL[activeDay]}</span>
              </div>
            </div>

            <div style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:11,color:"#555"}}>진행도</span>
                <span style={{fontSize:12,color:DAY_COLOR[activeDay],fontWeight:700}}>{completedCount} / {exercises.length}</span>
              </div>
              <div style={{height:3,background:"rgba(255,255,255,0.07)",borderRadius:2}}>
                <div style={{height:"100%",borderRadius:2,background:`linear-gradient(90deg,${DAY_COLOR[activeDay]},#8b5cf6)`,width:`${(completedCount/exercises.length)*100}%`,transition:"width 0.4s ease"}}/>
              </div>
            </div>

            {exercises.map(ex=>{
              const last=getLastSession(ex.name);
              const suggested=getSuggested(ex);
              const log=sessionLog[ex.name]||{};
              const weightVal=log.weight!==undefined?log.weight:String(suggested.weight);
              const targetReps=log.targetReps!==undefined?log.targetReps:suggested.reps;
              const setStatuses=log.sets||Array(ex.sets).fill(null);
              const {nextWeight,nextReps,bump,progressNote}=calcDoubleProgression(ex.name,parseFloat(weightVal)||suggested.weight,setStatuses,ex.reps,last);
              const done=isExDone(ex.name,ex.sets);
              const filled=setStatuses.filter(Boolean);
              const overall=filled.length===0?"fail":filled.filter(s=>s?.status==="fail").length>=1?"fail":"success";
              const si=done?getSI(overall):null;
              const step=getWeightStep(ex.name);
              const isCollapsed=collapsed[ex.name]&&done;
              const exType=getExType(ex.name);
              const typeLabel=exType==="barbell"?"바벨":exType==="dumbbell"?"덤벨":"머신/케이블";
              const typeColor=exType==="barbell"?"#f87171":exType==="dumbbell"?"#fb923c":"#60a5fa";
              const {min,max}=parseRepRange(ex.reps);
              const lastInfo=last?`저번: ${last.weight}kg × ${last.nextReps??min}회`:"첫 기록";

              return (
                <div key={ex.name} ref={el=>cardRefs.current[ex.name]=el}
                  style={{background:done&&si?`rgba(${si.rgb},0.04)`:"rgba(255,255,255,0.03)",border:`1px solid ${done&&si?si.color+"30":"rgba(255,255,255,0.07)"}`,borderRadius:16,marginBottom:10,overflow:"hidden",transition:"all 0.3s"}}>
                  <div style={{padding:"13px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:done?"pointer":"default"}}
                    onClick={()=>done&&setCollapsed(c=>({...c,[ex.name]:!c[ex.name]}))}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:7,height:7,borderRadius:"50%",background:done&&si?si.color:"rgba(255,255,255,0.12)",flexShrink:0,boxShadow:done&&si?`0 0 6px ${si.color}`:"none",transition:"all 0.3s"}}/>
                      <div>
                        <div style={{fontWeight:700,fontSize:14}}>{ex.name}</div>
                        <div style={{fontSize:10,color:"#555",marginTop:2}}>
                          {ex.sets}세트 · {ex.reps}회 · RIR {ex.rir} · <span style={{color:typeColor}}>{typeLabel}</span>
                          {isDeload&&<span style={{color:"#f59e0b",marginLeft:6}}>🔄</span>}
                        </div>
                        <div style={{fontSize:10,color:"#444",marginTop:1}}>{lastInfo}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:17,fontWeight:800,color:"#a5b4fc"}}>{parseFloat(weightVal)}kg</div>
                        <div style={{fontSize:10,color:"#555"}}>{targetReps}회 목표</div>
                        {done&&si&&<div style={{fontSize:10,color:si.color}}>{si.label} {si.text}</div>}
                      </div>
                      {done&&<div style={{color:"#333",fontSize:12,transform:isCollapsed?"rotate(-90deg)":"rotate(0deg)",transition:"transform 0.2s"}}>▾</div>}
                    </div>
                  </div>

                  {!isCollapsed&&(
                    <div style={{padding:"0 16px 16px"}}>
                      {/* 무게 조절 */}
                      <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:8}}>
                        <input type="number" step="0.5" value={weightVal} onChange={e=>updateWeight(ex.name,e.target.value)}
                          style={{flex:3,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:9,padding:"8px 6px",color:"#e8e8f0",fontSize:15,fontWeight:700,outline:"none",textAlign:"center"}}/>
                        <span style={{fontSize:12,color:"#444",flexShrink:0}}>kg</span>
                        <button onClick={()=>stepWeight(ex.name,-step,suggested.weight)}
                          style={{flex:2,height:38,borderRadius:9,border:"1px solid rgba(239,68,68,0.2)",background:"rgba(239,68,68,0.06)",color:"#f87171",fontSize:13,fontWeight:700,cursor:"pointer"}}>-{step}</button>
                        <button onClick={()=>stepWeight(ex.name,+step,suggested.weight)}
                          style={{flex:2,height:38,borderRadius:9,border:"1px solid rgba(34,197,94,0.2)",background:"rgba(34,197,94,0.06)",color:"#4ade80",fontSize:13,fontWeight:700,cursor:"pointer"}}>+{step}</button>
                      </div>

                      {/* 목표 횟수 */}
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,padding:"8px 12px",background:"rgba(255,255,255,0.025)",borderRadius:10}}>
                        <span style={{fontSize:11,color:"#666",flex:1}}>이번 세션 목표 횟수</span>
                        <button onClick={()=>updateTargetReps(ex.name,Math.max(min,targetReps-1))}
                          style={{width:32,height:28,borderRadius:7,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.04)",color:"#888",fontSize:14,cursor:"pointer",fontWeight:700}}>−</button>
                        <span style={{fontSize:15,fontWeight:800,color:"#a5b4fc",minWidth:28,textAlign:"center"}}>{targetReps}</span>
                        <button onClick={()=>updateTargetReps(ex.name,Math.min(max,targetReps+1))}
                          style={{width:32,height:28,borderRadius:7,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.04)",color:"#888",fontSize:14,cursor:"pointer",fontWeight:700}}>+</button>
                        <span style={{fontSize:11,color:"#444"}}>({min}~{max})</span>
                      </div>

                      {/* 세트 */}
                      <div style={{display:"flex",flexDirection:"column",gap:7}}>
                        {Array.from({length:ex.sets}).map((_,i)=>{
                          const cur=setStatuses[i]||null;
                          const ci=cur?getSI(cur.status):null;
                          const setReps=cur?.reps??targetReps;
                          const isFail=cur?.status==="fail";
                          const isSuccess=cur?.status==="success";
                          return (
                            <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:12,background:cur?`rgba(${ci.rgb},0.07)`:"rgba(255,255,255,0.025)",border:`1px solid ${cur?ci.color+"35":"rgba(255,255,255,0.05)"}`,transition:"all 0.2s"}}>
                              <div style={{width:28,height:28,borderRadius:"50%",flexShrink:0,background:cur?ci.color:"rgba(255,255,255,0.07)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:cur?"#fff":"#444"}}>
                                {i+1}
                              </div>
                              {/* 실패시 횟수 조절 */}
                              {isFail?(
                                <div style={{display:"flex",alignItems:"center",gap:5,flex:1}}>
                                  <button onClick={()=>updateSetReps(ex.name,i,Math.max(1,setReps-1),ex.sets)}
                                    style={{width:28,height:28,borderRadius:7,border:"1px solid rgba(239,68,68,0.25)",background:"rgba(239,68,68,0.08)",color:"#f87171",fontSize:14,cursor:"pointer",fontWeight:700}}>−</button>
                                  <span style={{fontSize:14,fontWeight:800,color:"#f87171",minWidth:28,textAlign:"center"}}>{setReps}</span>
                                  <button onClick={()=>updateSetReps(ex.name,i,Math.min(targetReps-1,setReps+1),ex.sets)}
                                    style={{width:28,height:28,borderRadius:7,border:"1px solid rgba(239,68,68,0.25)",background:"rgba(239,68,68,0.08)",color:"#f87171",fontSize:14,cursor:"pointer",fontWeight:700}}>+</button>
                                  <span style={{fontSize:11,color:"#666"}}>회 (목표 {targetReps})</span>
                                </div>
                              ):(
                                <div style={{flex:1,display:"flex",alignItems:"center"}}>
                                  {isSuccess?(
                                    <span style={{fontSize:13,fontWeight:700,color:"#22c55e"}}>{targetReps}회 ✓</span>
                                  ):(
                                    <span style={{fontSize:13,color:"#444"}}>{targetReps}회 목표</span>
                                  )}
                                </div>
                              )}
                              <div style={{display:"flex",gap:5}}>
                                {SET_STATUS.map(s=>(
                                  <button key={s.value} onClick={()=>updateSetStatus(ex.name,i,s.value,ex.sets)}
                                    style={{width:58,height:34,borderRadius:8,border:`1px solid ${cur?.status===s.value?s.color:"rgba(255,255,255,0.08)"}`,background:cur?.status===s.value?s.color+"20":"transparent",color:cur?.status===s.value?s.color:"#444",fontSize:11,fontWeight:600,cursor:"pointer",transition:"all 0.15s"}}>
                                    {s.label} {s.text}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {done&&progressNote&&(
                        <div style={{marginTop:10,padding:"9px 13px",background:bump?"rgba(99,102,241,0.14)":"rgba(99,102,241,0.07)",borderRadius:9,fontSize:12,color:"#a5b4fc",display:"flex",justifyContent:"space-between",alignItems:"center",border:bump?"1px solid rgba(99,102,241,0.35)":"none",flexWrap:"wrap",gap:4}}>
                          <span>{progressNote}</span>
                          <span style={{color:"#818cf8",fontWeight:800}}>→ {nextWeight}kg {nextReps}회</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <textarea placeholder="오늘 메모 (컨디션, 부상, 특이사항...)" value={sessionNote}
              onChange={e=>{setSessionNote(e.target.value);if(sessionStart)sSet(SK.session,{start:sessionStart,note:e.target.value});}}
              rows={2} style={{width:"100%",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"10px 14px",color:"#e8e8f0",fontSize:13,outline:"none",resize:"none",fontFamily:"inherit",boxSizing:"border-box",marginBottom:10}}/>

            <button onClick={handleFinish} disabled={!hasAnyInput}
              style={{width:"100%",padding:16,borderRadius:14,border:"none",background:!hasAnyInput?"rgba(255,255,255,0.04)":"linear-gradient(135deg,#6366f1,#8b5cf6)",color:!hasAnyInput?"#333":"#fff",fontSize:15,fontWeight:800,cursor:!hasAnyInput?"not-allowed":"pointer",marginBottom:8,transition:"all 0.3s"}}>
              {!hasAnyInput?"세트를 먼저 기록해주세요":`🏁 운동 끝! ${completedCount<exercises.length?`(${completedCount}/${exercises.length})`:"완료"}`}
            </button>

            {toast&&(
              <div style={{padding:"11px 16px",borderRadius:12,fontSize:13,fontWeight:600,textAlign:"center",background:toast.type==="error"?"rgba(239,68,68,0.1)":"rgba(34,197,94,0.1)",border:`1px solid ${toast.type==="error"?"rgba(239,68,68,0.3)":"rgba(34,197,94,0.3)"}`,color:toast.type==="error"?"#ef4444":"#22c55e"}}>
                {toast.msg}
              </div>
            )}
          </>
        )}

        {/* ══ 달력 탭 ══ */}
        {tab==="calendar"&&(
          <div style={{paddingTop:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <button onClick={()=>setCalMonth(p=>new Date(p.getFullYear(),p.getMonth()-1,1))} style={{width:36,height:36,borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.04)",color:"#888",fontSize:18,cursor:"pointer"}}>‹</button>
              <div style={{fontWeight:700,fontSize:16}}>{calMonth.getFullYear()}년 {calMonth.getMonth()+1}월</div>
              <button onClick={()=>setCalMonth(p=>new Date(p.getFullYear(),p.getMonth()+1,1))} style={{width:36,height:36,borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.04)",color:"#888",fontSize:18,cursor:"pointer"}}>›</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:8}}>
              {WEEKDAYS.map((w,i)=><div key={w} style={{textAlign:"center",fontSize:11,fontWeight:600,color:i===0?"#ef4444":i===6?"#6366f1":"#555",padding:"4px 0"}}>{w}</div>)}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
              {calDays.map((date,i)=>{
                if(!date)return<div key={i}/>;
                const key=toDateKey(date);
                const rec=history[key];
                const inProgress=key===today&&bannerHidden&&!rec;
                const displayRec=rec||(inProgress?{day:activeDay,inProgress:true}:null);
                const isToday=key===today,isSel=key===selectedDate;
                const color=displayRec?DAY_COLOR[displayRec.day]:null;
                return (
                  <button key={key} onClick={()=>setSelectedDate(isSel?null:key)}
                    style={{aspectRatio:"1",borderRadius:10,border:`2px solid ${isSel?(color||"#6366f1"):isToday?"rgba(99,102,241,0.4)":"transparent"}`,background:isSel?(color||"#6366f1")+"22":isToday?"rgba(99,102,241,0.08)":"rgba(255,255,255,0.02)",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,transition:"all 0.15s"}}>
                    <span style={{fontSize:13,fontWeight:isToday?800:400,color:isToday?"#a5b4fc":date.getDay()===0?"#f87171":date.getDay()===6?"#818cf8":"#bbb"}}>{date.getDate()}</span>
                    {displayRec&&<span style={{fontSize:9,fontWeight:800,color,background:color+"20",borderRadius:4,padding:"1px 4px",lineHeight:1.4,opacity:inProgress?0.6:1}}>{inProgress?nextSessionLabel:(displayRec.label||DAY_SHORT[displayRec.day])}</span>}
                  </button>
                );
              })}
            </div>
            {!bannerHidden&&(
              <div style={{marginTop:20,padding:"14px 16px",background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:10,color:"#6366f1",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:3}}>오늘 할 차례</div>
                  <div style={{fontSize:16,fontWeight:800}}>{nextSessionLabel} · {DAY_LABEL[nextDay]}</div>
                </div>
                <button onClick={()=>startToday(nextDay)} style={{padding:"8px 16px",borderRadius:10,border:"none",background:"#6366f1",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>시작하기 →</button>
              </div>
            )}
            {selectedDate&&(
              <div style={{marginTop:16}}>
                <div style={{fontSize:13,fontWeight:700,color:"#666",marginBottom:10,display:"flex",alignItems:"center",flexWrap:"wrap",gap:6}}>
                  {selectedDate}
                  {selectedRecord?(
                    <>
                      <span style={{color:DAY_COLOR[selectedRecord.day],background:DAY_COLOR[selectedRecord.day]+"20",borderRadius:6,padding:"2px 8px",fontSize:12}}>{selectedRecord.label||DAY_SHORT[selectedRecord.day]} · {DAY_LABEL[selectedRecord.day]}</span>
                      {selectedRecord.partial&&<span style={{fontSize:11,color:"#f59e0b"}}>부분 ✂️</span>}
                      {selectedRecord.duration&&<span style={{fontSize:11,color:"#6366f1"}}>⏱ {fmtDur(selectedRecord.duration)}</span>}
                      {selectedRecord.deload&&<span style={{fontSize:11,color:"#f59e0b"}}>🔄 디로드</span>}
                    </>
                  ):<span>— 운동 없음</span>}
                </div>
                {selectedRecord?.note&&<div style={{marginBottom:10,padding:"8px 12px",background:"rgba(255,255,255,0.03)",borderRadius:10,fontSize:12,color:"#777",fontStyle:"italic"}}>📝 {selectedRecord.note}</div>}
                {selectedRecord?.entries?.map(entry=>{
                  const si=getSI(entry.overall);
                  return (
                    <div key={entry.name} style={{padding:"10px 14px",background:"rgba(255,255,255,0.025)",borderRadius:12,marginBottom:7,border:"1px solid rgba(255,255,255,0.05)"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                        <div>
                          <div style={{fontSize:13,fontWeight:600}}>{entry.name}{entry.bump?" 🔥":""}</div>
                          <div style={{fontSize:11,color:"#444"}}>다음 → <span style={{color:"#a5b4fc",fontWeight:700}}>{entry.nextWeight}kg {entry.nextReps}회</span></div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:15,fontWeight:800}}>{entry.weight}kg</div>
                          {si&&<div style={{fontSize:10,color:si.color}}>{si.label} {si.text}</div>}
                        </div>
                      </div>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                        {(entry.sets||[]).map((st,i)=>{const s=getSI(st?.status||st);return<div key={i} style={{padding:"2px 7px",borderRadius:5,fontSize:10,fontWeight:600,background:s?s.color+"18":"rgba(255,255,255,0.04)",color:s?s.color:"#333"}}>{i+1}세트 {s?.label||"—"} {st?.reps?`${st.reps}회`:""}</div>;})}
                      </div>
                      {entry.progressNote&&<div style={{marginTop:6,fontSize:11,color:"#6366f1"}}>{entry.progressNote}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ 히스토리 탭 ══ */}
        {tab==="history"&&(
          <div style={{paddingTop:16}}>
            {!Object.keys(history).length?(
              <div style={{textAlign:"center",padding:"60px 0",color:"#444"}}><div style={{fontSize:40,marginBottom:12}}>📋</div><div>아직 기록이 없어요</div></div>
            ):(
              <>
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:11,color:"#555",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>무게 추이 · 1RM</div>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>
                    {Array.from(new Set(Object.values(history).flatMap(r=>r.entries?.map(e=>e.name)||[]))).map(exName=>(
                      <button key={exName} onClick={()=>setGraphEx(graphEx===exName?null:exName)}
                        style={{padding:"5px 10px",borderRadius:8,border:`1px solid ${graphEx===exName?"#6366f1":"rgba(255,255,255,0.08)"}`,background:graphEx===exName?"rgba(99,102,241,0.12)":"rgba(255,255,255,0.03)",color:graphEx===exName?"#a5b4fc":"#555",fontSize:11,fontWeight:600,cursor:"pointer"}}>
                        {exName}
                      </button>
                    ))}
                  </div>
                  {graphEx&&(
                    <div style={{padding:"14px",background:"rgba(255,255,255,0.025)",borderRadius:14,border:"1px solid rgba(255,255,255,0.06)"}}>
                      <div style={{fontSize:13,fontWeight:700,color:"#a5b4fc",marginBottom:10}}>{graphEx}</div>
                      <MiniChart data={getWeightHistory(graphEx)} color="#6366f1" exName={graphEx}/>
                    </div>
                  )}
                </div>
                {DAY_KEYS.map(day=>{
                  const recs=Object.entries(history).filter(([,r])=>r.day===day).sort(([a],[b])=>b.localeCompare(a)).slice(0,5);
                  if(!recs.length)return null;
                  return (
                    <div key={day} style={{marginBottom:24}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                        <span style={{color:DAY_COLOR[day],background:DAY_COLOR[day]+"20",borderRadius:7,padding:"3px 10px",fontSize:13,fontWeight:800}}>{DAY_SHORT[day]}</span>
                        <span style={{fontSize:12,color:"#555"}}>{DAY_LABEL[day]}</span>
                        <span style={{fontSize:11,color:"#333",marginLeft:"auto"}}>최근 {recs.length}회</span>
                      </div>
                      {recs.map(([date,rec])=>(
                        <div key={date} style={{marginBottom:14,padding:"12px 14px",background:"rgba(255,255,255,0.025)",borderRadius:14,border:"1px solid rgba(255,255,255,0.05)"}}>
                          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10,flexWrap:"wrap"}}>
                            <span style={{color:DAY_COLOR[rec.day],background:DAY_COLOR[rec.day]+"20",borderRadius:6,padding:"2px 8px",fontSize:12,fontWeight:800}}>{rec.label||DAY_SHORT[rec.day]}</span>
                            <span style={{fontSize:12,color:"#666"}}>{date}</span>
                            {rec.partial&&<span style={{fontSize:10,color:"#f59e0b",background:"rgba(245,158,11,0.1)",borderRadius:5,padding:"1px 6px"}}>부분 ✂️</span>}
                            {rec.duration&&<span style={{fontSize:10,color:"#6366f1",background:"rgba(99,102,241,0.1)",borderRadius:5,padding:"1px 6px"}}>⏱ {fmtDur(rec.duration)}</span>}
                            {rec.deload&&<span style={{fontSize:10,color:"#f59e0b",background:"rgba(245,158,11,0.1)",borderRadius:5,padding:"1px 6px"}}>🔄 디로드</span>}
                            <button onClick={async()=>{if(window.confirm(`${date} 기록을 삭제할까요?`)){setHistory(p=>{const n={...p};delete n[date];return n;});await deleteFromSupabase(date);}}}
                              style={{marginLeft:"auto",width:28,height:28,borderRadius:7,border:"1px solid rgba(239,68,68,0.2)",background:"rgba(239,68,68,0.07)",color:"#ef4444",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>🗑</button>
                          </div>
                          {rec.note&&<div style={{marginBottom:8,padding:"6px 10px",background:"rgba(255,255,255,0.02)",borderRadius:8,fontSize:11,color:"#666",fontStyle:"italic"}}>📝 {rec.note}</div>}
                          {rec.entries?.map(entry=>{
                            const si=getSI(entry.overall);
                            return (
                              <div key={entry.name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:"rgba(255,255,255,0.02)",borderRadius:10,marginBottom:5,border:`1px solid ${si?si.color+"20":"rgba(255,255,255,0.04)"}`}}>
                                <div>
                                  <div style={{fontSize:12,fontWeight:600}}>{entry.name}{entry.bump?" 🔥":""}</div>
                                  <div style={{fontSize:10,color:"#444"}}>→ {entry.nextWeight}kg {entry.nextReps}회</div>
                                  {entry.progressNote&&<div style={{fontSize:10,color:"#6366f1",marginTop:2}}>{entry.progressNote}</div>}
                                </div>
                                <div style={{textAlign:"right"}}>
                                  <div style={{fontSize:14,fontWeight:800}}>{entry.weight}kg</div>
                                  {si&&<div style={{fontSize:10,color:si.color}}>{si.label}</div>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </>
            )}
            {/* 데이터 관리 */}
            <div style={{marginTop:24,paddingTop:20,borderTop:"1px solid rgba(255,255,255,0.06)"}}>
              <div style={{fontSize:11,color:"#444",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:12}}>데이터 관리</div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{
                  const blob=new Blob([JSON.stringify(history,null,2)],{type:"application/json"});
                  const url=URL.createObjectURL(blob);const a=document.createElement("a");
                  a.href=url;a.download=`workout-backup-${toDateKey()}.json`;a.click();URL.revokeObjectURL(url);
                }} style={{flex:1,padding:"11px 0",borderRadius:11,border:"1px solid rgba(99,102,241,0.25)",background:"rgba(99,102,241,0.08)",color:"#a5b4fc",fontSize:13,fontWeight:700,cursor:"pointer"}}>
                  📤 백업 저장
                </button>
                <button onClick={()=>{
                  const input=document.createElement("input");input.type="file";input.accept=".json";
                  input.onchange=async(e)=>{
                    const file=e.target.files[0];if(!file)return;
                    const reader=new FileReader();
                    reader.onload=async(ev)=>{
                      try{
                        const data=JSON.parse(ev.target.result);
                        if(window.confirm("기존 데이터를 백업 파일로 덮어쓸까요?")){
                          setHistory(data);
                          for(const[date,rec]of Object.entries(data)){
                            await supabase.from("workout_history").upsert({date,data:rec},{onConflict:"date"});
                          }
                          showToast("복원 완료! ✅","success");
                        }
                      }catch{showToast("파일이 올바르지 않아요","error");}
                    };
                    reader.readAsText(file);
                  };
                  input.click();
                }} style={{flex:1,padding:"11px 0",borderRadius:11,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.04)",color:"#888",fontSize:13,fontWeight:700,cursor:"pointer"}}>
                  📥 백업 복원
                </button>
              </div>
              <div style={{marginTop:8,fontSize:11,color:"#333",textAlign:"center"}}>데이터는 Supabase DB에 자동 저장됩니다</div>
            </div>
          </div>
        )}
      </div>

      {/* ── 휴식 타이머 ── */}
      {timer&&(
        <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:100}}>
          <div style={{height:3,background:"rgba(255,255,255,0.06)"}}>
            <div style={{height:"100%",background:timer.remaining>30?"linear-gradient(90deg,#6366f1,#8b5cf6)":"linear-gradient(90deg,#ef4444,#f59e0b)",width:`${(timer.remaining/timer.total)*100}%`,transition:"width 1s linear"}}/>
          </div>
          <div style={{background:"#0f0f18",borderTop:"1px solid rgba(255,255,255,0.07)",padding:"12px 20px",display:"flex",alignItems:"center",gap:12}}>
            <button onClick={()=>adjustTimer(-30)} style={{width:46,height:38,borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.04)",color:"#666",fontSize:12,cursor:"pointer",fontWeight:700}}>-30</button>
            <div style={{flex:1,textAlign:"center"}}>
              <div style={{fontSize:10,color:"#444",marginBottom:1}}>휴식 · {timer.exName}</div>
              <div style={{fontSize:28,fontWeight:800,color:timer.remaining<=30?"#ef4444":"#e8e8f0",letterSpacing:2,fontVariantNumeric:"tabular-nums"}}>{fmtTime(timer.remaining)}</div>
            </div>
            <button onClick={()=>adjustTimer(30)} style={{width:46,height:38,borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.04)",color:"#666",fontSize:12,cursor:"pointer",fontWeight:700}}>+30</button>
            <button onClick={dismissTimer} style={{width:38,height:38,borderRadius:10,border:"1px solid rgba(239,68,68,0.25)",background:"rgba(239,68,68,0.08)",color:"#ef4444",fontSize:15,cursor:"pointer"}}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
