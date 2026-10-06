# 「67」藝術史 — 共用規格（所有場景作者必讀）

## 0. 這是什麼
一支 ~82 秒的 1920×1080 / 24fps 影片：**「67」這個迷因（雙手掌心向上、左右交替上下，嘴裡念 six… seven!）從洞穴壁畫一路「出現」在每個年代的藝術裡，直到 2025 的 TikTok。**
每個年代一幕，用**該年代真正的畫風／技法**畫出來（不是線稿、不是統一風格），畫面裡的人（或動物、物件）都在做 67 手勢。語氣：**一本正經的紀錄片／博物館式冷面笑匠**——畫得越正經、越有考據感，越好笑。
全部由 JavaScript 逐幀畫出：**p5.js 2.x（WEBGL 畫布）+ p5.brush 2.x**，無任何外部圖檔。使用者要求「用 p5 和 brush 寫程式做出來」，所以筆觸、水彩/濕壓、排線、流場、噴霧、炭筆等 brush 特性要真的用上；結構性的東西（漸層、紋理、像素、網點、光影合成）可以用下面的 2D 畫布層。

**品質標準：像美術館級的「仿古／仿畫風」致敬。** 使用者非常挑剔（曾因「一條線跑到底＝偷懶」發火）。每一幕要讓人**一眼認出是哪個年代、哪種藝術**，構圖有層次（前中後景）、有材質（紙/絹/石/陶/畫布的質感）、有光影、有色彩設計，不是幾個色塊。**逐幀看你的 PNG（用 Read 讀圖）並至少迭代 3 輪**，把「像程式畫的」變成「像那個年代的畫」。

## 1. 時間與節拍（所有場景同一個時鐘）
- 120 BPM：1 拍 = 0.5 s，1 小節 = 2.0 s。場景 t0 都落在小節線上。**手勢與動畫用「影片時間 t」**（不是場景內時間 u），全片才會同相。
- `draw(t, u, meta)`：`t` 影片秒數、`u = t - meta.t0` 場景內秒數、`meta` = timeline.json 裡你這一幕的項目（id,t0,t1,year,label,…）。
- **轉場會重疊鄰幕**：`draw()` 會在 `u ∈ [-0.35, 場景長 + 0.35]` 被呼叫（轉場 0.6 s，兩幕同時在畫、橫向百葉窗式滑過，中央疊年份倒數條）。所以：**背景與主體在 u = -0.35 就必須完整可見**（不要等到 u>0 才「長」出來）；最前/最後 0.35 s 不要放關鍵內容；入場小動畫（人物 pop-in、筆觸描上去）請在 u≈0.0–0.7 內完成。u<0 時各種 prog 值要 clamp，不可丟例外。
- **逐幀重畫、純函式**：不可有狀態、不可 `Math.random()`、不可 `Date.now()`。隨機一律 `V.rng(seed)`（每幀重新建立）、`V.hash(n)`、`V.noise1/2`；筆觸形狀用 `randomSeed(固定值)` 讓它不抖。**不抖**是預設；要「手繪抖動」才用 `V.tick`（= floor(t*12)，12Hz）換 seed。
- 場景長度：cave/egypt/greek 6 s；tiktok 6 s；其餘 4 s。

## 2. 「67 手勢」是全片唯一的主角動作（務必讀 src/rig67.js）
真實手勢：雙手在身前，掌心朝上，像天平／蹺蹺板，一手上、一手下，快速小幅交替；表情通常面無表情或睜大眼睛，頭微晃。念法 "six … seven!"。
- `V.G.arm(t, side)`：side 0 = 畫面左手、1 = 畫面右手；回傳 `{y(-1..1, +1=最高), v, top}`。**念 six 時畫面左手在最高點，念 seven 時畫面右手在最高點**。每隻手 1 秒一個來回（2 拍）。
- `V.G.pulse(t)`（每拍重擊後衰減，1→0）、`V.G.bob(t)`（-1..1，每拍一次，拍點最低）、`V.G.say(t)`（{n:6|7, word, idx, k, env}）、`V.G.tilt(t)`（頭微傾）。
- **每一幕至少要有 2 個以上的「人／擬人角色」清楚地做這個手勢**，且在 1080p 下一眼可辨：雙手掌心朝上、前臂交替升降（上下幅度要明顯，至少約為前臂長度的 1/2）。可以用不同年代的畫法詮釋（埃及式側面前臂、希臘黑像式剪影、中世紀平塗…），但**交替節奏必須與 V.G.arm 一致**。動物/物件也可以做（笑點加分，例如野牛的兩隻前蹄交替）。
- 身體隨 `V.G.pulse` 輕微下沉/彈跳，讓畫面「跟著拍子」。允許把 six/seven 以該年代的方式「寫」進畫面（象形文字、希臘數字、羅馬 LXVII、漢字 六七、泥金字…），並與 `V.G.say` 同步閃動。

