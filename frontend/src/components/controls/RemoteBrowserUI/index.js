import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Alert } from 'react-bootstrap';
import CBrowser from 'shepherd-client/src/browser.js';

import WebSocketHandler from 'helpers/ws';
import { getStorage } from 'helpers/utils';

import { toggleAutopilot } from 'store/modules/automation';
import { createRemoteBrowser } from 'store/modules/remoteBrowsers';

import config from 'config';

import './style.scss';


class RemoteBrowserUI extends Component {

  static propTypes = {
    behavior: PropTypes.string,
    clipboard: PropTypes.bool,
    contentFrameUpdate: PropTypes.bool,
    creating: PropTypes.bool,
    currMode: PropTypes.string,
    dispatch: PropTypes.func,
    history: PropTypes.object,
    inactiveTime: PropTypes.number,
    params: PropTypes.object,
    rb: PropTypes.string,
    rec: PropTypes.string,
    reqId: PropTypes.string,
    sidebarResize: PropTypes.bool,
    timestamp: PropTypes.string,
    url: PropTypes.string
  }

  constructor(props) {
    super(props);

    if (props.currMode.startsWith('extract')) {
      const { archiveId, collId } = props.params;
      this.currMode = `${props.currMode}`;

      if (archiveId) {
        this.currMode = `${this.currMode}:${archiveId}`;
      }

      if (collId) {
        this.currMode = `${this.currMode}:${collId}`;
      }
    } else {
      this.currMode = props.currMode;
    }

    this.reloadHandle = null;
    this.expired = false;
    this.state = {
      countdownLabel: false,
      dismissCountdown: false,
      message: '',
      messageSet: false
    };

    this.pywbParams = {
      audio: "wait_for_click",
      static_prefix: '/static/',
      api_prefix: '/api/browsers',
      clipboard: '#clipboard',
      fill_window: true,
      on_countdown: this.onCountdown,
      on_event: this.onEvent,
      headers: { 'x-requested-with': 'XMLHttpRequest' },
      webrtc: true,
      webrtc_video: false,
      webrtcHostIP: config.publicIP,
    };
  }

  componentDidMount() {
    const { dispatch, params, rb, rec, timestamp, url } = this.props;

    if (!window.location.port) {
      this.pywbParams.proxy_ws = '_websockify?port=';
    }

    // TODO: Disable browser reuse for now
    // get any preexisting remote browsers from session storage,
    // checking whether they are stale. If so request a new one.
    const reqFromStorage = false; //this.getReqFromStorage(rb);

    // generate remote browser
    if (!reqFromStorage) {
      dispatch(createRemoteBrowser(rb, params.user, params.coll, rec, this.currMode, timestamp, url));
    } else {
      this.connectToRemoteBrowser(reqFromStorage.reqId, reqFromStorage.inactiveTime);
    }
  }

  componentDidUpdate(prevProps) {
    const {
      behavior, clipboard, dispatch, inactiveTime, contentFrameUpdate,
      params, rb, rec, reqId, timestamp, url
    } = this.props;

    // bidirectional clipboard
    if (clipboard !== prevProps.clipboard && this.cb) {
      if (!clipboard) {
        this.cb.destroy_clipboard();
      } else {
        this.cb.init_clipboard();
      }
    }

    // behavior check
    if (behavior !== prevProps.behavior && this.socket) {
      this.socket.doBehavior(url, behavior);
    }

    if (url !== prevProps.url && this.socket) {
      this.socket.setRemoteUrl(url);
    }

    if (reqId !== prevProps.reqId) {
      // new reqId for browser, initialize and save
      this.connectToRemoteBrowser(reqId, inactiveTime);

      // TODO: reuse remote browsers
      // let existingData;
      // try {
      //   existingData = JSON.parse(getStorage('reqId', window.sessionStorage) || '{}');
      // } catch (e) {
      //   existingData = {};
      // }
      // const data = JSON.stringify({
      //   ...existingData,
      //   [rb]: {
      //     reqId: nextProps.reqId,
      //     accessed: Date.now(),
      //     inactiveTime: nextProps.inactiveTime
      //   }
      // });
      // write to storage for later reuse
      //setStorage('reqId', data, window.sessionStorage);
    } else if (rb !== prevProps.rb || (!contentFrameUpdate && this.currMode.includes('replay') && (url !== prevProps.url || timestamp !== prevProps.timestamp))) {
      // TODO: Disable browser reuse for now
      //const reqFromStorage = this.getReqFromStorage(nextProps.rb);

      // close current connections
      this.closeCb();

      // generate remote browser
      dispatch(createRemoteBrowser(rb, params.user, params.coll, rec, this.currMode, timestamp, url));
    }
  }

