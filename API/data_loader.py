import os
import requests
import json
import mysql.connector
import time
from dotenv import load_dotenv

load_dotenv()

class SmartTourTaiwan:
    def __init__(self):
        self.client_id = os.getenv('TDX_CLIENT_ID')
        self.client_secret = os.getenv('TDX_CLIENT_SECRET')
        self.db_config = {
            'host': 'localhost',
            'user': 'root',
            'password': os.getenv('DB_PASSWORD'), 
            'database': 'smart_tour_taiwan',
            'use_pure': True           
        }
        if not self.client_id or not self.client_secret:
            raise Exception(" 找不到 TDX 金鑰，請檢查 .env 檔案。")
        if not self.db_config['password']:
            raise Exception(" 找不到資料庫密碼，請確認 .env 檔案中有正確設定 DB_PASSWORD。")
        self.access_token = self._get_access_token()

    def _get_access_token(self):
        auth_url = 'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token'
        data = {'grant_type': 'client_credentials', 'client_id': self.client_id, 'client_secret': self.client_secret}
        response = requests.post(auth_url, data=data)
        response.raise_for_status()
        return response.json().get('access_token')

    def clear_old_data(self):
        """清除所有舊資料"""
        conn = None
        cursor = None
        try:
            conn = mysql.connector.connect(**self.db_config)
            cursor = conn.cursor()
            cursor.execute("TRUNCATE TABLE attractions;")
            conn.commit()
            print("已清除資料庫中的舊景點資料。")
        except mysql.connector.Error as err:
            print(f"清空舊資料失敗: [錯誤代碼 {err.errno}] {err.msg}")
        finally:
            if cursor is not None:
                cursor.close()
            if conn is not None and conn.is_connected():
                conn.close()

    def save_to_db(self, city_eng, city_name_cht):
        api_url = f"https://tdx.transportdata.tw/api/basic/v2/Tourism/ScenicSpot/{city_eng}?$format=JSON"
        headers = {'authorization': f'Bearer {self.access_token}'}
        
        response = None
        for retry in range(3):
            response = requests.get(api_url, headers=headers)
            if response.status_code == 200:
                break
            elif response.status_code == 429:
                print(f" {city_name_cht}: 流量限制中，等待 10 秒後重試...")
                time.sleep(10)
            else:
                print(f" {city_name_cht} 失敗: {response.status_code}")
                return

        if response and response.status_code == 200:
            spots = response.json()
            
            if spots and len(spots) > 0:
                print(f"\n 檢查 {city_name_cht} 第一筆原始資料欄位：")
                first = spots[0]
                for key in list(first.keys())[:10]:
                    print(f"   - {key}: {str(first[key])[:30]}...")

            conn = None
            cursor = None
            try:
                conn = mysql.connector.connect(**self.db_config)
                cursor = conn.cursor()
                sql = """
                    INSERT INTO attractions (title, city, category, address, description, tel)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE 
                    category=VALUES(category), address=VALUES(address), 
                    description=VALUES(description), tel=VALUES(tel)
                """

                count = 0
                for spot in spots:
                    title = spot.get('ScenicSpotName')
                    category = spot.get('Class1', '一般景點')
                    address = spot.get('Address') or spot.get('Add') or "無地址資訊"
                    description = spot.get('DescriptionDetail') or spot.get('Description') or "無描述資訊"
                    tel = spot.get('Phone') or spot.get('Tel') or "無電話"

                    val = (title, city_name_cht, category, address, description, tel)
                    cursor.execute(sql, val)
                    count += 1

                conn.commit()
                print(f" {city_name_cht}: 成功同步 {count} 筆。")
                
            except mysql.connector.Error as err:
                print(f" {city_name_cht} 寫入失敗: [錯誤代碼 {err.errno}] {err.msg}")
            finally:
                if cursor is not None:
                    cursor.close()
                if conn is not None and conn.is_connected():
                    conn.close()

# --- 入口 ---
if __name__ == "__main__":
    taiwan_cities = {
        "Taipei": "臺北市", "NewTaipei": "新北市", "Taoyuan": "桃園市",
        "Taichung": "臺中市", "Tainan": "臺南市", "Kaohsiung": "高雄市",
        "Keelung": "基隆市", "Hsinchu": "新竹市", "HsinchuCounty": "新竹縣",
        "MiaoliCounty": "苗栗縣", "ChanghuaCounty": "彰化縣", "NantouCounty": "南投縣",
        "YunlinCounty": "雲林縣", "ChiayiCounty": "嘉義縣", "Chiayi": "嘉義市",
        "PingtungCounty": "屏東縣", "YilanCounty": "宜蘭縣", "HualienCounty": "花蓮縣",
        "TaitungCounty": "臺東縣", "KinmenCounty": "金門縣", "PenghuCounty": "澎湖縣",
        "LienchiangCounty": "連江縣"
    }

    try:
        print("開始抓取全台景點...")
        app = SmartTourTaiwan()
        
        app.clear_old_data()
        
        for eng, cht in taiwan_cities.items():
            app.save_to_db(eng, cht)
            time.sleep(10)

        print("\n 全台灣景點資料輸入完成！")
        
    except Exception as e:
        print(f"\n 錯誤: {e}")