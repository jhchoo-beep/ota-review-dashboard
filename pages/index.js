// pages/index.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Tooltip, Legend, Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const PLATFORM_LABEL = {
  agoda: 'Agoda', airbnb: 'Airbnb', booking: 'Booking.com',
  tripcom: 'Trip.com', expedia: 'Expedia',
  yeogieottae: '여기어때', nol: 'NOL', metasearch: 'Meta-Search'
};
const PLATFORM_COLOR = {
  agoda: '#E84393', airbnb: '#FF5A5F', booking: '#003580',
  tripcom: '#1F72B8', expedia: '#FFCC00',
  yeogieottae: '#FF5C1A', nol: '#00B388', metasearch: '#6366f1'
};

const AGODA_FIELDS = [
  { key: 'cleanliness',     label: '청결' },
  { key: 'facilities',      label: '부대시설' },
  { key: 'location',        label: '위치' },
  { key: 'service',         label: '서비스' },
  { key: 'value_for_money', label: '가격 대비 만족도' },
];
const AIRBNB_FIELDS = [
  { key: 'response_rate', label: '응답률 (%)' },
];
const BOOKING_FIELDS = [
  { key: 'staff_friendliness', label: '직원 친절도' },
  { key: 'facilities',         label: '시설' },
  { key: 'cleanliness',        label: '청결도' },
  { key: 'comfort',            label: '편안함' },
  { key: 'value_for_money',    label: '가성비' },
  { key: 'location',           label: '위치' },
  { key: 'free_wifi',          label: '무료 Wi-Fi' },
];
const TRIPCOM_FIELDS = [
  { key: 'cleanliness', label: '청결도' },
  { key: 'facilities',  label: '시설' },
  { key: 'location',    label: '위치' },
  { key: 'service',     label: '서비스' },
];
const EXPEDIA_FIELDS = [
  { key: 'cleanliness',        label: '청결도' },
  { key: 'staff_service',      label: '직원 및 서비스' },
  { key: 'amenities',          label: '편의시설' },
  { key: 'property_condition', label: '숙박 시설 상태' },
];
// 여기어때, NOL 세부항목 없음
const YEOGI_FIELDS = [];
const NOL_FIELDS = [];
// Meta-Search: Google + Kakao만 표시
const METASEARCH_PLATFORMS = [
  { key: 'google', label: 'Google', color: '#EA4335', scoreKey: 'google_score', countKey: 'google_count' },
  { key: 'kakao',  label: 'Kakao',  color: '#FAE100', scoreKey: 'kakao_score',  countKey: 'kakao_count' },
];

function getFields(platform) {
  switch(platform) {
    case 'agoda':        return AGODA_FIELDS;
    case 'airbnb':       return AIRBNB_FIELDS;
    case 'booking':      return BOOKING_FIELDS;
    case 'tripcom':      return TRIPCOM_FIELDS;
    case 'expedia':      return EXPEDIA_FIELDS;
    case 'yeogieottae':  return YEOGI_FIELDS;
    case 'nol':          return NOL_FIELDS;
    default:             return [];
  }
}

function today() { return new Date().toISOString().slice(0, 10); }
function fmt(v) { return v != null ? Number(v) : null; }
function fmtScore(v) { return v != null ? Number(v).toFixed(1) : '—'; }
function fmtCount(v) { return v != null ? Number(v).toLocaleString() : '—'; }

// -- Score Badge
function ScoreBadge({ value, max = 10 }) {
  if (value == null) return <span className="score-null">—</span>;
  const pct = (value / max) * 100;
  const color = pct >= 85 ? '#22c55e' : pct >= 70 ? '#f59e0b' : '#ef4444';
  return (
    <span className="score-badge" style={{ color, borderColor: color + '33', background: color + '11' }}>
      {Number(value).toFixed(1)}
    </span>
  );
}

