import { createSlice } from "@reduxjs/toolkit";

export const sidebarSlice = createSlice({
  name: "sidebar",
  initialState: {
    query: "",
    lastId: null,
  },
  reducers: {
    textSubmitted: (state, action) => {
      state.query = action.payload.enteredText;
      state.lastId = action.payload.lastId;
    },
    sidebarRefreshed: (state) => {
      state.query += " ";
      state.lastId = null;
    },
    lastIdChanged: (state, action) => {
      state.lastId = action.payload.lastId;
    },
    sidebarReset: (state) => {
      state.query = "";
      state.lastId = null;
    },
  },
});

export const { textSubmitted, sidebarRefreshed, lastIdChanged, sidebarReset } =
  sidebarSlice.actions;

export default sidebarSlice.reducer;
