import os
import requests

from langchain_openai import AzureChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from api.search.search_handler import SearchHandler
import json
from types import SimpleNamespace

search_handler = SearchHandler()


class ChatHandler:
    def __init__(self) -> None:
        self.llm = AzureChatOpenAI(
            azure_deployment=os.environ["AZURE_OPENAI_DEPLOYMENT_NAME"]
        )
    
    def trigger_api_post_request(self,url, payload):
        headers = {
            "api-key": os.environ["AZURE_RBG_ADDRESS_KEY"],
            "Ocp-Apim-Subscription-Key": os.environ["AZURE_RBG_APIM_WS_KEY"],
            "Content-Type": "application/json"
        }
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()  # Raises an error for bad responses (4xx/5xx)
        return response.json()
    
    def trigger_api_get_request(self,url):
        headers = {
            "Ocp-Apim-Subscription-Key": os.environ["AZURE_RBG_APIM_WS_KEY"],
            "Content-Type": "application/json"
        }
        response = requests.get(url, headers=headers)
        response.raise_for_status()  # Raises an error for bad responses (4xx/5xx)
        return response.json()
    
    def parse_conversation(self, conversation_str):
        messages = []
        lines = conversation_str.split('\n')
        i = 0
        
        while i < len(lines):
            line = lines[i]
            if line.startswith('User: '):
                # Extract user message (may span multiple lines)
                user_content = line[6:]  # Remove "User: " prefix
                i += 1
                while i < len(lines) and not (lines[i].startswith('User: ') or lines[i].startswith('Assistant: ')):
                    user_content += '\n' + lines[i]
                    i += 1
                messages.append(("human", user_content.strip()))
            elif line.startswith('Assistant: '):
                # Extract assistant message (may span multiple lines)
                ai_content = line[11:]  # Remove "Assistant: " prefix
                i += 1
                while i < len(lines) and not (lines[i].startswith('User: ') or lines[i].startswith('Assistant: ')):
                    ai_content += '\n' + lines[i]
                    i += 1
                messages.append(("ai", ai_content.strip()))
            else:
                i += 1
        
        return messages

    def get_chat_response(self, input_text):

        # greetings = ["hi", "hello", "hey", "hiya", "good morning", "good afternoon"]
        # thanks = ["thanks", "thank you", "cheers", "nice one", "much appreciated"]
        # goodbyes = ["bye", "goodbye", "see you", "see ya"]

        # input_lower = input_text.strip().lower()

        # if any(greet in input_lower for greet in greetings):
        #     return SimpleNamespace(content="Hi there! How can I help you today with your bin collections?")

        # if any(thank in input_lower for thank in thanks):
        #     return SimpleNamespace(content="No problem, if you have any more questions let me know!")
        
        # if any(bye in input_lower for bye in goodbyes):
        #     return SimpleNamespace(content="Goodbye! Thanks for your time.")

        messages = self.parse_conversation(input_text)
        search_response = search_handler.get_query_response(str(input_text))
        
        prompt = ChatPromptTemplate.from_messages(
                        [
                            (
                                "system",
                                    """You are an experienced and efficient customer service agent; you are answering calls to customers about council tax registration on behalf of Islington Council.  
                                        Please use any relevant documentation in the following: {information}.                                    """,
                            )
                        ] + messages
                    )

                    chain = prompt | self.llm
                    response = chain.invoke(
                        {
                            "information": search_response
                        }
                    )

        return response.content
            
        # return response
