"""Java 版の判定結果を正解データ（JSON）として書き出す。
使い方: python3 tools/java-golden/generate.py ../midi-chord-viewer
"""
import itertools, json, os, random, subprocess, sys, tempfile

java_repo = sys.argv[1]
here = os.path.dirname(os.path.abspath(__file__))
out_path = os.path.join(here, '..', '..', 'src', 'core', 'theory', '__fixtures__', 'java-golden.json')

rng = random.Random(20261127)
cases = [[], [60], [64], [60, 64], [60, 67], [48, 61]]
# 3〜4音のピッチクラスの組み合わせは全部、5〜7音はランダム。ボイシングもランダムに散らす
for size in (3, 4):
    for pcs in itertools.combinations(range(12), size):
        cases.append(sorted(36 + 12 * rng.randrange(5) + pc for pc in pcs))
for size in (5, 6, 7):
    for _ in range(600):
        pcs = rng.sample(range(12), size)
        cases.append(sorted(set(36 + 12 * rng.randrange(5) + pc for pc in pcs)))
# 同じピッチクラスの重複（オクターブ重ね）
for _ in range(300):
    pcs = rng.sample(range(12), rng.randrange(3, 5))
    notes = set()
    for pc in pcs:
        for _ in range(rng.randrange(1, 3)):
            notes.add(36 + 12 * rng.randrange(5) + pc)
    cases.append(sorted(notes))

with tempfile.TemporaryDirectory() as tmp:
    srcs = [os.path.join(dp, f) for dp, _, fs in os.walk(os.path.join(java_repo, 'src', 'model')) for f in fs if f.endswith('.java')]
    subprocess.run(['javac', '-encoding', 'UTF-8', '-d', tmp, *srcs, os.path.join(here, 'Golden.java')], check=True)
    stdin = '\n'.join(' '.join(map(str, c)) for c in cases) + '\n'
    res = subprocess.run(['java', '-Dfile.encoding=UTF-8', '-Dstdout.encoding=UTF-8', '-cp', tmp, 'Golden'],
                         input=stdin.encode('utf-8'), capture_output=True, check=True)
    labels = res.stdout.decode('utf-8').split('\n')[:len(cases)]

with open(out_path, 'w', encoding='utf-8') as f:
    f.write('[\n' + ',\n'.join(json.dumps({'notes': c, 'label': l}, ensure_ascii=False) for c, l in zip(cases, labels)) + '\n]\n')
print(f'{len(cases)} cases -> {os.path.relpath(out_path)}')
