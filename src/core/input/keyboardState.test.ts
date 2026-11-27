import { describe, expect, it } from 'vitest'
import { applyEvent, EMPTY_KEYBOARD, releasedNotes, type KeyboardState } from './keyboardState'
import { parseMidiMessage, type NoteEvent } from './noteEvent'

const run = (events: NoteEvent[], from: KeyboardState = EMPTY_KEYBOARD) => events.reduce(applyEvent, from)
const on = (note: number): NoteEvent => ({ type: 'noteOn', note, velocity: 100 })
const off = (note: number): NoteEvent => ({ type: 'noteOff', note })
const pedal = (down: boolean): NoteEvent => ({ type: 'sustain', down })

describe('applyEvent', () => {
  it('押す・離す', () => {
    const s = run([on(60), on(64), off(60)])
    expect([...s.sounding]).toEqual([64])
    expect([...s.physical]).toEqual([64])
  })

  it('ペダル中に離した音は鳴り続け、ペダルを離すと消える', () => {
    const s1 = run([pedal(true), on(60), on(64), off(60)])
    expect([...s1.sounding].sort()).toEqual([60, 64])
    const s2 = applyEvent(s1, pedal(false))
    expect([...s2.sounding]).toEqual([64])
    expect(releasedNotes(s1, s2)).toEqual([60])
  })

  it('ペダル中に同じ音を弾き直しても重複しない', () => {
    const s = run([pedal(true), on(60), off(60), on(60), off(60)])
    expect([...s.sounding]).toEqual([60])
    expect(s.physical.size).toBe(0)
  })

  it('変化がないときは同じ Set を使い回す', () => {
    const s = run([on(60)])
    expect(applyEvent(s, off(61)).sounding).toBe(s.sounding)
  })
})

describe('parseMidiMessage', () => {
  it.each([
    [[0x90, 60, 100], on(60)],
    [[0x93, 60, 100], on(60)],
    [[0x90, 60, 0], off(60)],
    [[0x80, 60, 64], off(60)],
    [[0xb0, 64, 127], pedal(true)],
    [[0xb0, 64, 63], pedal(false)],
    [[0xb0, 7, 100], null],
    [[0xf8], null],
  ])('%j', (bytes, expected) => {
    expect(parseMidiMessage(bytes)).toEqual(expected)
  })
})
