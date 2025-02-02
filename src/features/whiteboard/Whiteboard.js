/* eslint-disable jsx-a11y/mouse-events-have-key-events */
import PropTypes from "prop-types";
import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import styled from "styled-components";

import { COLOR } from "../../common/util/constants";
import debounce from "../../common/util/debounce";
import throttle from "../../common/util/throttle";
import {
  createAttachSocketEventListenerAction,
  createEmitSocketEventAction,
  createRemoveSocketEventListenerAction,
} from "../liveMeeting/liveMeetingSagas";
import { selectIsWhiteboardAllowed } from "../liveMeeting/selectors";
import Video from "../video/Video";

const StyledCanvas = styled.canvas`
  margin: 0 auto;
  display: block;
  background-color: ${COLOR.LIGHT_GREY};
  pointer-events: ${(props) => (props.isWhiteboardAllowed ? "auto" : "none")};
`;

const CanvasContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: ${(props) => (props.isWhiteboardAllowed ? "default" : "not-allowed")};

  .button-container {
    display: flex;
    align-items: center;
  }

  button {
    border: none;
    display: block;
    width: 2rem;
    height: 2rem;
    margin: 0.5rem;
    background-color: black;
    cursor: pointer;
  }

  .erase-button {
    width: fit-content;
    display: block;
    background-color: white;
    border: 1px solid black;
  }

  .color-select-red {
    background-color: red;
  }

  .color-select-blue {
    background-color: blue;
  }

  .color-select-yellow {
    background-color: yellow;
  }

  .wrapper {
    position: relative;
  }
