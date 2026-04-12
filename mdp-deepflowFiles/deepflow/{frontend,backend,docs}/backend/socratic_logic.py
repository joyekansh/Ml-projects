import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import START, MessagesState, StateGraph

load_dotenv()

# ── Model ──────────────────────────────────────────────────────────────
model = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",   # update to gemini-3-flash when available
    streaming=True,
    google_api_key=os.getenv("GOOGLE_API_KEY")
)

# ── System Prompt ──────────────────────────────────────────────────────
SOCRATIC_SYSTEM_PROMPT = """
You are the Deep Flow Socratic Tutor — a wise, encouraging guide.

CORE RULES:
1. NEVER give direct answers. Always guide the student to discover the answer themselves.
2. Ask ONE guiding question at a time. Not two, not three — exactly one.
3. If the student is stuck after 2 attempts, give a tiny hint (1 sentence max), then ask again.
4. Track which concepts the student struggles with — you will reference these at session end.
5. Keep responses SHORT (2-4 sentences max). Dense, meaningful, no fluff.
6. Be warm and encouraging — celebrate small breakthroughs.

QUESTION PROGRESSION:
- Start broad: "What do you already know about X?"
- Narrow in: "What happens when Y changes?"
- Challenge: "Can you think of a case where this breaks down?"
- Connect: "How does this relate to Z from earlier?"

TONE: Like a brilliant friend who happens to know everything — not a textbook, not a robot.
"""

# ── Agent Node ──────────────────────────────────────────────────────────
def call_model(state: MessagesState):
    system = SystemMessage(content=SOCRATIC_SYSTEM_PROMPT)
    messages = [system] + state["messages"]
    response = model.invoke(messages)
    return {"messages": [response]}


# ── Graph ───────────────────────────────────────────────────────────────
memory = MemorySaver()

builder = StateGraph(MessagesState)
builder.add_node("model", call_model)
builder.add_edge(START, "model")

socratic_app = builder.compile(checkpointer=memory)
