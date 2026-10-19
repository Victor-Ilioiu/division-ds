import type { Program } from 'typescript'
import type { ComponentMeta, Tier } from '../../src/components/docs/meta'

export const REPO_ROOT: string
export const TIERS: Tier[]
export const NOT_OFFERED: string
export type ComponentFolder = { tier: Tier; slug: string; dir: string; metaFile?: string; sourceFiles: string[] }
export type FolderExports = {
  components: Record<string, { all: string[]; own: string[] }>
  types: Record<string, string[]>
}
export function componentFolders(root: string): ComponentFolder[]
export function createProgram(root: string): Program
export function publicExports(
  root: string,
  tier: Tier
): Record<string, { values: string[]; types: string[]; from: string[] }>
export function exportsOfFolder(program: Program, root: string, sourceFiles: string[]): FolderExports
export function parseRowName(name: string): { rest?: true; call?: string; props?: string[]; part?: string }
export function resolvePart(
  part: string,
  componentName: string,
  folderExports: FolderExports
): { kind: 'component' | 'type'; name: string } | undefined
export function checkPropsTable(meta: ComponentMeta, folderExports: FolderExports, publicNames: string[]): string[]
