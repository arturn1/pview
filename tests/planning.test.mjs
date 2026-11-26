import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'vite';

test('horas são convertidas com precisão de minutos', async () => {
  const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  try {
    const { parseMinutes, formatMinutes } = await vite.ssrLoadModule('/src/components/sprints/time.ts');
    assert.equal(parseMinutes('1:15'), 75);
    assert.equal(formatMinutes(75), '1:15');
    assert.equal(formatMinutes(-15), '-0:15');
    assert.equal(parseMinutes('0:00'), 0);
    assert.equal(parseMinutes('1:60'), null);
    assert.equal(parseMinutes('1.5'), null);
    assert.equal(parseMinutes('-1:00'), null);
  } finally {
    await vite.close();
  }
});
