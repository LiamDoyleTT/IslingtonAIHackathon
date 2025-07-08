import { useState } from 'react';
import { Box, Container, Stack } from '@mantine/core';
import ChatMessage from '@/domain/ChatMessage';
import ChatBox from '@/components/ChatBox/ChatBox';
import ChatWindow from '@/components/ChatWindow/ChatWindow';

export function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const handleError = async (error: any) => {
    let errorDetail = 'Unknown Error';
    
    try {
      if (error instanceof Response) {
        const contentType = error.headers.get('content-type');
        errorDetail = 'Status Code: ' + error.status;
        
        if (contentType && contentType.indexOf('application/json') !== -1) {
          const errorJson = await error.json();
          errorDetail = errorJson.detail || JSON.stringify(errorJson);
        }
      } else {
        errorDetail = error.message || JSON.stringify(error);
      }
    } catch (e) {
      errorDetail = 'Error parsing error: ' + String(e);
    }

    setMessages((oldMessages) => [
      ...oldMessages,
      { message: 'Error: ' + errorDetail, role: 'bot', type: 'error' },
    ]);
    setLoading(false);
  };

  const sendChatRequest = (endpoint: string, headers: any, body: any) => {
    fetch(endpoint, {
      method: 'POST',
      headers,
      body,
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        return Promise.reject(response);
      })
      .then((data) => {
        setMessages((oldMessages) => [...oldMessages, { message: data.response, role: 'bot' }]);
        setLoading(false);
      })
      .catch(async (error) => handleError(error));
  };

  const getConversationString = (msgs: ChatMessage[]) => {
    return msgs.map(m => `${m.role === 'person' ? 'User' : 'Assistant'}: ${m.message}`).join('\n');
  };

  const textMessageCreated = (message: string) => {
    const updatedMessages = [...messages, { message, role: 'person' as const }];
    setMessages(updatedMessages);
    setLoading(true);

    sendChatRequest(
      '/api/process',
      {
        'Content-Type': 'application/json',
      },
      JSON.stringify({ 
        body: getConversationString(updatedMessages)
      })
    );
  };

  const audioFileUploaded = (file: File | null) => {
    setLoading(true);
    
    // Show temporary loading message
    const tempMessages = [...messages, { message: '🎵 Audio Uploaded...', role: 'person' as const }];
    setMessages(tempMessages);
    
    fetch('/api/process-audio-file', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        body: getConversationString(messages)
      })
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        return Promise.reject(response);
      })
      .then((data) => {
        // Replace the temporary message with the first output as user input
        // and add the second output as bot response
        const updatedMessages = [
          ...messages,
          { message: data.transcribed_audio, role: 'person' },
          { message: data.response, role: 'bot' }
        ];
        setMessages(updatedMessages);
        setLoading(false);
      })
      .catch(async (error) => handleError(error));
  };

  const clearChatHistory = () => setMessages([]);

  return (
    <Container fluid>
      <Stack style={{ height: '87vh' }} p={0}>
        <ChatWindow messages={messages} loading={loading} />
        <Box>
          <ChatBox
            textMessageCreated={textMessageCreated}
            chatHistoryCleared={clearChatHistory}
            audioFileUploaded={audioFileUploaded}
          />
        </Box>
      </Stack>
    </Container>
  );
}