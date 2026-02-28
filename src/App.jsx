import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ─── 운동 분류 ────────────────────────────────────────────────────
const COMPOUND_LIST = [
  "바벨 벤치프레스","바벨 스쿼트","데드리프트","루마니안 데드리프트",
  "바벨 오버헤드 프레스","힙 쓰러스트","불가리안 스플릿 스쿼트",
  "레그 프레스","바벨 벤트오버 로우","바벨 컬",
];
const DUMBBELL_LIST = ["인클라인 덤벨 프레스","인클라인 덤벨 컬"];

const getExType = (name) => {
  if (COMPOUND_LIST.includes(name)) return "compound";
  if (DUMBBELL_LIST.includes(name)) return "dumbbell";
  return "isolation";
};

// ±2.5 통일
const WEIGHT_STEPS = {
  compound:  [-2.5, +2.5],
  dumbbell:  [-2.5, +2.5],
  isolation: [-2.5, +2.5],
};

const getBumpAmount = (name) => getExType(name) === "compound" ? 5 : 2.5;

// ─── 루틴 ─────────────────────────────────────────────────────────
const DAY_KEYS  = ["Day 1","Day 2","Day 3","Day 4"];
const DAY_SHORT = { "Day 1":"R1","Day 2":"R2","Day 3":"R3","Day 4":"R4" };
const DAY_LABEL = { "Day 1":"상체 Push","Day 2":"하체 쿼드","Day 3":"상체 Pull","Day 4":"하체 글루트/햄" };
const DAY_COLOR = { "Day 1":"#6366f1","Day 2":"#22c55e","Day 3":"#f59e0b","Day 4":"#ef4444" };

const ROUTINE = {
  "Day 1": [
    { name:"바벨 벤치프레스",      defaultWeight:62.5, sets:4, reps:"6~8",   rir:"1~2" },
    { name:"인클라인 덤벨 프레스", defaultWeight:26,   sets:3, reps:"10~12", rir:"1~2" },
    { name:"케이블 플라이",        defaultWeight:12.5, sets:3, reps:"12~15", rir:"1"   },
    { name:"바벨 오버헤드 프레스", defaultWeight:42.5, sets:3, reps:"8~10",  rir:"1~2" },
    { name:"사이드 레터럴 레이즈", defaultWeight:12.5, sets:4, reps:"15~20", rir:"1"   },
    { name:"트라이셉스 푸시다운",  defaultWeight:22.5, sets:3, reps:"12~15", rir:"1~2" },
  ],
  "Day 2": [
    { name:"바벨 스쿼트",           defaultWeight:77.5, sets:4, reps:"6~8",   rir:"1~2" },
    { name:"레그 프레스",           defaultWeight:120,  sets:3, reps:"10~12", rir:"1~2" },
    { name:"불가리안 스플릿 스쿼트",defaultWeight:20,   sets:3, reps:"10~12", rir:"1~2" },
    { name:"레그 익스텐션",         defaultWeight:50,   sets:3, reps:"12~15", rir:"1"   },
    { name:"레그 컬",               defaultWeight:45,   sets:3, reps:"12~15", rir:"1~2" },
    { name:"카프 레이즈",           defaultWeight:60,   sets:4, reps:"15~20", rir:"1"   },
    { name:"행잉 레그 레이즈",      defaultWeight:0,    sets:3, reps:"12~15", rir:"1"   },
  ],
  "Day 3": [
    { name:"데드리프트",         defaultWeight:92.5, sets:4, reps:"5~6",   rir:"2~3" },
    { name:"바벨 벤트오버 로우", defaultWeight:60,   sets:4, reps:"8~10",  rir:"1~2" },
    { name:"랫 풀다운",          defaultWeight:60,   sets:3, reps:"10~12", rir:"1~2" },
    { name:"시티드 케이블 로우", defaultWeight:55,   sets:3, reps:"10~12", rir:"1~2" },
    { name:"페이스 풀",          defaultWeight:20,   sets:3, reps:"15~20", rir:"1~2" },
    { name:"바벨 컬",            defaultWeight:32.5, sets:3, reps:"10~12", rir:"1~2" },
    { name:"인클라인 덤벨 컬",   defaultWeight:11,   sets:3, reps:"12~15", rir:"1~2" },
  ],
  "Day 4": [
    { name:"루마니안 데드리프트", defaultWeight:82.5, sets:4, reps:"8~10",  rir:"1~2" },
    { name:"힙 쓰러스트",         defaultWeight:85,   sets:4, reps:"10~12", rir:"1~2" },
    { name:"레그 프레스",         defaultWeight:120,  sets:3, reps:"10~12", rir:"1~2" },
    { name:"레그 컬",             defaultWeight:45,   sets:3, reps:"12~15", rir:"1"   },
    { name:"레그 익스텐션",       defaultWeight:50,   sets:3, reps:"15",    rir:"1"   },
    { name:"카프 레이즈",         defaultWeight:60,   sets:4, reps:"15~20", rir:"1"   },
    { name:"케이블 크런치",       defaultWeight:30,   sets:3, reps:"12~15", rir:"1"   },
  ],
};

// ─── 기본 히스토리 (2026-02-27 R1-1 백업) ─────────────────────────
const DEFAULT_HISTORY = {
  "2026-02-27": {
    day: "Day 1",
    label: "R1-1",
    deload: false,
    partial: false,
    duration: null,
    note: "",
    entries: [
      { name:"바벨 벤치프레스",      weight:60,   sets:["success","success","success","success"], overall:"success", date:"2026-02-27", nextWeight:62.5, bump:false, reps:"6~8"   },
      { name:"인클라인 덤벨 프레스", weight:25,   sets:["success","success","success"],           overall:"success", date:"2026-02-27", nextWeight:26,   bump:false, reps:"10~12" },
      { name:"케이블 플라이",        weight:10,   sets:["success","success","success"],           overall:"success", date:"2026-02-27", nextWeight:12.5, bump:false, reps:"12~15" },
      { name:"바벨 오버헤드 프레스", weight:40,   sets:["success","success","success"],           overall:"success", date:"2026-02-27", nextWeight:42.5, bump:false, reps:"8~10"  },
      { name:"사이드 레터럴 레이즈", weight:10,   sets:["success","success","success","success"], overall:"success", date:"2026-02-27", nextWeight:12.5, bump:false, reps:"15~20" },
      { name:"트라이셉스 푸시다운",  weight:20,   sets:["success","success","success"],           overall:"success", date:"2026-02-27", nextWeight:22.5, bump:false, reps:"12~15" },
    ],
  },
};

// ─── 상수 ─────────────────────────────────────────────────────────
const SET_STATUS = [
  { value:"success", label:"✅", text:"성공", color:"#22c55e", rgb:"34,197,94"  },
  { value:"close",   label:"⚠️", text:"간신", color:"#f59e0b", rgb:"245,158,11" },
  { value:"fail",    label:"❌", text:"실패", color:"#ef4444", rgb:"239,68,68"  },
];
const WEEKDAYS     = ["일","월","화","수","목","금","토"];
const DELOAD_CYCLE = 4;

