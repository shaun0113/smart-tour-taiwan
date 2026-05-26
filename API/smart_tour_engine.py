import os
import mysql.connector
from google import genai
from dotenv import load_dotenv

load_dotenv()

TAIWAN_CITIES = [
    "臺北市", "新北市", "桃園市", "臺中市", "臺南市", "高雄市",
    "基隆市", "新竹市", "嘉義市", "新竹縣", "苗栗縣", "彰化縣",
    "南投縣", "雲林縣", "嘉義縣", "屏東縣", "宜蘭縣", "花蓮縣",
    "臺東縣", "澎湖縣", "金門縣", "連江縣"
]

class SmartTourEngine:
    def __init__(self):
        self.client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))
        self.chat = self.client.chats.create(model="gemini-3.1-pro-preview")
        
        self.db_config = {
            'host': 'localhost',
            'user': 'root',
            'password': os.getenv('DB_PASSWORD'),  
            'database': 'smart_tour_taiwan',
            'use_pure': True
        }

    def fetch_relevant_spots(self, city):
        """從資料庫中根據縣市撈取景點"""
        conn = None
        cursor = None
        try:
            conn = mysql.connector.connect(**self.db_config)
            cursor = conn.cursor(dictionary=True)
            
            normalized_city = city.replace('台', '臺')
            search_term = f"%{normalized_city}%"
            
            query = "SELECT title, description, address FROM attractions WHERE city LIKE %s ORDER BY RAND() LIMIT 20"
            cursor.execute(query, (search_term,))
            spots = cursor.fetchall()
            return spots
        except mysql.connector.Error as err:
            print(f"資料庫讀取失敗: {err}")
            return []
        finally:
            if cursor is not None:
                cursor.close()
            if conn is not None and conn.is_connected():
                conn.close()

    def recommend_spots(self, user_input, city, accumulated_spots=""):
        """第一階段：根據使用者需求，從資料庫篩選合適景點讓使用者挑選"""
        
        spots_data = self.fetch_relevant_spots(city)
        
        if not spots_data:
            return f"抱歉，目前資料庫中找不到【{city}】的景點資料。"

        context = "【可選用的資料庫景點清單】\n"
        for s in spots_data:
            context += f"- 景點名稱: {s['title']}\n  景點簡介: {s['description'][:60]}...\n  詳細地址: {s['address']}\n\n"

        exclude_text = f"\n- 注意：使用者已經確認要去的景點有【{accumulated_spots}】，請勿重複推薦這些景點，並推薦能與之搭配的新景點。" if accumulated_spots else ""

        prompt = f"""
# Role
你是一位精明、專業且對在地玩法瞭若指掌的台灣旅遊規劃師。請展現專業、直率的風格，絕不說廢話與客套寒暄。

# Task
請仔細分析使用者的年齡成分與偏好，從提供的「資料庫景點清單」中，精選出 4~6 個最符合他們需求的景點供使用者挑選。

# Input Data
- 目標城市：{city}
- 使用者核心需求與成員背景：
{user_input}{exclude_text}
- 可選用的資料庫景點清單：
{context}

# Constraints（嚴格限制）
1. 只能從提供的景點清單中篩選，嚴禁自行虛構清單外的景點。
2. 僅允許輸出「景點名稱」與「推薦理由」，嚴禁輸出任何時間表、路線順序、天數安排或完整行程。
3. 必須嚴格考量成員結構（例如：有長輩必須排慢步調、有小孩排親子體驗、年輕大學生排活力、美拍或夜景）。
4. 必須嚴格遵守使用者的特殊要求（如必去或避開某些特定類型的景點）。

# Output Format
請直接以下列 Markdown 格式輸出，不要有任何前言、哈囉或結尾客套話：

###  推薦景點 1：[景點名稱]
- **推薦理由**：[精簡說明為什麼適合這群人，包含步調、活動類型、預算契合度或氛圍分析]

###  推薦景點 2：[景點名稱]
- **推薦理由**：[同上]
"""
        try:
            response = self.chat.send_message(prompt)
            return response.text
        except Exception as e:
            print(f"AI 推薦景點時發生錯誤: {e}")
            return "抱歉，目前 AI 引擎連線有些狀況，請稍後再試。"

    def analyze_selection(self, user_choice, current_recommendation, accumulated_spots, user_input):
        """分析使用者在挑選景點時的意圖與累積景點"""
        prompt = f"""
        你是一個判斷使用者意圖的輔助 AI。
        【背景資訊】
        - 使用者之前已確認保留的景點：{accumulated_spots if accumulated_spots else '無'}
        - 你剛剛推薦給使用者的景點清單：
        {current_recommendation}
        - 使用者的行程條件（請注意天數）：
        {user_input}
        
        【使用者的最新回覆】
        「{user_choice}」
        
        【任務要求】
        請分析使用者的意圖，並嚴格依照以下 3 個欄位輸出（純文字，勿使用 markdown block）：

        STATUS: [填入 READY 或 CONTINUE] 
        (判斷標準：若使用者明確表示「開始排行程」，或者你判斷已確認的景點總數已經足夠安排他們要求的天數（一般來說「一天」約需 3~4 個景點），請填 READY。若使用者明確表示要「換一批」、「保留某個其他換掉」或數量還太少，請填 CONTINUE。)
        
        CONFIRMED: [景點A, 景點B...] 
        (結合「之前保留的」與「這次使用者新挑選的」，統整出所有目前已確認要去的景點名稱，用逗號分隔。若無則留空。)
        
        MESSAGE: [口語化回覆] 
        (給使用者的自然回覆。例如：『已幫您保留 A！目前共收集了 2 個景點，還要繼續挑還是直接為您安排行程呢？』或『沒問題，景點很豐富了，馬上為您生成最終行程表！』)
        """
        try:
            meta_chat = self.client.chats.create(model="gemini-3.1-pro-preview")
            response = meta_chat.send_message(prompt).text
            
            status = "CONTINUE"
            confirmed = accumulated_spots
            msg = "好的，那我們繼續為您挑選！"
            
            for line in response.split('\n'):
                line = line.strip()
                if line.startswith("STATUS:"):
                    status = line.replace("STATUS:", "").strip()
                elif line.startswith("CONFIRMED:"):
                    confirmed = line.replace("CONFIRMED:", "").strip()
                elif line.startswith("MESSAGE:"):
                    msg = line.replace("MESSAGE:", "").strip()
                    
            return status, confirmed, msg
        except Exception as e:
            print(f"分析意圖時發生錯誤: {e}")
            return "CONTINUE", accumulated_spots, "好的，為您換一批景點試試看！"

    def generate_final_itinerary(self, user_choice):
        """第二階段：根據使用者的選擇，生成完整的行程表"""
        prompt = f"""
# Role
你是一位精明、專業、注重動線流暢度且會聆聽客人要求的台灣旅遊規劃師。

# Task
使用者已經從你上一輪推薦的清單中，選定了他們想去的景點（如下方 Input Data 所示）。
請回溯我們之前的對話紀錄，結合他們最初提出的人數、偏好、預算、日期與年齡成分等條件，將 these 選定的景點串聯成一份動線最優化、不走回頭路的完整單日行程表。

# Input Data
- 使用者最終選定景點：『{user_choice}』

# Constraints（嚴格限制）
1. 行程編排必須符合地理邏輯，景點間的移動必須順路，避免來回奔波。
2. 必須嚴格包含早、中、晚的時間點或時段安排。
3. 必須考量成員體力與節奏（例如：大學生精力充沛可排夜市、有長輩或幼童下午需留適度休息時間、室內室外景點交替交錯）。
4. 必須主動補上順路的午餐/晚餐用餐方向建議，或符合預算體貼的交通提示。

# Output Format
請直接輸出行程表與建議，拒絕任何無意義的寒暄與問候語：

##  路線動線總覽
[簡述今日路線順序，例如：A景點 -> B商圈(午餐) -> C景點]

##  行程時間表
- **早上（09:00 - 12:00）**：【[景點名稱]】[簡要交通或遊玩亮點建議]
- **午餐（12:00 - 13:30）**：【[用餐建議]】[推薦附近用餐方向或配合預算的休息建議]
- **下午（13:30 - 17:30）**：【[景點名稱]】[注意事項，如防曬、步行時間]
- **晚餐/晚上（18:00 之後）**：【[夜間活動/夜市/商圈]】[完美的收尾行程建議]

##  規劃師貼心提醒
- **交通與動線優勢**：[說明為什麼這樣排很順路，以及如何搭車或好不好停車]
- **成員節奏調整**：[針對成員年齡層（如大學生、長輩、小孩）的體力或防蚊、防雨提醒]
"""
        try:
            response = self.chat.send_message(prompt)
            return response.text
        except Exception as e:
            print(f"AI 生成行程時發生錯誤: {e}")
            return "抱歉，行程生成失敗，請檢查網路狀態或 API 額度後再試。"

    def revise_itinerary(self, feedback):
        """第三階段：根據使用者對行程的反饋進行調整"""
        prompt = f"""
# Task
使用者對剛剛排出的行程給出了以下反饋或修改意見：
「{feedback}」

# Constraints
1. 判斷使用者的意圖：
   - 如果使用者表示「滿意」、「不用改了」、「很棒」、「謝謝」等正面確認，請務必在回應的最開頭加上 `[SATISFIED]`，然後寫一段（約50字以內）溫馨的結語，祝他們旅途愉快。
   - 如果使用者提出修改意見（例如換景點、改時間、太趕、刪除某地），請**重新完整輸出**修改後的行程表（請維持原本的「路線動線總覽」、「行程時間表」、「規劃師貼心提醒」格式），絕對**不要**加上 `[SATISFIED]`。
"""
        try:
            response = self.chat.send_message(prompt)
            return response.text
        except Exception as e:
            print(f"調整行程時發生錯誤: {e}")
            return "抱歉，行程調整發生錯誤，請檢查網路狀態後再試。"