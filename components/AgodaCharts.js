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

// 월별 점수 분포 집계 유틸
function groupDistByMonth(data) {
  const map = {};
  data.forEach(d => {
    const key = d.week_start?.slice(0, 7); // 'YYYY-MM'
    if (!key) return;
    if (!map[key]) {
      map[key] = { week_start: key + '-01', month: key };
      BAND_KEYS.forEach(k => { map[key][k] = 0; });
      map[key].weekly_avg_score_sum = 0;
      map[key].weekly_avg_score_count = 0;
    }
    BAND_KEYS.forEach(k => { map[key][k] += parseInt(d[k]) || 0; });
    if (d.weekly_avg_score != null) {
      map[key].weekly_avg_score_sum += parseFloat(d.weekly_avg_score);
      map[key].weekly_avg_score_count += 1;
    }
  });
  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).map(d => ({
    ...d,
    weekly_avg_score: d.weekly_avg_score_count > 0
      ? parseFloat((d.weekly_avg_score_sum / d.weekly_avg_score_count).toFixed(1))
      : null,
  }));
}
const BAND_KEYS = ['score_1','score_2','score_3','score_4','score_5','score_6','score_7','score_8','score_9'];

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

// 히트맵 셀 색상: 비율에 따라 amber 계열 진하게
function heatColor(pct) {
  if (pct <= 0)  return 'var(--color-background-secondary, #f5f5f5)';
  if (pct < 5)   return '#FAEEDA';
  if (pct < 10)  return '#FAC775';
  if (pct < 20)  return '#EF9F27';
  if (pct < 35)  return '#BA7517';
  if (pct < 55)  return '#854F0B';
  return '#633806';
}
function heatTextColor(pct) {
  return pct >= 20 ? '#FAEEDA' : 'var(--color-text-primary)';
}
// 증감 셀 색상: 빨강(증가) / 초록(감소)
function deltaColor(d) {
  if (d === null || d === 0) return 'var(--color-background-secondary, #f5f5f5)';
  const alpha = Math.min(0.15 + Math.abs(d) * 0.055, 0.88);
  return d > 0
    ? `rgba(15,110,86,${alpha.toFixed(2)})`
    : `rgba(226,75,74,${alpha.toFixed(2)})`;
}
function deltaTextColor(d) {
  if (!d || d === 0) return 'var(--color-text-tertiary)';
  return d > 0 ? '#085041' : '#791F1F';
}


// 주별 평균 점수 추이 라인 차트
function AvgScoreLineChart({ weeks, avgScores, accent }) {
  const canvasRef = useRef(null);
  useChart(canvasRef, () => ({
    type: 'line',
    data: {
      labels: weeks.map((w, i) => `W${i+1} ${w.slice(5)}`),
      datasets: [{
        label: '주별 평균 점수',
        data: avgScores,
        borderColor: accent,
        backgroundColor: `${accent}18`,
        pointBackgroundColor: avgScores.map(s =>
          s === null ? 'transparent' : s >= 9.0 ? '#1D9E75' : s >= 8.5 ? accent : '#E24B4A'
        ),
        pointRadius: 6,
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        spanGaps: true,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => `평균: ${ctx.parsed.y?.toFixed(1)}점` } },
        annotation: {
          annotations: {
            target: {
              type: 'line', yMin: 9.0, yMax: 9.0,
              borderColor: '#1D9E75', borderWidth: 1.5, borderDash: [5,4],
              label: { display: true, content: '목표 9.0', position: 'end',
                color: '#1D9E75', font: { size: 11 } }
            }
          }
        }
      },
      scales: {
        y: {
          min: Math.max(0, Math.min(...avgScores.filter(s => s !== null)) - 0.5),
          max: Math.min(10, Math.max(...avgScores.filter(s => s !== null)) + 0.3),
          ticks: { callback: v => `${v.toFixed(1)}점` },
          grid: { color: 'rgba(128,128,128,0.1)' },
        },
        x: { grid: { display: false } },
      },
    },
  }), [weeks, avgScores]);
  return <div style={{ position: 'relative', height: 180 }}><canvas ref={canvasRef} /></div>;
}

