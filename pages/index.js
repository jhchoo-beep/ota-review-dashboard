// pages/index.js
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, BarController,
  PointElement, LineElement, Tooltip, Legend, Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, BarController, PointElement, LineElement, Tooltip, Legend, Filler);

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


// -- OKR Dashboard (메인 웰컴 페이지)
function OKRDashboard({ properties }) {
  const [allReviews, setAllReviews] = useState({});
  const [superhostMap, setSuperhostMap] = useState({});
  const [loading, setLoading] = useState(true);

  const FIXED_ORDER = ['맹그로브 신설', '맹그로브 동대문', '맹그로브 고성', '맹그로브 제주시티'];
  const OTA_ORDER_LOCAL = {
    '맹그로브 신설':    ['agoda','airbnb','booking','tripcom','expedia','nol','yeogieottae','metasearch'],
    '맹그로브 동대문':  ['agoda','airbnb','booking','tripcom','expedia','nol','yeogieottae','metasearch'],
    '맹그로브 고성':    ['agoda','airbnb','nol','metasearch'],
    '맹그로브 제주시티':['agoda','airbnb','booking','tripcom','expedia','nol','yeogieottae','metasearch'],
  };

  // 목표 점수
  const getTarget = (platform) => ['airbnb','nol'].includes(platform) ? 4.5 : 9.0;
  const getMax = (platform) => ['airbnb','nol'].includes(platform) ? 5 : 10;

  useEffect(() => {
    if (!properties.length) return;
    (async () => {
      // 최적화: 28번 순차 요청 → 병렬 2번 요청으로 단축
      // /api/reviews/latest: DISTINCT ON SQL 1번으로 전체 최신 리뷰 반환
      // /api/superhost: Airbnb 지점만 필터링해서 병렬 요청
      const airbnbIds = properties.filter(p => p.platform === 'airbnb').map(p => p.id);

      const [reviewMap, ...shResults] = await Promise.all([
        fetch('/api/reviews/latest').then(x => x.json()),
        ...airbnbIds.map(id =>
          fetch(`/api/superhost?property_id=${id}`)
            .then(x => x.json())
            .then(data => ({ id, record: Array.isArray(data) ? data[0] : null }))
        ),
      ]);

      const shMap = {};
      for (const { id, record } of shResults) {
        shMap[id] = record;
      }

      setAllReviews(reviewMap);
      setSuperhostMap(shMap);
      setLoading(false);
    })();
  }, [properties]);

  // 지점별 그룹화
  const grouped = {};
  properties.forEach(p => {
    if (!grouped[p.name]) grouped[p.name] = [];
    grouped[p.name].push(p);
  });

  // OKR 전체 달성률 계산
  const calcProgress = () => {
    let total = 0, achieved = 0;
    Object.entries(grouped).forEach(([name, items]) => {
      items.forEach(p => {
        if (p.platform === 'metasearch') return;
        total++;
        const rev = allReviews[p.id];
        if (!rev) return;
        if (p.platform === 'airbnb') {
          const sh = superhostMap[p.id];
          if (sh?.achieved) achieved++;
        } else {
          const score = parseFloat(rev.overall_score);
          if (score >= getTarget(p.platform)) achieved++;
        }
      });
    });
    return total > 0 ? Math.round((achieved / total) * 100) : 0;
  };

  const progress = loading ? 0 : calcProgress();

  const getScoreStatus = (platform, rev) => {
    if (platform === 'metasearch') {
      const g = parseFloat(rev?.google_score);
      const k = parseFloat(rev?.kakao_score);
      const gOk = !isNaN(g) && g >= 4.5;
      const kOk = !isNaN(k) && k >= 4.5;
      if (!rev) return 'none';
      if (gOk && kOk) return 'achieved';
      return 'progress';
    }
    const score = parseFloat(rev?.overall_score);
    if (isNaN(score)) return 'none';
    const target = getTarget(platform);
    if (score >= target) return 'achieved';
    return 'progress';
  };

  const STATUS_COLOR = { achieved: '#0F6E56', progress: '#BA7517', none: '#888780' };
  const STATUS_BG = { achieved: '#E1F5EE', progress: '#FAEEDA', none: '#F1EFE8' };
  const STATUS_LABEL = { achieved: '달성', progress: '진행 중', none: '미입력' };

  const fmtScore = (v) => v != null ? Number(v).toFixed(1) : '—';

  return (
    <div className="okr-page">
      {/* 헤더 */}
      <div className="okr-header">
        <div>
          <div className="okr-tag">2026 상반기 OKR</div>
          <h1 className="okr-title">OKR Tracker</h1>
          <p className="okr-subtitle">즉시 실행 가능한 아이템을 도출·실행하여 상반기까지 모든 OTA 리뷰 앞자리를 9로 만든다</p>
        </div>
        {!loading && (
          <div className="okr-progress-wrap">
            <div className="okr-progress-label">전체 달성률</div>
            <div className="okr-progress-circle">
              <svg viewBox="0 0 80 80" width="80" height="80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="var(--border)" strokeWidth="7"/>
                <circle cx="40" cy="40" r="34" fill="none"
                  stroke={progress >= 80 ? '#0F6E56' : progress >= 50 ? '#BA7517' : '#E24B4A'}
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress / 100)}`}
                  transform="rotate(-90 40 40)"
                />
              </svg>
              <span className="okr-progress-pct">{progress}%</span>
            </div>
          </div>
        )}
      </div>

      {/* 범례 */}
      <div className="okr-legend">
        {Object.entries(STATUS_LABEL).map(([k, v]) => (
          <span key={k} className="okr-legend-item">
            <span className="okr-legend-dot" style={{ background: STATUS_COLOR[k] }} />
            {v}
          </span>
        ))}
        <span className="okr-legend-item">
          <span className="okr-legend-dot" style={{ background: '#6366f1' }} />
          슈퍼호스트 (Airbnb)
        </span>
      </div>

      {/* 목표 기준 안내 */}
      <div className="okr-targets">
        <span className="okr-target-chip">10점 만점 OTA 목표: <strong>9.0</strong></span>
        <span className="okr-target-chip">5점 만점 OTA 목표: <strong>4.5</strong></span>
        <span className="okr-target-chip">Airbnb 목표: <strong>슈퍼호스트 달성</strong></span>
      </div>

      {/* 지점별 카드 */}
      {loading ? (
        <div className="okr-loading">데이터 불러오는 중...</div>
      ) : (
        <div className="okr-grid">
          {FIXED_ORDER.filter(name => grouped[name]).map(name => {
            const items = grouped[name];
            const order = OTA_ORDER_LOCAL[name] || [];
            const sorted = [...items].sort((a, b) => {
              const ai = order.indexOf(a.platform), bi = order.indexOf(b.platform);
              return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
            });

            // 지점 달성률
            const propTotal = sorted.filter(p => p.platform !== 'metasearch').length;
            const propAchieved = sorted.filter(p => {
              if (p.platform === 'metasearch') return false;
              const rev = allReviews[p.id];
              if (!rev) return false;
              if (p.platform === 'airbnb') return superhostMap[p.id]?.achieved;
              return parseFloat(rev.overall_score) >= getTarget(p.platform);
            }).length;

            return (
              <div key={name} className="okr-card">
                {(() => {
                  const allDone = propAchieved === propTotal;
                  const ratioColor = allDone ? '#0F6E56' : '#E24B4A';
                  const ratioBg = allDone ? '#E1F5EE' : '#FCEBEB';
                  const barColor = allDone ? '#0F6E56' : '#E24B4A';
                  const pct = propTotal > 0 ? (propAchieved / propTotal) * 100 : 0;
                  return (
                    <>
                      <div className="okr-card-header">
                        <span className="okr-card-name">{name}</span>
                        <span className="okr-card-ratio-badge" style={{ background: ratioBg, color: ratioColor }}>
                          {propAchieved}/{propTotal} {allDone ? '✓' : ''}
                        </span>
                      </div>
                      <div className="okr-card-bar-wrap">
                        <div className="okr-card-bar">
                          <div className="okr-card-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
                        </div>
                        <span className="okr-card-bar-pct" style={{ color: ratioColor }}>{Math.round(pct)}%</span>
                      </div>
                    </>
                  );
                })()}

                <div className="okr-ota-list">
                  {sorted.map(p => {
                    const rev = allReviews[p.id];
                    const accent = PLATFORM_COLOR[p.platform];

                    // Airbnb: 슈퍼호스트
                    if (p.platform === 'airbnb') {
                      const sh = superhostMap[p.id];
                      const shStatus = sh ? (sh.achieved ? 'achieved' : 'behind') : 'none';
                      return (
                        <div key={p.id} className="okr-ota-row">
                          <span className="okr-ota-dot" style={{ background: accent }} />
                          <span className="okr-ota-name">{PLATFORM_LABEL[p.platform]}</span>
                          <span className="okr-ota-score" style={{ color: accent }}>
                            {rev ? `${fmtScore(rev.overall_score)}/5` : '—'}
                          </span>
                          <span className="okr-ota-badge" style={{
                            background: '#6366f111', color: sh ? (sh.achieved ? '#0F6E56' : '#A32D2D') : '#888780',
                            border: `1px solid ${sh ? (sh.achieved ? '#9FE1CB' : '#F7C1C1') : '#D3D1C7'}`
                          }}>
                            {sh ? (sh.achieved ? '슈퍼호스트 ✓' : '슈퍼호스트 ✕') : '미입력'}
                          </span>
                        </div>
                      );
                    }

                    // Meta-Search
                    if (p.platform === 'metasearch') {
                      const g = parseFloat(rev?.google_score);
                      const k = parseFloat(rev?.kakao_score);
                      return (
                        <div key={p.id} className="okr-ota-row okr-ota-meta">
                          <span className="okr-ota-dot" style={{ background: accent }} />
                          <span className="okr-ota-name">Meta-Search</span>
                          <span className="okr-ota-score" style={{ color: accent, fontSize: '11px' }}>
                            Google {isNaN(g) ? '—' : g.toFixed(1)} / Kakao {isNaN(k) ? '—' : k.toFixed(1)}
                          </span>
                          <span className="okr-ota-ref">참고</span>
                        </div>
                      );
                    }

                    // 일반 OTA
                    const score = parseFloat(rev?.overall_score);
                    const target = getTarget(p.platform);
                    const max = getMax(p.platform);
                    const status = getScoreStatus(p.platform, rev);
                    const pct = !isNaN(score) ? Math.min((score / max) * 100, 100) : 0;
                    const targetPct = (target / max) * 100;

                    return (
                      <div key={p.id} className="okr-ota-row">
                        <span className="okr-ota-dot" style={{ background: accent }} />
                        <span className="okr-ota-name">{PLATFORM_LABEL[p.platform]}</span>
                        <div className="okr-mini-bar-wrap">
                          <div className="okr-mini-bar">
                            <div className="okr-mini-bar-fill" style={{
                              width: `${pct}%`,
                              background: STATUS_COLOR[status]
                            }} />
                            <div className="okr-mini-bar-target" style={{ left: `${targetPct}%` }} />
                          </div>
                        </div>
                        <span className="okr-ota-score" style={{ color: STATUS_COLOR[status] }}>
                          {rev ? `${fmtScore(rev.overall_score)}/${max}` : '—'}
                        </span>
                        <span className="okr-status-dot" style={{ background: STATUS_BG[status], color: STATUS_COLOR[status] }}>
                          {STATUS_LABEL[status]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="okr-hint">← 좌측에서 지점·OTA를 선택하면 상세 점수와 추이를 확인할 수 있습니다</p>
    </div>
  );
}


// -- Agoda 분석 차트 컴포넌트들

// 차트 ②: 리뷰 작성률 Bar + 목표 기준선
function AgodaRateChart({ labels, rates }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current || !labels.length) return;
    const ctx = canvasRef.current.getContext('2d');
    if (canvasRef.current.__chart) canvasRef.current.__chart.destroy();
    canvasRef.current.__chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '리뷰 작성률 (%)',
          data: rates,
          backgroundColor: 'rgba(232,67,147,0.25)',
          borderColor: '#E84393',
          borderWidth: 2,
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          annotation: {
            annotations: {
              target: {
                type: 'line', yMin: 20, yMax: 20,
                borderColor: '#E84393', borderWidth: 2,
                borderDash: [6, 4],
                label: { display: true, content: '목표 20%', position: 'end', color: '#E84393', font: { size: 11 } }
              }
            }
          },
          tooltip: {
            callbacks: { label: ctx => `${ctx.parsed.y}%` }
          }
        },
        scales: {
          y: {
            beginAtZero: true, max: 100,
            ticks: { callback: v => `${v}%` },
            grid: { color: 'rgba(128,128,128,0.1)' }
          },
          x: { grid: { display: false } }
        }
      }
    });
    return () => { try { if (canvasRef.current?.__chart) { canvasRef.current.__chart.destroy(); canvasRef.current.__chart = null; } } catch(e) {} };
  }, [labels, rates]);
  return <div style={{position:'relative', height:'220px'}}><canvas ref={canvasRef} /></div>;
}

// 차트 ③: 점수 분포 — 저점수 비율 변화 (Bar + Line 증감)
function AgodaDistChart({ labels, weekly }) {
  const canvasRef = useRef(null);
  const [focusScore, setFocusScore] = useState(null); // null = 전체, 1~4 = 저점수

  useEffect(() => {
    if (!canvasRef.current || !labels.length) return;
    const ctx = canvasRef.current.getContext('2d');
    if (canvasRef.current.__chart) canvasRef.current.__chart.destroy();

    // 선택된 점수대 비율 계산
    const scores = focusScore ? [focusScore] : [1, 2, 3, 4]; // 기본: 저점수(1~4)
    const totals = weekly.map(w => [1,2,3,4,5,6,7,8,9,10].reduce((s,i) => s + (parseInt(w[`score_${i}`])||0), 0));
    const ratioData = weekly.map((w, idx) => {
      const total = totals[idx];
      if (!total) return 0;
      const cnt = scores.reduce((s, sc) => s + (parseInt(w[`score_${sc}`])||0), 0);
      return parseFloat(((cnt / total) * 100).toFixed(1));
    });

    // 전주 대비 증감
    const deltaData = ratioData.map((v, i) => i === 0 ? null : parseFloat((v - ratioData[i-1]).toFixed(1)));
    const deltaColors = deltaData.map(d => d === null ? 'transparent' : d > 0 ? '#E24B4A' : '#0F6E56');

    canvasRef.current.__chart = new Chart(ctx, {
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: `${focusScore ? focusScore+'점' : '1~4점'} 비율 (%)`,
            data: ratioData,
            backgroundColor: 'rgba(232,67,147,0.2)',
            borderColor: '#E84393',
            borderWidth: 2,
            borderRadius: 4,
            yAxisID: 'y',
          },
          {
            type: 'line',
            label: '전주 대비 증감(%p)',
            data: deltaData,
            borderColor: '#888780',
            pointBackgroundColor: deltaData.map(d => d === null ? 'rgba(0,0,0,0)' : d > 0 ? '#E24B4A' : '#0F6E56'),
            pointBorderColor: deltaData.map(d => d === null ? 'rgba(0,0,0,0)' : d > 0 ? '#E24B4A' : '#0F6E56'),
            pointRadius: deltaData.map(d => d === null ? 0 : 5),
            borderWidth: 1.5,
            borderDash: [3, 3],
            yAxisID: 'y2',
            tension: 0.3,
          }
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top', labels: { font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: ctx => ctx.datasetIndex === 0
                ? `비율: ${ctx.parsed.y}%`
                : `증감: ${ctx.parsed.y > 0 ? '+' : ''}${ctx.parsed.y}%p`
            }
          }
        },
        scales: {
          y: { beginAtZero: true, position: 'left', ticks: { callback: v => `${v}%` }, grid: { color: 'rgba(128,128,128,0.1)' } },
          y2: { position: 'right', grid: { display: false }, ticks: { callback: v => `${v > 0 ? '+' : ''}${v}%p` } },
          x: { grid: { display: false } }
        }
      }
    });
    return () => { try { if (canvasRef.current?.__chart) { canvasRef.current.__chart.destroy(); canvasRef.current.__chart = null; } } catch(e) {} };
  }, [labels, weekly, focusScore]);

  return (
    <div>
      <div className="ag-score-filter">
        {[null,1,2,3,4].map(s => (
          <button key={String(s)} className={`ag-score-chip${focusScore === s ? ' active' : ''}`} onClick={() => setFocusScore(s)}>
            {s === null ? '저점수(1~4점)' : `${s}점`}
          </button>
        ))}
      </div>
      <div style={{position:'relative', height:'220px'}}><canvas ref={canvasRef} /></div>
    </div>
  );
}

// 차트 ④: 불만 건수 추이 (Line + 기준선)
function AgodaComplaintsChart({ labels, room, bath, baselineRoom, baselineBath, memos }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current || !labels.length) return;
    const ctx = canvasRef.current.getContext('2d');
    if (canvasRef.current.__chart) canvasRef.current.__chart.destroy();

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
      },
    ];

    if (baselineRoom != null) {
      datasets.push({
        label: `객실 기준선 (${baselineRoom}건)`,
        data: Array(labels.length).fill(baselineRoom),
        borderColor: '#E84393',
        borderWidth: 1.5,
        borderDash: [6, 4],
        pointRadius: 0,
        fill: false,
      });
    }
    if (baselineBath != null) {
      datasets.push({
        label: `욕실 기준선 (${baselineBath}건)`,
        data: Array(labels.length).fill(baselineBath),
        borderColor: '#1F72B8',
        borderWidth: 1.5,
        borderDash: [6, 4],
        pointRadius: 0,
        fill: false,
      });
    }

    canvasRef.current.__chart = new Chart(ctx, {
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
                return memos[idx] ? [`메모: ${memos[idx]}`] : [];
              }
            }
          }
        },
        scales: {
          y: { beginAtZero: true, ticks: { callback: v => `${v}건` }, grid: { color: 'rgba(128,128,128,0.1)' } },
          x: { grid: { display: false } }
        }
      }
    });
    return () => { if (canvasRef.current?.__chart) canvasRef.current.__chart.destroy(); };
  }, [labels, room, bath, baselineRoom, baselineBath]);

  return (
    <div>
      <div style={{position:'relative', height:'220px'}}><canvas ref={canvasRef} /></div>
      {memos.some(m => m) && (
        <div className="ag-memo-list">
          {labels.map((l, i) => memos[i] ? (
            <div key={l} className="ag-memo-item">
              <span className="ag-memo-week">{l}</span>
              <span className="ag-memo-text">{memos[i]}</span>
            </div>
          ) : null)}
        </div>
      )}
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

  // Agoda 분석 탭 상태
  const [agodaWeekly, setAgodaWeekly] = useState([]);
  const [agodaComplaints, setAgodaComplaints] = useState([]);
  const [awForm, setAwForm] = useState({
    week_start: '', review_count: '', checkout_count: '',
    score_1:'', score_2:'', score_3:'', score_4:'', score_5:'',
    score_6:'', score_7:'', score_8:'', score_9:'', score_10:''
  });
  const [acForm, setAcForm] = useState({ week_start: '', room_complaints: '', bathroom_complaints: '', memo: '' });
  const [awStatus, setAwStatus] = useState('idle');
  const [acStatus, setAcStatus] = useState('idle');
  const [agodaInputSection, setAgodaInputSection] = useState('weekly'); // 'weekly' | 'complaints'

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

  const loadAgoda = async () => {
    const [w, c] = await Promise.all([
      fetch(`/api/agoda-weekly?property_id=${property.id}`).then(r => r.json()),
      fetch(`/api/agoda-complaints?property_id=${property.id}`).then(r => r.json()),
    ]);
    setAgodaWeekly(Array.isArray(w) ? w : []);
    setAgodaComplaints(Array.isArray(c) ? c : []);
  };

  const saveAgodaWeekly = async (e) => {
    e.preventDefault();
    setAwStatus('loading');
    const res = await fetch('/api/agoda-weekly', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ property_id: property.id, ...awForm }),
    });
    if (res.ok) {
      setAwStatus('ok');
      setAwForm({ week_start:'', review_count:'', checkout_count:'',
        score_1:'',score_2:'',score_3:'',score_4:'',score_5:'',
        score_6:'',score_7:'',score_8:'',score_9:'',score_10:'' });
      loadAgoda();
      setTimeout(() => setAwStatus('idle'), 2000);
    } else { setAwStatus('error'); setTimeout(() => setAwStatus('idle'), 2000); }
  };

  const saveAgodaComplaints = async (e) => {
    e.preventDefault();
    setAcStatus('loading');
    const res = await fetch('/api/agoda-complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ property_id: property.id, ...acForm }),
    });
    if (res.ok) {
      setAcStatus('ok');
      setAcForm({ week_start:'', room_complaints:'', bathroom_complaints:'', memo:'' });
      loadAgoda();
      setTimeout(() => setAcStatus('idle'), 2000);
    } else { setAcStatus('error'); setTimeout(() => setAcStatus('idle'), 2000); }
  };

  const deleteAgodaWeekly = async (id) => {
    if (!confirm('삭제할까요?')) return;
    await fetch(`/api/agoda-weekly?id=${id}`, { method: 'DELETE' });
    loadAgoda();
  };

  const deleteAgodaComplaints = async (id) => {
    if (!confirm('삭제할까요?')) return;
    await fetch(`/api/agoda-complaints?id=${id}`, { method: 'DELETE' });
    loadAgoda();
  };

  useEffect(() => {
    load();
    if (property.platform === 'airbnb') loadSuperhost();
    if (property.platform === 'agoda') loadAgoda();
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

  const isAgoda = property.platform === 'agoda';
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
            {(isAirbnb ? ['dashboard', 'superhost', 'history'] : isAgoda ? ['dashboard', 'agoda-analysis', 'history'] : ['dashboard', 'history']).map(t => (
              <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} style={tab === t ? { borderBottomColor: accent, color: accent } : {}} onClick={() => setTab(t)}>
                {{ dashboard: '대시보드', superhost: '슈퍼호스트', 'agoda-analysis': 'Agoda 분석', history: '기록' }[t]}
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
          )}
          {tab === 'agoda-analysis' && isAgoda && (
            <button
              type="submit"
              form={agodaInputSection === 'weekly' ? 'aw-form' : 'ac-form'}
              className="btn-input"
              style={{ background: accent, color: '#fff', borderColor: accent, marginLeft: '8px' }}
            >
              데이터 저장
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

                    {/* Airbnb 슈퍼호스트 상태 배너 */}
                    {isAirbnb && (() => {
                      const sh = superhostRecords[0];
                      const achieved = sh?.achieved;
                      const hasRecord = !!sh;
                      return (
                        <div
                          onClick={() => setTab('superhost')}
                          className="sh-dashboard-banner"
                          style={{
                            background: hasRecord ? (achieved ? '#E1F5EE' : '#FCEBEB') : 'var(--bg)',
                            border: `1px solid ${hasRecord ? (achieved ? '#9FE1CB' : '#F7C1C1') : 'var(--border)'}`,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="sh-dashboard-dot" style={{ background: hasRecord ? (achieved ? '#0F6E56' : '#E24B4A') : 'var(--text-3)' }} />
                            <span className="sh-dashboard-label" style={{ color: hasRecord ? (achieved ? '#085041' : '#791F1F') : 'var(--text-2)' }}>
                              슈퍼호스트 {hasRecord ? (achieved ? '달성' : '미달성') : '기록 없음'}
                            </span>
                            {sh && (
                              <span className="sh-dashboard-period" style={{ color: hasRecord ? (achieved ? '#0F6E56' : '#A32D2D') : 'var(--text-3)' }}>
                                {sh.period_start?.slice(0,7).replace('-','.')} ~ {sh.period_end?.slice(0,7).replace('-','.')}
                              </span>
                            )}
                          </div>
                          <span className="sh-dashboard-arrow" style={{ color: hasRecord ? (achieved ? '#0F6E56' : '#A32D2D') : 'var(--text-3)' }}>
                            상세 보기 →
                          </span>
                        </div>
                      );
                    })()}

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

      {/* Agoda 분석 탭 */}
      {tab === 'agoda-analysis' && isAgoda && (
        <div className="panel-body">

          {/* 입력 섹션 토글 */}
          <div className="ag-input-toggle">
            <button className={`ag-toggle-btn${agodaInputSection === 'weekly' ? ' active' : ''}`} onClick={() => setAgodaInputSection('weekly')}>리뷰 작성률 / 점수 분포 입력</button>
            <button className={`ag-toggle-btn${agodaInputSection === 'complaints' ? ' active' : ''}`} onClick={() => setAgodaInputSection('complaints')}>불만 건수 입력</button>
          </div>

          {/* 리뷰 작성률 + 점수 분포 입력 폼 */}
          {agodaInputSection === 'weekly' && (
            <form id="aw-form" onSubmit={saveAgodaWeekly} className="review-form ag-form">
              <div className="form-row">
                <div className="form-field">
                  <label>주차 시작일 (월요일)</label>
                  <input type="date" value={awForm.week_start} onChange={e => setAwForm(f => ({...f, week_start: e.target.value}))} required />
                </div>
                <div className="form-field">
                  <label>리뷰 제출 건수</label>
                  <input type="number" min="0" placeholder="예: 12" value={awForm.review_count} onChange={e => setAwForm(f => ({...f, review_count: e.target.value}))} />
                </div>
                <div className="form-field">
                  <label>아고다 체크아웃 수</label>
                  <input type="number" min="0" placeholder="예: 80" value={awForm.checkout_count} onChange={e => setAwForm(f => ({...f, checkout_count: e.target.value}))} />
                </div>
              </div>
              <div className="ag-section-label">점수대별 건수 (1점 ~ 10점)</div>
              <div className="form-row ag-score-row">
                {[1,2,3,4,5,6,7,8,9,10].map(s => (
                  <div key={s} className="form-field ag-score-field">
                    <label>{s}점</label>
                    <input type="number" min="0" placeholder="0"
                      value={awForm[`score_${s}`]}
                      onChange={e => setAwForm(f => ({...f, [`score_${s}`]: e.target.value}))} />
                  </div>
                ))}
              </div>
              {awStatus === 'ok' && <p className="form-status ok">✓ 저장되었습니다</p>}
              {awStatus === 'error' && <p className="form-status error">✕ 저장 실패</p>}
            </form>
          )}

          {/* 불만 건수 입력 폼 */}
          {agodaInputSection === 'complaints' && (
            <form id="ac-form" onSubmit={saveAgodaComplaints} className="review-form ag-form">
              <div className="form-row">
                <div className="form-field">
                  <label>주차 시작일 (월요일)</label>
                  <input type="date" value={acForm.week_start} onChange={e => setAcForm(f => ({...f, week_start: e.target.value}))} required />
                </div>
                <div className="form-field">
                  <label>객실 정비 불만 건수</label>
                  <input type="number" min="0" placeholder="예: 3" value={acForm.room_complaints} onChange={e => setAcForm(f => ({...f, room_complaints: e.target.value}))} />
                </div>
                <div className="form-field">
                  <label>욕실 청결 불만 건수</label>
                  <input type="number" min="0" placeholder="예: 2" value={acForm.bathroom_complaints} onChange={e => setAcForm(f => ({...f, bathroom_complaints: e.target.value}))} />
                </div>
                <div className="form-field" style={{flex: '2'}}>
                  <label>운영 메모 (조치 내용 등)</label>
                  <input type="text" placeholder="예: 청소 업체 변경, 체크리스트 강화" value={acForm.memo} onChange={e => setAcForm(f => ({...f, memo: e.target.value}))} />
                </div>
              </div>
              {acStatus === 'ok' && <p className="form-status ok">✓ 저장되었습니다</p>}
              {acStatus === 'error' && <p className="form-status error">✕ 저장 실패</p>}
            </form>
          )}

          {agodaWeekly.length === 0 && agodaComplaints.length === 0 ? (
            <div className="empty-state" style={{marginTop:'32px'}}>
              <p>아직 입력된 데이터가 없습니다</p>
              <p style={{fontSize:'13px', color:'var(--text-3)'}}>위 폼에서 주간 데이터를 입력해주세요</p>
            </div>
          ) : (
            <>
              {/* 차트 ②: 리뷰 작성률 */}
              {agodaWeekly.length > 0 && (() => {
                const labels = agodaWeekly.map(w => w.week_start?.slice(0,10));
                const rates = agodaWeekly.map(w =>
                  w.checkout_count > 0 ? parseFloat(((w.review_count / w.checkout_count) * 100).toFixed(1)) : null
                );
                return (
                  <div className="chart-section">
                    <h3 className="section-title">② 리뷰 작성률 (주별)</h3>
                    <p className="ag-chart-desc">리뷰 제출 건수 / 체크아웃 수 × 100</p>
                    <AgodaRateChart labels={labels} rates={rates} />
                    <div className="ag-data-table">
                      <table className="history-table">
                        <thead><tr><th>주차</th><th>리뷰 수</th><th>체크아웃</th><th>작성률</th><th></th></tr></thead>
                        <tbody>
                          {[...agodaWeekly].reverse().map(w => (
                            <tr key={w.id}>
                              <td>{w.week_start?.slice(0,10)}</td>
                              <td>{w.review_count ?? '—'}</td>
                              <td>{w.checkout_count ?? '—'}</td>
                              <td style={{fontWeight:500}}>
                                {w.checkout_count > 0 ? `${((w.review_count/w.checkout_count)*100).toFixed(1)}%` : '—'}
                              </td>
                              <td><button className="delete-btn" onClick={() => deleteAgodaWeekly(w.id)}>×</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* 차트 ③: 점수 분포 */}
              {agodaWeekly.length > 0 && (() => {
                const labels = agodaWeekly.map(w => w.week_start?.slice(0,10));
                return (
                  <div className="chart-section" style={{marginTop:'28px'}}>
                    <h3 className="section-title">③ 점수 분포 — 저점수 비율 변화</h3>
                    <p className="ag-chart-desc">각 점수대(1~10점)의 주별 비율(%) 및 전주 대비 증감(%p)</p>
                    <AgodaDistChart labels={labels} weekly={agodaWeekly} />
                  </div>
                );
              })()}

              {/* 차트 ④: 불만 건수 */}
              {agodaComplaints.length > 0 && (() => {
                const labels = agodaComplaints.map(c => c.week_start?.slice(0,10));
                const room = agodaComplaints.map(c => c.room_complaints ?? 0);
                const bath = agodaComplaints.map(c => c.bathroom_complaints ?? 0);
                // 기준선: 1~2월 데이터 평균
                const baseline = agodaComplaints.filter(c => {
                  const m = parseInt(c.week_start?.slice(5,7));
                  return m === 1 || m === 2;
                });
                const baselineRoom = baseline.length > 0
                  ? Math.round(baseline.reduce((s,c) => s + (c.room_complaints||0), 0) / baseline.length * 10) / 10
                  : null;
                const baselineBath = baseline.length > 0
                  ? Math.round(baseline.reduce((s,c) => s + (c.bathroom_complaints||0), 0) / baseline.length * 10) / 10
                  : null;
                const memos = agodaComplaints.map(c => c.memo);
                return (
                  <div className="chart-section" style={{marginTop:'28px'}}>
                    <h3 className="section-title">④ 객실 정비 / 욕실 청결 불만 건수 추이</h3>
                    <p className="ag-chart-desc">
                      점선: 1~2월 평균 기준선
                      {baselineRoom != null && ` (객실 ${baselineRoom}건 / 욕실 ${baselineBath}건)`}
                    </p>
                    <AgodaComplaintsChart
                      labels={labels} room={room} bath={bath}
                      baselineRoom={baselineRoom} baselineBath={baselineBath}
                      memos={memos}
                    />
                    <div className="ag-data-table">
                      <table className="history-table">
                        <thead><tr><th>주차</th><th>객실 정비</th><th>욕실 청결</th><th>메모</th><th></th></tr></thead>
                        <tbody>
                          {[...agodaComplaints].reverse().map(c => (
                            <tr key={c.id}>
                              <td>{c.week_start?.slice(0,10)}</td>
                              <td>{c.room_complaints ?? 0}건</td>
                              <td>{c.bathroom_complaints ?? 0}건</td>
                              <td style={{fontSize:'12px', color:'var(--text-2)'}}>{c.memo || '—'}</td>
                              <td><button className="delete-btn" onClick={() => deleteAgodaComplaints(c.id)}>×</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
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
  const [showOKR, setShowOKR] = useState(false);

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

            <button
              className={`nav-okr-btn${showOKR ? ' active' : ''}`}
              onClick={() => { setShowOKR(true); setSelected(null); setSidebarOpen(false); }}
            >
              <span className="nav-okr-icon">◎</span>
              OKR Tracker
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
                    className={`nav-item ${selected?.id === p.id && !showOKR ? 'active' : ''} ${grp.items.length > 1 ? 'indented' : ''}`}
                    onClick={() => { setSelected(p); setShowOKR(false); setSidebarOpen(false); }}
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
          {selected && !showOKR ? (
            <PropertyPanel key={selected.id} property={selected} />
          ) : (
            <OKRDashboard properties={properties} />
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
