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

  const labels = data.map(d => fmtWeek(d.week_start));
  const counts = data.map(d => d.review_count ?? 0);
  const rates = data.map(d =>
    d.checkout_count > 0 ? parseFloat(((d.review_count / d.checkout_count) * 100).toFixed(1)) : null
  );

  // 막대(리뷰 제출 건수) + 선(작성률%) 혼합 차트
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
  }), [data]);

  return (
    <div className="panel-body">
      <h3 className="section-title">리뷰 작성률 (주별)</h3>
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
          <div style={{ position: 'relative', height: 280 }}><canvas ref={canvasRef} /></div>
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
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// 탭 2 ── 점수 분포
// 노션 차트: 막대(점수대별 비율%) + 꺾은선(전주 대비 증감, 증가=빨강/감소=초록)
// ────────────────────────────────────────────────────────────────────────
export function TabScoreDist({ propertyId, accent }) {
  const [data, setData] = useState([]);
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(null);
  const [form, setForm] = useState({
    week_start: '',
    score_1:'', score_2:'', score_3:'', score_4:'', score_5:'',
    score_6:'', score_7:'', score_8:'', score_9:'', score_10:'',
  });
  const [status, setStatus] = useState('idle');
  const barRef = useRef(null);
  const lineRef = useRef(null);

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

  // 선택된 주차의 점수 분포 계산
  const distData = selectedWeekIdx !== null && data[selectedWeekIdx]
    ? (() => {
        const w = data[selectedWeekIdx];
        const total = [1,2,3,4,5,6,7,8,9,10].reduce((s,i) => s + (parseInt(w[`score_${i}`])||0), 0);
        return [1,2,3,4,5,6,7,8,9,10].map(i => ({
          score: i,
          count: parseInt(w[`score_${i}`]) || 0,
          pct: total > 0 ? parseFloat(((parseInt(w[`score_${i}`])||0) / total * 100).toFixed(1)) : 0,
        }));
      })()
    : [];

  // 전주 대비 증감 계산
  const prevData = selectedWeekIdx !== null && selectedWeekIdx > 0 && data[selectedWeekIdx - 1]
    ? (() => {
        const pw = data[selectedWeekIdx - 1];
        const pt = [1,2,3,4,5,6,7,8,9,10].reduce((s,i) => s + (parseInt(pw[`score_${i}`])||0), 0);
        return [1,2,3,4,5,6,7,8,9,10].map(i =>
          pt > 0 ? parseFloat(((parseInt(pw[`score_${i}`])||0) / pt * 100).toFixed(1)) : 0
        );
      })()
    : null;

  const deltaData = prevData
    ? distData.map((d, i) => parseFloat((d.pct - prevData[i]).toFixed(1)))
    : null;

  // 막대 차트
  useChart(barRef, () => ({
    type: 'bar',
    data: {
      labels: [1,2,3,4,5,6,7,8,9,10].map(i => `${i}점`),
      datasets: [{
        label: '비율 (%)',
        data: distData.map(d => d.pct),
        backgroundColor: distData.map(d =>
          d.score <= 4 ? 'rgba(226,75,74,0.7)' :
          d.score <= 6 ? 'rgba(186,117,23,0.5)' :
          'rgba(15,110,86,0.5)'
        ),
        borderColor: distData.map(d =>
          d.score <= 4 ? '#E24B4A' : d.score <= 6 ? '#BA7517' : '#0F6E56'
        ),
        borderWidth: 1.5,
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => `${ctx.parsed.y}% (${distData[ctx.dataIndex]?.count}건)` } },
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => `${v}%` }, grid: { color: 'rgba(128,128,128,0.1)' } },
        x: { grid: { display: false } },
      },
    },
  }), [selectedWeekIdx, data]);

  // 증감 꺾은선 차트
  useChart(lineRef, () => ({
    type: 'line',
    data: {
      labels: [1,2,3,4,5,6,7,8,9,10].map(i => `${i}점`),
      datasets: [{
        label: '전주 대비 증감 (%p)',
        data: deltaData,
        borderColor: '#888780',
        segment: {
          borderColor: ctx => {
            const v = deltaData?.[ctx.p1DataIndex];
            return v > 0 ? '#E24B4A' : v < 0 ? '#0F6E56' : '#888780';
          },
        },
        pointBackgroundColor: deltaData?.map(v => v > 0 ? '#E24B4A' : v < 0 ? '#0F6E56' : '#888780'),
        pointRadius: 5,
        borderWidth: 2,
        tension: 0.3,
        fill: false,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => `${ctx.parsed.y > 0 ? '+' : ''}${ctx.parsed.y}%p` } },
      },
      scales: {
        y: {
          ticks: { callback: v => `${v > 0 ? '+' : ''}${v}%p` },
          grid: { color: 'rgba(128,128,128,0.1)' },
        },
        x: { grid: { display: false } },
      },
    },
  }), [selectedWeekIdx, data]);

  return (
    <div className="panel-body">
      <h3 className="section-title">점수 분포 — 저점수 비율 변화</h3>
      <p className="ag-desc">각 점수대(1~10점) 비율(%) · 전주 대비 증감(%p) · 빨강=증가 / 초록=감소</p>

      <form onSubmit={save} className="review-form" style={{ marginBottom: 24 }}>
        <div className="form-row">
          <div className="form-field">
            <label>주차 시작일 (월요일)</label>
            <input type="date" required value={form.week_start}
              onChange={e => setForm(f => ({ ...f, week_start: e.target.value }))} />
          </div>
        </div>
        <div className="ag-score-label">점수대별 건수 입력 (1점 ~ 10점)</div>
        <div className="ag-score-grid">
          {[1,2,3,4,5,6,7,8,9,10].map(s => (
            <div key={s} className="ag-score-cell">
              <label className={s <= 4 ? 'ag-low' : s <= 6 ? 'ag-mid' : 'ag-high'}>{s}점</label>
              <input type="number" min="0" placeholder="0"
                value={form[`score_${s}`]}
                onChange={e => setForm(f => ({ ...f, [`score_${s}`]: e.target.value }))} />
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

          {/* 막대: 점수 분포 */}
          <div className="ag-chart-label">점수 분포</div>
          <div style={{ position: 'relative', height: 240 }}><canvas ref={barRef} /></div>

          {/* 꺾은선: 전주 대비 증감 */}
          {deltaData && (
            <>
              <div className="ag-chart-label" style={{ marginTop: 20 }}>전주 대비 증감</div>
              <div style={{ position: 'relative', height: 200 }}><canvas ref={lineRef} /></div>
            </>
          )}

          {/* 데이터 테이블 */}
          <div className="ag-table-wrap">
            <table className="history-table">
              <thead>
                <tr>
                  <th>주차</th>
                  {[1,2,3,4,5,6,7,8,9,10].map(s => <th key={s}>{s}점</th>)}
                  <th>합계</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {[...data].reverse().map(d => {
                  const total = [1,2,3,4,5,6,7,8,9,10].reduce((s,i) => s + (parseInt(d[`score_${i}`])||0), 0);
                  return (
                    <tr key={d.id}>
                      <td>{fmtWeek(d.week_start)}</td>
                      {[1,2,3,4,5,6,7,8,9,10].map(s => (
                        <td key={s} style={{ color: s<=4?'#E24B4A':s<=6?'#BA7517':'inherit', fontSize:12 }}>
                          {parseInt(d[`score_${s}`])||0}
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
// 탭 3 ── 정비/욕실 불만 건수
// 노션 차트: 꺾은선 2개 + 1~2월 평균 기준선(점선) + 메모 주석
// ────────────────────────────────────────────────────────────────────────
export function TabComplaints({ propertyId, accent }) {
  const [data, setData] = useState([]);
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

  // 1~2월 데이터로 기준선 계산
  const baseline = data.filter(d => { const m = parseInt(d.week_start?.slice(5,7)); return m===1||m===2; });
  const baselineRoom = baseline.length > 0
    ? Math.round(baseline.reduce((s,d) => s+(d.room_complaints||0),0) / baseline.length * 10) / 10 : null;
  const baselineBath = baseline.length > 0
    ? Math.round(baseline.reduce((s,d) => s+(d.bathroom_complaints||0),0) / baseline.length * 10) / 10 : null;

  const labels = data.map(d => fmtWeek(d.week_start));
  const room = data.map(d => d.room_complaints ?? 0);
  const bath = data.map(d => d.bathroom_complaints ?? 0);

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
    if (baselineRoom != null) datasets.push({
      label: `객실 기준선 (${baselineRoom}건)`,
      data: Array(labels.length).fill(baselineRoom),
      borderColor: '#E84393', borderWidth: 1.5, borderDash: [6,4],
      pointRadius: 0, fill: false,
    });
    if (baselineBath != null) datasets.push({
      label: `욕실 기준선 (${baselineBath}건)`,
      data: Array(labels.length).fill(baselineBath),
      borderColor: '#1F72B8', borderWidth: 1.5, borderDash: [6,4],
      pointRadius: 0, fill: false,
    });

    return {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top', labels: { font: { size: 11 } } },
          tooltip: {
            callbacks: {
              afterBody: (items) => {
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
  }, [data]);

  return (
    <div className="panel-body">
      <h3 className="section-title">정비 / 욕실 불만 건수 추이</h3>
      <p className="ag-desc">키워드 기반 불만 건수 추적 · 점선 = 1~2월 평균 기준선</p>

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

      {baselineRoom != null && (
        <div className="ag-baseline-info">
          기준선 (1~2월 평균) — 객실: <strong>{baselineRoom}건</strong> · 욕실: <strong>{baselineBath}건</strong>
        </div>
      )}

      {data.length === 0 ? (
        <div className="empty-state"><p>데이터를 입력하면 차트가 표시됩니다</p></div>
      ) : (
        <>
          <div style={{ position: 'relative', height: 300 }}><canvas ref={canvasRef} /></div>

          {/* 메모 목록 */}
          {data.some(d => d.memo) && (
            <div className="ag-memo-list">
              {data.filter(d => d.memo).map(d => (
                <div key={d.id} className="ag-memo-item">
                  <span className="ag-memo-week">{fmtWeek(d.week_start)}</span>
                  <span className="ag-memo-text">{d.memo}</span>
                </div>
              ))}
            </div>
          )}

          {/* 데이터 테이블 */}
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
        </>
      )}
    </div>
  );
}
