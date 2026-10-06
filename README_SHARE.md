# 《67：一部藝術史》— 怎麼讓別人做出同一支影片

## 先講清楚「一模一樣」是什麼意思
- **想要「逐幀一模一樣」** → 不能靠 prompt，要把這個專案資料夾給對方（路線 A）。畫面是純函式 `renderAt(t)`，同一份原始碼在同一台機器上重跑就會得到同樣的幀。
- **想要「同一個概念、同樣品質，但細節會不同」** → 用路線 B 的 prompt，讓 Claude Code 從零重做。每個子代理的構圖與細節都會自己發揮，不可能逐像素相同。

## 路線 A：給專案（最準）
打包（排除體積大、可重生的東西）：
```bash
cd ~/Desktop/claude_workspace
zip -r meme67-history-source.zip meme67-history \
  -x "meme67-history/node_modules/*" "meme67-history/frames/*" "meme67-history/tiles_src/*" "meme67-history/out/*" "meme67-history/audio/mix.wav" "meme67-history/.DS_Store"
```
對方拿到後（需 macOS + Google Chrome + Node 20+ + ffmpeg；音訊另需 Python 3.12 + `mlx-audio`、`numpy`、`scipy`、`soundfile`）：
```bash
cd meme67-history && npm install                         # 裝 p5 / p5.brush / puppeteer-core
node tools/mktimeline.mjs                                # 產 public/timeline.json
node tools/render.mjs --from 0 --to 1719 --workers 6     # 主體 ≈5 分鐘（M 系列晶片）
tools/mktiles.sh                                         # 結尾拼貼用的 15 組小圖
node tools/render.mjs --from 1720 --to 1967 --workers 6  # 結尾
python audio/tts_words_fast.py && python audio/build_audio.py   # Kokoro 念 six/seven + 配樂 → audio/mix.wav
CRF=18 tools/encode.sh frames out/67.mp4 audio/mix.wav   # 成品
node tools/shot.mjs cover.html out/cover.png 0           # 封面
```
注意：字型用的是 macOS 內建字（Papyrus、Herculanum、Songti TC、Bodoni 72…），Windows/Linux 要換字型；`tools/*.mjs` 裡寫死 `/Applications/Google Chrome.app`。

## 路線 B：從零讓 Claude Code 重做（可直接貼）
建議在空資料夾、Claude Code（Opus 級模型）、**Max 方案**下執行；整支約耗 700–800 萬 token，會吃掉大半週額度。

