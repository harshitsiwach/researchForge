"""WebSocket Reader — connect to a WSS endpoint and sample messages."""
import json
import time

TOOL_DEF = {
    "id": "websocket_read",
    "name": "WebSocket Reader",
    "description": "Connect to a WebSocket (WSS) endpoint, listen for 3 seconds to sample incoming messages, and disconnect. Pass the wss:// URL as the query.",
    "icon": "📡",
    "category": "fetch",
    "needs_api_key": False,
}

def execute(query: str, config: dict) -> str:
    # Need to import inside to handle missing pip gracefully
    try:
        import websocket
    except ImportError:
        return "Failed: The 'websocket-client' package is not installed."

    url = query.strip()
    if not url.startswith("ws"):
        url = "wss://" + url

    messages = []
    
    def on_message(ws, message):
        messages.append(message)
        
    def on_error(ws, error):
        messages.append(f"Error: {error}")

    try:
        # Create a websocket app
        import threading
        ws = websocket.WebSocketApp(url, on_message=on_message, on_error=on_error)
        
        # Run it in a background thread so we can kill it after N seconds
        wst = threading.Thread(target=ws.run_forever)
        wst.daemon = True
        wst.start()
        
        # Wait 3 seconds to gather samples
        time.sleep(3)
        ws.close()
        wst.join(timeout=1)
        
        if not messages:
            return f"Connected to {url} for 3 seconds but received no messages."
            
        out_messages = []
        for m in messages[:10]: # Max 10 messages
            try:
                parsed = json.loads(m)
                out_messages.append(json.dumps(parsed))
            except json.JSONDecodeError:
                out_messages.append(str(m))
                
        out = "\n".join(out_messages)
        if len(out) > 4000:
            out = out[:4000] + "\n...[truncated]"
            
        return f"Sampled {len(messages)} messages from {url}:\n```\n{out}\n```"
        
    except Exception as e:
        return f"Failed to read from {url}: {e}"
