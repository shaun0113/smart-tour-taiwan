import React, { useState } from 'react';
import axios from 'axios';

function App() {
  // 1. 這就是我們要 POST 給 API 的資料結構
  const [formData, setFormData] = useState({
    city: '臺中市',
    days: 3,
    budget_level: '標準',
    age_groups: [],
    tags: []
  });

  // 2. 控制現在走到第幾步 (0: 選城市, 1: 天數與預算, 2: 標籤偏好, 3: 顯示結果)
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [itineraryResult, setItineraryResult] = useState(null);

  // 處理複選框的輔助函式
  const handleCheckboxChange = (field, value) => {
    const currentList = [...formData[field]];
    if (currentList.includes(value)) {
      setFormData({ ...formData, [field]: currentList.filter(item => item !== value) });
    } else {
      setFormData({ ...formData, [field]: [...currentList, value] });
    }
  };

  // 3. 送出需求給後端 FastAPI
  const handleSubmit = async () => {
    setLoading(true);
    setStep(3); // 跳轉到結果/Loading頁面
    try {
      // 換成你後端 FastAPI 的網址
      const response = await axios.post('http://localhost:8000/api/v1/generate-itinerary', formData);
      setItineraryResult(response.data.itinerary);
    } catch (error) {
      console.error("API 呼叫失敗:", error);
      alert("行程生成失敗，請檢查後端是否有開，或 CORS 是否設定。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', padding: '20px', fontFamily: 'Arial', color: '#fff' }}>
      <h2>🧭 智遊台灣 Smart Tour</h2>
      <p>步驟：{step + 1} / 4</p>
      <hr />

      {/* 步驟 0：選擇城市 */}
      {step === 0 && (
        <div>
          <h3>第一步：你想去台灣哪裡玩？</h3>
          <select 
            value={formData.city} 
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            style={{ padding: '10px', width: '100%', fontSize: '16px', borderRadius: '5px' }}
          >
            <option value="臺北市">臺北市</option>
            <option value="臺中市">臺中市</option>
            <option value="高雄市">高雄市</option>
            <option value="台南市">台南市</option>
          </select>
          <button onClick={() => setStep(1)} style={btnStyle}>下一步</button>
        </div>
      )}

      {/* 步驟 1：天數與預算 */}
      {step === 1 && (
        <div>
          <h3>第二步：時間與預算預估</h3>
          <label>旅遊天數：{formData.days} 天</label>
          <input 
            type="range" min="1" max="7" 
            value={formData.days} 
            onChange={(e) => setFormData({ ...formData, days: parseInt(e.target.value) })}
            style={{ width: '100%', margin: '15px 0' }}
          />
          
          <p>預算風格：</p>
          {['經濟', '標準', '奢華'].map(level => (
            <button 
              key={level}
              onClick={() => setFormData({ ...formData, budget_level: level })}
              style={{
                ...radioBtnStyle,
                backgroundColor: formData.budget_level === level ? '#007bff' : '#eee',
                color: formData.budget_level === level ? '#fff' : '#000'
              }}
            >
              {level}
            </button>
          ))}
          <br />
          <button onClick={() => setStep(0)} style={prevBtnStyle}>上一步</button>
          <button onClick={() => setStep(2)} style={btnStyle}>下一步</button>
        </div>
      )}

      {/* 步驟 2：同行夥伴與偏好標籤 */}
      {step === 2 && (
        <div>
          <h3>第三步：是誰要一起去？有什麼偏好？</h3>
          <p>同行夥伴（可複選）：</p>
          {['青年', '長輩', '小孩'].map(age => (
            <label key={age} style={{ marginRight: '15px' }}>
              <input 
                type="checkbox" 
                checked={formData.age_groups.includes(age)}
                onChange={() => handleCheckboxChange('age_groups', age)}
              /> {age}
            </label>
          ))}

          <p>特殊需求（可複選）：</p>
          {['寵物友善', '戶外風景', '室內吹冷氣', '在地美食'].map(tag => (
            <label key={tag} style={{ marginRight: '15px' }}>
              <input 
                type="checkbox" 
                checked={formData.tags.includes(tag)}
                onChange={() => handleCheckboxChange('tags', tag)}
              /> {tag}
            </label>
          ))}
          <br /><br />
          <button onClick={() => setStep(1)} style={prevBtnStyle}>上一步</button>
          <button onClick={handleSubmit} style={{ ...btnStyle, backgroundColor: '#28a745' }}>開始智遊！</button>
        </div>
      )}

      {/* 步驟 3：Loading 轉圈圈與產出結果 */}
      {step === 3 && (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <h3>正在調度 TDX 數據與 AI 精準排程中...</h3>
              <p>請稍候，這大約需要 3-5 秒 🚀</p>
            </div>
          ) : (
            <div>
              <h3>🎉 您的客製化行程已生成！</h3>
              <div style={{ backgroundColor: '#333', padding: '15px', borderRadius: '5px', whiteSpace: 'pre-wrap', color: '#fff' }}>
                {typeof itineraryResult === 'string' ? itineraryResult : JSON.stringify(itineraryResult, null, 2)}
              </div>
              <button onClick={() => { setStep(0); setItineraryResult(null); }} style={prevBtnStyle}>重新規劃</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const btnStyle = { padding: '10px 20px', marginTop: '20px', float: 'right', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' };
const prevBtnStyle = { padding: '10px 20px', marginTop: '20px', float: 'left', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' };
const radioBtnStyle = { padding: '10px 20px', marginRight: '10px', border: 'none', borderRadius: '5px', cursor: 'pointer' };

export default App;