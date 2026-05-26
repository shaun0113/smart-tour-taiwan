from smart_tour_engine import SmartTourEngine, TAIWAN_CITIES

if __name__ == "__main__":
    engine = SmartTourEngine()
    print("--- 旅遊助手已啟動 ---")
    print("為了給您最貼心的行程，請提供以下必填資訊：\n")
    
    city_to_search = ""
    while True:
        raw_city = input("請輸入想去的台灣縣市（例如：臺北市）：").strip().replace('台', '臺')
        
        matched_city = None
        for city in TAIWAN_CITIES:
            if raw_city in city or city in raw_city:
                matched_city = city
                break
                
        if matched_city:
            city_to_search = matched_city
            break
            
        print(" 本系統僅支援台灣縣市（例如：臺北市、宜蘭縣）請勿輸入國外城市或無意義字詞")

    while True:
        num_people = input("請輸入人數（例如：4人）：").strip()
        if any(char.isdigit() for char in num_people) or "人" in num_people:
            break
        print(" 請輸入明確的人數，例如「4人」或「2大2小」")

    while True:
        preference = input("請輸入旅遊偏好及要求（例如：室內、吃美食、看自然風景、遊樂園等等）：").strip()
        if len(preference) >= 2 and not any(x in preference for x in ["哈", "欸", "喔", "嘻", "嗯", "啊"]):
            break
        print(" 請認真填寫偏好（至少2個字），例如「看海、吃小吃」")

    while True:
        budget = input("請輸入預算（例如：每人 2000 元）：").strip()
        if len(budget) >= 2:
            break
        print(" 請填寫預算範圍")

    while True:
        travel_date = input("請輸入行程日期（例如：這週末、2026/10/10）：").strip()
        if len(travel_date) >= 2:
            break
        print(" 請填寫日期")

    while True:
        age_composition = input("請輸入年齡成分（例如：2大1小、有長輩、全是大學生）：").strip()
        if len(age_composition) >= 2 and not any(x in age_composition for x in ["哈", "欸", "喔", "嘻"]):
            break
        print(" 請輸入實際的年齡層組合，這會影響景點推薦的適合度")
    
    other_req = input("\n 還有其他要求嗎？（若無請直接按 Enter 跳過）：").strip()
    
    user_need = f"人數：{num_people}\n旅遊偏好：{preference}\n預算：{budget}\n行程日期：{travel_date}\n年齡成分：{age_composition}"
    if other_req:
        user_need += f"\n額外要求：{other_req}"
    
    print("\n 正在為您精選合適的景點，請稍候...\n")
    
    accumulated_spots = ""
    while True:
        spots_recommendation = engine.recommend_spots(user_need, city_to_search, accumulated_spots)
        print("="*30)
        print(spots_recommendation)
        print("="*30)
        
        while True:
            prompt_text = f"\n 目前已保留景點：{accumulated_spots if accumulated_spots else '無'}\n  為了讓行程動線最順暢，建議「每天」大約挑選 3 到 4 個景點。\n 請告訴我您的想法 (例如: 保留第一個其餘換掉 / 加上第三個 / 景點夠了，請直接排行程)："
            user_choice = input(prompt_text).strip()
            if len(user_choice) >= 2:
                break
            print(" 請輸入有效的選擇，不要留空或亂打")
            
        print("\n 回覆中...\n")
        status, accumulated_spots, msg = engine.analyze_selection(user_choice, spots_recommendation, accumulated_spots, user_need)
        
        print(f"\nAI 規劃師: {msg}\n")
        
        if "READY" in status:
            break
        else:
            print(" 正在為您搜尋搭配的新景點，請稍候...\n")
            continue
        
    print("\n 收到！ 正在為您編排完整的行程表，請稍候...\n")
    final_itinerary = engine.generate_final_itinerary(accumulated_spots, user_need)
    print("="*30)
    print(final_itinerary)
    print("="*30)
    
    while True:
        feedback = input("\n 請確認您對這個行程滿意嗎？（例如：滿意、或是「把A景點刪掉」、「午餐換一間」）：").strip()
        if not feedback:
            continue
            
        print("\n AI 正在處理您的回覆，請稍候...\n")
        revised = engine.revise_itinerary(feedback)
        
        if "[SATISFIED]" in revised:
            print("="*30)
            final_msg = revised.replace("[SATISFIED]", "").strip()
            print(final_msg)
            print("="*30)
            break
        else:
            print("="*30)
            print(revised)
            print("="*30)