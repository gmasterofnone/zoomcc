import React, { Component, useState } from "react";
import axios from 'axios';
import logo from "./logo.svg";
import './App.css'

const TOKEN_LENGTH = 300;

const App = () => {
  const [captionData, setCaptionData] = useState('')

  const startClosedCaptionSession = async closedCaptionURL => {
    const meetingId = closedCaptionURL.match(/id=([^&]*)/)[1];
    setCaptionData(`Meeting ID: ${meetingId}`)

    const response = await axios.post('/start', {
      closedCaptionURL,
      meetingId
    });
  }

  const handleInput = e => {
    setCaptionData(e.target.value)
    e.target.value.length >= TOKEN_LENGTH
      ? startClosedCaptionSession(e.target.value)
      : null;
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
      </header>
      <form onSubmit={() => {}}>
        <input
          onChange={e => handleInput(e)}
          type="text"
          name="name"
          className="question"
          id="nme"
          required autoComplete="off"
          value={captionData}
        />
        <label htmlFor="nme"><span>{captionData ? 'Starting closed captioning for:' : 'Paste your 3rd party CC token here'}</span></label>
      </form>
    </div>
  )
};


// https://wmcc.zoom.us/closedcaption?id=7023278240&ns=R3JhaGFtIE11bnJvJ3MgUGVyc29uYWwgTWVldGlu&expire=86400&sparams=id%2Cns%2Cexpire&signature=agEzw8xLiZjfUAgAChJ85Knc0nUKizSgg5imC7kEq7g.EwEAAAF0fdKU5gABUYAYNWlZaEdjRVlCVWY4VjJOcWYyMVlGQT09QCtTcnpYUDI1Y215MG96b25QMVVzMlJUWnFBL2VvOGxBWDZnbnFSUmtOd3pWODVkNy9rcHZQN0FpNlo2UlBPSXo
export default App;