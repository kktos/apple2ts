import { KeyboardEvent } from "react";
import "./debugpanel.css"
import { handleGetNextInstruction,
  handleGetState,
  passSetDisassembleAddress, passStepInto, passStepOut, passStepOver } from "../main2worker";
import bpStepOver from './img/bpStepOver.svg';
import bpStepInto from './img/bpStepInto.svg';
import bpStepOut from './img/bpStepOut.svg';
import bpStepStmt from './img/bpStepStmt.svg';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPause,
  faPlay,
} from "@fortawesome/free-solid-svg-icons";
import React from "react";
import { STATE } from "../emulator/utility/utility";
import { handleSetCPUState } from "../controller";

class DisassemblyControls extends React.Component<object, { address: string; }>
{
  // The tooltips obscure the first line of disassembly.
  // Only show them until each button has been clicked once.
  tooltipStepOverShow = true
  tooltipStepIntoShow = true
  tooltipStepOutShow = true

  constructor(props: {setCPUState: (state: STATE) => void}) {
    super(props);
    this.state = {
      address: '',
    };
  }

  handleDisassembleAddrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newvalue = e.target.value.replace(/[^0-9a-f]/gi, '').toUpperCase().substring(0, 4)
    this.setState({address: newvalue});
  }

  handleDisassembleAddrKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const addr = parseInt(this.state.address || '0', 16)
      passSetDisassembleAddress(addr)
      this.setState({address: addr.toString(16).toUpperCase()})
    }
  }

  render() {
    const machineState = handleGetState()
    const isJSR = handleGetNextInstruction() === 'JSR'
    return (
      <span className="flexRow">
        <input className="address"
          type="text"
          placeholder=""
          value={this.state.address}
          onChange={this.handleDisassembleAddrChange}
          onKeyDown={this.handleDisassembleAddrKeyDown}
        />
        <button className="pushButton"
          title={machineState === STATE.PAUSED ? "Resume" : "Pause"}
          onClick={() => {
            handleSetCPUState(machineState === STATE.PAUSED ?
              STATE.RUNNING : STATE.PAUSED)
          }}
          disabled={machineState === STATE.IDLE}>
          {machineState === STATE.PAUSED ?
          <FontAwesomeIcon icon={faPlay}/> :
          <FontAwesomeIcon icon={faPause}/>}
        </button>
        <button className="pushButton"
          title={this.tooltipStepOverShow ? (isJSR ? "Step Over" : " Step") : ""}
          onClick={() => {this.tooltipStepOverShow = false; passStepOver()}}
          disabled={machineState !== STATE.PAUSED}>
          <img src={isJSR ? bpStepOver : bpStepStmt} alt="Step Over" width={23} height={23}/>
        </button>
        <button className="pushButton"
          title={this.tooltipStepIntoShow ? "Step Into" : ""}
          onClick={() => {this.tooltipStepIntoShow = false; passStepInto()}}
          disabled={machineState !== STATE.PAUSED || !isJSR}>
          <img src={bpStepInto} alt="Step Into" width={23} height={23}/>
        </button>
        <button className="pushButton"
          title={this.tooltipStepOutShow ? "Step Out" : ""}
          onClick={() => {this.tooltipStepOutShow = false; passStepOut()}}
          disabled={machineState !== STATE.PAUSED}>
          <img src={bpStepOut} alt="Step Out" width={23} height={23}/>
        </button>
      </span>
    )
  }
}

export default DisassemblyControls;