### 主 prompt
```
請用 p5.js 2.x + p5.brush 2.x（WEBGL 畫布）做一支約 82 秒、1920×1080、24fps 的程式生成影片《67：一部藝術史》。
所有畫面都由 JavaScript 逐幀畫出（純函式 renderAt(t)，用 Puppeteer 逐幀截圖 → ffmpeg 合成），不可使用任何外部圖片/影片素材。

【概念】網路迷因「67」（雙手掌心向上、左右交替上下，嘴裡念 six… seven!）從洞穴壁畫一路「出現」在每個年代的藝術裡，直到 2025 的 TikTok。
語氣：一本正經的紀錄片／博物館冷面笑話——畫得越正經越好笑。不要線稿，每個年代都要用「該年代真正的畫風與技法」重現。

【結構】開場 4 s（黑底打字：「考古學家發現：人類，一直都在做同一件事。」→ 6 與 7 在第 2.0 / 2.5 秒重擊成大標「67」）
→ 15 個年代各一幕，依序：洞穴壁畫(約 40,000 BCE)、古埃及墓室(約 1300 BCE)、希臘黑像陶瓶(約 500 BCE)、龐貝馬賽克(79 CE)、北宋水墨山水(約 1000)、
  中世紀泥金手抄本(約 1250)、文藝復興《最後的晚餐》(1498)、浮世繪神奈川沖浪裏(1831)、梵谷星夜(1889)、達利超現實(1931，所有鐘停在 6:07)、
  波普藝術(1962，沃荷網格＋李奇登斯坦網點)、synthwave(1985)、16-bit 像素格鬥(1991)、Windows XP＋MSN(2006)、TikTok(2025)
  （前三幕各 6 s，其餘 4 s，TikTok 6 s）
→ 結尾 10 s：15 個年代的實際畫面做成 5×3 馬賽克，依序在拍點上彈出，全部同步做 67，最後出現大標「67」與「（沒有人知道它是什麼意思）」。
每一幕：左上顯示年份（字體/配色符合該年代），右下顯示一張博物館館藏標籤卡（館藏編號、作品名、材質、一句冷面笑話）；
幕與幕之間用百葉窗式滑動轉場，中央疊一條「年份計數器」從上一年快速倒數/跳到下一年。

【全片統一的節拍】120 BPM（1 拍 0.5 s、1 小節 2 s）。67 手勢＝左右手每 1 秒各完成一次升降；畫面左手到最高點時念 six，右手到最高點時念 seven。
每一幕至少 2 個以上的角色（或動物/物件）做這個手勢，交替節奏必須一致（所有幕共用同一個 V.G.arm(t, side) 函式）。

【聲音】全部程式合成：每個年代用該時代樂器演奏同一個兩音動機（洞穴=鼓與骨笛、埃及=豎琴、希臘=里拉琴…、像素=chiptune、TikTok=808），
疊上本機 Kokoro TTS 念的 six / seven（每個年代套不同音效處理：洞穴迴響、8-bit crush、電話音質…）；轉場有年份滴答聲與 whoosh。

【做法 —— 請照這個順序，不要一次全寫】
1. 先建立共用套件（kit.js：筆觸/填色/排線/2D 圖層/文字/快取 bake；rig67.js：節拍與手勢；hud.js：年份＋標籤卡＋轉場倒數；main.js：場景調度與轉場），
   並寫好 tools（shot/sheet/render/encode）。先用 shot 看圖驗證套件，再往下。
2. 寫 STYLE.md（共用規格）＋ 15 份各年代美術簡報（畫風、構圖、色票、技法、做 67 的角色、節拍表、HUD 留白位置）。
3. 平行派 15 個子代理，每個只負責一個檔案 src/scenes/<id>.js；要求它們每輪「渲染 PNG → 用 Read 看圖 → 修改」至少 3 輪，並回報節拍表與 ms/幀。
4. 我（主代理）逐幕看接觸表驗收，再自己做開場、結尾拼貼、配音配樂。
5. 渲染全片 → 做結尾用的小圖 → 渲染結尾 → 合成 mp4（H.264、AAC）。
品質標準：像美術館級的仿古致敬，要有前中後景、材質、光影，不是色塊；每一幕在轉場重疊的 ±0.35 s 內畫面就必須完整。
```

### 每個年代簡報的模板（第 2 步用，可照這個格式叫 Claude 產生）
```
# <id> — <年份> · <畫風>（影片 <t0>–<t1> s）
要像：<真實參考作品與技法>
畫面：<底材/背景質感；主體構圖；前中後景>
做 67 的角色：<誰、怎麼做、至少 2 個；動物/物件也行>
six/seven 的寫法：<用該年代的方式寫進畫面：象形文字、希臘文、羅馬數字、漢字、泥金字…>
質感：<紙/絹/石/陶/畫布/螢幕的做舊或顆粒>
HUD 留白：左上年份區、右下標籤卡區保持安靜
色票：<5–8 色>
動態：<每拍會動的東西、持續的環境動態>
```

## 想省 token 的版本
- 只做 6–8 個年代（例如：洞穴、埃及、浮世繪、梵谷、波普、像素、TikTok），結尾拼貼改 4×2，token 約降到 1/2。
- 不要平行 15 個 Opus 子代理；改成一次 3–4 個，並在簡報裡規定「最多迭代 3 輪」。
- 沿用路線 A 的 kit/hud/main，只重寫各年代簡報，可省掉第 1 步的來回。
