"""Keyframes of the CRT version of the loop Short 'Wo steht das Verb?' (timed to the existing voice)."""
import sys, json, os
LIB, OUT = sys.argv[1], sys.argv[2]
sys.path.insert(0, LIB)
import crt
from crt import CRTTerminal
crt._FONT.update({
 'ü': ['.#.#.', '.....', '#...#', '#...#', '#...#', '#..##', '.##.#'],
 'ä': ['.#.#.', '.....', '.###.', '....#', '.####', '#...#', '.####'],
 'ö': ['.#.#.', '.....', '.###.', '#...#', '#...#', '#...#', '.###.'],
 'ß': ['.##..', '#..#.', '#..#.', '#.#..', '#..#.', '#...#', '#.##.'],
})
crt.ROM_CHARS, crt.ROM, crt.ROM_INDEX = crt._build_rom()
P = 'melo@deutsch:~$ '
# (time, page, item) ; item = ('w'|'b', col, row, text, attr)
K = []
def add(t, page, *items): K.append((t, page, list(items)))
# page A
add(0.00, 'A', ('w', 0, 0, P + 'pruefe', 'bold'), ('b', 0, 2, 'weil ich müde BIN.', 'bold'))
add(1.76, 'A', ('w', 0, 5, ' FEHLER ', 'bold+rev'), ('w', 9, 5, 'weil ich bin müde.', 'normal'))
add(3.18, 'A', ('w', 18, 6, '^^^', 'bold'))
add(4.84, 'A', ('b', 0, 8, 'FEHLER NR. 1', 'bold'))
add(6.23, 'A', ('b', 0, 10, 'AUF B1', 'bold'))
# page B: the three groups, words appear as spoken
add(7.67, 'B', ('w', 0, 0, P + 'regel --gruppen 3', 'bold'))
g0 = [('[0]', 10.91), ('und', 11.64), ('aber', 12.12), ('oder', 12.63), ('denn', 13.21), ('sondern', 13.60)]
col = 0
for w, t in g0:
    add(t, 'B', ('w', col, 2, w, 'bold' if w == '[0]' else 'normal')); col += len(w) + 1
add(15.60, 'B', ('w', 4, 3, '-> Verb auf Platz 2', 'dim'))
add(17.59, 'B', ('w', 4, 4, '...denn ich ', 'normal'), ('w', 16, 4, 'BIN', 'bold+rev'), ('w', 19, 4, ' müde.', 'normal'))
g1 = [('[1]', 19.04), ('deshalb', 19.84), ('trotzdem', 20.54), ('dann', 21.39)]
col = 0
for w, t in g1:
    add(t, 'B', ('w', col, 6, w, 'bold' if w == '[1]' else 'normal')); col += len(w) + 1
add(23.91, 'B', ('w', 4, 7, '-> Verb direkt danach', 'dim'))
add(25.91, 'B', ('w', 4, 8, '...deshalb ', 'normal'), ('w', 15, 8, 'TRINKE', 'bold+rev'), ('w', 21, 8, ' ich Kaffee.', 'normal'))
g2 = [('[E]', 27.61), ('weil', 28.32), ('dass', 28.99), ('obwohl', 29.50), ('wenn', 30.13)]
col = 0
for w, t in g2:
    add(t, 'B', ('w', col, 10, w, 'bold' if w == '[E]' else 'normal')); col += len(w) + 1
add(30.86, 'B', ('w', 4, 11, '-> Verb ans ENDE', 'bold'))
add(32.71, 'B', ('w', 4, 12, '...weil ich müde ', 'normal'), ('w', 21, 12, 'BIN', 'bold+rev'), ('w', 24, 12, '.', 'normal'))
# page C: Profi-Level
add(34.29, 'C', ('w', 0, 0, P + 'profi', 'bold'), ('b', 0, 2, 'PROFI-LEVEL', 'bold'))
add(35.35, 'C', ('w', 0, 5, 'Nebensatz vorne ->', 'normal'))
add(36.73, 'C', ('w', 0, 6, 'die Verben treffen sich:', 'bold'))
add(38.23, 'C', ('w', 0, 8, 'Obwohl ich Kaffee ', 'normal'), ('w', 18, 8, 'TRINKE', 'bold+rev'), ('w', 24, 8, ',', 'normal'))
add(39.59, 'C', ('w', 0, 9, 'BIN', 'bold+rev'), ('w', 3, 9, ' ich müde.', 'normal'))
# page D: the question that loops into the answer
add(40.64, 'D', ('w', 0, 0, P + 'frage', 'bold'), ('b', 0, 3, 'Und warum', 'bold'))
add(41.78, 'D', ('b', 0, 6, 'trinke ich so', 'bold'))
add(42.32, 'D', ('b', 0, 9, 'viel Kaffee?', 'bold'))

pages = {}
times = []
for t, pg, items in K:
    pages.setdefault(pg, []).extend(items)
    times.append((t, pg, list(pages[pg])))
os.makedirs(OUT, exist_ok=True)
man = []
for i, (t, pg, items) in enumerate(times):
    term = CRTTerminal(1920, 1080, seed=5, cols=38, rows=13)
    term.power()
    for kind, c, r, s, a in items:
        (term.big if kind == 'b' else term.write)(c, r, s, a)
    term.write(0, 12 if pg != 'B' else 12, '', 'dim')
    if pg != 'B':
        term.write(0, 12, ' DEUTSCH MIT MELO  B1-C1  LOOP'.ljust(38), 'dim+rev')
    path = os.path.join(OUT, f'k{i:03d}.jpg')
    term.save(path, quality=92)
    man.append({'t': t, 'file': path})
    print(i, t, pg, flush=True)
json.dump(man, open(os.path.join(OUT, 'manifest.json'), 'w'))
