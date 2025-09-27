// 完美版V3.2 - 最终稳定重构版

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // --- 1. 将API和特殊路径设为完全公开 ---
        if (url.pathname.startsWith('/api/')) {
            return handleApi(request, env);
        }
        if (url.pathname === '/webhook') {
            return handleWebhook(request, env);
        }
        if (url.pathname === '/setup' && url.searchParams.get('doit') === 'true') {
             return handleInitialSetup(request, env);
        }
        if (url.pathname === '/favicon.ico') {
            return handleFavicon();
        }

        // --- 2. 仅对页面访问进行认证检查 ---
        const authPassword = await env.PORTAL_KV.get('AUTH_PASSWORD');
        if (authPassword) {
            const authorized = await basicAuth(request, authPassword);
            if (!authorized) {
                return new Response('Unauthorized', {
                    status: 401,
                    headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
                });
            }
        }
        
        // --- 3. 认证通过或无需认证，显示页面 ---
        if (url.pathname === '/admin') {
            return handleBackend(request, env);
        }
        return handleFrontend(request, env);
    },
};

/**
 * 检查 Basic Auth 认证
 */
async function basicAuth(request, requiredPassword) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Basic ')) { return false; }
    try {
        const password = atob(authHeader.substring(6)).split(':')[1];
        return password === requiredPassword;
    } catch (e) { return false; }
}

/**
 * [新增] 返回网站图标
 */
function handleFavicon() {
    // 你可以替换成任何你自己的.ico文件的Base64编码
    const FAVICON_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAACXBIWXMAAAsTAAALEwEAmpwYAAAE7klEQVR4nO2aeYxfUxTHP221Q2utraJUELT8I1JDVFVGo4JQxNYgNCli6T9qS61FGkFaIfYSLZOQJqoIEYKiY1diCdqOpWOdmoai0zEjJ/ne5PTmvfd7b977TUcy3+Qk755337nvvHu2e34/6BtsDYzgf4adgXOBZmAVsB7oEf0JfA7cA0wGhtIPsRMwF/jLvXgt+haYAQymn+Asfe3wgsuB2cAEYAywFbAtcAAwFXgUaHfzX9OH2GwYBMwBuvVCLwONOZ81xW5xpveNFN0suFEv0QVc1UsZBwGtktMGjKaPcYp2YgMwpaSs3YCvpMx7wDD6CBZKf9DCF1Yk08yqQzJnUUeMUdhcArygBd+Wn1SF8yV3HXADcCWwQ4XyGel2wNOJVS4CDAE+i9ZYCexa1QKLJPRVYKGu2+uU0C6S/A7nN70NJJvgQDl1m2L9zRK+mPpgDxcJr9X1S1UIni1hMzVeXOVXSkGr1rjUlTalI9kTEmbx3vC6xtOoH5ZrjTNcBXBkWaEhQpnDozhv41OpH57XGtOBZ3R9fVWKWElheEXj80rIfAtYVuN+jz7WLF2bcqXwbLQjT2l8RcGX87B5b2Tc/1prTASO0vXPlMSDEjRO4xC1Hin4cnkx1BWS++lQ1qWxJeVe4zoJOVbjkzX+gvpgguT/5s4pK6rwy9MkxHYC+coG8WqV3T4j76uSoxZuSshTD4l3GyWPrra17zpe8JP7Mp7bRYn0eI2nyvaH1ShRVruIFXCHeLdTUTg8TONDpFyXrtNgSgwvsM5JrjwJzYrBOuf3yDpKYaIEWegNmC/eh0BDxrMjVXbkQYtkmuyAaeKtAbakAoSM3qTxNjqeGu/xlGcsM/+jOQ/LdLJ2rwf4250SG5ypXUJFaJJAnyvM2deKf03CM99FJfmdGfLf0Zx5jne1eK01dr0wQlY/xvGOVhTrjmy4IeH8YvP2TJA7xRWHo5xJrhPffKdSHC7Bb0b8C5yT7iXe9im9LB+N4pJkruPNcWegumCZFojbPk+LbyWNYbsURbwjG45wu7GjeObUv4pv9+uCc7TA3RH/cvHNxMaLtyZBETv3e9wr/oKENawnUDeEEuXjiH9rwldvTlDEFPb4XvzjHG9JBRV2IqwsuQz4yL2QhUmPL909O2sb9o9aqWujsiUca/9VWzWY1Xol21Bxl8YgKdCeEoECGhPuh+g0Tub0ADA2kn+ma/8EjBXvk6qUGOJqqiT6IyHLe8pjFo+5RkNIlpPFe7EqReZlKGH0S0J+8VQrbA6XjDB/b/EPdaVPaYx3HfY0Cn6A8krSnKxEdlc018wMdRa79TtL6Wye9IVj8mX9igzzmx6V7qPkLz0Z5cun4k0qo8ToHLsRN818xArkZXSq9blSESpJnmX3eLdKHaRm5lDC6En3zOoURS4GntPO+J/b5rtzeKCNLtw2VXGcXppTEV+ltqXMsdIdZ/sNrrxPmn+27m/hAkFoehTGqpyKWF82ICnPhFyze0Ju8onVU7Obd7941vwojBEZNpxVxfrsHZPVUh4zMuZ2uFNgMC9z/MI4OKcS8W8jGzPmdapUMezjfpVKo9PdL8WBZ7mlECYVUKTRvVytuS2KhqGJkEVL1Zj7McUfc+GEgjtibdOfcs7P+0eCTuD3iPdBUUVCEdffqL2oIlZSvN8PqaWoIgMYwADYBP8BXHPAvKVeK7gAAAAASUVORK5CYII=';
    const image = atob(FAVICON_BASE64);
    const imageBytes = new Uint8Array(image.length);
    for (let i = 0; i < image.length; i++) {
        imageBytes[i] = image.charCodeAt(i);
    }
    return new Response(imageBytes, { headers: { 'Content-Type': 'image/x-icon' } });
}

