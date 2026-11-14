import sys; D=sys.argv[1]
steam='<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-9.96 9.04l5.35 2.21a2.83 2.83 0 0 1 1.6-.49h.15l2.38-3.45v-.05a3.77 3.77 0 1 1 3.77 3.77h-.09l-3.4 2.42v.13a2.83 2.83 0 0 1-5.62.5L2.4 14.6A10 10 0 1 0 12 2Zm-4.72 15.22-1.22-.5a2.13 2.13 0 1 0 1.17-2.9l1.27.52a1.57 1.57 0 1 1-1.22 2.88Zm9.6-7.49a2.51 2.51 0 1 0-2.5 2.51 2.51 2.51 0 0 0 2.5-2.5Zm-4.39 0a1.89 1.89 0 1 1 1.89 1.89 1.89 1.89 0 0 1-1.89-1.89Z"/></svg>'
base="""<!doctype html><html><head><meta charset="utf-8"><style>
* { box-sizing:border-box; margin:0; padding:0; }
html, body { background:transparent; }
body { font-family:-apple-system, "SF Pro Text", "Segoe UI", Arial, sans-serif; color:#fff; }
.wrap { display:inline-block; padding:16px 18px 24px; }
.card { position:relative; overflow:hidden; border-radius:14px; background:#080c14; box-shadow:0 10px 28px -10px rgba(0,0,0,.75), 0 0 0 1px rgba(255,255,255,.07); }
.art { position:absolute; inset:0; background:url(../img/library_hero.jpg) center 35% / cover; }
.cap { border-radius:5px; background:url(../img/library_600x900_2x.jpg) center/cover; box-shadow:0 0 0 1.5px #66c0f4, 0 10px 20px -8px #000; flex-shrink:0; }
.badges { display:flex; gap:5px; }
.badge { font-size:8px; font-weight:700; letter-spacing:.08em; padding:3px 6px; border-radius:2px; display:inline-flex; align-items:center; gap:4px; }
.b-steam { background:rgba(23,29,37,.9); color:#c6d4df; border:1px solid #2a475e; }
.b-prog { color:#7fcbf7; border:1px solid rgba(102,192,244,.55); background:rgba(8,12,20,.88); }
h1 { font-weight:800; letter-spacing:-.02em; line-height:1; text-shadow:0 3px 12px rgba(0,0,0,.6); }
h1 sup { font-size:.38em; vertical-align:top; position:relative; top:.3em; }
.ring { border-radius:50%; display:grid; place-items:center; flex-shrink:0; background:radial-gradient(closest-side, #080c12 82%, transparent 82.5% 100%), conic-gradient(#66c0f4 0 7.9%, rgba(255,255,255,.18) 0); }
.ring b { font-weight:800; color:#66c0f4; letter-spacing:-.02em; line-height:1; } .ring b small { font-size:.5em; }
.un { display:flex; align-items:center; gap:8px; min-width:0; }
.un img { width:30px; height:30px; border-radius:3px; box-shadow:0 0 0 1px #e5b143; flex-shrink:0; }
.un b { display:block; font-size:12px; font-weight:700; white-space:nowrap; } .un span { display:block; font-size:9.5px; color:#9fb0bf; white-space:nowrap; } .un em { font-style:normal; color:#e5b143; font-weight:600; }
.av { width:20px; height:20px; border-radius:50%; box-shadow:0 0 0 1px #66c0f4; }
.bar { height:4px; border-radius:2px; background:rgba(255,255,255,.14); overflow:hidden; } .bar i { display:block; height:100%; width:7.9%; background:#66c0f4; }
@@CSS@@</style></head><body><div class="wrap">@@HTML@@</div></body></html>"""
badges='<div class="badges"><span class="badge b-steam">'+steam+'STEAM</span><span class="badge b-prog">IN PROGRESS</span></div>'
un='<div class="un"><img src="../img/ach.jpg"><div><b>Higher Orbit</b><span>Latest unlock · <em>rare, 5.1%</em></span></div></div>'
title='<h1>LEGO<sup>®</sup> 2K Drive</h1>'
cards = {}
# 1. Original, compact
cards['1-original'] = ("""
.c1 { width:560px; height:170px; }
.c1 .art { left:120px; } .c1 .art::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg, #080c14 0%, rgba(8,12,20,.9) 25%, rgba(8,12,20,.5) 70%, rgba(8,12,20,.4)); }
.c1 .cap { position:absolute; left:18px; top:18px; width:89px; height:134px; }
.c1 .r { position:absolute; left:128px; right:16px; top:16px; bottom:14px; display:flex; flex-direction:column; }
.c1 h1 { font-size:24px; margin-top:8px; }
.c1 .p { display:flex; align-items:baseline; gap:7px; margin-top:8px; } .c1 .p b { font-size:17px; font-weight:800; color:#66c0f4; } .c1 .p span { font-size:11px; color:#c6d4df; }
.c1 .bar { width:260px; margin-top:4px; }
.c1 .bt { margin-top:auto; display:flex; justify-content:space-between; align-items:flex-end; }
""", '<div class="card c1"><div class="art"></div><div class="cap"></div><div class="r">'+badges+title+
     '<div class="p"><b>7%</b><span>3 of 38 achievements · 1h played</span></div><div class="bar"><i></i></div>'
     '<div class="bt">'+un+'<img class="av" src="../img/avatar.jpg"></div></div></div>')
