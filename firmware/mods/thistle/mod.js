// Thistle MOD — the keeper's eyes and mouth on the MOD host.
//
// Dials the XiaoZhi v1 keeper server (meteion) via ChatService's connection
// factory, shows transcripts in a balloon, drives the face from server emotion
// events, and exposes a drawer toggle + touch wake path.
//
// One-brain rule: no persona logic here. Persona lives on the keeper server
// (instructions + brain prompt); this MOD is renderer + actuators.

import { ChatService, ChatState, chatStateToName, createXiaozhiV1Connection } from 'chat'
import { emotionFromName } from 'face-state'
import {
  CLIENT_ID,
  DEVICE_ID,
  KEEPER_ENDPOINT,
  KEEPER_TOKEN,
  LISTENING_MODE,
  THISTLE_INSTRUCTIONS,
} from 'thistle-config'
import config from 'mc/config'
import Timer from 'timer'

const DRAWER_KEY = 'thistle:keeper'
const MOUTH_UPDATE_MS = 125
const MOUTH_SCALE = 1 / 2000

// Allow build-time override of the endpoint (mc/config define) for dev flexibility.
const endpoint = config?.keeper?.endpoint ?? KEEPER_ENDPOINT
// Token: prefer build-time define; empty = no auth (dev keeper running without token).
const accessToken = config?.keeper?.token ?? KEEPER_TOKEN ?? ''

export function onContextCreated(robot) {
  const drawer = robot.ui?.drawer
  let active = false
  let mouthTarget = 0

  const connection = createXiaozhiV1Connection({
    endpoint,
    accessToken: accessToken || undefined,
    deviceId: DEVICE_ID,
    clientId: CLIENT_ID,
    instructions: THISTLE_INSTRUCTIONS,
    listeningMode: LISTENING_MODE,
    features: { mcp: true },
    mcp: { serverInfo: { name: 'thistle', version: '0.1.0' } },
  })

  const chat = new ChatService({
    connection,
    tools: {},
    callbacks: {
      onStateChanged: (state, error) => {
        trace(`[thistle] chat state: ${chatStateToName(state)}${error ? ` (${error})` : ''}\n`)
        if (state !== ChatState.LISTENING && state !== ChatState.SPEAKING) {
          mouthTarget = 0
        }
        if (state === ChatState.FAILED) {
          robot.ui?.showBalloon?.(`keeper down\n${error ?? ''}`)
          drawer?.setDrawerButtonState?.(DRAWER_KEY, false)
          active = false
        }
      },
      onInputTranscript: (text) => {
        if (text) trace(`[thistle] you: ${text}\n`)
      },
      onOutputTranscript: (text) => {
        if (text) {
          trace(`[thistle] keeper: ${text}\n`)
          robot.ui?.showBalloon?.(text)
        }
      },
      onOutputLevelChanged: (level) => {
        mouthTarget = Math.min(level * MOUTH_SCALE, 1)
      },
      onEmotionChanged: (emotion) => {
        if (!emotion) return
        const face = emotionFromName(emotion)
        if (face !== undefined) robot.face?.setEmotion?.(face)
      },
      onAlert: (alert) => {
        trace(`[thistle] alert: ${alert.message}\n`)
        robot.ui?.showBalloon?.(alert.message)
      },
    },
  })

  // Mouth animation loop (quantized like the chat_audioio example).
  Timer.set(() => {
    try {
      robot.setMouthOpen?.(mouthTarget)
    } catch {
      // face renderer may not support it; ignore
    }
  }, MOUTH_UPDATE_MS, true)

  const startKeeper = () => {
    if (active) return
    active = true
    drawer?.setDrawerButtonState?.(DRAWER_KEY, true)
    chat.setVolume(0.6)
    chat.start()
  }

  const stopKeeper = () => {
    if (!active) return
    active = false
    drawer?.setDrawerButtonState?.(DRAWER_KEY, false)
    chat.stop()
    mouthTarget = 0
    robot.ui?.hideBalloon?.()
  }

  drawer?.addDrawerButton?.({
    key: DRAWER_KEY,
    label: 'Keeper',
    kind: 'toggle',
    initialState: false,
    callback: () => {
      if (active) stopKeeper()
      else startKeeper()
    },
  })

  // Touch wake: forward swipe on the top panel -> start + tell the keeper a
  // wake word happened; backward swipe -> stop. (Same panel the codex_voice
  // MOD uses; CoreS3 top touch zone.)
  const touchPanel = robot.input?.touchPanel
  if (touchPanel) {
    const handleTouch = (event) => {
      if (event.gesture === 'forwardSwipe') {
        if (!active) startKeeper()
        try {
          chat.notifyWakeWordDetected('thistle')
        } catch (err) {
          trace(`[thistle] wake notify failed: ${String(err)}\n`)
        }
      } else if (event.gesture === 'backwardSwipe') {
        stopKeeper()
      }
    }
    if (typeof touchPanel.subscribe === 'function') {
      touchPanel.subscribe(handleTouch)
    } else {
      touchPanel.onEvent = handleTouch
    }
  } else {
    trace('[thistle] no touch panel; drawer button is the only control\n')
  }
}
