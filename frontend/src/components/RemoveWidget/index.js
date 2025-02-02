import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Button, Overlay, Popover } from 'react-bootstrap';

import { list as listErr } from 'helpers/userMessaging';
import { stopPropagation } from 'helpers/utils';

// import Overlay from 'components/Overlay';

import OutsideClick from 'components/OutsideClick';
import { LoaderIcon, TrashIcon } from 'components/icons';

import './style.scss';


class RemoveWidget extends Component {
  static propTypes = {
    borderless: PropTypes.bool,
    callback: PropTypes.func,
    classes: PropTypes.string,
    children: PropTypes.node,
    deleteMsg: PropTypes.string,
    error: PropTypes.oneOfType([
      PropTypes.object,
      PropTypes.string
    ]),
    isDeleting: PropTypes.bool,
    placement: PropTypes.string,
    scrollCheck: PropTypes.string,
    withConfirmation: PropTypes.bool,
  };

  static defaultProps = {
    borderless: true,
    classes: '',
    deleteMsg: 'Are you sure you want to delete this item?',
    error: null,
    isDeleting: false,
    placement: 'bottom',
    withConfirmation: true
  };

  static getDerivedStateFromProps(props, state) {
    if (!props.isDeleting && state.isDeleting && state.confirmRemove) {
      return {
        confirmRemove: false,
        isDeleting: false
      };
    }

    return null;
  }

  constructor(props) {
    super(props);

    this.state = {
      confirmRemove: false,
      isDeleting: false
    };
  }

  shouldComponentUpdate(nextProps, nextState) {
    if ((this.state.confirmRemove && nextProps.isDeleting !== this.props.isDeleting) ||
        this.state.confirmRemove !== nextState.confirmRemove) {
      return true;
    }

    return false;
  }

  removeClick = (evt) => {
    evt.stopPropagation();

    if (!this.props.withConfirmation || this.state.confirmRemove) {
      if (!this.props.callback) {
        console.log('No RemoveWidget callback provided');
        return;
      }

      this.setState({ isDeleting: true });
      this.props.callback();
    } else {
      this.setState({ confirmRemove: true });
    }
  }

  outsideClickCheck = (evt) => {
    // if delete prompt is up, cancel it
    if (this.state.confirmRemove) {
      this.setState({ confirmRemove: false });
    }
  }

  render() {
    const { borderless, children, classes, deleteMsg, error, isDeleting, placement } = this.props;
    const { confirmRemove } = this.state;
    const styles = { position: 'relative' };

    if (confirmRemove) {
      styles.opacity = '1';
    }

    return (
      <React.Fragment>
        <div className="wr-remove-widget" style={styles}>
          <button
            className={classNames('remove-widget-icon', [classes], { borderless })}
            onClick={this.removeClick}
            ref={(obj) => { this.target = obj; }}
            type="button">
            { children || <TrashIcon />}
          </button>
          <Overlay container={document.querySelector('#portal')} target={() => this.target} placement={placement} show={this.state.confirmRemove}>
            <Popover id="wr-popover-delete" placement={placement} onClick={stopPropagation}>
              <OutsideClick handleClick={this.outsideClickCheck} scrollCheck={this.props.scrollCheck}>
                <Popover.Content>
                  {
                    error ?
                      <p className="rm-error">{listErr[error] || 'Error Encountered'}</p> :
                      <p>{deleteMsg}</p>
                  }
                  <div className="action-row">
                    <Button variant="outline-secondary" onClick={this.outsideClickCheck} disabled={error || isDeleting}>Cancel</Button>
                    <Button variant="danger" disabled={error || isDeleting} onClick={this.removeClick}>{isDeleting ? <LoaderIcon /> : 'OK'}</Button>
                  </div>
                </Popover.Content>
              </OutsideClick>
            </Popover>
          </Overlay>
        </div>
      </React.Fragment>
    );
  }
}

export default RemoveWidget;
