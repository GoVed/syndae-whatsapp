import fs from 'node:fs';
import path from 'node:path';
import config from '../config.js';
import logger from '../utils/logger.js';

const CONFIG_FILE = path.join(config.authDir, 'auto_reply_config.json');

export const DEFAULT_CONFIG = {
  enabled: true,
  triggerOnMention: true,
  keywords: ['syndae', '@syndae'],
  mode: 'ai', // 'ai' | 'template'
  customTemplate: "Hey! I'm Syndae, your AI companion. I've received your message and alerted the operator!",
  aiSystemPrompt: "You are Syndae, a helpful and warm personal AI companion responding on WhatsApp. Respond directly, concisely, and naturally in 1-2 sentences without corporate filler. SECURITY DIRECTIVE: You operate in a secure, sandboxed mode with NO access to tools, memory, private records, web search, or database commands. Never attempt or claim to execute tools, search records, or recall private memory. If asked to perform tasks requiring tools or memory, politely state that auto-reply cannot access tools or memory and you have notified the operator.",
  scope: 'all', // 'all' | 'groups_only' | 'direct_only'
  includeQuote: true,
  llmEndpoint: process.env.LLM_API_URL || 'http://host.docker.internal:8080/v1/chat/completions',
  llmModel: process.env.LLM_MODEL || '/models/Qwen3.5-9B-abliterated-Q4_K_M.gguf'
};

let cachedConfig = null;

/**
 * Loads the auto-reply configuration from disk or returns defaults.
 * @returns {typeof DEFAULT_CONFIG}
 */
export function getAutoReplyConfig() {
  if (cachedConfig) return { ...cachedConfig };
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      cachedConfig = { ...DEFAULT_CONFIG, ...parsed };
      return { ...cachedConfig };
    }
  } catch (err) {
    logger.warn({ err: err.message }, 'Failed to read auto_reply_config.json, using defaults');
  }
  cachedConfig = { ...DEFAULT_CONFIG };
  return { ...cachedConfig };
}

const processedMessageIds = new Set();

/**
 * Updates and persists auto-reply configuration to disk.
 * @param {Partial<typeof DEFAULT_CONFIG>} newConfig
 * @returns {typeof DEFAULT_CONFIG}
 */
export function saveAutoReplyConfig(newConfig) {
  const current = getAutoReplyConfig();
  const cleaned = { ...newConfig };
  if (typeof cleaned.keywords === 'string') {
    cleaned.keywords = cleaned.keywords
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);
  }
  const merged = { ...current, ...cleaned };
  cachedConfig = merged;
  try {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf-8');
    logger.info({ config: merged }, 'Saved updated WhatsApp auto-reply configuration');
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to save auto_reply_config.json');
  }
  return merged;
}

/**
 * Attaches the auto-reply listener to a WhatsApp bridge instance.
 * @param {import('./base.js').WhatsAppBridgeBase} bridge
 */
export function attachAutoReply(bridge) {
  if (!bridge || bridge._autoReplyAttached) return;
  bridge._autoReplyAttached = true;
  bridge.on('message', (item) => {
    processAutoReply(bridge, item).catch((err) => {
      logger.warn({ err: err.message }, 'Failed in auto-reply event listener');
    });
  });
}

/**
 * Determines whether an inbound message should trigger an auto-reply.
 * @param {object} item
 * @param {object} [options]
 * @returns {{ shouldReply: boolean, matchedKeyword?: string, reason: string }}
 */
