/**
 * Renders the HTML page for WhatsApp pairing, status display, and Auto-Reply configuration.
 *
 * @param {object} status Bridge status object
 * @param {string} initialQrUrl Base64 data URL for the QR code
 * @param {string} latestQr Raw QR code string
 * @param {object} [initialConfig] Current auto-reply configuration
 * @returns {string} Complete HTML document
 */
export function renderQrPage(status, initialQrUrl = '', latestQr = '', initialConfig = null) {
  const isConnected = status.status === 'connected';
  const cfgJson = JSON.stringify(initialConfig || {});
  const userPhone = status.user?.phone || status.user?.id || 'Connected';
  const mode = status.mode || 'live';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Syndae WhatsApp Dashboard & Auto-Reply</title>
  <style>
    :root {
      --bg-main: #0b0f19;
      --bg-card: #111827;
      --bg-card-alt: #1a2234;
      --bg-input: #0e1524;
      --border-color: #24324d;
      --border-focus: #4f46e5;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --text-sub: #64748b;
      --primary: #4f46e5;
      --primary-hover: #4338ca;
      --success: #10b981;
      --success-bg: #064e3b;
      --warning: #f59e0b;
      --warning-bg: #78350f;
      --radius: 12px;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: var(--bg-main);
      color: var(--text-main);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1.5rem 1rem 3rem 1rem;
      -webkit-font-smoothing: antialiased;
    }

    .container {
      max-width: 860px;
      width: 100%;
    }

    /* Header */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      padding: 1rem 0 1.5rem 0;
      border-bottom: 1px solid var(--border-color);
      margin-bottom: 1.75rem;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .brand-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, #4f46e5, #06b6d4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 1.2rem;
      color: #fff;
    }

    .brand h1 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #fff;
      letter-spacing: -0.02em;
    }

    .brand p {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .header-badges {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 5px 12px;
      border-radius: 9999px;
      border: 1px solid transparent;
    }

    .badge-success {
      background: #064e3b;
      color: #34d399;
      border-color: #059669;
    }

    .badge-warning {
      background: #451a03;
      color: #fbbf24;
      border-color: #b45309;
    }

    .badge-mode {
      background: #1e1b4b;
      color: #a5b4fc;
      border-color: #4338ca;
    }

    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
    }

    .dot-pulse {
      animation: pulse 1.8s infinite;
    }

    @keyframes pulse {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
      100% { opacity: 1; transform: scale(1); }
    }

    /* Tabs */
    .tabs-nav {
      display: flex;
      gap: 0.5rem;
      border-bottom: 1px solid var(--border-color);
      margin-bottom: 1.75rem;
    }

    .tab-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 0.925rem;
      font-weight: 600;
      padding: 0.75rem 1.25rem;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s ease;
    }

    .tab-btn:hover {
      color: var(--text-main);
    }

    .tab-btn.active {
      color: #818cf8;
      border-bottom-color: #6366f1;
    }

    .tab-pane {
      display: none;
    }

    .tab-pane.active {
      display: block;
      animation: fadeIn 0.2s ease-in-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Card Panels */
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      padding: 1.75rem;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
      margin-bottom: 1.5rem;
    }

    .card-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-bottom: 0.35rem;
    }

    .card-desc {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-bottom: 1.5rem;
      line-height: 1.45;
    }

    /* QR Pairing Section */
    .qr-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 1rem 0;
    }

    .qr-box {
      background: #ffffff;
      padding: 16px;
      border-radius: 16px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.5);
      margin: 1rem 0 1.5rem 0;
      min-width: 270px;
      min-height: 270px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .qr-box img {
      width: 260px;
      height: 260px;
      display: block;
    }

    .instructions-box {
      background: var(--bg-card-alt);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 1.25rem 1.5rem;
      max-width: 480px;
      width: 100%;
      text-align: left;
      font-size: 0.85rem;
      color: #cbd5e1;
    }

    .instructions-box ol {
      margin-left: 1.2rem;
    }

    .instructions-box li {
      margin-bottom: 0.5rem;
      line-height: 1.4;
    }

    .instructions-box li:last-child {
      margin-bottom: 0;
    }

    /* Connected View */
    .connected-box {
      text-align: center;
      padding: 2.5rem 1rem;
    }

    .connected-icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #064e3b;
      color: #34d399;
      font-size: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.25rem auto;
      border: 2px solid #059669;
    }

    .phone-pill {
      display: inline-block;
      background: var(--bg-card-alt);
      color: #a7f3d0;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 1.1rem;
      font-weight: 600;
      padding: 0.6rem 1.25rem;
      border-radius: 8px;
      border: 1px solid #065f46;
      margin: 1rem 0;
    }

    /* Form Controls */
    .form-group {
      margin-bottom: 1.35rem;
    }

    .form-group:last-child {
      margin-bottom: 0;
    }

    .form-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 600;
      color: #e2e8f0;
      margin-bottom: 0.4rem;
    }

    .form-hint {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 0.35rem;
      line-height: 1.4;
    }

    .input-text, .select-input, .textarea-input {
      width: 100%;
      background: var(--bg-input);
      border: 1px solid var(--border-color);
      color: #fff;
      padding: 0.7rem 0.9rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-family: inherit;
      transition: border-color 0.2s;
    }

    .input-text:focus, .select-input:focus, .textarea-input:focus {
      outline: none;
      border-color: #6366f1;
    }

    .textarea-input {
      min-height: 100px;
      resize: vertical;
      line-height: 1.45;
    }

    /* Switch Component */
    .switch-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--bg-card-alt);
      padding: 1rem 1.25rem;
      border-radius: 10px;
      border: 1px solid var(--border-color);
      margin-bottom: 1.5rem;
    }

    .switch-text h4 {
      font-size: 0.95rem;
      font-weight: 600;
      color: #fff;
      margin-bottom: 0.2rem;
    }

    .switch-text p {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .switch {
      position: relative;
      display: inline-block;
      width: 48px;
      height: 26px;
      flex-shrink: 0;
    }

    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: #334155;
      transition: .3s;
      border-radius: 34px;
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 20px;
      width: 20px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .3s;
      border-radius: 50%;
    }

    input:checked + .slider {
      background-color: #10b981;
    }

    input:checked + .slider:before {
      transform: translateX(22px);
    }

    /* Radio Cards */
    .radio-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 0.75rem;
    }

    .radio-card {
      background: var(--bg-input);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 0.85rem 1rem;
      cursor: pointer;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      transition: all 0.2s;
    }

    .radio-card:hover {
      border-color: #475569;
    }

    .radio-card.active {
      border-color: #6366f1;
      background: #1e1b4b;
    }

    .radio-card input {
      margin-top: 0.2rem;
    }

    .radio-card-content h5 {
      font-size: 0.875rem;
      font-weight: 600;
      color: #fff;
      margin-bottom: 0.2rem;
    }

    .radio-card-content p {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    /* Tag Pills */
    .tags-preview {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      margin-top: 0.5rem;
    }

    .tag-chip {
      background: #1e293b;
      color: #38bdf8;
      border: 1px solid #0284c7;
      font-size: 0.75rem;
      font-weight: 500;
      padding: 3px 8px;
      border-radius: 6px;
    }

    /* Buttons */
    .btn-row {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.75rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--border-color);
    }

    .btn {
      padding: 0.65rem 1.25rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      border: 1px solid transparent;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #4f46e5;
      color: #fff;
    }

    .btn-primary:hover {
      background: #4338ca;
    }

    .btn-secondary {
      background: var(--bg-card-alt);
      color: #cbd5e1;
      border-color: var(--border-color);
    }

    .btn-secondary:hover {
      background: #24324d;
      color: #fff;
    }

    .toast {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      padding: 0.85rem 1.25rem;
      background: #064e3b;
      color: #34d399;
      border: 1px solid #059669;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      display: none;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      z-index: 100;
      animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    /* Simulator Chat Preview */
    .sim-response-card {
      margin-top: 1.25rem;
      padding: 1.25rem;
      background: var(--bg-card-alt);
      border-radius: 10px;
      border: 1px solid var(--border-color);
      display: none;
    }

    .whatsapp-bubble {
      background: #005c4b;
      color: #e9edef;
      padding: 0.85rem 1rem;
      border-radius: 8px 8px 2px 8px;
      font-size: 0.9rem;
      line-height: 1.4;
      max-width: 85%;
      margin: 0.75rem 0 0 auto;
      border-left: 3px solid #25d366;
    }

    .whatsapp-bubble-quote {
      background: rgba(0,0,0,0.2);
      border-left: 3px solid #25d366;
      padding: 4px 8px;
      font-size: 0.78rem;
      color: #8696a0;
      margin-bottom: 6px;
      border-radius: 4px;
    }

    footer {
      margin-top: 2rem;
      text-align: center;
      font-size: 0.8rem;
      color: var(--text-sub);
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        <div class="brand-icon">S</div>
        <div>
          <h1>Syndae WhatsApp Connector</h1>
          <p>Bi-directional companion relay & autonomous messaging</p>
        </div>
      </div>
      <div class="header-badges">
        <span class="badge badge-mode">● ${mode.toUpperCase()}</span>
        <span id="connBadge" class="badge ${isConnected ? 'badge-success' : 'badge-warning'}">
          <span class="dot ${isConnected ? '' : 'dot-pulse'}"></span>
          <span id="connBadgeText">${isConnected ? `Connected: ${userPhone}` : 'Pairing Required'}</span>
        </span>
      </div>
    </header>

    <div class="tabs-nav">
      <button class="tab-btn active" data-tab="tab-config">
        <span>⚡</span> Auto-Reply Settings
      </button>
      <button class="tab-btn" data-tab="tab-pairing">
        <span>📱</span> Pairing & Connection
      </button>
      <button class="tab-btn" data-tab="tab-test">
        <span>🧪</span> Mention Tester
      </button>
    </div>

    <!-- TAB 1: Auto-Reply Settings -->
    <div id="tab-config" class="tab-pane active">
      <div class="card">
        <div class="card-title">
          <span>⚡</span> Syndae Mention Auto-Reply
        </div>
        <p class="card-desc">
          Automatically answer inbound WhatsApp messages when "Syndae" is mentioned. Configure the trigger rules, personas, and response mode below.
        </p>

        <!-- Security Sandbox Notice -->
        <div style="background:#0f172a; border:1px solid #1e293b; border-left:4px solid #38bdf8; border-radius:8px; padding:0.85rem 1rem; margin-bottom:1.5rem; display:flex; align-items:flex-start; gap:0.75rem;">
          <div style="font-size:1.25rem; line-height:1;">🔒</div>
          <div style="font-size:0.825rem; color:#94a3b8; line-height:1.45;">
            <strong style="color:#f1f5f9; display:block; margin-bottom:2px;">Tool & Memory Isolation Guarantee</strong>
            Auto-reply runs in a completely sandboxed conversational environment. It has <strong>zero access</strong> to system tools, file system, web search, memory retrieval, or database queries. Responses are strictly limited to direct conversational acknowledgments.
          </div>
        </div>

        <!-- Master Switch -->
        <div class="switch-container">
          <div class="switch-text">
            <h4>Enable Auto-Reply</h4>
            <p>Listen for incoming mentions of Syndae and respond automatically</p>
          </div>
          <label class="switch">
            <input type="checkbox" id="cfgEnabled">
            <span class="slider"></span>
          </label>
        </div>

        <!-- Trigger on Tag -->
        <div class="form-group">
          <label class="form-label">Mention Keywords</label>
          <input type="text" id="cfgKeywords" class="input-text" placeholder="syndae, @syndae">
          <div class="form-hint">Comma-separated words or tags that trigger an automated response.</div>
          <div class="tags-preview" id="tagsPreview"></div>
        </div>

        <div class="form-group" style="margin-top: 1rem;">
          <label style="display:flex; align-items:center; gap:8px; font-size:0.875rem; color:#e2e8f0; cursor:pointer;">
            <input type="checkbox" id="cfgTriggerOnMention" style="accent-color:#4f46e5;">
            Trigger automatically on direct WhatsApp @mentions of this account
          </label>
        </div>

        <!-- Scope -->
        <div class="form-group" style="margin-top: 1.5rem;">
          <label class="form-label">Chat Scope</label>
          <div class="radio-grid">
            <label class="radio-card" id="cardScopeAll">
              <input type="radio" name="scope" value="all" id="scopeAll">
              <div class="radio-card-content">
                <h5>🌐 All Chats</h5>
                <p>Respond in both direct messages and group chats</p>
              </div>
            </label>
            <label class="radio-card" id="cardScopeGroups">
              <input type="radio" name="scope" value="groups_only" id="scopeGroups">
              <div class="radio-card-content">
                <h5>👥 Groups Only</h5>
                <p>Only respond when tagged or mentioned inside group chats</p>
              </div>
            </label>
            <label class="radio-card" id="cardScopeDirect">
              <input type="radio" name="scope" value="direct_only" id="scopeDirect">
              <div class="radio-card-content">
                <h5>👤 Direct Only</h5>
                <p>Only respond in 1-on-1 private conversations</p>
              </div>
            </label>
          </div>
        </div>

        <!-- Response Generation Mode -->
        <div class="form-group" style="margin-top: 1.5rem;">
          <label class="form-label">Response Generation Engine</label>
          <div class="radio-grid">
            <label class="radio-card" id="cardModeAi">
              <input type="radio" name="mode" value="ai" id="modeAi">
              <div class="radio-card-content">
                <h5>🤖 AI Companion (Local LLM)</h5>
                <p>Generates dynamic, natural replies using local Qwen model</p>
              </div>
            </label>
            <label class="radio-card" id="cardModeTemplate">
              <input type="radio" name="mode" value="template" id="modeTemplate">
              <div class="radio-card-content">
                <h5>📝 Custom Template</h5>
                <p>Responds with a fixed customizable message template</p>
              </div>
            </label>
          </div>
        </div>

        <!-- AI Engine Settings -->
        <div id="aiSettingsBlock" style="margin-top: 1.25rem;">
          <div class="form-group">
            <label class="form-label">AI System Prompt / Personality</label>
            <textarea id="cfgAiSystemPrompt" class="textarea-input" placeholder="You are Syndae, a helpful and warm personal AI companion..."></textarea>
            <div class="form-hint">Defines the persona and tone used for WhatsApp automated replies. Keep instructions concise for fast generation.</div>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
            <div class="form-group">
              <label class="form-label">Local LLM Endpoint</label>
              <input type="text" id="cfgLlmEndpoint" class="input-text" placeholder="http://host.docker.internal:8080/v1/chat/completions">
            </div>
            <div class="form-group">
              <label class="form-label">LLM Model Name</label>
              <input type="text" id="cfgLlmModel" class="input-text" placeholder="/models/Huihui-Qwen3.8-27B-abliterated-UD-IQ3_S.gguf">
            </div>
          </div>
        </div>

        <!-- Template Engine Settings -->
        <div id="templateSettingsBlock" style="margin-top: 1.25rem; display:none;">
          <div class="form-group">
            <label class="form-label">Custom Template Text</label>
            <textarea id="cfgCustomTemplate" class="textarea-input" placeholder="Hey {sender}! I'm Syndae, your AI companion. I've received your note!"></textarea>
            <div class="form-hint">Available tokens: <code>{sender}</code> (sender name), <code>{time}</code> (current time), <code>{message}</code> (original text).</div>
          </div>
        </div>

        <!-- Quote Toggle -->
        <div class="form-group" style="margin-top: 1.25rem;">
          <label style="display:flex; align-items:center; gap:8px; font-size:0.875rem; color:#e2e8f0; cursor:pointer;">
            <input type="checkbox" id="cfgIncludeQuote" style="accent-color:#4f46e5;">
            Quote the original message in WhatsApp reply
          </label>
        </div>

        <div class="btn-row">
          <button type="button" class="btn btn-secondary" id="btnReset">Reset Defaults</button>
          <button type="button" class="btn btn-primary" id="btnSave">💾 Save Configuration</button>
        </div>
      </div>
    </div>

    <!-- TAB 2: Pairing & Connection -->
    <div id="tab-pairing" class="tab-pane">
      <div class="card" id="pairingCard">
        <div class="card-title">
          <span>📱</span> WhatsApp Web Connection
        </div>
        <p class="card-desc">
          Scan the QR code with WhatsApp on your mobile device to link this companion relay.
        </p>

        <div id="pairingStateConnected" style="${isConnected ? 'display:block;' : 'display:none;'}">
          <div class="connected-box">
            <div class="connected-icon">✓</div>
            <h3 style="font-size:1.4rem; color:#fff; margin-bottom:0.4rem;">WhatsApp Connected!</h3>
            <p style="color:var(--text-muted); font-size:0.9rem;">Your account is linked and ready to interact with Syndae.</p>
            <div class="phone-pill" id="connectedPhoneDisplay">${userPhone}</div>
            <p style="color:var(--text-sub); font-size:0.8rem; margin-top:0.75rem;">
              Session is actively synchronized. Auto-reply is active according to your configuration.
            </p>
          </div>
        </div>

        <div id="pairingStateDisconnected" style="${isConnected ? 'display:none;' : 'display:block;'}">
          <div class="qr-container">
            <div class="qr-box">
              <img id="qrImg" src="${initialQrUrl}" alt="WhatsApp QR Code" style="${initialQrUrl ? '' : 'display:none;'}">
              <div id="loadingQr" style="display:${initialQrUrl ? 'none' : 'flex'}; color:#0f172a; font-weight:600; font-size:0.9rem;">
                Generating fresh QR pairing code...
              </div>
            </div>

            <div class="instructions-box">
              <ol>
                <li>Open <b>WhatsApp</b> on your mobile phone</li>
                <li>Go to <b>Settings</b> (iOS) or <b>⋮ Menu</b> (Android)</li>
                <li>Tap <b>Linked Devices</b></li>
                <li>Tap <b>Link a Device</b> and point camera at the QR code</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: Mention Tester -->
    <div id="tab-test" class="tab-pane">
      <div class="card">
        <div class="card-title">
          <span>🧪</span> Live Auto-Reply Simulator
        </div>
        <p class="card-desc">
          Test whether a message triggers an auto-reply and preview the generated response without sending any real messages.
        </p>

        <div class="form-group">
          <label class="form-label">Sender Name</label>
          <input type="text" id="testSender" class="input-text" value="Alice">
        </div>

        <div class="form-group">
          <label class="form-label">Chat Environment</label>
          <div style="display:flex; gap:1rem; margin-top:0.35rem;">
            <label style="display:flex; align-items:center; gap:6px; font-size:0.85rem; color:#cbd5e1; cursor:pointer;">
              <input type="radio" name="testChatType" value="direct" checked> Direct Chat (1-on-1)
            </label>
            <label style="display:flex; align-items:center; gap:6px; font-size:0.85rem; color:#cbd5e1; cursor:pointer;">
              <input type="radio" name="testChatType" value="group"> Group Chat
            </label>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Inbound Message Text</label>
          <textarea id="testMessageText" class="textarea-input" style="min-height:75px;" placeholder="Type something with 'Syndae'...">Hey Syndae, are you working right now?</textarea>
        </div>

        <button type="button" class="btn btn-primary" id="btnRunTest" style="margin-top:0.5rem;">
          🚀 Test Trigger & Preview Reply
        </button>

        <div id="simResultCard" class="sim-response-card">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
            <div style="font-weight:700; font-size:0.95rem; color:#fff;" id="simStatusTitle">Result</div>
            <span id="simBadge" class="badge"></span>
          </div>
          <div style="font-size:0.85rem; color:var(--text-muted); margin-top:0.4rem;" id="simReason"></div>

          <div id="simBubbleContainer" style="display:none; margin-top:1rem;">
            <div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-sub); margin-bottom:0.25rem;">
              WhatsApp Preview:
            </div>
            <div class="whatsapp-bubble">
              <div class="whatsapp-bubble-quote" id="simQuotePreview" style="display:none;"></div>
              <div id="simReplyText"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <footer>
      Syndae Agent OS • Bi-directional WhatsApp Integration Daemon • MCP 2024-11-05
    </footer>
  </div>

  <div id="toast" class="toast">✓ Configuration saved successfully!</div>

  <script>
    let initialConfig = ${cfgJson};
    let currentConfig = { ...initialConfig };

    // Tab Navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const target = document.getElementById(btn.getAttribute('data-tab'));
        if (target) target.classList.add('active');
      });
    });

    // Populate Form from Config
    function populateForm(cfg) {
      currentConfig = { ...cfg };
      document.getElementById('cfgEnabled').checked = Boolean(cfg.enabled);
      document.getElementById('cfgTriggerOnMention').checked = Boolean(cfg.triggerOnMention);
      document.getElementById('cfgKeywords').value = Array.isArray(cfg.keywords) ? cfg.keywords.join(', ') : (cfg.keywords || 'syndae, @syndae');
      renderKeywordTags();

      // Scope
      const scope = cfg.scope || 'all';
      const scopeRadio = document.querySelector(\`input[name="scope"][value="\${scope}"]\`);
      if (scopeRadio) scopeRadio.checked = true;
      updateScopeCards();

      // Mode
      const mode = cfg.mode || 'ai';
      const modeRadio = document.querySelector(\`input[name="mode"][value="\${mode}"]\`);
      if (modeRadio) modeRadio.checked = true;
      updateModeBlocks();

      document.getElementById('cfgAiSystemPrompt').value = cfg.aiSystemPrompt || '';
      document.getElementById('cfgLlmEndpoint').value = cfg.llmEndpoint || '';
      document.getElementById('cfgLlmModel').value = cfg.llmModel || '';
      document.getElementById('cfgCustomTemplate').value = cfg.customTemplate || '';
      document.getElementById('cfgIncludeQuote').checked = Boolean(cfg.includeQuote);
    }

    function renderKeywordTags() {
      const val = document.getElementById('cfgKeywords').value;
      const tagsContainer = document.getElementById('tagsPreview');
      tagsContainer.innerHTML = '';
      const parts = val.split(',').map(s => s.trim()).filter(Boolean);
      parts.forEach(p => {
        const span = document.createElement('span');
        span.className = 'tag-chip';
        span.textContent = p;
        tagsContainer.appendChild(span);
      });
    }

    document.getElementById('cfgKeywords').addEventListener('input', renderKeywordTags);

    function updateScopeCards() {
      const selected = document.querySelector('input[name="scope"]:checked')?.value || 'all';
      ['All', 'Groups', 'Direct'].forEach(s => {
        const card = document.getElementById(\`cardScope\${s}\`);
        if (card) {
          card.classList.toggle('active', s.toLowerCase() === selected.replace('_only', ''));
        }
      });
    }

    document.querySelectorAll('input[name="scope"]').forEach(r => {
      r.addEventListener('change', updateScopeCards);
    });

    function updateModeBlocks() {
      const selected = document.querySelector('input[name="mode"]:checked')?.value || 'ai';
      document.getElementById('cardModeAi')?.classList.toggle('active', selected === 'ai');
      document.getElementById('cardModeTemplate')?.classList.toggle('active', selected === 'template');
      document.getElementById('aiSettingsBlock').style.display = selected === 'ai' ? 'block' : 'none';
      document.getElementById('templateSettingsBlock').style.display = selected === 'template' ? 'block' : 'none';
    }

    document.querySelectorAll('input[name="mode"]').forEach(r => {
      r.addEventListener('change', updateModeBlocks);
    });

    function showToast(msg) {
      const toast = document.getElementById('toast');
      toast.textContent = msg;
      toast.style.display = 'block';
      setTimeout(() => { toast.style.display = 'none'; }, 3000);
    }

    // Save Configuration
    document.getElementById('btnSave').addEventListener('click', async () => {
      const saveBtn = document.getElementById('btnSave');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      const payload = {
        enabled: document.getElementById('cfgEnabled').checked,
        triggerOnMention: document.getElementById('cfgTriggerOnMention').checked,
        keywords: document.getElementById('cfgKeywords').value,
        scope: document.querySelector('input[name="scope"]:checked')?.value || 'all',
        mode: document.querySelector('input[name="mode"]:checked')?.value || 'ai',
        aiSystemPrompt: document.getElementById('cfgAiSystemPrompt').value,
        llmEndpoint: document.getElementById('cfgLlmEndpoint').value,
        llmModel: document.getElementById('cfgLlmModel').value,
        customTemplate: document.getElementById('cfgCustomTemplate').value,
        includeQuote: document.getElementById('cfgIncludeQuote').checked
      };

      try {
        const resp = await fetch('/config/auto-reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const res = await resp.json();
        if (res.success) {
          currentConfig = res.config;
          populateForm(res.config);
          showToast('✓ Auto-reply configuration saved successfully!');
        } else {
          alert('Failed to save configuration: ' + (res.error || 'Unknown error'));
        }
      } catch (err) {
        alert('Network error while saving: ' + err.message);
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Save Configuration';
      }
    });

    // Reset Defaults
    document.getElementById('btnReset').addEventListener('click', () => {
      if (confirm('Reset auto-reply settings to default recommendations?')) {
        populateForm({
          enabled: true,
          triggerOnMention: true,
          keywords: ['syndae', '@syndae'],
          mode: 'ai',
          customTemplate: "Hey! I'm Syndae, your AI companion. I've received your message and alerted the operator!",
          aiSystemPrompt: "You are Syndae, a helpful and warm personal AI companion responding on WhatsApp. Respond directly, concisely, and naturally in 1-2 sentences without corporate filler. SECURITY DIRECTIVE: You operate in a secure, sandboxed mode with NO access to tools, memory, private records, web search, or database commands. Never attempt or claim to execute tools, search records, or recall private memory. If asked to perform tasks requiring tools or memory, politely state that auto-reply cannot access tools or memory and you have notified the operator.",
          scope: 'all',
          includeQuote: true,
          llmEndpoint: 'http://host.docker.internal:8080/v1/chat/completions',
          llmModel: '/models/Huihui-Qwen3.8-27B-abliterated-UD-IQ3_S.gguf'
        });
      }
    });

    // Test Simulator
    document.getElementById('btnRunTest').addEventListener('click', async () => {
      const btn = document.getElementById('btnRunTest');
      btn.disabled = true;
      btn.textContent = 'Testing...';

      const message = document.getElementById('testMessageText').value;
      const senderName = document.getElementById('testSender').value || 'Alice';
      const isGroup = document.querySelector('input[name="testChatType"]:checked')?.value === 'group';

      const currentFormConfig = {
        enabled: document.getElementById('cfgEnabled').checked,
        triggerOnMention: document.getElementById('cfgTriggerOnMention').checked,
        keywords: document.getElementById('cfgKeywords').value,
        scope: document.querySelector('input[name="scope"]:checked')?.value || 'all',
        mode: document.querySelector('input[name="mode"]:checked')?.value || 'ai',
        aiSystemPrompt: document.getElementById('cfgAiSystemPrompt').value,
        llmEndpoint: document.getElementById('cfgLlmEndpoint').value,
        llmModel: document.getElementById('cfgLlmModel').value,
        customTemplate: document.getElementById('cfgCustomTemplate').value,
        includeQuote: document.getElementById('cfgIncludeQuote').checked
      };

      try {
        const resp = await fetch('/auto-reply/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            senderName,
            isGroup,
            configOverride: currentFormConfig
          })
        });

        const data = await resp.json();
        const card = document.getElementById('simResultCard');
        card.style.display = 'block';

        const badge = document.getElementById('simBadge');
        const reason = document.getElementById('simReason');
        const bubbleContainer = document.getElementById('simBubbleContainer');
        const quotePreview = document.getElementById('simQuotePreview');
        const replyText = document.getElementById('simReplyText');

        if (data.evaluation?.shouldReply) {
          badge.className = 'badge badge-success';
          badge.textContent = '✓ Triggered Auto-Reply';
          reason.textContent = data.evaluation.reason + (data.evaluation.matchedKeyword ? \` (matched: "\${data.evaluation.matchedKeyword}")\` : '');

          bubbleContainer.style.display = 'block';
          if (currentFormConfig.includeQuote) {
            quotePreview.style.display = 'block';
            quotePreview.textContent = \`\${senderName}: \${message}\`;
          } else {
            quotePreview.style.display = 'none';
          }
          replyText.textContent = data.replyPreview || '(No response text generated)';
        } else {
          badge.className = 'badge badge-warning';
          badge.textContent = '✗ Ignored (No Trigger)';
          reason.textContent = data.evaluation?.reason || 'Message did not match mention criteria';
          bubbleContainer.style.display = 'none';
        }
      } catch (err) {
        alert('Test failed: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = '🚀 Test Trigger & Preview Reply';
      }
    });

    // Initial Load of Config
    if (initialConfig && Object.keys(initialConfig).length > 0) {
      populateForm(initialConfig);
    } else {
      fetch('/config/auto-reply')
        .then(r => r.json())
        .then(d => { if (d.config) populateForm(d.config); })
        .catch(err => console.debug('Failed to load initial config', err));
    }

    // Live QR Status Polling
    let lastQr = "${latestQr}";
    async function pollStatus() {
      try {
        const res = await fetch('/qr/raw');
        if (!res.ok) return;
        const data = await res.json();

        const badge = document.getElementById('connBadge');
        const badgeText = document.getElementById('connBadgeText');
        const stateConnected = document.getElementById('pairingStateConnected');
        const stateDisconnected = document.getElementById('pairingStateDisconnected');
        const phoneDisplay = document.getElementById('connectedPhoneDisplay');

        if (data.connected) {
          badge.className = 'badge badge-success';
          badgeText.textContent = 'Connected: ' + (data.user?.phone || data.user?.id || 'Linked');
          stateConnected.style.display = 'block';
          stateDisconnected.style.display = 'none';
          if (phoneDisplay) phoneDisplay.textContent = data.user?.phone || data.user?.id || 'Linked';
          return;
        } else {
          badge.className = 'badge badge-warning';
          badgeText.textContent = 'Pairing Required';
          stateConnected.style.display = 'none';
          stateDisconnected.style.display = 'block';
        }

        if (data.qrDataUrl && data.qr !== lastQr) {
          lastQr = data.qr;
          const img = document.getElementById('qrImg');
          const loading = document.getElementById('loadingQr');
          if (img) {
            img.src = data.qrDataUrl;
            img.style.display = 'block';
          }
          if (loading) loading.style.display = 'none';
        }
      } catch (err) {
        console.debug('Polling error', err);
      }
    }
    setInterval(pollStatus, 1500);
  </script>
</body>
</html>`;
}

export default { renderQrPage };