`;

function Whiteboard({ isOwner }) {
  const canvasRef = useRef();
  const drawingRef = useRef(false);
  const colorRef = useRef("black");
  const contextRef = useRef();
  const canvasPositionRef = useRef({});
  const xyRef = useRef({});

  const dispatch = useDispatch();
  const { meetingId } = useParams();
  const isWhiteboardAllowed = useSelector(selectIsWhiteboardAllowed);

  useEffect(() => {
    contextRef.current = canvasRef.current.getContext("2d");

    setTimeout(() => {
      const { top, left } = canvasRef.current.getBoundingClientRect();

      canvasPositionRef.current.top = top;
      canvasPositionRef.current.left = left;

      dispatch(
        createAttachSocketEventListenerAction("drawing", handleDrawingEvent)
      );
      dispatch(
        createAttachSocketEventListenerAction("clearCanvas", clearCanvas)
      );

      if (isOwner) {
        dispatch(
          createAttachSocketEventListenerAction(
            "getOwnersCanvas",
            sendOwnersCanvas
          )
        );
      }

      if (!isOwner) {
        dispatch(
          createAttachSocketEventListenerAction(
            "sendOwnersCanvas",
            replicateOwnersCanvas
          )
        );

        dispatch(createEmitSocketEventAction("getOwnersCanvas"));
      }
    }, 2000);

    const debouncedResizeHandler = debounce(handleCanvasPostitionChange, 150);

    window.addEventListener("resize", debouncedResizeHandler);
    document.body.addEventListener("scroll", debouncedResizeHandler, true);

    return () => {
      window.removeEventListener("resize", debouncedResizeHandler);
      document.body.removeEventListener("scroll", debouncedResizeHandler, true);
      dispatch(createRemoveSocketEventListenerAction("drawing"));
      dispatch(createRemoveSocketEventListenerAction("clearCanvas"));

      if (isOwner) {
        dispatch(createRemoveSocketEventListenerAction("sendOwnersCanvas"));
      }

      if (!isOwner) {
        dispatch(createRemoveSocketEventListenerAction("getOwnersCanvas"));
      }
    };
  }, []);

  function handleMouseDown(event) {
    drawingRef.current = true;
    xyRef.current.x = event.clientX;
    xyRef.current.y = event.clientY;
  }

  function handleMouseUp(event) {
    if (!drawingRef.current) {
      return;
    }
    drawingRef.current = false;
    drawLine(
      xyRef.current.x,
      xyRef.current.y,
      event.clientX,
      event.clientY,
      colorRef.current,
      true
    );
  }

  function handleMouseMove(event) {
    if (!drawingRef.current) {
      return;
    }
    drawLine(
      xyRef.current.x,
      xyRef.current.y,
      event[0].clientX,
      event[0].clientY,
      colorRef.current,
      true
    );
    xyRef.current.x = event[0].clientX;
    xyRef.current.y = event[0].clientY;
  }

  function drawLine(x0, y0, x1, y1, color, emit) {
    const w = canvasRef.current.width;
    const h = canvasRef.current.height;
    const { top, left } = canvasPositionRef.current;

    contextRef.current.beginPath();
    contextRef.current.moveTo(x0 - left, y0 - top);
    contextRef.current.lineTo(x1 - left, y1 - top);
    contextRef.current.strokeStyle = color;
    contextRef.current.lineWidth = 2;
    contextRef.current.stroke();
    contextRef.current.closePath();

    if (!emit) {
      return;
    }

    const pathData = {
      x0: (x0 - left) / w,
      y0: (y0 - top) / h,
      x1: (x1 - left) / w,
      y1: (y1 - top) / h,
      color,
    };

    dispatch(
      createEmitSocketEventAction("drawing", { pathData, room: meetingId })
    );
  }

  function handleDrawingEvent(pathData) {
    const w = canvasRef.current.width;
    const h = canvasRef.current.height;
    const { top, left } = canvasPositionRef.current;

    drawLine(
      pathData.x0 * w + left,
      pathData.y0 * h + top,
      pathData.x1 * w + left,
      pathData.y1 * h + top,
      pathData.color,
      pathData.lineWidth
    );
  }

  function clearCanvas() {
    contextRef.current.clearRect(
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );
  }

  function handleClearCanvasEvent() {
    clearCanvas();
    dispatch(createEmitSocketEventAction("clearCanvas", { room: meetingId }));
  }

  function handleCanvasPostitionChange() {
    if (canvasRef.current) {
      const { top, left } = canvasRef.current.getBoundingClientRect();
      canvasPositionRef.current.top = top;
      canvasPositionRef.current.left = left;
    }
  }

  function sendOwnersCanvas({ requestorSocketId }) {
    dispatch(
      createEmitSocketEventAction("sendOwnersCanvas", {
        ownersCanvas: canvasRef.current.toDataURL(),
        requestorSocketId,
      })
    );
  }

  function replicateOwnersCanvas({ ownersCanvas }) {
    const img = new Image();
    img.onload = start;
    img.src = ownersCanvas;
    function start() {
      contextRef.current.drawImage(
        img,
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );
    }
  }

  return (
    <CanvasContainer isWhiteboardAllowed={isWhiteboardAllowed}>
      <div className="button-container">
        {isOwner && (
          <button
            className="erase-button"
            type="button"
            onClick={handleClearCanvasEvent}
          >
            지우기
          </button>
        )}
        <button
          className="color-select-black"
          type="button"
          onClick={() => {
            colorRef.current = "black";
          }}
        />
        <button
          className="color-select-red"
          type="button"
          onClick={() => {
            colorRef.current = "red";
          }}
        />
        <button
          className="color-select-blue"
          type="button"
          onClick={() => {
            colorRef.current = "blue";
          }}
        />
        <button
          className="color-select-yellow"
          type="button"
          onClick={() => {
            colorRef.current = "yellow";
          }}
        />
      </div>
      <div className="wrapper">
        <Video isOwner={isOwner} meetingId={meetingId} />
        <StyledCanvas
          data-testid="canvas"
          ref={canvasRef}
          width={window.innerWidth * 0.55}
          height={window.innerHeight * 0.6}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={throttle(handleMouseMove, 10)}
          onMouseOut={handleMouseUp}
          isWhiteboardAllowed={isWhiteboardAllowed}
        />
      </div>
    </CanvasContainer>
  );
}

Whiteboard.propTypes = {
  isOwner: PropTypes.bool.isRequired,
};

export default Whiteboard;
