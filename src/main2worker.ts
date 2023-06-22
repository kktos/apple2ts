import { STATE, DRIVE } from "./emulator/utility"
import { doPlayDriveSound } from "./diskinterface"
import { clickSpeaker } from "./speaker"
import { startupTextPage } from "./emulator/roms/startuptextpage"
import { doRumble } from "./gamepad"

let worker: Worker | null = null

let saveStateCallback: (state: string) => void

export let updateDisplay = (helptext = '') => {}
export const setUpdateDisplay = (updateIn: (helptext?: string) => void) => {
  updateDisplay = updateIn
}

const doPostMessage = (msg: string, payload: any) => {
  if (!worker) {
    worker = new Worker(new URL('./emulator/worker2main', import.meta.url))
    worker.onmessage = doOnMessage
  }
  worker.postMessage({msg, payload});
}

export const handleSetCPUState = (state: STATE) => {
  doPostMessage("STATE", state)
}

export const handleSetBreakpoint = (breakpoint: number) => {
  doPostMessage("BREAKPOINT", breakpoint)
}

export const handleStepInto = () => {
  doPostMessage("STEP_INTO", true)
}

export const handleStepOver = () => {
  doPostMessage("STEP_OVER", true)
}

export const handleStepOut = () => {
  doPostMessage("STEP_OUT", true)
}

export const handleSetDebug = (doDebug: boolean) => {
  doPostMessage("DEBUG", doDebug)
}

export const handleSetNormalSpeed = (normal: boolean) => {
  doPostMessage("SPEED", normal)
}

export const handleGoForwardInTime = () => {
  doPostMessage("TIME_TRAVEL", "FORWARD")
}

export const handleGoBackInTime = () => {
  doPostMessage("TIME_TRAVEL", "BACKWARD")
}

export const handleRestoreSaveState = (sState: string) => {
  doPostMessage("RESTORE_STATE", sState)
}

export const handleKeyboardBuffer = (text: String) => {
  doPostMessage("KEYBUFFER", text)
}

export const handleAppleCommandKeyPress = (left: boolean) => {
  doPostMessage("APPLE_PRESS", left)
}

export const handleAppleCommandKeyRelease = (left: boolean) => {
  doPostMessage("APPLE_RELEASE", left)
}

export const handleSetGamepads = (gamePads: EmuGamepad[] | null) => {
  doPostMessage("GAMEPAD", gamePads)
}

let machineState: MachineState = {
  state: STATE.IDLE,
  speed: '',
  altChar: true,
  textPage: startupTextPage,
  lores: new Uint8Array(),
  hires: new Uint8Array(),
  zeroPageStack: '',
  button0: false,
  button1: false
}
let saveState = ""

const doOnMessage = (e: MessageEvent) => {
  switch (e.data.msg) {
    case "MACHINE_STATE":
      const cpuStateChanged = machineState.state !== e.data.payload.state ||
        machineState.zeroPageStack !== e.data.payload.zeroPageStack ||
        machineState.button0 !== e.data.payload.button0 ||
        machineState.button1 !== e.data.payload.button1 ||
        machineState.speed !== e.data.payload.speed
      machineState = e.data.payload
      if (cpuStateChanged) updateDisplay()
      break;
    case "SAVE_STATE":
      saveState = e.data.payload
      saveStateCallback(saveState)
      break;
    case "CLICK":
      clickSpeaker(e.data.payload)
      break
    case "DRIVE_PROPS":
      const props: DriveProps = e.data.payload
      driveProps[props.drive] = props
      updateDisplay()
      break;
    case "DRIVE_SOUND":
      const sound: DRIVE = e.data.payload
      doPlayDriveSound(sound)
      break
    case "RUMBLE":
      const params: GamePadActuatorEffect = e.data.payload
      doRumble(params)
      break
    case "HELP_TEXT":
      const helptext = e.data.payload
      updateDisplay(helptext)
      break
    default:
    console.log("main2worker: unknown msg: " + JSON.stringify(e.data))
      break;
  }
}

export const handleGetState = () => {
  return machineState.state
}

export const handleGetSpeed = () => {
  return machineState.speed
}

export const handleGetTextPage = () => {
  return machineState.textPage
}

export const handleGetLores = () => {
  return machineState.lores
}

export const handleGetHires = () => {
  return machineState.hires
}

export const handleGetAltCharSet = () => {
  return machineState.altChar
}

export const handleGetZeroPageStack = () => {
  return machineState.zeroPageStack
}

export const handleGetButton = (left: boolean) => {
  return left ? machineState.button0 : machineState.button1
}

export const handleGetSaveState = (callback: (state: string) => void) => {
  saveStateCallback = callback
  doPostMessage("GET_SAVE_STATE", true)
}

const initDriveProps = (drive: number): DriveProps => {
  return {
    hardDrive: false,
    drive: drive,
    filename: "",
    status: "",
    diskHasChanges: false,
    motorRunning: false,
    diskData: new Uint8Array()
  }
}
let driveProps: DriveProps[] = [initDriveProps(0), initDriveProps(1), initDriveProps(2)];
driveProps[0].hardDrive = true

export const handleGetFilename = (drive: number) => {
  let f = driveProps[drive].filename
  if (f !== "") {
    const i = f.lastIndexOf('.')
    if (i > 0) {
      f = f.substring(0, i)
    }
    return f
  }
  return null
}

export const handleGetDriveProps = (drive: number) => {
  return driveProps[drive]
}

// async function fetchData(url: string): Promise<Uint8Array> {
//   let result: Uint8Array
//   try {
//     const response = await fetch(url, {mode:'cors'});
//     const buffer = await response.arrayBuffer();
//     const uint8Array = new Uint8Array(buffer);
//     result = uint8Array;
//   } catch (error) {
//     console.error('Error:', error);
//     result = new Uint8Array()
//   }
//   return result
// }

export const handleSetDiskData = (drive: number,
  data: Uint8Array, filename: string) => {
  const props = driveProps[drive]
  props.drive = drive
  props.filename = filename
  // const url = 'https://archive.org/download/TotalReplay/Total%20Replay%20v5.0-beta.3.hdv'
  // fetchData(url)
  // .then(data => {
  //   props.diskData = data
  //   doPostMessage("DRIVE_PROPS", props)
  // })
  props.diskData = data
  doPostMessage("DRIVE_PROPS", props)
}