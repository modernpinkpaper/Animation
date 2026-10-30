import {Circle, Line, Node, Rect, Txt, makeScene2D} from '@motion-canvas/2d';
import {all, chain, createRef, createSignal, easeInOutCubic, easeOutBack, easeOutCubic, linear, waitFor, range} from '@motion-canvas/core';

// Numbers come from src/data.local.json (git-ignored, real aggregates) or, if absent, the FICTIONAL src/data.example.json.
const found = import.meta.glob('../data.local.json', {eager: true});
const D: any = ((Object.values(found)[0] ?? Object.values(import.meta.glob('../data.example.json', {eager: true}))[0]) as any).default;
const SHARE_JOBS = D.shareJobs, SHARE_WAIT = D.shareWait, MED_LEFT = D.medLeft, MED_RIGHT = D.medRight;
const RATIO = Math.floor(D.medRight / D.medLeft);

const BG = '#fbf9f4', INK = '#1d2230', SOFT = '#6b7080';
const BLUE = '#2a78d6', ORANGE = '#eb6834', PAPER = '#ffffff';

const font = 'Inter, "Helvetica Neue", Arial, sans-serif';

/** A tiny paper-sheet character. */
function paper(ref: ReturnType<typeof createRef<Rect>>, x: number, y: number) {
  return (
    <Rect ref={ref} x={x} y={y} width={46} height={58} radius={6} fill={PAPER} stroke={INK} lineWidth={3} shadowColor={'#00000022'} shadowBlur={10} shadowOffsetY={4}>
      <Circle x={-10} y={-8} size={7} fill={INK} />
      <Circle x={10} y={-8} size={7} fill={INK} />
      <Line points={[[-9, 10], [0, 16], [9, 10]]} stroke={INK} lineWidth={3} lineCap={'round'} />
      <Line points={[[-14, -22], [14, -22]]} stroke={'#c9ccd6'} lineWidth={3} lineCap={'round'} />
    </Rect>
  );
}

/** A printer: body, paper slot, status light. */
function printer(color: string, x: number, y: number, label: string) {
  return (
    <Node x={x} y={y}>
      <Rect width={150} height={92} radius={16} fill={color} />
      <Rect y={-26} width={100} height={14} radius={7} fill={'#00000040'} />
      <Rect y={34} width={96} height={10} radius={5} fill={'#ffffff'} opacity={0.9} />
      <Circle x={52} y={10} size={11} fill={'#ffffffcc'} />
      <Txt y={74} text={label} fontFamily={font} fontSize={24} fill={SOFT} fontWeight={600} />
    </Node>
  );
}

/** Stopwatch with a sweeping hand driven by a 0..1 signal. */
function stopwatch(color: string, x: number, y: number, t: ReturnType<typeof createSignal<number>>, text: ReturnType<typeof createRef<Txt>>) {
  return (
    <Node x={x} y={y}>
      <Rect y={-98} width={20} height={14} radius={4} fill={INK} />
      <Circle size={170} fill={PAPER} stroke={color} lineWidth={10} />
      <Line points={() => [[0, 0], [Math.sin(t() * Math.PI * 2) * 58, -Math.cos(t() * Math.PI * 2) * 58]]} stroke={INK} lineWidth={6} lineCap={'round'} />
      <Circle size={14} fill={INK} />
      <Txt ref={text} y={140} fontFamily={font} fontSize={54} fontWeight={800} fill={color} text={'0 s'} />
    </Node>
  );
}

