/* eslint-disable consistent-return */
import PropTypes from "prop-types";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

import Loader from "../../common/components/Loader";
import Modal from "../../common/components/Modal";
import {
  createAttachSocketEventListenerAction,
  createDisconnectSocketAction,
  createRemoveSocketEventListenerAction,
} from "../LiveMeeting/liveMeetingSagas";
import { selectIsLoading } from "../LiveMeeting/selectors";
import { sidebarRefreshed } from "../sidebar/SidebarSlice";
import { selectError, selectIsVideoLoaded } from "./setectors";
import {
  createGetUserMediaAction,
  createRtcCallEndAction,
  createRtcSignalReceivedAction,
} from "./videoSagas";
import { videoReset } from "./videoSlice";

const StyledVideo = styled.video`
  background-color: white;
  width: 250px;
  height: 250px;
`;

const VideoContainer = styled.div`
  position: absolute;
  border: 1px solid black;
  background-color: white;
  width: 250px;
  height: 250px;

  .loader-container {
    display: flex;
    align-items: center;
    width: 250px;
    height: 250px;
    position: absolute;
    font-size: 2rem;
    font-weight: bold;
  }
`;

function Video({ isOwner }) {
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState("");

  const isSocketLoading = useSelector(selectIsLoading);
  const isVideoLoaded = useSelector(selectIsVideoLoaded);
  const error = useSelector(selectError);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userVideoRef = useRef();

  useEffect(() => {
    dispatch(sidebarRefreshed());
  }, []);

  useEffect(
    () => () => {
      dispatch(createRtcCallEndAction());
    },
    []
  );

  useEffect(() => {
    if (!isSocketLoading && isOwner) {
      dispatch(
        createAttachSocketEventListenerAction(
          "requestVideo",
          ({ from, callerSignal }) => {
            dispatch(createRtcSignalReceivedAction(from, callerSignal));
          }
        )
      );

      return () => {
        dispatch(createRemoveSocketEventListenerAction("requestVideo"));
      };
    }
  }, [dispatch, isSocketLoading]);

  useEffect(() => {
    if (!isSocketLoading) {
      dispatch(createGetUserMediaAction(isOwner, userVideoRef, dispatch));
    }
  }, [dispatch, isOwner, isSocketLoading]);

  useEffect(() => {
    if (error.isError) {
      setShowModal(true);
      setModalContent(
        <>
          <h2>알수없는 에러발생 🤪</h2>
          <p>아래의 메세지를 참조 해주세요</p>
          <p>{error.errorMessage}</p>
          <button type="button" onClick={modalCloseHandler}>
            메인으로
          </button>
        </>
      );
    }
  }, [error.isError]);

  function modalCloseHandler() {
    navigate("/main");
    dispatch(createRtcCallEndAction());
    dispatch(createDisconnectSocketAction());
    dispatch(sidebarRefreshed());
    dispatch(videoReset());
  }

  return (
    <VideoContainer>
      {showModal && (
        <Modal onModalClose={modalCloseHandler}>{modalContent}</Modal>
      )}
      {!isVideoLoaded && (
        <div className="loader-container">
          <Loader />
        </div>
      )}
      <StyledVideo playsInline autoPlay muted ref={userVideoRef} />
    </VideoContainer>
  );
}

Video.propTypes = {
  isOwner: PropTypes.bool.isRequired,
};

export default Video;
