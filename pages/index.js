// pages/index.js
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Tooltip, Legend, Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const PLATFORM_LABEL = { agoda: 'Agoda', airbnb: 'Airbnb' };
const PLATFORM_COLOR = { agoda: '#E84393', airbnb: '#FF5A5F' };

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

function today() { return new Date().toISOString().slice(0, 10); }
function fmt(v) { return v != null ? Number(v) : null; }
function fmtScore(v) { return v != null ? Number(v).toFixed(1) : '—'; }
function fmtCount(v) { return v != null ? Number(v).toLocaleString() : '—'; }

// ── Score Badge ─────────────────────────────────────
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

// ── Stat Card ────────────────────────────────────────
function StatCard({ label, value, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

// ── Review Form ──────────────────────────────────────
function ReviewForm({ property, onSaved }) {
  const isAirbnb = property.platform === 'airbnb';
  const fields = isAirbnb ? AIRBNB_FIELDS : AGODA_FIELDS;
  const maxScore = isAirbnb ? 5 : 10;

  const [form, setForm] = useState({ recorded_at: today(), review_count: '', overall_score: '', response_rate: '', cleanliness: '', facilities: '', location: '', service: '', value_for_money: '' });
  const [status, setStatus] = useState('idle'); // idle | loading | ok | error
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

  return (
    <form onSubmit={handleSubmit} className="review-form">
      <div className="form-row">
        <div className="form-field">
          <label>날짜</label>
          <input type="date" value={form.recorded_at} onChange={e => set('recorded_at', e.target.value)} required />
        </div>
        <div className="form-field">
          <label>누적 리뷰 수</label>
          <input type="number" placeholder={isAirbnb ? '예: 312' : '예: 8186'} value={form.review_count} onChange={e => set('review_count', e.target.value)} min="0" />
        </div>
        <div className="form-field">
          <label>종합 평점 <span className="required">*</span></label>
          <input type="number" placeholder={isAirbnb ? '예: 4.9' : '예: 8.6'} value={form.overall_score} onChange={e => set('overall_score', e.target.value)} step="0.1" min="0" max={maxScore} required />
        </div>
      </div>

      <div className="form-row">
        {fields.map(f => (
          <div className="form-field" key={f.key}>
            <label>{f.label}</label>
            <input
              type="number"
              placeholder={f.key === 'response_rate' ? '예: 98' : (isAirbnb ? '예: 4.8' : '예: 8.5')}
              value={form[f.key]}
              onChange={e => set(f.key, e.target.value)}
              step={f.key === 'response_rate' ? '1' : '0.1'}
              min="0"
              max={f.key === 'response_rate' ? 100 : maxScore}
            />
          </div>
        ))}
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={status === 'loading'}>
          {status === 'loading' ? '저장 중...' : '점수 저장'}
        </button>
        {status === 'ok' && <span className="form-status ok">✓ 저장되었습니다</span>}
        {status === 'error' && <span className="form-status error">✕ {errMsg}</span>}
      </div>
    </form>
  );
}

// ── Chart ────────────────────────────────────────────
function ReviewChart({ reviews, platform }) {
  const isAirbnb = platform === 'airbnb';
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

  if (!isAirbnb) {
    const extras = [
      { key: 'cleanliness', label: '청결', color: '#6366f1' },
      { key: 'service',     label: '서비스', color: '#22c55e' },
      { key: 'location',    label: '위치', color: '#f59e0b' },
    ];
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
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { font: { size: 12, family: 'Pretendard' }, boxWidth: 12, padding: 16 } },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: { grid: { color: '#f0f0f0' }, ticks: { font: { size: 11 }, maxRotation: 45 } },
      y: {
        min: isAirbnb ? 3 : 6,
        max: isAirbnb ? 5 : 10,
        ticks: { stepSize: isAirbnb ? 0.5 : 0.5, font: { size: 11 } },
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

// ── Review Count Chart ───────────────────────────────
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

// ── History Table ────────────────────────────────────
function HistoryTable({ reviews, platform, onDelete }) {
  const isAirbnb = platform === 'airbnb';
  const sorted = [...reviews].sort((a, b) => b.recorded_at.localeCompare(a.recorded_at));

  if (!sorted.length) return <p className="empty-msg">아직 기록이 없습니다</p>;

  return (
    <div className="table-wrap">
      <table className="history-table">
        <thead>
          <tr>
            <th>날짜</th>
            <th>리뷰 수</th>
            <th>종합</th>
            {!isAirbnb && <><th>청결</th><th>부대시설</th><th>서비스</th><th>가격만족</th><th>위치</th></>}
            {isAirbnb && <th>응답률</th>}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(r => (
            <tr key={r.id}>
              <td>{r.recorded_at?.slice(0, 10)}</td>
              <td>{fmtCount(r.review_count)}</td>
              <td><ScoreBadge value={r.overall_score} max={isAirbnb ? 5 : 10} /></td>
              {!isAirbnb && <>
                <td><ScoreBadge value={r.cleanliness} /></td>
                <td><ScoreBadge value={r.facilities} /></td>
                <td><ScoreBadge value={r.service} /></td>
                <td><ScoreBadge value={r.value_for_money} /></td>
                <td><ScoreBadge value={r.location} /></td>
              </>}
              {isAirbnb && <td>{r.response_rate != null ? `${r.response_rate}%` : '—'}</td>}
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

// ── Property Panel ───────────────────────────────────
function PropertyPanel({ property }) {
  const [reviews, setReviews] = useState([]);
  const [tab, setTab] = useState('dashboard'); // dashboard | input | history

  const load = async () => {
    const res = await fetch(`/api/reviews?property_id=${property.id}`);
    const data = await res.json();
    setReviews(data);
  };

  useEffect(() => { load(); }, [property.id]);

  const handleDelete = async (id) => {
    if (!confirm('이 기록을 삭제할까요?')) return;
    await fetch(`/api/reviews?id=${id}`, { method: 'DELETE' });
    load();
  };

  const isAirbnb = property.platform === 'airbnb';
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
        <div className="panel-tabs">
          {['dashboard', 'input', 'history'].map(t => (
            <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} style={tab === t ? { borderBottomColor: accent, color: accent } : {}} onClick={() => setTab(t)}>
              {{ dashboard: '대시보드', input: '점수 입력', history: '기록' }[t]}
            </button>
          ))}
        </div>
      </div>

      {tab === 'dashboard' && (
        <div className="panel-body">
          {latest ? (
            <>
              <div className="stats-grid">
                <StatCard label="종합 평점" value={<>{fmtScore(latest.overall_score)}{diffEl('overall_score')}</>} sub={`기준일: ${latest.recorded_at?.slice(0, 10)}`} />
                <StatCard label="누적 리뷰 수" value={fmtCount(latest.review_count)} />
                {!isAirbnb && <StatCard label="청결" value={<>{fmtScore(latest.cleanliness)}{diffEl('cleanliness')}</>} />}
                {!isAirbnb && <StatCard label="서비스" value={<>{fmtScore(latest.service)}{diffEl('service')}</>} />}
                {!isAirbnb && <StatCard label="위치" value={<>{fmtScore(latest.location)}{diffEl('location')}</>} />}
                {isAirbnb && <StatCard label="응답률" value={latest.response_rate != null ? `${latest.response_rate}%` : '—'} />}
                {!isAirbnb && <StatCard label="가격 만족도" value={<>{fmtScore(latest.value_for_money)}{diffEl('value_for_money')}</>} />}
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
          <ReviewForm property={property} onSaved={() => { load(); }} />
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

// ── Main Page ────────────────────────────────────────
export default function Home() {
  const [properties, setProperties] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPlatform, setNewPlatform] = useState('agoda');
  const [addStatus, setAddStatus] = useState('idle');

  useEffect(() => {
    fetch('/api/properties')
      .then(r => r.json())
      .then(data => { setProperties(data); if (data.length) setSelected(data[0]); });
  }, []);

  const addProperty = async (e) => {
    e.preventDefault();
    setAddStatus('loading');
    const res = await fetch('/api/properties', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName, platform: newPlatform }) });
    const data = await res.json();
    if (res.ok) {
      const updated = await fetch('/api/properties').then(r => r.json());
      setProperties(updated);
      setSelected(updated.find(p => p.id === data.id));
      setShowAddModal(false);
      setNewName('');
      setAddStatus('idle');
    } else {
      setAddStatus('error');
      setTimeout(() => setAddStatus('idle'), 2500);
    }
  };

  return (
    <>
      <Head>
        <title>맹그로브 OTA 리뷰 대시보드</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <div className="app">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <span className="logo-mark">OTA</span>
            <span className="logo-text">맹그로브 OTA 리뷰 대시보드</span>
          </div>

          <nav className="property-nav">
            <div className="nav-label">지점 목록</div>
            {properties.map(p => (
              <button
                key={p.id}
                className={`nav-item ${selected?.id === p.id ? 'active' : ''}`}
                onClick={() => setSelected(p)}
              >
                <span className="nav-dot" style={{ background: PLATFORM_COLOR[p.platform] }} />
                <span className="nav-name">{p.name}</span>
                <span className="nav-platform">{PLATFORM_LABEL[p.platform]}</span>
              </button>
            ))}
            <button className="nav-add" onClick={() => setShowAddModal(true)}>
              + 지점 추가
            </button>
          </nav>
        </aside>

        {/* Main content */}
        <main className="main">
          {selected ? (
            <PropertyPanel key={selected.id} property={selected} />
          ) : (
            <div className="empty-state full">
              <p>좌측에서 지점을 선택하세요</p>
            </div>
          )}
        </main>
      </div>

      {/* Add property modal */}
      {showAddModal && (
        <div className="modal-bg" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">지점 추가</h3>
            <form onSubmit={addProperty}>
              <div className="form-field" style={{ marginBottom: '12px' }}>
                <label>지점명</label>
                <input type="text" placeholder="예: 홍대 만그로브" value={newName} onChange={e => setNewName(e.target.value)} required />
              </div>
              <div className="form-field" style={{ marginBottom: '20px' }}>
                <label>플랫폼</label>
                <select value={newPlatform} onChange={e => setNewPlatform(e.target.value)}>
                  <option value="agoda">Agoda</option>
                  <option value="airbnb">Airbnb</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowAddModal(false)}>취소</button>
                <button type="submit" className="btn-primary" disabled={addStatus === 'loading'}>
                  {addStatus === 'loading' ? '추가 중...' : '추가'}
                </button>
              </div>
              {addStatus === 'error' && <p className="form-status error" style={{ marginTop: '8px' }}>이미 존재하는 지점입니다</p>}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