// -- Stat Card
function StatCard({ label, value, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

// -- Review Form
function ReviewForm({ property, onSaved }) {
  const platform = property.platform;
  const isMetaSearch = platform === 'metasearch';
  const fields = getFields(platform);

  const [form, setForm] = useState(() => ({
    recorded_at: new Date().toLocaleDateString('en-CA'), // 항상 오늘 날짜
    review_count: '', overall_score: '',
    response_rate: '', cleanliness: '', facilities: '', location: '',
    service: '', value_for_money: '', staff_friendliness: '', comfort: '',
    free_wifi: '', staff_service: '', amenities: '', property_condition: '',
    google_score: '', kakao_score: '',
    google_count: '', kakao_count: '',
  }));
  const [status, setStatus] = useState('idle');
  const [errMsg, setErrMsg] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_id: property.id, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus('ok');
      onSaved();
      setTimeout(() => setStatus('idle'), 2500);
    } catch (e) {
      setErrMsg(e.message);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  // Meta-Search 전용 폼
  if (isMetaSearch) {
    return (
      <form id="review-form" onSubmit={handleSubmit} className="review-form">
        <div className="form-row">
          <div className="form-field">
            <label>날짜 <span className="required">*</span></label>
            <input type="date" value={form.recorded_at} onChange={e => set('recorded_at', e.target.value)} required />
          </div>
        </div>
        <div className="meta-grid">
          {METASEARCH_PLATFORMS.map(p => (
            <div key={p.key} className="meta-card" style={{ borderTopColor: p.color }}>
              <div className="meta-card-title" style={{ color: p.color }}>{p.label}</div>
              <div className="form-field">
                <label>평점</label>
                <input type="number" placeholder="예: 4.5" value={form[p.scoreKey]} onChange={e => set(p.scoreKey, e.target.value)} step="0.1" min="0" max="10" />
              </div>
              <div className="form-field">
                <label>리뷰 수</label>
                <input type="number" placeholder="예: 1200" value={form[p.countKey]} onChange={e => set(p.countKey, e.target.value)} min="0" />
              </div>
            </div>
          ))}
        </div>
        {status === 'ok' && <p className="form-status ok" style={{marginTop:'8px'}}>✓ 저장되었습니다</p>}
        {status === 'error' && <p className="form-status error" style={{marginTop:'8px'}}>✕ {errMsg}</p>}
      </form>
    );
  }

  // 일반 폼
  return (
    <form id="review-form" onSubmit={handleSubmit} className="review-form">
      <div className="form-row">
        <div className="form-field">
          <label>날짜</label>
          <input type="date" value={form.recorded_at} onChange={e => set('recorded_at', e.target.value)} required />
        </div>
        <div className="form-field">
          <label>누적 리뷰 수</label>
          <input type="number" placeholder="예: 8186" value={form.review_count} onChange={e => set('review_count', e.target.value)} min="0" />
        </div>
        <div className="form-field">
          <label>종합 평점 <span className="required">*</span></label>
          <input type="number" placeholder="예: 8.6" value={form.overall_score} onChange={e => set('overall_score', e.target.value)} step="0.1" min="0" max="10" required />
        </div>
      </div>
      {fields.length > 0 && (
        <div className="form-row">
          {fields.map(f => (
            <div className="form-field" key={f.key}>
              <label>{f.label}</label>
              <input
                type="number"
                placeholder={f.key === 'response_rate' ? '예: 98' : '예: 8.5'}
                value={form[f.key] || ''}
                onChange={e => set(f.key, e.target.value)}
                step={f.key === 'response_rate' ? '1' : '0.1'}
                min="0"
                max={f.key === 'response_rate' ? 100 : 10}
              />
            </div>
          ))}
        </div>
      )}
      {status === 'ok' && <p className="form-status ok" style={{marginTop:'8px'}}>✓ 저장되었습니다</p>}
      {status === 'error' && <p className="form-status error" style={{marginTop:'8px'}}>✕ {errMsg}</p>}
    </form>
  );
}

// -- Chart
function ReviewChart({ reviews, platform }) {
  const isAirbnb = platform === 'airbnb';
  const isBooking = platform === 'booking';
  const isTripcom = platform === 'tripcom';
  const isExpedia = platform === 'expedia';

  // 5점 만점 플랫폼: Airbnb, NOL
  const is5Point = ['airbnb', 'nol'].includes(platform);

  const sorted = [...reviews].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
  const labels = sorted.map(r => r.recorded_at?.slice(0, 10) ?? '');
  const accent = PLATFORM_COLOR[platform];

  const datasets = [
    {
      label: '종합 평점',
      data: sorted.map(r => fmt(r.overall_score)),
      borderColor: accent,
      backgroundColor: accent + '18',
      fill: true,
      tension: 0.35,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 2,
    },
  ];

  const extraMap = {
    agoda: [
      { key: 'cleanliness',     label: '청결',       color: '#6366f1' },
      { key: 'facilities',      label: '부대시설',    color: '#22c55e' },
      { key: 'location',        label: '위치',        color: '#f59e0b' },
      { key: 'service',         label: '서비스',      color: '#ef4444' },
      { key: 'value_for_money', label: '가격 만족도', color: '#14b8a6' },
    ],
    booking: [
      { key: 'staff_friendliness', label: '직원 친절도', color: '#6366f1' },
      { key: 'facilities',         label: '시설',        color: '#22c55e' },
      { key: 'cleanliness',        label: '청결도',      color: '#f59e0b' },
      { key: 'comfort',            label: '편안함',      color: '#ef4444' },
      { key: 'value_for_money',    label: '가성비',      color: '#14b8a6' },
      { key: 'location',           label: '위치',        color: '#8b5cf6' },
      { key: 'free_wifi',          label: '무료 Wi-Fi',  color: '#0ea5e9' },
    ],
    tripcom: [
      { key: 'cleanliness', label: '청결도', color: '#6366f1' },
      { key: 'facilities',  label: '시설',   color: '#22c55e' },
      { key: 'location',    label: '위치',   color: '#f59e0b' },
      { key: 'service',     label: '서비스', color: '#ef4444' },
    ],
    expedia: [
      { key: 'cleanliness',        label: '청결도',        color: '#6366f1' },
      { key: 'staff_service',      label: '직원 및 서비스', color: '#22c55e' },
      { key: 'amenities',          label: '편의시설',       color: '#f59e0b' },
      { key: 'property_condition', label: '시설 상태',      color: '#ef4444' },
    ],
  };

  const extras = extraMap[platform] || [];
  extras.forEach(({ key, label, color }) => {
    datasets.push({
      label,
      data: sorted.map(r => fmt(r[key])),
      borderColor: color,
      backgroundColor: 'transparent',
      borderDash: [4, 3],
      tension: 0.35,
      pointRadius: 3,
      borderWidth: 1.5,
      fill: false,
    });
  });

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { font: { size: 12 }, boxWidth: 12, padding: 16 } },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: { grid: { color: '#f0f0f0' }, ticks: { font: { size: 11 }, maxRotation: 45 } },
      y: {
        min: is5Point ? 3 : 6,
        max: is5Point ? 5 : 10,
        ticks: { stepSize: 0.5, font: { size: 11 } },
        grid: { color: '#f0f0f0' },
      },
    },
  };

  return (
    <div style={{ position: 'relative', height: '260px', width: '100%' }}>
      <Line data={{ labels, datasets }} options={options} />
    </div>
  );
}

