import { useState } from 'react';
// import Sidebar from './components/Sidebar';
import ChatTypes from './components/chatTypes';
import InputArea from './components/InputArea';



interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  
  const handleSend = (content: string) => {
    // 2. 사용자가 입력을 전송하면 그때부터 배열에 추가됩니다.
    const userMessage: Message = { role: 'user', content };
    setMessages((prev) => [...prev, userMessage]);

    // AI의 자동 응답 로직 (사양서의 사건 흐름 반영) 
    setTimeout(() => {
      const aiResponse: Message = {
        role: 'assistant', 
        content: '입력하신 공정 조건을 확인했습니다. 파라미터를 추출 중입니다...' 
      };
      setMessages((prev) => {
        // 혹시 이미 같은 내용의 AI 답변이 마지막에 있는지 체크 (방어 코드)
        if (prev.length > 0 && prev[prev.length - 1].content === aiResponse.content) {
          return prev;
        }
        return [...prev, aiResponse];
      });
    }, 1000);
  };

  return (
    <div className="flex h-screen bg-white text-slate-900 overflow-hidden font-sans">
      {/* <Sidebar /> */}
      <div className="flex-1 flex flex-col h-full bg-white relative">
        
        {/* 채팅 영역 */}
        <div className="flex-1 overflow-y-auto p-6 md:px-16 pt-20 pb-10">
          <div className="max-w-3xl mx-auto w-full flex flex-col h-full">
            
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
              <h1 className="text-3xl font-normal text-slate-400 leading-relaxed max-w-md">
              지금 어떤 조건을 분석하시겠습니까?
              </h1>
            </div>
            ) : 
             messages.map((msg, index) => (
              <ChatTypes 
                key={index} 
                role={msg.role as 'user' | 'assistant'} 
                content={msg.content} 
              />
            ))}

            
          </div>
        </div>

        <InputArea onSend={handleSend} />
      </div>
    </div>
  );
}