// เสียงบรรยากาศสังเคราะห์ด้วย Web Audio ล้วน (ไม่มีไฟล์เสียงให้โหลด ไม่ต้องกังวลเรื่อง license)
//   ลม: white noise ผ่าน bandpass ความดังขึ้นลงช้า ๆ เป็นระลอก + ชั้นใบหญ้าเสียดสีเสียงสูงเบา ๆ
//   นก: จิ๊บเป็นชุดสั้น ๆ สุ่มห่าง ๆ จากซ้าย/ขวา
//   ฝีเท้า: เสียงย่ำหญ้าสั้น ๆ เรียกจาก Cat ตามระยะที่เดินจริง
// ต้องเริ่มจากการกดของผู้ใช้เท่านั้น (enable ถูกเรียกใน onClick) ไม่งั้นเบราว์เซอร์บล็อกเสียง

const MASTER = 0.9;

class Ambience {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private birdTimer = 0;
  private on = false;

  get enabled() {
    return this.on;
  }

  enable() {
    this.on = true;
    if (!this.ctx) this.build();
    const ctx = this.ctx!;
    void ctx.resume();
    this.master!.gain.cancelScheduledValues(ctx.currentTime);
    this.master!.gain.setTargetAtTime(MASTER, ctx.currentTime, 0.6);
    this.scheduleBird(1.5);
  }

  disable() {
    this.on = false;
    window.clearTimeout(this.birdTimer);
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
    // จางเสร็จแล้วพัก context ไว้ ไม่กิน CPU ระหว่างปิดเสียง
    window.setTimeout(() => !this.on && ctx.state === "running" && void ctx.suspend(), 700);
  }

  /** เสียงฝีเท้าย่ำหญ้าหนึ่งก้าว */
  step() {
    const ctx = this.ctx;
    if (!this.on || !ctx || !this.master || !this.noise) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.5;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 1800 + Math.random() * 1600;
    band.Q.value = 0.9;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.05 + Math.random() * 0.03, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0005, t + 0.13);
    src.connect(band).connect(gain).connect(this.master);
    src.start(t, Math.random() * 1.5, 0.16);
  }

  private build() {
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);

    // noise 2 วินาที ใช้ซ้ำทั้งลมและฝีเท้า
    const length = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

    // ลมเป็นเสียงพื้นหลังเบา ๆ ให้นกกับฝีเท้าเด่นกว่า
    this.wind(320, 0.6, 0.032, 0.07);
    this.wind(2600, 1.2, 0.008, 0.13);
    document.addEventListener("visibilitychange", () => {
      if (!this.on) return;
      if (document.hidden) void ctx.suspend();
      else void ctx.resume();
    });
  }

  // ลมหนึ่งชั้น: noise วนลูป → bandpass → gain ที่มี LFO ช้า ๆ ทำให้ดังขึ้นลงเป็นระลอก
  private wind(freq: number, q: number, level: number, lfoRate: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = freq;
    band.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.value = level;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = lfoRate;
    const depth = ctx.createGain();
    depth.gain.value = level * 0.7;
    lfo.connect(depth).connect(gain.gain);
    src.connect(band).connect(gain).connect(this.master!);
    src.start(0, Math.random() * 2);
    lfo.start();
  }

  private scheduleBird(delaySec = 2 + Math.random() * 6) {
    window.clearTimeout(this.birdTimer);
    this.birdTimer = window.setTimeout(() => {
      if (!this.on) return;
      this.chirp();
      this.scheduleBird();
    }, delaySec * 1000);
  }

  // นกหนึ่งชุด: 2–5 โน้ตเร็ว ๆ แต่ละโน้ตกวาดความถี่ขึ้นหรือลงสั้น ๆ
  private chirp() {
    const ctx = this.ctx!;
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.4 - 0.7;
    pan.connect(this.master!);
    const base = 2600 + Math.random() * 1600;
    const notes = 2 + Math.floor(Math.random() * 4);
    let t = ctx.currentTime + 0.05;
    for (let i = 0; i < notes; i++) {
      const dur = 0.06 + Math.random() * 0.07;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      const up = Math.random() < 0.6;
      osc.frequency.setValueAtTime(base * (up ? 0.85 : 1.2), t);
      osc.frequency.exponentialRampToValueAtTime(base * (up ? 1.25 : 0.8), t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.03 + Math.random() * 0.025, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
      osc.connect(g).connect(pan);
      osc.start(t);
      osc.stop(t + dur + 0.02);
      t += dur + 0.03 + Math.random() * 0.08;
    }
  }
}

export const ambience = new Ambience();
