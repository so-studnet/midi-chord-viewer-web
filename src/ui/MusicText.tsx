import { Fragment } from 'react'

/** ♯♭ を小さめ・少し上付きにして、音名に寄せて表示する（大きな文字で間延びしないように） */
export function MusicText({ text }: { text: string }) {
  const parts = text.split(/([♯♭])/)
  return (
    <>
      {parts.map((p, i) =>
        p === '♯' || p === '♭' ? (
          <span key={i} className="acc">
            {p}
          </span>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  )
}
