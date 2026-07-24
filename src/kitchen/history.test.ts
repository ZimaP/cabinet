import { describe, expect, it, vi } from 'vitest'

import {
  MAX_KITCHEN_HISTORY_ENTRIES,
  canRedoKitchenHistory,
  canUndoKitchenHistory,
  commitKitchenHistory,
  createKitchenHistory,
  redoKitchenHistory,
  undoKitchenHistory,
} from './history'
import {
  createKitchenProject,
  updateRoomDimensions,
} from './project'
import type { KitchenProject } from './types'

const projectWithWidth = (width: number): KitchenProject =>
  updateRoomDimensions(createKitchenProject(), { width })

describe('kitchen project history', () => {
  it('starts at the supplied project without undo or redo entries', () => {
    const project = createKitchenProject()
    const history = createKitchenHistory(project)

    expect(history).toEqual({
      past: [],
      present: project,
      future: [],
      maxPastEntries: MAX_KITCHEN_HISTORY_ENTRIES,
    })
    expect(history.present).toBe(project)
    expect(canUndoKitchenHistory(history)).toBe(false)
    expect(canRedoKitchenHistory(history)).toBe(false)
  })

  it('commits direct projects without mutating the previous history', () => {
    const first = projectWithWidth(120)
    const second = projectWithWidth(144)
    const initial = createKitchenHistory(first)
    const committed = commitKitchenHistory(initial, second)

    expect(initial).toEqual({
      past: [],
      present: first,
      future: [],
      maxPastEntries: MAX_KITCHEN_HISTORY_ENTRIES,
    })
    expect(committed.past).toEqual([first])
    expect(committed.present).toBe(second)
    expect(committed.future).toEqual([])
    expect(canUndoKitchenHistory(committed)).toBe(true)
  })

  it('supports updater functions evaluated against the present project', () => {
    const initialProject = projectWithWidth(120)
    const updater = vi.fn((project: KitchenProject) =>
      updateRoomDimensions(project, { width: project.room.width + 12 }),
    )

    const committed = commitKitchenHistory(
      createKitchenHistory(initialProject),
      updater,
    )

    expect(updater).toHaveBeenCalledOnce()
    expect(updater).toHaveBeenCalledWith(initialProject)
    expect(committed.present.room.width).toBe(132)
    expect(committed.past).toEqual([initialProject])
  })

  it('undoes and redoes commits in chronological order', () => {
    const first = projectWithWidth(120)
    const second = projectWithWidth(132)
    const third = projectWithWidth(144)
    let history = createKitchenHistory(first)
    history = commitKitchenHistory(history, second)
    history = commitKitchenHistory(history, third)

    const firstUndo = undoKitchenHistory(history)
    expect(firstUndo.past).toEqual([first])
    expect(firstUndo.present).toBe(second)
    expect(firstUndo.future).toEqual([third])
    expect(canUndoKitchenHistory(firstUndo)).toBe(true)
    expect(canRedoKitchenHistory(firstUndo)).toBe(true)

    const secondUndo = undoKitchenHistory(firstUndo)
    expect(secondUndo.past).toEqual([])
    expect(secondUndo.present).toBe(first)
    expect(secondUndo.future).toEqual([second, third])
    expect(canUndoKitchenHistory(secondUndo)).toBe(false)

    const firstRedo = redoKitchenHistory(secondUndo)
    expect(firstRedo.past).toEqual([first])
    expect(firstRedo.present).toBe(second)
    expect(firstRedo.future).toEqual([third])

    const secondRedo = redoKitchenHistory(firstRedo)
    expect(secondRedo.past).toEqual([first, second])
    expect(secondRedo.present).toBe(third)
    expect(secondRedo.future).toEqual([])
    expect(canRedoKitchenHistory(secondRedo)).toBe(false)
  })

  it('returns the same history when undo or redo is unavailable', () => {
    const initial = createKitchenHistory(createKitchenProject())

    expect(undoKitchenHistory(initial)).toBe(initial)
    expect(redoKitchenHistory(initial)).toBe(initial)

    const committed = commitKitchenHistory(
      initial,
      projectWithWidth(156),
    )
    expect(redoKitchenHistory(committed)).toBe(committed)
  })

  it('preserves referential no-ops from projects and updater functions', () => {
    const project = createKitchenProject()
    const history = createKitchenHistory(project)
    const noOpUpdater = vi.fn(
      (currentProject: KitchenProject) => currentProject,
    )

    expect(commitKitchenHistory(history, project)).toBe(history)
    expect(commitKitchenHistory(history, noOpUpdater)).toBe(history)
    expect(noOpUpdater).toHaveBeenCalledOnce()
    expect(history.past).toEqual([])
    expect(history.future).toEqual([])
  })

  it('clears redo entries when a new commit branches from an undo', () => {
    const first = projectWithWidth(120)
    const second = projectWithWidth(132)
    const abandoned = projectWithWidth(144)
    const replacement = projectWithWidth(156)
    let history = createKitchenHistory(first)
    history = commitKitchenHistory(history, second)
    history = commitKitchenHistory(history, abandoned)
    history = undoKitchenHistory(history)

    expect(history.future).toEqual([abandoned])

    const branched = commitKitchenHistory(history, replacement)
    expect(branched.past).toEqual([first, second])
    expect(branched.present).toBe(replacement)
    expect(branched.future).toEqual([])
    expect(canRedoKitchenHistory(branched)).toBe(false)
  })

  it('retains only the most recent 50 past entries by default', () => {
    const projects = Array.from(
      { length: MAX_KITCHEN_HISTORY_ENTRIES + 8 },
      (_, index) => projectWithWidth(60 + index),
    )
    let history = createKitchenHistory(projects[0])

    for (const project of projects.slice(1)) {
      history = commitKitchenHistory(history, project)
    }

    expect(history.past).toHaveLength(
      MAX_KITCHEN_HISTORY_ENTRIES,
    )
    expect(history.past[0]).toBe(
      projects[projects.length - MAX_KITCHEN_HISTORY_ENTRIES - 1],
    )
    expect(history.past.at(-1)).toBe(
      projects.at(-2),
    )
    expect(history.present).toBe(projects.at(-1))

    for (let index = 0; index < MAX_KITCHEN_HISTORY_ENTRIES; index += 1) {
      history = undoKitchenHistory(history)
    }

    expect(history.present).toBe(
      projects[projects.length - MAX_KITCHEN_HISTORY_ENTRIES - 1],
    )
    expect(canUndoKitchenHistory(history)).toBe(false)
  })

  it('supports a smaller custom cap and normalizes invalid limits', () => {
    const first = projectWithWidth(100)
    const second = projectWithWidth(110)
    const third = projectWithWidth(120)
    const fourth = projectWithWidth(130)
    let history = createKitchenHistory(first, 2.9)

    history = commitKitchenHistory(history, second)
    history = commitKitchenHistory(history, third)
    history = commitKitchenHistory(history, fourth)

    expect(history.maxPastEntries).toBe(2)
    expect(history.past).toEqual([second, third])

    expect(createKitchenHistory(first, 0).maxPastEntries).toBe(1)
    expect(
      createKitchenHistory(first, Number.NaN).maxPastEntries,
    ).toBe(MAX_KITCHEN_HISTORY_ENTRIES)
  })

  it('keeps the history cap while moving repeatedly through undo and redo', () => {
    const projects = [100, 110, 120, 130].map(projectWithWidth)
    let history = createKitchenHistory(projects[0], 2)
    history = commitKitchenHistory(history, projects[1])
    history = commitKitchenHistory(history, projects[2])
    history = commitKitchenHistory(history, projects[3])

    history = undoKitchenHistory(history)
    history = undoKitchenHistory(history)
    expect(history.present).toBe(projects[1])
    expect(history.future).toEqual([projects[2], projects[3]])

    history = redoKitchenHistory(history)
    history = redoKitchenHistory(history)
    expect(history.present).toBe(projects[3])
    expect(history.past).toEqual([projects[1], projects[2]])
    expect(history.past).toHaveLength(2)
  })
})
