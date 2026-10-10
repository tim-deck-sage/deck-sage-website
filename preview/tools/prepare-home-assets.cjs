const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sourceRoot = path.resolve(process.argv[2] || '');
const outputRoot = path.resolve(__dirname, '../public/home');

if (!sourceRoot || !fs.existsSync(sourceRoot)) {
  throw new Error('Pass the Deck Sage Homepage assets folder as the first argument.');
}

const backgrounds = [1, 2, 3, 4, 5].map((number) => ({
  source: `Background ${number}.png`,
  output: `background-${number}.webp`
}));

const buttons = [
  ['Button My Decks.png', 'my-decks.webp'],
  ['Button My Bulk.png', 'my-bulk.webp'],
  ['Button Sage Tools.png', 'sage-tools.webp'],
  ['Button Commander Lore.png', 'commander-lore.webp'],
  ['Button Theme Songs.png', 'theme-songs.webp'],
  ['Button Collection Value.png', 'collection-value.webp'],
  ['Button Latest News.png', 'latest-news.webp']
].map(([source, output]) => ({ source, output: path.join('buttons', output) }));

async function convert() {
  fs.mkdirSync(path.join(outputRoot, 'buttons'), { recursive: true });

  for (const asset of backgrounds) {
    const input = path.join(sourceRoot, asset.source);
    const output = path.join(outputRoot, asset.output);
    await sharp(input)
      .webp({ quality: 84, effort: 6, smartSubsample: true })
      .toFile(output);
  }

  for (const asset of buttons) {
    const input = path.join(sourceRoot, asset.source);
    const output = path.join(outputRoot, asset.output);
    await sharp(input)
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .resize({ width: 1280, withoutEnlargement: true })
      .webp({ quality: 90, alphaQuality: 100, effort: 6, smartSubsample: true })
      .toFile(output);
  }

  const files = [...backgrounds, ...buttons].map((asset) => path.join(outputRoot, asset.output));
  for (const file of files) {
    const metadata = await sharp(file).metadata();
    console.log(`${path.relative(outputRoot, file)} ${metadata.width}x${metadata.height} ${fs.statSync(file).size} bytes`);
  }
}

convert().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
