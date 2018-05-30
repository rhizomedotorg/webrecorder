import React, { Component } from 'react';
import classNames from 'classnames';
import Helmet from 'react-helmet';
import HTML5Backend from 'react-dnd-html5-backend';
import matchPath from 'react-router-dom/matchPath';
import PropTypes from 'prop-types';
import Raven from 'raven-js';
import renderRoutes from 'react-router-config/renderRoutes';
import { Alert, Button, Panel } from 'react-bootstrap';
import { asyncConnect } from 'redux-connect';
import { DragDropContext } from 'react-dnd';

import { isLoaded as isAuthLoaded,
         load as loadAuth } from 'redux/modules/auth';
import { load as loadUser } from 'redux/modules/user';
import { load as loadTemp } from 'redux/modules/tempUser';

import { UserManagement } from 'containers';

import config from 'config';

import Analytics from 'components/Analytics';
import BreadcrumbsUI from 'components/siteComponents/BreadcrumbsUI';
import { Footer } from 'components/siteComponents';

import 'shared/fonts/fonts.scss';
import './style.scss';


// named export for tests
export class App extends Component { // eslint-disable-line

  static propTypes = {
    auth: PropTypes.object,
    loaded: PropTypes.bool,
    route: PropTypes.object,
    location: PropTypes.object,
    spaceUtilization: PropTypes.object
  }

  static childContextTypes = {
    isAnon: PropTypes.bool
  }

  constructor(props) {
    super(props);

    this.handle = null;
    this.state = { error: null, showAlert: true, stalled: false };
  }

  getChildContext() {
    const { auth } = this.props;

    return {
      isAnon: auth.getIn(['user', 'anon'])
    };
  }

  componentWillMount() {
    // set initial route
    this.setState({ match: this.getActiveRoute(this.props.location.pathname) });
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.loaded && !nextProps.loaded) {
      this.handle = setTimeout(() => this.setState({ stalled: true }), 7500);
      this.setState({ lastMatch: this.state.match });
    }

    if (!this.props.loaded && nextProps.loaded) {
      const match = this.getActiveRoute(nextProps.location.pathname);

      if (this.state.match.path !== match.path) {
        this.setState({ match });
      }
    }
  }

  componentDidUpdate(prevProps) {
    // restore scroll postion
    if (this.props.location !== prevProps.location) {
      clearTimeout(this.handle);

      if (window) {
        window.scrollTo(0, 0);
      }

      // clear error state on navigation
      if (this.state.error) {
        this.setState({ error: null, info: null });
      }
    }
  }

  componentWIllUnmount() {
    clearTimeout(this.handle);
  }

  dismissAlert = () => this.setState({ showAlert: false })

  getActiveRoute = (url) => {
    const { route: { routes } } = this.props;

    const match = routes.find((route) => {
      return matchPath(url, route);
    });

    return match;
  }

  componentDidCatch(error, info) {
    this.setState({ error, info });
    if (config.ravenConfig) {
      Raven.captureException(error, { extra: info });
    }
  }

  render() {
    const { loaded, location: { pathname, search }, spaceUtilization } = this.props;
    const { error, info, lastMatch, match, showAlert } = this.state;

    const hasFooter = lastMatch && !loaded ? lastMatch.footer : match.footer;
    const classOverride = match.classOverride;
    const lastClassOverride = lastMatch ? lastMatch.classOverride : classOverride;
    const isOutOfSpace = spaceUtilization ? spaceUtilization.get('available') <= 0 : false;

    const containerClasses = classNames('wr-content', [!loaded ? lastClassOverride : classOverride], {
      container: !loaded ? typeof lastClassOverride === 'undefined' : typeof classOverride === 'undefined',
      loading: !loaded
    });

    const navbarClasses = classNames('navbar navbar-default navbar-static-top', {
      'no-shadow': typeof match.noShadow !== 'undefined' ? match.noShadow : false
    });

    if (error || info) {
      console.log('ERROR', error, info);
    }

    return (
      <React.Fragment>
        {
          config.gaId &&
            <Analytics pathname={pathname + search} />
        }
        <Helmet {...config.app.head} />
        <header>
          <div className={navbarClasses}>
            <nav className="container-fluid header-webrecorder">
              <BreadcrumbsUI url={pathname} />
              <UserManagement />
            </nav>
          </div>
        </header>
        {
          isOutOfSpace && showAlert &&
            <Alert bsStyle="warning" className="oos-alert" onDismiss={this.dismissAlert}>
              <p><b>Your account is out of space.</b> This means you can't record anything right now.</p>
              To be able to record again, you can:
              <ul>
                <li>Download some collections or recordings and then delete them to make space.</li>
                <li><a href={`mailto:${config.supportEmail}`}>Contact Us</a> to request more space.</li>
              </ul>
            </Alert>
        }
        {
          this.state.stalled &&
            <Panel className="stalled-alert" bsStyle="warning">
              <Panel.Heading>Oops, this request seems to be taking a long time..</Panel.Heading>
              <Panel.Body>
                Please refresh the page and try again. If the problem persists, contact <a href={`mailto:${config.supportEmail}`}>support</a>.
              </Panel.Body>
            </Panel>
        }
        {
          error ?
            <div>
              <div className="container col-md-4 col-md-offset-4 top-buffer-lg">
                <Panel bsStyle="danger">
                  <Panel.Heading>Oops!</Panel.Heading>
                  <Panel.Body>
                    <p>Oops, the page encountered an error.</p>
                    {
                      config.ravenConfig &&
                        <Button onClick={() => Raven.lastEventId() && Raven.showReportDialog()}>Submit a bug report</Button>
                    }
                  </Panel.Body>
                </Panel>
              </div>
            </div> :
            <section className={containerClasses}>
              {renderRoutes(this.props.route.routes)}
            </section>
        }
        {
          hasFooter &&
            <Footer />
        }
      </React.Fragment>
    );
  }
}


const initalData = [
  {
    promise: ({ store: { dispatch, getState } }) => {
      const state = getState();

      if (!isAuthLoaded(state)) {
        return dispatch(loadAuth()).then(
          (auth) => {
            if (auth.anon && auth.coll_count === 0) return undefined;
            return auth.anon ? dispatch(loadTemp(auth.username)) : dispatch(loadUser(auth.username));
          }
        );
      }

      return undefined;
    }
  }
];

const mapStateToProps = ({ reduxAsyncConnect: { loaded }, app }) => {
  return {
    auth: app.get('auth'),
    loaded,
    spaceUtilization: app.getIn(['user', 'space_utilization'])
  };
};

const DnDApp = DragDropContext(HTML5Backend)(App);

export default asyncConnect(
  initalData,
  mapStateToProps
)(DnDApp);