  componentWillUnmount() {
    this.closeCb();

    clearTimeout(this.reloadHandle);
  }

  closeCb = () => {
    if (this.cb) {
      this.cb.close();
    }

    if (this.socket) {
      this.socket.close();
    }
  }

  onCountdown = (seconds, countdownText) => {
    if (seconds <= 300) {
      this.setState({
        countdownLabel: true,
        countdown: countdownText
      });
    }

    if (seconds <= 60 && this.state.dismissCountdown) {
      this.setState({ dismissCountdown: false });
    }

    if (seconds <= 0 && !this.expired && !document.hidden) {
      this.expired = true;
      this.onExpire();
    }
  }

  onEvent = (type, data) => {
    const { autopilotStatus, dispatch, rb, params, rec, timestamp, url } = this.props;

    if (autopilotStatus === 'running' && ['expire', 'fail', 'error'].includes(type)) {
      dispatch(toggleAutopilot(null, 'stopped', this.props.url));
    }

    if (type === 'connect') {
      this.setState({ message: '' });
    } else if (['fail', 'error'].includes(type)) {
      //deleteStorage('reqId', window.sessionStorage);

      if (!this.props.creating) {
        // close current connections
        this.closeCb();

        dispatch(createRemoteBrowser(rb, params.user, params.coll, rec, this.currMode, timestamp, url));
      }
    } else if (type === 'expire' && !this.expired) {
      this.expired = true;
      this.onExpire();
    }
  }

  getReqFromStorage = (rb) => {
    /* Returns a browser info object if it exists in storage and hasn't expired,
       otherwise `null`.
     */
    let reqFromStorage;
    try {
      reqFromStorage = JSON.parse(getStorage('reqId', window.sessionStorage) || '{}');
    } catch (e) {
      console.log('error loading from storage', e);
      reqFromStorage = {};
    }

    return reqFromStorage[rb] && (Date.now() - reqFromStorage[rb].accessed) / 1000 < reqFromStorage[rb].inactiveTime ? reqFromStorage[rb] : null;
  }

  connectToRemoteBrowser = (reqId, inactiveTime) => {
    /* Connect to the initialized remote browser session and open the websocket
    */
    const { currMode, dispatch, params } = this.props;

    this.pywbParams.inactiveSecs = inactiveTime;

    // set up socket
    this.socket = new WebSocketHandler(params, currMode, dispatch, true, reqId, '');

    this.expired = false;

    // connect to rb
    // TODO: Make sure this is being destroyed properly
    this.cb = new CBrowser(reqId, '#browser', this.pywbParams);
  }

  onExpire = () => {
    const { currMode, params: { user, coll, rec }, rb, timestamp, url } = this.props;
    let message;

    if (!currMode.includes('replay')) {
      if (this.state.messageSet) {
        return;
      }

      const collUrl = `/${user}/${coll}/`;
      message = (
        `Sorry, the remote browser recording session has expired.<br />
         You can <a href="${collUrl}index?query=session:${rec}">view the recording</a> or <a href="${collUrl}$new">create a new recording</a>`
      );

      this.setState({
        message,
        messageSet: true
      });

      return;
    }

    message = 'The remote browser session has expired, requesting a new browser...';
    this.setState({
      message
    });

    if (!this.props.creating) {
      this.reloadHandle = setTimeout(() => {
        // close current connections
        this.closeCb();

        this.props.dispatch(createRemoteBrowser(rb, user, coll, rec, this.currMode, timestamp, url));
      }, 5000);
    }
  }

  hideCountdown = () => this.setState({ dismissCountdown: true })

  render() {
    const { sidebarResize } = this.props;
    const { countdown, countdownLabel, dismissCountdown, message } = this.state;

    return (
      <React.Fragment>
        {
          message &&
            <Alert className="rb-message">
              <div dangerouslySetInnerHTML={{ __html: message }} />
            </Alert>
        }
        {
          !message && countdownLabel && !dismissCountdown &&
            <Alert variant="warning" className="rb-countdown" onDismiss={this.hideCountdown}>
              Browser Time Left: <b>{countdown}</b>
            </Alert>
        }
        {/*<div id="message" key="msg" className="browser" />*/}
        <div id="browser" key="browser" className="browser" style={sidebarResize ? { pointerEvents: 'none' } : {}} />
        <div id="noVNC_mouse_capture_elem" />
      </React.Fragment>
    );
  }
}

export default RemoteBrowserUI;
