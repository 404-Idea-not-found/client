/* eslint-disable react/forbid-prop-types */
import PropTypes from "prop-types";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

import Modal from "../../common/components/Modal";
import { COLOR } from "../../common/util/constants";
import { selectUsername } from "../login/selectors";
import { createGetMeetingListAction } from "../sidebar/sidebarSagas";
import { createRtcCallEndAction } from "../video/videoSagas";
import {
  createDisconnectSocketAction,
  createEmitSocketEventAction,
} from "./liveMeetingSagas";
import {
  painterAllowed,
  painterRemoved,
  recruitRemoved,
} from "./liveMeetingSlice";
import {
  selectIsRecruit,
  selectIsWhiteboardAllowed,
  selectPainterList,
  selectRecruitList,
} from "./selectors";

const ControlPanelContainer = styled.div`
  display: flex;

  ul {
    margin-top: 0;
    height: 14vh;
    box-sizing: border-box;
    padding-top: 10px;
    width: 100%;
    overflow: auto;
    background-color: ${COLOR.LIGHTER_GREY};
  }

  .owner-control {
    box-sizing: border-box;
    width: 80%;
    font-weight: bold;
    display: flex;
    justify-content: center;
    margin: 2rem auto 0 auto;
  }

  .participant-control {
    width: 80%;
    font-weight: bold;
    display: flex;
    justify-content: center;
    margin: 2rem auto;
  }

  .paint-request-button {
    background-color: ${COLOR.LEMON};
  }

  .recruit-request-button {
    background-color: ${COLOR.BRIGHT_GREEN};
  }

  .close-meeting-button {
    font-size: 1.2rem;
    width: 30%;
    height: 30%;
    font-weight: bold;
    background-color: ${COLOR.SALMON};
    border: none;
    cursor: pointer;
    transition: all 0.3s;
    align-self: center;
  }

  .exit-button {
    background-color: ${COLOR.SALMON};
  }

  .list-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 0 0.3rem;
    width: 100%;
  }

  .control-title {
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 1.2rem;
    text-align: center;
    height: 20%;
    width: 100%;
  }

  .painter-control-title {
    background-color: ${COLOR.LEMON};
  }

  .recruit-control-title {
    background-color: ${COLOR.BRIGHT_GREEN};
  }

  .list-wrapper {
    margin-bottom: 0.5rem;
    display: flex;
    justify-content: space-around;
    align-items: center;
  }
`;

const AllowButton = styled.button`
  font-weight: bold;
  border: none;
  background-color: ${(props) =>
    props.isAllowed ? "red" : COLOR.BRIGHT_GREEN};
  cursor: pointer;
  transition: all 0.3s;
`;

const RequestButton = styled.button`
  display: block;
  margin: 0 0.3rem;
  width: 30%;
  height: 3rem;
  font-weight: bold;
  font-size: 1.2rem;
  border: none;
  cursor: ${(props) =>
    props.isWhiteBoardAllowed || props.isRecruit ? "auto" : "pointer"};
  transition: all 0.3s;
  animation: ${(props) =>
    props.isWhiteBoardAllowed || props.isRecruit
      ? "glow 0.5s linear alternate infinite"
      : "none"};
  box-shadow: ${(props) =>
    props.isWhiteBoardAllowed || props.isRecruit
      ? "4px 4px 5px black"
      : "none"};

  @keyframes glow {
    0% {
      opacity: 1;
    }
    100% {
      opacity: 0.3;
    }
  }
`;

