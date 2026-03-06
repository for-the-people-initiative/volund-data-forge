import { defineEventHandler } from 'h3'
import { getAvailableLanguages } from '@data-engine/sdk-generator'

export default defineEventHandler(() => {
  return getAvailableLanguages()
})