// ─── 유틸 함수 ────────────────────────────────────────────────────
const getSI = (v) => SET_STATUS.find(s => s.value === v) || null;

const toDateKey = (d) => {
  const dt = d || new Date();
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
};

const fmtTime = (s) => {
  return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
};

const epley1RM = (w, repsStr) => {
  const r = parseInt(repsStr?.split("~")[1] || repsStr || "10");
  return +(w * (1 + r/30)).toFixed(1);
};

const parseRepsRange = (repsStr) => {
  if (!repsStr) return [10];
  const parts = repsStr.split("~");
  if (parts.length === 1) return [parseInt(parts[0])];
  const lo = parseInt(parts[0]);
  const hi = parseInt(parts[1]);
  const result = [];
  for (let i = lo; i <= hi; i++) result.push(i);
  return result;
};

// ─── 점진적 과부하 로직 ───────────────────────────────────────────
function calcNextWeight(name, weight, setStatuses, prevOverall) {
  const filled = (setStatuses || []).filter(Boolean);
  if (!filled.length) return { next: weight, overall: null, bump: false };

  const totalSets  = setStatuses.length;
  const failCnt    = filled.filter(s => s === "fail").length;
  const allSuccess = filled.every(s => s === "success") && filled.length === totalSets;
  const bumpAmt    = getBumpAmount(name);
  const stepAmt    = WEIGHT_STEPS[getExType(name)][1];

  let overall, next, bump = false;
  if      (failCnt >= 2) { overall = "fail";    next = +(weight - stepAmt).toFixed(1); }
  else if (failCnt === 1) { overall = "close";  next = weight; }
  else                    { overall = "success"; next = +(weight + stepAmt).toFixed(1); }

  if (allSuccess && prevOverall === "success") {
    bump = true;
    next = +(weight + bumpAmt).toFixed(1);
  }
  return { next, overall, bump };
}

function isDeloadSession(totalSaved) {
  if (totalSaved === 0) return false;
  return totalSaved % (DELOAD_CYCLE * 4) === 0;
}

function getDeloadWeight(weight) {
  return +(weight * 0.6).toFixed(1);
}

function getRecLabel(day, deload, existingLabel, historyObj) {
  if (existingLabel) return existingLabel;
  const short = DAY_SHORT[day];
  const count = Object.values(historyObj || {}).filter(r => r.day === day).length + 1;
  return deload ? `${short}-D` : `${short}-${count}`;
}

// ─── localStorage 헬퍼 ────────────────────────────────────────────
const SK = {
  history:    "wt_v11_history",
  timer:      "wt_v11_timer",
  sessionLog: "wt_v11_sessionLog",
  activeDay:  "wt_v11_activeDay",
};

const sGet = (k) => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; }
  catch { return null; }
};
const sSet = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); }
  catch(e) { console.error(e); }
};
const sDel = (k) => {
  try { localStorage.removeItem(k); }
  catch {}
};

// ─── MiniChart ────────────────────────────────────────────────────
function MiniChart({ data, color, exName }) {
  if (!data || data.length < 2) {
    return (
      <div style={{ fontSize:11, color:"#444", padding:"10px 0", textAlign:"center" }}>
        데이터 2개 이상 필요해요
      </div>
    );
  }

  const W = 300, H = 64, P = 12;
  const weights = data.map(d => d.weight);
  const mins  = Math.min(...weights);
  const maxs  = Math.max(...weights);
  const range = maxs - mins || 1;

  const pts = data.map((d, i) => ({
    x: P + (i / (data.length - 1)) * (W - P * 2),
    y: P + (1 - (d.weight - mins) / range) * (H - P * 2),
    ...d,
  }));

  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${path} L${pts[pts.length-1].x},${H} L${pts[0].x},${H} Z`;

  const latest = data[data.length - 1];
  const dayKey = Object.keys(ROUTINE).find(k => ROUTINE[k].find(e => e.name === exName));
  const exDef  = dayKey ? ROUTINE[dayKey].find(e => e.name === exName) : null;
  const orm    = exDef ? epley1RM(latest.weight, exDef.reps) : "—";
  const gradId = `grad_${color.replace("#","")}`;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <span style={{ fontSize:12, color:"#888" }}>최근 {data.length}회</span>
        <span style={{ fontSize:12, color:"#a5b4fc", fontWeight:700 }}>
          추정 1RM <span style={{ fontSize:15 }}>{orm}kg</span>
        </span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow:"visible" }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0"    />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradId})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3.5" fill={color} />
            {(i === 0 || i === pts.length - 1) && (
              <text
                x={p.x} y={p.y - 8}
                textAnchor={i === 0 ? "start" : "end"}
                fontSize="10" fill={color} fontWeight="700"
              >
                {p.weight}kg
              </text>
            )}
          </g>
        ))}
      </svg>
      <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:8 }}>
        {data.map((d, i) => (
          <div key={i} style={{ fontSize:10, color:"#555", background:"rgba(255,255,255,0.03)", borderRadius:5, padding:"2px 7px" }}>
            {d.date.slice(5)} <span style={{ color:"#a5b4fc", fontWeight:700 }}>{d.weight}kg</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SummaryModal ─────────────────────────────────────────────────
function SummaryModal({ rec, onClose }) {
  if (!rec) return null;

  const totalVolume = rec.entries.reduce((acc, e) => {
    const repStr  = String(e.selectedReps ?? e.reps ?? "10");
    const repNum  = parseInt(repStr.split("~")[1] || repStr);
    const doneSets = (e.sets || []).filter(Boolean).length;
    return acc + e.weight * repNum * doneSets;
  }, 0);

  const successCount = rec.entries.filter(e => e.overall === "success").length;
  const bumpCount    = rec.entries.filter(e => e.bump).length;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"#13131f", borderRadius:20, padding:24, width:"100%", maxWidth:460, border:"1px solid rgba(255,255,255,0.08)", maxHeight:"85vh", overflowY:"auto" }}>
        <div style={{ textAlign:"center", marginBottom:20 }}>
          <div style={{ fontSize:36, marginBottom:8 }}>🎉</div>
          <div style={{ fontSize:20, fontWeight:900, color:"#e8e8f0" }}>운동 완료!</div>
          <div style={{ fontSize:12, color:"#555", marginTop:4 }}>{DAY_SHORT[rec.day]} · {DAY_LABEL[rec.day]}</div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
          {[
            { label:"총 볼륨",   value:`${Math.round(totalVolume).toLocaleString()}kg`, color:"#a5b4fc" },
            { label:"성공 운동", value:`${successCount}/${rec.entries.length}`,          color:"#fbbf24" },
          ].map(s => (
            <div key={s.label} style={{ background:"rgba(255,255,255,0.04)", borderRadius:12, padding:"12px 8px", textAlign:"center", border:"1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize:18, fontWeight:900, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:10, color:"#555", marginTop:3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {bumpCount > 0 && (
          <div style={{ marginBottom:16, padding:"10px 14px", background:"rgba(99,102,241,0.12)", borderRadius:12, border:"1px solid rgba(99,102,241,0.3)", fontSize:13, color:"#a5b4fc", fontWeight:600, textAlign:"center" }}>
            🔥 {bumpCount}개 운동에서 2연속 성공! 무게 점프!
          </div>
        )}

        <div style={{ display:"flex", flexDirection:"column", gap:7, marginBottom:20 }}>
          {rec.entries.map(e => {
            const si      = getSI(e.overall);
            const repStr  = String(e.selectedReps ?? e.reps ?? "10");
            const repNum  = parseInt(repStr.split("~")[1] || repStr);
            const doneSets = (e.sets || []).filter(Boolean).length;
            const vol     = Math.round(e.weight * repNum * doneSets);
            return (
              <div key={e.name} style={{ padding:"9px 12px", background:"rgba(255,255,255,0.03)", borderRadius:10, border:`1px solid ${si ? si.color+"25" : "rgba(255,255,255,0.06)"}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{e.name}{e.bump ? " 🔥" : ""}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:13, fontWeight:800, color:"#e8e8f0" }}>{e.weight}kg</span>
                    {si && <span style={{ fontSize:11, color:si.color }}>{si.label}</span>}
                    <span style={{ fontSize:11, color:"#444" }}>→ {e.nextWeight}kg</span>
                  </div>
                </div>
                <div style={{ fontSize:10, color:"#555", marginTop:3 }}>
                  {repStr}회 × {doneSets}세트 = <span style={{ color:"#6366f1", fontWeight:700 }}>{vol.toLocaleString()}kg</span>
                </div>
              </div>
            );
          })}
        </div>

        {rec.note && (
          <div style={{ marginBottom:16, padding:"8px 12px", background:"rgba(255,255,255,0.03)", borderRadius:10, fontSize:12, color:"#888", fontStyle:"italic" }}>
            📝 {rec.note}
          </div>
        )}

        <button onClick={onClose} style={{ width:"100%", padding:14, borderRadius:12, border:"none", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer" }}>
          확인
        </button>
      </div>
    </div>
  );
}