/**
* 渲染前端主页 (全新上下布局)
*/
async function handleFrontend(request, env) {
    const settings = await env.PORTAL_KV.get('settings', 'json') || { title: 'My Portal', domain: 'example.com' };
    const cards = await env.PORTAL_KV.get('cards', 'json') || [];
    const cardsHtml = cards.map(card => {
        const portString = settings.port ? `:${settings.port}` : '';
        const cardUrl = `https://${card.subdomain}.${settings.domain}${portString}`;
        return `
            <a href="${cardUrl}" target="_blank" class="card">
                <div class="card-image-container">
                    ${card.imageUrl ? `<img src="${card.imageUrl}" alt="${card.title}" class="card-icon">` : '<span class="card-icon-placeholder"></span>'}
                </div>
                <div class="card-text-container">
                    <h4 class="card-title">${card.title}</h4>
                    <p class="card-description">${card.description}</p>
                </div>
            </a>`;
    }).join('');

    const html = `
    <!DOCTYPE html><html lang="zh-CN"><head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css" />
    <link rel='stylesheet' href='https://chinese-fonts-cdn.deno.dev/packages/hcqyt/dist/ChillRoundFBold/result.css' />
    <title>${settings.title}</title>
      <style>
        /* --- 基础和背景 --- */
        body{
            background:linear-gradient(135deg, #2c3e50, #00b894, #00cec9, #6c5ce7);
            color:#fff;
            font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;
            margin:0;
            background-attachment:fixed;
            font-family:'寒蝉全圆体 Bold';font-weight:'400'
            }
        
        /* --- 主体布局：上下两大块 --- */
        .page-wrapper {
            display: flex;
            flex-direction: column;
            //min-height: 100vh;
        }

        /* --- 上半部分：标题和时钟 --- */
        .top-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            height: 220px;
            width: 100%;
            align-items: center;
                     
            }
        .top-left-grid {
            display: flex;
            justify-content: flex-end; /* 水平靠右 */
            padding-right: 1vw;
        }
        .top-right-grid {
            display: flex;
            justify-content: flex-start; /* 水平靠左 */
            padding-left: 1vw;
        }
        .main-title{
            font-size: 2.4rem;
            font-weight: bold;
            text-shadow: 0 0 15px rgba(0,0,0,0.7);
            margin: 0;
        }
        .datetime-container {
            text-shadow: 0 0 10px rgba(0,0,0,0.5);
        }
        .clock {
            font-size: 1.8rem;
            font-weight: 400;
        }
        .date {
            font-size: 1.1rem;
            font-weight: 400;
            color: rgba(255, 255, 255, 0.8);
        }

        /* --- 下半部分：卡片容器 --- */
        .bottom-section {
            width: 100%;
            height:500px;
            display: flex;
            justify-content: center;
            align-items: center; 
            padding: 0px 0px 40px 0px; /* 增加底部填充，避免卡片被底部版权信息遮挡 */
            }
        .card-container {
            padding: 12px 0 30px 10px;
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            column-gap: 18px;
            row-gap: 30px;
            width: 100%;
            max-width: 1000px;
            
            /* 【核心修改：限制高度并启用滚动】 */
            max-height: 495px; 
            overflow-y: auto;  /* 启用垂直滚动条 */
            padding-right: 15px; /* 为滚动条预留空间，避免内容被滚动条遮挡 */
            
            /* 【美化滚动条】（仅对支持 Webkit 内核的浏览器有效，如 Chrome, Safari) */
            scrollbar-width: thin; /* Firefox */
            scrollbar-color: rgba(255, 255, 255, 0.0) transparent; /* Firefox */
            }
        
        /* 【鼠标移到卡片容器区域时：显示滚动条】 */
        .card-container:hover{
            scrollbar-color: rgba(255, 255, 255, 0.3) transparent; /* 悬停时显示半透明滑块 */
        }
        
               
        /* --- 卡片新样式 --- */
        .card{
            width: 180px;
            height: 70px;
            flex-shrink: 0; /* 防止卡片在flex布局中被压缩 */
            display:flex;
            align-items:center;
            text-align:left;
            background:rgba(30,30,30,0.6);
            backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);
            border-radius:15px;
            border:1px solid rgba(255,255,255,0.2);
            padding:15px;
            text-decoration:none;
            color:#fff;
            overflow:hidden;
            transition:transform .3s ease,box-shadow .3s ease;
            box-shadow:0 8px 10px 0 rgba(0,0,0,.3);
        }
        .card:hover{transform:translateY(-10px);box-shadow:0 16px 12px 0 rgba(0,0,0,.3);}
        .card-image-container{flex-shrink:0;width:35%;height:100%;display:flex;align-items:center;justify-content:center;}
        .card-icon{width:100%;height:100%;object-fit:contain;border-radius:8px;}
        .card-icon-placeholder{width:60px;height:60px;background:rgba(255,255,255,0.1);border-radius:8px;}
        .card-text-container{flex-grow:1;padding-left:15px;display:flex;flex-direction:column;justify-content:center;height:100%;}
        .card-title{font-size:1.2rem;margin:0 0 8px 0;font-weight:600;word-break:break-all;}
        .card-description{font-size:.75rem;color:rgba(255,255,255,.8);line-height:1.5;margin:0;word-break:break-all;}

        /* --- 其他固定元素 --- */
        .settings-btn {
            position: fixed;
            top: 25px;
            right: 35px;
            width: auto;              /* 不限制宽高，让内容自适应 */
            height: auto;
            background: none !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            display: flex;
            justify-content: center;
            align-items: center;
            text-decoration: none;
            color: #fff;
            font-size: 35px;
            transition: color .2s;
            padding: 0;
            margin: 0;
            transition: transform 0.3s cubic-bezier(.4,2,.5,1), color 0.2s;
        }
        .settings-btn:hover{ background: none;
        box-shadow: none;
        transform: scale(1.3);
        background-color:rgba(255,255,255,.3);}
        
        /* --- 响应式调整 --- */
        @media (max-width: 900px) {
            .top-section { grid-template-columns: 1fr; height: auto; text-align: center; padding: 20px 0; gap: 15px; }
            .top-left-grid, .top-right-grid { justify-content: center; padding: 0; }
            .main-title{font-size:2rem;}
            .clock{font-size:1rem;}
            .date{font-size:1.8rem;}
        }
        /* --- 固定底部 powered by --- */
        .powered-by-footer {
            position: fixed;
            bottom: 10px;
            left: 0;
            width: 100vw;
            height: 38px;
            line-height: 38px;
            background: none;
            text-align: center;
            font-size: 0.8rem;
            color: rgba(0,0,0,0.60);
            font-family: "Open Sans", sans-serif;
            letter-spacing: 0.2px;
            z-index: 99;
            pointer-events: none;
            user-select: none;
          }
      </style>
    </head>
    <body>
        <a href="/admin" class="settings-btn" title="管理后台">&#9881;</a>
        <div class="page-wrapper">
            <div class="top-section">
                <div class="top-left-grid">
                    <h1 class="main-title">${settings.title}</h1>
                </div>
                <div class="top-right-grid">
                    <div class="datetime-container">
                        <div class="date" id="date"></div>
                        <div class="clock" id="clock"></div>
                    </div>
                </div>
            </div>
            <div class="bottom-section">
                <div class="card-container">${cardsHtml}</div>
            </div>
        </div>
       
        <div class="powered-by-footer">
        Powered by  <i class="fa-brands fa-youtube"></i>@Kexuejia
        </div>
        <script>
            const clockElement = document.getElementById('clock');
            const dateElement = document.getElementById('date');
            function updateTime() {
                const now = new Date();
                const optionsDate = { year: 'numeric', month: 'long', day: 'numeric', timeZone: '${Intl.DateTimeFormat().resolvedOptions().timeZone}' };
                const optionsTime = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: '${Intl.DateTimeFormat().resolvedOptions().timeZone}' };
                dateElement.textContent = new Intl.DateTimeFormat('zh-CN', optionsDate).format(now);
                clockElement.textContent = new Intl.DateTimeFormat('en-GB', optionsTime).format(now);
            }
            updateTime();
            setInterval(updateTime, 1000);
        </script>
    </body></html>`;
    return new Response(html, { headers: { 'Content-Type': 'text/html;charset=utf-8' } });
}

