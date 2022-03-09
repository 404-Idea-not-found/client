import { all } from "redux-saga/effects";

import { sokcetFlow } from "../features/LiveMeeting/liveMeetingSagas";
import {
  watchLogInWithGoogle,
  watchVerify404Token,
} from "../features/login/loginSagas";
import {
  watchGetMyPageMeeting,
  watchCancelMeeting,
  watchCancelReservation,
} from "../features/MyPage/myPageSagas";
import { webRtcFlow } from "../features/video/videoSagas";

export default function* rootSaga() {
  yield all([
    watchLogInWithGoogle(),
    watchVerify404Token(),
    sokcetFlow(),
    webRtcFlow(),
    watchGetMyPageMeeting(),
    watchCancelMeeting(),
    watchCancelReservation(),
  ]);
}
