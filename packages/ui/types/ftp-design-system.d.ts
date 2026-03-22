/**
 * Type declarations for @for-the-people-initiative/design-system component imports.
 * The package exports components as default from subpaths but doesn't provide
 * individual .d.ts files for each component path.
 */
declare module '@for-the-people-initiative/design-system/components/Badge' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module '@for-the-people-initiative/design-system/components/Button' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module '@for-the-people-initiative/design-system/components/Card' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module '@for-the-people-initiative/design-system/components/Checkbox' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module '@for-the-people-initiative/design-system/components/Chip' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module '@for-the-people-initiative/design-system/components/Column' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module '@for-the-people-initiative/design-system/components/ConfirmDialog' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module '@for-the-people-initiative/design-system/components/DataTable' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module '@for-the-people-initiative/design-system/components/Dialog' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module '@for-the-people-initiative/design-system/components/Drawer' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module '@for-the-people-initiative/design-system/components/FormField' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module '@for-the-people-initiative/design-system/components/Message' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module '@for-the-people-initiative/design-system/components/InputNumber' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module '@for-the-people-initiative/design-system/components/InputSwitch' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module '@for-the-people-initiative/design-system/components/InputText' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module '@for-the-people-initiative/design-system/components/Paginator' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module '@for-the-people-initiative/design-system/components/Panel' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module '@for-the-people-initiative/design-system/components/ProgressSpinner' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module '@for-the-people-initiative/design-system/components/Select' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module '@for-the-people-initiative/design-system/components/Sidebar' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module '@for-the-people-initiative/design-system/components/Skeleton' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module '@for-the-people-initiative/design-system/components/Steps' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module '@for-the-people-initiative/design-system/components/Tag' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module '@for-the-people-initiative/design-system/components/Textarea' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module '@for-the-people-initiative/design-system/components/ToggleSwitch' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module '@for-the-people-initiative/design-system/components/Toolbar' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module '@for-the-people-initiative/design-system/components/Breadcrumb' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

// Module declaration for archiver
declare module 'archiver' {
  import type { Transform } from 'stream'
  
  interface ArchiverOptions {
    zlib?: { level: number }
    [key: string]: unknown
  }
  
  interface Archiver extends Transform {
    append(source: string | Buffer | NodeJS.ReadableStream, data: { name: string }): this
    directory(dirpath: string, destpath: string | false, data?: object): this
    finalize(): Promise<void>
    pointer(): number
  }
  
  function archiver(format: 'zip' | 'tar' | 'json', options?: ArchiverOptions): Archiver
  export = archiver
}
