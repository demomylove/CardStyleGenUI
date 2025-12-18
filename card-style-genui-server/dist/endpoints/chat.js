"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatHandler = void 0;
const uuid_1 = require("uuid");
const fast_json_patch_1 = require("fast-json-patch");
const PromptBuilder_1 = require("../ai/PromptBuilder");
const LLMService_1 = require("../ai/LLMService");
// In-memory session store (MVP)
// In a real app, use Redis or a database.
const stateStore = new Map();
/**
 * Handles the /api/chat endpoint following AG-UI protocol structure.
 * Streams SSE events: TEXT_MESSAGE_CONTENT, STATE_DELTA, DONE.
 */
const chatHandler = async (req, res) => {
    var _a;
    const { messages, state, sessionId: reqSessionId } = req.body;
    // 1. Session Management
    const sessionId = reqSessionId || (0, uuid_1.v4)();
    // Initialize state if new session, or retrieve existing
    // For robustness, we might merge client-provided state if session is missing?
    // But for this "Server Source of Truth" pattern, we rely on server state.
    let serverState = stateStore.get(sessionId) || {};
    // If client provided dataContext in state, update our server record
    if (state === null || state === void 0 ? void 0 : state.dataContext) {
        serverState.dataContext = state.dataContext;
    }
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const sendEvent = (type, data) => {
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
        const lastUserMessage = ((_a = messages[messages.length - 1]) === null || _a === void 0 ? void 0 : _a.content) || "";
        // 2. Lifecycle & Initial Thought
        if (!serverState.dsl) {
            sendEvent('THREAD_START', { threadId: sessionId });
        }
        const messageId = (0, uuid_1.v4)();
        sendEvent('MESSAGE_START', { messageId, role: 'assistant' });
        sendEvent('TEXT_MESSAGE_CONTENT', { delta: "Thinking..." });
        // 3. Construct Prompt
        const dataContext = serverState.dataContext || {};
        const currentDsl = serverState.dsl || null;
        const prompt = PromptBuilder_1.PromptBuilder.constructPrompt(lastUserMessage, dataContext, currentDsl);
        // 4. Call LLM
        const dslString = await LLMService_1.LLMService.generateUI(prompt);
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
                sendEvent('MESSAGE_END', { messageId: (0, uuid_1.v4)() });
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
                sendEvent('MESSAGE_END', { messageId: (0, uuid_1.v4)() });
                res.write('data: [DONE]\n\n');
                res.end();
                return;
            }
        }
        catch (error) {
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
        const patch = (0, fast_json_patch_1.compare)(oldDsl, dslObject);
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
            const rootPatch = (0, fast_json_patch_1.compare)(oldRoot, newRoot);
            sendEvent('STATE_DELTA', { patch: rootPatch });
        }
        // 8. Update Server State
        serverState.dsl = dslObject;
        stateStore.set(sessionId, serverState);
        // 9. Finish
        sendEvent('MESSAGE_END', { messageId: (0, uuid_1.v4)() }); // Ideally use same ID as start
        res.write('data: [DONE]\n\n');
        res.end();
    }
    catch (error) {
        console.error("Handler error:", error);
        sendEvent('TEXT_MESSAGE_CONTENT', { delta: `\nServer Error: ${error.message}` });
        res.write('data: [DONE]\n\n');
        res.end();
    }
};
exports.chatHandler = chatHandler;
