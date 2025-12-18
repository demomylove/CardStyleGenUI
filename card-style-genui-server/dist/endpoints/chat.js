"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatOnceHandler = exports.chatHandler = void 0;
const uuid_1 = require("uuid");
const fast_json_patch_1 = require("fast-json-patch");
const PromptBuilder_1 = require("../ai/PromptBuilder");
const LLMService_1 = require("../ai/LLMService");
const AmapService_1 = require("../services/AmapService");
// In-memory session store (MVP)
// In a real app, use Redis or a database.
const stateStore = new Map();
/**
 * Handles the /api/chat endpoint following AG-UI protocol structure.
 * Streams SSE events: TEXT_MESSAGE_CONTENT, STATE_DELTA, DONE.
 */
const chatHandler = async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g;
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
        sendEvent('TEXT_MESSAGE_CONTENT', { delta: "Thinking..." });
        // 2.5 RAG / Context Enrichment (Video Demo Optimization)
        // If user asks about 'coffee', 'nearby', etc., fetch POI data
        const lowerMsg = lastUserMessage.toLowerCase();
        let additionalInstruction = "";
        let forceImmediatePoiRender = false;
        if (lowerMsg.includes('咖啡') || lowerMsg.includes('coffee') || lowerMsg.includes('cafe') || lowerMsg.includes('附近')) {
            console.log("Detected POI intent, fetching data...");
            sendEvent('TEXT_MESSAGE_CONTENT', { delta: "\n(Searching nearby POIs...)" });
            try {
                let keyword = '咖啡';
                if (lowerMsg.includes('咖啡'))
                    keyword = '咖啡';
                const pois = await AmapService_1.AmapService.searchPoi(keyword);
                if (pois.length > 0) {
                    if (!serverState.dataContext)
                        serverState.dataContext = {};
                    serverState.dataContext.pois = pois;
                    console.log(`Injecting ${pois.length} POIs into context.`);
                    // FORCE INSTRUCTION: Do not ask for confirmation
                    additionalInstruction = "\nIMPORTANT: POI data is provided in the Data Context. You MUST render the 'PoiList' component immediately. Do NOT ask 'Do you want to search?'. Do NOT return request_human_input. Just render the card.";
                    // Deterministic fallback: if LLM ignores instruction, we still render directly
                    forceImmediatePoiRender = true;
                }
            }
            catch (err) {
                console.error("POI Search failed", err);
            }
        }
        // 3. Construct Prompt
        const dataContext = serverState.dataContext || {};
        const currentDsl = serverState.dsl || null;
        let prompt = PromptBuilder_1.PromptBuilder.constructPrompt(lastUserMessage, dataContext, currentDsl);
        // Append force instruction if any
        if (additionalInstruction) {
            prompt += additionalInstruction;
        }
        // Helper: construct POI list DSL directly (no LLM)
        const buildPoiDsl = () => ({
            component_type: "Component",
            properties: {
                template_id: "PoiList",
                // Bind server dataContext so template can access {{pois}}
                data_binding: "{{}}"
            }
        });
        // 4. Decide generation path
        let dslString = null;
        if (forceImmediatePoiRender && ((_d = (_c = (_b = serverState.dataContext) === null || _b === void 0 ? void 0 : _b.pois) === null || _c === void 0 ? void 0 : _c.length) !== null && _d !== void 0 ? _d : 0) > 0) {
            // Deterministic: bypass LLM and render PoiList
            const obj = buildPoiDsl();
            dslString = JSON.stringify(obj);
        }
        else {
            dslString = await LLMService_1.LLMService.generateUI(prompt);
        }
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
                // If we already have POIs, override to direct rendering instead of asking user
                if (((_g = (_f = (_e = serverState.dataContext) === null || _e === void 0 ? void 0 : _e.pois) === null || _f === void 0 ? void 0 : _f.length) !== null && _g !== void 0 ? _g : 0) > 0) {
                    console.log("HITL detected but POIs present -> overriding to immediate PoiList render");
                    dslObject = buildPoiDsl();
                }
                else {
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
        // 7. First, ensure client has up-to-date dataContext (so templates like PoiList have data)
        if (serverState.dataContext) {
            try {
                sendEvent('STATE_DELTA', { patch: [
                        { op: 'add', path: '/dataContext', value: serverState.dataContext }
                    ] });
            }
            catch (e) {
                console.warn('Failed to send dataContext patch:', e);
            }
        }
        // 8. Calculate Diff & Send STATE_DELTA for DSL
        const hadOld = Object.prototype.hasOwnProperty.call(serverState, 'dsl') && serverState.dsl != null;
        let rootPatch;
        if (!hadOld) {
            // First render: send a single op to add the entire /dsl object for better client compatibility
            rootPatch = [{ op: 'add', path: '/dsl', value: dslObject }];
        }
        else {
            // Incremental updates afterwards
            const oldRoot = { dsl: serverState.dsl };
            const newRoot = { dsl: dslObject };
            rootPatch = (0, fast_json_patch_1.compare)(oldRoot, newRoot);
        }
        if (rootPatch.length > 0) {
            sendEvent('STATE_DELTA', { patch: rootPatch });
        }
        // 9. Update Server State
        serverState.dsl = dslObject;
        stateStore.set(sessionId, serverState);
        // 10. Finish
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
/**
 * Non-streaming variant: returns JSON once (sessionId + patch),
 * so移动端可在受限网关下回退到一次性响应。
 */
const chatOnceHandler = async (req, res) => {
    var _a;
    const { messages, state, sessionId: reqSessionId } = req.body || {};
    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Invalid payload: missing messages[]' });
    }
    const sessionId = reqSessionId || (0, uuid_1.v4)();
    let serverState = stateStore.get(sessionId) || {};
    if (state === null || state === void 0 ? void 0 : state.dataContext) {
        serverState.dataContext = state.dataContext;
    }
    try {
        const lastUserMessage = ((_a = messages[messages.length - 1]) === null || _a === void 0 ? void 0 : _a.content) || '';
        const dataContext = serverState.dataContext || {};
        // Enrich dataContext with POIs (same logic as streaming) when coffee/nearby intent is detected
        const lowerMsg = lastUserMessage.toLowerCase();
        if (lowerMsg.includes('咖啡') || lowerMsg.includes('coffee') || lowerMsg.includes('cafe') || lowerMsg.includes('附近')) {
            try {
                let keyword = '咖啡';
                if (lowerMsg.includes('咖啡'))
                    keyword = '咖啡';
                const pois = await AmapService_1.AmapService.searchPoi(keyword);
                if (pois.length > 0) {
                    serverState.dataContext = serverState.dataContext || {};
                    serverState.dataContext.pois = pois;
                }
            }
            catch (e) {
                console.warn('chatOnce POI enrichment failed:', (e === null || e === void 0 ? void 0 : e.message) || e);
            }
        }
        const currentDsl = serverState.dsl || null;
        const prompt = PromptBuilder_1.PromptBuilder.constructPrompt(lastUserMessage, serverState.dataContext || {}, currentDsl);
        const dslString = await LLMService_1.LLMService.generateUI(prompt);
        let dslObject;
        try {
            dslObject = JSON.parse(dslString);
        }
        catch (e) {
            return res.status(200).json({ sessionId, patch: [], note: 'Invalid JSON from LLM; ignored' });
        }
        const hadOld = Object.prototype.hasOwnProperty.call(serverState, 'dsl') && serverState.dsl != null;
        const patch = hadOld
            ? (0, fast_json_patch_1.compare)({ dsl: serverState.dsl }, { dsl: dslObject })
            : [{ op: 'add', path: '/dsl', value: dslObject }];
        serverState.dsl = dslObject;
        stateStore.set(sessionId, serverState);
        return res.status(200).json({ sessionId, patch, dataContext: serverState.dataContext || {} });
    }
    catch (e) {
        return res.status(500).json({ error: (e === null || e === void 0 ? void 0 : e.message) || 'Server error' });
    }
};
exports.chatOnceHandler = chatOnceHandler;
