/**
 * Register FTP Design System components globally.
 * Uses compiled components from @for-the-people-initiative/design-system v1.4+
 */
import Badge from '@for-the-people-initiative/design-system/components/Badge'
import Button from '@for-the-people-initiative/design-system/components/Button'
import Card from '@for-the-people-initiative/design-system/components/Card'
import Checkbox from '@for-the-people-initiative/design-system/components/Checkbox'
import Chip from '@for-the-people-initiative/design-system/components/Chip'
import Column from '@for-the-people-initiative/design-system/components/Column'
import ConfirmDialog from '@for-the-people-initiative/design-system/components/ConfirmDialog'
import DataTable from '@for-the-people-initiative/design-system/components/DataTable'
import Dialog from '@for-the-people-initiative/design-system/components/Dialog'
import Drawer from '@for-the-people-initiative/design-system/components/Drawer'
import FormField from '@for-the-people-initiative/design-system/components/FormField'
import Message from '@for-the-people-initiative/design-system/components/Message'
import InputNumber from '@for-the-people-initiative/design-system/components/InputNumber'
import InputSwitch from '@for-the-people-initiative/design-system/components/InputSwitch'
import InputText from '@for-the-people-initiative/design-system/components/InputText'
import Paginator from '@for-the-people-initiative/design-system/components/Paginator'
import Panel from '@for-the-people-initiative/design-system/components/Panel'
import ProgressSpinner from '@for-the-people-initiative/design-system/components/ProgressSpinner'
import Select from '@for-the-people-initiative/design-system/components/Select'
import Sidebar from '@for-the-people-initiative/design-system/components/Sidebar'
import Skeleton from '@for-the-people-initiative/design-system/components/Skeleton'
import Steps from '@for-the-people-initiative/design-system/components/Steps'
import Tag from '@for-the-people-initiative/design-system/components/Tag'
import Textarea from '@for-the-people-initiative/design-system/components/Textarea'
import ToggleSwitch from '@for-the-people-initiative/design-system/components/ToggleSwitch'
import Toolbar from '@for-the-people-initiative/design-system/components/Toolbar'
import Breadcrumb from '@for-the-people-initiative/design-system/components/Breadcrumb'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('FtpBadge', Badge)
  nuxtApp.vueApp.component('FtpButton', Button)
  nuxtApp.vueApp.component('FtpCard', Card)
  nuxtApp.vueApp.component('FtpCheckbox', Checkbox)
  nuxtApp.vueApp.component('FtpChip', Chip)
  nuxtApp.vueApp.component('FtpColumn', Column)
  nuxtApp.vueApp.component('FtpConfirmDialog', ConfirmDialog)
  nuxtApp.vueApp.component('FtpDataTable', DataTable)
  nuxtApp.vueApp.component('FtpDialog', Dialog)
  nuxtApp.vueApp.component('FtpDrawer', Drawer)
  nuxtApp.vueApp.component('FtpFormField', FormField)
  nuxtApp.vueApp.component('FtpMessage', Message)
  nuxtApp.vueApp.component('FtpInputNumber', InputNumber)
  nuxtApp.vueApp.component('FtpInputSwitch', InputSwitch)
  nuxtApp.vueApp.component('FtpInputText', InputText)
  nuxtApp.vueApp.component('FtpPaginator', Paginator)
  nuxtApp.vueApp.component('FtpPanel', Panel)
  nuxtApp.vueApp.component('FtpProgressSpinner', ProgressSpinner)
  nuxtApp.vueApp.component('FtpSelect', Select)
  nuxtApp.vueApp.component('FtpSidebar', Sidebar)
  nuxtApp.vueApp.component('FtpSkeleton', Skeleton)
  nuxtApp.vueApp.component('FtpSteps', Steps)
  nuxtApp.vueApp.component('FtpTag', Tag)
  nuxtApp.vueApp.component('FtpTextarea', Textarea)
  nuxtApp.vueApp.component('FtpToggleSwitch', ToggleSwitch)
  nuxtApp.vueApp.component('FtpToolbar', Toolbar)
  nuxtApp.vueApp.component('FtpBreadcrumb', Breadcrumb)
})
