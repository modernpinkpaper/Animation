META = dict(
 cast=['MICA','LEFTY','KRAFT','DUSTY','DYMO','STATUS'], theme='mint', intro=[1,2,3,4,5], music=(104, 2),
 roles={'MICA':'HOST','LEFTY':'THE FAST GUESSER','KRAFT':'THE STICKLER','DUSTY':'THE SLEEPY ONE','DYMO':'THE LABEL MAKER','STATUS':'THE TIMER'},
 badge='GUESS THE WORD<small>ROBOT PRINT ROOM  \u2022  PICTURE PUZZLES</small>', titleCard='GUESS THE WORD',
 end1='How many did you get<br>before the timer ended?', end2='Tell us your score. Come back for more puzzles!')
def Q(n, pics): return ('GUESS THE WORD  #%d' % n, ['<span style="font-size:58px;line-height:1.15;list-style:none">%s</span>' % pics], '#2fb0d0')
def A(word, pics): return ('ANSWER', ['<b style="font-size:30px">%s</b>' % word, pics], '#3fb145')
Q1=Q(1,'\U0001F535 + \U0001F40B'); A1=A('BLUE WHALE','\U0001F535 blue + \U0001F40B whale')
Q2=Q(2,'\U0001F9C8 + \U0001FAB0'); A2=A('BUTTERFLY','\U0001F9C8 butter + \U0001FAB0 fly')
Q3=Q(3,'\U0001F327\uFE0F + \U0001F380'); A3=A('RAINBOW','\U0001F327\uFE0F rain + \U0001F380 bow')
Q4=Q(4,'\u2600\uFE0F + \U0001F33B'); A4=A('SUNFLOWER','\u2600\uFE0F sun + \U0001F33B flower')
Q5=Q(5,'\u2B50 + \U0001F41F'); A5=A('STARFISH','\u2B50 star + \U0001F41F fish')
Q6=Q(6,'\U0001F964 + \U0001F382'); A6=A('CUPCAKE','\U0001F964 cup + \U0001F382 cake')
L = [
 ('MICA','Welcome to Guess the Word! Two pictures join together to make one word. Can you guess it before the timer ends?','happy',1.6),
 ('LEFTY','I am ready! I am so ready!','excited',0.3),
 ('KRAFT','I will guess correctly. Every time.','stern',0.25),
 ('DUSTY','I will guess after a nap.','tired',0.25),
 ('DYMO','I made a label for the winner.','sweet',0.25),
 ('STATUS','I am the timer. I count down every puzzle.','deadpan',0.3),
 ('MICA','Puzzle one. Look closely! What word do these two pictures make? Five. Four. Three. Two. One.','happy',0.45,Q1),
 ('LEFTY','A blue ball and a whale! Blue whale!','excited',0.3),
 ('MICA','Yes! Blue whale! The biggest animal on Earth.','happy',0.3,A1),
 ('KRAFT','Obvious.','stern',0.3),
 ('MICA','Puzzle two. This one is tricky. What word do these make? Five. Four. Three. Two. One.','happy',0.5,Q2),
 ('DYMO','Butter. And a fly. Butterfly!','sweet',0.3),
 ('MICA','Butterfly! Great job, Dymo!','happy',0.3,A2),
 ('LEFTY','I wanted to say that!','excited',0.3),
 ('MICA','Puzzle three. Rain, plus a pretty bow. What do you get? Five. Four. Three. Two. One.','happy',0.5,Q3),
 ('KRAFT','Rain. Bow. Rainbow. Next.','stern',0.3),
 ('MICA','Rainbow! Kraft is on a streak.','happy',0.3,A3),
 ('DUSTY','I was still thinking about number one.','tired',0.3),
 ('MICA','Puzzle four. A bright one. What word is it? Five. Four. Three. Two. One.','happy',0.5,Q4),
 ('LEFTY','Sun. Flower. Sunflower!','excited',0.3),
 ('MICA','Sunflower! Lefty is back in the game.','happy',0.3,A4),
 ('DYMO','Sunny and sticky. I like it.','sweet',0.3),
 ('MICA','Puzzle five. Under the sea. What word is it? Five. Four. Three. Two. One.','happy',0.5,Q5),
 ('DUSTY','Star. Fish. Starfish.','tired',0.3),
 ('MICA','Starfish! Dusty woke up!','happy',0.3,A5),
 ('DUSTY','I did not. I am still asleep.','tired',0.3),
 ('MICA','Last puzzle. Something sweet. What word is it? Five. Four. Three. Two. One.','happy',0.5,Q6),
 ('KRAFT','A cup and a cake. Cupcake.','stern',0.3),
 ('MICA','Cupcake! Kraft wins again!','happy',0.3,A6),
 ('LEFTY','That was so fun! Can we do more?','excited',0.3),
 ('MICA','Thanks for playing Guess the Word. Tell us your score in the comments.','happy',0.4),
 ('DYMO','Please like and subscribe. Gently.','sweet',0.4),
]
