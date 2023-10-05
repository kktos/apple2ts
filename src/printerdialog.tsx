import React, { useEffect, useState, useRef } from "react"
import { Dialog, DialogContent } from "@mui/material"
import { Printer } from "./iwii"
import { imagewriter2 } from "./img/imagewriter2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFolderOpen,
  faPrint,
  faSave,
  faTrash,
  faXmark
} from "@fortawesome/free-solid-svg-icons";
export interface CopyCanvasProps {
  srcCanvas: HTMLCanvasElement
}

const CopyCanvas = (props: CopyCanvasProps) => {
  
  const { srcCanvas, ...rest } = props
  const canvasRef = useRef(null)
  // these dimensions represent a max dpi page
  let width = 1360
  let height = 1584
  
  useEffect(() => {
    let intervalId = 0
    
    const render = () => {
      if (canvasRef.current) {
        const destCanvas: HTMLCanvasElement = canvasRef.current
        const destContext: CanvasRenderingContext2D = destCanvas.getContext('2d')!
        // copy internal canvas over the other one
        if (destContext) {
            //copy the data, scale if necessary
            destContext?.drawImage(props.srcCanvas, 0, 0, width, height)
        } else {
          console.log("destinationCtx is NULL!")
        }
      } else {
        console.log("canvasRef.current is NULL!")
      }

      intervalId = window.requestAnimationFrame(render)
    }
    render()
    
    return () => {
      window.cancelAnimationFrame(intervalId)
    }
  }, [canvasRef, props.srcCanvas, height, width])
  
  return <canvas ref={canvasRef} {...rest}
          className="printerCanvas"
          style={{width:'100%', height:'100%'}}
          hidden={false}
          width={width} height={height} />
}

export interface PrinterDialogProps {
  open: boolean;
  onClose: () => void;
  canvas: HTMLCanvasElement
  printer: Printer;
}

const PrinterDialog = (props: PrinterDialogProps) => {
  const { open, onClose } = props;
  const [ state ] = useState({
    canvasRef: React.createRef<HTMLCanvasElement>()
  })

  const handleClose = () => {
    onClose()
  };

  const handlePrint = () => {
    props.printer.print()
  };

  const handleClear = () => {
    props.printer.reset()
  };

  const handleSaveData = () => {
    props.printer.save()
  };

  const handleReprint = () => {
    props.printer.reprint()
  };

  useEffect(() => {

    return () => {
    }
  }, [state.canvasRef, props.canvas]);

  return (
    <Dialog onClose={handleClose} open={open}>
      <div className="controlBar">
      <svg height="35" width="150">{imagewriter2}</svg>
        <div>
        <button className="pushButton darkgray"
          title="Save Stored Data"
          onClick={handleSaveData}>
          <FontAwesomeIcon icon={faSave}/>
        </button>
        <button className="pushButton darkgray"
          title="Reprint from Stored Data"
          onClick={handleReprint}>
          <FontAwesomeIcon icon={faFolderOpen}/>
        </button>
        <button className="pushButton darkgray"
          title="Send to Printer"
          onClick={handlePrint}>
          <FontAwesomeIcon icon={faPrint}/>
        </button>
        <button className="pushButton darkgray"
          title="Tear off Page and Reset"
          onClick={handleClear}>
          <FontAwesomeIcon icon={faTrash}/>
        </button>
        <button className="pushButton darkgray"
          title="Close Dialog"
          onClick={handleClose}>
          <FontAwesomeIcon icon={faXmark}/>
        </button>
        </div>
      </div>

        <DialogContent>
        <CopyCanvas srcCanvas={props.canvas} />
        </DialogContent>
    </Dialog>
  );
}

export default PrinterDialog