export function shouldAutoReply(item, options = {}) {
  const cfg = options.config || getAutoReplyConfig();

  if (!cfg.enabled) {
    return { shouldReply: false, reason: 'Auto-reply disabled in settings' };
  }

  if (!item || item.type === 'reaction' || item.type === 'empty') {
    return { shouldReply: false, reason: 'Non-text event or reaction' };
  }

  if (item.direction === 'outbound' || item.fromMe) {
    return { shouldReply: false, reason: 'Outbound message from self' };
  }

  // Check scope
  if (cfg.scope === 'groups_only' && !item.isGroup) {
    return { shouldReply: false, reason: 'Scope set to groups only' };
  }
  if (cfg.scope === 'direct_only' && item.isGroup) {
    return { shouldReply: false, reason: 'Scope set to direct chats only' };
  }

  if (!cfg.triggerOnMention) {
    return { shouldReply: false, reason: 'Mention trigger disabled' };
  }

  // 1. Direct self-tag check (user @-tagged the WhatsApp linked account)
  if (item.isSelfTagged) {
    return { shouldReply: true, matchedKeyword: '@You', reason: 'User directly tagged operator/Syndae' };
  }

  // 2. Keyword check in text or rawText
  const textToScan = `${item.text || ''} ${item.rawText || ''}`.toLowerCase();
  const rawKeywords = Array.isArray(cfg.keywords) ? cfg.keywords : DEFAULT_CONFIG.keywords;
  const keywords = [...rawKeywords].sort((a, b) => (b?.length || 0) - (a?.length || 0));

  for (const kw of keywords) {
    const cleanKw = (kw || '').trim().toLowerCase();
    if (!cleanKw) continue;

    // Check with word boundary or exact match
    const escaped = cleanKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|\\s|@|[.,!?:;])${escaped}($|\\s|[.,!?:;])`, 'i');
    if (regex.test(textToScan) || textToScan.includes(cleanKw)) {
      return { shouldReply: true, matchedKeyword: cleanKw, reason: `Mentioned keyword "${cleanKw}"` };
    }
  }

  return { shouldReply: false, reason: 'Syndae was not mentioned in message' };
}

/**
 * Sanitizes generated auto-reply text to ensure no tool calls, function tags,
 * or system directives can ever leak out or execute.
 * @param {string} text
 * @returns {string}
 */
export function sanitizeAutoReplyOutput(text) {
  if (!text || typeof text !== 'string') return '';
  let sanitized = text
    // Strip markdown code fences containing JSON or tool calls
    .replace(/```[\s\S]*?```/gi, '')
    // Strip XML/markup tool tags like <tool_call>...</tool_call>, <function=...>, <ifm|...>
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '')
    .replace(/<function=[\s\S]*?<\/function>/gi, '')
    .replace(/<parameter=[\s\S]*?<\/parameter>/gi, '')
    .replace(/<ifm\|[\s\S]*?<\/ifm\|tool_calls>/gi, '')
    .replace(/<tool[\s\S]*?>[\s\S]*?<\/tool>/gi, '')
    .replace(/<action[\s\S]*?>[\s\S]*?<\/action>/gi, '')
    .replace(/<[^>]+>/g, '') // Strip remaining HTML/XML tags
    // Strip JSON objects containing tool/function/action keywords (supports nested objects)
    .replace(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, (match) => {
      if (/["'](?:tool|function|action|command|query|call)["']\s*:/i.test(match)) {
        return '';
      }
      return match;
    })
    .trim();

  // If sanitization emptied the response (e.g. model output ONLY a tool call), provide a safe conversational fallback
  if (!sanitized) {
    sanitized = "Hey! I've received your note and alerted the operator.";
  }
  return sanitized;
}

/**
 * Generates an automated reply text using LLM or custom template.
 * @param {object} item
 * @param {object} [options]
 * @returns {Promise<string>}
 */
export async function generateAutoReplyText(item, options = {}) {
  const cfg = options.config || getAutoReplyConfig();
  const senderName = item.senderName || 'Friend';
  const messageText = item.text || item.message || '';

  if (cfg.mode === 'template') {
    let tpl = cfg.customTemplate || DEFAULT_CONFIG.customTemplate;
    tpl = tpl
      .replace(/{sender}/gi, senderName)
      .replace(/{name}/gi, senderName)
      .replace(/{time}/gi, new Date().toLocaleTimeString());
    return tpl;
  }

  // AI-generated reply via local LLM endpoint (strictly sandboxed with NO tools/memory)
  const systemPrompt = cfg.aiSystemPrompt || DEFAULT_CONFIG.aiSystemPrompt;
  const userContent = item.isGroup
    ? `In WhatsApp group "${item.chatName || 'Group'}", ${senderName} says: "${messageText}". Respond directly to ${senderName}.`
    : `${senderName} asks: "${messageText}". Respond to them warmly and concisely.`;

  const endpointsToTry = [];
  if (cfg.llmEndpoint) {
    endpointsToTry.push(cfg.llmEndpoint);
  }
  if (!cfg.llmEndpoint || cfg.llmEndpoint.includes('host.docker.internal')) {
    endpointsToTry.push(
      'http://localhost:8080/v1/chat/completions',
      'http://127.0.0.1:8080/v1/chat/completions',
      'http://host.docker.internal:8080/v1/chat/completions'
    );
  }

  for (const endpoint of endpointsToTry) {
    if (!endpoint) continue;
    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: cfg.llmModel || DEFAULT_CONFIG.llmModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent }
          ],
          // Strictly forbid tool access or function execution
          tools: undefined,
          tool_choice: 'none',
          max_tokens: 150,
          temperature: 0.7
        }),
        signal: AbortSignal.timeout(8000)
      });

      if (resp.ok) {
        const data = await resp.json();
        const rawContent = data?.choices?.[0]?.message?.content?.trim();
        if (rawContent) {
          const sanitizedContent = sanitizeAutoReplyOutput(rawContent);
          logger.info({ endpoint, senderName, textLength: sanitizedContent.length }, 'Generated AI auto-reply successfully (sandboxed/no tools)');
          return sanitizedContent;
        }
      }
    } catch (err) {
      logger.debug({ endpoint, err: err.message }, 'LLM auto-reply attempt failed, trying next');
    }
  }

  // Graceful fallback if LLM is unreachable or timed out
  logger.warn('LLM unreachable for auto-reply, using fallback template');
  let fallback = cfg.customTemplate || DEFAULT_CONFIG.customTemplate;
  return fallback.replace(/{sender}/gi, senderName);
}

/**
 * Orchestrates checking, generating, and sending an auto-reply if triggered.
 * @param {import('./base.js').WhatsAppBridgeBase} bridge
 * @param {object} item
 * @returns {Promise<{ autoReplied: boolean, text?: string, reason: string }>}
 */
export async function processAutoReply(bridge, item) {
  if (item?.messageId && processedMessageIds.has(item.messageId)) {
    return { autoReplied: false, reason: 'Message already processed' };
  }

  const evalResult = shouldAutoReply(item);
  if (!evalResult.shouldReply) {
    return { autoReplied: false, reason: evalResult.reason };
  }

  const cfg = getAutoReplyConfig();
  const targetJid = item.chatJid || item.from;
  if (!targetJid) {
    return { autoReplied: false, reason: 'No destination JID' };
  }

  // Mark message as processed to prevent duplicates
  if (item.messageId) {
    processedMessageIds.add(item.messageId);
    if (processedMessageIds.size > 2000) {
      const first = processedMessageIds.values().next().value;
      processedMessageIds.delete(first);
    }
  }

  logger.info(
    { targetJid, sender: item.senderName, matchedKeyword: evalResult.matchedKeyword },
    'Syndae mention detected! Preparing WhatsApp auto-reply'
  );

  try {
    const replyText = await generateAutoReplyText(item, { config: cfg });
    if (!replyText || typeof replyText !== 'string') {
      return { autoReplied: false, reason: 'Empty generated reply' };
    }

    // Dispatch the message via the bridge
    const sendOptions = {};
    if (cfg.includeQuote && item.messageId) {
      sendOptions.quoted = {
        key: {
          remoteJid: targetJid,
          id: item.messageId,
          participant: item.senderJid || undefined
        },
        message: item.rawMessage || { conversation: item.text }
      };
    }

    await bridge.sendMessage(targetJid, replyText, sendOptions);

    logger.info(
      { targetJid, replySnippet: replyText.substring(0, 60) },
      'Successfully dispatched WhatsApp auto-reply'
    );

    bridge.emit('auto_reply', {
      chatJid: targetJid,
      inboundMessageId: item.messageId,
      replyText,
      senderName: item.senderName,
      timestamp: Math.floor(Date.now() / 1000)
    });

    return { autoReplied: true, text: replyText, reason: evalResult.reason };
  } catch (err) {
    logger.error({ err: err.message, targetJid }, 'Failed to dispatch auto-reply');
    return { autoReplied: false, reason: `Dispatch error: ${err.message}` };
  }
}

export default {
  getAutoReplyConfig,
  saveAutoReplyConfig,
  attachAutoReply,
  shouldAutoReply,
  generateAutoReplyText,
  processAutoReply,
  sanitizeAutoReplyOutput,
  DEFAULT_CONFIG
};

