import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const images = [
  ['hero.jpg', 'https://images.pexels.com/photos/3373716/pexels-photo-3373716.jpeg', 1600, 2000],
  ['master.jpg', 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04', 1000, 1250],
  ['master-2.jpg', 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e', 1000, 1250],
  ['interior.jpg', 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f', 1600, 1100],
  ['lashes.jpg', 'https://images.pexels.com/photos/3373716/pexels-photo-3373716.jpeg', 1200, 1500],
  ['lamination.jpg', 'https://burst.shopifycdn.com/photos/blue-eyes-getting-makeup-close-up.jpg', 1200, 1500],
  ['brows.jpg', 'https://burst.shopifycdn.com/photos/brushing-eyebrows.jpg', 1200, 1500],
  ['tint.jpg', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2', 1200, 1500],
  ['facial.jpg', 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881', 1200, 1500],
  ['tools.jpg', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348', 1200, 1200],
  ['salon-dark.jpg', 'https://images.unsplash.com/photo-1600948836101-f9ffda59d250', 1200, 1500],
  ['care.jpg', 'https://images.unsplash.com/photo-1552693673-1bf958298935', 1200, 1500],
  ['spa.jpg', 'https://images.unsplash.com/photo-1571875257727-256c39da42af', 1200, 1500],
  ['portrait.jpg', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330', 1000, 1250],
  ['brows-portrait.jpg', 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce', 1200, 1500],
];

const out = join(process.cwd(), 'public', 'assets', 'img');
await mkdir(out, { recursive: true });

for (const [name, url, w, h] of images) {
  const proxied = `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=${w}&h=${h}&fit=cover&output=jpg&q=82`;
  try {
    const res = await fetch(proxied, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(join(out, name), buf);
    console.log(`${name}: ${buf.length} bytes`);
  } catch (err) {
    console.error(`FAIL ${name}: ${err.message}`);
  }
}
