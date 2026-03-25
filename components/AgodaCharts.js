import { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, BarController,
  PointElement, LineElement, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, BarController, PointElement, LineElement, Tooltip, Legend, Filler);

// ── 공통 유틸 ─────────────────────────────────────────────────────────
const fmtWeek = (d) => d?.slice(0, 10) ?? '';

function useChart(canvasRef, buildConfig, deps) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.__chart) { canvas.__chart.destroy(); canvas.__chart = null; }
    canvas.__chart = new ChartJS(canvas.getContext('2d'), buildConfig());
    return () => {
      try { if (canvas.__chart) { canvas.__chart.destroy(); canvas.__chart = null; } } catch (e) {}
    };
  }, deps);
}

// ────────────────────────────────────────────────────────────────────────
// 탭 1 ── 리뷰 작성률
// 노션 차트: 막대(주별 작성률%) + 숫자 레이블
// ────────────────────────────────────────────────────────────────────────
export function TabReviewRate({ propertyId, accent }) {
  const [data, setData] = useState([]);
  const [viewMode, setViewMode] = useState('weekly'); // 'weekly' | 'monthly'
  const [form, setForm] = useState({ week_start: '', review_count: '', checkout_count: '' });
  const [status, setStatus] = useState('idle');
  const canvasRef = useRef(null);

  const load = async () => {
    const r = await fetch(`/api/agoda-review-rate?property_id=${propertyId}`).then(x => x.json());
    setData(Array.isArray(r) ? r : []);
  };

  useEffect(() => { load(); }, [propertyId]);

  const save = async (e) => {
    e.preventDefault();
    setStatus('loading');
    const res = await fetch('/api/agoda-review-rate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        property_id: propertyId,
        week_start: form.week_start,
        review_count: form.review_count || null,
        checkout_count: form.checkout_count || null,
      }),
    });
    if (res.ok) {
      setStatus('ok');
      setForm({ week_start: '', review_count: '', checkout_count: '' });
      load();
      setTimeout(() => setStatus('idle'), 2000);
    } else {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  const del = async (id) => {
    if (!confirm('삭제할까요?')) return;
    await fetch(`/api/agoda-review-rate?id=${id}`, { method: 'DELETE' });
    load();
  };

  const isMonthly = viewMode === 'monthly';
  const monthlyData = groupRateByMonth(data);

  const labels = isMonthly
    ? monthlyData.map(d => d.month)
    : data.map(d => fmtWeek(d.week_start));
  const counts = isMonthly
    ? monthlyData.map(d => d.review_count)
    : data.map(d => d.review_count ?? 0);
  const rates = isMonthly
    ? monthlyData.map(d =>
        d.checkout_count > 0 ? parseFloat(((d.review_count / d.checkout_count) * 100).toFixed(1)) : null
      )
    : data.map(d =>
        d.checkout_count > 0 ? parseFloat(((d.review_count / d.checkout_count) * 100).toFixed(1)) : null
      );

  useChart(canvasRef, () => ({
    data: {
      labels,
      datasets: [
        {
          type: 'bar',
          label: '리뷰 제출 건수',
          data: counts,
          backgroundColor: `${accent}33`,
          borderColor: accent,
          borderWidth: 2,
          borderRadius: 4,
          yAxisID: 'y',
        },
        {
          type: 'line',
          label: '작성률 (%)',
          data: rates,
          borderColor: '#1F72B8',
          backgroundColor: 'rgba(31,114,184,0.08)',
          pointBackgroundColor: '#1F72B8',
          pointRadius: 5,
          borderWidth: 2,
          tension: 0.3,
          fill: false,
          yAxisID: 'y2',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: ctx =>
              ctx.datasetIndex === 0
                ? `리뷰 제출: ${ctx.parsed.y}건`
                : `작성률: ${ctx.parsed.y}%`,
          },
        },
      },
      scales: {
        y: {
          type: 'linear',
          position: 'left',
          beginAtZero: true,
          title: { display: true, text: '리뷰 제출 건수', font: { size: 11 } },
          ticks: { callback: v => `${v}건` },
          grid: { color: 'rgba(128,128,128,0.1)' },
        },
        y2: {
          type: 'linear',
          position: 'right',
          beginAtZero: true,
          max: 100,
          title: { display: true, text: '작성률 (%)', font: { size: 11 } },
          ticks: { callback: v => `${v}%` },
          grid: { display: false },
        },
        x: { grid: { display: false } },
      },
    },
  }), [data, viewMode]);

  return (
    <div className="panel-body">
      <h3 className="section-title">리뷰 작성률</h3>
      <p className="ag-desc">막대: 리뷰 제출 건수 · 선: 작성률(%) = 리뷰 제출 건수 ÷ 체크아웃 수 × 100</p>

      <form onSubmit={save} className="review-form" style={{ marginBottom: 24 }}>
        <div className="form-row">
          <div className="form-field">
            <label>주차 시작일 (월요일)</label>
            <input type="date" required value={form.week_start}
              onChange={e => setForm(f => ({ ...f, week_start: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>리뷰 제출 건수</label>
            <input type="number" min="0" placeholder="예: 12" value={form.review_count}
              onChange={e => setForm(f => ({ ...f, review_count: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>체크아웃 수</label>
            <input type="number" min="0" placeholder="예: 80" value={form.checkout_count}
              onChange={e => setForm(f => ({ ...f, checkout_count: e.target.value }))} />
          </div>
          <div className="form-field" style={{ justifyContent: 'flex-end', paddingTop: 20 }}>
            <button type="submit" className="btn-primary" disabled={status === 'loading'} style={{ background: accent, border: 'none' }}>
              {status === 'loading' ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
        {status === 'ok' && <p className="form-status ok">✓ 저장되었습니다</p>}
        {status === 'error' && <p className="form-status error">✕ 저장 실패</p>}
      </form>

      {data.length === 0 ? (
        <div className="empty-state"><p>데이터를 입력하면 차트가 표시됩니다</p></div>
      ) : (
        <>
          {/* 주별 / 월별 토글 */}
          <div className="ag-view-toggle">
            <button
              className={`ag-view-btn${viewMode === 'weekly' ? ' active' : ''}`}
              style={viewMode === 'weekly' ? { background: accent, borderColor: accent, color: '#fff' } : {}}
              onClick={() => setViewMode('weekly')}>
              주별
            </button>
            <button
              className={`ag-view-btn${viewMode === 'monthly' ? ' active' : ''}`}
              style={viewMode === 'monthly' ? { background: accent, borderColor: accent, color: '#fff' } : {}}
              onClick={() => setViewMode('monthly')}>
              월별
            </button>
          </div>

          <div style={{ position: 'relative', height: 280 }}><canvas ref={canvasRef} /></div>

          {/* 데이터 테이블 */}
          {isMonthly ? (
            <div className="ag-table-wrap">
              <table className="history-table">
                <thead><tr><th>월</th><th>리뷰 제출 합계</th><th>체크아웃 합계</th><th>작성률</th></tr></thead>
                <tbody>
                  {[...monthlyData].reverse().map(d => (
                    <tr key={d.month}>
                      <td>{d.month}</td>
                      <td>{d.review_count}</td>
                      <td>{d.checkout_count}</td>
                      <td style={{ fontWeight: 500, color: accent }}>
                        {d.checkout_count > 0 ? `${((d.review_count / d.checkout_count) * 100).toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="ag-table-wrap">
              <table className="history-table">
                <thead><tr><th>주차</th><th>리뷰 제출</th><th>체크아웃</th><th>작성률</th><th /></tr></thead>
                <tbody>
                  {[...data].reverse().map(d => (
                    <tr key={d.id}>
                      <td>{fmtWeek(d.week_start)}</td>
                      <td>{d.review_count ?? '—'}</td>
                      <td>{d.checkout_count ?? '—'}</td>
                      <td style={{ fontWeight: 500, color: accent }}>
                        {d.checkout_count > 0 ? `${((d.review_count / d.checkout_count) * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td><button className="delete-btn" onClick={() => del(d.id)}>×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 탭 2 ── 점수 분포
// 구간: 1~2, 2~3, 3~4, 4~5, 5~6, 6~7, 7~8, 8~9, 9~10 (9개)
// 레이아웃: 분포 차트(좌) + 증감 차트(우) 나란히
// ────────────────────────────────────────────────────────────────────────

// 월별 리뷰 작성률 집계 유틸
function groupRateByMonth(data) {
  const map = {};
  data.forEach(d => {
    const key = d.week_start?.slice(0, 7); // 'YYYY-MM'
    if (!key) return;
    if (!map[key]) map[key] = { month: key, review_count: 0, checkout_count: 0 };
    map[key].review_count += d.review_count || 0;
    map[key].checkout_count += d.checkout_count || 0;
  });
  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
}

// 구간 정의 (9개): score_1=1~2점구간, score_2=2~3점구간, ..., score_9=9~10점구간
// DB 컬럼 score_1~score_9 를 그대로 사용 (score_10은 미사용)
const BANDS = [
  { label: '1~2점',  key: 'score_1', color: '#E24B4A', bg: 'rgba(226,75,74,0.80)' },
  { label: '2~3점',  key: 'score_2', color: '#E24B4A', bg: 'rgba(226,75,74,0.60)' },
  { label: '3~4점',  key: 'score_3', color: '#BA7517', bg: 'rgba(186,117,23,0.70)' },
  { label: '4~5점',  key: 'score_4', color: '#BA7517', bg: 'rgba(186,117,23,0.55)' },
  { label: '5~6점',  key: 'score_5', color: '#BA7517', bg: 'rgba(186,117,23,0.40)' },
  { label: '6~7점',  key: 'score_6', color: '#0F6E56', bg: 'rgba(15,110,86,0.40)' },
  { label: '7~8점',  key: 'score_7', color: '#0F6E56', bg: 'rgba(15,110,86,0.55)' },
  { label: '8~9점',  key: 'score_8', color: '#0F6E56', bg: 'rgba(15,110,86,0.70)' },
  { label: '9~10점', key: 'score_9', color: '#0F6E56', bg: 'rgba(15,110,86,0.85)' },
];

function calcBandPcts(w) {
  if (!w) return Array(9).fill(0);
  const total = BANDS.reduce((s, b) => s + (parseInt(w[b.key])||0), 0);
  return BANDS.map(b => {
    const cnt = parseInt(w[b.key]) || 0;
    return total > 0 ? parseFloat((cnt / total * 100).toFixed(1)) : 0;
  });
}

export function TabScoreDist({ propertyId, accent }) {
  const [data, setData] = useState([]);
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(null);
  const [form, setForm] = useState({
    week_start: '',
    score_1:'', score_2:'', score_3:'', score_4:'', score_5:'',
    score_6:'', score_7:'', score_8:'', score_9:'', score_10:'',
  });
  const [status, setStatus] = useState('idle');
  const chartRef = useRef(null);

  const load = async () => {
    const r = await fetch(`/api/agoda-score-dist?property_id=${propertyId}`).then(x => x.json());
    const arr = Array.isArray(r) ? r : [];
    setData(arr);
    if (arr.length > 0) setSelectedWeekIdx(arr.length - 1);
  };

  useEffect(() => { load(); }, [propertyId]);

  const save = async (e) => {
    e.preventDefault();
    setStatus('loading');
    const res = await fetch('/api/agoda-score-dist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ property_id: propertyId, ...form }),
    });
    if (res.ok) {
      setStatus('ok');
      setForm({ week_start:'', score_1:'', score_2:'', score_3:'', score_4:'', score_5:'',
        score_6:'', score_7:'', score_8:'', score_9:'', score_10:'' });
      load();
      setTimeout(() => setStatus('idle'), 2000);
    } else { setStatus('error'); setTimeout(() => setStatus('idle'), 2000); }
  };

  const del = async (id) => {
    if (!confirm('삭제할까요?')) return;
    await fetch(`/api/agoda-score-dist?id=${id}`, { method: 'DELETE' });
    load();
  };

  // 선택 주차 구간별 비율
  const curPcts = calcBandPcts(data[selectedWeekIdx]);
  // 전주 구간별 비율
  const prevPcts = selectedWeekIdx > 0 ? calcBandPcts(data[selectedWeekIdx - 1]) : null;
  // 전주 대비 증감
  const deltaPcts = prevPcts ? curPcts.map((v, i) => parseFloat((v - prevPcts[i]).toFixed(1))) : null;

  const bandLabels = BANDS.map(b => b.label);

  // 막대(분포%) + 선(전주 대비 증감) 혼합 차트
  useChart(chartRef, () => ({
    data: {
      labels: bandLabels,
      datasets: [
        {
          type: 'bar',
          label: '비율 (%)',
          data: curPcts,
          backgroundColor: BANDS.map(b => b.bg),
          borderColor: BANDS.map(b => b.color),
          borderWidth: 1.5,
          borderRadius: 4,
          yAxisID: 'y',
        },
        ...(deltaPcts ? [{
          type: 'line',
          label: '전주 대비 증감 (%p)',
          data: deltaPcts,
          borderColor: '#888780',
          segment: {
            borderColor: ctx => {
              const v = deltaPcts?.[ctx.p1DataIndex];
              return v > 0 ? '#E24B4A' : v < 0 ? '#0F6E56' : '#888780';
            },
          },
          pointBackgroundColor: deltaPcts.map(v => v > 0 ? '#E24B4A' : v < 0 ? '#0F6E56' : '#888780'),
          pointRadius: 5,
          borderWidth: 2,
          tension: 0.3,
          fill: false,
          yAxisID: 'y2',
        }] : []),
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: ctx => {
              if (ctx.datasetIndex === 0) {
                const w = data[selectedWeekIdx];
                const cnt = w ? parseInt(w[BANDS[ctx.dataIndex]?.key])||0 : 0;
                return `비율: ${ctx.parsed.y}% (${cnt}건)`;
              }
              return `증감: ${ctx.parsed.y > 0 ? '+' : ''}${ctx.parsed.y}%p`;
            },
          },
        },
      },
      scales: {
        y: {
          type: 'linear',
          position: 'left',
          beginAtZero: true,
          ticks: { callback: v => `${v}%` },
          grid: { color: 'rgba(128,128,128,0.1)' },
          title: { display: true, text: '비율 (%)', font: { size: 11 } },
        },
        y2: {
          type: 'linear',
          position: 'right',
          ticks: { callback: v => `${v > 0 ? '+' : ''}${v}%p` },
          grid: { display: false },
          title: { display: true, text: '증감 (%p)', font: { size: 11 } },
        },
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      },
    },
  }), [selectedWeekIdx, data]);

  return (
    <div className="panel-body">
      <h3 className="section-title">점수 분포 — 저점수 비율 변화</h3>
      <p className="ag-desc">구간별 비율(%) 막대(좌) · 전주 대비 증감(%p) 선(우) · 빨강=증가 / 초록=감소</p>

      <form onSubmit={save} className="review-form" style={{ marginBottom: 24 }}>
        <div className="form-row">
          <div className="form-field">
            <label>주차 시작일 (월요일)</label>
            <input type="date" required value={form.week_start}
              onChange={e => setForm(f => ({ ...f, week_start: e.target.value }))} />
          </div>
        </div>
        <div className="ag-score-label">구간별 건수 입력</div>
        <div className="ag-score-grid">
          {BANDS.map((b, i) => (
            <div key={b.key} className="ag-score-cell">
              <label style={{ color: b.color }}>{b.label}</label>
              <input type="number" min="0" placeholder="0"
                value={form[b.key]}
                onChange={e => setForm(f => ({ ...f, [b.key]: e.target.value }))} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
          <button type="submit" className="btn-primary" disabled={status === 'loading'} style={{ background: accent, border: 'none' }}>
            {status === 'loading' ? '저장 중…' : '저장'}
          </button>
          {status === 'ok' && <span className="form-status ok" style={{ margin: 0 }}>✓ 저장</span>}
          {status === 'error' && <span className="form-status error" style={{ margin: 0 }}>✕ 실패</span>}
        </div>
      </form>

      {data.length === 0 ? (
        <div className="empty-state"><p>데이터를 입력하면 차트가 표시됩니다</p></div>
      ) : (
        <>
          {/* 주차 선택 칩 */}
          <div className="ag-week-chips">
            {data.map((d, i) => (
              <button key={d.id}
                className={`ag-week-chip${selectedWeekIdx === i ? ' active' : ''}`}
                style={selectedWeekIdx === i ? { background: accent, borderColor: accent, color: '#fff' } : {}}
                onClick={() => setSelectedWeekIdx(i)}>
                {fmtWeek(d.week_start)}
              </button>
            ))}
          </div>

          {/* 혼합 차트: 막대(분포) + 선(증감) */}
          <div style={{ position: 'relative', height: 300 }}>
            <canvas ref={chartRef} />
          </div>
          {!deltaPcts && (
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6, textAlign: 'center' }}>
              전주 데이터 입력 시 증감 선이 표시됩니다
            </p>
          )}

          {/* 데이터 테이블 */}
          <div className="ag-table-wrap">
            <table className="history-table">
              <thead>
                <tr>
                  <th>주차</th>
                  {BANDS.map(b => <th key={b.key} style={{ color: b.color, fontSize: 11 }}>{b.label}</th>)}
                  <th>합계</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {[...data].reverse().map(d => {
                  const total = BANDS.reduce((s, b) => s + (parseInt(d[b.key])||0), 0);
                  return (
                    <tr key={d.id}>
                      <td>{fmtWeek(d.week_start)}</td>
                      {BANDS.map(b => (
                        <td key={b.key} style={{ color: b.color, fontSize: 12 }}>
                          {parseInt(d[b.key])||0}
                        </td>
                      ))}
                      <td style={{ fontWeight: 500 }}>{total}</td>
                      <td><button className="delete-btn" onClick={() => del(d.id)}>×</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 탭 3 ── 정비/욕실 불만 건수 (주별 입력 + 주별/월별 전환 뷰)
// ────────────────────────────────────────────────────────────────────────

// 월별 집계 유틸: 주 데이터를 월 단위로 합산
function groupByMonth(data) {
  const map = {};
  data.forEach(d => {
    const key = d.week_start?.slice(0, 7); // 'YYYY-MM'
    if (!key) return;
    if (!map[key]) map[key] = { month: key, room: 0, bath: 0, memos: [] };
    map[key].room += d.room_complaints || 0;
    map[key].bath += d.bathroom_complaints || 0;
    if (d.memo) map[key].memos.push(d.memo);
  });
  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
}

export function TabComplaints({ propertyId, accent }) {
  const [data, setData] = useState([]);
  const [viewMode, setViewMode] = useState('weekly'); // 'weekly' | 'monthly'
  const [form, setForm] = useState({ week_start: '', room_complaints: '', bathroom_complaints: '', memo: '' });
  const [status, setStatus] = useState('idle');
  const canvasRef = useRef(null);

  const load = async () => {
    const r = await fetch(`/api/agoda-complaints?property_id=${propertyId}`).then(x => x.json());
    setData(Array.isArray(r) ? r : []);
  };

  useEffect(() => { load(); }, [propertyId]);

  const save = async (e) => {
    e.preventDefault();
    setStatus('loading');
    const res = await fetch('/api/agoda-complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ property_id: propertyId, ...form }),
    });
    if (res.ok) {
      setStatus('ok');
      setForm({ week_start: '', room_complaints: '', bathroom_complaints: '', memo: '' });
      load();
      setTimeout(() => setStatus('idle'), 2000);
    } else { setStatus('error'); setTimeout(() => setStatus('idle'), 2000); }
  };

  const del = async (id) => {
    if (!confirm('삭제할까요?')) return;
    await fetch(`/api/agoda-complaints?id=${id}`, { method: 'DELETE' });
    load();
  };

  // 1~2월 데이터로 기준선 계산 (주별 평균)
  const baseline = data.filter(d => { const m = parseInt(d.week_start?.slice(5,7)); return m===1||m===2; });
  const baselineRoom = baseline.length > 0
    ? Math.round(baseline.reduce((s,d) => s+(d.room_complaints||0),0) / baseline.length * 10) / 10 : null;
  const baselineBath = baseline.length > 0
    ? Math.round(baseline.reduce((s,d) => s+(d.bathroom_complaints||0),0) / baseline.length * 10) / 10 : null;

  // 월별 기준선: 주별 기준선 × 해당 월의 주 수 (1~2월 월 합산 평균)
  const monthlyBaseline = (() => {
    if (!baseline.length) return { room: null, bath: null };
    const mMap = {};
    baseline.forEach(d => {
      const key = d.week_start?.slice(0,7);
      if (!mMap[key]) mMap[key] = { room: 0, bath: 0 };
      mMap[key].room += d.room_complaints || 0;
      mMap[key].bath += d.bathroom_complaints || 0;
    });
    const months = Object.values(mMap);
    return {
      room: Math.round(months.reduce((s,m) => s+m.room,0) / months.length * 10) / 10,
      bath: Math.round(months.reduce((s,m) => s+m.bath,0) / months.length * 10) / 10,
    };
  })();

  // 현재 뷰 모드에 따른 데이터
  const isMonthly = viewMode === 'monthly';
  const monthlyData = groupByMonth(data);

  const labels = isMonthly
    ? monthlyData.map(d => d.month)
    : data.map(d => fmtWeek(d.week_start));
  const room = isMonthly
    ? monthlyData.map(d => d.room)
    : data.map(d => d.room_complaints ?? 0);
  const bath = isMonthly
    ? monthlyData.map(d => d.bath)
    : data.map(d => d.bathroom_complaints ?? 0);
  const curBaseline = isMonthly
    ? { room: monthlyBaseline.room, bath: monthlyBaseline.bath }
    : { room: baselineRoom, bath: baselineBath };

  useChart(canvasRef, () => {
    const datasets = [
      {
        label: '객실 정비 불만',
        data: room,
        borderColor: '#E84393',
        backgroundColor: 'rgba(232,67,147,0.08)',
        pointBackgroundColor: '#E84393',
        pointRadius: 5,
        tension: 0.3,
        fill: true,
        borderWidth: 2,
      },
      {
        label: '욕실 청결 불만',
        data: bath,
        borderColor: '#1F72B8',
        backgroundColor: 'rgba(31,114,184,0.08)',
        pointBackgroundColor: '#1F72B8',
        pointRadius: 5,
        tension: 0.3,
        fill: true,
        borderWidth: 2,
      },
    ];
    if (curBaseline.room != null) datasets.push({
      label: `객실 기준선 (${curBaseline.room}건)`,
      data: Array(labels.length).fill(curBaseline.room),
      borderColor: '#E84393', borderWidth: 1.5, borderDash: [6,4],
      pointRadius: 0, fill: false,
    });
    if (curBaseline.bath != null) datasets.push({
      label: `욕실 기준선 (${curBaseline.bath}건)`,
      data: Array(labels.length).fill(curBaseline.bath),
      borderColor: '#1F72B8', borderWidth: 1.5, borderDash: [6,4],
      pointRadius: 0, fill: false,
    });

    return {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { size: 11 } } },
          tooltip: {
            callbacks: {
              afterBody: (items) => {
                if (isMonthly) {
                  const memos = monthlyData[items[0]?.dataIndex]?.memos;
                  return memos?.length ? [`메모: ${memos.join(' / ')}`] : [];
                }
                const idx = items[0]?.dataIndex;
                return data[idx]?.memo ? [`메모: ${data[idx].memo}`] : [];
              },
            },
          },
        },
        scales: {
          y: { beginAtZero: true, ticks: { callback: v => `${v}건` }, grid: { color: 'rgba(128,128,128,0.1)' } },
          x: { grid: { display: false } },
        },
      },
    };
  }, [data, viewMode]);

  return (
    <div className="panel-body">
      <h3 className="section-title">정비 / 욕실 불만 건수 추이</h3>
      <p className="ag-desc">주별 입력 · 주별/월별 전환 가능 · 점선 = 1~2월 평균 기준선</p>

      <form onSubmit={save} className="review-form" style={{ marginBottom: 24 }}>
        <div className="form-row">
          <div className="form-field">
            <label>주차 시작일 (월요일)</label>
            <input type="date" required value={form.week_start}
              onChange={e => setForm(f => ({ ...f, week_start: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>객실 정비 불만</label>
            <input type="number" min="0" placeholder="예: 3" value={form.room_complaints}
              onChange={e => setForm(f => ({ ...f, room_complaints: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>욕실 청결 불만</label>
            <input type="number" min="0" placeholder="예: 2" value={form.bathroom_complaints}
              onChange={e => setForm(f => ({ ...f, bathroom_complaints: e.target.value }))} />
          </div>
          <div className="form-field" style={{ flex: 2 }}>
            <label>운영 메모 (조치 내용)</label>
            <input type="text" placeholder="예: 청소 업체 변경, 체크리스트 강화" value={form.memo}
              onChange={e => setForm(f => ({ ...f, memo: e.target.value }))} />
          </div>
          <div className="form-field" style={{ justifyContent: 'flex-end', paddingTop: 20 }}>
            <button type="submit" className="btn-primary" disabled={status === 'loading'} style={{ background: accent, border: 'none' }}>
              {status === 'loading' ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
        {status === 'ok' && <p className="form-status ok">✓ 저장되었습니다</p>}
        {status === 'error' && <p className="form-status error">✕ 저장 실패</p>}
      </form>

      {data.length === 0 ? (
        <div className="empty-state"><p>데이터를 입력하면 차트가 표시됩니다</p></div>
      ) : (
        <>
          {/* 주별 / 월별 토글 */}
          <div className="ag-view-toggle">
            <button
              className={`ag-view-btn${viewMode === 'weekly' ? ' active' : ''}`}
              style={viewMode === 'weekly' ? { background: accent, borderColor: accent, color: '#fff' } : {}}
              onClick={() => setViewMode('weekly')}>
              주별
            </button>
            <button
              className={`ag-view-btn${viewMode === 'monthly' ? ' active' : ''}`}
              style={viewMode === 'monthly' ? { background: accent, borderColor: accent, color: '#fff' } : {}}
              onClick={() => setViewMode('monthly')}>
              월별
            </button>
          </div>

          {curBaseline.room != null && (
            <div className="ag-baseline-info">
              기준선 (1~2월 {isMonthly ? '월 합산' : '주별'} 평균) —
              객실: <strong>{curBaseline.room}건</strong> · 욕실: <strong>{curBaseline.bath}건</strong>
            </div>
          )}

          <div style={{ position: 'relative', height: 300 }}><canvas ref={canvasRef} /></div>

          {/* 메모 목록 */}
          {isMonthly
            ? monthlyData.some(d => d.memos.length > 0) && (
                <div className="ag-memo-list">
                  {monthlyData.filter(d => d.memos.length).map(d => (
                    <div key={d.month} className="ag-memo-item">
                      <span className="ag-memo-week">{d.month}</span>
                      <span className="ag-memo-text">{d.memos.join(' / ')}</span>
                    </div>
                  ))}
                </div>
              )
            : data.some(d => d.memo) && (
                <div className="ag-memo-list">
                  {data.filter(d => d.memo).map(d => (
                    <div key={d.id} className="ag-memo-item">
                      <span className="ag-memo-week">{fmtWeek(d.week_start)}</span>
                      <span className="ag-memo-text">{d.memo}</span>
                    </div>
                  ))}
                </div>
              )
          }

          {/* 데이터 테이블 */}
          {isMonthly ? (
            <div className="ag-table-wrap">
              <table className="history-table">
                <thead><tr><th>월</th><th>객실 정비 합계</th><th>욕실 청결 합계</th><th>메모</th></tr></thead>
                <tbody>
                  {[...monthlyData].reverse().map(d => (
                    <tr key={d.month}>
                      <td>{d.month}</td>
                      <td style={{ color: '#E84393', fontWeight: 500 }}>{d.room}건</td>
                      <td style={{ color: '#1F72B8', fontWeight: 500 }}>{d.bath}건</td>
                      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{d.memos.join(' / ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="ag-table-wrap">
              <table className="history-table">
                <thead><tr><th>주차</th><th>객실 정비</th><th>욕실 청결</th><th>메모</th><th /></tr></thead>
                <tbody>
                  {[...data].reverse().map(d => (
                    <tr key={d.id}>
                      <td>{fmtWeek(d.week_start)}</td>
                      <td style={{ color: '#E84393', fontWeight: 500 }}>{d.room_complaints ?? 0}건</td>
                      <td style={{ color: '#1F72B8', fontWeight: 500 }}>{d.bathroom_complaints ?? 0}건</td>
                      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{d.memo || '—'}</td>
                      <td><button className="delete-btn" onClick={() => del(d.id)}>×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
