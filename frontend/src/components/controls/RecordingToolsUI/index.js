import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

import { appHost, product } from 'config';
import { apiFetch } from 'helpers/utils';

import { ShareWidget } from 'containers';

import Modal from 'components/Modal';
import { WandIcon } from 'components/icons';

import './style.scss';


class RecordingToolsUI extends PureComponent {
  static propTypes = {
    activeBrowser: PropTypes.string,
    auth: PropTypes.object,
    autoscroll: PropTypes.bool,
    history: PropTypes.object,
    inpageAutomation: PropTypes.bool,
    match: PropTypes.object,
    timestamp: PropTypes.string,
    toggleAutoscroll: PropTypes.func,
    toggleClipboard: PropTypes.func,
    toggleInpageAutomation: PropTypes.func,
    url: PropTypes.string
  };

  static contextTypes = {
    canAdmin: PropTypes.bool,
    currMode: PropTypes.string
  };

  constructor(props) {
    super(props);

    this.state = { clipboardOpen: false };
  }

  onPatch = () => {
    if (this.context.currMode === 'record') return;

    const { activeBrowser, match: { params: { coll } }, timestamp, url } = this.props;

    // data to create new recording
    const data = {
      url,
      coll,
      timestamp,
      mode: 'patch'
    };

    // add remote browser
    if (activeBrowser) {
      data.browser = activeBrowser;
    }
    // generate recording url
    apiFetch('/new', data, { method: 'POST' })
      .then(res => res.json())
      .then(({ url }) => { window.location.href = url.replace(appHost, ''); })
      .catch(err => console.log('error', err));
  }

  onRecord = () => {
    if (this.context.currMode === 'record') return;

    const { activeBrowser, match: { params: { coll } }, url } = this.props;
    const data = {
      url,
      coll,
      mode: 'record'
    };

    // add remote browser
    if (activeBrowser) {
      data.browser = activeBrowser;
    }
    // generate recording url
    apiFetch('/new', data, { method: 'POST' })
      .then(res => res.json())
      .then(({ url }) => { window.location.href = url.replace(appHost, ''); })
      .catch(err => console.log('error', err));
  }

  toggleAutoscroll = () => {
    this.props.toggleAutoscroll(!this.props.autoscroll);
  }

  startAuto = () => {
    apiFetch(`/browser/behavior/start/${this.props.reqId}`, {}, { method: 'POST' });
  }

  stopAuto = () => {
    apiFetch(`/browser/behavior/stop/${this.props.reqId}`, {}, { method: 'POST' });
  }

  openClipboard = () => this.props.toggleClipboard(true)

  closeClipboard = () => this.props.toggleClipboard(false)

  _open = () => this.setState({ clipboardOpen: true })

  _close = () => this.setState({ clipboardOpen: false })

  toggleInpageSidebar = () => {
    this.props.toggleInpageAutomation(!this.props.inpageAutomation);
  }

  render() {
    const { canAdmin, currMode } = this.context;
    const { activeBrowser, autoscroll } = this.props;

    const isNew = currMode === 'new';
    const isWrite = ['new', 'patch', 'record', 'extract'].includes(currMode);
    const modalFooter = <Button onClick={this._close}>Close</Button>;
    const newFeatures = canAdmin && ['admin', 'beta-archivist'].includes(this.props.auth.get('role'));

    return (
      <div className="recording-actions text-center hidden-xs">
        <Modal
          visible={this.state.clipboardOpen}
          header={<h4>Remote Browser Clipboard</h4>}
          closeCb={this._close}
          propsPass={{ onEntered: this.openClipboard, onExited: this.closeClipboard }}
          footer={modalFooter}>
          <p>Any text selected in the remote browser will appear below.</p>
          <p>You can also paste text here to send to remote browser.</p>
          <textarea id="clipboard" autoFocus style={{ width: '100%', minHeight: 200 }} />
        </Modal>

        {
          canAdmin && !isNew && activeBrowser &&
            <button
              type="button"
              className="rounded clipboard-btn"
              aria-label="Remote browser clipboard"
              onClick={this._open}>
              <span className="glyphicon glyphicon-paste" />
            </button>
        }

        {
          isWrite &&
            <button className="rounded autopilot-btn" onClick={this.toggleInpageSidebar} type="button"><WandIcon /> Autopilot Options</button>
        }

        {
          !isWrite && product !== 'player' &&
            <ShareWidget />
        }
      </div>
    );
  }
}

export default RecordingToolsUI;