# 2. Poster, compact
cards['2-poster'] = ("""
.c2 { width:540px; height:170px; }
.c2 .art::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg, rgba(5,8,13,.95) 0%, rgba(5,8,13,.75) 45%, rgba(5,8,13,.3) 75%, rgba(5,8,13,.55)); }
.c2 .l { position:absolute; left:20px; top:18px; bottom:16px; display:flex; flex-direction:column; }
.c2 .k { font-size:8px; font-weight:700; letter-spacing:.14em; color:#9fb4c7; display:flex; align-items:center; gap:5px; }
.c2 h1 { font-size:30px; margin-top:6px; }
.c2 .un { margin-top:auto; }
.c2 .ring { position:absolute; right:22px; top:50%; transform:translateY(-50%); width:118px; height:118px; text-align:center; }
.c2 .ring b { font-size:34px; display:block; } .c2 .ring span { display:block; font-size:9px; color:#c3ced8; margin-top:3px; }
""", '<div class="card c2"><div class="art"></div><div class="l"><span class="k">'+steam+' STEAM · IN PROGRESS</span><h1>LEGO<sup>®</sup><br>2K Drive</h1>'+un+'</div>'
     '<div class="ring"><div><b>7<small>%</small></b><span>3 of 38</span></div></div></div>')
# 3. Cover + ring (option 4), compact
cards['3-cover-ring'] = ("""
.c3 { width:560px; height:160px; }
.c3 .art::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg, rgba(5,8,13,.95) 0%, rgba(5,8,13,.8) 50%, rgba(5,8,13,.55) 78%, rgba(5,8,13,.75)); }
.c3 .cap { position:absolute; left:16px; top:16px; width:85px; height:128px; }
.c3 .m { position:absolute; left:118px; top:16px; bottom:14px; width:300px; display:flex; flex-direction:column; }
.c3 h1 { font-size:23px; margin-top:8px; }
.c3 .un { margin-top:auto; }
.c3 .ring { position:absolute; right:20px; top:50%; transform:translateY(-50%); width:104px; height:104px; text-align:center; }
.c3 .ring b { font-size:30px; display:block; } .c3 .ring span { display:block; font-size:8.5px; color:#c3ced8; margin-top:3px; }
""", '<div class="card c3"><div class="art"></div><div class="cap"></div><div class="m">'+badges+title+un+'</div>'
     '<div class="ring"><div><b>7<small>%</small></b><span>3 of 38</span></div></div></div>')
# 4. Logo + stat bar (option 5), compact
cards['4-logo-bar'] = ("""
.c4 { width:540px; height:180px; }
.c4 .art::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg, rgba(5,8,13,.7), rgba(5,8,13,.1) 60%), linear-gradient(0deg, rgba(5,8,13,.95) 0%, rgba(5,8,13,.4) 40%, transparent 62%); }
.c4 .top { position:absolute; left:16px; top:14px; display:flex; flex-direction:column; gap:8px; }
.c4 .logo { height:52px; margin-left:-3px; align-self:flex-start; filter:drop-shadow(0 4px 10px rgba(0,0,0,.6)); }
.c4 .bx { position:absolute; left:10px; right:10px; bottom:10px; height:52px; border-radius:8px; background:rgba(8,12,18,.9); border:1px solid #1e2a35; display:flex; align-items:center; gap:14px; padding:0 12px 0 8px; }
.c4 .ring { width:38px; height:38px; } .c4 .ring b { font-size:11px; }
.c4 .st b { display:block; font-size:15px; font-weight:800; line-height:1; } .c4 .st b i { font-style:normal; font-size:.62em; color:#8f98a0; } .c4 .st span { display:block; font-size:8.5px; color:#8f98a0; margin-top:3px; }
.c4 .sep { width:1px; height:28px; background:#1e2a35; }
.c4 .un { flex:1; } .c4 .un img { width:28px; height:28px; }
""", '<div class="card c4"><div class="art"></div><div class="top">'+badges+'<img class="logo" src="../img/logo.png"></div>'
     '<div class="bx"><div class="ring"><b>7<small>%</small></b></div><div class="st"><b>3<i>/38</i></b><span>achievements</span></div>'
     '<div class="st"><b>1h</b><span>played</span></div><div class="sep"></div>'+un+'<img class="av" src="../img/avatar.jpg"></div></div>')
