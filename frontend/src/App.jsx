import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown'; 

const TAIWAN_CITIES = [
  "臺北市", "新北市", "桃園市", "臺中市", "臺南市", "高雄市",
  "基隆市", "新竹市", "嘉義市", "新竹縣", "苗栗縣", "彰化縣",
  "南投縣", "雲林縣", "嘉義縣", "屏東縣", "宜蘭縣", "花蓮縣",
  "臺東縣", "澎湖縣", "金門縣", "連江縣"
];

const PREFERENCE_TAGS = [
  "戶外風景", "室內逛街", "室外逛街", "遊樂園", "人煙稀少的區域",
  "在地美食/夜市", "歷史古蹟/文化", "網美打卡/拍照", "親子友善/放電", "長輩輕鬆走/無障礙"
];

function App() {
  const [formData, setFormData] = useState({
    cities: ['臺北市'],
    days: 3,
    group_size: '2-4人',
    tags: []
  });

  const [step, setStep] = useState(0); 
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(''); 
  
  const [userNeed, setUserNeed] = useState('');
  const [spotsRecommendation, setSpotsRecommendation] = useState('');
  const [accumulatedSpots, setAccumulatedSpots] = useState('');
  const [apiMsg, setApiMsg] = useState(''); 
  const [userChoice, setUserChoice] = useState('');
  const [finalItinerary, setFinalItinerary] = useState('');

  const resultEndRef = useRef(null);

  const scrollToBottom = () => {
    resultEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!loading) scrollToBottom();
  }, [spotsRecommendation, finalItinerary, loading, apiMsg]);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Enter') {
        if (document.activeElement && document.activeElement.tagName === 'INPUT' && document.activeElement.type === 'text') {
          return;
        }
        if (step === 0) { e.preventDefault(); setStep(1); }
        else if (step === 1) { e.preventDefault(); setStep(2); }
        else if (step === 2) { e.preventDefault(); handleRecommendSpots(); }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [step, formData]);

  const handleCheckboxChange = (field, value) => {
    const currentList = [...formData[field]];
    if (currentList.includes(value)) {
      if (field === 'cities' && currentList.length === 1) return; 
      setFormData({ ...formData, [field]: currentList.filter(item => item !== value) });
    } else {
      setFormData({ ...formData, [field]: [...currentList, value] });
    }
  };

  const handleRecommendSpots = async () => {
    if (formData.cities.length === 0) return alert("請至少選擇一個城市！");
    setLoading(true);
    setErrorMsg('');
    setStep(3); 
    try {
      const response = await axios.post('http://localhost:8000/api/v1/recommend-spots', {
        ...formData,
        city: formData.cities.join(','),
        accumulated_spots: "" 
      });
      setUserNeed(response.data.user_need);
      setSpotsRecommendation(response.data.spots_recommendation);
      setAccumulatedSpots(response.data.accumulated_spots);
      setApiMsg("請看下方海選景點。請在輸入框告訴我你想去哪些（或不想去哪些），最後輸入『確定排行程』！");
    } catch (error) {
      console.error(error);
      setErrorMsg("景點海選連線失敗，請確認後端 Python 服務是否正常啟動。");
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeSelection = async (e) => {
    if (e) e.preventDefault(); 
    if (!userChoice.trim() || loading) return;

    setLoading(true);
    setErrorMsg('');
    try {
      const response = await axios.post('http://localhost:8000/api/v1/analyze-selection', {
        user_choice: userChoice,
        spots_recommendation: spotsRecommendation,
        accumulated_spots: accumulatedSpots,
        user_need: userNeed
      });

      setAccumulatedSpots(response.data.accumulated_spots);
      setApiMsg(response.data.msg);
      setUserChoice(''); 

      if (response.data.status === "READY") {
        handleGenerateFinal(response.data.accumulated_spots);
      }
    } catch (error) {
      console.error(error);
      setErrorMsg("分析選擇失敗，請重試。");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFinal = async (currentAccumulated) => {
    setLoading(true);
    setErrorMsg('');
    setStep(4); 
    try {
      const response = await axios.post('http://localhost:8000/api/v1/generate-final', {
        accumulated_spots: currentAccumulated || accumulatedSpots,
        user_need: userNeed
      });
      setFinalItinerary(response.data.final_itinerary);
    } catch (error) {
      console.error(error);
      setErrorMsg("最終行程表生成失敗。");
      setStep(3);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <header style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '32px', letterSpacing: '1px', background: 'linear-gradient(to right, #00c6ff, #007bff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>🧭 智遊台灣 Smart Tour</h1>
        <p style={{ color: '#888', margin: '0', fontSize: '14px' }}>AI 驅動的 5 步驟結構化智慧排程引擎</p>
      </header>
      
      {/* 頂部進度條 */}
      <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontSize: '13px', color: '#00c6ff', fontWeight: 'bold' }}>PROGRESS</span>
        <span style={{ fontSize: '13px', color: '#888', marginLeft: 'auto' }}>{step + 1} / 5</span>
      </div>
      <div style={{ width: '100%', height: '4px', backgroundColor: '#333', borderRadius: '2px', marginBottom: '30px', overflow: 'hidden' }}>
        <div style={{ width: `${(step + 1) * 20}%`, height: '100%', background: 'linear-gradient(to right, #00c6ff, #007bff)', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
      </div>

      {errorMsg && (
        <div style={{ backgroundColor: '#rgba(220, 53, 69, 0.2)', border: '1px solid #dc3545', color: '#ff6b6b', padding: '14px', borderRadius: '8px', marginBottom: '25px', fontWeight: 'bold', fontSize: '14px' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* 步驟 0：選擇城市 */}
      {step === 0 && (
        <div className='fade-in'>
          <h3 style={sectionTitleStyle}>第一步：你想去台灣哪些地方玩？（可複選）</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px', margin: '25px 0' }}>
            {TAIWAN_CITIES.map(city => {
              const isSelected = formData.cities.includes(city);
              return (
                <div 
                  key={city}
                  onClick={() => handleCheckboxChange('cities', city)}
                  style={{
                    padding: '14px 5px',
                    textAlign: 'center',
                    backgroundColor: isSelected ? '#007bff' : '#2a2a2a',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    border: isSelected ? '1px solid #00c6ff' : '1px solid #3d3d3d',
                    fontSize: '14px',
                    userSelect: 'none',
                    boxShadow: isSelected ? '0 0 10px rgba(0,123,255,0.4)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isSelected ? '✓ ' : ''}{city}
                </div>
              );
            })}
          </div>
          <button onClick={() => setStep(1)} style={btnStyle}>下一步</button>
        </div>
      )}

      {/* 步驟 1：天數 */}
      {step === 1 && (
        <div>
          <h3 style={sectionTitleStyle}>第二步：時間天數預估</h3>
          <div style={{ backgroundColor: '#2a2a2a', padding: '25px', borderRadius: '10px', border: '1px solid #3d3d3d', margin: '25px 0' }}>
            <label style={{ fontSize: '18px', fontWeight: 'bold', display: 'block', marginBottom: '15px' }}>預計旅遊天數：<span style={{ color: '#00c6ff', fontSize: '28px' }}>{formData.days}</span> 天</label>
            <input 
              type="range" min="1" max="7" 
              value={formData.days} 
              onChange={(e) => setFormData({ ...formData, days: parseInt(e.target.value) })}
              style={{ width: '100%', cursor: 'pointer', accentColor: '#007bff' }}
            />
          </div>
          <button onClick={() => setStep(0)} style={prevBtnStyle}>上一步</button>
          <button onClick={() => setStep(2)} style={btnStyle}>下一步</button>
        </div>
      )}

      {/* 步驟 2：人數與標籤 */}
      {step === 2 && (
        <div>
          <h3 style={sectionTitleStyle}>第三步：旅遊人數與偏好設定</h3>
          
          <p style={{ fontWeight: 'bold', color: '#aaa', fontSize: '15px', marginBottom: '10px' }}>成員人數：</p>
          <div style={{ display: 'flex', gap: '15px', marginBottom: '30px' }}>
            {['一人', '2-4人', '4人以上'].map(size => (
              <button 
                key={size}
                type="button"
                onClick={() => setFormData({ ...formData, group_size: size })}
                style={{
                  ...radioBtnStyle,
                  flex: 1,
                  backgroundColor: formData.group_size === size ? '#007bff' : '#2a2a2a',
                  border: formData.group_size === size ? '1px solid #00c6ff' : '1px solid #3d3d3d',
                  boxShadow: formData.group_size === size ? '0 0 10px rgba(0,123,255,0.3)' : 'none'
                }}
              >
                {size}
              </button>
            ))}
          </div>

          <p style={{ fontWeight: 'bold', color: '#aaa', fontSize: '15px', marginBottom: '10px' }}>特殊偏好與需求（可複選）：</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', margin: '15px 0' }}>
            {PREFERENCE_TAGS.map(tag => (
              <label key={tag} style={checkboxLabelStyle}>
                <input 
                  type="checkbox" 
                  checked={formData.tags.includes(tag)}
                  onChange={() => handleCheckboxChange('tags', tag)}
                  style={{ width: '16px', height: '16px', marginRight: '10px', accentColor: '#007bff', cursor: 'pointer' }}
                /> {tag}
              </label>
            ))}
          </div>
          <br />
          <button onClick={() => setStep(1)} style={prevBtnStyle}>上一步</button>
          <button onClick={handleRecommendSpots} style={{ ...btnStyle, backgroundColor: '#28a745' }}>開始海選景點！</button>
        </div>
      )}

      {/* 步驟 3：景點海選與互動區塊 */}
      {step === 3 && (
        <div>
          {loading && !spotsRecommendation ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div className="spinner" style={spinnerStyle}></div>
              <h3 style={{ color: '#00c6ff', marginTop: '20px' }}>正在調度 TDX 全量數據與 AI 篩選中...</h3>
              <p style={{ color: '#666', fontSize: '14px' }}>解鎖全量大數據撈取中，可能需要 5-8 秒，請稍候</p>
            </div>
          ) : (
            <div>
              <h3 style={sectionTitleStyle}> 第四步：AI 幫您海選的候選景點</h3>
              
              <div style={{ backgroundColor: 'rgba(255, 193, 7, 0.1)', borderLeft: '4px solid #ffc107', padding: '15px', margin: '20px 0', borderRadius: '6px', fontSize: '14px', lineHeight: '1.5' }}>
                <span style={{ color: '#ffc107', fontWeight: 'bold' }}>💡 系統提示：</span>{apiMsg}
              </div>
              
              {/* 升級：套用 ReactMarkdown 渲染元件 */}
              <div style={resultBoxStyle}>
                <ReactMarkdown>{spotsRecommendation}</ReactMarkdown>
              </div>

              {accumulatedSpots && (
                <div style={{ backgroundColor: 'rgba(52, 152, 219, 0.1)', padding: '14px', borderRadius: '8px', marginTop: '20px', borderLeft: '4px solid #3498db' }}>
                  <span style={{ fontWeight: 'bold', color: '#3498db', fontSize: '14px' }}>📍 當前決定要排入的景點意見：</span>
                  <p style={{ margin: '5px 0 0 0', fontSize: '15px', color: '#eee' }}>{accumulatedSpots}</p>
                </div>
              )}

              <form onSubmit={handleAnalyzeSelection} style={{ display: 'flex', marginTop: '25px', gap: '12px' }}>
                <input 
                  type="text" 
                  value={userChoice}
                  onChange={(e) => setUserChoice(e.target.value)}
                  disabled={loading} 
                  placeholder={loading ? "正在聆聽意見並重整數據庫中..." : "例如: 溫泉區一定要去、大稻埕不要"}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button type="submit" disabled={loading || !userChoice.trim()} style={{ ...btnStyle, marginTop: '0', float: 'none', minWidth: '110px', backgroundColor: loading ? '#555' : '#007bff' }}>
                  {loading ? "分析中.." : "送出意見"}
                </button>
              </form>

              <hr style={{ margin: '30px 0', borderColor: '#333' }} />
              <button onClick={() => setStep(2)} disabled={loading} style={prevBtnStyle}>重選標籤</button>
              <button onClick={() => handleGenerateFinal(null)} disabled={loading} style={{ ...btnStyle, backgroundColor: '#fd7e14', boxShadow: '0 0 15px rgba(253,126,20,0.3)' }}>確定！編排完整行程表</button>
            </div>
          )}
        </div>
      )}

      {/* 步驟 4：大結局行程輸出 */}
      {step === 4 && (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div className="spinner" style={spinnerStyle}></div>
              <h3 style={{ color: '#fd7e14', marginTop: '20px' }}>正在編排最佳地理動線與生成時間軸...</h3>
              <p style={{ color: '#666', fontSize: '14px' }}>正在精密計算地理跨區順路性...</p>
            </div>
          ) : (
            <div>
              <h3 style={sectionTitleStyle}>您的行程表已生成！</h3>
              
              {/*  升級：套用 ReactMarkdown 渲染元件 */}
              <div style={resultBoxStyle}>
                <ReactMarkdown>{finalItinerary}</ReactMarkdown>
              </div>
              <button onClick={() => { setStep(0); setFinalItinerary(''); setAccumulatedSpots(''); }} style={prevBtnStyle}>重新規劃新旅程</button>
            </div>
          )}
        </div>
      )}

      <div ref={resultEndRef} />
    </div>
  );
}

const containerStyle = { maxWidth: '800px', margin: '50px auto', padding: '35px', fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif', color: '#e0e0e0', backgroundColor: '#1a1a1a', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.6)', border: '1px solid #2d2d2d' };
const sectionTitleStyle = { fontSize: '20px', fontWeight: '600', color: '#fff', margin: '0 0 8px 0' };
const tipStyle = { fontSize: '13px', color: '#666', margin: '0 0 20px 0' };
const btnStyle = { padding: '12px 26px', marginTop: '20px', float: 'right', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s ease', boxShadow: '0 4px 12px rgba(0,123,255,0.3)' };
const prevBtnStyle = { padding: '12px 24px', marginTop: '20px', float: 'left', backgroundColor: '#333', color: '#aaa', border: '1px solid #444', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' };
const radioBtnStyle = { padding: '14px', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s ease' };
const inputStyle = { padding: '14px', fontSize: '15px', borderRadius: '8px', border: '1px solid #3d3d3d', backgroundColor: '#252525', color: '#fff', outline: 'none', transition: 'border-color 0.2s' };
const checkboxLabelStyle = { display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '15px', userSelect: 'none', backgroundColor: '#252525', padding: '14px', borderRadius: '8px', border: '1px solid #333' };

const resultBoxStyle = { 
  backgroundColor: '#121212', 
  padding: '25px', 
  borderRadius: '12px', 
  color: '#e0e0e0', 
  maxHeight: '450px', 
  overflowY: 'auto', 
  marginTop: '20px', 
  border: '1px solid #2d2d2d', 
  lineHeight: '1.7', 
  fontSize: '15px',
  textAlign: 'left',
  boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.5)',
  outline: 'none'
};

const spinnerStyle = { width: '40px', height: '40px', border: '4px solid #333', borderTop: '4px solid #007bff', borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' };

export default App;