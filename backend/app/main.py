from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.settings import Settings, parse_cors_origins


class ChatMessageIn(BaseModel):
    role: str = Field(pattern="^(user|assistant|system)$")
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessageIn]


class ChatResponse(BaseModel):
    content: str


settings = Settings()
app = FastAPI(title="Chat API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=parse_cors_origins(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_llm = ChatOpenAI(
    api_key=settings.openai_api_key,
    model=settings.openai_model,
    temperature=0.7,
)

_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", "You are a helpful assistant."),
        MessagesPlaceholder("history"),
    ]
)
_chain = _prompt | _llm


def _to_history(messages: list[ChatMessageIn]) -> list[HumanMessage | AIMessage]:
    history: list[HumanMessage | AIMessage] = []
    for m in messages:
        if m.role == "system":
            continue
        if m.role == "user":
            history.append(HumanMessage(content=m.content))
        elif m.role == "assistant":
            history.append(AIMessage(content=m.content))
    return history


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
def chat(body: ChatRequest) -> ChatResponse:
    if not body.messages:
        raise HTTPException(status_code=400, detail="messages must not be empty")

    history = _to_history(body.messages)
    if not history:
        raise HTTPException(
            status_code=400,
            detail="At least one user or assistant message is required",
        )

    try:
        result = _chain.invoke({"history": history})
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    content = result.content if isinstance(result.content, str) else str(result.content)
    return ChatResponse(content=content)
