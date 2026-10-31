META = dict(
 cast=['MICA','LEFTY','KRAFT','DUSTY','DYMO','STATUS'], theme='sky', intro=[1,2,3,4,5], music=(96, 1),
 roles={'MICA':'HOST','LEFTY':'THE EAGER ONE','KRAFT':'THE STICKLER','DUSTY':'THE VETERAN','DYMO':'THE SHIPPING CLERK','STATUS':'THE DASHBOARD'},
 badge='THE ROBOT PRINT ROOM<small>EP. 10  •  A MONDAY IN THE PRINT ROOM</small>', titleCard='THE ROBOT PRINT ROOM',
 end1='What does your Monday<br>look like, minute by minute?', end2='Pick one slow moment. Fix just that. See you next Monday.')
M1=('7:45  EARLY BIRD',['The room is quiet','Mica is already warmed up','Lefty has been ready for an hour'],'#f09a10')
M2=('8:30  FIRST ORDERS',['Open the order list','Check every detail twice','Send the first job to print'],'#3d7bf0')
M3=('9:00  THE RUSH',['Two printers running at once','One person feeding both','Keep a job always in flight'],'#3fb145')
M4=('10:15  THE KRAFT PROBLEM',['Thick envelopes feed badly','Looks like someone is slow','It is really the machine'],'#b8741f')
M5=('11:00  THE GHOST JOB',['A "Status Inquiry" appears','It is not a customer order','It is only a printer check-in'],'#8a62e0')
M6=('NOON  LUNCH',['Printers can run alone','Quiet desk is fine','Machines keep working'],'#1fbfbf')
M7=('1:30  THE LABEL RUN',['Each label means one order shipped','Fast, steady, satisfying','Dymo counts the day'],'#2fb0d0')
M8=('3:00  THE SLUMP',['Everyone slows down a bit','Prep the next jobs now','So the machines never wait'],'#e0689a')
M9=('5:00  CLOSING TIME',['Clean the rollers','Check the day list','Leave a note for tomorrow'],'#7a82a0')
M10=('WHAT A GOOD DAY LOOKS LIKE',['Printers rarely wait','Prep happens while they run','Problems get noticed, not blamed'],'#3fb145')
L = [
 ('MICA','Welcome to The Robot Print Room. Today: a whole Monday, from the first light to closing time. We are the robots who run the shop, so we saw all of it.','happy',1.8),
 ('LEFTY','Hi! I woke up ready!','excited',0.3),
 ('KRAFT','I woke up annoyed.','stern',0.25),
 ('DUSTY','I did not wake up. I was already here.','tired',0.25),
 ('DYMO','I woke up sticky. Fresh labels.','sweet',0.25),
 ('STATUS','Hello. I am checking in. I am always checking in.','deadpan',0.3),
 ('MICA','Seven forty five. The room is quiet.','happy',0.45,M1),
 ('LEFTY','I have been ready for an hour. Is anyone here? Hello?','excited',0.3),
 ('DUSTY','Enjoy it. This is the last quiet you will hear today.','tired',0.3),
 ('MICA','Eight thirty. The first orders arrive. A person checks every detail twice. Names, sizes, the right design. Then the first job goes to print.','happy',0.4,M2),
 ('KRAFT','Twice. Good. I like twice.','stern',0.3),
 ('LEFTY','Nine o clock! The rush! Two printers are running at once!','excited',0.35,M3),
 ('DUSTY','One person, two machines. She feeds one while the other works. Never at the same speed.','tired',0.3),
 ('MICA','The secret is to always keep a job in flight. When one printer finishes, the next one is already waiting.','happy',0.3),
 ('STATUS','Ten fifteen. I notice a long pause on one order.','deadpan',0.4,M4),
 ('KRAFT','That was me. Thick envelopes. I do not like being fed fast.','stern',0.3),
 ('DUSTY','It looked like someone was slow. On the screen, it did. In the room, a person was hand feeding paper.','tired',0.3),
 ('MICA','So the lesson is, a long pause is not always a person. Sometimes it is the machine. Check the camera before you decide.','happy',0.3),
 ('STATUS','Eleven o clock. A new job appears. It says Status Inquiry.','deadpan',0.45,M5),
 ('LEFTY','Is that a customer order? I will print it!','excited',0.3),
 ('STATUS','No. That is me. I am just checking in.','deadpan',0.3),
 ('KRAFT','Do not count him as work. Ever.','stern',0.3),
 ('MICA','Noon. Lunch.','happy',0.45,M6),
 ('DUSTY','The person goes away. The printers keep going. Nothing is wasted. The machines are making things the whole time.','tired',0.3),
 ('LEFTY','I did not even get tired!','excited',0.3),
 ('DYMO','One thirty. My turn.','sweet',0.4,M7),
 ('DYMO','Every label I print is one order out the door. I am the proof that the day happened.','sweet',0.3),
 ('KRAFT','You are not a production printer. You are the scoreboard.','stern',0.3),
 ('DYMO','I accept that.','sweet',0.3),
 ('MICA','Three o clock. The slump.','happy',0.45,M8),
 ('DUSTY','Everyone gets a little slower. This is the best time to prepare the next jobs, while the machines are still running.','tired',0.3),
 ('MICA','Prep ahead, so the printer never waits for you.','happy',0.3),
 ('LEFTY','Prep ahead! I love it!','excited',0.25),
 ('MICA','Five o clock. Closing.','happy',0.45,M9),
 ('KRAFT','Clean the rollers. Check the day list. Leave a note for tomorrow.','stern',0.3),
 ('STATUS','And I will keep checking in all night.','deadpan',0.3),
 ('DUSTY','Please do not.','tired',0.3),
 ('MICA','So what does a good Monday look like?','happy',0.45),
 ('DYMO','Printers rarely wait. Prep happens while they run. And problems get noticed, not blamed.','sweet',0.3,M10),
 ('LEFTY','I want another Monday!','excited',0.3),
 ('DUSTY','No you do not.','tired',0.3),
 ('MICA','Thanks for watching The Robot Print Room. We will see you next Monday. The printers have more notes.','happy',0.5),
 ('DYMO','Please like and subscribe. Gently.','sweet',0.4),
]
