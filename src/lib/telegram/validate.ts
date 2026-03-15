import { validate, parse } from '@tma.js/init-data-node'

export function validateTelegramInitData(initDataRaw: string) {
  validate(initDataRaw, process.env.TELEGRAM_BOT_TOKEN!)
  return parse(initDataRaw)
}
