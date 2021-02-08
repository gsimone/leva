import { useEffect, useMemo, useState } from 'react'
import { StoreType } from '../store'
import { folder } from '../helpers'
import { useValuesForPath } from '../utils/hooks'
import { Schema, SchemaToValues, FolderSettings } from '../types'

export type Settings = Partial<FolderSettings>

function parseArgs<S extends Schema>(
  nameOrSchema: string | S,
  schemaOrSettings: S | Settings = {},
  settingsOrUndefined?: Settings
): { schema: Schema; settings?: Settings } {
  if (typeof nameOrSchema === 'string') {
    return { schema: { [nameOrSchema]: folder(schemaOrSettings as S, settingsOrUndefined) } }
  } else {
    const settings = schemaOrSettings as Settings
    const schema = nameOrSchema as S
    return { schema, settings }
  }
}

export function useRootControls<S extends Schema>(
  store: StoreType,
  nameOrSchema: string | S,
  schemaOrSettings?: S,
  settingsOrUndefined?: Settings
): SchemaToValues<S> {
  const [{ schema }] = useState(() => parseArgs(nameOrSchema, schemaOrSettings, settingsOrUndefined))

  /**
   * Parses the schema to extract the inputs initial data.
   *
   * This initial data will be used to initialize the store.
   *
   * Note that getDataFromSchema recursively
   * parses the schema inside nested folder.
   */
  const initialData = useMemo(() => store.getDataFromSchema(schema), [store, schema])

  // Extracts the paths from the initialData and ensures order of paths.
  const paths = useMemo(() => store.orderPathsFromData(initialData), [initialData, store])

  /**
   * Reactive hook returning the values from the store at given paths.
   * Essentially it flattens the keys of a nested structure.
   * For example { "folder.subfolder.valueKey": value } becomes { valueKey: value }
   *
   * initalData is going to be returned on the first render. Subsequent renders
   * will call the store data.
   * */
  const values = useValuesForPath(store, paths, initialData)

  useEffect(() => {
    // We initialize the store with the initialData in useEffect.
    // Note that doing this while rendering would makes things easier
    // and remove the need for initializing useValuesForPath but it
    // breaks the rendering cycle for some reason.

    // Old comment that I left, I have no idea what I meant 🤷‍♂️:
    // > we need to compute these in useEffect for monitors to work
    // > but this breaks the order of keys
    store.setData(initialData)
    return () => store.disposePaths(paths)
  }, [store, paths, initialData])

  return values as any
}