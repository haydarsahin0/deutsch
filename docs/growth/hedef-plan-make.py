import math, datetime
S0,H0=25,1
days=14; start=datetime.date(2026,11,13)
def f(d,k): return (math.exp(k*d)-1)/(math.exp(k*days)-1)
longdays={1,4,7,10,13}
ep={1:'2. bölüm',4:'3. bölüm',7:'4. bölüm',10:'5. bölüm',13:'6. bölüm'}
tr_days=['Pzt','Sal','Çar','Per','Cum','Cmt','Paz']
rows=[];prevS,prevH=S0,H0
for d in range(1,days+1):
    S=round(S0+(1000-S0)*f(d,0.24)); H=round(H0+(4000-H0)*f(d,0.20))
    dS,dH=S-prevS,H-prevH; prevS,prevH=S,H
    # realistic track (my estimate): ~350 subs / ~450 h at day 14, gentler curve
    RS=round(S0+(350-S0)*f(d,0.12)); RH=round(H0+(450-H0)*f(d,0.10))
    sv=dS/0.004  # shorts views needed at 0.4 % sub conversion
    lv=dH*60/4   # long views needed at 4 min avg view
    date=start+datetime.timedelta(days=d-1)
    pub=('🎬 '+ep[d]+' (17:05)') if d in longdays else '3 Short (12:05 · 17:05 · 19:05)'
    rows.append((d,date,tr_days[date.weekday()],pub,S,dS,H,dH,round(sv,-2),round(lv,-1),RS,RH))
def n(x): return f"{x:,}".replace(',', '.')
tr=''.join(f"<tr class='{'long' if r[0] in longdays else ''}'><td>{r[0]}</td><td>{r[1].strftime('%d.%m')} {r[2]}</td><td class='pub'>{r[3]}</td><td class='t'>{n(r[4])}</td><td>+{n(r[5])}</td><td class='t'>{n(r[6])}</td><td>+{n(r[7])}</td><td class='fuel'>{n(int(r[8]))}</td><td class='fuel'>{n(int(r[9]))}</td><td class='real'>{n(r[10])}</td><td class='real'>{n(r[11])}</td><td class='blank'></td><td class='blank'></td></tr>" for r in rows)
html=f"""<!doctype html><html><head><meta charset='utf-8'><style>
@page{{size:A4 landscape;margin:12mm}}
body{{font-family:'DejaVu Sans',Arial,sans-serif;color:#1d1d1f;font-size:10.5px}}
h1{{font-size:22px;margin:0 0 2px}} .sub{{color:#555;margin-bottom:10px}}
table{{width:100%;border-collapse:collapse}} th,td{{border:1px solid #ccc;padding:4px 5px;text-align:right}}
th{{background:#222;color:#fff;font-size:9.5px}} td.pub{{text-align:left;font-size:9.5px}} td:first-child,td:nth-child(2){{text-align:left}}
tr.long td{{background:#fff4d6}} td.t{{font-weight:bold;font-size:12px}} td.fuel{{color:#555}} td.real{{color:#2a6;}} td.blank{{background:#fafafa;width:58px}}
.box{{border:1px solid #ccc;border-radius:6px;padding:8px 10px;margin:8px 0;background:#f7f7f7}}
.red{{color:#c00;font-weight:bold}} .grid{{display:flex;gap:10px}} .grid .box{{flex:1}}
</style></head><body>
<h1>Deutsch mit Melo – 2 haftalık hedef: 1.000 abone + 4.000 saat</h1>
<div class='sub'>Gün 1 = 13.11.2026 (2. bölüm) · Gün 14 = 26.11.2026 · Başlangıç varsayımı: ~25 abone, ~1 saat · Plan: 3 günde 1 uzun video (sarı satırlar), arada günde 3 Short</div>
<table><tr><th>Gün</th><th>Tarih</th><th>Yayın</th><th>HEDEF abone (toplam)</th><th>o gün</th><th>HEDEF saat (toplam)</th><th>o gün</th><th>Gereken Shorts izlenmesi o gün*</th><th>Gereken uzun video izlenmesi o gün**</th><th>Gerçekçi tahmin: abone</th><th>Gerçekçi tahmin: saat</th><th>SENİN abone</th><th>SENİN saat</th></tr>{tr}</table>
<div class='grid'>
<div class='box'><b>Nasıl kontrol edersin?</b><br>Her akşam YouTube Studio → <b>Kazanç / Para kazanma</b> sayfası: „Abone“ ve „Herkese açık uzun video izlenme saatleri (son 365 gün)“. Sayıyı son iki sütuna yaz.<br>
🟢 hedefin üstünde · 🟡 hedefin %70–100'ü (plan doğru, biraz ivme lazım) · 🔴 %70'in altında (Shorts kancaları / konu değişmeli).<br>
Kalın sayı = o günün sonunda olman gereken toplam.</div>
<div class='box'><b>Varsayımlar</b><br>* Shorts → abone dönüşümü %0,4 (Short 1'de ölçülen). 1.000 aboneye ~245.000 Shorts izlenmesi gerekir.<br>
** Uzun videoda ortalama 4 dk izlenme. 4.000 saate ~60.000 uzun video izlenmesi gerekir. Shorts izlenme saati 4.000'e <b>sayılmaz</b>.<br>
Eğri üstel: ilk günler küçük, son günler büyük – yani hedef ancak bir Short patlarsa (100 bin+) ve izleyiciler uzun videolara akarsa tutar.</div>
<div class='box'><b>Dürüst not</b><br>Hedef sütunları „2 haftada olması için gereken“ yoldur. Yeşil sütun benim gerçekçi tahminim (~350 abone, ~450 saat). <span class='red'>Hedefi kaçırmak başarısızlık değil</span>: gerçekçi yolda olsan bile 1.000 / 4.000'e birkaç ayda ulaşılır. Bir Short patlarsa tablo bir günde değişir.</div>
</div></body></html>"""
open('plan.html','w').write(html)
for r in rows: print(r[0],r[1],r[4],r[5],r[6],r[7],int(r[8]),int(r[9]),r[10],r[11])
