/* eslint-disable consistent-return */
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";

import ErrorMessage from "../../common/components/ErrorMessage";
import Loader from "../../common/components/Loader";
import Modal from "../../common/components/Modal";
import { COLOR } from "../../common/util/constants";
import Chat from "../chat/Chatroom";
import { selectUserId } from "../login/selectors";
import { createGetMeetingListAction } from "../sidebar/sidebarSagas";
import { createRtcCallEndAction } from "../video/videoSagas";
import Whiteboard from "../whiteboard/Whiteboard";
import ControlPanel from "./ControlPanel";
import {
  createConnectSocketAction,
  createDisconnectSocketAction,
  createGetMeetingAction,
} from "./liveMeetingSagas";
import { meetingReset } from "./liveMeetingSlice";
import {
  selectError,
  selectIsFetchingMeeting,
  selectIsLoading,
  selectMeeting,
  selectOwnerDisconnectedDuringMeeting,
} from "./selectors";

const LiveMeetingContainer = styled.div`
  height: calc(100vh - 3.5rem);
  display: flex;
  width: fit-content;
  flex-direction: column;
  justify-content: center;
  background-color: white;
  margin: 0 auto;
  padding: 0 1rem;

  .whiteboard-chat-wrapper {
    display: flex;
    width: fit-content;
    align-items: center;
    justify-content: center;
  }
`;

const AccessDeniedCard = styled.div`
  height: calc(100vh - 1rem - 21px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: white;

  h1 {
    font-size: 5rem;

    @media (max-width: 1440px) {
      font-size: 4rem;
    }
  }

  p {
    display: flex;
    flex-direction: column;
    justify-content: center;
    font-weight: bold;
    font-size: 2rem;

    @media (max-width: 1440px) {
      font-size: 1.4rem;
    }
  }

  a {
    color: black;
    display: block;
    background-color: ${COLOR.LEMON};
    text-decoration: none;
    font-size: 3rem;
    font-weight: bold;
    padding: 1rem;
    transition: all 0.4s;
  }

  a:hover {
    opacity: 0.3;
  }

  .end-meeting-access {
    color: red;
  }

  .meeting-start-button {
    border: none;
    border-radius: 7px;
    background-color: ${COLOR.BRIGHT_GREEN};
    font-size: 3rem;
    font-weight: bold;
    padding: 1rem;

    @media (max-width: 1440px) {
      font-size: 2.5rem;
    }
  }

  .existing-start-time-outer-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-size: 2rem;
    font-weight: bold;
  }

  .existing-start-time-inner-wrapper {
    display: flex;
  }

  .existing-start-time {
    background-color: ${COLOR.BRIGHT_GREEN};
  }

  .existing-start-time-warning {
    font-size: 1rem;
    color: red;
  }
`;