/**
* 渲染后台管理页面 (已修正所有脚本问题)
*/
async function handleBackend(request, env) {
    const settings = await env.PORTAL_KV.get('settings', 'json') || {};
    const portStatus = settings.port ? `已接收到端口: <strong>${settings.port}</strong>` : '状态: <strong>尚未接收到端口</strong>';
    const adminHtml = `
    <!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>管理后台</title><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>body{background:linear-gradient(135deg, #2c3e50, #00b894, #00cec9, #6c5ce7);color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;margin:0;background-attachment:fixed;} .header{background:rgba(30,30,30,.7);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);padding:15px 30px;border-bottom:1px solid rgba(255,255,255,.2);box-shadow:0 2px 8px rgba(0,0,0,.5);display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:10;} .header h1{margin:0;font-size:1.5em;} .header a{text-decoration:none;padding:8px 15px;background-color:#00b894;color:#fff;border-radius:5px;font-weight:600;transition:background-color .2s ease;} .header a:hover{background-color:#00a884;} .container{max-width:900px;margin:2em auto;background:rgba(0,0,0,.4);backdrop-filter:blur(15px);-webkit-backdrop-filter:blur(15px);padding:25px 40px;border-radius:8px;border:1px solid rgba(255,255,255,.2);box-shadow:0 4px 12px rgba(0,0,0,.4);} h2{color:#fff;border-bottom:1px solid rgba(255,255,255,.2);padding-bottom:10px;} label{display:block;margin-top:1.2em;font-weight:600;font-size:.9em;color:rgba(255,255,255,.8);} input,textarea{width:100%;padding:12px;margin-top:.5em;box-sizing:border-box;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.3);border-radius:5px;font-size:1em;color:#fff;} input:focus,textarea:focus{border-color:#00cec9;outline:0;box-shadow:0 0 0 2px rgba(0,206,201,.25);} button{padding:10px 18px;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:1em;font-weight:600;transition:background-color .2s;} button.primary{background:#00b894;} button.primary:hover{background:#00a884;} .card-editor{border:1px solid rgba(255,255,255,.2);padding:20px;margin-top:1.5em;border-radius:8px;background:rgba(0,0,0,.2);} .danger{background-color:#e74c3c;margin-top:1.5em;} .danger:hover{background-color:#c0392b;} hr{border:0;border-top:1px solid rgba(255,255,255,.2);margin:2.5em 0;} 
        #status {
            /* 继承已设置的样式，再加如下 */
            align-self: center; /* 让它自己垂直居中（如果还不居中） */
        }
        .status-bar{padding:10px 15px;background-color:rgba(0,0,0,.2);border-radius:5px;margin-bottom:20px;font-size:.9em;color:rgba(255,255,255,.8);border:1px solid rgba(255,255,255,.1);} .status-bar strong{color:#00cec9;} .button-group{display:flex;gap:15px;margin-top:1.5em;} .form-action-row{display:flex;align-items:center;gap:20px;margin-top:1.5em;} .form-action-row button{margin-top:0;} .status-message{flex-grow:1;font-weight:600;opacity:0;transition:opacity .5s ease;} .status-message.success{color:#2ecc71;} .status-message.error{color:#e74c3c;}
        .form-row {
            display: flex;
            align-items: center;
            gap: 12px;         /* 控制 label 和 input/textarea 之间的间距，可按需调整 */
            margin: 8px 0;     /* 行之间的上下间距，可按需调整 */
        }
        .form-row label {
            min-width: 90px;   /* 保证 label 宽度一致，可根据实际内容调整 */
            font-weight: 500;
            color: #fff;
            margin-right: 8px;
        }
        .form-row input,
        .form-row textarea {
            flex: 1;           /* 输入框自动填满剩余空间 */
            background: rgba(0,0,0,.15);
            border: 1px solid rgba(255,255,255,.15);
            border-radius: 4px;
            color: #fff;
            padding: 8px;
            font-size: 1em;
        }
        .form-row textarea {
            min-height: 32px;
            max-height: 48px;
            resize: none;
        }        
        </style>
    </head>
    <body>
        <div class="header"><h1>管理后台</h1><a href="/">返回主页</a></div>
        <div class="container">
            <div class="status-bar">Webhook 端口状态: ${portStatus}</div>
            <h2>网站设置</h2>
            <form id="settings-form">
                <label for="title">网站大标题:</label><input type="text" id="title" required>
                <label for="domain">主域名:</label><input type="text" id="domain" required>
                <div class="form-action-row"><button class="primary" type="submit">保存设置</button><span id="settings-status" class="status-message"></span></div>
            </form>
            <hr>
            <h2>设置/修改密码</h2>
            <form id="password-form">
                <label for="old-password">当前密码:</label><input type="password" id="old-password">
                <label for="new-password">新密码 (留空则不设防):</label><input type="password" id="new-password">
                <div class="form-action-row"><button class="primary" type="submit">更新密码</button><span id="password-status" class="status-message"></span></div>
            </form>
            <hr>
            <h2>卡片管理</h2><div id="cards-container"></div>
            <div class="button-group"><button id="add-card" class="primary">添加新卡片</button><button id="save-cards" class="primary">保存所有卡片</button> <span id="status" class="status-message" ></span></div>
           
        </div>
        <script>
            document.addEventListener('DOMContentLoaded', () => {
                const settingsForm = document.getElementById('settings-form');
                const passwordForm = document.getElementById('password-form');
                const addCardBtn = document.getElementById('add-card');
                const saveCardsBtn = document.getElementById('save-cards');
                const cardsContainer = document.getElementById('cards-container');
                const globalStatusEl = document.getElementById('status');
                
                function showInlineStatus(element, message, isError = false) {
                    element.textContent = message;
                    element.className = 'status-message ' + (isError ? 'error' : 'success');
                    element.style.opacity = 1;
                    setTimeout(() => { element.style.opacity = 0; }, 4000);
                }

                function showGlobalStatus(message) {
                    globalStatusEl.textContent = message;
                    globalStatusEl.style.display = 'inline';
                    setTimeout(() => { globalStatusEl.style.display = 'none'; }, 4000);
                }

                async function apiFetch(url, options) {
                    options = options || {};
                    options.headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers);
                    const response = await fetch(url, options);
                    if (!response.ok) {
                        const data = await response.json().catch(()=>({error:'未知错误'}));
                        const statusElement = document.getElementById('password-status');
                        showInlineStatus(statusElement, '错误: ' + (data.error || response.statusText), true);
                        return null;
                    }
                    return response;
                }

                async function loadSettings() {
                    const res = await fetch('/api/settings'); // 使用原生fetch，因为它不需要处理错误提示
                    if (!res || !res.ok) return;
                    const data = await res.json();
                    document.getElementById('title').value = data.title || '';
                    document.getElementById('domain').value = data.domain || '';
                }

                async function loadCards() {
                    const res = await fetch('/api/cards');
                    if (!res || !res.ok) return;
                    const cards = await res.json();
                    cardsContainer.innerHTML = '';
                    cards.forEach((card, index) => {
                        const editor = createCardEditor(card, index);
                        cardsContainer.appendChild(editor);
                    });
                }

                function createCardEditor(card, index) {
                    const div = document.createElement('div');
                    div.className = 'card-editor';
                    div.innerHTML = \`
                    <h3 style="text-align: center; margin: 0; padding: 0 0; background-image: linear-gradient(135deg, #FF28E8, #00b894); color: transparent; -webkit-background-clip: text; background-clip: text;">卡片 \${index + 1}</h3>
                       <div class="form-row"><label>子域名前缀:</label><input type="text" class="subdomain" value="\${card.subdomain || ''}"></div>
                       <div class="form-row"><label>标题:</label><input type="text" class="title" value="\${card.title || ''}"></div>
                       <div class="form-row"><label>描述:</label><input type="text" class="description" value="\${card.description || ''}"></div>
                       <div class="form-row"><label>图标网址:</label><input type="text" class="imageUrl" value="\${card.imageUrl || ''}"></div>
                       <button class="danger" onclick="this.parentElement.remove()">删除此卡片</button>
                    \`;
                    return div;
                }

                settingsForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const title = document.getElementById('title').value;
                    const domain = document.getElementById('domain').value;
                    const res = await apiFetch('/api/settings', { method: 'POST', body: JSON.stringify({ title, domain }) });
                    if (res) {
                        showInlineStatus(document.getElementById('settings-status'), '✓ 网站设置已保存!');
                    }
                });

                passwordForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const oldPasswordInput = document.getElementById('old-password');
                    const newPasswordInput = document.getElementById('new-password');
                    const res = await apiFetch('/api/password', { method: 'POST', body: JSON.stringify({ oldPassword: oldPasswordInput.value, newPassword: newPasswordInput.value }) });
                    if (res) {
                        showInlineStatus(document.getElementById('password-status'), newPasswordInput.value ? '✓ 密码已更新!' : '✓ 密码已移除，网站现已公开!');
                        oldPasswordInput.value = '';
                        newPasswordInput.value = '';
                    }
                });

                addCardBtn.addEventListener('click', () => {
                    const newIndex = cardsContainer.children.length;
                    const editor = createCardEditor({}, newIndex);
                    cardsContainer.appendChild(editor);
                });

                saveCardsBtn.addEventListener('click', async () => {
                    
                    const cards = [];
                    document.querySelectorAll('.card-editor').forEach(editor => {cards.push({ subdomain: editor.querySelector('.subdomain').value.trim(), title: editor.querySelector('.title').value, description: editor.querySelector('.description').value, imageUrl: editor.querySelector('.imageUrl').value.trim() });
                    });
                    const res = await apiFetch('/api/cards', { method: 'POST', body: JSON.stringify(cards) });
                    if (res) showInlineStatus(document.getElementById('status'), '✓ 所有卡片信息均已保存!');
                   
                });
                
                loadSettings();
                loadCards();
            });
        </script>
    </body></html>`;
    return new Response(adminHtml, { headers: { 'Content-Type': 'text/html;charset=utf-8' } });
}