## 3. HUD（主程式自動疊，不是你畫的）
每一幕結束後 main.js 自動畫：
- **年份區塊**（左上角，約 620×230 px；字體/顏色由 timeline.json 的 `hud` 定）
- **館藏標籤卡**（右下角，約 560×170 px，米色卡片，寫作品名/材質/冷面笑話）
→ **請在這兩個角落留出相對安靜（低對比、不放關鍵內容）的空間**，並讓背景與年份字色能對比。若你的畫面需要不同色彩，你可以在模組裡定義 `hudStyle(u, meta)` 回傳覆蓋樣式（可改 font/color/stroke/strokeW/size/shadow/pill/anchor(tl|tr|bl|br)/labelAnchor/labelBg/labelInk/labelEdge）。要完全自繪就設 `noHud: true` 並自己呼叫 `V.hudYear(u,meta,style)` / `V.hudLabel(u,meta,style)`。年份在 u≈0.1 s 彈出、標籤卡在 u≈0.9 s 滑入——你的畫面要在那之前就位。

## 4. 套件 API（src/kit.js；只讀不改）
座標 1920×1080、左上原點、y 向下。**不要自己呼叫 p5 的 translate/rotate/scale**（會與 brush 錯位）；要變換用下面的矩陣堆疊（只變換「點」，筆寬仍是螢幕像素）。
- 數學：`V.clamp V.lerp V.smooth(a,b,x) V.prog(t,t0,dur) V.map V.fract V.E.{lin,in2,in3,out2,out3,out4,io2,io3,outBack,inBack,outElastic,outBounce} V.hash V.noise1 V.noise2(x,y) V.rng(seed) V.rgb V.hex V.mix(c1,c2,t)`
- 矩陣：`V.push() V.pop() V.translate(x,y) V.rotate(rad) V.scale(s[,sy]) V.tp(x,y)(local→screen) V.msc() V.mReset()`
- 路徑：SVG path 字串（M L H V C S Q T Z，**無 A 弧**）或 `[[x,y],...]`（加 `{smooth:true}` 做 Catmull-Rom）。`V.ellipsePts(cx,cy,rx,ry,n) V.arcPts V.rectPts(x,y,w,h) V.smoothPts V.resample`；2-bone IK：`V.ik(sx,sy,hx,hy,l1,l2,dir)` → `{ex,ey,hx,hy}`（肘位置）。
- **筆觸** `V.ink(path, {w, brush, color, alpha, reveal(0..1 描上去), from, seed, wob, taper:[in,out], smooth, closed, step, press, boil})`：brush 可用 'ink' 'inkDry' 'lead' 'gouache'（平頭不透明，w=1≈12px）'bristle'（油畫刷痕，w=1≈18px）與 p5.brush 內建 '2B' 'HB' '2H' 'cpencil' 'pen' 'rotring' 'spray' 'marker' 'marker2' 'charcoal' 'hatch_brush'。`w=1` ≈ 4 px（ink），內建刷已放大 5 倍。
- **填色** `V.fill(path, {color, alpha, flat(true=平塗 wash,快 | false=水彩暈染,慢), bleed, tex, border, seed})`；`V.shape(path,{fill,alpha,water,ink,w,inkColor,…})` = 填色（+水彩斑駁）+ 外框；`V.dot(x,y,r,color)` 實心圓；`V.hatch(polygon,{dist,angle,color,brush,w,rand,clip:[x,y,w,h],seed})` 多邊形內排線。
  直接用 `brush.*`（brush.field/addField/flowLine/spline/mass/fill/wash/hatch…）也行，但**呼叫完請設 `V.pending = true`**。自訂刷 `brush.add(...)` 必須包在 `V.once('key', () => {...})` 裡（只註冊一次）。
