import model.Chord;
import model.ChordAnalyzer;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.Set;
import java.util.TreeSet;

/** 1行に空白区切りの MIDI ノート番号 → 1行に Java 版の判定結果ラベル */
public final class Golden {
    public static void main(String[] args) throws Exception {
        ChordAnalyzer analyzer = new ChordAnalyzer();
        BufferedReader in = new BufferedReader(new InputStreamReader(System.in, "UTF-8"));
        StringBuilder out = new StringBuilder();
        String line;
        while ((line = in.readLine()) != null) {
            Set<Integer> notes = new TreeSet<>();
            for (String s : line.trim().split("\\s+")) {
                if (!s.isEmpty()) notes.add(Integer.parseInt(s));
            }
            out.append(analyzer.analyze(notes).label).append('\n');
        }
        System.out.print(out);
    }
}
