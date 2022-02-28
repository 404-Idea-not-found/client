import axios from "axios";
import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import store from "./app/store";
import GlobalStyle from "./common/components/GlobalStyle";
import "./common/config/firebase";
import Landing from "./features/landing/Landing";
import { loginSagaActionCreators } from "./features/login/loginSagas";

axios.defaults.baseURL = process.env.REACT_APP_SERVER_URL;
store.dispatch(loginSagaActionCreators.verified404Token());

ReactDOM.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <GlobalStyle />
        <Routes>
          <Route path="/" element={<Landing />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
  document.getElementById("root")
);
