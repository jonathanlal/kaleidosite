export function postProcessHtml(html: string, opts?: { id?: string; embedControls?: boolean }) {
  let out = html || ''
  out = ensureSkeleton(out)
  out = injectGlobalStyles(out)
  const embedControls = opts?.embedControls !== false
  if (opts?.id && !embedControls) out = ensureFooterWithId(out, opts.id)
  if (embedControls) {
    out = injectControlStyles(out)
    out = injectControlPanel(out, opts?.id)
    out = injectControlScript(out)
  }
  return out
}

function ensureSkeleton(html: string) {
  const hasHtml = /<html[\s>]/i.test(html)
  const hasBody = /<body[\s>]/i.test(html)
  if (hasHtml && hasBody) return html
  const content = html.trim()
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>KaleidoSite</title></head><body>${content}</body></html>`
}

function injectGlobalStyles(html: string) {
  const style = `<style id="kaleidosite-base">html,body{height:100%;} html{scroll-behavior:smooth;} body{margin:0;} #hero{min-height:100vh;}</style>`
  if (/<style[^>]*id=["']kaleidosite-base["']/i.test(html)) return html
  if (/<head[\s>]/i.test(html)) return html.replace(/<head(\b[^>]*)>/i, `<head$1>${style}`)
  return html.replace(/<html(\b[^>]*)>/i, `<html$1><head>${style}</head>`)
}

function ensureFooterWithId(html: string, id: string) {
  if (!id) return html
  if (html.includes(id)) return html
  const footer = `\n<footer><small style="position:fixed;left:0;right:0;bottom:8px;text-align:center;opacity:.6">id: ${id}</small></footer>`
  if (html.includes('</body>')) return html.replace('</body>', `${footer}\n</body>`) 
  if (html.includes('</html>')) return html.replace('</html>', `${footer}\n</html>`) 
  return `${html}${footer}`
}

function injectControlStyles(html: string) {
  if (/<style[^>]*id=["']kaleidosite-controls-style["']/i.test(html)) return html
  const style = `<style id="kaleidosite-controls-style">` +
    `#kaleidosite-controls{position:fixed;top:16px;right:16px;z-index:2147483647;display:flex;align-items:center;gap:10px;padding:6px 10px;border-radius:999px;background:rgba(12,12,20,.68);backdrop-filter:blur(14px);box-shadow:0 12px 30px rgba(0,0,0,.35);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;font-size:13px;line-height:1.2;color:#fdfaff;}#kaleidosite-controls a,#kaleidosite-controls span{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.1);color:inherit;text-decoration:none;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}#kaleidosite-controls a:hover{background:rgba(255,255,255,.2);}#kaleidosite-controls button{padding:7px 14px;border-radius:999px;border:none;background:linear-gradient(135deg,#d946ef,#8b5cf6);color:#fff;font-weight:600;cursor:pointer;box-shadow:0 6px 14px rgba(217,70,239,.3);transition:transform .15s ease,box-shadow .15s ease,opacity .15s ease;}#kaleidosite-controls button:hover{transform:translateY(-1px);box-shadow:0 9px 20px rgba(217,70,239,.35);}#kaleidosite-controls button[data-loading]{opacity:.65;cursor:wait;box-shadow:none;transform:none;}@media(max-width:640px){#kaleidosite-controls{left:10px;right:10px;top:10px;justify-content:space-between;padding:8px 10px;}}` +
    `</style>`
  if (/<head[\s>]/i.test(html)) return html.replace(/<head(\b[^>]*)>/i, `<head$1>${style}`)
  return html.replace(/<html(\b[^>]*)>/i, `<html$1><head>${style}</head>`)
}

function injectControlPanel(html: string, id?: string) {
  if (html.includes('id="kaleidosite-controls"')) return html
  const latest = id
    ? `<a id="kaleidosite-latest" href="/site/${id}" target="_blank" rel="noopener noreferrer">Latest ${id}</a>`
    : `<span id="kaleidosite-latest">Generating...</span>`
  const controls = `<div id="kaleidosite-controls" role="toolbar" aria-label="KaleidoSite controls">${latest}<button id="kaleidosite-new-site" type="button">New Site</button></div>`
  if (html.includes('</body>')) return html.replace('</body>', `${controls}\n</body>`)
  if (html.includes('</html>')) return html.replace('</html>', `${controls}\n</html>`)
  return `${html}${controls}`
}

function injectControlScript(html: string) {
  if (/<script[^>]*id=["']kaleidosite-controls-script["']/i.test(html)) return html
  const script = `<script id="kaleidosite-controls-script">(function(){const endpoint='/api/pregen';let kicked=false;function kickoff(){if(kicked)return;kicked=true;try{fetch(endpoint,{method:'POST',keepalive:true}).catch(()=>{});}catch{}}kickoff();const btn=document.getElementById('kaleidosite-new-site');if(!btn)return;const original=btn.textContent||'New Site';btn.addEventListener('click',async function(){if(btn.hasAttribute('data-loading'))return;btn.setAttribute('data-loading','1');btn.textContent='Generating...';try{await fetch(endpoint,{method:'POST',keepalive:true});setTimeout(function(){location.reload();},1200);}catch{btn.textContent='Try Again';}finally{setTimeout(function(){btn.removeAttribute('data-loading');btn.textContent=original;},1400);}});})();</script>`
  if (html.includes('</body>')) return html.replace('</body>', `${script}\n</body>`)
  return `${html}${script}`
}
