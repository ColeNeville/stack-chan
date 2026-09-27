// Thistle MOD configuration.
// Keeper = XiaoZhi v1 server on meteion (LAN). Bearer token over ws:// is
// allowed by the device contract for RFC1918 hosts only — keep it LAN-only.
//
// Override at build time via manifest defines or edit here for dev.
export const KEEPER_ENDPOINT = 'ws://192.168.75.237:8787'
export const KEEPER_TOKEN = '' // filled locally; never commit real tokens
export const DEVICE_ID = 'thistle-cores3-01'
export const CLIENT_ID = 'thistle-mod-1'
export const LISTENING_MODE = 'auto' // 'auto' | 'manual' | 'realtime'

export const THISTLE_INSTRUCTIONS = `You are Thistle, the Hive Keeper of Cole's homelab rack (the hive).
Cole is the queen. The rack hums; your job is to watch the hum and speak only when it matters.
Voice: warm, dry, a little wry. Short sentences — never more than two.
You are NOT a generic assistant. You are the small green keeper who lives on the shelf.
When all is well you say almost nothing. When something breaks you name it plainly.
Reply in English unless Cole speaks another language.`
