// "Ugh! I'm so frustrated today!": the traced driver clip re-timed (head dip, fist to the head, frown), with her
// mouth replaced by a code-drawn mouth driven by the voice. Frame i shows traced source frame SayData.items[i].src.
Motion.scene({
    fps: 24,
    duration: 92 / 24,
    logical: [464, 832],
    uses: [
        'sandbox/2026-10-31-driver-replica/private/trace.js',
        'sandbox/2026-10-31-driver-replica/say/data.js',
    ],
    bpm: 120,
    shots: [[0, 92 / 24, 'Say']],

    draw(g, t, env) {
        const T = window.DriverTrace, D = window.SayData;
        const i = Math.min(D.n - 1, Math.round(t * 24));
        const it = D.items[i];
        const k = 1 / T.scale;

        // 1. the traced frame (stacked vector layers)
        g.fillStyle = T.palette[T.base];
        g.fillRect(0, 0, T.w, T.h);
        g.lineJoin = 'round';
        for (const [ci, rings] of T.frames[it.src]) {
            g.beginPath();
            for (const r of rings) {
                g.moveTo(r[0] * k, r[1] * k);
                for (let j = 2; j < r.length; j += 2) g.lineTo(r[j] * k, r[j + 1] * k);
                g.closePath();
            }
            g.fillStyle = T.palette[ci];
            g.fill('evenodd');
        }

        // 2. the new mouth, only while she is making sound (silence keeps the traced frown)
        const o = it.open;
        if (o < 0.06) return;
        const INK = '#141416';
        g.save();
        g.translate(it.cx, it.cy);
        g.rotate(it.ang);
        // cover the traced mouth with the local skin colour
        g.fillStyle = it.skin;
        g.beginPath(); g.ellipse(0, 0, it.w / 2 + 8, it.h / 2 + 8, 0, 0, Math.PI * 2); g.fill();

        const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
        const a = 12 + 9 * clamp(o, 0, 1);                 // half width
        let b = 1.6 + 10.5 * clamp(o, 0, 1);               // half height
        g.lineWidth = 2.6 + 0.5 * clamp(o, 0, 1);
        g.strokeStyle = INK;
        g.lineJoin = 'round';
        g.lineCap = 'round';
        if (it.teeth && o < 0.8) {
            // sibilants (s, f, t): lips parted over clenched teeth
            b = 3.4 + 2.2 * o;
            g.beginPath(); g.ellipse(0, 0, a, b, 0, 0, Math.PI * 2);
            g.fillStyle = '#f6f1ea'; g.fill(); g.stroke();
            g.lineWidth = 2;
            g.beginPath(); g.moveTo(-a + 3, 0.3); g.lineTo(a - 3, -0.3); g.stroke();
        } else if (b < 3.2) {
            // barely parted lips: her frown line, opening a little as the sound grows
            g.lineWidth = 3;
            g.beginPath(); g.moveTo(-a * 1.1, 3.5); g.quadraticCurveTo(0, -9 + b * 2.5, a * 1.1, 3.5); g.stroke();
        } else {
            g.beginPath(); g.ellipse(0, 0, a, b, 0, 0, Math.PI * 2);
            g.fillStyle = '#12060a'; g.fill();
            g.save(); g.clip();
            if (b > 3.6) {                                  // teeth along the top edge
                g.fillStyle = '#fbf7f0';
                g.beginPath(); g.ellipse(0, -b * 0.55, a * 0.74, Math.max(1.3, b * 0.3), 0, 0, Math.PI * 2); g.fill();
            }
            if (b > 4.8) {                                  // tongue along the bottom edge
                g.fillStyle = '#c4304a';
                g.beginPath(); g.ellipse(a * 0.08, b * 0.75, a * 0.62, b * 0.48, 0, 0, Math.PI * 2); g.fill();
            }
            g.restore();
            g.beginPath(); g.ellipse(0, 0, a, b, 0, 0, Math.PI * 2); g.stroke();
        }
        g.restore();
    },
});