# 5. NEW: slim pill
cards['5-pill'] = ("""
.c5 { width:500px; height:76px; border-radius:40px; display:flex; align-items:center; gap:12px; padding:0 10px 0 8px; }
.c5 .art { opacity:.35; } .c5 .art::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg, rgba(8,12,20,.6), rgba(8,12,20,.85)); }
.c5 .ic { position:relative; width:60px; height:60px; border-radius:50%; background:url(../img/library_600x900_2x.jpg) 50% 72% / 150% auto; box-shadow:0 0 0 2px #66c0f4; flex-shrink:0; }
.c5 .t { position:relative; flex:1; min-width:0; }
.c5 .k { font-size:8px; font-weight:700; letter-spacing:.12em; color:#9fb4c7; display:flex; align-items:center; gap:4px; }
.c5 h1 { font-size:17px; margin-top:3px; }
.c5 .bar { margin-top:6px; }
.c5 .s { position:relative; text-align:right; flex-shrink:0; } .c5 .s b { font-size:15px; font-weight:800; color:#66c0f4; display:block; line-height:1; } .c5 .s span { font-size:9px; color:#9fb0bf; }
.c5 .a { position:relative; width:44px; height:44px; border-radius:50%; overflow:hidden; box-shadow:0 0 0 1.5px #e5b143; flex-shrink:0; } .c5 .a img { width:100%; height:100%; }
""", '<div class="card c5"><div class="art"></div><div class="ic"></div><div class="t"><span class="k">'+steam+' STEAM · IN PROGRESS</span>'+title+'<div class="bar"><i></i></div></div>'
     '<div class="s"><b>3/38</b><span>7% · 1h</span></div><div class="a" title="Higher Orbit"><img src="../img/ach.jpg"></div></div>')
# 6. NEW: stacked card
cards['6-stacked'] = ("""
.c6 { width:340px; height:236px; }
.c6 .art { bottom:auto; height:112px; } .c6 .art::after { content:''; position:absolute; inset:0; background:linear-gradient(0deg, #080c14 0%, rgba(8,12,20,.2) 60%, rgba(8,12,20,.35)); }
.c6 .logo { position:absolute; left:14px; top:44px; height:46px; filter:drop-shadow(0 4px 10px rgba(0,0,0,.7)); }
.c6 .badges { position:absolute; left:14px; top:12px; }
.c6 .av { position:absolute; right:12px; top:12px; width:22px; height:22px; }
.c6 .row { position:absolute; left:14px; right:14px; top:112px; display:flex; align-items:center; gap:14px; }
.c6 .ring { width:54px; height:54px; } .c6 .ring b { font-size:15px; }
.c6 .st b { display:block; font-size:18px; font-weight:800; line-height:1; } .c6 .st b i { font-style:normal; font-size:.6em; color:#8f98a0; } .c6 .st span { display:block; font-size:9px; color:#8f98a0; margin-top:3px; }
.c6 .bar { flex:1; align-self:center; }
.c6 .un { position:absolute; left:10px; right:10px; bottom:10px; padding:7px 8px; border-radius:7px; background:rgba(255,255,255,.04); border:1px solid #1e2a35; }
""", '<div class="card c6"><div class="art"></div>'+badges+'<img class="av" src="../img/avatar.jpg"><img class="logo" src="../img/logo.png">'
     '<div class="row"><div class="ring"><b>7<small>%</small></b></div><div class="st"><b>3<i>/38</i></b><span>achievements</span></div><div class="st"><b>1h</b><span>played</span></div></div>'+un+'</div>')
for name,(c,h) in cards.items():
    open(f'{D}/compact/{name}.html','w').write(base.replace('@@CSS@@',c).replace('@@HTML@@',h))
print(list(cards))
