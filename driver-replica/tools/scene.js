// 2026-10-31-driver-replica · replay of traced vector layers (see trace.py). The video is the user's own.
// Frame f is drawn from DriverTrace.frames[f]: a base colour, then stacked layers (even-odd filled rings).
Motion.scene({
    fps: 24,
    duration: 122 / 24,
    logical: [464, 832],
    uses: ['sandbox/2026-10-31-driver-replica/private/trace.js'],
    bpm: 120,
    shots: [[0, 122 / 24, 'Driver']],

    draw(g, t, env) {
        const T = window.DriverTrace;
        const f = Math.min(T.frames.length - 1, Math.round(t * 24));
        const k = 1 / T.scale;
        g.fillStyle = T.palette[T.base];
        g.fillRect(0, 0, T.w, T.h);
        g.lineJoin = 'round';
        for (const [ci, rings] of T.frames[f]) {
            g.beginPath();
            for (const r of rings) {
                g.moveTo(r[0] * k, r[1] * k);
                for (let i = 2; i < r.length; i += 2) g.lineTo(r[i] * k, r[i + 1] * k);
                g.closePath();
            }
            g.fillStyle = T.palette[ci];
            g.fill('evenodd');
        }
    },
});
