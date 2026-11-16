"""Deutsch mit Melo in the green-screen CRT style (cloveric/claude-drawing-skill, MIT): lesson 'Wo steht das Verb?'"""
import sys, time
LIB = sys.argv[2]
sys.path.insert(0, LIB)
import numpy as np
import crt
from crt import CRTTerminal
# German glyphs for the 5x7 ROM
crt._FONT.update({
 'ü': ['.#.#.', '.....', '#...#', '#...#', '#...#', '#..##', '.##.#'],
 'ä': ['.#.#.', '.....', '.###.', '....#', '.####', '#...#', '.####'],
 'ö': ['.#.#.', '.....', '.###.', '#...#', '#...#', '#...#', '.###.'],
 'Ü': ['#...#', '.....', '#...#', '#...#', '#...#', '#...#', '.###.'],
 'ß': ['.##..', '#..#.', '#..#.', '#.#..', '#..#.', '#...#', '#.##.'],
})
crt.ROM_CHARS, crt.ROM, crt.ROM_INDEX = crt._build_rom()

out = sys.argv[1]
COLS, ROWS = 120, 36
t = CRTTerminal(1920, 1080, seed=7, cols=COLS, rows=ROWS)
ASP = t.cw / t.ch

# ---------------- Melo as crisp ASCII sprite: sliced-off watermelon head (red flesh + seeds on top), striped rind, smirk
t.compose(region=(5, 31, 78, 118))
HEAD = [
 "      _.--~~~~~~~~--._      ",
 "   .'%%@%%%%%%%%@%%%%%'.    ",
 "  (%%%%%%%%%@%%%%%%%@%%%)   ",
 "  |'-.______________.-'|    ",
 "  |#  #  #  #  #  #  # |    ",
 "  |#  #  #  #  #  #  # |    ",
 "  |# /==\ #  # /==\ # |    ",
 "  |# |o | #  # |o | # |    ",
 "  |#  #  #  >  #  #  # |    ",
 "  |#  # \_______/ #  # |    ",
 r"   \#  #  #  #  #  # /     ",
 "    '-.__#__#__#__.-'       ",
]
t.sprite(84, 7, HEAD, 'normal', attrs={'%': 'bold', '@': 'dim', '#': 'dim', 'o': 'bold', '=': 'bold', '_': 'normal'})
BODY = ["         |          ", "     ____|____      ", "    /  ß     \\    ", "   /|    ß   |\\   ",
        "  / |________| \\  ", "     |      |       ", "     |      |       ", "    _|      |_      "]
t.sprite(87, 19, BODY, 'normal', attrs={'ß': 'bold'})
# ---------------- the session
t.stage('off'); t.power(); t.stage('power')
t.write(0, 0, 'melo@deutsch:~$ ', 'bold')
t.write(16, 0, 'korrigiere "weil ich bin müde"', 'normal')
t.big(0, 1, 'DEUTSCH MIT MELO  B1-C1', 'bold')
t.write(0, 3, 'Lektion 07   Wortstellung   Fehler Nr. 1 auf B1   Deutsch nur auf Deutsch', 'dim')
t.box(1, 4, 118, 31, attr='dim', title='WO STEHT DAS VERB?')

t.write(4, 6, '> analysiere Satz ...', 'dim')
t.write(4, 8, ' FALSCH ', 'bold+rev'); t.write(14, 8, 'weil ich bin müde.', 'normal')
t.write(14, 9, '         ^^^', 'bold')
t.write(4, 11, ' RICHTIG', 'bold+rev'); t.write(14, 11, 'weil ich müde ', 'bold'); t.write(28, 11, ' BIN ', 'bold+rev'); t.write(33, 11, '.', 'bold')
# the verb jump as a diagram
t.write(14, 13, '[weil] [ich] [müde] [ BIN ]', 'normal')
t.write(16, 14, '        └────────────┘', 'bold')
t.write(18, 15, '        Verb springt ans Ende', 'dim')

t.hline(3, 75, 17, 'dim')
t.write(4, 18, 'GRUPPE', 'bold'); t.write(14, 18, 'KONNEKTOREN', 'bold'); t.write(50, 18, 'VERB', 'bold')
rows = [('  0', 'und aber oder denn sondern', 'Platz 2'),
        ('  1', 'deshalb trotzdem dann', 'direkt danach'),
        ('END', 'weil dass obwohl wenn', 'ans Ende')]
for k, (g, kon, v) in enumerate(rows):
    r = 20 + 2 * k
    t.write(4, r, g, 'bold' if g == 'END' else 'normal')
    t.write(14, r, kon, 'normal')
    t.write(50, r, v, 'bold+rev' if g == 'END' else 'normal')
t.hline(3, 75, 26, 'dim')
t.write(4, 27, 'Profi-Level:', 'bold'); t.write(17, 27, 'Obwohl ich Kaffee trinke, bin ich müde.', 'normal')
t.write(17, 28, '                   ^^^^^^  ^^^', 'dim')
t.write(4, 29, 'Zwei Verben, die sich treffen.', 'dim')

t.reveal(5, 31)
t.write(0, 32, 'Quiz: "Ich lerne Deutsch, weil ..."  -> schreib deinen Satz in die Kommentare!', 'normal')
t.write(0, 33, 'melo@deutsch:~$ ', 'bold'); t.write(16, 33, 'quiz --naechste-lektion', 'normal')
t.cursor(40, 33)
t.write(0, 35, (' DEUTSCH MIT MELO   B1-C1   LEKTION 07   ONLINE').ljust(COLS - 12) + 'F1 Hilfe  ', 'dim+rev')
t.burn(64, 35, 'DEUTSCH MIT KERN', 0.22)
t.tear(21.3, 4.0, 2)
t.save(out, stages_dir=None)
print(out)