function LiveMeeting() {
  const userId = useSelector(selectUserId);
  const error = useSelector(selectError);
  const isSocketConnected = useSelector(selectIsLoading);
  const ownerDisconnectedDuringMeeting = useSelector(
    selectOwnerDisconnectedDuringMeeting
  );
  const meeting = useSelector(selectMeeting);
  const isFetchingMeeting = useSelector(selectIsFetchingMeeting);
  const [didOwnerStartedMeeting, setDidOwnerStartedMeeting] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { meetingId } = useParams();

  const isOwner = meeting?.owner === userId;
  const isMeetingWaitingOwner =
    new Date() - new Date(meeting.startTime) > 0 && !meeting.isLive;

  useEffect(() => {
    dispatch(createGetMeetingAction(meetingId));
  }, [meetingId, dispatch]);

  useEffect(() => {
    if (!isOwner && meeting.isLive && !meeting.isEnd) {
      dispatch(
        createConnectSocketAction(meetingId, isOwner, meeting.chatList, userId)
      );

      return () => {
        dispatch(createDisconnectSocketAction());
        dispatch(createGetMeetingListAction(""));
      };
    }
  }, [meetingId, isOwner, meeting.isLive, meeting.isEnd, dispatch, userId]);

  useEffect(() => {
    if (isOwner && didOwnerStartedMeeting) {
      dispatch(
        createConnectSocketAction(meetingId, isOwner, meeting.chatList, userId)
      );

      return () => {
        setDidOwnerStartedMeeting(false);
        dispatch(createDisconnectSocketAction());
        dispatch(createGetMeetingListAction(""));
      };
    }
  }, [
    meetingId,
    isOwner,
    meeting.isLive,
    didOwnerStartedMeeting,
    meeting.isEnd,
    dispatch,
    userId,
  ]);

  useEffect(
    () => () => {
      dispatch(meetingReset());
    },
    []
  );

  if (!isOwner && ownerDisconnectedDuringMeeting) {
    return (
      <Modal
        onModalClose={() => {
          dispatch(createRtcCallEndAction());
          navigate("/main");
        }}
      >
        <h1>주최자의 연결이 끊겼습니다!</h1>
        <p>미팅을 종료합니다...</p>
      </Modal>
    );
  }

  if (isOwner && meeting.isLive && !error.isError) {
    return (
      <Modal
        onModalClose={() => {
          dispatch(createRtcCallEndAction());
          navigate("/main");
        }}
      >
        <h1>이미 접속중인 인스턴스가 존재합니다!</h1>
        <p>⛔️이미 주최자 님이 미팅을 시작한 창이 존재하는거 같은데요?⛔️</p>
        <p>기존의 창을 이용해주세요!</p>
      </Modal>
    );
  }

  if (
    !isFetchingMeeting &&
    !meeting.isLive &&
    !meeting.isEnd &&
    isOwner &&
    !didOwnerStartedMeeting &&
    !error.isError
  ) {
    return (
      <AccessDeniedCard>
        <h1>미팅을 시작해 주세요!</h1>
        <div className="existing-start-time-outer-wrapper">
          <div className="existing-start-time-inner-wrapper">
            설정해둔 미팅시작시간:
            <span className="existing-start-time">
              {dayjs(meeting.startTime).format("YYYY-MM-DD HH:mm:ss")}
            </span>
          </div>
          {!isMeetingWaitingOwner && (
            <div className="existing-start-time-warning">
              (아직 기존에 설정한 미팅시간이 되지 않았습니다. 그래도 주최자니까
              미리 시작하실수는 있어요!)
            </div>
          )}
        </div>
        <p>미팅을 시작하시겠습니까?</p>
        <p>미팅을 시작해주셔야 다른 참여자가 입장할 수 있습니다.</p>
        <button
          className="meeting-start-button"
          type="button"
          onClick={() => {
            setDidOwnerStartedMeeting(true);
          }}
        >
          미팅시작
        </button>
      </AccessDeniedCard>
    );
  }

  if (
    !isFetchingMeeting &&
    !meeting.isLive &&
    !meeting.isEnd &&
    !isOwner &&
    !error.isError
  ) {
    return (
      <AccessDeniedCard>
        <h1>Please Wait...</h1>
        <p>아직 주최자가 미팅을 시작하지 않았습니다.</p>
        <p>잠시후 새로고침 해보세요!</p>
        <Link reloadDocument={true} to={`/main/meeting/live/${meetingId}`}>
          새로고침
        </Link>
      </AccessDeniedCard>
    );
  }

  if (!isFetchingMeeting && meeting.isEnd && !error.isError) {
    return (
      <AccessDeniedCard>
        <h1>이미 종료된 미팅입니다!</h1>
      </AccessDeniedCard>
    );
  }

  return (
    <LiveMeetingContainer>
      {(didOwnerStartedMeeting || meeting.isLive) && (
        <div className="whiteboard-chat-wrapper">
          <Whiteboard isOwner={isOwner} />
          <Chat />
        </div>
      )}
      {(isSocketConnected || isFetchingMeeting || error.isError) && (
        <Loader spinnerWidth="200px" containerHeight="90%" />
      )}
      {!isSocketConnected && !isFetchingMeeting && !error.isError && (
        <ControlPanel
          isOwner={isOwner}
          ownerId={meeting.owner}
          meetingId={meetingId}
        />
      )}
      {error.isError && <ErrorMessage errorMessage={error.errorMessage} />}
    </LiveMeetingContainer>
  );
}

export default LiveMeeting;
