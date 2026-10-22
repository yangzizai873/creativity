window.__ModuleLoader__.load({
  id: 'dsh-creativity-hall',
  factory: (require) => {
    const React = require('react')
    const h = React.createElement
    const API = '/api/creativity-hall/state'
    const WRITE_API = '/api/creativity-hall/state/write'
    const STYLE_ID = 'dsh-creativity-hall-style'
    const STYLE_VERSION = '0.6.0'

    const STATUSES = [
      { id: 'spark', label: '火花' },
      { id: 'active', label: '推进中' },
      { id: 'done', label: '已落地' },
      { id: 'parked', label: '搁置' }
    ]
    const STATUS_LABEL = Object.fromEntries(STATUSES.map((item) => [item.id, item.label]))
    const SUGGESTIONS = [
      { title: '把每天的通勤时间变成一段固定的听书时间', tag: '习惯' },
      { title: '给老家的院子做一套低维护的植物搭配', tag: '生活' },
      { title: '写一篇关于县城咖啡馆的观察笔记', tag: '写作' }
    ]

    function uid () {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
      return `idea-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
    }

    function cleanTags (input) {
      return [...new Set(String(input || '').split(/[,，、\n]/).map((tag) => tag.trim()).filter(Boolean))].slice(0, 12)
    }

    function relativeTime (iso) {
      const value = Date.parse(iso)
      if (Number.isNaN(value)) return ''
      const diff = Date.now() - value
      if (diff < 60 * 1000) return '刚刚'
      if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)} 分钟前`
      if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)} 小时前`
      if (diff < 48 * 60 * 60 * 1000) return '昨天'
      const date = new Date(value)
      return `${date.getMonth() + 1} 月 ${date.getDate()} 日`
    }

    const CSS = `
      .ch-root{--ch-fg:var(--dsw-alias-label-primary,#1f2329);--ch-muted:var(--dsw-alias-label-secondary,#6b7280);--ch-faint:var(--dsw-alias-label-tertiary,#9aa1ab);--ch-border:var(--dsw-alias-border-l2,rgba(15,23,42,.12));--ch-bg:var(--dsw-alias-bg-layer-1,#fff);--ch-bg-2:var(--dsw-alias-bg-layer-2,#f4f5f7);--ch-panel:var(--dsw-alias-bg-module-platform,#fafbfc);--ch-primary:var(--dsw-alias-button-primary-fill,#1f6feb);--ch-primary-fg:var(--dsw-alias-label-primary-foreground,#fff);position:relative;display:flex;flex-direction:column;flex:1;width:100%;min-width:0;min-height:0;height:100%;overflow:hidden;background:var(--ch-panel);color:var(--ch-fg);font-size:13px;line-height:20px;container-type:inline-size;container-name:creativity-hall}
      .ch-root *,.ch-root *::before,.ch-root *::after{box-sizing:border-box}
      .ch-root button,.ch-root input,.ch-root textarea{font:inherit;color:inherit}
      .ch-root button{cursor:pointer;border:0;background:none}
      .ch-root :focus-visible{outline:2px solid var(--ch-primary);outline-offset:2px}
      .ch-head{flex:none;display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:18px 24px 14px;border-bottom:1px solid var(--ch-border);background:var(--ch-panel)}
      .ch-brand{display:flex;align-items:baseline;gap:10px;min-width:0}
      .ch-brand h1{margin:0;font-size:20px;line-height:28px;font-weight:650;letter-spacing:.01em;white-space:nowrap}
      .ch-brand .ch-count{color:var(--ch-muted);font-size:12px;white-space:nowrap}
      .ch-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}
      .ch-search{position:relative;display:flex;align-items:center;min-width:180px;flex:1 1 200px;max-width:320px}
      .ch-search input{width:100%;height:32px;padding:0 10px 0 30px;border:1px solid var(--ch-border);border-radius:8px;background:var(--ch-bg);outline:none}
      .ch-search input::placeholder{color:var(--ch-faint)}
      .ch-search svg{position:absolute;left:9px;color:var(--ch-faint);pointer-events:none}
      .ch-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:32px;padding:0 12px;border:1px solid var(--ch-border);border-radius:8px;background:var(--ch-bg);white-space:nowrap}
      .ch-btn:hover:not(:disabled){background:var(--ch-bg-2)}
      .ch-btn:disabled{opacity:.55;cursor:default}
      .ch-btn-primary{background:var(--ch-primary);border-color:transparent;color:var(--ch-primary-fg)}
      .ch-btn-primary:hover:not(:disabled){background:var(--ch-primary);filter:brightness(1.06)}
      .ch-btn-ghost{border-color:transparent;background:transparent;color:var(--ch-muted)}
      .ch-btn-ghost:hover:not(:disabled){background:var(--ch-bg-2);color:var(--ch-fg)}
      .ch-btn-danger{color:#d14343;border-color:color-mix(in srgb,#d14343 35%,transparent)}
      .ch-body{position:relative;flex:1;min-height:0;display:grid;grid-template-columns:minmax(280px,360px) minmax(0,1fr)}
      .ch-list-pane{display:flex;flex-direction:column;min-height:0;min-width:0;border-right:1px solid var(--ch-border);background:var(--ch-bg)}
      .ch-compose{flex:none;display:flex;gap:8px;padding:14px 14px 8px}
      .ch-compose input{flex:1;min-width:0;height:36px;padding:0 12px;border:1px solid var(--ch-border);border-radius:9px;background:var(--ch-bg);outline:none}
      .ch-compose input::placeholder{color:var(--ch-faint)}
      .ch-list-search{flex:none;padding:0 14px 8px}
      .ch-list-search .ch-search{max-width:none}
      .ch-filters{flex:none;display:flex;gap:6px;padding:0 14px 10px;overflow-x:auto;scrollbar-width:none}
      .ch-filters::-webkit-scrollbar{display:none}
      .ch-chip{flex:none;height:26px;padding:0 10px;border-radius:999px;border:1px solid transparent;color:var(--ch-muted);white-space:nowrap}
      .ch-chip:hover{background:var(--ch-bg-2);color:var(--ch-fg)}
      .ch-chip[aria-pressed=true]{background:var(--ch-fg);color:var(--ch-bg)}
      .ch-list{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;margin:0;padding:0 8px 16px;list-style:none;scrollbar-width:thin;scrollbar-color:var(--ch-border) transparent}
      .ch-item{display:flex;gap:10px;width:100%;padding:10px 12px;border:1px solid transparent;border-radius:10px;text-align:left;align-items:flex-start}
      .ch-item:hover{background:var(--ch-bg-2)}
      .ch-item[aria-current=true]{background:var(--ch-bg-2);border-color:var(--ch-border)}
      .ch-dot{flex:none;width:8px;height:8px;margin-top:6px;border-radius:50%;background:var(--ch-faint)}
      .ch-dot[data-status=spark]{background:#f0a92b}
      .ch-dot[data-status=active]{background:#3b82f6}
      .ch-dot[data-status=done]{background:#10a37f}
      .ch-dot[data-status=parked]{background:#9aa1ab}
      .ch-item-main{min-width:0;flex:1;display:flex;flex-direction:column;gap:3px}
      .ch-item-title{font-weight:550;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      .ch-item-sub{display:flex;align-items:center;gap:8px;flex-wrap:wrap;color:var(--ch-muted);font-size:12px;line-height:18px;min-width:0}
      .ch-item-sub span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
      .ch-tag{display:inline-flex;align-items:center;height:20px;padding:0 7px;border-radius:5px;background:var(--ch-bg-2);color:var(--ch-muted);font-size:12px;line-height:18px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .ch-detail-pane{display:flex;flex-direction:column;min-height:0;min-width:0;overflow-y:auto;overflow-x:hidden;padding:22px 26px 32px;scrollbar-width:thin;scrollbar-color:var(--ch-border) transparent}
      .ch-detail{display:flex;flex-direction:column;gap:18px;max-width:760px;width:100%;margin:0 auto}
      .ch-detail-top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
      .ch-crumb{display:flex;align-items:center;gap:8px;color:var(--ch-muted);font-size:12px;min-width:0}
      .ch-crumb span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .ch-field{display:flex;flex-direction:column;gap:6px;min-width:0}
      .ch-field>label{font-size:12px;color:var(--ch-muted);font-weight:550}
      .ch-title-input{display:block;width:100%;border:1px solid transparent;border-radius:8px;background:transparent;padding:5px 8px;margin:-5px -8px;font-size:22px;line-height:30px;font-weight:650;letter-spacing:.01em;resize:none;overflow-y:auto;field-sizing:content;min-height:40px;max-height:180px}
      .ch-title-input:hover{border-color:var(--ch-border)}
      .ch-title-input:focus{border-color:var(--ch-border);background:var(--ch-bg);outline:none}
      .ch-textarea,.ch-input{width:100%;border:1px solid var(--ch-border);border-radius:9px;background:var(--ch-bg);padding:9px 11px;outline:none;resize:vertical;min-width:0}
      .ch-textarea:focus,.ch-input:focus{border-color:var(--ch-primary)}
      .ch-textarea{min-height:96px;line-height:1.65}
      .ch-textarea.ch-step{min-height:64px}
      .ch-segmented{display:inline-flex;flex-wrap:wrap;gap:6px}
      .ch-seg{height:30px;padding:0 12px;border:1px solid var(--ch-border);border-radius:999px;background:var(--ch-bg);color:var(--ch-muted)}
      .ch-seg:hover{background:var(--ch-bg-2);color:var(--ch-fg)}
      .ch-seg[aria-pressed=true]{background:var(--ch-fg);border-color:var(--ch-fg);color:var(--ch-bg)}
      .ch-meta{display:flex;align-items:center;gap:14px;flex-wrap:wrap;color:var(--ch-faint);font-size:12px;padding-top:4px;border-top:1px solid var(--ch-border)}
      .ch-meta .ch-save[data-state=error]{color:#d14343}
      .ch-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:space-between}
      .ch-delete-confirm{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 10px;border:1px solid color-mix(in srgb,#d14343 30%,transparent);border-radius:8px;background:color-mix(in srgb,#d14343 7%,transparent);color:var(--ch-fg);font-size:12px}
      .ch-welcome{grid-column:1/-1;display:flex;align-items:center;justify-content:center;min-height:0;overflow-y:auto;padding:28px 24px 40px}
      .ch-welcome-inner{width:100%;max-width:620px;display:flex;flex-direction:column;gap:14px}
      .ch-welcome h2{margin:0;font-size:24px;line-height:32px;font-weight:650;letter-spacing:.01em}
      .ch-welcome p{margin:0;color:var(--ch-muted);line-height:1.7}
      .ch-welcome-form{display:flex;gap:8px;flex-wrap:wrap}
      .ch-welcome-form input{flex:1 1 260px;min-width:0;height:42px;padding:0 14px;border:1px solid var(--ch-border);border-radius:10px;background:var(--ch-bg);font-size:14px;outline:none}
      .ch-welcome-form input:focus{border-color:var(--ch-primary)}
      .ch-welcome-form .ch-btn{height:42px;padding:0 16px}
      .ch-suggest{display:flex;flex-wrap:wrap;gap:8px}
      .ch-suggest button{display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:9px 12px;border:1px solid var(--ch-border);border-radius:9px;background:var(--ch-bg);text-align:left;max-width:100%}
      .ch-suggest button:hover{background:var(--ch-bg-2)}
      .ch-suggest small{color:var(--ch-faint);font-size:11px;line-height:16px}
      .ch-suggest span{font-size:12px;line-height:18px;overflow-wrap:anywhere}
      .ch-note{color:var(--ch-faint);font-size:12px;line-height:1.7}
      .ch-welcome-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
      .ch-sheet{position:absolute;inset:0;z-index:6;display:flex;align-items:center;justify-content:center;padding:24px}
      .ch-sheet-scrim{position:absolute;inset:0;background:rgba(15,23,42,.32)}
      .ch-sheet-card{position:relative;display:flex;flex-direction:column;width:min(560px,100%);max-height:100%;overflow:hidden;background:var(--ch-bg);border:1px solid var(--ch-border);border-radius:14px;box-shadow:0 18px 48px rgba(15,23,42,.24)}
      .ch-sheet-head{flex:none;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;border-bottom:1px solid var(--ch-border)}
      .ch-sheet-head strong{font-size:15px;line-height:22px}
      .ch-sheet-body{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:14px;padding:18px}
      .ch-sheet-foot{flex:none;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:12px 18px;border-top:1px solid var(--ch-border);background:var(--ch-panel)}
      .ch-sheet .ch-row{justify-content:flex-end}
      .ch-research{display:flex;flex-direction:column;gap:12px;padding:14px;border:1px solid var(--ch-border);border-radius:12px;background:var(--ch-panel)}
      .ch-research-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
      .ch-research-head strong{display:block;font-size:14px;line-height:22px}
      .ch-research-head .ch-btn{flex:none}
      .ch-research-progress{display:flex;align-items:center;gap:8px;color:var(--ch-muted);line-height:1.6}
      .ch-research-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}
      .ch-research-card{min-width:0;padding:12px 14px;border:1px solid var(--ch-border);border-radius:10px;background:var(--ch-bg)}
      .ch-research-card:last-child{grid-column:1/-1}
      .ch-research-card h4{margin:0 0 8px;font-size:13px;line-height:20px;color:var(--ch-muted);font-weight:600}
      .ch-research-card p{margin:0 0 8px;line-height:1.7;overflow-wrap:anywhere}
      .ch-level{display:inline-flex;align-items:center;height:22px;padding:0 9px;border-radius:999px;font-size:12px;background:var(--ch-bg-2);color:var(--ch-muted)}
      .ch-level[data-level=exists]{background:color-mix(in srgb,#f0a92b 20%,transparent);color:#8a5a00}
      .ch-level[data-level=similar]{background:color-mix(in srgb,#3b82f6 16%,transparent);color:#1d4ed8}
      .ch-level[data-level=none]{background:color-mix(in srgb,#10a37f 18%,transparent);color:#0b6b54}
      .ch-score{display:flex;align-items:center;gap:6px;margin-bottom:8px}
      .ch-score strong{font-size:26px;line-height:32px;font-weight:650}
      .ch-score span{color:var(--ch-faint);font-size:12px}
      .ch-score-bar{flex:1;min-width:60px;height:6px;border-radius:3px;background:var(--ch-bg-2);overflow:hidden;margin-left:6px}
      .ch-score-bar i{display:block;height:100%;border-radius:3px;background:#10a37f}
      .ch-score[data-band=mid] .ch-score-bar i{background:#f0a92b}
      .ch-score[data-band=low] .ch-score-bar i{background:#9aa1ab}
      .ch-sources,.ch-reasons,.ch-apps{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px}
      .ch-sources li{font-size:12px;line-height:1.55;overflow-wrap:anywhere;min-width:0}
      .ch-sources a{color:var(--ch-fg);text-decoration:underline;text-underline-offset:2px}
      .ch-sources small{display:block;color:var(--ch-faint);margin-top:2px}
      .ch-reasons li{position:relative;padding-left:12px;font-size:12px;line-height:1.6}
      .ch-reasons li::before{content:'';position:absolute;left:3px;top:8px;width:4px;height:4px;border-radius:50%;background:var(--ch-faint)}
      .ch-apps li{display:flex;flex-direction:column;gap:2px;font-size:12px;line-height:1.6}
      .ch-apps strong{font-size:13px;line-height:20px}
      .ch-assoc{display:flex;flex-direction:column;gap:10px;padding:14px;border:1px solid var(--ch-border);border-radius:12px;background:var(--ch-panel)}
      .ch-assoc-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
      .ch-assoc-head strong{display:block;font-size:14px;line-height:22px}
      .ch-assoc-head .ch-btn{flex:none}
      .ch-assoc-list{display:flex;flex-direction:column;gap:10px}
      .ch-assoc-item{display:flex;flex-direction:column;gap:6px;min-width:0;padding:12px 14px;border:1px solid var(--ch-border);border-radius:10px;background:var(--ch-bg)}
      .ch-assoc-item h4{margin:0;font-size:13px;line-height:20px}
      .ch-assoc-item p{margin:0;font-size:12px;line-height:1.65;color:var(--ch-muted);overflow-wrap:anywhere}
      .ch-assoc-item p b{color:var(--ch-fg);font-weight:600}
      .ch-assoc-actions{display:flex;justify-content:flex-end}
      .ch-draft{margin-top:4px;padding:10px 12px;border-left:3px solid var(--ch-border);border-radius:6px;background:var(--ch-bg-2);font-size:12px;line-height:1.7;white-space:pre-wrap;overflow-wrap:anywhere;max-height:420px;overflow-y:auto}
      .ch-web{flex:1;min-height:0;overflow-y:auto;padding:22px 26px 40px;scrollbar-width:thin;scrollbar-color:var(--ch-border) transparent}
      .ch-web-inner{max-width:1000px;margin:0 auto;display:flex;flex-direction:column;gap:16px}
      .ch-web-intro p{margin:0 0 10px;color:var(--ch-muted);line-height:1.7;max-width:70ch}
      .ch-web-search{display:flex;gap:8px;flex-wrap:wrap}
      .ch-web-search input{flex:1 1 260px;min-width:0;height:38px;padding:0 12px;border:1px solid var(--ch-border);border-radius:10px;background:var(--ch-bg);outline:none}
      .ch-web-search input:focus{border-color:var(--ch-primary)}
      .ch-web-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
      .ch-web-card{display:flex;flex-direction:column;gap:8px;min-width:0;padding:14px;border:1px solid var(--ch-border);border-radius:12px;background:var(--ch-bg)}
      .ch-web-card h3{margin:0;font-size:15px;line-height:22px;font-weight:600;overflow-wrap:anywhere}
      .ch-web-card p{margin:0;color:var(--ch-muted);line-height:1.65;overflow-wrap:anywhere}
      .ch-web-card-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:auto;padding-top:4px;min-width:0}
      .ch-web-card-foot a{color:var(--ch-faint);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
      .ch-web-progress{display:flex;align-items:center;gap:8px;color:var(--ch-muted);padding:32px 0}
      .ch-placeholder{display:flex;flex-direction:column;gap:10px;align-items:flex-start;justify-content:center;height:100%;max-width:420px;margin:0 auto;color:var(--ch-muted)}
      .ch-placeholder strong{color:var(--ch-fg);font-size:15px}
      .ch-status{display:flex;align-items:center;gap:8px;padding:12px 16px;margin:12px 14px;border:1px solid var(--ch-border);border-radius:9px;background:var(--ch-bg);color:var(--ch-muted);line-height:1.6}
      .ch-status .ch-btn{margin-left:auto;flex:none}
      .ch-empty-filter{display:flex;flex-direction:column;align-items:center;gap:8px;padding:36px 16px;color:var(--ch-muted);text-align:center}
      .ch-ai{position:absolute;z-index:5;inset-block:0;right:0;width:min(460px,100%);display:flex;flex-direction:column;min-height:0;background:var(--ch-bg);border-left:1px solid var(--ch-border);box-shadow:-10px 0 28px rgba(15,23,42,.12)}
      .ch-ai-head{flex:none;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid var(--ch-border)}
      .ch-ai-head strong{font-size:14px}
      .ch-ai-body{flex:1;min-height:0;display:flex;flex-direction:column}
      .ch-ai-start{display:flex;flex-direction:column;gap:12px;padding:20px 18px}
      .ch-ai-start h3{margin:0;font-size:15px}
      .ch-ai-start p{margin:0;color:var(--ch-muted);line-height:1.7}
      .ch-ai-actions{display:flex;gap:8px;flex-wrap:wrap}
      .ch-ai-conv{flex:1;min-height:0;display:flex;flex-direction:column}
      .ch-ai-hint{flex:none;padding:8px 16px;border-top:1px solid var(--ch-border);color:var(--ch-faint);font-size:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
      .ch-scrim{position:absolute;inset:0;z-index:4;background:rgba(15,23,42,.24)}
      .ch-spin{width:14px;height:14px;border:2px solid var(--ch-border);border-top-color:var(--ch-muted);border-radius:50%;animation:ch-spin .9s linear infinite;flex:none}
      @keyframes ch-spin{to{transform:rotate(360deg)}}
      @container creativity-hall (max-width: 760px){
        .ch-head{padding:12px 16px;align-items:center;flex-wrap:nowrap;gap:10px}
        .ch-brand{min-width:0;overflow:hidden}
        .ch-brand h1{font-size:18px;line-height:26px;overflow:hidden;text-overflow:ellipsis}
        .ch-brand .ch-count{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .ch-tools{flex:none}
        .ch-search{flex:1 1 100%;max-width:none}
        .ch-body{grid-template-columns:minmax(0,1fr)}
        .ch-list-pane{border-right:0}
        .ch-root[data-compact=true][data-selected=true] .ch-list-pane{display:none}
        .ch-root[data-compact=true][data-selected=false] .ch-detail-pane{display:none}
        .ch-detail-pane{padding:16px 16px 28px}
        .ch-ai{width:100%}
        .ch-sheet{padding:0;align-items:stretch}
        .ch-sheet-card{width:100%;max-height:none;border-radius:0;border:0}
        .ch-sheet-head{padding:14px 16px}
        .ch-sheet-body{padding:16px}
        .ch-sheet-foot{padding:12px 16px}
        .ch-web{padding:16px 16px 32px}
        .ch-web-grid{grid-template-columns:minmax(0,1fr)}
        .ch-research-grid{grid-template-columns:minmax(0,1fr)}
        .ch-research-card:last-child{grid-column:auto}
        .ch-item-title{-webkit-line-clamp:3}
        .ch-compose{padding:12px 14px 8px}
      }
      @container creativity-hall (max-width: 380px){
        .ch-brand .ch-count{display:none}
        .ch-detail-pane{padding:12px 12px 24px}
        .ch-detail{gap:14px}
        .ch-title-input{font-size:19px;line-height:27px}
      }
      @media (prefers-reduced-motion: reduce){.ch-spin{animation:none}}
    `

    function ensureStyles () {
      if (typeof document === 'undefined') return
      let node = document.getElementById(STYLE_ID)
      if (!node) {
        node = document.createElement('style')
        node.id = STYLE_ID
        document.head.appendChild(node)
      }
      if (node.dataset.version !== STYLE_VERSION) {
        node.textContent = CSS
        node.dataset.version = STYLE_VERSION
      }
    }

    function SearchIcon () {
      return h('svg', { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
        h('circle', { cx: 7, cy: 7, r: 4.5, stroke: 'currentColor', strokeWidth: 1.5 }),
        h('path', { d: 'M10.5 10.5 14 14', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' }))
    }

    function Welcome ({ onAdd, onOpenForm }) {
      const [text, setText] = React.useState('')
      const submit = (event) => {
        event.preventDefault()
        const title = text.trim()
        if (!title) return
        setText('')
        onAdd(title)
      }
      return h('div', { className: 'ch-welcome' },
        h('div', { className: 'ch-welcome-inner' },
          h('h2', null, '先记下第一个想法'),
          h('p', null, '一句话就够：灵光一现的点子、想写的选题、想改的生活习惯。之后可以补细节、打标签、写下下一步。'),
          h('form', { className: 'ch-welcome-form', onSubmit: submit },
            h('input', {
              value: text,
              onChange: (event) => setText(event.target.value),
              placeholder: '比如：把周末的菜市场逛成一条散步路线',
              'aria-label': '新创意',
              autoFocus: true
            }),
            h('button', { type: 'submit', className: 'ch-btn ch-btn-primary', disabled: !text.trim() }, '记下来')),
          h('div', { className: 'ch-suggest' },
            ...SUGGESTIONS.map((item) => h('button', {
              key: item.title,
              type: 'button',
              onClick: () => onAdd({ title: item.title, tags: [item.tag] })
            }, h('small', null, item.tag), h('span', null, item.title)))),
          h('div', { className: 'ch-welcome-actions' },
            h('button', { type: 'button', className: 'ch-btn', onClick: onOpenForm }, '填写完整信息再保存'),
            h('span', { className: 'ch-note' }, '也可以先记一句话，等有感觉了再补。')),
          h('p', { className: 'ch-note' }, '创意保存在本机的 DSH 数据目录里，打开就能用，不需要先建会话。需要 AI 一起想的时候，右上角再打开对话。')))
    }

    function CreateSheet ({ initialTitle, onClose, onCreate }) {
      const [title, setTitle] = React.useState(initialTitle || '')
      const [note, setNote] = React.useState('')
      const [tagText, setTagText] = React.useState('')
      const [status, setStatus] = React.useState('spark')
      const [step, setStep] = React.useState('')
      const titleRef = React.useRef(null)
      const save = () => {
        const text = title.trim()
        if (!text) return
        onCreate({ title: text, note, tags: cleanTags(tagText), status, nextStep: step })
      }
      React.useEffect(() => { if (titleRef.current) titleRef.current.focus() }, [])
      React.useEffect(() => {
        const onKey = (event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            onClose()
            return
          }
          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault()
            save()
          }
        }
        document.addEventListener('keydown', onKey, true)
        return () => document.removeEventListener('keydown', onKey, true)
      })
      return h('div', { className: 'ch-sheet', role: 'presentation' },
        h('div', { className: 'ch-sheet-scrim', onClick: onClose, 'aria-hidden': true }),
        h('form', {
          className: 'ch-sheet-card',
          role: 'dialog',
          'aria-modal': 'true',
          'aria-labelledby': 'ch-sheet-title',
          onSubmit: (event) => { event.preventDefault(); save() }
        },
        h('div', { className: 'ch-sheet-head' },
          h('strong', { id: 'ch-sheet-title' }, '新建创意'),
          h('button', { type: 'button', className: 'ch-btn ch-btn-ghost', onClick: onClose }, '关闭')),
        h('div', { className: 'ch-sheet-body' },
          h('div', { className: 'ch-field' },
            h('label', { htmlFor: 'ch-new-title' }, '想法（必填）'),
            h('input', {
              id: 'ch-new-title',
              ref: titleRef,
              className: 'ch-input',
              value: title,
              maxLength: 200,
              placeholder: '一句话说清这个想法',
              onChange: (event) => setTitle(event.target.value)
            })),
          h('div', { className: 'ch-field' },
            h('label', { htmlFor: 'ch-new-note' }, '描述'),
            h('textarea', {
              id: 'ch-new-note',
              className: 'ch-textarea',
              value: note,
              maxLength: 20000,
              placeholder: '为什么想做、想到的画面、参考的东西。',
              onChange: (event) => setNote(event.target.value)
            })),
          h('div', { className: 'ch-field' },
            h('label', { htmlFor: 'ch-new-tags' }, '标签'),
            h('input', {
              id: 'ch-new-tags',
              className: 'ch-input',
              value: tagText,
              placeholder: '用逗号分隔，例如：生活，写作',
              onChange: (event) => setTagText(event.target.value)
            })),
          h('div', { className: 'ch-field' },
            h('label', null, '状态'),
            h('div', { className: 'ch-segmented', role: 'group', 'aria-label': '初始状态' },
              ...STATUSES.map((item) => h('button', {
                key: item.id,
                type: 'button',
                className: 'ch-seg',
                'aria-pressed': status === item.id ? 'true' : 'false',
                onClick: () => setStatus(item.id)
              }, item.label)))),
          h('div', { className: 'ch-field' },
            h('label', { htmlFor: 'ch-new-step' }, '下一步'),
            h('textarea', {
              id: 'ch-new-step',
              className: 'ch-textarea ch-step',
              value: step,
              maxLength: 5000,
              placeholder: '现在就能做的一小步',
              onChange: (event) => setStep(event.target.value)
            }))),
        h('div', { className: 'ch-sheet-foot' },
          h('span', { className: 'ch-note' }, 'Ctrl + Enter 保存'),
          h('div', { className: 'ch-row' },
            h('button', { type: 'button', className: 'ch-btn', onClick: onClose }, '取消'),
            h('button', { type: 'submit', className: 'ch-btn ch-btn-primary', disabled: !title.trim() }, '保存创意')))))
    }

    function IdeaItem ({ idea, selected, onSelect }) {
      return h('li', null,
        h('button', {
          type: 'button',
          className: 'ch-item',
          'aria-current': selected ? 'true' : undefined,
          onClick: () => onSelect(idea.id)
        },
        h('span', { className: 'ch-dot', 'data-status': idea.status, 'aria-hidden': true }),
        h('span', { className: 'ch-item-main' },
          h('span', { className: 'ch-item-title' }, idea.title),
          h('span', { className: 'ch-item-sub' },
            h('span', null, STATUS_LABEL[idea.status] || '火花'),
            idea.tags.length
              ? h('span', { className: 'ch-tag' }, idea.tags.slice(0, 2).join(' · '))
              : null,
            h('span', null, relativeTime(idea.updatedAt))))))
    }

    const LEVEL_LABEL = { none: '未发现同类', similar: '有相近提法', exists: '已有同类方案' }

    function ResearchBlock ({ research, busy, error, onRun }) {
      const sources = research && research.priorArt ? research.priorArt.sources || [] : []
      return h('section', { className: 'ch-research', 'aria-label': '查新与商用评估' },
        h('div', { className: 'ch-research-head' },
          h('div', null,
            h('strong', null, '查新与商用评估'),
            h('span', { className: 'ch-note' }, research
              ? `更新于 ${relativeTime(research.at)}${research.online ? ' · 已联网检索' : ' · 本次未联网'}`
              : '联网查是否已有人提出，并判断商用价值和可用方向')),
          h('button', {
            type: 'button',
            className: 'ch-btn',
            disabled: busy,
            onClick: onRun
          }, busy ? '正在评估…' : research ? '重新评估' : '开始评估')),
        busy
          ? h('div', { className: 'ch-research-progress' },
            h('span', { className: 'ch-spin', 'aria-hidden': true }),
            h('span', null, '正在检索公开信息并分析，通常需要十几秒…'))
          : null,
        error ? h('div', { className: 'ch-status', role: 'alert' }, h('span', null, error)) : null,
        !research && !busy
          ? h('p', { className: 'ch-note' }, '会把这句创意的标题、描述和标签发给你当前配置的模型，并用关键词做公开网络检索；结果保存在本条创意里。')
          : null,
        research
          ? h('div', { className: 'ch-research-grid' },
            h('section', { className: 'ch-research-card' },
              h('h4', null, '有没有人提出过'),
              h('div', { className: 'ch-levels' },
                h('span', { className: 'ch-level', 'data-level': research.priorArt.level }, LEVEL_LABEL[research.priorArt.level] || '待判断')),
              h('p', null, research.priorArt.summary || '（没有给出结论）'),
              sources.length
                ? h('ul', { className: 'ch-sources' },
                  ...sources.map((source, index) => h('li', { key: source.url + index },
                    h('a', { href: source.url, target: '_blank', rel: 'noreferrer noopener' }, source.title || source.url),
                    source.snippet ? h('small', null, source.snippet) : null)))
                : h('p', { className: 'ch-note' }, '这次没有检索到可引用的公开来源。')),
            h('section', { className: 'ch-research-card' },
              h('h4', null, '商用价值'),
              h('div', { className: 'ch-score', 'data-band': research.commercial.score >= 70 ? 'high' : research.commercial.score >= 40 ? 'mid' : 'low' },
                h('strong', null, research.commercial.score),
                h('span', null, '/100'),
                h('div', { className: 'ch-score-bar' }, h('i', { style: { width: `${research.commercial.score}%` } }))),
              h('p', null, research.commercial.verdict || '（没有给出判断）'),
              research.commercial.reasons.length
                ? h('ul', { className: 'ch-reasons' }, ...research.commercial.reasons.map((reason, index) => h('li', { key: index }, reason)))
                : null),
            h('section', { className: 'ch-research-card' },
              h('h4', null, '可以用在哪些方面'),
              research.applications.length
                ? h('ul', { className: 'ch-apps' }, ...research.applications.map((item, index) => h('li', { key: index },
                  h('strong', null, item.area),
                  h('span', null, item.note))))
                : h('p', { className: 'ch-note' }, '没有给出具体方向。')))
          : null)
    }

    function AssociationsBlock ({ associations, busy, error, draftingKey, ideaId, onAssociate, onDraft }) {
      const items = associations && Array.isArray(associations.items) ? associations.items : []
      return h('section', { className: 'ch-assoc', 'aria-label': '这件事需要什么' },
        h('div', { className: 'ch-assoc-head' },
          h('div', null,
            h('strong', null, '这件事需要什么'),
            h('span', { className: 'ch-note' }, associations
              ? `AI 联想于 ${relativeTime(associations.at)}`
              : '记录后自动联想所需的能力、材料和工具')),
          h('button', {
            type: 'button',
            className: 'ch-btn',
            disabled: busy,
            onClick: onAssociate
          }, busy ? '正在联想…' : associations ? '重新联想' : '生成联想')),
        busy
          ? h('div', { className: 'ch-research-progress' },
            h('span', { className: 'ch-spin', 'aria-hidden': true }),
            h('span', null, '正在拆解这个创意需要什么…'))
          : null,
        error
          ? h('div', { className: 'ch-status', role: 'alert' },
            h('span', null, error),
            h('button', { type: 'button', className: 'ch-btn', onClick: onAssociate }, '重试'))
          : null,
        items.length
          ? h('div', { className: 'ch-assoc-list' },
            ...items.map((item, index) => {
              const key = `${ideaId}:${index}`
              const drafting = draftingKey === key
              return h('article', { className: 'ch-assoc-item', key },
                h('h4', null, item.area),
                item.why ? h('p', null, item.why) : null,
                item.firstStep ? h('p', null, h('b', null, '第一步：'), item.firstStep) : null,
                item.deliverable ? h('p', null, h('b', null, 'AI 可以产出：'), item.deliverable) : null,
                h('div', { className: 'ch-assoc-actions' },
                  h('button', {
                    type: 'button',
                    className: 'ch-btn',
                    disabled: drafting,
                    onClick: () => onDraft(item, index)
                  }, drafting ? '正在打样…' : item.draft ? '重新打样' : '让 AI 打个样')),
                item.draft ? h('div', { className: 'ch-draft' }, item.draft.text) : null)
            }))
          : (!busy && !error
              ? h('p', { className: 'ch-note' }, '还没有联想结果。点「生成联想」让 AI 拆解一次。')
              : null))
    }

    function Detail ({ idea, onPatch, onDelete, onBack, compact, saveState, saveError, researchBusy, researchError, onResearch, assocBusy, assocError, draftingKey, onAssociate, onDraft }) {
      const [tagText, setTagText] = React.useState(idea.tags.join('，'))
      const [confirmDelete, setConfirmDelete] = React.useState(false)
      React.useEffect(() => {
        setTagText(idea.tags.join('，'))
        setConfirmDelete(false)
      }, [idea.id])
      const commitTags = () => {
        const next = cleanTags(tagText)
        if (next.join('|') !== idea.tags.join('|')) onPatch({ tags: next })
      }
      return h('div', { className: 'ch-detail' },
        h('div', { className: 'ch-detail-top' },
          h('div', { className: 'ch-crumb' },
            compact ? h('button', { type: 'button', className: 'ch-btn ch-btn-ghost', onClick: onBack, 'aria-label': '返回创意清单' }, '← 返回清单') : h('span', null, '创意详情'),
            !compact ? h('span', { 'aria-hidden': true }, '·') : null,
            !compact ? h('span', null, relativeTime(idea.updatedAt)) : null)),
        h('div', { className: 'ch-field' },
          h('label', { htmlFor: 'ch-title' }, '想法'),
          h('textarea', {
            id: 'ch-title',
            className: 'ch-title-input',
            rows: 1,
            value: idea.title,
            maxLength: 200,
            onChange: (event) => onPatch({ title: event.target.value }),
            placeholder: '这个想法是什么？'
          })),
        h('div', { className: 'ch-field' },
          h('label', null, '状态'),
          h('div', { className: 'ch-segmented', role: 'group', 'aria-label': '创意状态' },
            ...STATUSES.map((status) => h('button', {
              key: status.id,
              type: 'button',
              className: 'ch-seg',
              'aria-pressed': idea.status === status.id ? 'true' : 'false',
              onClick: () => onPatch({ status: status.id })
            }, status.label)))),
        h('div', { className: 'ch-field' },
          h('label', { htmlFor: 'ch-note' }, '描述'),
          h('textarea', {
            id: 'ch-note',
            className: 'ch-textarea',
            value: idea.note,
            maxLength: 20000,
            placeholder: '为什么想做、想到的画面、参考的东西，都可以写在这里。',
            onChange: (event) => onPatch({ note: event.target.value })
          })),
        h('div', { className: 'ch-field' },
          h('label', { htmlFor: 'ch-step' }, '下一步'),
          h('textarea', {
            id: 'ch-step',
            className: 'ch-textarea ch-step',
            value: idea.nextStep,
            maxLength: 5000,
            placeholder: '举一个现在就能做的小动作，例如「周六上午去逛一次菜市场」。',
            onChange: (event) => onPatch({ nextStep: event.target.value })
          })),
        h('div', { className: 'ch-field' },
          h('label', { htmlFor: 'ch-tags' }, '标签'),
          h('input', {
            id: 'ch-tags',
            className: 'ch-input',
            value: tagText,
            placeholder: '用逗号分隔，例如：生活，写作',
            onChange: (event) => setTagText(event.target.value),
            onBlur: commitTags,
            onKeyDown: (event) => { if (event.key === 'Enter') { event.preventDefault(); commitTags(); event.currentTarget.blur() } }
          })),
        h(AssociationsBlock, {
          associations: idea.associations || null,
          busy: assocBusy === true,
          error: assocError || '',
          draftingKey,
          ideaId: idea.id,
          onAssociate,
          onDraft
        }),
        h(ResearchBlock, {
          research: idea.research || null,
          busy: researchBusy === true,
          error: researchError || '',
          onRun: onResearch
        }),
        h('div', { className: 'ch-meta' },
          h('span', null, '创建于 ' + relativeTime(idea.createdAt)),
          h('span', null, '更新于 ' + relativeTime(idea.updatedAt)),
          h('span', { className: 'ch-save', 'data-state': saveState },
            saveState === 'saving' ? '保存中…' : saveState === 'error' ? '保存失败：' + (saveError || '请稍后重试') : '已保存')),
        h('div', { className: 'ch-row' },
          h('span', { className: 'ch-note' }, '删除只影响这一条创意，不会动到会话或其他资料。'),
          confirmDelete
            ? h('div', { className: 'ch-delete-confirm' },
              h('span', null, '确定删除「' + (idea.title.length > 24 ? idea.title.slice(0, 24) + '…' : idea.title) + '」？'),
              h('button', { type: 'button', className: 'ch-btn ch-btn-danger', onClick: () => { onDelete(idea.id); setConfirmDelete(false) } }, '删除'),
              h('button', { type: 'button', className: 'ch-btn ch-btn-ghost', onClick: () => setConfirmDelete(false) }, '取消'))
            : h('button', { type: 'button', className: 'ch-btn ch-btn-ghost', onClick: () => setConfirmDelete(true) }, '删除这条创意')))
    }

    function ownedSession (service) {
      try {
        const id = service.currentSession()
        if (!id) return ''
        return service.ownsSession(id) ? id : ''
      } catch {
        return ''
      }
    }

    function AiPanel ({ service, conversation, onClose }) {
      const session = React.useSyncExternalStore(
        React.useCallback((listener) => service.subscribe(listener), [service]),
        React.useCallback(() => ownedSession(service), [service]))
      const [busy, setBusy] = React.useState(false)
      const [error, setError] = React.useState('')
      const go = (factory) => {
        setBusy(true)
        setError('')
        let promise
        try {
          promise = Promise.resolve(factory())
        } catch (reason) {
          promise = Promise.reject(reason)
        }
        service.run(promise)
        promise.then(() => { setBusy(false) }).catch((reason) => {
          setBusy(false)
          setError(reason && reason.message ? reason.message : '开始对话失败，请重试。')
        })
      }
      return h('aside', { className: 'ch-ai', 'aria-label': 'AI 协助' },
        h('div', { className: 'ch-ai-head' },
          h('strong', null, 'AI 协助'),
          h('button', { type: 'button', className: 'ch-btn ch-btn-ghost', onClick: onClose, 'aria-label': '关闭 AI 协助' }, '关闭')),
        h('div', { className: 'ch-ai-body' },
          session
            ? h('div', { className: 'ch-ai-conv' }, conversation)
            : h('div', { className: 'ch-ai-start' },
              h('h3', null, '让 AI 陪你把这个想法想透'),
              h('p', null, '对话会关联到创意堂。你可以让它帮忙拆步骤、找参考、挑毛病，或者把一段描述改写得更清楚。'),
              error ? h('div', { className: 'ch-status', role: 'alert' }, error) : null,
              h('div', { className: 'ch-ai-actions' },
                h('button', {
                  type: 'button',
                  className: 'ch-btn ch-btn-primary',
                  disabled: busy,
                  onClick: () => go(() => service.newSession())
                }, busy ? '正在打开…' : '开始对话'),
                h('button', {
                  type: 'button',
                  className: 'ch-btn',
                  disabled: busy,
                  onClick: () => go(() => service.newWorkspaceSession())
                }, '选择文件夹再开始')),
              h('p', { className: 'ch-note' }, '选择文件夹后，这个工作区里的资料和对话会一起保留，下次打开创意堂会自动恢复最近的对话。'))),
        session ? h('div', { className: 'ch-ai-hint' },
          h('span', null, '对话已关联创意堂'),
          h('button', { type: 'button', className: 'ch-btn ch-btn-ghost', onClick: onClose }, '收起')) : null)
    }

    function WebFeed ({ items, loading, error, query, extracted, added, onQueryChange, onSubmit, onRefresh, onAdd }) {
      return h('div', { className: 'ch-web' },
        h('div', { className: 'ch-web-inner' },
          h('div', { className: 'ch-web-intro' },
            h('p', null, '从公开网络收集「有人提出、但还没看到成熟实现」的创意线索。收进创意堂后会标上「网络灵感」标签，来源链接会写进描述。'),
            h('form', { className: 'ch-web-search', onSubmit },
              h('input', {
                value: query,
                onChange: (event) => onQueryChange(event.target.value),
                placeholder: '换个主题，例如：老人陪伴、小城生活、家务自动化',
                'aria-label': '搜索网络创意主题'
              }),
              h('button', { type: 'submit', className: 'ch-btn ch-btn-primary', disabled: loading }, loading ? '正在找…' : '搜索'))),
          loading
            ? h('div', { className: 'ch-web-progress' },
              h('span', { className: 'ch-spin', 'aria-hidden': true }),
              h('span', null, '正在检索公开网络并提炼创意，通常需要十几秒…'))
            : error
              ? h('div', { className: 'ch-status', role: 'alert' },
                h('span', null, error),
                h('button', { type: 'button', className: 'ch-btn', onClick: onRefresh }, '重试'))
              : h('div', { className: 'ch-web-grid' },
                ...items.map((item, index) => h('article', { className: 'ch-web-card', key: `${item.url}-${index}` },
                  h('h3', null, item.title),
                  item.summary ? h('p', null, item.summary) : null,
                  h('div', { className: 'ch-web-card-foot' },
                    h('a', { href: item.url, target: '_blank', rel: 'noreferrer noopener', title: item.url }, item.host || '查看来源'),
                    h('button', {
                      type: 'button',
                      className: 'ch-btn',
                      disabled: added.has(item.url),
                      onClick: () => onAdd(item)
                    }, added.has(item.url) ? '已收进' : '收进创意堂')))))
          ,
          h('p', { className: 'ch-note' }, extracted
            ? '这些线索由检索结果提炼，是否真的没人实现还需要你点开来源判断。'
            : '这次只用检索结果列出线索，没有做进一步提炼；点开来源可以自行判断。'))
      )
    }

    function Panel ({ service, conversation }) {
      React.useLayoutEffect(() => { ensureStyles() }, [])
      const rootRef = React.useRef(null)
      const [ideas, setIdeas] = React.useState([])
      const [loading, setLoading] = React.useState(true)
      const [loadError, setLoadError] = React.useState('')
      const [compact, setCompact] = React.useState(false)
      const [query, setQuery] = React.useState('')
      const [filter, setFilter] = React.useState('all')
      const [selectedId, setSelectedId] = React.useState('')
      const [aiOpen, setAiOpen] = React.useState(false)
      const [createOpen, setCreateOpen] = React.useState(false)
      const [draft, setDraft] = React.useState('')
      const [saveState, setSaveState] = React.useState('idle')
      const [saveError, setSaveError] = React.useState('')
      const [webOpen, setWebOpen] = React.useState(false)
      const [webItems, setWebItems] = React.useState([])
      const [webLoading, setWebLoading] = React.useState(false)
      const [webError, setWebError] = React.useState('')
      const [webQuery, setWebQuery] = React.useState('')
      const [webPage, setWebPage] = React.useState(0)
      const [webExtracted, setWebExtracted] = React.useState(false)
      const [webAdded, setWebAdded] = React.useState(() => new Set())
      const [researchingId, setResearchingId] = React.useState('')
      const [researchError, setResearchError] = React.useState('')
      const [associatingId, setAssociatingId] = React.useState('')
      const [associateError, setAssociateError] = React.useState('')
      const [draftingKey, setDraftingKey] = React.useState('')
      const associateRef = React.useRef(null)
      const hydrated = React.useRef(false)
      const saveTimer = React.useRef(null)

      const load = React.useCallback(() => {
        setLoading(true)
        setLoadError('')
        fetch(API, { credentials: 'same-origin', cache: 'no-store' })
          .then(async (response) => {
            if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || `HTTP ${response.status}`)
            return response.json()
          })
          .then((data) => {
            const list = Array.isArray(data.ideas) ? data.ideas : []
            setIdeas(list)
            hydrated.current = true
            setLoading(false)
          })
          .catch((error) => {
            setLoadError(error && error.message ? error.message : '读取失败')
            setLoading(false)
          })
      }, [])

      React.useEffect(() => { load() }, [load])

      React.useEffect(() => { setResearchError(''); setAssociateError('') }, [selectedId])

      React.useEffect(() => {
        if (!hydrated.current) return
        setSaveState('saving')
        setSaveError('')
        clearTimeout(saveTimer.current)
        saveTimer.current = setTimeout(() => {
          fetch(WRITE_API, {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ version: 1, ideas })
          }).then(async (response) => {
            if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || `HTTP ${response.status}`)
            setSaveState('saved')
          }).catch((error) => {
            setSaveState('error')
            setSaveError(error && error.message ? error.message : '请稍后重试')
          })
        }, 450)
        return () => clearTimeout(saveTimer.current)
      }, [ideas])

      React.useEffect(() => {
        const node = rootRef.current
        if (!node || typeof ResizeObserver === 'undefined') return
        const observer = new ResizeObserver((entries) => {
          const width = entries[0] && entries[0].contentRect ? entries[0].contentRect.width : node.clientWidth
          setCompact(width < 760)
        })
        observer.observe(node)
        setCompact(node.clientWidth < 760)
        return () => observer.disconnect()
      }, [])

      React.useEffect(() => {
        if (!aiOpen) return
        const onKey = (event) => {
          if (event.key === 'Escape' && !createOpen) setAiOpen(false)
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
      }, [aiOpen, createOpen])

      const addIdea = React.useCallback((input, options) => {
        const draftIdea = typeof input === 'string' ? { title: input } : (input || {})
        const text = String(draftIdea.title || '').trim()
        if (!text) return
        const now = new Date().toISOString()
        const idea = {
          id: uid(),
          title: text.slice(0, 200),
          note: String(draftIdea.note || ''),
          tags: Array.isArray(draftIdea.tags) ? draftIdea.tags.slice(0, 12) : [],
          status: STATUSES.some((item) => item.id === draftIdea.status) ? draftIdea.status : 'spark',
          nextStep: String(draftIdea.nextStep || ''),
          createdAt: now,
          updatedAt: now
        }
        setIdeas((list) => [idea, ...list])
        setSelectedId(idea.id)
        setFilter('all')
        setQuery('')
        if (compact) setAiOpen(false)
        if ((!options || options.autoAssociate !== false) && associateRef.current) {
          const created = idea
          window.setTimeout(() => { if (associateRef.current) associateRef.current(created) }, 80)
        }
      }, [compact])

      const patchIdea = React.useCallback((id, changes) => {
        setIdeas((list) => list.map((idea) => idea.id === id
          ? { ...idea, ...changes, updatedAt: new Date().toISOString() }
          : idea))
      }, [])

      const runResearch = React.useCallback((idea) => {
        if (!idea || researchingId) return
        setResearchingId(idea.id)
        setResearchError('')
        fetch('/api/creativity-hall/research', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ title: idea.title, note: idea.note, tags: idea.tags, nextStep: idea.nextStep })
        }).then(async (response) => {
          const data = await response.json().catch(() => ({}))
          if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`)
          if (!data.research) throw new Error('评估结果为空，请重试。')
          patchIdea(idea.id, { research: data.research })
        }).catch((error) => {
          setResearchError(error && error.message ? error.message : '评估没有完成，请重试。')
        }).finally(() => {
          setResearchingId('')
        })
      }, [patchIdea, researchingId])

      const runAssociate = React.useCallback((idea) => {
        if (!idea) return
        setAssociatingId(idea.id)
        setAssociateError('')
        fetch('/api/creativity-hall/associate', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ title: idea.title, note: idea.note, tags: idea.tags })
        }).then(async (response) => {
          const data = await response.json().catch(() => ({}))
          if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`)
          if (!data.associations) throw new Error('联想结果为空，请重试。')
          patchIdea(idea.id, { associations: data.associations })
        }).catch((error) => {
          setAssociateError(error && error.message ? error.message : '联想没有完成，请重试。')
        }).finally(() => {
          setAssociatingId('')
        })
      }, [patchIdea])
      associateRef.current = runAssociate

      const runDraft = React.useCallback((idea, item, index) => {
        if (!idea || !item) return
        const key = `${idea.id}:${index}`
        setDraftingKey(key)
        setAssociateError('')
        fetch('/api/creativity-hall/draft', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            title: idea.title,
            note: idea.note,
            tags: idea.tags,
            area: item.area,
            deliverable: item.deliverable
          })
        }).then(async (response) => {
          const data = await response.json().catch(() => ({}))
          if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`)
          if (!data.draft) throw new Error('没有返回初稿，请重试。')
          setIdeas((list) => list.map((current) => {
            if (current.id !== idea.id || !current.associations) return current
            const items = current.associations.items.map((entry, i) => (i === index ? { ...entry, draft: data.draft } : entry))
            return { ...current, associations: { ...current.associations, items }, updatedAt: new Date().toISOString() }
          }))
        }).catch((error) => {
          setAssociateError(error && error.message ? error.message : '打样没有完成，请重试。')
        }).finally(() => {
          setDraftingKey('')
        })
      }, [])

      const loadWeb = React.useCallback((searchQuery, page) => {
        setWebLoading(true)
        setWebError('')
        fetch('/api/creativity-hall/discover', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ query: searchQuery || '', page: page || 0 })
        }).then(async (response) => {
          const data = await response.json().catch(() => ({}))
          if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`)
          if (!Array.isArray(data.items) || !data.items.length) throw new Error('这次没有找到创意线索，换个主题再试。')
          return data
        }).then((data) => {
          setWebItems(data.items)
          setWebExtracted(data.extracted === true)
          setWebPage(page || 0)
          setWebAdded(new Set())
        }).catch((error) => {
          setWebError(error && error.message ? error.message : '加载失败，请重试。')
        }).finally(() => {
          setWebLoading(false)
        })
      }, [])

      const openWeb = () => {
        setWebOpen(true)
        setAiOpen(false)
        setCreateOpen(false)
        if (!webItems.length && !webLoading) loadWeb('', 0)
      }

      const addFromWeb = (item) => {
        addIdea({
          title: item.title,
          note: `${item.summary || ''}${item.summary ? '\n\n' : ''}来源：${item.url}`.trim(),
          tags: ['网络灵感']
        }, { autoAssociate: false })
        setWebAdded((previous) => new Set(previous).add(item.url))
      }

      const removeIdea = React.useCallback((id) => {
        setIdeas((list) => list.filter((idea) => idea.id !== id))
        setSelectedId((current) => (current === id ? '' : current))
      }, [])

      const onDraftSubmit = (event) => {
        event.preventDefault()
        const title = draft.trim()
        if (!title) return
        addIdea(title)
        setDraft('')
      }

      const counts = React.useMemo(() => {
        const map = { all: ideas.length }
        for (const status of STATUSES) map[status.id] = 0
        for (const idea of ideas) map[idea.status] = (map[idea.status] || 0) + 1
        return map
      }, [ideas])

      const filtered = React.useMemo(() => {
        const keyword = query.trim().toLowerCase()
        return ideas
          .filter((idea) => filter === 'all' || idea.status === filter)
          .filter((idea) => {
            if (!keyword) return true
            return [idea.title, idea.note, idea.nextStep, ...(idea.tags || [])]
              .join('\n').toLowerCase().includes(keyword)
          })
          .slice()
          .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      }, [ideas, query, filter])

      const selected = ideas.find((idea) => idea.id === selectedId) || null
      const hasIdeas = ideas.length > 0

      const body = loading
        ? h('div', { className: 'ch-welcome' }, h('div', { className: 'ch-status' }, h('span', { className: 'ch-spin', 'aria-hidden': true }), h('span', null, '正在读取你的创意…')))
        : loadError
          ? h('div', { className: 'ch-welcome' }, h('div', { className: 'ch-status', role: 'alert' }, h('span', null, '暂时读不到创意：' + loadError), h('button', { type: 'button', className: 'ch-btn', onClick: load }, '重试')))
          : !hasIdeas
            ? h(Welcome, { onAdd: addIdea, onOpenForm: () => setCreateOpen(true) })
            : h('div', { className: 'ch-list-pane' },
              h('form', { className: 'ch-compose', onSubmit: onDraftSubmit },
                h('input', {
                  value: draft,
                  onChange: (event) => setDraft(event.target.value),
                  placeholder: '记下此刻的想法，回车保存',
                  'aria-label': '记录新创意'
                }),
                h('button', { type: 'submit', className: 'ch-btn ch-btn-primary', disabled: !draft.trim() }, '记录')),
              h('div', { className: 'ch-list-search' },
                h('div', { className: 'ch-search' }, h(SearchIcon),
                  h('input', {
                    value: query,
                    onChange: (event) => setQuery(event.target.value),
                    placeholder: '搜索标题、描述或标签',
                    'aria-label': '搜索创意'
                  }))),
              h('div', { className: 'ch-filters', role: 'group', 'aria-label': '按状态筛选' },
                h('button', {
                  type: 'button',
                  className: 'ch-chip',
                  'aria-pressed': filter === 'all' ? 'true' : 'false',
                  onClick: () => setFilter('all')
                }, `全部 ${counts.all}`),
                ...STATUSES.map((status) => h('button', {
                  key: status.id,
                  type: 'button',
                  className: 'ch-chip',
                  'aria-pressed': filter === status.id ? 'true' : 'false',
                  onClick: () => setFilter(status.id)
                }, `${status.label} ${counts[status.id] || 0}`))),
              filtered.length
                ? h('ul', { className: 'ch-list', role: 'list' },
                  ...filtered.map((idea) => h(IdeaItem, {
                    key: idea.id,
                    idea,
                    selected: idea.id === selectedId,
                    onSelect: setSelectedId
                  })))
                : h('div', { className: 'ch-empty-filter' },
                  h('strong', null, '没有匹配的创意'),
                  h('span', null, '换个关键词，或切回「全部」看看。'),
                  h('button', { type: 'button', className: 'ch-btn', onClick: () => { setQuery(''); setFilter('all') } }, '清除筛选')),
              h('div', { className: 'ch-list-pane-footer', style: { padding: '10px 16px', color: 'var(--ch-faint)', fontSize: '12px', borderTop: '1px solid var(--ch-border)' } }, '共 ' + ideas.length + ' 条创意'))

      const detail = !hasIdeas
        ? null
        : h('div', { className: 'ch-detail-pane' },
          selected
            ? h(Detail, {
              idea: selected,
              compact,
              saveState,
              saveError,
              researchBusy: researchingId === selected.id,
              researchError,
              onResearch: () => runResearch(selected),
              assocBusy: associatingId === selected.id,
              assocError: associateError,
              draftingKey,
              onAssociate: () => runAssociate(selected),
              onDraft: (item, index) => runDraft(selected, item, index),
              onPatch: (changes) => patchIdea(selected.id, changes),
              onDelete: removeIdea,
              onBack: () => setSelectedId('')
            })
            : h('div', { className: 'ch-placeholder' },
              h('strong', null, '从左边挑一个想法'),
              h('span', null, '或者在上面直接记一条新的。每条创意都可以改状态、补描述，并写下马上能做的一步。')))

      return h('div', {
        className: 'ch-root',
        ref: rootRef,
        'data-compact': compact ? 'true' : 'false',
        'data-selected': selected ? 'true' : 'false'
      },
      h('header', { className: 'ch-head' },
        h('div', { className: 'ch-brand' },
          webOpen
            ? h('button', { type: 'button', className: 'ch-btn ch-btn-ghost', onClick: () => setWebOpen(false) }, '← 返回')
            : null,
          h('h1', null, webOpen ? '网络灵感' : '创意堂'),
          h('span', { className: 'ch-count' }, webOpen
            ? '公开网络里的未实现创意'
            : hasIdeas ? `${ideas.length} 条创意` : '把想法收在一处')),
        h('div', { className: 'ch-tools' },
          webOpen
            ? h('button', {
              type: 'button',
              className: 'ch-btn',
              disabled: webLoading,
              onClick: () => loadWeb(webQuery, webPage + 1)
            }, webLoading ? '正在找…' : '换一批')
            : h('button', {
              type: 'button',
              className: 'ch-btn',
              onClick: openWeb
            }, '网络灵感'),
          !webOpen
            ? h('button', {
              type: 'button',
              className: 'ch-btn ch-btn-primary',
              onClick: () => { setAiOpen(false); setCreateOpen(true) }
            }, '新建创意')
            : null,
          !webOpen
            ? h('button', {
              type: 'button',
              className: aiOpen ? 'ch-btn ch-btn-primary' : 'ch-btn',
              'aria-expanded': aiOpen ? 'true' : 'false',
              onClick: () => { setCreateOpen(false); setAiOpen((open) => !open) }
            }, 'AI 协助')
            : null)),
      webOpen
        ? h(WebFeed, {
          items: webItems,
          loading: webLoading,
          error: webError,
          query: webQuery,
          extracted: webExtracted,
          added: webAdded,
          onQueryChange: setWebQuery,
          onSubmit: (event) => { event.preventDefault(); loadWeb(webQuery, 0) },
          onRefresh: () => loadWeb(webQuery, webPage),
          onAdd: addFromWeb
        })
        : h('div', { className: 'ch-body' }, body, detail),
      aiOpen && compact ? h('div', { className: 'ch-scrim', onClick: () => setAiOpen(false), 'aria-hidden': true }) : null,
      aiOpen ? h(AiPanel, { service, conversation, onClose: () => setAiOpen(false) }) : null,
      createOpen
        ? h(CreateSheet, {
          onClose: () => setCreateOpen(false),
          onCreate: (idea) => {
            addIdea(idea)
            setCreateOpen(false)
          }
        })
        : null)
    }

    function apply (ctx) {
      ctx.effect(() => {
        ensureStyles()
        return () => {
          const node = document.getElementById(STYLE_ID)
          if (node) node.remove()
        }
      }, 'creativity-hall: styles')
      ctx.effect(() => ctx.desktopWorkbenches.register({
        title: '创意堂',
        panelTitle: '创意堂',
        description: '收集并整理创意，把选中的想法变成下一步行动。',
        // 工作台身份：仓库地址即身份，市场、侧栏入口和会话归属都用它。
        repository: 'https://github.com/yangzizai873/creativity',
        customFrame: true
      }, Panel))
    }

    return { apply, inject: ['desktopWorkbenches'] }
  }
})
