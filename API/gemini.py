import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))

chat = client.chats.create(model="gemini-3.1-pro-preview")

print("--- Smart Travel Taiwan AI 助手已啟動 (輸入 'quit' 退出) ---")

while True:
    user_input = input("你: ")
    
    if user_input.lower() in ['quit', 'exit', '離開']:
        print("AI: 專題加油！下次見，掰掰～")
        break
        
    response = chat.send_message(user_input)
    
    print(f"\nGemini 3.1 Pro:\n{response.text}\n")
    print("-" * 30)