export default makeScene2D(function* (view) {
  view.fill(BG);

  // ---------- Act 1: title (0 - 3.6s)
  const title = createRef<Node>();
  const kicker = createRef<Txt>();
  const heads = range(5).map(() => createRef<Rect>());
  view.add(
    <Node ref={title} opacity={0}>
      <Txt y={-120} text={'Where do print jobs wait?'} fontFamily={font} fontSize={78} fontWeight={800} fill={INK} />
      <Txt ref={kicker} y={-50} text={`${D.jobs} print jobs · ${D.days} days · ${D.pcs} PCs`} fontFamily={font} fontSize={34} fill={SOFT} opacity={0} />
      {range(5).map((i) => paper(heads[i], -240 + i * 120, 90))}
    </Node>,
  );
  heads.forEach((h) => h().scale(0));
  yield* title().opacity(1, 0.4);
  yield* kicker().opacity(1, 0.4);
  yield* all(...heads.map((h, i) => chain(waitFor(i * 0.1), h().scale(1, 0.4, easeOutBack))));
  yield* all(...heads.map((h, i) => chain(waitFor(i * 0.05), h().y(70, 0.25).to(90, 0.25))));
  yield* waitFor(0.5);
  yield* title().opacity(0, 0.4);
  title().remove();

  // ---------- Act 2: two groups of printers (3.6 - 9.4s)
  const scene2 = createRef<Node>();
  const cap = createRef<Txt>();
  const lp = createRef<Rect>(), rp = createRef<Rect>();
  const lw = createRef<Rect>(), rw = createRef<Rect>();
  view.add(
    <Node ref={scene2} opacity={0}>
      <Txt y={-300} text={'Half the jobs go to the right-hand printers'} fontFamily={font} fontSize={46} fontWeight={800} fill={INK} />
      {printer(BLUE, -330, -90, 'Left-hand')}
      {printer(BLUE, -330, 110, 'Left-hand')}
      {printer(ORANGE, 330, -90, 'Right-hand')}
      {printer(ORANGE, 330, 110, 'Right-hand')}
      <Txt ref={cap} y={290} text={''} fontFamily={font} fontSize={34} fill={SOFT} />
    </Node>,
  );
  yield* scene2().opacity(1, 0.4);

  // jobs fly in; left ones finish fast, right ones queue up
  const sheets: Rect[] = [];
  const spawn = (side: 'L' | 'R', slot: number) => {
    const r = createRef<Rect>();
    const y = slot === 0 ? -90 : 110;
    scene2().add(paper(r, 0, 20 + (slot === 0 ? -40 : 40)));
    r().scale(0);
    sheets.push(r());
    const tx = side === 'L' ? -330 : 330;
    return {r, tx, y};
  };
  const flows: Generator[] = [];
  const mk = (side: 'L' | 'R', slot: number, delay: number, stay: number) => {
    const {r, tx, y} = spawn(side, slot);
    return chain(
      waitFor(delay),
      r().scale(1, 0.25, easeOutBack),
      r().position([tx + (side === 'L' ? 110 : -110), y], 0.7, easeInOutCubic),
      r().position([tx, y], 0.3),
      waitFor(stay),
      r().opacity(0, 0.25),
    );
  };
  yield* all(
    mk('L', 0, 0.0, 0.2), mk('L', 1, 0.3, 0.2), mk('L', 0, 1.2, 0.2), mk('L', 1, 1.5, 0.2),
    mk('R', 0, 0.0, 2.6), mk('R', 1, 0.3, 2.4), mk('R', 0, 0.6, 2.2), mk('R', 1, 0.9, 2.0),
    chain(waitFor(0.6), cap().text('Left: jobs finish quickly', 0.3)),
    chain(waitFor(2.0), cap().text('Right: jobs sit and wait', 0.3)),
  );
  yield* scene2().opacity(0, 0.4);
  scene2().remove();

  // ---------- Act 3: share of jobs vs share of waiting (9.4 - 14s)
  const scene3 = createRef<Node>();
  const jobsBar = createRef<Rect>(), waitBar = createRef<Rect>();
  const jobsTxt = createRef<Txt>(), waitTxt = createRef<Txt>();
  const W = 760;
  view.add(
    <Node ref={scene3} opacity={0}>
      <Txt y={-270} text={'…but they hold most of the waiting'} fontFamily={font} fontSize={50} fontWeight={800} fill={INK} />
      <Txt x={-W / 2} y={-150} offsetX={-1} text={'Share of jobs'} fontFamily={font} fontSize={30} fill={SOFT} />
      <Rect x={0} y={-90} width={W} height={46} radius={10} fill={'#e6e3da'} />
      <Rect x={-W / 2} y={-90} offsetX={-1} height={46} radius={10} fill={ORANGE} ref={jobsBar} width={0} />
      <Txt ref={jobsTxt} x={W / 2 + 60} y={-90} text={'0%'} fontFamily={font} fontSize={44} fontWeight={800} fill={INK} />
      <Txt x={-W / 2} y={30} offsetX={-1} text={'Share of all queue waiting'} fontFamily={font} fontSize={30} fill={SOFT} />
      <Rect x={0} y={90} width={W} height={46} radius={10} fill={'#e6e3da'} />
      <Rect x={-W / 2} y={90} offsetX={-1} height={46} radius={10} fill={ORANGE} ref={waitBar} width={0} />
      <Txt ref={waitTxt} x={W / 2 + 60} y={90} text={'0%'} fontFamily={font} fontSize={44} fontWeight={800} fill={INK} />
      <Txt y={230} text={'orange = right-hand printers'} fontFamily={font} fontSize={28} fill={SOFT} />
    </Node>,
  );
  const pj = createSignal(0), pw = createSignal(0);
  jobsBar().width(() => (pj() / 100) * W);
  waitBar().width(() => (pw() / 100) * W);
  jobsTxt().text(() => `${Math.round(pj())}%`);
  waitTxt().text(() => `${Math.round(pw())}%`);
  yield* scene3().opacity(1, 0.4);
  yield* pj(SHARE_JOBS, 1.0, easeOutCubic);
  yield* waitFor(0.3);
  yield* pw(SHARE_WAIT, 1.4, easeOutCubic);
  yield* waitFor(0.7);
  yield* scene3().opacity(0, 0.4);
  scene3().remove();

  // ---------- Act 4: stopwatches (14 - 18.6s)
  const scene4 = createRef<Node>();
  const tl = createSignal(0), tr = createSignal(0);
  const ltxt = createRef<Txt>(), rtxt = createRef<Txt>();
  const verdict = createRef<Txt>(), note = createRef<Txt>();
  view.add(
    <Node ref={scene4} opacity={0}>
      <Txt y={-290} text={'Typical wait for one job'} fontFamily={font} fontSize={50} fontWeight={800} fill={INK} />
      {stopwatch(BLUE, -250, -50, tl, ltxt)}
      {stopwatch(ORANGE, 250, -50, tr, rtxt)}
      <Txt x={-250} y={-215} text={'Left-hand'} fontFamily={font} fontSize={28} fill={SOFT} fontWeight={600} />
      <Txt x={250} y={-215} text={'Right-hand'} fontFamily={font} fontSize={28} fill={SOFT} fontWeight={600} />
      <Txt ref={verdict} y={212} text={`More than ${RATIO}× longer`} fontFamily={font} fontSize={58} fontWeight={800} fill={ORANGE} opacity={0} />
      <Txt ref={note} y={290} text={'A pattern, not proof. Time one test page on each printer to confirm.'} fontFamily={font} fontSize={28} fill={SOFT} opacity={0} />
    </Node>,
  );
  ltxt().text(() => `${Math.round(tl() * MED_LEFT)} s`);
  rtxt().text(() => `${Math.round(tr() * MED_RIGHT)} s`);
  yield* scene4().opacity(1, 0.4);
  yield* all(tl(1, 0.9, linear), tr(1, 2.0, linear), chain(waitFor(2.0), verdict().opacity(1, 0.3)), chain(waitFor(2.4), note().opacity(1, 0.4)));
  yield* waitFor(1.2);
});
