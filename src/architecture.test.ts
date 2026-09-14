// Enforces the one-way dependency rules from the build spec §10.1.
// types/, lib/ and games/ must stay platform-free so they port anywhere.
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const SRC = __dirname;

function walk(dir: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

function importsOf(file: string): string[] {
  const src = readFileSync(file, 'utf8');
  const specs: string[] = [];
  const re = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) specs.push(m[1] ?? m[2] ?? m[3] ?? '');
  return specs;
}

function offenders(dir: string, forbidden: (spec: string) => boolean): string[] {
  const bad: string[] = [];
  for (const file of walk(dir)) {
    for (const spec of importsOf(file)) {
      if (forbidden(spec)) bad.push(`${relative(SRC, file)} → ${spec}`);
    }
  }
  return bad;
}

const isPlatform = (s: string) => /^(react|react-native|expo|@expo|nativewind|zustand|@react-native)/.test(s) || /(^|\/)(store|components|app|theme)(\/|$)/.test(s);

describe('architecture', () => {
  it('types/ imports nothing outside types/', () => {
    expect(offenders(join(SRC, 'types'), (s) => !s.startsWith('.'))).toEqual([]);
  });

  it('lib/ imports only types/ and lib/', () => {
    expect(offenders(join(SRC, 'lib'), (s) => isPlatform(s) || /games\//.test(s))).toEqual([]);
  });

  it('games/ never imports the store, React or React Native', () => {
    expect(offenders(join(SRC, 'games'), isPlatform)).toEqual([]);
  });

  it('app/ and components/ never import games/ directly (they read what the store computed)', () => {
    // "@/games", "src/games", "../games", "../../games" are all off limits; "@/components/games" is fine.
    const bad = (s: string) => s === '@/games' || s.startsWith('@/games/') || /(^|\/)src\/games(\/|$)/.test(s) || /^(\.\.\/)+games(\/|$)/.test(s);
    expect(offenders(join(SRC, 'app'), bad)).toEqual([]);
    expect(offenders(join(SRC, 'components'), bad)).toEqual([]);
  });

  it('components/ui imports only theme/ and React Native', () => {
    expect(offenders(join(SRC, 'components', 'ui'), (s) => /(^|\/)(store|games|lib)(\/|$)/.test(s))).toEqual([]);
  });
});
