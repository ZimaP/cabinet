import type { KitchenProject } from './types'

export const MAX_KITCHEN_HISTORY_ENTRIES = 50

export type KitchenProjectUpdater = (
  project: KitchenProject,
) => KitchenProject

export type KitchenProjectUpdate =
  | KitchenProject
  | KitchenProjectUpdater

export interface KitchenProjectHistory {
  readonly past: readonly KitchenProject[]
  readonly present: KitchenProject
  readonly future: readonly KitchenProject[]
  readonly maxPastEntries: number
}

const normalizeHistoryLimit = (limit: number): number => {
  if (!Number.isFinite(limit)) {
    return MAX_KITCHEN_HISTORY_ENTRIES
  }

  return Math.max(1, Math.floor(limit))
}

const appendPastEntry = (
  past: readonly KitchenProject[],
  project: KitchenProject,
  maxPastEntries: number,
): readonly KitchenProject[] => {
  const firstRetainedIndex = Math.max(
    0,
    past.length + 1 - maxPastEntries,
  )

  return [...past.slice(firstRetainedIndex), project]
}

export function createKitchenHistory(
  project: KitchenProject,
  maxPastEntries = MAX_KITCHEN_HISTORY_ENTRIES,
): KitchenProjectHistory {
  return {
    past: [],
    present: project,
    future: [],
    maxPastEntries: normalizeHistoryLimit(maxPastEntries),
  }
}

export function commitKitchenHistory(
  history: KitchenProjectHistory,
  update: KitchenProjectUpdate,
): KitchenProjectHistory {
  const nextProject =
    typeof update === 'function'
      ? update(history.present)
      : update

  if (Object.is(nextProject, history.present)) {
    return history
  }

  return {
    past: appendPastEntry(
      history.past,
      history.present,
      history.maxPastEntries,
    ),
    present: nextProject,
    future: [],
    maxPastEntries: history.maxPastEntries,
  }
}

export function undoKitchenHistory(
  history: KitchenProjectHistory,
): KitchenProjectHistory {
  const previous = history.past.at(-1)
  if (!previous) return history

  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
    maxPastEntries: history.maxPastEntries,
  }
}

export function redoKitchenHistory(
  history: KitchenProjectHistory,
): KitchenProjectHistory {
  const next = history.future[0]
  if (!next) return history

  return {
    past: appendPastEntry(
      history.past,
      history.present,
      history.maxPastEntries,
    ),
    present: next,
    future: history.future.slice(1),
    maxPastEntries: history.maxPastEntries,
  }
}

export const canUndoKitchenHistory = (
  history: KitchenProjectHistory,
): boolean => history.past.length > 0

export const canRedoKitchenHistory = (
  history: KitchenProjectHistory,
): boolean => history.future.length > 0
