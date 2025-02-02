import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Button } from 'react-bootstrap';

import { autopilot as autopilotFields } from 'helpers/userMessaging';

import { CheckIcon, LoaderIcon, WandIcon } from 'components/icons';

import './style.scss';


class AutopilotUI extends Component {
  static propTypes = {
    autopilot: PropTypes.bool,
    activeBrowser: PropTypes.string,
    autopilotInfo: PropTypes.object,
    autopilotReady: PropTypes.bool,
    autopilotReset: PropTypes.func,
    autopilotUrl: PropTypes.string,
    behavior: PropTypes.string,
    behaviorMessages: PropTypes.object,
    behaviorStats: PropTypes.object,
    browsers: PropTypes.object,
    checkAvailability: PropTypes.func,
    open: PropTypes.bool,
    status: PropTypes.string,
    toggleAutopilot: PropTypes.func,
    toggleSidebar: PropTypes.func,
    url: PropTypes.string,
    urlMethod: PropTypes.string
  };

  constructor(props) {
    super(props);

    this.props.checkAvailability(this.props.url);

    this.state = {
      behavior: 'autoScrollBehavior',
      unsupported: false
    };
  }

  componentDidMount() {
    const { activeBrowser, browsers } = this.props;

    // reset status if complete
    if (this.props.status === 'complete' && this.props.url !== this.props.autopilotUrl) {
      this.props.autopilotReset();
    }

    if (
      (activeBrowser && !browsers.getIn([activeBrowser, 'caps']).includes('autopilot')) ||
      typeof Symbol.asyncIterator === 'undefined'
    ) {
      this.setState({ unsupported: true });
    }
  }

  componentDidUpdate(lastProps) {
    const { autopilotInfo } = this.props;
    if ((this.props.url !== lastProps.url) || this.props.activeBrowser !== lastProps.activeBrowser) {

      // if navigation always reset
      if (this.props.urlMethod == 'navigation') {
        this.props.autopilotReset();
        this.props.checkAvailability(this.props.url);
      } else if (this.props.status === 'new') {
      // if history change, update if 'new', otherwise do nothing
        this.props.checkAvailability(this.props.url);
      }
    }
  }

  componentWillUnmount() {
    this.props.autopilotReset();
  }

  handleInput = (evt) => {
    if (this.props.status === 'new') {
      this.setState({ behavior: evt.target.value });
    }
  }

  selectMode = (mode) => {
    if (this.props.status === 'new') {
      this.setState({ behavior: mode });
    }
  }

  toggleAutomation = () => {
    const { behavior } = this.state;
    const { toggleAutopilot, status, url } = this.props;

    if (behavior && ['new', 'running'].includes(status)) {
      toggleAutopilot(...(status === 'running' ? [null, 'stopping', url] : [behavior, 'running', url]));
    }
  }

  toggle = () => {
    this.props.toggleSidebar(!this.props.open);
  }

  render() {
    const { autopilot, autopilotInfo, autopilotReady, behaviorMessages, behaviorStats, status } = this.props;
    const behaviors = autopilotInfo;

    // only render if sidebar is open
    if (!autopilot) {
      return null;
    }

    const isRunning = status === 'running';
    const isComplete = status === 'complete';
    const isStopping = status === 'stopping';
    const isStopped = status === 'stopped';

    const keyDomain = autopilotFields[this.state.behavior];

    let buttonText;
    switch (status) {
      case 'new':
        buttonText = 'Start Autopilot';
        break;
      case 'running':
        buttonText = 'End Autopilot';
        break;
      case 'stopping':
        buttonText = 'Wait while behavior is stopping...';
        break;
      case 'stopped':
        buttonText = 'Autopilot Ended';
        break;
      case 'complete':
        buttonText = 'Autopilot Finished';
        break;
      default:
        buttonText = 'Start Autopilot';
    }

    return (
      <div className="autopilot-sidebar">
        <h4><WandIcon /> Autopilot</h4>
        {
          this.state.unsupported ?
            <React.Fragment>
              <h4>Not Supported for this Browser</h4>
              <p>To use autopilot, please select a different browser from the dropdown above. Only browsers with "autopilot" listed under capabilities support autopilot.</p>
            </React.Fragment> :
            <React.Fragment>
              <ul className={classNames('behaviors', { active: isRunning })}>
                {
                  behaviors && behaviors.valueSeq().map((behavior) => {
                    const name = behavior.get('name');
                    const dt = new Date(behavior.get('updated'));
                    const functional = behavior.get('functional');
                    return (
                      <li className={classNames({ disabled: !functional })} onClick={functional && this.selectMode.bind(this, name)} key={behavior.get('name')}>
                        <input type="radio" name="behavior" value={name} disabled={isRunning || isComplete || !functional} aria-labelledby="opt1" onChange={this.handleInput} checked={this.state.behavior === name} />
                        <div className="desc">
                          <h4>{behavior.get('displayName') || behavior.get('name')}</h4>
                          <div className="last-modified">
                            <em>{`Updated: ${dt.toLocaleDateString()} ${dt.toLocaleTimeString()}`}</em>
                          </div>
                          <p>
                            {behavior.get('description')}
                          </p>
                          {
                            !functional &&
                              <div className="note">This behavior is not currently supported. <a href="https://guide.webrecorder.io/#supported-behavior" target="_blank">Learn more</a></div>
                          }
                        </div>
                      </li>
                    );
                  })
                }
              </ul>

              {
                behaviorMessages.size > 0 &&
                  <ul className="behavior-log">
                    {
                      behaviorMessages.reverse().slice(0, 10).map(obj => <li>{obj.get('msg')}</li>)
                    }
                  </ul>
              }

              {
                !behaviorStats.isEmpty() && keyDomain &&
                  <div className="behaviorInfo">
                    <h4>Auto Captured Content:</h4>
                    <ul className="behaviorStats">
                      {
                        behaviorStats.entrySeq().map(([k, v]) => {
                          if (k in keyDomain) {
                            return <li key={k}>{`${keyDomain[k]}: ${v}`}</li>;
                          }
                          return null;
                        })
                      }
                    </ul>
                  </div>
              }

              <Button block variant={isComplete ? "success" : "primary"} size="lg" className={classNames({ complete: isComplete })} onClick={this.toggleAutomation} disabled={!autopilotReady || isComplete || isStopping || isStopped}>
                { (!autopilotReady || isRunning || isStopping) && <LoaderIcon /> }
                { isComplete && <CheckIcon /> }
                {
                  !autopilotReady ?
                    'page loading... please wait' :
                    buttonText
                }
              </Button>
              {
                !isRunning && !isComplete &&
                  <div className="best-practices">
                    <h5>Best Practices</h5>
                    <p>
                      Learn more about how to achieve the best results when using Autopilot capture in <a href="https://guide.conifer.rhizome.org/docs/autopilot/" target="_blank">this user guide</a>
                    </p>
                  </div>
              }
              {
                isRunning &&
                  <div className="autopilot-message">End autopilot to resume manual interaction with page.</div>
              }
              {
                isComplete &&
                  <div className="autopilot-message">Manual capture has resumed.</div>
              }
            </React.Fragment>
        }
      </div>
    );
  }
}


export default AutopilotUI;