const VOC_CATS = ['청결', '서비스', '시설', '가격', '위치'];

export function TabScoreDist({ propertyId, accent }) {
  const [data, setData] = useState([]);
  const [form, setForm] = useState({
    week_start: '',
    score_1:'', score_2:'', score_3:'', score_4:'', score_5:'',
    score_6:'', score_7:'', score_8:'', score_9:'', score_10:'',
    weekly_avg_score: '',
  });
  const [status, setStatus] = useState('idle');
  const [showCount, setShowCount] = useState(false);
  const [viewMode, setViewMode] = useState('weekly'); // 'weekly' | 'monthly'

  // VOC 상태
  const [vocData, setVocData] = useState([]);
  const [vocWeekIdx, setVocWeekIdx] = useState(null);
  const [vocForm, setVocForm] = useState({ band: '1~2점', category: '청결', sentiment: 'bad', keyword: '' });
  const [vocStatus, setVocStatus] = useState('idle');

  const load = async () => {
    const r = await fetch(`/api/agoda-score-dist?property_id=${propertyId}`).then(x => x.json());
    const arr = Array.isArray(r) ? r : [];
    setData(arr);
    if (arr.length > 0 && vocWeekIdx === null) setVocWeekIdx(arr.length - 1);
  };

  const loadVoc = async (weekStart) => {
    const r = await fetch(`/api/agoda-voc?property_id=${propertyId}&week_start=${weekStart}`).then(x => x.json());
    setVocData(Array.isArray(r) ? r : []);
  };

  useEffect(() => { load(); }, [propertyId]);

  useEffect(() => {
    if (data.length > 0 && vocWeekIdx !== null && data[vocWeekIdx]) {
      loadVoc(fmtWeek(data[vocWeekIdx].week_start));
    }
  }, [vocWeekIdx, data]);

  const save = async (e) => {
    e.preventDefault();
    setStatus('loading');
    // weekly_avg_score는 별도 분리 (API가 지원하지 않는 구버전 호환)
    const { weekly_avg_score, ...scoreForm } = form;
    const payload = { property_id: propertyId, ...scoreForm };
    if (weekly_avg_score !== '') payload.weekly_avg_score = parseFloat(weekly_avg_score);
    const res = await fetch('/api/agoda-score-dist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setStatus('ok');
      setForm({ week_start:'', score_1:'', score_2:'', score_3:'', score_4:'', score_5:'',
        score_6:'', score_7:'', score_8:'', score_9:'', score_10:'', weekly_avg_score:'' });
      load();
      setTimeout(() => setStatus('idle'), 2000);
    } else { setStatus('error'); setTimeout(() => setStatus('idle'), 2000); }
  };

  const del = async (id) => {
    if (!confirm('삭제할까요?')) return;
    await fetch(`/api/agoda-score-dist?id=${id}`, { method: 'DELETE' });
    load();
  };

  const saveVoc = async (e) => {
    e.preventDefault();
    if (!vocForm.keyword.trim() || vocWeekIdx === null) return;
    const weekStart = fmtWeek(data[vocWeekIdx]?.week_start);
    setVocStatus('loading');
    const res = await fetch('/api/agoda-voc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ property_id: propertyId, week_start: weekStart, ...vocForm }),
    });
    if (res.ok) {
      setVocStatus('ok');
      setVocForm(f => ({ ...f, keyword: '' }));
      loadVoc(weekStart);
      setTimeout(() => setVocStatus('idle'), 1500);
    } else { setVocStatus('error'); setTimeout(() => setVocStatus('idle'), 1500); }
  };

  const delVoc = async (id) => {
    await fetch(`/api/agoda-voc?id=${id}`, { method: 'DELETE' });
    if (data[vocWeekIdx]) loadVoc(fmtWeek(data[vocWeekIdx].week_start));
  };

  // 최근 8주만 표시 (DB에는 전체 저장, 히트맵은 최근 8주)
  const recentData = data.slice(-8);
  const monthlyData = groupDistByMonth(data).slice(-8); // 최근 8개월

  const displayData = viewMode === 'monthly' ? monthlyData : recentData;

  // 전체 주차의 구간별 비율 + 건수 계산
  const allPcts = displayData.map(w => calcBandPcts(w));
  const allCounts = displayData.map(w => BANDS.map(b => parseInt(w[b.key]) || 0));
  const avgScores = displayData.map(w => w.weekly_avg_score != null ? parseFloat(w.weekly_avg_score) : null);

  // 전주 대비 증감: delta[wi][bi] = 이번주 - 전주
  const allDeltas = recentData.map((_, wi) =>
    wi === 0 ? null : BANDS.map((_, bi) =>
      parseFloat((allPcts[wi][bi] - allPcts[wi - 1][bi]).toFixed(1))
    )
  );

  const weeks = displayData.map(d =>
    viewMode === 'monthly' ? d.month : fmtWeek(d.week_start)
  );

  return (
    <div className="panel-body">
      <h3 className="section-title">점수 분포 히트맵</h3>
      <p className="ag-desc">색이 진할수록 해당 구간 비율이 높음 · 하단 증감: 빨강=증가 / 초록=감소</p>

      <form onSubmit={save} className="review-form" style={{ marginBottom: 24 }}>
        <div className="form-row">
          <div className="form-field">
            <label>주차 시작일 (월요일)</label>
            <input type="date" required value={form.week_start}
              onChange={e => setForm(f => ({ ...f, week_start: e.target.value }))} />
          </div>
        </div>
        <div className="form-row" style={{ marginBottom: 8 }}>
          <div className="form-field">
            <label>이번 주 평균 점수</label>
            <input type="number" min="0" max="10" step="0.1" placeholder="예: 8.6"
              value={form.weekly_avg_score}
              onChange={e => setForm(f => ({ ...f, weekly_avg_score: e.target.value }))} />
          </div>
        </div>
        <div className="ag-score-label">구간별 건수 입력</div>
        <div className="ag-score-grid">
          {BANDS.map(b => (
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
        <div className="empty-state"><p>데이터를 입력하면 히트맵이 표시됩니다</p></div>
      ) : (
        <>
          {/* 주별/월별 토글 + 비율/건수 토글 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <button className="ag-view-btn"
              style={viewMode === 'weekly' ? { background: accent, borderColor: accent, color: '#fff' } : {}}
              onClick={() => setViewMode('weekly')}>주별</button>
            <button className="ag-view-btn"
              style={viewMode === 'monthly' ? { background: accent, borderColor: accent, color: '#fff' } : {}}
              onClick={() => setViewMode('monthly')}>월별</button>
            <span style={{ width: 1, height: 18, background: 'var(--color-border-tertiary)', margin: '0 4px' }} />
            <button
              className="ag-view-btn"
              style={!showCount ? { background: accent, borderColor: accent, color: '#fff' } : {}}
              onClick={() => setShowCount(false)}>비율 (%)</button>
            <button
              className="ag-view-btn"
              style={showCount ? { background: accent, borderColor: accent, color: '#fff' } : {}}
              onClick={() => setShowCount(true)}>건수</button>
            <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--color-text-tertiary)' }}>
              낮음
              {['#FAEEDA','#FAC775','#EF9F27','#BA7517','#854F0B','#633806'].map((c,i) => (
                <span key={i} style={{ display:'inline-block', width:14, height:10, background:c, borderRadius:2, marginLeft:3 }} />
              ))}
              높음
            </span>
          </div>

          {/* 히트맵 2개 나란히: 좌=분포, 우=증감 */}
          <div className="hm-dual">

            {/* 좌: 점수 분포 히트맵 */}
            <div className="hm-dual-item">
              <div className="ag-chart-label">점수 분포</div>
              <div className="hm-scroll">
                <table className="hm-table">
                  <thead>
                    <tr>
                      <th className="hm-band-th">구간</th>
                      {weeks.map((w, wi) => (
                        <th key={wi} className="hm-week-th">
                          {viewMode === 'monthly' ? w.slice(0,7) : `W${wi + 1}`}<br />
                          <span style={{ fontWeight: 400, fontSize: 10, color: 'var(--color-text-tertiary)' }}>
                            {viewMode === 'monthly' ? '' : w.slice(5)}
                          </span>
                        </th>
                      ))}
                    </tr>
                    {avgScores.some(s => s !== null) && (
                      <tr>
                        <td className="hm-band-label" style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>평균 점수</td>
                        {avgScores.map((s, wi) => {
                          const bg = s === null ? 'transparent'
                            : s >= 9.0 ? '#E1F5EE' : s >= 8.5 ? '#FAEEDA' : s >= 8.0 ? '#FAC775' : '#FCEBEB';
                          const tc = s === null ? 'var(--color-text-tertiary)'
                            : s >= 9.0 ? '#085041' : s >= 8.5 ? '#633806' : s >= 8.0 ? '#633806' : '#791F1F';
                          return (
                            <td key={wi} style={{ background: bg, color: tc, fontWeight: 500, fontSize: 12,
                              textAlign: 'center', padding: '6px 4px', borderRadius: 6 }}>
                              {s !== null ? s.toFixed(1) : '—'}
                            </td>
                          );
                        })}
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {BANDS.map((b, bi) => (
                      <tr key={b.key}>
                        <td className="hm-band-label" style={{ color: b.color }}>{b.label}</td>
                        {recentData.map((_, wi) => {
                          const pct = allPcts[wi][bi];
                          const cnt = allCounts[wi][bi];
                          const bg = heatColor(pct);
                          const tc = heatTextColor(pct);
                          const display = showCount ? `${cnt}건` : `${pct}%`;
                          return (
                            <td key={wi} className="hm-cell"
                              style={{ background: bg, color: tc }}
                              title={`${b.label} ${weeks[wi]}: ${pct}% (${cnt}건)`}>
                              {display}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 우: 전주 대비 증감 히트맵 */}
            <div className="hm-dual-item">
              <div className="ag-chart-label">전주 대비 증감 (%p)</div>
              {data.length <= 1 ? (
                <div className="hm-no-delta">전주 데이터 입력 시 표시됩니다</div>
              ) : (
                <div className="hm-scroll">
                  <table className="hm-table">
                    <thead>
                      <tr>
                        <th className="hm-band-th">구간</th>
                        {weeks.slice(1).map((w, wi) => (
                          <th key={wi} className="hm-week-th">
                            W{wi + 1}→{wi + 2}<br />
                            <span style={{ fontWeight: 400, fontSize: 10, color: 'var(--color-text-tertiary)' }}>{w.slice(5)}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {BANDS.map((b, bi) => (
                        <tr key={b.key}>
                          <td className="hm-band-label" style={{ color: b.color }}>{b.label}</td>
                          {allDeltas.slice(1).map((deltas, wi) => {
                            const d = deltas ? deltas[bi] : null;
                            return (
                              <td key={wi} className="hm-cell hm-delta-cell"
                                style={{ background: deltaColor(d), color: deltaTextColor(d) }}
                                title={`${b.label} 전주 대비: ${d > 0 ? '+' : ''}${d}%p`}>
                                {d !== null ? `${d > 0 ? '+' : ''}${d}%p` : '—'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* 주별 평균 점수 추이 라인 차트 */}
          {avgScores.some(s => s !== null) && (
            <div style={{ marginTop: 20 }}>
              <div className="ag-chart-label">주별 평균 점수 추이</div>
              <AvgScoreLineChart weeks={weeks} avgScores={avgScores} accent={accent} />
            </div>
          )}

          {/* 증감 요약 칩 — 최신 주차 기준 ±1%p 이상만 표시 */}
          {displayData.length > 1 && (() => {
            const lastIdx = displayData.length - 1;
            const cur = allPcts[lastIdx];
            const prev = allPcts[lastIdx - 1];
            const chips = BANDS.map((b, bi) => ({
              label: b.label,
              delta: parseFloat((cur[bi] - prev[bi]).toFixed(1)),
            })).filter(c => Math.abs(c.delta) >= 1);
            if (!chips.length) return null;
            return (
              <div style={{ marginTop: 16, marginBottom: 4 }}>
                <div className="voc-section-label">최신 주차 증감 요약 (W{data.length - 1} → W{data.length})</div>
                <div className="delta-chips">
                  {chips.map(c => (
                    <span key={c.label}
                      className={`delta-chip ${c.delta > 0 ? 'chip-up' : 'chip-dn'}`}>
                      {c.delta > 0 ? '▲' : '▼'} {c.label} {c.delta > 0 ? '+' : ''}{c.delta}%p
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* VOC 요약 패널 */}
          {data.length > 0 && viewMode === 'weekly' && (
            <div className="voc-panel" style={{ marginTop: 20 }}>
              <div className="voc-panel-header">
                <span className="voc-section-label" style={{ margin: 0 }}>VOC 요약</span>
                <div className="voc-week-chips">
                  {data.map((d, i) => (
                    <button key={d.id}
                      className={`voc-wchip${vocWeekIdx === i ? ' on' : ''}`}
                      style={vocWeekIdx === i ? { background: accent, borderColor: accent, color: '#fff' } : {}}
                      onClick={() => setVocWeekIdx(i)}>
                      W{i + 1} {fmtWeek(d.week_start).slice(5)}
                    </button>
                  ))}
                </div>
              </div>

              {/* VOC 입력 폼 */}
              <form onSubmit={saveVoc} className="voc-input-row">
                <select value={vocForm.band} onChange={e => setVocForm(f => ({ ...f, band: e.target.value }))}>
                  {BANDS.map(b => <option key={b.key} value={b.label}>{b.label}</option>)}
                </select>
                <select value={vocForm.category} onChange={e => setVocForm(f => ({ ...f, category: e.target.value }))}>
                  {VOC_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={vocForm.sentiment} onChange={e => setVocForm(f => ({ ...f, sentiment: e.target.value }))}>
                  <option value="bad">bad</option>
                  <option value="good">good</option>
                </select>
                <input type="text" placeholder="키워드 입력 (예: 침구 냄새)" value={vocForm.keyword}
                  onChange={e => setVocForm(f => ({ ...f, keyword: e.target.value }))}
                  style={{ flex: 1, minWidth: 120 }} />
                <button type="submit" disabled={vocStatus === 'loading'} style={{ background: accent, color: '#fff', border: 'none', borderRadius: 6, padding: '0 14px', fontSize: 12, cursor: 'pointer', height: 32 }}>
                  {vocStatus === 'loading' ? '…' : vocStatus === 'ok' ? '✓' : '+'}
                </button>
              </form>

              {/* VOC 항목 표시 */}
              <div className="voc-body">
                {BANDS.map(b => {
                  const items = vocData.filter(v => v.band === b.label);
                  if (!items.length) return null;
                  return (
                    <div key={b.key} className="voc-row">
                      <span className={`voc-band-tag ${b.label <= '4~5점' ? (b.label <= '2~3점' ? 'tag-low' : 'tag-mid-low') : b.label <= '6~7점' ? 'tag-mid' : 'tag-high'}`}>
                        {b.label}
                      </span>
                      <div className="voc-badges">
                        {items.map(v => (
                          <span key={v.id} className={`voc-badge ${v.sentiment === 'bad' ? 'badge-bad' : 'badge-good'}`}>
                            <span className="badge-cat">{v.category}</span>
                            {v.keyword}
                            <button className="voc-del" onClick={() => delVoc(v.id)}>×</button>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {vocData.length === 0 && (
                  <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', padding: '8px 0' }}>
                    위 폼에서 이번 주 VOC 키워드를 입력하세요
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 기록 테이블 */}
          <div className="ag-table-wrap" style={{ marginTop: 20 }}>
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

// ────────────────────────────────────────────────────────────────────────
// OKR 탭 ── 9.0점 달성 트래커
// 도넛(진행률) + 지표카드 + 진행바 + 0.1점 단계 테이블(슬라이더)
// ────────────────────────────────────────────────────────────────────────
export function TabOKR({ propertyId, accent }) {
  const [latest, setLatest] = useState(null);
  const [newAvg, setNewAvg] = useState(9.5);
  const TARGET = 9.0;
  const BASE = 8.0;

  useEffect(() => {
    (async () => {
      const map = await fetch('/api/reviews/latest').then(r => r.json());
      setLatest(map[propertyId] ?? null);
    })();
  }, [propertyId]);

  if (!latest) return (
    <div className="panel-body">
      <div className="empty-state"><p>대시보드 탭에서 점수를 입력하면 OKR 트래커가 활성화됩니다</p></div>
    </div>
  );

  const curScore = parseFloat(latest.overall_score);
  const curCount = parseInt(latest.review_count) || 0;
  const achieved = curScore >= TARGET;

  // 도넛 계산 (8.0 → 9.0 기준)
  const progPct = Math.min(Math.max((curScore - BASE) / (TARGET - BASE), 0), 1);
  const R = 62;
  const CIRC = 2 * Math.PI * R;
  const fillDash = (CIRC * progPct).toFixed(1);
  const gapDash = (CIRC * (1 - progPct)).toFixed(1);
  const restDash = (CIRC * (1 - progPct)).toFixed(1);
  const restOffset = (-CIRC * progPct).toFixed(1);

  // 0.1점 단계별 필요 리뷰 계산
  const steps = [];
  for (let i = Math.round(curScore * 10) + 1; i <= 90; i++) {
    steps.push(i / 10);
  }
  function calcNeeded(target) {
    if (curScore >= target) return 0;
    if (newAvg <= target) return Infinity;
    return Math.ceil((target * curCount - curScore * curCount) / (newAvg - target));
  }

  return (
    <div className="panel-body">
      <h3 className="section-title">OKR 트래커 — 9.0점 달성</h3>
      <p className="ag-desc">대시보드 탭 최신 기록 기준 자동 연동 · 기준선 8.0점 → 목표 9.0점</p>

      {/* 상단: 도넛 + 지표카드 */}
      <div className="okr-top">

        {/* 도넛 */}
        <div className="okr-donut-wrap">
          <div className="okr-donut">
            <svg width="160" height="160" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r={R} fill="none"
                stroke="var(--color-background-secondary)" strokeWidth="18" />
              {/* 달성 호 */}
              <circle cx="80" cy="80" r={R} fill="none"
                stroke={achieved ? '#1D9E75' : accent}
                strokeWidth="18"
                strokeDasharray={`${fillDash} ${CIRC}`}
                strokeLinecap="round"
                style={{ transform: 'rotate(-90deg)', transformOrigin: '80px 80px' }} />
              {/* 잔여 호 */}
              {!achieved && (
                <circle cx="80" cy="80" r={R} fill="none"
                  stroke="#FAEEDA"
                  strokeWidth="18"
                  strokeDasharray={`${restDash} ${CIRC}`}
                  strokeDashoffset={restOffset}
                  style={{ transform: 'rotate(-90deg)', transformOrigin: '80px 80px' }} />
              )}
            </svg>
            <div className="okr-donut-label">
              <div className="okr-donut-score">{curScore.toFixed(1)}</div>
              <div className="okr-donut-target">/ 9.0 목표</div>
            </div>
          </div>
          <div className="okr-donut-legend">
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-secondary)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: achieved ? '#1D9E75' : accent, display: 'inline-block' }} />
              달성 {Math.round(progPct * 100)}%
            </span>
            {!achieved && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FAEEDA', display: 'inline-block' }} />
                잔여 {Math.round((1 - progPct) * 100)}%
              </span>
            )}
          </div>
        </div>

        {/* 지표 카드 */}
        <div className="okr-stat-grid">
          <div className="okr-stat-card">
            <div className="okr-stat-lbl">현재 점수</div>
            <div className="okr-stat-val">{curScore.toFixed(1)}</div>
            <div className="okr-stat-sub">{achieved ? '목표 달성!' : `목표까지 ${(TARGET - curScore).toFixed(1)}점`}</div>
          </div>
          <div className="okr-stat-card">
            <div className="okr-stat-lbl">누적 리뷰</div>
            <div className="okr-stat-val">{curCount.toLocaleString()}</div>
            <div className="okr-stat-sub">개</div>
          </div>
          <div className="okr-stat-card">
            <div className="okr-stat-lbl">OKR 목표</div>
            <div className="okr-stat-val">9.0</div>
            <div className="okr-stat-sub">{achieved ? <span style={{ color: '#1D9E75', fontWeight: 500 }}>달성 완료</span> : 'Agoda 기준'}</div>
          </div>
        </div>
      </div>

      {/* 진행 바 */}
      {!achieved && (
        <div style={{ marginBottom: 24 }}>
          <div className="ag-chart-label">9.0점까지 진행률 (기준 8.0점)</div>
          <div style={{ height: 10, background: 'var(--color-background-secondary)', borderRadius: 99, overflow: 'hidden', marginBottom: 5 }}>
            <div style={{ height: '100%', width: `${Math.round(progPct * 100)}%`, background: accent, borderRadius: 99, transition: 'width .5s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-tertiary)' }}>
            <span>기준 8.0점</span>
            <span style={{ fontWeight: 500, color: accent }}>현재 {curScore.toFixed(1)}점</span>
            <span>목표 9.0점</span>
          </div>
        </div>
      )}

      {/* 슬라이더 */}
      {!achieved && (
        <div style={{ marginBottom: 20 }}>
          <div className="ag-chart-label">신규 리뷰 평균 점수 가정</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input type="range" min="9.0" max="10.0" step="0.1"
              value={newAvg}
              onChange={e => setNewAvg(parseFloat(e.target.value))}
              style={{ flex: 1 }} />
            <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)', minWidth: 36 }}>
              {newAvg.toFixed(1)}점
            </span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
            슬라이더로 조정하면 아래 필요 리뷰 수가 실시간으로 바뀝니다
          </p>
        </div>
      )}

      {/* 0.1점 단계 테이블 */}
      {!achieved ? (
        <>
          <div className="ag-chart-label">0.1점 단계별 필요 리뷰 수</div>
          <div className="ag-table-wrap">
            <table className="history-table">
              <thead>
                <tr>
                  <th>목표 점수</th>
                  <th>추가 필요 리뷰</th>
                  <th>달성 진행</th>
                </tr>
              </thead>
              <tbody>
                {steps.map(target => {
                  const needed = calcNeeded(target);
                  const pct = Math.round(((curScore - BASE) / (target - BASE)) * 100);
                  const isInfinity = needed === Infinity;
                  return (
                    <tr key={target}>
                      <td style={{ fontWeight: 500 }}>{target.toFixed(1)}점</td>
                      <td style={{ fontWeight: 500, color: isInfinity ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)' }}>
                        {isInfinity ? '계산 불가 (평균 점수 높이세요)' : `${needed.toLocaleString()}개`}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 5, background: 'var(--color-background-secondary)', borderRadius: 99, overflow: 'hidden', maxWidth: 120 }}>
                            <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: accent, borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', minWidth: 28 }}>{Math.min(pct, 100)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 12, lineHeight: 1.7 }}>
            계산 방식: 목표 점수 × (현재 리뷰 수 + 추가 리뷰) ≥ 현재 평균 × 현재 리뷰 수 + 추가 리뷰 × 신규 평균
          </div>
        </>
      ) : (
        <div style={{ background: '#E1F5EE', border: '1px solid #9FE1CB', borderRadius: 10, padding: '20px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 500, color: '#085041', marginBottom: 6 }}>목표 달성!</div>
          <div style={{ fontSize: 13, color: '#0F6E56' }}>현재 {curScore.toFixed(1)}점 · 누적 리뷰 {curCount.toLocaleString()}개</div>
        </div>
      )}
    </div>
  );
}