- **2D 畫布層** `V.with2d((ctx,g)=>{ ...原生 Canvas2D（螢幕座標）... }, {alpha, blend:'multiply'|'screen'|'add'})`：漸層、`ctx.filter='blur(6px)'`、像素畫、網點、紋理、`globalCompositeOperation`、clip 全部在這裡做。便利：`V.gradient(stops,angleDeg)`、`V.bg('#hex')`（不透明底色）、`V.gfx(key,w,h,ctx=>{})`（快取 2D 圖，只畫一次）、`V.blit(g,x,y,w,h,{alpha,blend,rot})`、`V.vignette({amt})`、`V.grain({amt,anim,mode})`（片/紙顆粒）。
- **快取靜態層** `V.bake(key, ()=>{...畫在乾淨畫布上...})`：第一次執行並存成圖，之後每幀只 blit。**重的靜態背景（大面積水彩、牆面紋理、上千筆觸的天空）一定要 bake**，只讓會動的東西逐幀畫。（bake 會 `clear()` 畫布，所以要放在場景一開始。）
- **文字** `V.text(str, x, y, size, {font, weight, italic, color, align, baseline, alpha, stroke, strokeW, shadow:{c,x,y,b}, track, reveal, rot, blend})`，字型可用本機系統字：Papyrus、Herculanum、Luminari、Copperplate、Didot、Bodoni 72、Futura、Impact、Chalkduster、Phosphate、Zapfino、Snell Roundhand、Apple Chancery、Trattatello、Marker Felt、Courier New、Menlo、Silom、DIN Condensed、Baskerville、Cochin、Optima、Avenir Next、Trebuchet MS；中文：PingFang TC、Songti TC（宋體）、Kaiti TC（楷體）、Xingkai TC（行楷）、Libian TC（隸書）、Weibei TC（魏碑）、Wawati TC、Yuppy TC、Hannotate TC、HanziPen TC、BiauKaiTC、Baoli TC；日文：Hiragino Mincho ProN / Hiragino Sans；Apple Color Emoji 也可。`V.textW(str,size,{font,weight})` 量寬。**畫面內的文字也要拼對、夠大（≥ 36px）。**
- 原生 p5：`V.native(()=>{ noStroke(); fill(200,0,0); rect(...) })`（螢幕座標）。

### p5.brush 實戰筆記（這個專案踩過的）
- brush 筆觸是「排隊、換色/幀末才合成」。`V.with2d/V.text/V.native/V.blit` 會先 `V.flush()`，所以疊序＝呼叫順序；你自己用 `brush.*` 後要 `V.pending = true`。
- 水彩填色 (`flat:false`) 與大面積 wash 很貴；平塗用 `flat:true`。一幀 brush 筆數盡量 ≲ 1500（一個 hatch 多邊形 ≈ 15–40 筆）；**最重的一幀在 shot.mjs 測量要 < 2 s/幀**（全片 ~2000 幀要在合理時間內算完）。
- 流場：`brush.addField('名', (t,field)=>{ for col.. for row.. field[col][row] = 角度(度); return field; })` → `brush.field('名')` → `brush.flowLine(x,y,len,dir)` 或一般 `brush.spline` 會被場彎曲；`brush.noField()` 關掉。
- 排線：`brush.hatch(dist, angle, {rand})` + `brush.hatchStyle(brushName,color,weight)` 再畫多邊形；`V.hatch` 是它的包裝。
- 第一幀的第一個 fill 會被 p5.brush 吃掉的問題，主程式已用「暖機幀」處理，你不用管。

## 5. 工具與流程
```
export PATH="$HOME/.local/share/fnm:$HOME/.local/bin:$PATH"; eval "$(fnm env)"
cd <repo-root>
node tools/shot.mjs "index.html?notrans=1" out/<id>.png 12.0 13.0 14.5      # 乾淨的單幀（無轉場）→ out/<id>-0.png, -1.png … 印出 ms/幀
node tools/shot.mjs index.html out/<id>_tr.png 9.8 10.0 10.2                # 看轉場區（含年份倒數）
node tools/sheet.mjs out/<id>_sheet.png 12.0 12.25 12.5 12.75 13.0 13.25    # 接觸表（可一次看一小節的動作）
```
**用 Read 工具看 PNG** 是判斷畫面的唯一方式。每次修改後都要看：場景開頭(u≈0)、中段、結尾(t1-0.3)、一小節內 hands 的兩個極端（t = 整數秒 與 +0.5 s）、HUD 兩角是否被內容壓到。檢查 `window.__lastError`（shot.mjs 會印 [pageerror]/console error）。
你只能編輯 `src/scenes/<你的id>.js`（單一檔案，所有輔助函式包在 IIFE 裡、名稱加你的 id 前綴；它會被 `<script>` 載入，註冊 `V.scenes.<id> = { init?(meta){}, draw(t,u,meta){}, hudStyle?(u,meta){}, noHud? }`）。不要改 kit.js / hud.js / main.js / rig67.js / timeline；需要共用修改就寫在最後報告裡。不要碰別人的場景檔。
場景檔要能獨立運作：其他場景沒做好時，你自己的幀仍然正常（不要依賴別的場景）。

## 6. 交付報告（≤ 14 行，繁體中文）
做了什麼（畫風、技法、構圖）、節拍表（u 秒 → 發生什麼，供我配音效）、最重一幀的 ms/幀、已知弱點、希望我調整的 HUD 位置/顏色。