// -- Meta-Search Charts (4개)
function MetaSearchCharts({ reviews }) {
  const sorted = [...reviews].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
  const labels = sorted.map(r => r.recorded_at?.slice(0, 10) ?? '');
  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
    scales: {
      x: { grid: { color: '#f0f0f0' }, ticks: { font: { size: 10 }, maxRotation: 45 } },
      y: { min: 3, max: 5, ticks: { stepSize: 0.5, font: { size: 10 } }, grid: { color: '#f0f0f0' } },
    },
  };
  return (
    <div className="meta-charts-grid">
      {METASEARCH_PLATFORMS.map(p => (
        <div key={p.key} className="meta-chart-item">
          <div className="meta-chart-title" style={{ color: p.color }}>{p.label}</div>
          <div style={{ position: 'relative', height: '180px' }}>
            <Line
              data={{
                labels,
                datasets: [{
                  label: p.label,
                  data: sorted.map(r => fmt(r[p.scoreKey])),
                  borderColor: p.color,
                  backgroundColor: p.color + '18',
                  fill: true, tension: 0.35, pointRadius: 3, borderWidth: 2,
                }]
              }}
              options={chartOptions}
            />
          </div>
          <div className="meta-chart-latest">
            최신: <strong>{fmtScore(sorted[sorted.length-1]?.[p.scoreKey])}</strong>
            {sorted[sorted.length-1]?.[p.countKey] != null && (
              <span> · {fmtCount(sorted[sorted.length-1][p.countKey])}건</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// -- Review Count Chart
function ReviewCountChart({ reviews }) {
  const sorted = [...reviews].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
  const labels = sorted.map(r => r.recorded_at?.slice(0, 10) ?? '');
  const data = sorted.map(r => r.review_count != null ? Number(r.review_count) : null);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: { grid: { color: '#f0f0f0' }, ticks: { font: { size: 11 }, maxRotation: 45 } },
      y: {
        ticks: { font: { size: 11 }, callback: v => v.toLocaleString() },
        grid: { color: '#f0f0f0' },
      },
    },
  };

  const chartData = {
    labels,
    datasets: [{
      label: '누적 리뷰 수',
      data,
      borderColor: '#185FA5',
      backgroundColor: '#185FA518',
      fill: true,
      tension: 0.35,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 2,
    }],
  };

  return (
    <div style={{ position: 'relative', height: '220px', width: '100%' }}>
      <Line data={chartData} options={options} />
    </div>
  );
}

// -- History Table
function HistoryTable({ reviews, platform, onDelete }) {
  const isAirbnb = platform === 'airbnb';
  const isBooking = platform === 'booking';
  const isTripcom = platform === 'tripcom';
  const isExpedia = platform === 'expedia';
  const isMetaSearch = platform === 'metasearch';
  const is5Point = ['airbnb', 'nol'].includes(platform);
  const scoreMax = is5Point ? 5 : 10;
  const sorted = [...reviews].sort((a, b) => b.recorded_at.localeCompare(a.recorded_at));

  if (!sorted.length) return <p className="empty-msg">아직 기록이 없습니다</p>;

  return (
    <div className="table-wrap">
      <table className="history-table">
        <thead>
          <tr>
            <th>날짜</th>
            {isMetaSearch ? (
              <>
                <th>Google</th><th>Kakao</th>
              </>
            ) : (
              <>
                <th>리뷰 수</th>
                <th>종합</th>
                {!isAirbnb && !isBooking && !isTripcom && !isExpedia && <><th>청결</th><th>부대시설</th><th>서비스</th><th>가격만족</th><th>위치</th></>}
                {isAirbnb && <th>응답률</th>}
                {isBooking && <><th>친절도</th><th>시설</th><th>청결도</th><th>편안함</th><th>가성비</th><th>위치</th><th>Wi-Fi</th></>}
                {isTripcom && <><th>청결도</th><th>시설</th><th>위치</th><th>서비스</th></>}
                {isExpedia && <><th>청결도</th><th>직원/서비스</th><th>편의시설</th><th>시설상태</th></>}
              </>
            )}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(r => (
            <tr key={r.id}>
              <td>{r.recorded_at?.slice(0, 10)}</td>
              {isMetaSearch ? (
                <>
                  <td><ScoreBadge value={r.google_score} />{r.google_count ? <span style={{fontSize:'11px',color:'#999',marginLeft:'4px'}}>({Number(r.google_count).toLocaleString()})</span> : ''}</td>
                  <td><ScoreBadge value={r.kakao_score} />{r.kakao_count ? <span style={{fontSize:'11px',color:'#999',marginLeft:'4px'}}>({Number(r.kakao_count).toLocaleString()})</span> : ''}</td>
                </>
              ) : (
                <>
                  <td>{fmtCount(r.review_count)}</td>
                  <td><ScoreBadge value={r.overall_score} max={scoreMax} /></td>
                  {!isAirbnb && !isBooking && !isTripcom && !isExpedia && <>
                    <td><ScoreBadge value={r.cleanliness} /></td>
                    <td><ScoreBadge value={r.facilities} /></td>
                    <td><ScoreBadge value={r.service} /></td>
                    <td><ScoreBadge value={r.value_for_money} /></td>
                    <td><ScoreBadge value={r.location} /></td>
                  </>}
                  {isAirbnb && <td>{r.response_rate != null ? `${r.response_rate}%` : '—'}</td>}
                  {isBooking && <>
                    <td><ScoreBadge value={r.staff_friendliness} /></td>
                    <td><ScoreBadge value={r.facilities} /></td>
                    <td><ScoreBadge value={r.cleanliness} /></td>
                    <td><ScoreBadge value={r.comfort} /></td>
                    <td><ScoreBadge value={r.value_for_money} /></td>
                    <td><ScoreBadge value={r.location} /></td>
                    <td><ScoreBadge value={r.free_wifi} /></td>
                  </>}
                  {isTripcom && <>
                    <td><ScoreBadge value={r.cleanliness} /></td>
                    <td><ScoreBadge value={r.facilities} /></td>
                    <td><ScoreBadge value={r.location} /></td>
                    <td><ScoreBadge value={r.service} /></td>
                  </>}
                  {isExpedia && <>
                    <td><ScoreBadge value={r.cleanliness} /></td>
                    <td><ScoreBadge value={r.staff_service} /></td>
                    <td><ScoreBadge value={r.amenities} /></td>
                    <td><ScoreBadge value={r.property_condition} /></td>
                  </>}
                </>
              )}
              <td>
                <button className="btn-delete" onClick={() => onDelete(r.id)} title="삭제">×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// -- Property Panel
function PropertyPanel({ property }) {
  const [reviews, setReviews] = useState([]);
  const [tab, setTab] = useState('dashboard');
  const [superhostRecords, setSuperhostRecords] = useState([]);
  const [shForm, setShForm] = useState({
    period_start: '', period_end: '', rating: '', response_rate: '', trips: '', cancel_rate: '', memo: ''
  });
  const [shStatus, setShStatus] = useState('idle');

  const SUPERHOST_PERIODS = [
    { start: '2025-04-01', end: '2026-03-31', label: '2025.04 ~ 2026.03' },
    { start: '2025-01-01', end: '2025-12-31', label: '2025.01 ~ 2025.12' },
    { start: '2024-10-01', end: '2025-09-30', label: '2024.10 ~ 2025.09' },
    { start: '2024-07-01', end: '2025-06-30', label: '2024.07 ~ 2025.06' },
    { start: '2024-04-01', end: '2025-03-31', label: '2024.04 ~ 2025.03' },
  ];

  const load = async () => {
    const res = await fetch(`/api/reviews?property_id=${property.id}`);
    const data = await res.json();
    setReviews(data);
  };

  const loadSuperhost = async () => {
    const res = await fetch(`/api/superhost?property_id=${property.id}`);
    const data = await res.json();
    setSuperhostRecords(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    load();
    if (property.platform === 'airbnb') loadSuperhost();
  }, [property.id]);

  const saveSuperhost = async (e) => {
    e.preventDefault();
    setShStatus('loading');
    const res = await fetch('/api/superhost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ property_id: property.id, ...shForm,
        rating: shForm.rating || null,
        response_rate: shForm.response_rate || null,
        trips: shForm.trips || null,
        cancel_rate: shForm.cancel_rate || null,
      }),
    });
    if (res.ok) {
      setShStatus('ok');
      setShForm({ period_start: '', period_end: '', rating: '', response_rate: '', trips: '', cancel_rate: '', memo: '' });
      loadSuperhost();
      setTimeout(() => setShStatus('idle'), 2000);
    } else {
      setShStatus('error');
      setTimeout(() => setShStatus('idle'), 2000);
    }
  };

  const deleteSuperhost = async (id) => {
    if (!confirm('이 기록을 삭제할까요?')) return;
    await fetch(`/api/superhost?id=${id}`, { method: 'DELETE' });
    loadSuperhost();
  };

  const handleDelete = async (id) => {
    if (!confirm('이 기록을 삭제할까요?')) return;
    await fetch(`/api/reviews?id=${id}`, { method: 'DELETE' });
    load();
  };

  const isAirbnb = property.platform === 'airbnb';
  const isBooking = property.platform === 'booking';
  const isTripcom = property.platform === 'tripcom';
  const isExpedia = property.platform === 'expedia';
  const isMetaSearch = property.platform === 'metasearch';
  const isSimple = ['yeogieottae', 'nol'].includes(property.platform);
  const is5Point = ['airbnb', 'nol'].includes(property.platform);
  const scoreMax = is5Point ? 5 : 10;
  const latest = reviews[0];
  const prev = reviews[1];
  const accent = PLATFORM_COLOR[property.platform];

  const diff = (key) => {
    if (!latest || !prev || latest[key] == null || prev[key] == null) return null;
    return (Number(latest[key]) - Number(prev[key])).toFixed(1);
  };

  const diffEl = (key) => {
    const d = diff(key);
    if (d == null) return null;
    const n = parseFloat(d);
    if (n === 0) return <span className="diff neutral">±0</span>;
    return <span className={`diff ${n > 0 ? 'up' : 'down'}`}>{n > 0 ? `+${d}` : d}</span>;
  };

  return (
    <div className="property-panel">
      <div className="panel-header" style={{ borderLeftColor: accent }}>
        <div>
          <h2 className="panel-name">{property.name}</h2>
          <span className="platform-badge" style={{ background: accent + '18', color: accent }}>
            {PLATFORM_LABEL[property.platform]}
          </span>
        </div>
        <div className="panel-header-right">
          <div className="panel-tabs">
            {(isAirbnb ? ['dashboard', 'superhost', 'history'] : ['dashboard', 'history']).map(t => (
              <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} style={tab === t ? { borderBottomColor: accent, color: accent } : {}} onClick={() => setTab(t)}>
                {{ dashboard: '대시보드', superhost: '슈퍼호스트', history: '기록' }[t]}
              </button>
            ))}
          </div>
          <button
            className="btn-input"
            style={{ background: tab === 'input' ? accent : 'transparent', color: tab === 'input' ? '#fff' : accent, borderColor: accent }}
            onClick={() => setTab(tab === 'input' ? 'dashboard' : 'input')}
          >
            {tab === 'input' ? '✕ 닫기' : '+ 점수 입력'}
          </button>
          {tab === 'input' && (
            <button
              type="submit"
              form="review-form"
              className="btn-input"
              style={{ background: accent, color: '#fff', borderColor: accent, marginLeft: '8px' }}
            >
              점수 저장
            </button>
          )}
          {tab === 'superhost' && isAirbnb && (
            <button
              type="submit"
              form="sh-form"
              className="btn-input"
              style={{ background: accent, color: '#fff', borderColor: accent, marginLeft: '8px' }}
            >
              기록 저장
            </button>
          )}        </div>
      </div>

      {tab === 'dashboard' && (
        <div className="panel-body">
          {latest || (isMetaSearch && reviews.length > 0) ? (
            <>
              {/* Meta-Search 전용 뷰 */}
              {isMetaSearch ? (
                <>
                  <div className="chart-section">
                    <h3 className="section-title">플랫폼별 평점 추이</h3>
                    <MetaSearchCharts reviews={reviews} />
                  </div>
                </>
              ) : (
                <>
                  <div className="stats-grid">
                    <StatCard label="종합 평점" value={<>{fmtScore(latest.overall_score)}<span style={{fontSize:'13px',color:'var(--text-3)',fontWeight:400}}> /{scoreMax}</span>{diffEl('overall_score')}</>} sub={`기준일: ${latest.recorded_at?.slice(0, 10)}`} />
                    <StatCard label="누적 리뷰 수" value={fmtCount(latest.review_count)} />
                    {/* Agoda 전용 */}
                    {!isAirbnb && !isBooking && !isTripcom && !isExpedia && !isSimple && <StatCard label="청결" value={<>{fmtScore(latest.cleanliness)}{diffEl('cleanliness')}</>} />}
                    {!isAirbnb && !isBooking && !isTripcom && !isExpedia && !isSimple && <StatCard label="부대시설" value={<>{fmtScore(latest.facilities)}{diffEl('facilities')}</>} />}
                    {!isAirbnb && !isBooking && !isTripcom && !isExpedia && !isSimple && <StatCard label="위치" value={<>{fmtScore(latest.location)}{diffEl('location')}</>} />}
                    {!isAirbnb && !isBooking && !isTripcom && !isExpedia && !isSimple && <StatCard label="서비스" value={<>{fmtScore(latest.service)}{diffEl('service')}</>} />}
                    {!isAirbnb && !isBooking && !isTripcom && !isExpedia && !isSimple && <StatCard label="가격 만족도" value={<>{fmtScore(latest.value_for_money)}{diffEl('value_for_money')}</>} />}
                    {/* Airbnb 전용 */}

                    {/* Booking.com 전용 */}
                    {isBooking && <StatCard label="직원 친절도" value={<>{fmtScore(latest.staff_friendliness)}{diffEl('staff_friendliness')}</>} />}
                    {isBooking && <StatCard label="시설" value={<>{fmtScore(latest.facilities)}{diffEl('facilities')}</>} />}
                    {isBooking && <StatCard label="청결도" value={<>{fmtScore(latest.cleanliness)}{diffEl('cleanliness')}</>} />}
                    {isBooking && <StatCard label="편안함" value={<>{fmtScore(latest.comfort)}{diffEl('comfort')}</>} />}
                    {isBooking && <StatCard label="가성비" value={<>{fmtScore(latest.value_for_money)}{diffEl('value_for_money')}</>} />}
                    {isBooking && <StatCard label="위치" value={<>{fmtScore(latest.location)}{diffEl('location')}</>} />}
                    {isBooking && <StatCard label="무료 Wi-Fi" value={<>{fmtScore(latest.free_wifi)}{diffEl('free_wifi')}</>} />}
                    {/* Trip.com 전용 */}
                    {isTripcom && <StatCard label="청결도" value={<>{fmtScore(latest.cleanliness)}{diffEl('cleanliness')}</>} />}
                    {isTripcom && <StatCard label="시설" value={<>{fmtScore(latest.facilities)}{diffEl('facilities')}</>} />}
                    {isTripcom && <StatCard label="위치" value={<>{fmtScore(latest.location)}{diffEl('location')}</>} />}
                    {isTripcom && <StatCard label="서비스" value={<>{fmtScore(latest.service)}{diffEl('service')}</>} />}
                    {/* Expedia 전용 */}
                    {isExpedia && <StatCard label="청결도" value={<>{fmtScore(latest.cleanliness)}{diffEl('cleanliness')}</>} />}
                    {isExpedia && <StatCard label="직원 및 서비스" value={<>{fmtScore(latest.staff_service)}{diffEl('staff_service')}</>} />}
                    {isExpedia && <StatCard label="편의시설" value={<>{fmtScore(latest.amenities)}{diffEl('amenities')}</>} />}
                    {isExpedia && <StatCard label="시설 상태" value={<>{fmtScore(latest.property_condition)}{diffEl('property_condition')}</>} />}
                  </div>
                  {reviews.length >= 2 && (
                    <>
                      <div className="chart-section">
                        <h3 className="section-title">평점 추이</h3>
                        <ReviewChart reviews={reviews} platform={property.platform} />
                      </div>
                      <div className="chart-section" style={{ marginTop: '24px' }}>
                        <h3 className="section-title">누적 리뷰 수 추이</h3>
                        <ReviewCountChart reviews={reviews} />
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="empty-state">
              <p>아직 입력된 점수가 없습니다</p>
              <button className="btn-primary" onClick={() => setTab('input')}>첫 점수 입력하기</button>
            </div>
          )}
        </div>
      )}

      {tab === 'input' && (
        <div className="panel-body">
          <h3 className="section-title">새 점수 입력</h3>
          <ReviewForm key={`${property.id}-${tab}`} property={property} onSaved={() => { load(); setTab('dashboard'); }} />
        </div>
      )}

      {/* 슈퍼호스트 탭 - Airbnb 전용 */}
      {tab === 'superhost' && isAirbnb && (
        <div className="panel-body">
          {/* 현재 상태 */}
          {(() => {
            const latest = superhostRecords[0];
            const isAchieved = latest?.achieved;
            return (
              <div className="sh-status-bar" style={{ background: isAchieved ? '#E1F5EE' : '#FCEBEB', border: `0.5px solid ${isAchieved ? '#9FE1CB' : '#F7C1C1'}` }}>
                <span className="sh-status-dot" style={{ background: isAchieved ? '#0F6E56' : '#E24B4A' }} />
                <span className="sh-status-text" style={{ color: isAchieved ? '#085041' : '#791F1F' }}>
                  {latest ? (isAchieved ? '슈퍼호스트 유지 중' : '슈퍼호스트 미달성') : '기록 없음'}
                </span>
                {latest && (
                  <span className="sh-status-period">{latest.period_start?.slice(0,7).replace('-','.')} ~ {latest.period_end?.slice(0,7).replace('-','.')}</span>
                )}
              </div>
            );
          })()}

          {/* 슈퍼호스트 기록 입력 폼 */}
          <div className="sh-section">
            <h3 className="section-title">기록 입력</h3>
            <form id="sh-form" onSubmit={saveSuperhost} className="review-form">
              <div className="form-row">
                <div className="form-field">
                  <label>평가 기간 선택</label>
                  <select value={shForm.period_start + '|' + shForm.period_end}
                    onChange={e => {
                      const [s, en] = e.target.value.split('|');
                      setShForm(f => ({ ...f, period_start: s, period_end: en }));
                    }} required>
                    <option value="|">-- 기간 선택 --</option>
                    {SUPERHOST_PERIODS.map(p => (
                      <option key={p.start} value={p.start + '|' + p.end}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-field">
                  <label>평점</label>
                  <input type="number" placeholder="예: 4.92" step="0.01" min="0" max="5" value={shForm.rating} onChange={e => setShForm(f => ({ ...f, rating: e.target.value }))} />
                </div>
                <div className="form-field">
                  <label>응답률 (%)</label>
                  <input type="number" placeholder="예: 98" step="1" min="0" max="100" value={shForm.response_rate} onChange={e => setShForm(f => ({ ...f, response_rate: e.target.value }))} />
                </div>
                <div className="form-field">
                  <label>호스팅 횟수</label>
                  <input type="number" placeholder="예: 42" step="1" min="0" value={shForm.trips} onChange={e => setShForm(f => ({ ...f, trips: e.target.value }))} />
                </div>
                <div className="form-field">
                  <label>취소율 (%)</label>
                  <input type="number" placeholder="예: 0.0" step="0.1" min="0" max="100" value={shForm.cancel_rate} onChange={e => setShForm(f => ({ ...f, cancel_rate: e.target.value }))} />
                </div>
              </div>
              {shStatus === 'ok' && <p className="form-status ok" style={{marginTop:'8px'}}>✓ 저장되었습니다</p>}
              {shStatus === 'error' && <p className="form-status error" style={{marginTop:'8px'}}>✕ 저장 실패</p>}
            </form>
          </div>

          {/* 달성 조건 현황 - 최신 기록 기반 */}
          {superhostRecords[0] && (() => {
            const r = superhostRecords[0];
            const criteria = [
              { name: '평점', value: r.rating ? `${Number(r.rating).toFixed(2)}점` : '—', pass: r.rating >= 4.8, target: '4.8 이상' },
              { name: '응답률', value: r.response_rate ? `${r.response_rate}%` : '—', pass: r.response_rate >= 90, target: '90% 이상' },
              { name: '호스팅 횟수', value: r.trips ? `${r.trips}회` : '—', pass: r.trips >= 10, target: '10회 이상' },
              { name: '예약 취소율', value: r.cancel_rate != null ? `${r.cancel_rate}%` : '—', pass: r.cancel_rate < 1.0, target: '1.0% 미만' },
            ];
            return (
              <div className="sh-section">
                <h3 className="section-title">달성 조건 현황 <span style={{fontWeight:400, color:'var(--text-2)', fontSize:'12px'}}>({r.period_start?.slice(0,7).replace('-','.')} ~ {r.period_end?.slice(0,7).replace('-','.')})</span></h3>
                <div className="sh-criteria-list">
                  {criteria.map(c => (
                    <div key={c.name} className="sh-criteria-row">
                      <span className={`sh-criteria-icon ${c.value !== '—' ? (c.pass ? 'pass' : 'fail') : 'neutral'}`}>{c.value !== '—' ? (c.pass ? '✓' : '✕') : '–'}</span>
                      <span className="sh-criteria-name">{c.name}</span>
                      <span className="sh-criteria-value">{c.value}</span>
                      <span className="sh-criteria-target">기준 {c.target}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* 기간별 이력 */}
          <div className="sh-section">
            <h3 className="section-title">평가 기간별 이력</h3>
            {superhostRecords.length === 0 ? (
              <p className="empty-msg">아직 기록이 없습니다</p>
            ) : (
              <div className="table-wrap">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>평가 기간</th>
                      <th>평점</th>
                      <th>응답률</th>
                      <th>호스팅</th>
                      <th>취소율</th>
                      <th>결과</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {superhostRecords.map(r => (
                      <tr key={r.id}>
                        <td>{r.period_start?.slice(0,7).replace('-','.')} ~ {r.period_end?.slice(0,7).replace('-','.')}</td>
                        <td>{r.rating ? Number(r.rating).toFixed(2) : '—'}</td>
                        <td>{r.response_rate != null ? `${r.response_rate}%` : '—'}</td>
                        <td>{r.trips != null ? `${r.trips}회` : '—'}</td>
                        <td>{r.cancel_rate != null ? `${r.cancel_rate}%` : '—'}</td>
                        <td>
                          <span className={r.achieved ? 'sh-badge-pass' : 'sh-badge-fail'}>
                            {r.achieved ? '달성' : '미달성'}
                          </span>
                        </td>
                        <td>
                          <button className="delete-btn" onClick={() => deleteSuperhost(r.id)}>×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 점수 저장 버튼 - 슈퍼호스트 탭일 때 */}
      {tab === 'superhost' && isAirbnb && (
        <div style={{ display: 'none' }}>
          <button type="submit" form="sh-form" id="sh-submit-hidden" />
        </div>
      )}

      {tab === 'history' && (
        <div className="panel-body">
          <h3 className="section-title">전체 기록</h3>
          <HistoryTable reviews={reviews} platform={property.platform} onDelete={handleDelete} />
        </div>
      )}
    </div>
  );
}

// -- Main Page
export default function Home() {
  const [properties, setProperties] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNameCustom, setNewNameCustom] = useState('');
  const [isCustomName, setIsCustomName] = useState(false);
  const [newPlatform, setNewPlatform] = useState('agoda');
  const [addStatus, setAddStatus] = useState('idle');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 고정 지점 목록
  const FIXED_PROPERTIES = ['맹그로브 신설', '맹그로브 동대문', '맹그로브 고성', '맹그로브 제주시티'];

  // 지점별 OTA 고정 순서
  const OTA_ORDER = {
    '맹그로브 신설':    ['agoda','airbnb','booking','tripcom','expedia','nol','yeogieottae','metasearch'],
    '맹그로브 동대문':  ['agoda','airbnb','booking','tripcom','expedia','nol','yeogieottae','metasearch'],
    '맹그로브 고성':    ['agoda','airbnb','nol','metasearch'],
    '맹그로브 제주시티':['agoda','airbnb','booking','tripcom','expedia','nol','yeogieottae','metasearch'],
  };

  // 그룹 단위 목록 — 지점 고정 순서 + OTA 고정 순서 적용
  const groupList = (() => {
    const map = {};
    properties.forEach(p => {
      if (!map[p.name]) map[p.name] = [];
      map[p.name].push(p);
    });
    // 지점 순서: 고정 목록 먼저, 나머지는 뒤에
    const fixedNames = FIXED_PROPERTIES.filter(n => map[n]);
    const extraNames = Object.keys(map).filter(n => !FIXED_PROPERTIES.includes(n));
    return [...fixedNames, ...extraNames].map(name => {
      const items = map[name];
      const order = OTA_ORDER[name];
      if (order) {
        items.sort((a, b) => {
          const ai = order.indexOf(a.platform);
          const bi = order.indexOf(b.platform);
          return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
        });
      }
      return { name, items };
    });
  })();

  useEffect(() => {
    fetch('/api/properties')
      .then(r => r.json())
      .then(data => { setProperties(data); });
  }, []);


  const addProperty = async (e) => {
    e.preventDefault();
    const finalName = isCustomName ? newNameCustom : newName;
    if (!finalName) return;
    setAddStatus('loading');
    const res = await fetch('/api/properties', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: finalName, platform: newPlatform }) });
    const data = await res.json();
    if (res.ok) {
      const updated = await fetch('/api/properties').then(r => r.json());
      setProperties(updated);
      setSelected(updated.find(p => p.id === data.id));
      setShowAddModal(false);
      setNewName('');
      setNewNameCustom('');
      setIsCustomName(false);
      setAddStatus('idle');
    } else {
      setAddStatus('error');
      setTimeout(() => setAddStatus('idle'), 2500);
    }
  };

  return (
    <>
      <Head>
        <title>맹그로브 리뷰 대시보드</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <div className="app">
        {/* 모바일 전용 상단 헤더 */}
        <header className="mobile-header">
          <button className="hamburger" onClick={() => setSidebarOpen(v => !v)}>
            <span /><span /><span />
          </button>
          <div className="mobile-logo">
            <span className="logo-mark">OTA</span>
            <span className="logo-text">맹그로브 리뷰 대시보드</span>
          </div>
        </header>

        {/* 모바일 사이드바 오버레이 */}
        {sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <div className="sidebar-logo">
            <span className="logo-mark">OTA</span>
            <span className="logo-text">맹그로브 리뷰 대시보드</span>
          </div>

          <nav className="property-nav">
            {/* 모바일에서 사이드바 닫기 버튼 */}
            <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
              ✕ 닫기
            </button>
            <button className="nav-add" onClick={() => { setShowAddModal(true); setSidebarOpen(false); }}>
              + 지점 & OTA 추가
            </button>

            <div className="nav-label-row">
              <span className="nav-label">지점 목록</span>
            </div>
            <div className="nav-scroll">
            {groupList.map((grp) => (
              <div key={grp.name} className="nav-group">
                {grp.items.length > 1 && (
                  <div className="nav-group-header">
                    <div className="nav-group-label">{grp.name}</div>
                  </div>
                )}
                {grp.items.map(p => (
                  <button
                    key={p.id}
                    className={`nav-item ${selected?.id === p.id ? 'active' : ''} ${grp.items.length > 1 ? 'indented' : ''}`}
                    onClick={() => { setSelected(p); setSidebarOpen(false); }}
                  >
                    <span className="nav-dot" style={{ background: PLATFORM_COLOR[p.platform] }} />
                    <span className="nav-name">{grp.items.length > 1 ? PLATFORM_LABEL[p.platform] : p.name}</span>
                    {grp.items.length === 1 && <span className="nav-platform">{PLATFORM_LABEL[p.platform]}</span>}
                  </button>
                ))}
              </div>
            ))}
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <main className={`main${!selected ? ' main-welcome' : ''}`}>
          {selected ? (
            <PropertyPanel key={selected.id} property={selected} />
          ) : (
            <div className="welcome-page">
              <div className="welcome-inner">
                <div className="welcome-logo-wrap">
                  <span className="welcome-logo-mark">OTA</span>
                </div>
                <h1 className="welcome-title">맹그로브 리뷰 대시보드</h1>
                <p className="welcome-desc">각 지점의 OTA 리뷰 점수를 한눈에 확인하고 관리하세요</p>
                <div className="welcome-divider" />
                <p className="welcome-hint">
                  <span className="welcome-arrow">←</span>
                  좌측 목록에서 <strong>지점</strong>과 <strong>OTA 플랫폼</strong>을 선택하면 평점 현황과 추이를 확인할 수 있습니다
                </p>
                <div className="welcome-cards">
                  {['Agoda', 'Airbnb', 'Booking.com', 'Trip.com', 'Expedia', 'NOL', '여기어때', 'Meta-Search'].map((ota, i) => (
                    <span key={ota} className="welcome-ota-badge" style={{ background: Object.values(PLATFORM_COLOR)[i % Object.values(PLATFORM_COLOR).length] + '18', color: Object.values(PLATFORM_COLOR)[i % Object.values(PLATFORM_COLOR).length] }}>
                      {ota}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add property modal */}
      {showAddModal && (
        <div className="modal-bg" onClick={() => { setShowAddModal(false); setIsCustomName(false); setNewName(''); setNewNameCustom(''); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">OTA 추가</h3>
            <form onSubmit={addProperty}>
              <div className="form-field" style={{ marginBottom: '12px' }}>
                <label>지점 선택</label>
                <select
                  value={isCustomName ? '__custom__' : newName}
                  onChange={e => {
                    if (e.target.value === '__custom__') {
                      setIsCustomName(true);
                      setNewName('');
                    } else {
                      setIsCustomName(false);
                      setNewName(e.target.value);
                    }
                  }}
                  required={!isCustomName}
                >
                  <option value="">-- 지점을 선택하세요 --</option>
                  {(() => {
                    // 고정 목록 + DB에 있는 지점 중 고정 목록에 없는 것 합치기
                    const dbNames = [...new Set(properties.map(p => p.name))];
                    const extras = dbNames.filter(n => !FIXED_PROPERTIES.includes(n));
                    return [...FIXED_PROPERTIES, ...extras].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ));
                  })()}
                  <option value="__custom__">+ 새 지점 직접 입력</option>
                </select>
              </div>
              {isCustomName && (
                <div className="form-field" style={{ marginBottom: '12px' }}>
                  <label>새 지점명 입력</label>
                  <input
                    type="text"
                    placeholder="예: 맹그로브 부산"
                    value={newNameCustom}
                    onChange={e => setNewNameCustom(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              )}
              <div className="form-field" style={{ marginBottom: '20px' }}>
                <label>플랫폼</label>
                <select value={newPlatform} onChange={e => setNewPlatform(e.target.value)}>
                  <option value="agoda">Agoda</option>
                  <option value="airbnb">Airbnb</option>
                  <option value="booking">Booking.com</option>
                  <option value="tripcom">Trip.com</option>
                  <option value="expedia">Expedia</option>
                  <option value="yeogieottae">여기어때</option>
                  <option value="nol">NOL</option>
                  <option value="metasearch">Meta-Search</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-ghost" onClick={() => { setShowAddModal(false); setIsCustomName(false); setNewName(''); setNewNameCustom(''); }}>취소</button>
                <button type="submit" className="btn-primary" disabled={addStatus === 'loading' || (!newName && !newNameCustom)}>
                  {addStatus === 'loading' ? '추가 중...' : '추가'}
                </button>
              </div>
              {addStatus === 'error' && <p className="form-status error" style={{ marginTop: '8px' }}>이미 존재하는 지점+플랫폼 조합입니다</p>}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