/**
* 处理 API 请求
*/
async function handleApi(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/', '');

    if (request.method === 'GET') {
        if (path === 'settings') { const settings = await env.PORTAL_KV.get('settings', 'json') || {}; return Response.json(settings); }
        if (path === 'cards') { const cards = await env.PORTAL_KV.get('cards', 'json') || []; return Response.json(cards); }
    }
    if (request.method === 'POST') {
        if (path === 'settings') { const newSettings = await request.json(); const currentSettings = await env.PORTAL_KV.get('settings', 'json') || {}; await env.PORTAL_KV.put('settings', JSON.stringify({...currentSettings, ...newSettings})); return new Response('Settings updated'); }
        if (path === 'password') {
            const { oldPassword, newPassword } = await request.json();
            const storedPassword = await env.PORTAL_KV.get('AUTH_PASSWORD');
            if (storedPassword && oldPassword !== storedPassword) {
                return new Response(JSON.stringify({ error: "当前密码错误" }), { status: 401, headers: {'Content-Type':'application/json'} });
            }
            if (newPassword) { await env.PORTAL_KV.put('AUTH_PASSWORD', newPassword); } else { await env.PORTAL_KV.delete('AUTH_PASSWORD'); }
            return new Response('Password updated');
        }
        if (path === 'cards') { const newCards = await request.json(); await env.PORTAL_KV.put('cards', JSON.stringify(newCards)); return new Response('Cards updated'); }
    }
    return new Response('API Not Found', { status: 404 });
}

