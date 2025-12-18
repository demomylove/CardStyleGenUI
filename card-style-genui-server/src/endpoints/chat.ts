import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { compare } from 'fast-json-patch';
import { PromptBuilder } from '../ai/PromptBuilder';
import { LLMService } from '../ai/LLMService';

// In-memory session store (MVP)
// In a real app, use Redis or a database.
const stateStore = new Map<string, any>();

/**
 * Handles the /api/chat endpoint following AG-UI protocol structure.
 * Streams SSE events: TEXT_MESSAGE_CONTENT, STATE_DELTA, DONE.
 */
export const chatHandler = async (req: Request, res: Response) => {
  const { messages, state, sessionId: reqSessionId } = req.body;
  
  // 1. Session Management
  const sessionId = reqSessionId || uuidv4();
  // Initialize state if new session, or retrieve existing
  // For robustness, we might merge client-provided state if session is missing?
  // But for this "Server Source of Truth" pattern, we rely on server state.
  let serverState = stateStore.get(sessionId) || {};
  
  // If client provided dataContext in state, update our server record
  if (state?.dataContext) {
      serverState.dataContext = state.dataContext;
  }

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (type: string, data: any) => {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  };

  try {
    // Send session ID so client can store it
    if (!reqSessionId) {
       // We can send a custom event or metadata, or just ensure client gets it via some mechanism.
       // AG-UI doesn't strictly define "SESSION_START", but usually the first response implies it.
       // We'll trust the client to handle the IDs if we were strict, but here let's just 
       // let the client know. Actually, sending it in a specific event might be needed if not standard.
       // For now, let's assume client handles the ID from the response if we send it in a custom event or headers?
       // SSE headers are already sent. We can send a custom event "SESSION_INIT".
       sendEvent('SESSION_INIT', { sessionId });
    }

    const lastUserMessage = messages[messages.length - 1]?.content || "";
    
    // 2. Lifecycle & Initial Thought
    if (!serverState.dsl) {
         sendEvent('THREAD_START', { threadId: sessionId });
    }
    const messageId = uuidv4();
    sendEvent('MESSAGE_START', { messageId, role: 'assistant' });
    sendEvent('TEXT_MESSAGE_CONTENT', { delta: "Thinking..." });

    // 3. Construct Prompt
    const dataContext = serverState.dataContext || {}; 
    const currentDsl = serverState.dsl || null;
    const prompt = PromptBuilder.constructPrompt(lastUserMessage, dataContext, currentDsl);

    // 4. Call LLM
    const dslString = await LLMService.generateUI(prompt);
    
    // 5. Parse DSL
    let dslObject;
    try {
        dslObject = JSON.parse(dslString);
        
        // Check if it's a tool call
        if (dslObject.tool_call) {
            console.log("Detected Tool Call:", dslObject.tool_call);
            sendEvent('TOOL_CALL_START', { 
                name: dslObject.tool_call.name, 
                args: dslObject.tool_call.args 
            });
            // Assume single turn tool execution for now
             sendEvent('MESSAGE_END', { messageId: uuidv4() });
            res.write('data: [DONE]\n\n');
            res.end();
            return;
        }

        // Check if it's a Human Input Request
        if (dslObject.request_human_input) {
             console.log("Detected HITL Request:", dslObject.request_human_input);
             sendEvent('REQUEST_HUMAN_INPUT', {
                 prompt: dslObject.request_human_input.prompt,
                 options: dslObject.request_human_input.options
             });
             sendEvent('MESSAGE_END', { messageId: uuidv4() });
             res.write('data: [DONE]\n\n');
             res.end();
             return;
        }

    } catch (error: any) {
        console.error("Failed to parse JSON from LLM", dslString, error);
        sendEvent('TEXT_MESSAGE_CONTENT', { delta: "\nError: AI generated invalid JSON." });
        res.write('data: [DONE]\n\n');
        res.end();
        return;
    }

    // 6. Stream Completion Text
    sendEvent('TEXT_MESSAGE_CONTENT', { delta: "\nGenerated UI." });

    // 7. Calculate Diff & Send STATE_DELTA
    const oldDsl = serverState.dsl || {};
    const patch = compare(oldDsl, dslObject);

    if (patch.length > 0) {
        // Send patch only if there are changes
        // Use path /dsl for the patch
        // fast-json-patch paths are relative to the object compared.
        // We compared oldDsl vs newDsl. So path "/" in patch refers to root of Dsl.
        // But our global state has "dsl" property. 
        // We should prefix paths with "/dsl"?
        // Or we can just say the STATE_DELTA updates the "dsl" property specifically.
        // Standard AG-UI: STATE_DELTA patch applies to the ROOT agent state.
        // So if our AgentState is { dsl: ... }, we should compare { dsl: oldDsl } vs { dsl: newDsl }.
        
        const oldRoot = { dsl: oldDsl };
        const newRoot = { dsl: dslObject };
        const rootPatch = compare(oldRoot, newRoot);
        
        sendEvent('STATE_DELTA', { patch: rootPatch });
    }

    // 8. Update Server State
    serverState.dsl = dslObject;
    stateStore.set(sessionId, serverState);

    // 9. Finish
    sendEvent('MESSAGE_END', { messageId: uuidv4() }); // Ideally use same ID as start
    res.write('data: [DONE]\n\n');
    res.end();
    
  } catch (error: any) {
    console.error("Handler error:", error);
    sendEvent('TEXT_MESSAGE_CONTENT', { delta: `\nServer Error: ${error.message}` });
    res.write('data: [DONE]\n\n');
    res.end();
  }
};

/**
 * Non-streaming variant: returns JSON once (sessionId + patch),
 * so移动端可在受限网关下回退到一次性响应。
 */
export const chatOnceHandler = async (req: Request, res: Response) => {
  const { messages, state, sessionId: reqSessionId } = req.body || {};
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid payload: missing messages[]' });
  }

  const sessionId = reqSessionId || uuidv4();
  let serverState = stateStore.get(sessionId) || {};
  if (state?.dataContext) {
    serverState.dataContext = state.dataContext;
  }

  try {
    const lastUserMessage = messages[messages.length - 1]?.content || '';
    const dataContext = serverState.dataContext || {};
    const currentDsl = serverState.dsl || null;
    const prompt = PromptBuilder.constructPrompt(lastUserMessage, dataContext, currentDsl);
    const dslString = await LLMService.generateUI(prompt);

    let dslObject: any;
    try {
      dslObject = JSON.parse(dslString);
    } catch (e: any) {
      return res.status(200).json({ sessionId, patch: [], note: 'Invalid JSON from LLM; ignored' });
    }

    const oldDsl = serverState.dsl || {};
    const oldRoot = { dsl: oldDsl };
    const newRoot = { dsl: dslObject };
    const patch = compare(oldRoot, newRoot);

    serverState.dsl = dslObject;
    stateStore.set(sessionId, serverState);

    return res.status(200).json({ sessionId, patch });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
};
