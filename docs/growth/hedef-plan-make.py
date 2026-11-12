import math, datetime
S0,H0=25,1; days=14; start=datetime.date(2026,11,13)
def f(d,k): return (math.exp(k*d)-1)/(math.exp(k*days)-1)
longdays={1:'2. bölüm',4:'3. bölüm',7:'4. bölüm',10:'5. bölüm',13:'6. bölüm'}
TRD=['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar']
R=[];pS,pH=S0,H0
for d in range(0,days+1):
    S=round(S0+(1000-S0)*f(d,0.24)); H=round(H0+(4000-H0)*f(d,0.20))
    RS=round(S0+(350-S0)*f(d,0.12)); RH=round(H0+(450-H0)*f(d,0.10))
    R.append(dict(d=d,date=start+datetime.timedelta(days=d-1),S=S,H=H,dS=S-pS,dH=H-pH,sv=round((S-pS)/0.004,-2),lv=round((H-pH)*15,-1),RS=RS,RH=RH)); pS,pH=S,H
def n(x): return f"{int(x):,}".replace(',', '.')
def chart(key,rkey,maxv,color,label,unit):
    W,Hh,pl,pb,pt,pr=520,200,46,26,16,14
    x=lambda d: pl+(W-pl-pr)*d/days; y=lambda v: pt+(Hh-pt-pb)*(1-v/maxv)
    tp=' '.join(f"{x(r['d']):.1f},{y(r[key]):.1f}" for r in R)
    rp=' '.join(f"{x(r['d']):.1f},{y(r[rkey]):.1f}" for r in R)
    area=f"{x(0)},{y(0)} "+tp+f" {x(days)},{y(0)}"
    grid=''.join(f"<line x1='{pl}' x2='{W-pr}' y1='{y(v):.1f}' y2='{y(v):.1f}' stroke='#e9e4da'/><text x='{pl-6}' y='{y(v)+3:.1f}' text-anchor='end' font-size='9' fill='#8a8275'>{n(v)}</text>" for v in [0,maxv/4,maxv/2,3*maxv/4,maxv])
    xt=''.join(f"<text x='{x(d):.1f}' y='{Hh-10}' text-anchor='middle' font-size='9' fill='#8a8275'>{(start+datetime.timedelta(days=d-1)).strftime('%d.%m')}</text>" for d in (1,4,7,10,14))
    lm=''.join(f"<line x1='{x(d):.1f}' x2='{x(d):.1f}' y1='{pt}' y2='{Hh-pb}' stroke='#f2c94c' stroke-dasharray='3 3' opacity='.8'/>" for d in longdays)
    dots=''.join(f"<circle cx='{x(r['d']):.1f}' cy='{y(r[key]):.1f}' r='3' fill='{color}'/>" for r in R if r['d'] in (4,7,10,14))
    lab=''.join(f"<text x='{x(r['d'])-4:.1f}' y='{y(r[key])-8:.1f}' text-anchor='end' font-size='10' font-weight='700' fill='{color}'>{n(r[key])}</text>" for r in R if r['d'] in (7,10,14))
    return f"""<svg viewBox='0 0 {W} {Hh}' width='100%'><defs><linearGradient id='g{key}' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='{color}' stop-opacity='.28'/><stop offset='1' stop-color='{color}' stop-opacity='0'/></linearGradient></defs>
    {grid}{lm}<polygon points='{area}' fill='url(#g{key})'/><polyline points='{tp}' fill='none' stroke='{color}' stroke-width='3' stroke-linejoin='round'/>
    <polyline points='{rp}' fill='none' stroke='#5b8c5a' stroke-width='2.2' stroke-dasharray='6 4'/>{dots}{lab}{xt}</svg>"""