// ─── ManualEntryModal ─────────────────────────────────────────────
function ManualEntryModal({ date, onClose, onSave, history }) {
  const [selectedDay, setSelectedDay] = useState(DAY_KEYS[0]);
  const [weights,     setWeights]     = useState({});
  const [statuses,    setStatuses]    = useState({});
  const [note,        setNote]        = useState("");

  const exercises = ROUTINE[selectedDay];

  const getDefaultW = (ex) => {
    const recs = Object.entries(history)
      .filter(([, r]) => r.day === selectedDay)
      .sort(([a], [b]) => b.localeCompare(a));
    if (recs.length) {
      const found = recs[0][1].entries?.find(e => e.name === ex.name);
      if (found) return found.nextWeight;
    }
    return ex.defaultWeight;
  };

  const handleSave = () => {
    const entries = exercises.map(ex => {
      const w    = parseFloat(weights[ex.name] ?? getDefaultW(ex));
      const sets = statuses[ex.name] || Array(ex.sets).fill("success");
      const prevRec = Object.entries(history)
        .filter(([, r]) => r.day === selectedDay)
        .sort(([a], [b]) => b.localeCompare(a))[0]?.[1]
        ?.entries?.find(e => e.name === ex.name);
      const { next, overall, bump } = calcNextWeight(ex.name, w, sets, prevRec?.overall);
      return { name:ex.name, weight:w, sets, overall:overall||"success", date, nextWeight:next, bump, reps:ex.reps };
    });
    const label = getRecLabel(selectedDay, false, null, history);
    onSave({ day:selectedDay, entries, partial:false, duration:null, note, deload:false, label });
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#13131f", borderRadius:20, padding:20, width:"100%", maxWidth:460, border:"1px solid rgba(255,255,255,0.08)", maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ fontWeight:800, fontSize:16 }}>{date} 수동 입력</div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:"1px solid rgba(255,255,255,0.1)", background:"transparent", color:"#888", fontSize:16, cursor:"pointer" }}>✕</button>
        </div>

        {/* 루틴 선택 */}
        <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
          {DAY_KEYS.map(d => (
            <button key={d} onClick={() => setSelectedDay(d)}
              style={{ padding:"6px 14px", borderRadius:9, border:`1px solid ${selectedDay===d ? DAY_COLOR[d] : "rgba(255,255,255,0.08)"}`, background:selectedDay===d ? DAY_COLOR[d]+"20" : "transparent", color:selectedDay===d ? DAY_COLOR[d] : "#555", fontSize:12, fontWeight:700, cursor:"pointer" }}>
              {DAY_SHORT[d]}
            </button>
          ))}
        </div>

        {/* 운동별 입력 */}
        {exercises.map(ex => {
          const defW    = getDefaultW(ex);
          const curSets = statuses[ex.name] || Array(ex.sets).fill("success");
          return (
            <div key={ex.name} style={{ marginBottom:12, padding:"10px 12px", background:"rgba(255,255,255,0.03)", borderRadius:12, border:"1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>{ex.name}</div>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
                <input
                  type="number" step="0.5"
                  value={weights[ex.name] ?? defW}
                  onChange={e => setWeights(p => ({ ...p, [ex.name]: e.target.value }))}
                  style={{ width:80, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:8, padding:"6px 8px", color:"#e8e8f0", fontSize:14, fontWeight:700, outline:"none", textAlign:"center" }}
                />
                <span style={{ fontSize:12, color:"#444" }}>kg · {ex.sets}세트 × {ex.reps}회</span>
              </div>
              <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                {Array.from({ length: ex.sets }).map((_, i) =>
                  SET_STATUS.map(s => (
                    <button
                      key={`${i}-${s.value}`}
                      onClick={() => {
                        const next = [...curSets];
                        next[i] = s.value;
                        setStatuses(p => ({ ...p, [ex.name]: next }));
                      }}
                      style={{ padding:"3px 8px", borderRadius:6, border:`1px solid ${curSets[i]===s.value ? s.color : "rgba(255,255,255,0.07)"}`, background:curSets[i]===s.value ? s.color+"20" : "transparent", color:curSets[i]===s.value ? s.color : "#444", fontSize:10, cursor:"pointer" }}>
                      {i+1} {s.label}
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}

        <textarea
          placeholder="메모..." value={note} onChange={e => setNote(e.target.value)} rows={2}
          style={{ width:"100%", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10, padding:"8px 12px", color:"#e8e8f0", fontSize:12, outline:"none", resize:"none", fontFamily:"inherit", boxSizing:"border-box", marginBottom:12 }}
        />

        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onClose} style={{ flex:1, padding:12, borderRadius:11, border:"1px solid rgba(255,255,255,0.1)", background:"transparent", color:"#888", fontSize:13, fontWeight:700, cursor:"pointer" }}>취소</button>
          <button onClick={handleSave} style={{ flex:2, padding:12, borderRadius:11, border:"none", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>저장</button>
        </div>
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────
export default function WorkoutTracker() {
  const [tab,           setTab]           = useState("log");
  const [activeDay,     setActiveDay]     = useState(() => sGet(SK.activeDay) || "Day 2");
  const [sessionLog,    setSessionLog]    = useState(() => sGet(SK.sessionLog) || {});
  const [collapsed,     setCollapsed]     = useState({});
  const [history,       setHistory]       = useState({});
  const [loaded,        setLoaded]        = useState(false);
  const [timer,         setTimer]         = useState(null);
  const [sessionNote,   setSessionNote]   = useState("");
  const [toast,         setToast]         = useState(null);
  const [calMonth,      setCalMonth]      = useState(new Date());
  const [selectedDate,  setSelectedDate]  = useState(null);
  const [graphEx,       setGraphEx]       = useState(null);
  const [summaryRec,    setSummaryRec]    = useState(null);
  const [manualDate,    setManualDate]    = useState(null);

  const timerRef     = useRef(null);
  const cardRefs     = useRef({});
  const activeDayRef = useRef(activeDay);

  useEffect(() => { activeDayRef.current = activeDay; }, [activeDay]);

  const today = toDateKey();

  // ── 초기 로드 ──────────────────────────────────────────────────
  useEffect(() => {
    const h = sGet(SK.history);
    setHistory(h && Object.keys(h).length > 0 ? h : DEFAULT_HISTORY);
    const t = sGet(SK.timer);
    if (t) {
      const elapsed   = Math.floor((Date.now() - t.startedAt) / 1000);
      const remaining = Math.max(0, t.total - elapsed);
      if (remaining > 0) setTimer({ ...t, remaining });
    }
    setLoaded(true);
  }, []);

  // ── persist ────────────────────────────────────────────────────
  useEffect(() => { if (loaded) sSet(SK.history,    history);    }, [history,    loaded]);
  useEffect(() => {             sSet(SK.sessionLog, sessionLog); }, [sessionLog]);
  useEffect(() => {             sSet(SK.activeDay,  activeDay);  }, [activeDay]);

  // ── 다음 루틴 계산 ─────────────────────────────────────────────
  const { nextDay, totalSaved } = useMemo(() => {
    const keys = Object.keys(history).sort().reverse();
    const last = keys.length ? history[keys[0]] : null;
    return {
      nextDay:    last ? DAY_KEYS[(DAY_KEYS.indexOf(last.day) + 1) % DAY_KEYS.length] : "Day 2",
      totalSaved: keys.length,
    };
  }, [history]);

  const isDeload = isDeloadSession(totalSaved);

  const nextSessionLabel = useMemo(() => {
    const short = DAY_SHORT[nextDay];
    const count = Object.values(history).filter(r => r.day === nextDay).length + 1;
    return isDeload ? `${short}-D` : `${short}-${count}`;
  }, [nextDay, history, isDeload]);

  // ── 휴식 타이머 ────────────────────────────────────────────────
  useEffect(() => {
    if (!timer) { clearInterval(timerRef.current); return; }
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (!prev) return null;
        if (prev.remaining <= 1) {
          clearInterval(timerRef.current);
          sDel(SK.timer);
          try { navigator.vibrate && navigator.vibrate([300,100,300]); } catch {}
          return null;
        }
        return { ...prev, remaining: prev.remaining - 1 };
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timer?.key]);

  const startTimer = useCallback((exName) => {
    const secs      = COMPOUND_LIST.includes(exName) ? 180 : 90;
    const startedAt = Date.now();
    const t = { remaining:secs, total:secs, exName, key:`${exName}-${startedAt}`, startedAt };
    setTimer(t);
    sSet(SK.timer, t);
  }, []);

  const adjustTimer  = (delta) => setTimer(p => p ? { ...p, remaining: Math.max(5, p.remaining + delta) } : p);
  const dismissTimer = useCallback(() => { clearInterval(timerRef.current); setTimer(null); sDel(SK.timer); }, []);

  // ── 이전 세션 조회 ─────────────────────────────────────────────
  const getLastSession = useCallback((exName) => {
    const curDay = activeDayRef.current;
    const keys   = Object.keys(history).sort().reverse();
    for (const k of keys) {
      if (history[k].day === curDay) {
        const found = history[k].entries?.find(e => e.name === exName);
        if (found) return found;
      }
    }
    return null;
  }, [history]);

  const getSuggested = useCallback((ex) => {
    const last = getLastSession(ex.name);
    const base = last ? last.nextWeight : ex.defaultWeight;
    return isDeload ? getDeloadWeight(base) : base;
  }, [getLastSession, isDeload]);

  // ── 세트 상태 업데이트 ─────────────────────────────────────────
  const updateSetStatus = (exName, idx, val, totalSets) => {
    setSessionLog(prev => {
      const existing = prev[exName]?.sets || Array(totalSets).fill(null);
      const next = [...existing];
      next[idx]  = next[idx] === val ? null : val;

      const filled = next.filter(Boolean).length;
      if (next[idx] && filled < totalSets) startTimer(exName);
      if (next[idx] && filled === totalSets) {
        dismissTimer();
        setTimeout(() => {
          setCollapsed(c => ({ ...c, [exName]: true }));
          const exercises = ROUTINE[activeDayRef.current];
          const nextEx = exercises.find(e => {
            if (e.name === exName) return false;
            const log = prev[e.name];
            return !log?.sets || log.sets.filter(Boolean).length < e.sets;
          });
          if (nextEx && cardRefs.current[nextEx.name]) {
            cardRefs.current[nextEx.name].scrollIntoView({ behavior:"smooth", block:"center" });
          }
        }, 600);
      }
      return { ...prev, [exName]: { ...prev[exName], sets: next } };
    });
  };

  const updateWeight = (exName, val) =>
    setSessionLog(prev => ({ ...prev, [exName]: { ...prev[exName], weight: val } }));

  const stepWeight = (exName, delta, suggested) => {
    setSessionLog(prev => {
      const cur  = parseFloat(prev[exName]?.weight ?? suggested);
      const next = +Math.max(0, cur + delta).toFixed(1);
      return { ...prev, [exName]: { ...prev[exName], weight: String(next) } };
    });
  };

  const updateSelectedReps = (exName, reps) =>
    setSessionLog(prev => ({ ...prev, [exName]: { ...prev[exName], selectedReps: reps } }));

  // ── 운동 목록 및 진행도 ────────────────────────────────────────
  const exercises      = ROUTINE[activeDay];
  const isExDone       = (name, total) => (sessionLog[name]?.sets || []).filter(Boolean).length === total;
  const completedCount = exercises.filter(ex => isExDone(ex.name, ex.sets)).length;
  const hasAnyInput    = exercises.some(ex => {
    const l = sessionLog[ex.name];
    return l?.weight || (l?.sets || []).some(Boolean);
  });

  // ── 세션 저장 ──────────────────────────────────────────────────
  const handleFinish = () => {
    if (!hasAnyInput) { showToast("세트를 먼저 기록해주세요", "error"); return; }
    const date    = toDateKey();
    const entries = exercises.map(ex => {
      const log       = sessionLog[ex.name] || {};
      const last      = getLastSession(ex.name);
      const suggested = getSuggested(ex);
      const weight    = parseFloat(log.weight ?? suggested);
      const sets      = log.sets || [];
      const { next, overall, bump } = calcNextWeight(ex.name, weight, sets, last?.overall);
      return { name:ex.name, weight, sets, overall:overall||"close", date, nextWeight:next, bump, reps:ex.reps, selectedReps:log.selectedReps };
    });
    const label  = getRecLabel(activeDay, isDeload, null, history);
    const newRec = { day:activeDay, entries, partial:completedCount < exercises.length, duration:null, note:sessionNote, deload:isDeload, label };
    setHistory(prev => ({ ...prev, [date]: newRec }));
    setSummaryRec(newRec);
    setSessionLog({});
    setCollapsed({});
    dismissTimer();
    setSessionNote("");
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── 달력 ───────────────────────────────────────────────────────
  const calDays = useMemo(() => {
    const y     = calMonth.getFullYear();
    const m     = calMonth.getMonth();
    const first = new Date(y, m, 1).getDay();
    const total = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < first; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(new Date(y, m, d));
    return cells;
  }, [calMonth]);

  const selectedRecord = selectedDate ? history[selectedDate] : null;

  // ── 무게 추이 ──────────────────────────────────────────────────
  const getWeightHistory = useCallback((exName) => {
    return Object.entries(history)
      .sort(([a], [b]) => a.localeCompare(b))
      .flatMap(([date, rec]) => {
        const e = rec.entries?.find(e => e.name === exName);
        return e ? [{ date, weight: e.weight }] : [];
      });
  }, [history]);

  // ── 로딩 ───────────────────────────────────────────────────────
  if (!loaded) {
    return (
      <div style={{ minHeight:"100vh", background:"#0a0a0f", display:"flex", alignItems:"center", justifyContent:"center", color:"#6366f1", fontFamily:"sans-serif", fontSize:14 }}>
        불러오는 중...
      </div>
    );
  }

  // ── 렌더 ───────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0f", fontFamily:"'Apple SD Gothic Neo','Pretendard',sans-serif", color:"#e8e8f0", paddingBottom: timer ? 180 : 100 }}>

      {/* 모달들 */}
      {summaryRec && <SummaryModal rec={summaryRec} onClose={() => setSummaryRec(null)} />}
      {manualDate  && (
        <ManualEntryModal
          date={manualDate}
          history={history}
          onClose={() => setManualDate(null)}
          onSave={rec => {
            setHistory(prev => ({ ...prev, [manualDate]: rec }));
            setManualDate(null);
            showToast("기록 저장 완료 ✅");
          }}
        />
      )}

      {/* ── 헤더 ── */}
      <div style={{ background:"linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)", padding:"18px 20px 0", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth:600, margin:"0 auto" }}>
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:10, letterSpacing:3, color:"#6366f1", fontWeight:700, textTransform:"uppercase" }}>운동 트래커</div>
            <div style={{ fontSize:20, fontWeight:800, marginTop:2 }}>💪 나의 루틴</div>
            <div style={{ fontSize:11, color:"#555", marginTop:4 }}>
              다음 세션 <span style={{ color:"#a5b4fc", fontWeight:700 }}>{nextSessionLabel}</span>
              {isDeload && (
                <span style={{ marginLeft:8, color:"#f59e0b", fontWeight:700, background:"rgba(245,158,11,0.12)", padding:"1px 7px", borderRadius:5 }}>
                  🔄 디로드 주
                </span>
              )}
            </div>
          </div>
          <div style={{ display:"flex" }}>
            {[["log","기록"],["calendar","달력"],["history","히스토리"]].map(([v, label]) => (
              <button key={v} onClick={() => setTab(v)}
                style={{ flex:1, padding:"10px 0", border:"none", borderBottom: tab===v ? "2px solid #6366f1" : "2px solid transparent", background:"transparent", color: tab===v ? "#a5b4fc" : "#555", fontSize:13, fontWeight:600, cursor:"pointer", transition:"color 0.2s" }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 컨텐츠 ── */}
      <div style={{ maxWidth:600, margin:"0 auto", padding:"0 16px" }}>

        {/* ════════ 기록 탭 ════════ */}
        {tab === "log" && (
          <>
            {/* 루틴 선택 */}
            <div style={{ marginTop:16, marginBottom:12 }}>
              <div style={{ fontSize:11, color:"#444", fontWeight:600, marginBottom:8, letterSpacing:0.5 }}>루틴 선택</div>
              <div style={{ display:"flex", gap:6 }}>
                {DAY_KEYS.map(d => (
                  <button key={d}
                    onClick={() => { setActiveDay(d); setSessionLog({}); setCollapsed({}); }}
                    style={{ flex:1, padding:"8px 0", borderRadius:10, border:`1px solid ${activeDay===d ? DAY_COLOR[d] : "rgba(255,255,255,0.07)"}`, background: activeDay===d ? DAY_COLOR[d]+"20" : "rgba(255,255,255,0.02)", color: activeDay===d ? DAY_COLOR[d] : "#444", fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.15s" }}>
                    {DAY_SHORT[d]}
                  </button>
                ))}
              </div>
              <div style={{ fontSize:11, color:DAY_COLOR[activeDay], marginTop:6, fontWeight:600 }}>{DAY_LABEL[activeDay]}</div>
            </div>

            {/* 진행도 */}
            <div style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:11, color:"#555", letterSpacing:0.5 }}>진행도</span>
                <span style={{ fontSize:12, color:DAY_COLOR[activeDay], fontWeight:700 }}>{completedCount} / {exercises.length}</span>
              </div>
              <div style={{ height:3, background:"rgba(255,255,255,0.07)", borderRadius:2 }}>
                <div style={{ height:"100%", borderRadius:2, background:`linear-gradient(90deg,${DAY_COLOR[activeDay]},#8b5cf6)`, width:`${(completedCount/exercises.length)*100}%`, transition:"width 0.4s ease" }} />
              </div>
            </div>

            {/* 운동 카드 */}
            {exercises.map(ex => {
              const last        = getLastSession(ex.name);
              const suggested   = getSuggested(ex);
              const log         = sessionLog[ex.name] || {};
              const weightVal   = log.weight !== undefined ? log.weight : String(suggested);
              const setStatuses = log.sets || Array(ex.sets).fill(null);
              const { next, overall, bump } = calcNextWeight(ex.name, parseFloat(weightVal) || suggested, setStatuses, last?.overall);
              const done        = isExDone(ex.name, ex.sets);
              const si          = overall ? getSI(overall) : null;
              const exType      = getExType(ex.name);
              const steps       = WEIGHT_STEPS[exType];
              const isCollapsed = collapsed[ex.name] && done;
              const typeLabel   = exType==="compound" ? "컴파운드" : exType==="dumbbell" ? "덤벨" : "아이솔";
              const typeColor   = exType==="compound" ? "#f87171"  : exType==="dumbbell" ? "#fb923c" : "#60a5fa";
              const repsRange   = parseRepsRange(ex.reps);
              const selectedReps = log.selectedReps ?? repsRange[repsRange.length - 1];

              return (
                <div key={ex.name} ref={el => cardRefs.current[ex.name] = el}
                  style={{ background: done&&si ? `rgba(${si.rgb},0.04)` : "rgba(255,255,255,0.03)", border:`1px solid ${done&&si ? si.color+"30" : "rgba(255,255,255,0.07)"}`, borderRadius:16, marginBottom:10, overflow:"hidden", transition:"all 0.3s" }}>

                  {/* 카드 헤더 */}
                  <div
                    style={{ padding:"13px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", cursor: done ? "pointer" : "default" }}
                    onClick={() => done && setCollapsed(c => ({ ...c, [ex.name]: !c[ex.name] }))}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:7, height:7, borderRadius:"50%", background: done&&si ? si.color : "rgba(255,255,255,0.12)", flexShrink:0, boxShadow: done&&si ? `0 0 6px ${si.color}` : "none", transition:"all 0.3s" }} />
                      <div>
                        <div style={{ fontWeight:700, fontSize:14 }}>{ex.name}</div>
                        <div style={{ fontSize:10, color:"#555", marginTop:2 }}>
                          {ex.sets}세트 × {ex.reps}회 · RIR {ex.rir} · <span style={{ color:typeColor }}>{typeLabel}</span>
                          {isDeload && <span style={{ color:"#f59e0b", marginLeft:6 }}>🔄 디로드</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:17, fontWeight:800, color:"#a5b4fc" }}>{parseFloat(weightVal)}kg</div>
                        {done && si && <div style={{ fontSize:10, color:si.color }}>{si.label} {si.text}</div>}
                      </div>
                      {done && (
                        <div style={{ color:"#333", fontSize:12, transition:"transform 0.2s", transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>▾</div>
                      )}
                    </div>
                  </div>

                  {/* 카드 바디 */}
                  {!isCollapsed && (
                    <div style={{ padding:"0 16px 16px" }}>

                      {/* 횟수 선택 */}
                      {repsRange.length > 1 && (
                        <div style={{ marginBottom:12 }}>
                          <div style={{ fontSize:10, color:"#444", marginBottom:6, fontWeight:600 }}>목표 횟수</div>
                          <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                            {repsRange.map(r => (
                              <button key={r} onClick={() => updateSelectedReps(ex.name, r)}
                                style={{ minWidth:36, padding:"6px 10px", borderRadius:8, border:`1px solid ${selectedReps===r ? "#6366f1" : "rgba(255,255,255,0.08)"}`, background: selectedReps===r ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.03)", color: selectedReps===r ? "#a5b4fc" : "#555", fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.15s" }}>
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 무게 조절 (2:1:1) */}
                      <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:12 }}>
                        <div style={{ flex:2, display:"flex", alignItems:"center", gap:5 }}>
                          <input
                            type="number" step="0.5" value={weightVal}
                            onChange={e => updateWeight(ex.name, e.target.value)}
                            style={{ width:"100%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:9, padding:"8px 6px", color:"#e8e8f0", fontSize:15, fontWeight:700, outline:"none", textAlign:"center" }}
                          />
                          <span style={{ fontSize:12, color:"#444", flexShrink:0 }}>kg</span>
                        </div>
                        {steps.map(step => (
                          <button key={step} onClick={() => stepWeight(ex.name, step, suggested)}
                            style={{ flex:1, height:38, borderRadius:9, border:`1px solid ${step < 0 ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)"}`, background: step < 0 ? "rgba(239,68,68,0.06)" : "rgba(34,197,94,0.06)", color: step < 0 ? "#f87171" : "#4ade80", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                            {step > 0 ? `+${step}` : step}
                          </button>
                        ))}
                      </div>

                      {/* 세트 버튼 */}
                      <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                        {Array.from({ length: ex.sets }).map((_, i) => {
                          const cur = setStatuses[i] || null;
                          const ci  = cur ? getSI(cur) : null;
                          return (
                            <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 12px", borderRadius:12, background: cur ? `rgba(${ci.rgb},0.07)` : "rgba(255,255,255,0.025)", border:`1px solid ${cur ? ci.color+"35" : "rgba(255,255,255,0.05)"}`, transition:"all 0.2s" }}>
                              <div style={{ width:28, height:28, borderRadius:"50%", flexShrink:0, background: cur ? ci.color : "rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color: cur ? "#fff" : "#444", transition:"all 0.2s" }}>
                                {i + 1}
                              </div>
                              <span style={{ fontSize:12, flex:1, color: selectedReps !== repsRange[repsRange.length-1] ? "#a5b4fc" : "#555", fontWeight: selectedReps !== repsRange[repsRange.length-1] ? 700 : 400 }}>
                                {selectedReps}회
                              </span>
                              <div style={{ display:"flex", gap:5 }}>
                                {SET_STATUS.map(s => (
                                  <button key={s.value} onClick={() => updateSetStatus(ex.name, i, s.value, ex.sets)}
                                    style={{ width:62, height:34, borderRadius:8, border:`1px solid ${cur===s.value ? s.color : "rgba(255,255,255,0.08)"}`, background: cur===s.value ? s.color+"20" : "transparent", color: cur===s.value ? s.color : "#444", fontSize:11, fontWeight:600, cursor:"pointer", transition:"all 0.15s" }}>
                                    {s.label} {s.text}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* 완료 피드백 */}
                      {done && overall && (
                        <div style={{ marginTop:10, padding:"9px 13px", background: bump ? "rgba(99,102,241,0.14)" : "rgba(99,102,241,0.07)", borderRadius:9, fontSize:12, color:"#a5b4fc", display:"flex", justifyContent:"space-between", alignItems:"center", border: bump ? "1px solid rgba(99,102,241,0.35)" : "none" }}>
                          <span>
                            {bump
                              ? `🔥 2연속 성공! +${getBumpAmount(ex.name)}kg 점프!`
                              : overall === "success"
                                ? `성공! 다음 +${WEIGHT_STEPS[exType][1]}kg 💪`
                                : overall === "close"
                                  ? "무게 유지"
                                  : "무게 낮추고 폼 체크 🙏"}
                          </span>
                          <span style={{ color:"#818cf8", fontWeight:800 }}>→ {next}kg</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* 메모 */}
            <textarea
              placeholder="오늘 메모 (컨디션, 부상, 특이사항...)"
              value={sessionNote}
              onChange={e => setSessionNote(e.target.value)}
              rows={2}
              style={{ width:"100%", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:"10px 14px", color:"#e8e8f0", fontSize:13, outline:"none", resize:"none", fontFamily:"inherit", boxSizing:"border-box", marginBottom:10 }}
            />

            {/* 완료 버튼 */}
            <button onClick={handleFinish} disabled={!hasAnyInput}
              style={{ width:"100%", padding:16, borderRadius:14, border:"none", background: !hasAnyInput ? "rgba(255,255,255,0.04)" : "linear-gradient(135deg,#6366f1,#8b5cf6)", color: !hasAnyInput ? "#333" : "#fff", fontSize:15, fontWeight:800, cursor: !hasAnyInput ? "not-allowed" : "pointer", marginBottom:8, transition:"all 0.3s", letterSpacing:0.5 }}>
              {!hasAnyInput ? "세트를 먼저 기록해주세요" : `🏁 운동 끝! ${completedCount < exercises.length ? `(${completedCount}/${exercises.length})` : "완료"}`}
            </button>

            {toast && (
              <div style={{ padding:"11px 16px", borderRadius:12, fontSize:13, fontWeight:600, textAlign:"center", background: toast.type==="error" ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", border:`1px solid ${toast.type==="error" ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`, color: toast.type==="error" ? "#ef4444" : "#22c55e" }}>
                {toast.msg}
              </div>
            )}
          </>
        )}

        {/* ════════ 달력 탭 ════════ */}
        {tab === "calendar" && (
          <div style={{ paddingTop:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <button onClick={() => setCalMonth(p => new Date(p.getFullYear(), p.getMonth()-1, 1))}
                style={{ width:36, height:36, borderRadius:10, border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.04)", color:"#888", fontSize:18, cursor:"pointer" }}>‹</button>
              <div style={{ fontWeight:700, fontSize:16 }}>{calMonth.getFullYear()}년 {calMonth.getMonth()+1}월</div>
              <button onClick={() => setCalMonth(p => new Date(p.getFullYear(), p.getMonth()+1, 1))}
                style={{ width:36, height:36, borderRadius:10, border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.04)", color:"#888", fontSize:18, cursor:"pointer" }}>›</button>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:8 }}>
              {WEEKDAYS.map((w, i) => (
                <div key={w} style={{ textAlign:"center", fontSize:11, fontWeight:600, color: i===0 ? "#ef4444" : i===6 ? "#6366f1" : "#555", padding:"4px 0" }}>{w}</div>
              ))}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
              {calDays.map((date, i) => {
                if (!date) return <div key={i} />;
                const key     = toDateKey(date);
                const rec     = history[key];
                const isToday = key === today;
                const isSel   = key === selectedDate;
                const color   = rec ? DAY_COLOR[rec.day] : null;
                return (
                  <button key={key} onClick={() => setSelectedDate(isSel ? null : key)}
                    style={{ aspectRatio:"1", borderRadius:10, border:`2px solid ${isSel ? (color||"#6366f1") : isToday ? "rgba(99,102,241,0.4)" : "transparent"}`, background: isSel ? (color||"#6366f1")+"22" : isToday ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.02)", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2, transition:"all 0.15s" }}>
                    <span style={{ fontSize:13, fontWeight: isToday ? 800 : 400, color: isToday ? "#a5b4fc" : date.getDay()===0 ? "#f87171" : date.getDay()===6 ? "#818cf8" : "#bbb" }}>
                      {date.getDate()}
                    </span>
                    {rec && (
                      <span style={{ fontSize:9, fontWeight:800, color, background:color+"20", borderRadius:4, padding:"1px 4px", lineHeight:1.4 }}>
                        {rec.label || DAY_SHORT[rec.day]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 날짜 선택 시 간단 표시 */}
            {selectedDate && (
              <div style={{ marginTop:16, padding:"14px 16px", background:"rgba(255,255,255,0.03)", borderRadius:14, border:"1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:"#e8e8f0" }}>{selectedDate}</div>
                    {selectedRecord ? (
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4, flexWrap:"wrap" }}>
                        <span style={{ color:DAY_COLOR[selectedRecord.day], background:DAY_COLOR[selectedRecord.day]+"20", borderRadius:6, padding:"2px 8px", fontSize:12, fontWeight:800 }}>
                          {selectedRecord.label || DAY_SHORT[selectedRecord.day]}
                        </span>
                        <span style={{ fontSize:12, color:"#666" }}>{DAY_LABEL[selectedRecord.day]}</span>
                        {selectedRecord.partial && <span style={{ fontSize:11, color:"#f59e0b" }}>부분 ✂️</span>}
                        {selectedRecord.deload   && <span style={{ fontSize:11, color:"#f59e0b" }}>🔄 디로드</span>}
                      </div>
                    ) : (
                      <div style={{ fontSize:12, color:"#444", marginTop:4 }}>운동 없음</div>
                    )}
                  </div>
                  {!selectedRecord && (
                    <button onClick={() => setManualDate(selectedDate)}
                      style={{ padding:"7px 14px", borderRadius:9, border:"1px solid rgba(99,102,241,0.3)", background:"rgba(99,102,241,0.08)", color:"#a5b4fc", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                      + 기록 추가
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════ 히스토리 탭 ════════ */}
        {tab === "history" && (
          <div style={{ paddingTop:16 }}>
            {Object.keys(history).length === 0 ? (
              <div style={{ textAlign:"center", padding:"60px 0", color:"#444" }}>
                <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
                <div>아직 기록이 없어요</div>
              </div>
            ) : (
              <>
                {/* 무게 추이 */}
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:11, color:"#555", fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:10 }}>무게 추이 · 1RM</div>
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:10 }}>
                    {Array.from(new Set(Object.values(history).flatMap(r => r.entries?.map(e => e.name) || []))).map(exName => (
                      <button key={exName} onClick={() => setGraphEx(graphEx === exName ? null : exName)}
                        style={{ padding:"5px 10px", borderRadius:8, border:`1px solid ${graphEx===exName ? "#6366f1" : "rgba(255,255,255,0.08)"}`, background: graphEx===exName ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.03)", color: graphEx===exName ? "#a5b4fc" : "#555", fontSize:11, fontWeight:600, cursor:"pointer" }}>
                        {exName}
                      </button>
                    ))}
                  </div>
                  {graphEx && (
                    <div style={{ padding:"14px", background:"rgba(255,255,255,0.025)", borderRadius:14, border:"1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"#a5b4fc", marginBottom:10 }}>{graphEx}</div>
                      <MiniChart data={getWeightHistory(graphEx)} color="#6366f1" exName={graphEx} />
                    </div>
                  )}
                </div>

                {/* 루틴별 기록 */}
                {DAY_KEYS.map(day => {
                  const recs = Object.entries(history)
                    .filter(([, r]) => r.day === day)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .slice(0, 5);
                  if (!recs.length) return null;
                  return (
                    <div key={day} style={{ marginBottom:24 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                        <span style={{ color:DAY_COLOR[day], background:DAY_COLOR[day]+"20", borderRadius:7, padding:"3px 10px", fontSize:13, fontWeight:800 }}>{DAY_SHORT[day]}</span>
                        <span style={{ fontSize:12, color:"#555" }}>{DAY_LABEL[day]}</span>
                        <span style={{ fontSize:11, color:"#333", marginLeft:"auto" }}>최근 {recs.length}회</span>
                      </div>
                      {recs.map(([date, rec]) => {
                        const sessionVol = (rec.entries || []).reduce((acc, e) => {
                          const repStr   = String(e.selectedReps ?? e.reps ?? "10");
                          const repNum   = parseInt(repStr.split("~")[1] || repStr);
                          const doneSets = (e.sets || []).filter(Boolean).length || e.sets?.length || 0;
                          return acc + (e.weight || 0) * repNum * doneSets;
                        }, 0);
                        return (
                          <div key={date} style={{ marginBottom:14, padding:"12px 14px", background:"rgba(255,255,255,0.025)", borderRadius:14, border:"1px solid rgba(255,255,255,0.05)" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:6 }}>
                              <span style={{ color:DAY_COLOR[rec.day], background:DAY_COLOR[rec.day]+"20", borderRadius:6, padding:"2px 8px", fontSize:12, fontWeight:800 }}>{rec.label || DAY_SHORT[rec.day]}</span>
                              <span style={{ fontSize:12, color:"#666" }}>{date}</span>
                              {rec.partial && <span style={{ fontSize:10, color:"#f59e0b", background:"rgba(245,158,11,0.1)", borderRadius:5, padding:"1px 6px" }}>부분 ✂️</span>}
                              {rec.deload  && <span style={{ fontSize:10, color:"#f59e0b", background:"rgba(245,158,11,0.1)", borderRadius:5, padding:"1px 6px" }}>🔄 디로드</span>}
                              <span style={{ marginLeft:"auto", fontSize:11, color:"#6366f1", fontWeight:700 }}>총 {Math.round(sessionVol).toLocaleString()}kg</span>
                              <button
                                onClick={() => {
                                  if (window.confirm(`${date} 기록을 삭제할까요?`)) {
                                    setHistory(p => { const n = { ...p }; delete n[date]; return n; });
                                  }
                                }}
                                style={{ width:28, height:28, borderRadius:7, border:"1px solid rgba(239,68,68,0.2)", background:"rgba(239,68,68,0.07)", color:"#ef4444", fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                                🗑
                              </button>
                            </div>
                            {rec.note && (
                              <div style={{ marginBottom:8, padding:"6px 10px", background:"rgba(255,255,255,0.02)", borderRadius:8, fontSize:11, color:"#666", fontStyle:"italic" }}>
                                📝 {rec.note}
                              </div>
                            )}
                            {(rec.entries || []).map(entry => {
                              const si       = getSI(entry.overall);
                              const repStr   = String(entry.selectedReps ?? entry.reps ?? "10");
                              const repNum   = parseInt(repStr.split("~")[1] || repStr);
                              const doneSets = (entry.sets || []).filter(Boolean).length || entry.sets?.length || 0;
                              const vol      = Math.round((entry.weight || 0) * repNum * doneSets);
                              return (
                                <div key={entry.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 10px", background:"rgba(255,255,255,0.02)", borderRadius:10, marginBottom:5, border:`1px solid ${si ? si.color+"20" : "rgba(255,255,255,0.04)"}` }}>
                                  <div>
                                    <div style={{ fontSize:12, fontWeight:600 }}>{entry.name}{entry.bump ? " 🔥" : ""}</div>
                                    <div style={{ fontSize:10, color:"#444" }}>
                                      {entry.weight}kg × {repStr}회 / {doneSets}세트 = <span style={{ color:"#6366f1", fontWeight:700 }}>{vol.toLocaleString()}kg</span>
                                    </div>
                                  </div>
                                  <div style={{ textAlign:"right" }}>
                                    <div style={{ fontSize:14, fontWeight:800 }}>{entry.weight}kg</div>
                                    {si && <div style={{ fontSize:10, color:si.color }}>{si.label}</div>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </>
            )}

            {/* 데이터 관리 */}
            <div style={{ marginTop:24, paddingTop:20, borderTop:"1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize:11, color:"#444", fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:12 }}>데이터 관리</div>
              <div style={{ display:"flex", gap:8 }}>
                <button
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(history, null, 2)], { type:"application/json" });
                    const url  = URL.createObjectURL(blob);
                    const a    = document.createElement("a");
                    a.href = url;
                    a.download = `workout-backup-${toDateKey()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  style={{ flex:1, padding:"11px 0", borderRadius:11, border:"1px solid rgba(99,102,241,0.25)", background:"rgba(99,102,241,0.08)", color:"#a5b4fc", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                  📤 백업 저장
                </button>
                <button
                  onClick={() => {
                    const input   = document.createElement("input");
                    input.type    = "file";
                    input.accept  = ".json";
                    input.onchange = (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        try {
                          const data = JSON.parse(ev.target.result);
                          if (window.confirm("기존 데이터를 백업 파일로 덮어쓸까요?")) {
                            setHistory(data);
                            showToast("복원 완료! ✅", "success");
                          }
                        } catch {
                          showToast("파일이 올바르지 않아요", "error");
                        }
                      };
                      reader.readAsText(file);
                    };
                    input.click();
                  }}
                  style={{ flex:1, padding:"11px 0", borderRadius:11, border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.04)", color:"#888", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                  📥 백업 복원
                </button>
              </div>
              <div style={{ marginTop:8, fontSize:11, color:"#333", textAlign:"center" }}>
                브라우저 캐시를 지우기 전에 백업을 저장해두세요
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 하단 고정 타이머 바 ── */}
      {timer && (
        <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:100 }}>
          <div style={{ height:3, background:"rgba(255,255,255,0.06)" }}>
            <div style={{ height:"100%", background: timer.remaining > 30 ? "linear-gradient(90deg,#6366f1,#8b5cf6)" : "linear-gradient(90deg,#ef4444,#f59e0b)", width:`${(timer.remaining/timer.total)*100}%`, transition:"width 1s linear" }} />
          </div>
          <div style={{ background:"#0f0f18", borderTop:"1px solid rgba(255,255,255,0.07)", padding:"12px 20px", display:"flex", alignItems:"center", gap:12 }}>
            <button onClick={() => adjustTimer(-30)} style={{ width:46, height:38, borderRadius:10, border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.04)", color:"#666", fontSize:12, cursor:"pointer", fontWeight:700 }}>-30</button>
            <div style={{ flex:1, textAlign:"center" }}>
              <div style={{ fontSize:10, color:"#444", marginBottom:1 }}>휴식 · {timer.exName}</div>
              <div style={{ fontSize:28, fontWeight:800, color: timer.remaining <= 30 ? "#ef4444" : "#e8e8f0", letterSpacing:2, fontVariantNumeric:"tabular-nums" }}>
                {fmtTime(timer.remaining)}
              </div>
            </div>
            <button onClick={() => adjustTimer(30)} style={{ width:46, height:38, borderRadius:10, border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.04)", color:"#666", fontSize:12, cursor:"pointer", fontWeight:700 }}>+30</button>
            <button onClick={dismissTimer} style={{ width:38, height:38, borderRadius:10, border:"1px solid rgba(239,68,68,0.25)", background:"rgba(239,68,68,0.08)", color:"#ef4444", fontSize:15, cursor:"pointer" }}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
