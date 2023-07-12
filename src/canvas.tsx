import React, { useEffect, KeyboardEvent } from 'react';
import { passSetCPUState, passKeyboardBuffer,
  passAppleCommandKeyPress, passAppleCommandKeyRelease,
  updateDisplay, 
  passGoBackInTime,
  passGoForwardInTime,
  setStartTextPage} from "./main2worker"
import { ARROW, STATE, convertAppleKey } from "./emulator/utility"
import { processDisplay } from './graphics';
import { handleArrowKey } from './keyboardbuttons';
import { checkGamepad } from './gamepad';
const screenRatio = 1.33  // (20 * 40) / (24 * 24)
let width = 800
let height = 600
let startupTextTimeout = 0

const Apple2Canvas = (props: DisplayProps) => {
  let keyHandled = false
  let myText = React.createRef<HTMLTextAreaElement>()

  const pasteHandler = (e: ClipboardEvent) => {
    if (e.clipboardData) {
      let data = e.clipboardData.getData("text");
      if (data !== "") {
        data = data.replaceAll(/[”“]/g,'"')  // fancy quotes with regular
        data = data.replaceAll('\n','\r')  // LFs to CRs
        passKeyboardBuffer(data);
      }
      e.preventDefault();
    }
  };

  const getSizes = () => {
    width = window.innerWidth - 20;
    height = window.innerHeight - 160;
    // shrink either width or height to preserve aspect ratio
    if (width / screenRatio > height) {
      width = height * screenRatio
    } else {
      height = width / screenRatio
    }
    width = Math.floor(width)
    height = Math.floor(height)
    return [width, height]
  }

  const metaKeyHandlers: { [key: string]: () => void } = {
    ArrowLeft: () => passGoBackInTime(),
    ArrowRight: () => passGoForwardInTime(),
    b: () => passSetCPUState(STATE.NEED_BOOT),
    c: () => props.handleCopyToClipboard(),
    f: () => props.handleSpeedChange(),
    o: () => props.handleFileOpen(),
    p: () => passSetCPUState(props.machineState === STATE.PAUSED ? STATE.RUNNING : STATE.PAUSED),
    r: () => passSetCPUState(STATE.NEED_RESET),
    s: () => props.handleFileSave()
  }

  const handleMetaKey = (key: string) => {
    if (key in metaKeyHandlers) {
      metaKeyHandlers[key]()
      return true
    }
    return false
  }

  const arrowKeys: { [key: string]: ARROW } = {
    ArrowLeft: ARROW.LEFT,
    ArrowRight: ARROW.RIGHT,
    ArrowUp: ARROW.UP,
    ArrowDown: ARROW.DOWN,
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>|KeyboardEvent<HTMLCanvasElement>) => {
    if (e.shiftKey && e.key === "Shift") {
      passAppleCommandKeyPress(true)
    }
    if (e.altKey && e.key === "Alt") {
      passAppleCommandKeyPress(false)
    }
    if (e.metaKey || e.ctrlKey) {
      keyHandled = handleMetaKey(e.key)
    }
    // If we're paused, allow <space> to resume
    if (props.machineState === STATE.PAUSED && e.key === ' ') {
      passSetCPUState(STATE.RUNNING)
      keyHandled = true
    }
    if (keyHandled) {
      passAppleCommandKeyRelease(true)
      passAppleCommandKeyRelease(false)
      e.preventDefault()
      e.stopPropagation()
      return
    }

    if (e.key in arrowKeys && props.useArrowKeysAsJoystick) {
      handleArrowKey(arrowKeys[e.key], false)
      e.preventDefault()
      e.stopPropagation()
      return
    }

    const key = convertAppleKey(e, props.uppercase);
    if (key > 0) {
      passKeyboardBuffer(String.fromCharCode(key))
      e.preventDefault()
      e.stopPropagation()
    } else {
      // console.log("key=" + e.key + " code=" + e.code + " ctrl=" +
      //   e.ctrlKey + " shift=" + e.shiftKey + " meta=" + e.metaKey);
    }
  };

  const handleKeyUp = (e: KeyboardEvent<HTMLTextAreaElement>|KeyboardEvent<HTMLCanvasElement>) => {
    if (e.key === 'Shift') {
      passAppleCommandKeyRelease(true)
    } else if (e.key === 'Alt') {
      passAppleCommandKeyRelease(false)
    } else if (e.key in arrowKeys) {
      handleArrowKey(arrowKeys[e.key], true)
    }
    if (keyHandled) {
      keyHandled = false
      e.preventDefault()
      e.stopPropagation()
    }
  }

  // To prevent flicker, wait until font is downloaded before rendering startup text.
  if (startupTextTimeout === 0) {
    const setStartTextAfterFontLoad = () => {
      if (document.fonts.check("12px PrintChar21")) {
        setStartTextPage()
        clearInterval(startupTextTimeout)
        startupTextTimeout = -1
      }
    }
    startupTextTimeout = window.setInterval(setStartTextAfterFontLoad, 50);
  }

  // This code only runs once when the component first renders
  useEffect(() => {
    let context: CanvasRenderingContext2D | null
    let hiddenContext: CanvasRenderingContext2D | null
    let animationFrameId = 0
    // let x = 0
    // let y = 0
    // const handleMouseMove = (event: MouseEvent) => {
    //   const scale = (xx: number, ww: number) => {
    //     // Scale the mouse "joystick" so the range covers most of the screen.
    //     xx = 3 * xx / ww - 1.5
    //     return Math.min(Math.max(xx, -1), 1)}
    //   if (props.myCanvas.current && context) {
    //     const rect = props.myCanvas.current.getBoundingClientRect();
    //     x = scale(event.clientX - rect.left, rect.width);
    //     y = scale(event.clientY - rect.top, rect.height);
    //   }
    // }
    if (props.myCanvas.current) {
      context = props.myCanvas.current.getContext('2d')
//      props.myCanvas.current.addEventListener('mousemove', handleMouseMove)
    }
    if (props.hiddenCanvas.current) {
      hiddenContext = props.hiddenCanvas.current.getContext('2d')
    }
    const handleResize = () => {
      if (context) {
        [width, height] = getSizes()
        context.canvas.width = width;
        context.canvas.height = height;
        updateDisplay()
      }
    }
    const paste = (e: any) => {pasteHandler(e as ClipboardEvent)}
    window.addEventListener("paste", paste)
    window.addEventListener("resize", handleResize)
    updateDisplay()

    // Check for new gamepads on a regular basis
//    const gamepadID = window.setInterval(() => {checkGamepad(x, y, props.useArrowKeysAsJoystick)}, 34)
    const gamepadID = window.setInterval(() => {checkGamepad()}, 34)
    const renderCanvas = () => {
      if (context && hiddenContext) {
        processDisplay(context, hiddenContext, props.colorMode, width, height)
      }
      animationFrameId = window.requestAnimationFrame(renderCanvas)
    }
    renderCanvas()

    // Return a cleanup function when component unmounts
    return () => {
      window.removeEventListener("paste", paste)
      window.cancelAnimationFrame(animationFrameId)
      window.clearInterval(gamepadID)
//      props.myCanvas.current?.removeEventListener('mousemove', handleMouseMove)
    }
  }, [props.myCanvas, props.hiddenCanvas, props.colorMode]);

  [width, height] = getSizes()

  // Make keyboard events work on touch devices by using a hidden textarea.
  const isTouchDevice = "ontouchstart" in document.documentElement
  const txt = isTouchDevice ?
      <textarea hidden={false} ref={myText}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
      /> : <span></span>

  return <span className="canvasText">
    <canvas ref={props.myCanvas}
      width={width} height={height}
      tabIndex={0}
      onKeyDown={isTouchDevice ? ()=>{} : handleKeyDown}
      onKeyUp={isTouchDevice ? ()=>{} : handleKeyUp}
      onMouseEnter={() => {
        myText.current?.focus()
      }}
      onMouseDown={() => {
        myText.current?.focus()
      }}
    />
    {/* Use hidden canvas/context so image rescaling works in iOS < 15.
        See graphics.ts drawImage() */}
    <canvas ref={props.hiddenCanvas}
      hidden={true}
      width={560} height={192} />
    {txt}
    </span>
};

export default Apple2Canvas;