function ControlPanel({ meetingId, isOwner }) {
  const username = useSelector(selectUsername);
  const painterList = useSelector(selectPainterList);
  const recruitList = useSelector(selectRecruitList);
  const isRecruit = useSelector(selectIsRecruit);
  const isWhiteBoardAllowed = useSelector(selectIsWhiteboardAllowed);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState("");
  const [modalCloseHandler, setModalCloseHandler] = useState(() => () => {});

  const navigate = useNavigate();
  const dispatch = useDispatch();

  async function handleCloseMeetingClick() {
    const modalClickHandler = () => {
      navigate("/main");
      dispatch(createDisconnectSocketAction());
      dispatch(createGetMeetingListAction(""));
    };
    const isRecruitExist = !!Object.entries(recruitList).length;

    if (!isRecruitExist) {
      setModalContent(
        <>
          <h2>동료 모집에 실패 했습니다 😥</h2>
          <p>다음기회를 노려봅시다...</p>
          <button type="button" onClick={modalClickHandler}>
            메인으로
          </button>
        </>
      );
    } else {
      setModalContent(
        <>
          <h2>동료 모집에 성공 했습니다 🥳</h2>
          <p>마이페이지에서 모집된 동료의 이메일을 확인할 수 있습니다. </p>
          <button type="button" onClick={modalClickHandler}>
            메인으로
          </button>
        </>
      );
    }
    dispatch(createRtcCallEndAction());
    setShowModal(true);
    setModalCloseHandler(() => () => modalClickHandler());
  }

  function handlePaintRequest() {
    dispatch(
      createEmitSocketEventAction("paintRequest", {
        meetingId,
        username: username || "stranger",
      })
    );
  }

  function handlePaintAllowClick(socketId) {
    dispatch(createEmitSocketEventAction("allowPainter", { socketId }));
    dispatch(painterAllowed(socketId));
  }

  function handlePaintDisallowClick(socketId) {
    dispatch(createEmitSocketEventAction("disallowPainter", { socketId }));
    dispatch(painterRemoved(socketId));
  }

  function handleRecruitRequestClick() {
    if (!username) {
      setModalContent(<div>로그인이 필요합니다!</div>);
      setModalCloseHandler(() => () => setShowModal(false));
      setShowModal(true);
      return;
    }

    dispatch(createEmitSocketEventAction("requestRecruitment", username));
  }

  function handleKickRecruitClick(socketId, userId) {
    dispatch(createEmitSocketEventAction("kickRecruit", { socketId, userId }));
    dispatch(recruitRemoved(socketId));
  }

  function handleExitClick() {
    navigate("/main");
  }

  return (
    <ControlPanelContainer>
      {showModal && (
        <Modal onModalClose={modalCloseHandler}>{modalContent}</Modal>
      )}
      {isOwner && (
        <div className="owner-control">
          <div className="painter-control list-container">
            <div className="control-title painter-control-title">
              그리는 사람
            </div>
            <ul className="painter-list">
              {Object.entries(painterList).map(([socketId, painter]) => (
                <div className="list-wrapper" key={socketId}>
                  <li>
                    <div>{painter.username}</div>
                  </li>
                  <AllowButton
                    type="button"
                    className="allow-button"
                    isAllowed={painter.allowed}
                    onClick={() => {
                      if (!painter.allowed) handlePaintAllowClick(socketId);
                      if (painter.allowed) handlePaintDisallowClick(socketId);
                    }}
                  >
                    {painter.allowed ? "그만 그려!" : "허락하기"}
                  </AllowButton>
                </div>
              ))}
            </ul>
          </div>
          <div className="recruit-control list-container">
            <div className="control-title recruit-control-title">모인 동료</div>
            <ul className="recruit-list">
              {Object.entries(recruitList).map(([socketId, recruit]) => (
                <div className="list-wrapper" key={socketId}>
                  <li>
                    <div>{recruit.username}</div>
                  </li>
                  <AllowButton
                    type="button"
                    className="allow-button"
                    isAllowed={recruit.allowed}
                    onClick={() => {
                      handleKickRecruitClick(socketId, recruit.userId);
                    }}
                  >
                    추방!
                  </AllowButton>
                </div>
              ))}
            </ul>
          </div>
          <button
            className="close-meeting-button"
            type="button"
            onClick={handleCloseMeetingClick}
          >
            미팅종료
          </button>
        </div>
      )}
      {!isOwner && (
        <div className="participant-control">
          <RequestButton
            className="paint-request-button"
            type="button"
            onClick={handlePaintRequest}
            isWhiteBoardAllowed={isWhiteBoardAllowed}
            disabled={isWhiteBoardAllowed}
          >
            {isWhiteBoardAllowed ? "그리는 중" : "그리고 싶어요"}
          </RequestButton>
          <RequestButton
            className="recruit-request-button"
            type="button"
            isRecruit={isRecruit}
            onClick={handleRecruitRequestClick}
          >
            {isRecruit ? "동료가 되었어요!" : "동료가 될게요"}
          </RequestButton>
          <RequestButton
            className="exit-button"
            type="button"
            onClick={handleExitClick}
          >
            나가기
          </RequestButton>
        </div>
      )}
    </ControlPanelContainer>
  );
}

ControlPanel.propTypes = {
  meetingId: PropTypes.string.isRequired,
  isOwner: PropTypes.bool.isRequired,
};

export default ControlPanel;
