const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild');

const assetPlugin = {
  name: 'test-assets',
  setup(build) {
    build.onResolve({ filter: /\.(mp3|png)$/ }, (args) => ({ path: path.basename(args.path), namespace: 'test-asset' }));
    build.onLoad({ filter: /.*/, namespace: 'test-asset' }, (args) => ({
      contents: JSON.stringify(`/assets/audio/${args.path}`),
      loader: 'json',
    }));
  },
};

let nextPlayGate = null;
class FakeAudio {
  constructor() {
    FakeAudio.instance = this;
    this.events = new Map();
    this.src = '';
    this.currentTime = 0;
    this.playCalls = 0;
    this.loadCalls = 0;
  }
  addEventListener(name, listener) { this.events.set(name, listener); }
  load() {
    this.loadCalls++;
    if (!this.src) this.events.get('error')?.();
  }
  async play() {
    this.playCalls++;
    if (nextPlayGate) {
      const gate = nextPlayGate;
      nextPlayGate = null;
      await gate;
    }
    this.events.get('playing')?.();
  }
  pause() { this.events.get('pause')?.(); }
  removeAttribute(name) { if (name === 'src') this.src = ''; }
  fire(name) { this.events.get(name)?.(); }
}

global.Audio = FakeAudio;
global.location = { href: 'https://deck-sage.test/#/songs' };

let checks = 0;
const pass = (name) => { checks++; console.log('PASS THEME PLAYER', name); };

(async () => {
  const built = await esbuild.build({
    stdin: {
      contents: "export {commanderThemePlayer} from './preview/src/commanderThemePlayer'; export {themeSongs} from './preview/source/app/data/themeSongsData';",
      resolveDir: process.cwd(),
    },
    bundle: true,
    platform: 'node',
    format: 'cjs',
    write: false,
    plugins: [assetPlugin],
  });
  const loaded = { exports: {} };
  new Function('module', 'exports', 'require', built.outputFiles[0].text)(loaded, loaded.exports, require);
  const { commanderThemePlayer, themeSongs } = loaded.exports;
  const updates = [];
  const unsubscribe = commanderThemePlayer.subscribe(() => updates.push({ ...commanderThemePlayer.getSnapshot() }));
  let release;
  nextPlayGate = new Promise((resolve) => { release = resolve; });
  const firstPlay = commanderThemePlayer.toggleSong(themeSongs[0]);
  assert.equal(commanderThemePlayer.getSnapshot().isLoading, true);
  assert.equal(await commanderThemePlayer.toggleSong(themeSongs[1]), false);
  assert.equal(FakeAudio.instance.playCalls, 1);
  release();
  assert.equal(await firstPlay, true);
  assert.equal(commanderThemePlayer.getSnapshot().isPlaying, true);
  pass('loading is visible and repeated clicks do not create overlapping playback');

  await commanderThemePlayer.toggleSong(themeSongs[0]);
  assert.equal(commanderThemePlayer.getSnapshot().isPlaying, false);
  await commanderThemePlayer.toggleSong(themeSongs[0]);
  assert.equal(commanderThemePlayer.getSnapshot().isPlaying, true);
  assert.equal(FakeAudio.instance.playCalls, 2);
  pass('the active track toggles between pause and resume');

  await commanderThemePlayer.toggleSong(themeSongs[1]);
  const originalRandom = Math.random;
  Math.random = () => 0;
  await commanderThemePlayer.shuffleAll();
  assert.equal(commanderThemePlayer.getSnapshot().currentSongId, themeSongs[0].id);
  assert.equal(commanderThemePlayer.getSnapshot().isShuffleMode, true);
  FakeAudio.instance.fire('ended');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(commanderThemePlayer.getSnapshot().currentSongId, themeSongs[1].id);
  Math.random = originalRandom;
  pass('shuffle excludes the current track and advances when a track ends');

  FakeAudio.instance.fire('error');
  assert.match(commanderThemePlayer.getSnapshot().error, /could not be played/);
  commanderThemePlayer.clearError();
  assert.equal(commanderThemePlayer.getSnapshot().error, '');
  await commanderThemePlayer.stop();
  assert.deepEqual(commanderThemePlayer.getSnapshot(), {
    currentSongId: null,
    isPlaying: false,
    isLoading: false,
    loadingSongId: null,
    isShuffleMode: false,
    error: '',
  });
  assert.equal(FakeAudio.instance.src, '');
  pass('errors can be dismissed and stop fully resets the persistent player');

  assert(updates.some((snapshot) => snapshot.isLoading));
  assert(updates.some((snapshot) => snapshot.isPlaying));
  unsubscribe();
  console.log(`${checks} commander theme-player checks passed.`);
})().catch((error) => {
  console.error(error.stack);
  process.exitCode = 1;
});