/**
* 首次部署初始化函数
*/
async function handleInitialSetup(request, env) {
  await env.PORTAL_KV.put('AUTH_PASSWORD', 'admin');
  await env.PORTAL_KV.put('settings', JSON.stringify({ title: 'My Awesome Portal', domain: 'your-domain.com' }));
  await env.PORTAL_KV.put('cards', JSON.stringify([]));
  return new Response('Initial setup complete. Default password is "admin". Please change it immediately.', { status: 200 });
}

/**
 * 处理 webhook
 */
async function handleWebhook(request, env) {
    if (request.method !== 'POST') { return new Response('Method Not Allowed', { status: 405 }); }
    const authHeader = request.headers.get('Authorization') || '';
    if (!env.WEBHOOK_SECRET || authHeader !== `Bearer ${env.WEBHOOK_SECRET}`) { return new Response('Unauthorized', { status: 401 }); }
    try {
        const { port } = await request.json();
        if (port === undefined || typeof port !== 'number') { return new Response('Invalid port', { status: 400 }); }
        const settings = await env.PORTAL_KV.get('settings', 'json') || {};
        settings.port = port;
        await env.PORTAL_KV.put('settings', JSON.stringify(settings));
        return Response.json({ success: true, message: `Port updated to ${port}` });
    } catch (error) { return new Response(`Webhook error: ${error.message}`, { status: 500 }); }
}
