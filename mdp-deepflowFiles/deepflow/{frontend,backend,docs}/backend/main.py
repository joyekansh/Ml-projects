import json
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from socratic_logic import socratic_app, model

app = FastAPI(title="Deep Flow API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"status": "Deep Flow API running", "version": "1.0.0"}


@app.post("/chat")
async def chat(request: Request):
    """
    Main Socratic tutor endpoint.
    Streams responses from the LangGraph Socratic agent.
    
    Body: { "message": str, "session_id": str }
    Returns: text/event-stream of { "content": str } chunks
    """
    data = await request.json()
    user_message = data.get("message")
    session_id = data.get("session_id", "default_user")

    async def event_generator():
        config = {"configurable": {"thread_id": session_id}}
        async for event in socratic_app.astream(
            {"messages": [("user", user_message)]},
            config,
            stream_mode="values"
        ):
            if "messages" in event:
                last_msg = event["messages"][-1]
                if hasattr(last_msg, "content"):
                    yield f"data: {json.dumps({'content': last_msg.content})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post("/anxiety-dump")
async def anxiety_dump(data: dict):
    """
    Mental RAM Clearing endpoint.
    Takes a brain dump of anxieties and returns a short, calming summary.
    
    Body: { "message": str }
    Returns: { "summary": str }
    """
    user_input = data.get("message", "")

    system_prompt = (
        "You are the Deep Flow Calmness Assistant. "
        "The user is dumping their anxieties to clear their mental RAM before studying. "
        "Acknowledge their stress briefly, summarize the core worries in one sentence, "
        "and tell them it is now safely stored so they can focus. "
        "Keep it under 30 words. Be warm but concise."
    )

    response = model.invoke([
        ("system", system_prompt),
        ("human", user_input)
    ])

    return {"summary": response.content}


@app.post("/session-summary")
async def session_summary(data: dict):
    """
    End-of-session quiz generator.
    Analyzes struggle points from chat history and generates targeted questions.
    
    Body: { "chat_history": list, "topic": str, "session_id": str }
    Returns: { "questions": list[str], "focus_score": int }
    """
    chat_history = data.get("chat_history", [])
    topic = data.get("topic", "General")

    system_prompt = (
        f"You are a study analysis AI. The student just finished a session on '{topic}'. "
        "Based on the chat history below, identify 3-5 concepts they seemed uncertain about "
        "and generate targeted review questions for each. "
        "Respond ONLY with a JSON object: { \"questions\": [\"...\", ...], \"focus_score\": 0-100 }. "
        "No markdown, no extra text."
    )

    history_text = "\n".join([
        f"{m['role'].upper()}: {m['content']}"
        for m in chat_history[-20:]  # last 20 messages
    ])

    response = model.invoke([
        ("system", system_prompt),
        ("human", f"Chat history:\n{history_text}")
    ])

    try:
        result = json.loads(response.content)
    except Exception:
        result = {
            "questions": ["Review the core concepts of " + topic],
            "focus_score": 70
        }

    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
