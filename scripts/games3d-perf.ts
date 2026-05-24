import puppeteer from 'puppeteer';

const URL = process.env.PERF_URL ?? 'http://localhost:3000/play/canary-dev';
const DURATION_MS = Number(process.env.PERF_DURATION_MS ?? 60_000);

async function run(): Promise<void> {
  console.log(`Perf benchmark: ${URL} for ${DURATION_MS}ms`);
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 768 });

  await page.goto(URL, { waitUntil: 'networkidle2' });

  await page.evaluate(() => {
    (window as unknown as { __frameTimes: number[] }).__frameTimes = [];
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      (window as unknown as { __frameTimes: number[] }).__frameTimes.push(now - last);
      last = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  const initialHeap = (await page.metrics()).JSHeapUsedSize ?? 0;

  await new Promise((r) => setTimeout(r, DURATION_MS));

  const frameTimes: number[] = await page.evaluate(
    () => (window as unknown as { __frameTimes: number[] }).__frameTimes
  );
  const finalHeap = (await page.metrics()).JSHeapUsedSize ?? 0;

  await browser.close();

  if (frameTimes.length < 10) {
    console.error(`Too few frames recorded (${frameTimes.length}) — page may not have rendered.`);
    process.exit(1);
  }

  const fpsValues = frameTimes.slice(1).map((dt) => 1000 / dt).filter((f) => Number.isFinite(f));
  fpsValues.sort((a, b) => a - b);
  const avg = fpsValues.reduce((s, v) => s + v, 0) / fpsValues.length;
  const p95Index = Math.floor(fpsValues.length * 0.05);
  const p95Low = fpsValues[p95Index];
  const heapDeltaMB = (finalHeap - initialHeap) / (1024 * 1024);

  console.log(`Frames captured: ${fpsValues.length}`);
  console.log(`Avg fps:          ${avg.toFixed(1)}`);
  console.log(`p95-low fps:      ${p95Low.toFixed(1)} (5th percentile worst frames)`);
  console.log(`Heap delta:       ${heapDeltaMB.toFixed(2)} MB`);

  if (avg < 55) console.warn(`⚠ Avg fps below 55 target`);
  if (p95Low < 30) console.warn(`⚠ p95-low fps below 30 floor`);
  if (heapDeltaMB > 20) console.warn(`⚠ Heap grew by >20MB — investigate leaks`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