rows=''
for r in R[1:]:
    ld=r['d'] in longdays
    pct=r['S']/1000*100; pcth=r['H']/4000*100
    tag=f"<span class='tag long'>{longdays[r['d']]} · 17:05</span>" if ld else "<span class='tag'>3 Short · 12:05 · 17:05 · 19:05</span>"
    rows+=f"""<tr class='{'ld' if ld else ''}'><td class='day'><b>{r['d']}</b></td><td class='date'><b>{r['date'].strftime('%d.%m')}</b><span>{TRD[r['date'].weekday()]}</span></td><td>{tag}</td>
<td class='num'><b>{n(r['S'])}</b><i>+{n(r['dS'])}</i><div class='bar'><div style='width:{pct:.1f}%' class='bs'></div></div></td>
<td class='num'><b>{n(r['H'])}</b><i>+{n(r['dH'])}</i><div class='bar'><div style='width:{pcth:.1f}%' class='bh'></div></div></td>
<td class='fuel'>{n(r['sv'])}<span>Shorts</span>{n(r['lv'])}<span>uzun</span></td><td class='real'>{n(r['RS'])}<span>/</span>{n(r['RH'])} sa</td>
<td class='me'><div class='box'></div></td><td class='me'><div class='box'></div></td><td class='st'><span class='c g'></span><span class='c y'></span><span class='c r'></span></td></tr>"""
ms=''.join(f"<div class='ms'><div class='msd'>{R[d]['date'].strftime('%d.%m')}</div><div class='msl'>Gün {d}</div><div class='msv'><b>{n(R[d]['S'])}</b> abone</div><div class='msv h'><b>{n(R[d]['H'])}</b> saat</div><div class='msr'>gerçekçi: {n(R[d]['RS'])} · {n(R[d]['RH'])} sa</div></div>" for d in (4,7,10,14))
css="""
@font-face{font-family:Anton;src:url(Anton-Regular.ttf)}
@page{size:A4 landscape;margin:0}
*{box-sizing:border-box}body{margin:0;font-family:Inter,sans-serif;color:#2b2722;background:#fbf8f2;-webkit-print-color-adjust:exact}
.page{width:297mm;height:210mm;position:relative;overflow:hidden;page-break-after:always;padding:0}
.hero{background:radial-gradient(circle at 85% 45%,#4a321b 0,#1c1814 50%);color:#fff;height:56mm;padding:9mm 12mm;position:relative}
.hero .k{font:600 10px Inter;letter-spacing:.18em;color:#f2c94c;text-transform:uppercase}
.hero h1{font-family:Anton;font-weight:400;font-size:44px;line-height:1.02;margin:5px 0 6px;letter-spacing:.01em}
.hero h1 em{font-style:normal;color:#ffc83a}.hero h1 s{text-decoration:none;color:#ff6b5e}
.hero p{margin:0;color:#d9d0c2;font-size:11.5px;max-width:165mm}
.hero img{position:absolute;right:14mm;top:9mm;height:44mm;border-radius:50%;border:3px solid #ffc83a;box-shadow:0 0 0 6px rgba(255,200,58,.15),0 10px 30px rgba(0,0,0,.5)}
.kpis{display:flex;gap:5mm;padding:5mm 12mm 0}
.kpi{flex:1;background:#fff;border-radius:10px;padding:10px 12px;box-shadow:0 1px 0 #e7dfd1,0 6px 16px rgba(60,40,10,.06)}
.kpi .l{font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#8a8275;font-weight:600}
.kpi .v{font-family:Anton;font-size:28px;margin-top:2px}.kpi .s{font-size:10px;color:#6d665b}
.kpi.red .v{color:#d64541}.kpi.yel .v{color:#c99a12}.kpi.grn .v{color:#4f8a4e}
.charts{display:flex;gap:5mm;padding:4mm 12mm 0}
.card{flex:1;background:#fff;border-radius:10px;padding:8px 10px 2px;box-shadow:0 1px 0 #e7dfd1,0 6px 16px rgba(60,40,10,.06)}
.card h3{margin:0 0 2px;font-size:12px}.legend{font-size:9px;color:#8a8275}.legend b{display:inline-block;width:16px;height:3px;vertical-align:middle;margin:0 4px 0 8px}
.bottom{display:flex;gap:5mm;padding:4mm 12mm 0}
.mss{flex:1.6;display:flex;gap:3mm}.ms{flex:1;background:#1f1b17;color:#fff;border-radius:10px;padding:8px 10px}
.msd{font-family:Anton;font-size:20px;color:#ffc83a}.msl{font-size:9px;color:#bdb3a3;margin-bottom:4px;text-transform:uppercase;letter-spacing:.12em}
.msv{font-size:11px}.msv b{font-family:Anton;font-size:17px;font-weight:400;color:#ff7a6e}.msv.h b{color:#7fc4ff}.msr{font-size:8.5px;color:#9fd19c;margin-top:3px}
.how{flex:1;background:#fff;border-radius:10px;padding:8px 11px;font-size:9.5px;line-height:1.45;box-shadow:0 1px 0 #e7dfd1}
.how h4{margin:0 0 3px;font-size:11px}
.c{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:3px;vertical-align:-1px;border:1.5px solid}
.c.g{border-color:#4f8a4e}.c.y{border-color:#d9a514}.c.r{border-color:#d64541}
.how .c{background:currentColor}.how .g{color:#4f8a4e;background:#4f8a4e}.how .y{background:#d9a514}.how .r{background:#d64541}
.foot{position:absolute;bottom:4mm;left:12mm;right:12mm;font-size:8.5px;color:#9a9284;display:flex;justify-content:space-between}
.p2head{background:#1c1814;color:#fff;padding:6mm 12mm 5mm;display:flex;justify-content:space-between;align-items:flex-end}
.p2head h2{font-family:Anton;font-weight:400;font-size:26px;margin:0}.p2head h2 em{font-style:normal;color:#ffc83a}.p2head span{font-size:10px;color:#cfc5b5}
table{border-collapse:separate;border-spacing:0 2.2px;width:calc(100% - 24mm);margin:3mm 12mm 0;font-size:10px}
th{font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:#8a8275;text-align:left;padding:0 6px 2px;font-weight:600}
td{background:#fff;padding:5px 6px;vertical-align:middle;border-top:1px solid #efe8dc;border-bottom:1px solid #efe8dc}
td:first-child{border-left:1px solid #efe8dc;border-radius:7px 0 0 7px}td:last-child{border-right:1px solid #efe8dc;border-radius:0 7px 7px 0}
tr.ld td{background:#fff6dc;border-color:#f3dd97}
.day b{font-family:Anton;font-size:15px;font-weight:400;color:#b8ad9b}tr.ld .day b{color:#c99a12}
.date b{font-size:11px}.date span{display:block;font-size:8.5px;color:#8a8275}
.tag{font-size:8.5px;color:#6d665b;background:#f2ede4;border-radius:20px;padding:2px 7px;white-space:nowrap}.tag.long{background:#ffc83a;color:#2b2722;font-weight:700}
.num{width:30mm}.num b{font-family:Anton;font-weight:400;font-size:15px}.num i{font-style:normal;font-size:8.5px;color:#8a8275;margin-left:5px}
.bar{height:4px;background:#efe8dc;border-radius:3px;margin-top:2px;overflow:hidden}.bs{height:100%;background:#e5554c}.bh{height:100%;background:#3d8fd6}
.fuel{font-size:9.5px;color:#4a443c;white-space:nowrap}.fuel span{font-size:8px;color:#9a9284;margin:0 7px 0 3px}
.real{font-size:10px;color:#4f8a4e;font-weight:600;white-space:nowrap}.real span{color:#b8ad9b;margin:0 3px}
.me{width:23mm}.box{height:20px;border:1.5px dashed #cbbfa9;border-radius:5px;background:#fffdf8}
.st{white-space:nowrap;width:18mm}
"""
p1=f"""<div class='page'><div class='hero'><div class='k'>Deutsch mit Melo · Büyüme planı</div>
<h1>2 HAFTA: <em>1.000 ABONE</em><br>+ <s>4.000 SAAT</s></h1>
<p>13.11 – 26.11.2026 · 3 günde 1 uzun video, arada günde 3 Short (12:05 · 17:05 · 19:05). Her akşam sayılarını tabloya yaz – planın önünde mi, gerisinde mi, bir bakışta gör.</p>
<img src='melo.png'></div>
<div class='kpis'><div class='kpi'><div class='l'>Başlangıç (12.11)</div><div class='v'>25 · 1 sa</div><div class='s'>abone · uzun video izlenme saati</div></div>
<div class='kpi red'><div class='l'>Hedef abone</div><div class='v'>1.000</div><div class='s'>≈ 245.000 Shorts izlenmesi (%0,4 dönüşüm)</div></div>
<div class='kpi'><div class='l' style='color:#3d8fd6'>Hedef saat</div><div class='v' style='color:#3d8fd6'>4.000</div><div class='s'>≈ 60.000 uzun video izlenmesi (ort. 4 dk)</div></div>
<div class='kpi grn'><div class='l'>Gerçekçi tahmin</div><div class='v'>~350 · ~450 sa</div><div class='s'>bir Short patlarsa hedefe yaklaşır</div></div></div>
<div class='charts'><div class='card'><h3>Abone – olman gereken yol</h3><div class='legend'><b style='background:#e5554c'></b>hedef<b style='background:#5b8c5a'></b>gerçekçi<b style='background:#f2c94c'></b>uzun video günü</div>{chart('S','RS',1000,'#e5554c','Abone','')}</div>
<div class='card'><h3>Uzun video izlenme saati</h3><div class='legend'><b style='background:#3d8fd6'></b>hedef<b style='background:#5b8c5a'></b>gerçekçi<b style='background:#f2c94c'></b>uzun video günü</div>{chart('H','RH',4000,'#3d8fd6','Saat','')}</div></div>
<div class='bottom'><div class='mss'>{ms}</div>
<div class='how'><h4>Nasıl kontrol edersin?</h4>Her akşam YouTube Studio → <b>Para kazanma</b>: „Abone“ ve „Herkese açık uzun video izlenme saatleri“. 2. sayfaya yaz.<br>
<span class='c g'></span><b>yeşil</b> hedefin üstünde · <span class='c y'></span><b>sarı</b> hedefin %70–100'ü · <span class='c r'></span><b>kırmızı</b> %70'in altı → konu/kanca değişir.<br><span style='color:#8a8275'>Shorts saati 4.000'e sayılmaz – yalnız uzun videolar.</span></div></div>
<div class='foot'><span>Eğri üstel: ilk günler küçük artış, son günler büyük. Hedef ancak bir Short patlarsa (100 bin+) tutar – gerçekçi yolda olmak da başarıdır.</span><span>Sayfa 1/2</span></div></div>"""
p2=f"""<div class='page'><div class='p2head'><h2>GÜN GÜN <em>KONTROL</em></h2><span>Kalın = o günün sonunda olman gereken TOPLAM · çubuk = hedefe yüzde · sarı satır = uzun video günü · son sütunda durumu işaretle</span></div>
<table><tr><th>Gün</th><th>Tarih</th><th>Yayın</th><th>Hedef abone</th><th>Hedef saat</th><th>O gün gereken izlenme</th><th>Gerçekçi</th><th>Senin abone</th><th>Senin saat</th><th>Durum</th></tr>{rows}</table>
<div class='foot'><span>Varsayımlar: Shorts → abone %0,4 (Short 1'de ölçüldü) · uzun videoda ort. 4 dk izlenme · başlangıç 25 abone / 1 saat</span><span>Sayfa 2/2</span></div></div>"""
open('plan2.html','w').write(f"<!doctype html><html><head><meta charset='utf-8'><style>{css}</style></head><body>{p1}{p2}</body></html>")
